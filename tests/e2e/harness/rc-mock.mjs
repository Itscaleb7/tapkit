// Mock RevenueCat REST API for local E2E only. GET /v1/subscribers/:id returns an
// active sandbox "pro" entitlement for ids activated via POST /activate {user_id}.
import http from "node:http";

const active = new Set();
http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/activate") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        active.add(JSON.parse(body).user_id);
        res.writeHead(200).end("{}");
      });
      return;
    }
    if (req.headers.authorization !== `Bearer ${process.env.REVENUECAT_SECRET_API_KEY ?? "test_rc_secret"}`) return res.writeHead(401).end();
    const id = decodeURIComponent((req.url ?? "").split("/").pop() ?? "");
    const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const subscriber = active.has(id)
      ? {
          entitlements: { pro: { expires_date: expires, product_identifier: "tapkit_pro_monthly" } },
          subscriptions: { tapkit_pro_monthly: { expires_date: expires, is_sandbox: true, store: "app_store", period_type: "normal" } },
        }
      : { entitlements: {}, subscriptions: {} };
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ subscriber }));
  })
  .listen(Number(process.env.RC_MOCK_PORT ?? 54399), () => console.log("rc mock on :54399"));
