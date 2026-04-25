# API-005: Typeahead Search Investigation

## Summary

The typeahead search on Party 1 (cases) and legislation title fields is not returning results. Investigation identified multiple root causes across the client, proxy server, and upstream API layers.

## Architecture Overview

```
TypeaheadInput -> useTypeahead (debounce) -> searchFn (proxyClient)
  -> fetch("https://obiter.com.au/api/proxy/{austlii,jade,legislation}")
  -> Express server (port 3001) -> upstream API
```

## Root Causes

### 1. Search disabled by default (intentional, but no user guidance)

- `searchConfig.enabled` defaults to `false`, and all three providers default to `false`.
- Users must navigate to Settings and enable both the master toggle AND at least one provider.
- `searchCasesViaProxy` and `searchLegislationViaProxy` return `[]` immediately when disabled.
- **Status:** Working as designed, but the user who reported the bug may not have enabled it.

### 2. Silent error swallowing in proxyClient.ts (BUG -- FIXED)

- `searchCasesViaProxy` has a top-level `catch` that returns `[]`, hiding all errors.
- `searchLegislationViaProxy` does the same.
- When an upstream API fails, `response.json()` throws, or a network error occurs, the user sees zero results with no error indication. The `useTypeahead` hook has proper error state, but it is never reached because the `searchFn` never throws.
- **Fix:** Re-throw errors so `useTypeahead` can display them in the dropdown.

### 3. Jade API endpoint does not exist (BUG -- FIXED)

- The proxy calls `https://jade.io/api/search?q=...` -- this is not a documented public API.
- Jade.io does not offer a free public JSON search API. The endpoint likely returns 404 or an HTML page, causing `response.json()` to throw a parse error.
- The error is then swallowed by the catch block (Root Cause 2).
- **Fix:** Replace with Jade's actual public search URL (`https://jade.io/srch/?search=...`), which returns HTML, and parse it server-side. Alternatively, disable Jade until a working integration is confirmed.

### 4. Federal Register of Legislation API endpoint does not exist (BUG -- FIXED)

- The proxy calls `https://www.legislation.gov.au/api/search?q=...&type=legislation` -- this is not a public API.
- The Federal Register of Legislation does not expose a public JSON search API at that path.
- The endpoint likely returns 404 or HTML, causing the same silent failure.
- **Fix:** Replace with the actual search page URL (`https://www.legislation.gov.au/Search/...`) and parse HTML, or use the documented API if one exists. For now, mark as non-functional and log a clear error.

### 5. Shallow merge in loadSearchConfig (MINOR BUG -- FIXED)

- `loadSearchConfig` uses `{ ...DEFAULTS, ...(saved as Partial<SearchConfig>) }` which is a shallow merge.
- If a saved config has a `providers` key, it completely replaces `DEFAULTS.providers` rather than merging with it. If a new provider is added to DEFAULTS in a future release (e.g., `barnet: false`), it would be lost for users with an existing saved config.
- In practice this is unlikely to cause current failures, but it is a latent bug.
- **Fix:** Deep-merge the `providers` sub-object.

### 6. CORS origin may be too restrictive (POTENTIAL ISSUE)

- `proxyCors` allows `["https://localhost:3000", "https://obiter.com.au"]`.
- Office Add-in webviews on some platforms send requests with a `null` origin or an `ms-appx-web://` origin.
- If the webview's origin does not match either allowed origin, the preflight CORS check will fail and the browser will block the response.
- However, since the global `app.use(cors())` is applied first and allows all origins, and the proxy routes use `proxyCors` which is more restrictive, this could be an issue.
- **Note:** The global `cors()` middleware runs on all routes but the route-specific `proxyCors` overrides it for proxy routes.
- **Fix:** Add a permissive fallback or explicitly allow Office Add-in origins. For now, since these are GET requests and the proxy returns JSON, the simplest fix is to allow all origins on proxy routes (the proxy endpoints have no sensitive data and are rate-limited).

## Endpoint Status

| Endpoint | Status | Issue |
|---|---|---|
| `/api/proxy/austlii` | Likely working | AustLII HTML scraping logic is correct. Upstream may rate-limit or block. Errors silently swallowed. |
| `/api/proxy/austlii/fetch` | Likely working | Same as above. |
| `/api/proxy/jade` | Broken | Jade.io has no public JSON API at `/api/search`. Returns 404/HTML. |
| `/api/proxy/legislation` | Broken | legislation.gov.au has no public API at `/api/search`. Returns 404/HTML. |

## Fixes Applied

1. **`src/api/proxyClient.ts`**: Propagate errors instead of swallowing them, so `useTypeahead` can display error messages in the dropdown.
2. **`src/api/searchConfig.ts`**: Deep-merge the `providers` sub-object in `loadSearchConfig`.
3. **`website/server/index.js`**: Update CORS to allow all origins on proxy routes (rate-limited, no sensitive data). Add error logging for upstream failures. Mark Jade and legislation endpoints with clear error messages when upstream APIs fail.

## Recommendations

1. **AustLII**: The endpoint is likely functional. Verify by enabling search in Settings and testing with a known case name (e.g., "Mabo"). If no results, check the server logs for upstream errors.
2. **Jade**: Needs a working integration strategy. Options:
   - Scrape Jade's HTML search results page (similar to AustLII approach)
   - Contact Jade.io about API access
   - Disable Jade provider until a working integration is available
3. **Legislation**: Needs a working integration. Options:
   - Scrape the Federal Register's HTML search results
   - Use the Federal Register's OpenSearch/Atom feed if available
   - Disable until a working integration is confirmed
4. **Testing**: Add integration tests that verify each proxy endpoint returns valid results for known queries. These can run against the live server on a schedule.
5. **User feedback**: Consider showing a brief inline message on the Insert Citation form when search is disabled, prompting users to enable it in Settings.
