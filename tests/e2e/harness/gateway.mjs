// Local-only test gateway: forwards /functions/v1/<name> to functions served by
// scripts/serve-functions-deno.sh and everything else to the Supabase API (54321).
// Used where the Supabase edge-runtime container can't run (see docs/TESTING.md).
import http from "node:http";

const PORT = Number(process.env.GATEWAY_PORT ?? 54500);
const SUPABASE = { host: "127.0.0.1", port: 54321 };
const FN_PORTS = { ai: 54401, "subscription-sync": 54402, "revenuecat-webhook": 54403, "account-delete": 54404, "account-export": 54405, transcribe: 54406 };

http
  .createServer((req, res) => {
    const m = /^\/functions\/v1\/([a-z-]+)(\/.*)?$/.exec(req.url ?? "");
    const target = m && FN_PORTS[m[1]] ? { host: "127.0.0.1", port: FN_PORTS[m[1]], path: m[2] ?? "/" } : { ...SUPABASE, path: req.url };
    const up = http.request({ ...target, method: req.method, headers: { ...req.headers, host: `${target.host}:${target.port}` } }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on("error", () => {
      res.writeHead(502, { "Access-Control-Allow-Origin": "*" });
      res.end("bad gateway");
    });
    req.pipe(up);
  })
  .listen(PORT, () => console.log(`gateway on :${PORT}`));
