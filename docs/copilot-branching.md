> **⏸️ ON HOLD (2026-07-08).** The Obiter Copilot product is paused pending Microsoft's
> combine-agents-with-add-ins platform issue (the `insertCitation` action invokes on both Word
> web and desktop but execution returns "failed to get invocation result due to internal error" —
> a platform bug, cf. [office-js#6467](https://github.com/OfficeDev/office-js/issues/6467) and the
> Office.js instability open letter [office-js#6513](https://github.com/OfficeDev/office-js/issues/6513)).
> All Obiter-side work is complete on this `copilot/v1.14` branch (skill package v1.15.4). The
> classic add-in ships from `main`. Resume when the platform is fixed and/or on a full
> (non-trial, Teams-enabled) Copilot licence. Evidence + desktop-test checklist:
> [copilot-platform-support.md](copilot-platform-support.md).

# Two products, one codebase — Obiter (classic) and Obiter for Microsoft 365 Copilot

Obiter ships as **two AppSource/marketplace products that share ~95% of their code**:

| | Classic add-in | Copilot companion |
|---|---|---|
| Product name | Obiter — AGLC4 Citations | Obiter for Microsoft 365 Copilot |
| App id | `933c30ed-e129-4844-9880-c4009e3969a5` (live, WA200010629) | `1fe03f6c-b9b7-4a44-a55f-4b08f9813729` (new) |
| Manifest | `manifest.prod.xml` (classic Office add-in, XML) | `manifest.skill.json` + `declarativeAgent.json` (unified Microsoft 365 app) |
| Partner Center type | Office add-in | Microsoft 365 app |
| Build / package | `npm run build:prod` | `npm run package:skill` |
| Listing copy | `docs/appstore-listing.md` | `docs/appstore-listing-copilot.md` |
| Git line | `main` | `copilot/v*` |

The two app ids are **different on purpose** — AppSource keys on the id, so two live listings must have distinct ids. The classic id is already published and must never change.

## Why one codebase, not a fork

A Microsoft 365 Copilot agent can only invoke an Office add-in's functions when the add-in and the agent are declared in the **same unified manifest** (Microsoft's "combine Copilot agents with Office add-ins" model). Obiter has no backend (pure local document ops), so the API-plugin alternative isn't available. The Copilot product is therefore the *same add-in* plus a declarative agent — a superset, same web app, same engine. Keeping it a fork would duplicate the entire citation engine. Instead: **one tree, Copilot concerns isolated by directory, divergence limited to identity + manifest + listing.**

## Separation by intent (avoid merge collisions)

The classic build entries (`taskpane`, `commands`) do **not** import any of the Copilot-only files, so the classic product never ships them.

**Copilot-only** — edited only on the `copilot/*` line:
- `src/actions/skillFunctions.ts`, `skillManifest.ts`, `unifiedManifest.ts`, `agentInstructions.ts`
- `src/runtime/sharedRuntime.ts`, `sharedRuntime.html`, `commandHandlers.ts` (shared-runtime page)
- `manifest.skill.xml`, `manifest.skill.json`, `declarativeAgent.json`
- `scripts/export-skill.ts`, `package-skill.sh`, `generate-skill-icons.js`
- `docs/obiter-copilot-skill.json`, `copilot-skill-contract.md`, `appstore-listing-copilot.md`
- `assets/color.png`, `assets/outline.png` (skill icons); the `sharedRuntime` webpack entry

**Shared** — the engine, UI, `src/word`, `src/store`, and the headless `src/actions/citationService.ts` / `citationRequest.ts` / `actionCatalogue.ts` (the pane and the skill both call the citation service — one code path, COPILOT-001).

**Classic-only** — `manifest.prod.xml`, `manifest.xml` (dev), `docs/appstore-listing.md`, `docs/appstore-submission.md`.

The rule that keeps merges clean: **the classic line never edits a Copilot-only file, and the Copilot line never edits a shared file divergently.** If the skill needs new behaviour from a shared module, add it on `main` (a no-op for the classic pane) so both lines stay identical in shared code; put the Copilot-specific glue in a Copilot-only file.

## Merge workflow

- **Bug fix or shared feature** → commit on `main` (or a `fix/*` branch off `main`), release classic from `main`, then `git checkout copilot/v1.14 && git merge main`. Because `main` never touches Copilot-only files, the merge applies cleanly and the Copilot product inherits the fix.
- **Copilot-distinct work** (agent instructions, skill actions, unified-manifest tweaks) → commit on `copilot/v1.14`, only in Copilot-only files. Never flows back to `main`.
- **Release** → classic ships from `main` via `build:prod` + `manifest.prod.xml`; Copilot ships from `copilot/v*` via `package:skill` (emits the sideloadable/uploadable `.zip`).

The Copilot product identity (id, name) is set in `src/actions/unifiedManifest.ts` and `manifest.skill.xml` and exists **only on the `copilot/*` line**, so `main` carries no Copilot-product identity.

## Where the app id is set

`src/actions/unifiedManifest.ts` (`APP_ID`) is the source of truth for the unified manifest and declarative agent; `npm run export-skill` regenerates `manifest.skill.json` + `declarativeAgent.json` from it. `manifest.skill.xml` (the shared-runtime add-in variant) carries the id in its `<Id>` element. Both are set to the Copilot id on the `copilot/*` line only.

## Upgrading from classic Obiter to Obiter Copilot

Obiter Copilot is a strict superset of the classic add-in: the same task pane, the same
full ribbon (all eleven buttons), the same engine — plus the Copilot agent. The upgrade
needs **no data migration**: the citation store lives in the document (same Custom XML
namespace) and device preferences (API keys, standard, comfort mode) live in the shared
`obiter.com.au` origin localStorage, so both carry over automatically.

Steps:
1. Remove the classic add-in — admin-deployed: M365 admin → Integrated apps → Obiter →
   Remove; user-acquired: Word → Home → Add-ins → right-click Obiter → Remove.
2. Deploy/install "Obiter for Microsoft 365 Copilot" (the unified app package).
3. Open any Obiter document — the library, footnotes, and preferences are unchanged.

**Running both at once is unsupported.** The two products contend for the document
selection handler (`src/word/selectionHandler.ts` keeps a single handler — whichever
pane loads second silently disables the other's click-citation→Edit flow). Each pane
records a product heartbeat (COPILOT-019, `src/store/devicePreferences.ts`; the Copilot
manifest marks its panes with `product=copilot`) and warns when the other product has
been active on the device within 7 days.
