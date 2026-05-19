# BPS API Proxy

Lightweight proxy for BPS (Badan Pusat Statistik) WebAPI, deployed on Deno Deploy.

Bypasses Cloudflare bot detection that blocks requests from Cloudflare Workers.

## Usage

```
GET https://<project>.deno.dev/v1/api/domain/type/all/key/YOUR_KEY/
```

## Deploy

Connect this repo to [Deno Deploy](https://dash.deno.com) with entrypoint `main.ts`.
