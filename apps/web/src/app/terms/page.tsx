import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="19 October 2026">
      <p className="notice">Template — have it reviewed before launch and replace the bracketed operator details.</p>
      <p>These terms govern your use of TapKit, provided by [Company name]. By using TapKit you agree to them.</p>
      <h2>Your content</h2>
      <p>You own what you create. You grant us the limited rights needed to store, process and display it to provide the service (including publishing the portfolio items you choose to make public).</p>
      <h2>AI-generated suggestions</h2>
      <p>TapKit's suggestions can be wrong or incomplete. Review everything before publishing. You're responsible for what you post and for making sure claims about you are true.</p>
      <h2>Acceptable use</h2>
      <p>Don't use TapKit to send spam, harass others, scrape personal data, infringe others' rights or break the law.</p>
      <h2>Subscriptions</h2>
      <p>TapKit Pro is an auto-renewing subscription billed through your Apple ID. It renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings. Refunds are handled by Apple. Apple's standard EULA applies to the iOS app.</p>
      <h2>Termination</h2>
      <p>You can delete your account at any time. We may suspend accounts that violate these terms.</p>
      <h2>Disclaimers and liability</h2>
      <p>TapKit is provided “as is”. We don't guarantee audience growth, income or other outcomes. To the extent permitted by law, our liability is limited to the amount you paid us in the 12 months before a claim.</p>
      <h2>Contact</h2>
      <p>[Company name, address, email]</p>
    </LegalPage>
  );
}
