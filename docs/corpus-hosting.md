# Corpus Hosting Configuration

This document describes the hosting options for the Obiter corpus index files
(`index.json` and `manifest.json`). These files are metadata-only extracts from
the Open Australian Legal Corpus, used by the add-in for local citation search.

## Recommended: Cloudflare R2 + Custom Domain

Cloudflare R2 provides S3-compatible object storage with zero egress fees,
making it ideal for serving the corpus index to add-in users worldwide.

### Setup

1. **Create the R2 bucket**

   In the Cloudflare dashboard under R2:
   - Bucket name: `obiter-corpus`
   - Location hint: Asia-Pacific (closest to Australian users)

2. **Connect a custom domain**

   Option A — subdomain (recommended):
   - Add a CNAME record: `corpus.obiter.com.au` -> R2 bucket public URL
   - Enable the R2 custom domain in bucket settings

   Option B — path-based:
   - Use a Cloudflare Worker to proxy `obiter.com.au/corpus/*` to the R2 bucket

3. **Upload files**

   ```bash
   # Using wrangler CLI
   npx wrangler r2 object put obiter-corpus/index.json --file corpus/index.json \
     --content-type application/json
   npx wrangler r2 object put obiter-corpus/manifest.json --file corpus/manifest.json \
     --content-type application/json
   ```

4. **CORS configuration**

   In the R2 bucket CORS policy:
   ```json
   [
     {
       "AllowedOrigins": ["https://obiter.com.au"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```

5. **Cache headers**

   Set via R2 bucket rules or a Transform Rule:
   ```
   Cache-Control: public, max-age=604800
   ```
   This caches for one week. The add-in checks `manifest.json` (small file)
   to detect new versions, then only downloads `index.json` if the version
   has changed.

### Cost

- Storage: first 10 GB free, then $0.015/GB/month
- Egress: free (zero bandwidth charges)
- Operations: 10 million Class B (GET) requests free per month

For a ~100 MB index file, this is effectively free for any realistic user count.

## Alternative: Lightsail Direct Serving

If Cloudflare R2 is not yet configured, the Lightsail instance at `3.106.204.98`
can serve corpus files directly via nginx.

### Setup

Files are placed in `/opt/bitnami/nginx/html/corpus/` and served via an nginx
location block with CORS and cache headers. See the `scripts/setup-corpus-nginx.sh`
script for the exact configuration.

### Limitations

- Bandwidth is limited by the Lightsail instance plan
- No global CDN; all requests hit the single Sydney instance
- Should be treated as a temporary fallback until R2 is configured

## Alternative: Cloudflare Pages / Workers

For a more programmable approach:

- **Workers KV**: Store the index in Workers KV. Good if the index needs to be
  queried server-side (e.g., for a search API). Limited to 25 MB per value, so
  the index would need to be sharded.
- **Cloudflare Pages**: Deploy the corpus directory as a Pages site. Simple but
  less flexible than R2 for large binary files.

## Updating the CDN URL in the Add-in

The corpus download URL is configured in `src/api/corpus/corpusDownload.ts`.
When hosting is live, update the constants at the top of that file:

```typescript
const CORPUS_MANIFEST_URL = "https://corpus.obiter.com.au/manifest.json";
const CORPUS_INDEX_URL = "https://corpus.obiter.com.au/index.json";
```

For the Lightsail fallback:
```typescript
const CORPUS_MANIFEST_URL = "https://obiter.com.au/corpus/manifest.json";
const CORPUS_INDEX_URL = "https://obiter.com.au/corpus/index.json";
```
