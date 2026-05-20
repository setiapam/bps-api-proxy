const http = require("http");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 3000;
const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || "";
const CURL_BIN = process.env.CURL_BIN || "curl_chrome110";

/**
 * Fetch URL using curl-impersonate (Chrome TLS fingerprint).
 */
function curlFetch(url) {
  return new Promise((resolve, reject) => {
    execFile(CURL_BIN, ["-s", url], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/**
 * Fetch URL using FlareSolverr (headless browser, solves JS challenges).
 */
async function flareSolverrFetch(url) {
  if (!FLARESOLVERR_URL) throw new Error("FLARESOLVERR_URL not configured");
  const res = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url, maxTimeout: 30000 }),
  });
  const data = await res.json();
  if (data.status === "ok" && data.solution) return data.solution.response;
  throw new Error(data.message || "FlareSolverr failed");
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" });
    res.end();
    return;
  }

  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", curl: CURL_BIN, flaresolverr: !!FLARESOLVERR_URL }));
    return;
  }

  // BPS WebAPI: /v1/*
  if (req.url.startsWith("/v1/")) {
    try {
      const body = await curlFetch(`https://webapi.bps.go.id${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(body);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // AllStats Search: /allstats/*
  if (req.url.startsWith("/allstats/")) {
    const path = req.url.replace("/allstats/", "");
    const targetUrl = `https://searchengine.web.bps.go.id/${path}`;
    try {
      const body = FLARESOLVERR_URL
        ? await flareSolverrFetch(targetUrl)
        : await curlFetch(targetUrl);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(body);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => console.log(`[bps-api-proxy] listening on :${PORT}`));
