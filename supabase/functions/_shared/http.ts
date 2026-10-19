// Shared HTTP helpers for Edge Functions.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}

/** Wrap a handler with CORS preflight, method check and uniform error responses. Never leaks stack traces. */
export function serve(handler: (req: Request) => Promise<Response>) {
  // LOCAL_FUNCTION_PORT lets the same code run under plain Deno for local testing
  // (scripts/serve-functions-deno.sh). The Supabase runtime ignores it.
  const port = Number(Deno.env.get("LOCAL_FUNCTION_PORT") ?? "0");
  const options = port ? { port } : {};
  Deno.serve(options, async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: { code: "method_not_allowed", message: "Use POST" } }, 405);
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(req, { error: { code: err.code, message: err.message, ...err.extra } }, err.status);
      }
      console.error("Unhandled error", err instanceof Error ? err.message : String(err));
      return json(req, { error: { code: "internal", message: "Something went wrong. Please try again." } }, 500);
    }
  });
}

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "payload_too_large", "Request is too large");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON");
  }
}
