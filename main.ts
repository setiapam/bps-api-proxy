const BPS_BASE = "https://webapi.bps.go.id";
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

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
    const res = await fetch(target, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
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
