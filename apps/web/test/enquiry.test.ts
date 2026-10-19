import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ publicClient: () => ({ rpc }) }));

const { sendEnquiry } = await import("../src/app/p/[slug]/actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const valid = { slug: "alex-builds", name: "Sam", email: "sam@example.com", message: "Can we work together?" };

describe("portfolio enquiry action", () => {
  beforeEach(() => rpc.mockReset());
  it("sends valid enquiries through the rate-limited RPC", async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await sendEnquiry({ status: "idle" }, form(valid))).toEqual({ status: "sent" });
    expect(rpc).toHaveBeenCalledWith("submit_portfolio_enquiry", { p_slug: "alex-builds", p_name: "Sam", p_email: "sam@example.com", p_message: "Can we work together?" });
  });
  it("silently drops honeypot submissions without touching the database", async () => {
    expect(await sendEnquiry({ status: "idle" }, form({ ...valid, website: "spam.example" }))).toEqual({ status: "sent" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid input", async () => {
    const r = await sendEnquiry({ status: "idle" }, form({ ...valid, email: "nope" }));
    expect(r.status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("reports rate limiting", async () => {
    rpc.mockResolvedValue({ data: { ok: false, error: "rate_limited" }, error: null });
    expect((await sendEnquiry({ status: "idle" }, form(valid))).message).toMatch(/busy/);
  });
});
