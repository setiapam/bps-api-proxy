const http = require("http");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 3000;
const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || "";
const CURL_BIN = process.env.CURL_BIN || "curl_chrome110";

/**
 * Fetch URL using curl-impersonate (Chrome TLS fingerprint).
 * Returns both the response body and the HTTP status code.
 */
function curlFetch(url) {
  return new Promise((resolve, reject) => {
    const marker = "\n---BPS-STATUS---";
    execFile(
      CURL_BIN,
      ["-s", "-w", `${marker}%{http_code}`, url],
      { timeout: 30000, maxBuffer: 2 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        const idx = stdout.lastIndexOf(marker);
        if (idx === -1) {
          reject(new Error("Invalid proxy response format: status code marker missing"));
          return;
        }
        const body = stdout.substring(0, idx);
        const statusCode = parseInt(stdout.substring(idx + marker.length), 10);
        resolve({ body, statusCode });
      }
    );
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
      const { body, statusCode } = await curlFetch(`https://webapi.bps.go.id${req.url}`);
      
      let isJson = true;
      try {
        JSON.parse(body);
      } catch (e) {
        isJson = false;
      }

      if (!isJson) {
        // If not valid JSON, it's highly likely a Cloudflare challenge page or upstream HTML error.
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Invalid JSON response from upstream. Cloudflare block or gateway error suspected.",
            statusCode,
            preview: body.substring(0, 500),
          })
        );
        return;
      }

      res.writeHead(statusCode, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
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
      let body;
      let statusCode = 200;
      if (FLARESOLVERR_URL) {
        body = await flareSolverrFetch(targetUrl);
      } else {
        const result = await curlFetch(targetUrl);
        body = result.body;
        statusCode = result.statusCode;
      }

      // Check if Cloudflare block page is returned in the HTML response
      if (body.includes("cloudflare") || body.includes("Just a moment")) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Cloudflare block or challenge page detected on AllStats.",
            statusCode,
            preview: body.substring(0, 500),
          })
        );
        return;
      }

      res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
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
