"use server";

import { enquirySchema } from "@tapkit/core";
import { publicClient } from "@/lib/supabase";

export interface EnquiryState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export async function sendEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse({
    slug: form.get("slug"),
    name: form.get("name"),
    email: form.get("email"),
    message: form.get("message"),
    website: form.get("website") ?? "",
  });
  if (!parsed.success) {
    // Honeypot filled → pretend success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { status: "sent" };
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { data, error } = await publicClient().rpc("submit_portfolio_enquiry", {
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_message: parsed.data.message,
  });
  if (error) return { status: "error", message: "Couldn't send right now. Please try again later." };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { status: "error", message: r.error === "rate_limited" ? "This inbox is busy today. Please try again tomorrow." : r.error === "invalid" ? "Please check your details." : "Enquiries aren't open right now." };
  return { status: "sent" };
}
