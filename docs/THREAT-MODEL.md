# Obiter Threat Model

Scope: the Obiter Word add-in (task pane, command surface, shared runtime) as served from
obiter.com.au and run inside the Microsoft Word host. Last reviewed 2026-07-21. This document
records the trust boundaries, the threat classes we defend against, the mitigations shipped in
TRUST-001 through TRUST-006, and the risks we accept knowingly.

## Trust boundaries

```
Word host  <->  add-in webview  <->  obiter.com.au  <->  optional third parties
(Office)        (React task pane)    (static app,         - LLM providers (BYO key)
                                      corpus/search,       - AustLII and other legal sources
                                      keyed LLM proxy)     - GitHub releases API (version check)
```

- **Word host to webview.** Word loads the add-in from `https://obiter.com.au/app/` in a
  sandboxed webview. Office.js is the only bridge to the document; the add-in has no access to
  the file system, other documents, or the network beyond what the browser permits.
- **Webview to obiter.com.au.** Static application code, corpus search, and the keyed LLM relay
  (`/api/proxy/llm`). This is the primary trust anchor for served code.
- **Optional third parties.** LLM providers (five fixed hosts, plus custom endpoints via the
  obiter.com.au relay), legal source adapters (AustLII, Jade.io, legislation.gov.au and
  related hosts), and the unauthenticated GitHub releases API. All are reached only on explicit
  user action; the add-in works fully with none of them enabled.

## Can a bad actor remotely access a document?

No remote-control channel exists. The add-in exposes no inbound surface: it opens no listening
ports or sockets, registers no push or messaging channel, and executes no server-directed
commands. All network activity is outbound, initiated by user actions inside the pane. Document
content leaves the machine only through user-initiated optional calls (LLM parsing, source
lookup), and since TRUST-001 the set of hosts those calls may reach is enforced by the browser's
Content Security Policy rather than by code review alone. An attacker would have to compromise
the code served from obiter.com.au or one of the pinned script hosts to reach a document; that
scenario is threat class 1 below.

## Threat classes and mitigations

**1. Served-code compromise at obiter.com.au.** An attacker who can alter the served bundle runs
inside every user's pane. Mitigations: `script-src` is pinned to `'self'`,
`appsforoffice.microsoft.com`, and `ajax.aspnetcdn.com` with no `unsafe-inline` or `unsafe-eval`
(TRUST-001, single source of truth in `config/csp.js`, injected into all three built pages); the
authoritative header set — CSP with `frame-ancestors` for the Office host domains, HSTS,
`nosniff`, `Referrer-Policy` — is generated from the same source and served by nginx (TRUST-002,
`scripts/nginx/app-security-headers.conf`), with a Report-Only staging phase on `/app/beta/`;
release zips carry `SHA256SUMS.txt` and a link to the building workflow run (TRUST-005).

**2. Document-derived XSS.** Content read from the document (fonts, run properties) is
interpolated into `insertHtml` fragments. Font family names are validated against a conservative
allowlist pattern and font sizes must be finite positive numbers; failing values are dropped
rather than escaped (TRUST-003). CSP provides the backstop: even a successful style breakout
cannot load or execute foreign script.

**3. Integration exfiltration.** A bug or malicious dependency attempting to post document
content to an attacker host is blocked by `connect-src`, which enumerates 43 fixed hosts
(obiter.com.au and subdomains, api.github.com, the five fixed LLM providers, and the source
adapter hosts). Custom LLM endpoints do not widen the policy: they route through the
obiter.com.au `/api/proxy/llm` relay, where the server validates the target is https and rejects
IP literals, localhost, and its own infrastructure. A CI guard test
(`tests/security/cspAllowlist.test.ts`) fails when a fetch target appears in `src/` that is not
in the allowlist module, so the policy cannot silently drift.

**4. npm supply chain.** CI fails on high or critical advisories in production dependencies
(`npm audit --omit=dev`); `lockfile-lint` rejects non-HTTPS or non-registry.npmjs.org resolved
URLs in `package-lock.json`; Dependabot watches both the npm and GitHub Actions ecosystems
(TRUST-004).

## Accounts trust boundary (ACCT epic)

Optional accounts add a new asset to the obiter.com.au host: the account database `obiter.db`
(SQLite, WAL) now holds credentials and secrets — argon2id password hashes, AES-256-GCM-encrypted
LLM API keys and MFA (TOTP) secrets, rotating refresh tokens (stored only as hashes), and an audit
trail with one-way hashed IPs. Accounts are optional; the signed-out add-in and every BYOK path are
byte-identical to before, and citation data and documents are never synced to an account.

- **Master-key custody.** The AES-256-GCM vault master key (`VAULT_MASTER_KEY`) lives only in the
  host environment (`/etc/obiter/env.sh`), never in `obiter.db`. Ciphertext in the database is
  useless without it, so a database leak alone does not disclose keys or MFA secrets. Rotating the
  master key invalidates all existing encrypted secrets: stored keys and MFA enrolments must be
  re-entered (the rotation procedure is documented in `docs/server-setup.md`).
- **Token custody in the webview.** The access + refresh token pair is held in memory and mirrored
  to the webview's `localStorage` (`obiter-auth`). This is the same custody boundary already
  accepted for BYOK keys — the sandbox offers no OS keychain. It is mitigated by short access-token
  expiry, refresh-token rotation with reuse detection (a retired token's reuse revokes the whole
  family), and server-side revocation on sign-out and on account deletion. The provider key itself
  is never on the device once vaulted; only the tokens that authorise the relay to use it are.
- **Turnstile as bot control.** Cloudflare Turnstile (managed mode) gates the human-facing auth
  actions (register, login, password-reset request, resend-verification) so credential-stuffing and
  automated enrolment are throttled at the door. It fails closed when the secret is configured.

### Account threat classes and mitigations

**5. Credential-database compromise.** An attacker who reads `obiter.db` obtains no plaintext
passwords (argon2id, not reversible) and no usable API keys or MFA secrets (AES-256-GCM ciphertext,
master key held out-of-band in the host environment). Refresh tokens are stored only as hashes.
Audit IPs are one-way hashed.

**6. Token theft from a device.** A copy of a device's `obiter-auth` acts as the account until
revoked. Mitigated by short access-token expiry, refresh rotation with family-wide reuse detection,
and revocation on sign-out / password reset / account deletion. Sensitive operations (delete
account, remove a stored key, disable MFA) additionally require a fresh step-up (current TOTP, or
password for non-MFA accounts).

**7. Relay abuse.** The keyed LLM relay is rate-limited per account and per IP, its use is audited,
and target validation rejects IP literals, localhost, and Obiter's own infrastructure (see threat
class 3). Acceptable-use terms bound legitimate use; abusive accounts can be throttled or suspended.

**8. Account takeover.** Defended in depth: argon2id hashing with timing-safe verification, optional
TOTP MFA (mandatory for admin accounts), Turnstile on auth actions, per-IP rate limits on
register/login/reset with progressive delay, lockout after repeated failures, generic
no-user-enumeration responses, and a full audit trail of auth events for detection.

## Decision record: office.js integrity

Subresource integrity and self-hosting of office.js were considered and rejected, consistent
with Microsoft's guidance: the CDN bundle at `appsforoffice.microsoft.com/lib/1/hosted/` is
updated in place, so any pinned hash would break on Microsoft's schedule, and that URL is the
only supported production source. The mitigation is host pinning via `script-src`. The Microsoft
CDN is accepted as a trust anchor; it is the same trust anchor as Office itself, so a compromise
there already implies a compromised host application.

## Accepted risks

- **API keys in localStorage.** LLM and source API keys persist in browser localStorage; the
  webview sandbox offers no OS keychain. Bounded, not eliminated (TRUST-006): Settings discloses
  the storage location, recommends low-privilege spend-capped keys, never echoes a stored key
  back (last-four hint only), and provides a "Remove stored keys" action that clears the
  `LLMConfig` key material, all keyVault entries, and the legacy `obiter.llmConfig` key.
- **office.js delivered without SRI.** See the decision record above.
- **Residual SSRF in the LLM relay.** The proxy's target validation resolves hostnames at check
  time; a DNS-rebinding-class attack could still redirect a request after validation. Accepted
  for a keyed relay that forwards only user-composed LLM payloads.

## Data handling

- **Error reports are opt-in.** The user reviews the report before anything is sent. Form data
  is included only if the user opts in, and is sanitised first: values under keys matching
  `apiKey`, `api_key`, `token`, `password`, `secret`, or `key` are stripped
  (`src/ui/components/ErrorReporter.tsx`). Diagnostics collect only the Obiter version,
  timestamp, Word version, and platform (`src/utils/diagnostics.ts`).
- **Device hash.** A random UUID generated on first run and stored locally; it is not derived
  from hardware, account, or any user data (`src/taskpane/taskpane.ts`).
- **Version check.** An unauthenticated GET to the public GitHub releases API, cached locally
  for 24 hours (`src/ui/hooks/useVersionCheck.ts`). No identifying data is sent.
- **Citation data.** All citation metadata lives in a Custom XML Part inside the user's own
  `.docx`. There is no external database and no server-side copy.

## Verification history

- 2026-07-21 — repository history checked for leaked secrets:
  `git log --all --oneline -- scripts/deploy.env "*.pem" "*.key"` returned no commits, and
  `git ls-files | grep -iE "\.pem$|\.key$|deploy\.env"` matched only
  `scripts/deploy.env.example`. `.gitignore` covers `.env`, `.env.*`, `scripts/deploy.env`,
  `*.pem`, and `*.key`.
