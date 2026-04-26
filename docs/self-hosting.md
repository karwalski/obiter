# Self-Hosting Obiter Cloud Search

This guide explains how to deploy the Obiter Cloud search service on
your own infrastructure. Self-hosting gives you full control over the
search index, query logs, and network configuration.

All server components are licensed under **GPLv3**. If you modify the
server code, you must make your changes available under the same licence.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- 4 GB RAM minimum (8 GB recommended for indexing)
- 20 GB disk for the search index (grows with corpus size)
- A TLS certificate (Let's Encrypt is fine)
- A domain or subdomain pointed at your server

## Quick Start

```bash
git clone https://github.com/karwalski/obiter-cloud.git
cd obiter-cloud
cp .env.example .env
# Edit .env — set DOMAIN, TLS paths, etc.
docker compose up -d
```

The service exposes two endpoints:

| Endpoint         | Method | Description                |
|------------------|--------|----------------------------|
| `/api/search`    | POST   | Full-text citation search  |
| `/api/resolve`   | POST   | Single citation resolution |

## Docker Compose Services

```yaml
services:
  search:
    image: ghcr.io/karwalski/obiter-cloud-search:latest
    ports:
      - "443:8443"
    environment:
      - OBITER_TLS_CERT=/certs/fullchain.pem
      - OBITER_TLS_KEY=/certs/privkey.pem
    volumes:
      - ./certs:/certs:ro
      - search-data:/data

  ingest:
    image: ghcr.io/karwalski/obiter-cloud-ingest:latest
    environment:
      - OBITER_SCHEDULE_CONFIG=/config/schedules.yaml
    volumes:
      - ./config:/config:ro
      - search-data:/data

volumes:
  search-data:
```

## Replication Job Configuration

Ingestion schedules are defined in `config/schedules.yaml`:

```yaml
jobs:
  - sourceId: corpus
    schedule: "0 2 * * 0"        # Weekly, Sunday 02:00
    enabled: true

  - sourceId: crossref
    schedule: "0 3 * * *"        # Daily, 03:00
    enabled: true

  - sourceId: openalex
    schedule: "0 4 * * *"        # Daily, 04:00
    enabled: true

  - sourceId: doaj
    schedule: "0 5 * * 1"        # Weekly, Monday 05:00
    enabled: true

  - sourceId: nsw-hansard
    schedule: "0 6 * * *"        # Daily, 06:00
    enabled: true

  - sourceId: qld-legislation
    schedule: "0 7 * * 0"        # Weekly, Sunday 07:00
    enabled: true

  - sourceId: act-sc-rss
    schedule: "30 * * * *"       # Every 30 minutes
    enabled: true
```

Each job fetches data from the upstream source, transforms it into the
Obiter search schema, and indexes it. Only sources marked `replicable`
in the licence ledger are eligible for ingestion.

## Connecting the Add-in

In the Obiter Word add-in, open **Settings** and set the **Cloud URL**
to your self-hosted instance:

```
https://search.yourdomain.com
```

The add-in stores this URL as a device preference (`cloudBaseUrl`). All
subsequent cloud queries will be directed to your server instead of the
default `https://search.obiter.com.au`.

## Rate Limiting

The search service enforces per-IP rate limiting (default: 60 requests
per minute). Configure this in your `.env` file:

```
OBITER_RATE_LIMIT_RPM=60
```

## Monitoring

The search service exposes a health endpoint at `GET /health` that
returns `200 OK` when the service is ready. Use this for load balancer
health checks or uptime monitoring.

## Licensing

The Obiter Cloud search service is licensed under the GNU General Public
License v3.0. You are free to run, modify, and distribute the software
under the terms of this licence. See `LICENCE` for the full text.

If you distribute a modified version of the server, you must make your
source code available under GPLv3 to anyone who receives the software.
