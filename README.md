# BPS API Proxy

Proxy for BPS (Badan Pusat Statistik) API that bypasses Cloudflare bot detection using [curl-impersonate](https://github.com/lwthiker/curl-impersonate) Chrome TLS fingerprint.

## Routes

| Path | Target | Method |
|------|--------|--------|
| `/v1/*` | `webapi.bps.go.id/v1/*` | curl-impersonate |
| `/allstats/*` | `searchengine.web.bps.go.id/*` | FlareSolverr (headless browser) |
| `/health` | Health check | - |

## Deploy

### Docker

```bash
docker build -t bps-api-proxy .
docker run -p 3000:3000 bps-api-proxy
```

### With FlareSolverr (for AllStats Search)

```bash
docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
docker run -p 3000:3000 -e FLARESOLVERR_URL=http://host.docker.internal:8191/v1 bps-api-proxy
```

### Kubernetes

```yaml
containers:
  - name: bps-api-proxy
    image: ghcr.io/setiapam/bps-api-proxy:latest
    ports:
      - containerPort: 3000
    env:
      - name: FLARESOLVERR_URL
        value: "http://flaresolverr-service:8191/v1"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `FLARESOLVERR_URL` | *(empty)* | FlareSolverr endpoint for AllStats (optional) |
| `CURL_BIN` | `curl_chrome110` | curl-impersonate binary name |

## Usage

```bash
# BPS WebAPI
curl http://localhost:3000/v1/api/domain/type/all/key/YOUR_KEY/

# AllStats Search (requires FlareSolverr)
curl http://localhost:3000/allstats/search?q=inflasi&content=all&page=1
```
