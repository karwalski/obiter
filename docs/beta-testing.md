# Beta / staging on obiter.com.au/app/beta

One staging slot serves **both products** for pre-release testing without touching production or existing users. The build is location-agnostic (relative paths), so the *same* production build runs at `/app/` and `/app/beta/` — only the manifests differ.

| | Production | Beta / staging |
|---|---|---|
| Host | `https://obiter.com.au/app/` | `https://obiter.com.au/app/beta/` |
| Classic manifest | `manifest.prod.xml` (id `933c30ed…`, live WA200010629) | `manifest.beta.xml` (id `2976ed65…`, "Obiter (Beta)") |
| Copilot manifest | `manifest.skill.json` (id `1fe03f6c…`) | beta Copilot package (same id, `/app/beta/` host) |
| Deploy | `npm run deploy:app` | `npm run deploy:beta` |
| Who sees it | all AppSource users | only whoever sideloads the beta manifest |

The beta classic manifest uses a **dedicated id** (`2976ed65-03c5-4acf-9953-ee3d9b90a4fe`) so it coexists with the published add-in on the same machine. `deploy:app` carries `--exclude 'beta/'`, so promoting production never wipes the beta slot.

## Test loop

1. Build: `npm run build:prod` (produces the location-agnostic `dist/`).
2. Deploy to staging: `npm run deploy:beta` → serves `https://obiter.com.au/app/beta/…`. Production `/app/` is untouched.
3. Test the **classic 1.14** build: sideload `manifest.beta.xml` in Word (Insert → My Add-ins → Upload My Add-in; or Word on the web → Add-ins → Upload My Add-in). It appears as "Obiter (Beta)" alongside any installed production Obiter.
4. Test the **Copilot skill**: build the beta Copilot package (`BETA=1 npm run package:skill`, see the copilot/v* branch), validate it with the Microsoft 365 Agents Toolkit, and upload it to your Copilot tenant. It points at `/app/beta/`, so it exercises the same staged build.
5. When satisfied, promote: `npm run build:prod && npm run deploy:app` (classic) / finish the Copilot submission.

## Regenerating manifest.beta.xml

`manifest.beta.xml` is derived from `manifest.prod.xml` — same content with `obiter.com.au/app/` → `obiter.com.au/app/beta/`, the beta id, and a "(Beta)" display name. If `manifest.prod.xml` changes (e.g. a new version), regenerate:

```
sed -e 's#obiter\.com\.au/app/#obiter.com.au/app/beta/#g' \
    -e 's#<Id>933c30ed-e129-4844-9880-c4009e3969a5</Id>#<Id>2976ed65-03c5-4acf-9953-ee3d9b90a4fe</Id>#' \
    -e 's#<DisplayName DefaultValue="Obiter"/>#<DisplayName DefaultValue="Obiter (Beta)"/>#' \
    manifest.prod.xml > manifest.beta.xml
```
(then re-add the provenance comment, and `npx office-addin-manifest validate manifest.beta.xml`).
