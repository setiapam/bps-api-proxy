# BPS API Proxy

Proxy relay untuk BPS (Badan Pusat Statistik) WebAPI dan AllStats Search yang mem-bypass Cloudflare bot detection menggunakan [curl-impersonate](https://github.com/lwthiker/curl-impersonate) Chrome TLS fingerprint.

## Kenapa Perlu Proxy?

BPS menggunakan Cloudflare yang memblokir request dari:
- Cloudflare Workers (inter-Cloudflare bot detection)
- Cloud provider IPs (AWS, GCP, Azure, Fly.io, Deno Deploy, dll)
- Serverless functions
- Google Apps Script

Jika kamu mengalami error **403 Forbidden** atau halaman **"Just a moment..."** saat mengakses `webapi.bps.go.id` dari server/cloud, proxy ini adalah solusinya.

**Syarat:** Deploy di server dengan **IP residential** (homelab, VPS dengan IP ISP, Raspberry Pi, dll). Cloud provider IPs tidak akan berhasil.

## Quick Start

### Docker

```bash
docker run -d -p 3000:3000 ghcr.io/setiapam/bps-api-proxy:latest
```

Test:
```bash
curl http://localhost:3000/health
curl "http://localhost:3000/v1/api/domain/type/all/key/YOUR_BPS_KEY/"
```

### Docker Compose

```yaml
services:
  bps-proxy:
    image: ghcr.io/setiapam/bps-api-proxy:latest
    ports:
      - "3000:3000"
    restart: unless-stopped

  # Opsional: untuk AllStats Search (butuh ~512MB RAM)
  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    ports:
      - "8191:8191"
    environment:
      - LOG_LEVEL=info
      - TZ=Asia/Jakarta

  # Jika pakai FlareSolverr, tambahkan env:
  # bps-proxy:
  #   environment:
  #     - FLARESOLVERR_URL=http://flaresolverr:8191/v1
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
        value: "http://flaresolverr-service:8191/v1"  # opsional
```

## Routes

| Path | Target | Method | Deskripsi |
|------|--------|--------|-----------|
| `/health` | - | - | Health check |
| `/v1/*` | `webapi.bps.go.id/v1/*` | curl-impersonate | BPS WebAPI (data statistik) |
| `/allstats/*` | `searchengine.web.bps.go.id/*` | FlareSolverr | AllStats Search (butuh FlareSolverr) |

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `3000` | Port server |
| `FLARESOLVERR_URL` | *(kosong)* | URL FlareSolverr untuk AllStats Search (opsional) |
| `CURL_BIN` | `curl_chrome110` | Binary curl-impersonate yang digunakan |

## Penggunaan

### Sebagai relay untuk BPS MCP Server

Jika kamu deploy [bps-mcp-server](https://github.com/setiapam/bps-mcp-server) di Cloudflare Workers, set environment variable:

```toml
# wrangler.toml
BPS_API_BASE_URL = "https://your-proxy-domain.com/v1"
BPS_ALLSTATS_BASE_URL = "https://your-proxy-domain.com/allstats/"
```

### Sebagai relay untuk Google Apps Script

```javascript
function getBpsData(endpoint) {
  var url = "https://your-proxy-domain.com/v1/api/" + endpoint;
  var response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}

// Contoh: ambil daftar provinsi
var data = getBpsData("domain/type/prov/key/YOUR_KEY/");
```

### Sebagai relay untuk aplikasi lain

Ganti base URL dari `https://webapi.bps.go.id/v1` ke `http://your-proxy:3000/v1`. Semua endpoint BPS WebAPI didukung tanpa perubahan path.

```python
# Python
import requests
BASE = "http://localhost:3000/v1"
r = requests.get(f"{BASE}/api/domain/type/all/key/{API_KEY}/")
```

```javascript
// Node.js
const BASE = "http://localhost:3000/v1";
const res = await fetch(`${BASE}/api/domain/type/all/key/${API_KEY}/`);
```

## Expose ke Internet

Proxy ini harus bisa diakses dari Cloudflare Workers atau service lain. Opsi:

### Cloudflare Tunnel (recommended untuk homelab)

```bash
cloudflared tunnel route dns YOUR_TUNNEL bps-api.yourdomain.com
```

Di tunnel config:
```yaml
- hostname: bps-api.yourdomain.com
  service: http://localhost:3000
```

### Nginx Reverse Proxy (untuk VPS)

```nginx
server {
    listen 443 ssl;
    server_name bps-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_read_timeout 60s;
    }
}
```

## Resource Requirements

| Komponen | RAM | CPU | Catatan |
|----------|-----|-----|---------|
| bps-api-proxy | ~64MB | Minimal | Wajib |
| FlareSolverr | ~512MB | Low | Opsional, hanya untuk AllStats Search |

## Limitasi

- **Harus deploy di IP residential** — cloud provider IPs diblokir oleh BPS Cloudflare
- AllStats Search membutuhkan FlareSolverr (headless Chrome) — lebih lambat (~5-10 detik per request)
- Tidak ada caching built-in — gunakan caching di level consumer (BPS MCP Server sudah punya cache)

## Lisensi

MIT
