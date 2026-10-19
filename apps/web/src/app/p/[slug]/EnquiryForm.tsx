"use client";

import { useActionState } from "react";
import { type EnquiryState, sendEnquiry } from "./actions";

export function EnquiryForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(sendEnquiry, { status: "idle" });
  if (state.status === "sent") {
    return (
      <p role="status" className="card">
        Thanks — your message was sent to {name}.
      </p>
    );
  }
  return (
    <form action={action} className="form" aria-label={`Send ${name} a message`}>
      <input type="hidden" name="slug" value={slug} />
      <label className="hp" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label>
        <span className="sr-only">Your name</span>
        <input name="name" required maxLength={120} placeholder="Your name" autoComplete="name" />
      </label>
      <label>
        <span className="sr-only">Your email</span>
        <input name="email" type="email" required maxLength={254} placeholder="you@example.com" autoComplete="email" />
      </label>
      <label>
        <span className="sr-only">Message</span>
        <textarea name="message" required maxLength={2000} placeholder="What would you like to talk about?" />
      </label>
      {state.status === "error" && (
        <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
          {state.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ background: "var(--accent)" }}>
        {pending ? "Sending…" : "Send message"}
      </button>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Your message goes to {name} through TapKit. Your details are only shared with them.
      </p>
    </form>
  );
}
