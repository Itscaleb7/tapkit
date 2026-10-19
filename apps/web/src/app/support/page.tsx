import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/config";

export const metadata: Metadata = { title: "Support" };

export default function Support() {
  return (
    <LegalPage title="Support" updated="19 October 2026">
      <p>
        Need help? Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> and include the email you signed up with. We usually reply within two business days.
      </p>
      <h2>Common questions</h2>
      <h3 style={{ marginTop: 20 }}>How do I cancel TapKit Pro?</h3>
      <p>On your iPhone: Settings → your name → Subscriptions → TapKit → Cancel. You keep Pro until the end of the period you paid for.</p>
      <h3>I bought Pro but don't see it</h3>
      <p>In the app, open Settings → Subscription → Restore purchases. Make sure you're signed in to the same Apple ID you used to subscribe.</p>
      <h3>How do I delete my account?</h3>
      <p>In the app, open Settings → Account → Delete account. This permanently deletes your data. Cancel any App Store subscription separately.</p>
      <h3>How do I export my data?</h3>
      <p>Settings → Privacy &amp; data → Export my data.</p>
      <h3>Someone's portfolio contains something inappropriate</h3>
      <p>Email us the portfolio link and what's wrong. We review every report.</p>
    </LegalPage>
  );
}
