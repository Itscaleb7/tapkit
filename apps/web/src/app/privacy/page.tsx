import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="19 October 2026">
      <p className="notice">
        Template prepared for TapKit's actual data flows. Before launch, have it reviewed for your jurisdiction and replace the bracketed operator details.
      </p>
      <p>
        This policy explains what TapKit (“we”), operated by [Company name, address], collects, why, and the choices you have. Contact: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, name, password (stored hashed by our authentication provider).</li>
        <li><strong>Content you create:</strong> onboarding answers, Brand Blueprint, brand settings, Proof Bank entries (text, links, voice recordings and transcripts), content drafts, experiments, results you enter, offers, leads and portfolio settings.</li>
        <li><strong>Subscription status:</strong> whether you have an active TapKit Pro subscription, its product, expiry and renewal state. We never receive your card details — payments are handled by Apple.</li>
        <li><strong>Usage records:</strong> counts of AI generations and exports, used to apply plan limits.</li>
        <li><strong>Portfolio enquiries:</strong> the name, email and message a visitor sends through a public portfolio.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: store your work, generate suggestions and content, enforce plan limits and show your portfolio.</li>
        <li>To verify subscriptions and prevent abuse.</li>
        <li>To respond to support requests.</li>
      </ul>
      <p>We do not sell personal data, show third-party ads or use advertising trackers.</p>
      <h2>Service providers</h2>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, file storage and server functions.</li>
        <li><strong>Anthropic</strong> — AI generation. Only the information needed for a specific request (for example, your accepted brand summary and the Proof Bank entries you selected) is sent.</li>
        <li><strong>Apple and RevenueCat</strong> — in-app purchases and subscription status.</li>
        <li><strong>OpenAI</strong> — speech-to-text for voice notes, only if transcription is enabled.</li>
      </ul>
      <h2>Privacy by default</h2>
      <p>Your Proof Bank, drafts, analytics, experiments and pipeline are private to your account. Your public portfolio shows only the fields and items you choose to publish, and you can unpublish it at any time.</p>
      <h2>Retention and deletion</h2>
      <p>We keep your data while your account exists. You can export your data and permanently delete your account in the app (Settings → Account). Deletion removes your records and stored files; residual copies in encrypted backups expire on our provider's backup schedule.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live you may have rights to access, correct, export, delete or object to processing of your data. Use the in-app tools or contact us.</p>
      <h2>Children</h2>
      <p>TapKit is not directed to children under 13 (or the minimum age in your country).</p>
      <h2>Changes</h2>
      <p>We'll post updates here and, for material changes, notify you in the app.</p>
    </LegalPage>
  );
}
