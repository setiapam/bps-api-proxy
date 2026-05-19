const BPS_BASE = "https://webapi.bps.go.id";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/" || url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", proxy: "bps-api" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy /v1/* to BPS API
  if (url.pathname.startsWith("/v1/")) {
    const target = `${BPS_BASE}${url.pathname}${url.search}`;

    // Forward the request with browser-like headers
    const res = await fetch(target, {
      method: req.method,
      headers: {
        "Accept": "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      redirect: "follow",
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response("Not found", { status: 404 });
});
