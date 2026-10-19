import { blankSlide, PLAN_LIMITS, proFeatureList, type Slide } from "@tapkit/core";
import { AppStoreButton, Footer, Nav } from "@/components/Chrome";
import { SlideSvg } from "@/components/Slide";

// Example output used to demonstrate the product. Clearly labelled as an example — not a user or testimonial.
const EXAMPLE: Slide[] = [
  blankSlide("hook", { kicker: "Personal brand", heading: "Posting every day isn't a strategy.", body: "What to decide before you post again →" }),
  blankSlide("list", { heading: "Find what you should be known for", items: ["What do people already ask you about?", "What could you talk about for an hour?", "Who were you two years ago?"] }),
  blankSlide("comparison", { heading: "Random posting vs a brand", left_title: "Random", right_title: "Brand", left_items: ["Chase trends", "New topic daily"], right_items: ["3 clear pillars", "A promise people remember"] }),
  blankSlide("myth_fact", { heading: "You need to be an expert first", body: "You need to be honest. People one step behind you want your notes." }),
  blankSlide("cta", { heading: "Start from zero — on purpose.", body: "Capture one real lesson today.", kicker: "Save this" }),
];

const STEPS = [
  ["Discover your brand", "Answer a few questions and get a Brand Blueprint: positioning, audience, voice and 3–5 content pillars — with the reasoning shown."],
  ["Capture your experiences", "Your private Proof Bank stores real lessons, stories, opinions and wins, by text or voice."],
  ["Create personalised content", "Turn a real experience into an Instagram carousel in your voice. Edit every slide and export crisp 4:5 images."],
  ["Learn from results", "Run small growth experiments, record your real numbers and get honest weekly reviews — never invented analytics."],
  ["Build toward opportunities", "Shape clear offers, track leads and share a public portfolio that anyone can open in a browser."],
] as const;

const FAQ = [
  ["I have zero followers and no niche. Is TapKit for me?", "That's exactly who it's for. TapKit helps you choose what to be known for and gives you a realistic first week — documenting your journey and learning in public both count."],
  ["Does TapKit make things up about me?", "No. Content is grounded in your Brand Blueprint and your own Proof Bank entries. When a post would need a fact you haven't provided, TapKit leaves a placeholder instead of inventing it."],
  ["Does TapKit post for me or scrape analytics?", "No. You export images and post them yourself. Results come from numbers you enter from your platform's insights, so nothing is estimated."],
  ["Is my Proof Bank private?", "Yes. Everything is private by default. Only the portfolio fields and items you choose to publish are public."],
  ["What does Pro cost?", "TapKit Pro is an auto-renewing monthly or annual subscription purchased in the iOS app. The current price for your country is shown in the App Store before you subscribe."],
] as const;

export default function Landing() {
  const free = PLAN_LIMITS.free;
  return (
    <>
      <Nav />
      <main>
        <section className="container hero">
          <div>
            <span className="eyebrow">For people starting from zero</span>
            <h1 style={{ marginTop: 14 }}>Build your personal brand from zero.</h1>
            <p className="lead" style={{ marginTop: 20 }}>
              TapKit helps you discover what you should be known for, turn your real experiences into content, learn from what actually works, and build toward clients, partnerships and career opportunities.
            </p>
            <div className="hero-actions">
              <AppStoreButton />
              <a className="btn btn-secondary" href="#how">
                See how it works
              </a>
            </div>
            <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
              Free to start. No followers, portfolio or expertise required.
            </p>
          </div>
          <div className="slide-fan" aria-label="Example carousel created with TapKit">
            {EXAMPLE.slice(0, 3).map((s, i) => (
              <div key={s.id} className="slide" style={{ left: `${i * 18}%`, top: `${i * 7}%`, transform: `rotate(${(i - 1) * 4}deg)`, zIndex: 3 - i }}>
                <SlideSvg slide={s} index={i} total={EXAMPLE.length} themeId={["tapkit", "ink", "editorial"][i]!} handle="@yourname" />
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="section section-alt">
          <div className="container">
            <span className="eyebrow">One connected system</span>
            <h2 style={{ marginTop: 10, maxWidth: 720 }}>From “what should I even post?” to real opportunities.</h2>
            <div className="grid-5" style={{ marginTop: 40 }}>
              {STEPS.map(([title, body], i) => (
                <div key={title} className="card">
                  <div className="step-num" aria-hidden>
                    {i + 1}
                  </div>
                  <h3>{title}</h3>
                  <p className="muted" style={{ fontSize: 15 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <span className="eyebrow">What makes it different</span>
            <h2 style={{ marginTop: 10 }}>Not another caption generator.</h2>
            <div className="grid-3" style={{ marginTop: 40 }}>
              <div className="card">
                <h3>The Proof Bank</h3>
                <p className="muted">Capture the real raw material of your brand — the lesson from a failed launch, the opinion you hold, the client win. TapKit turns it into authentic content opportunities.</p>
              </div>
              <div className="card">
                <h3>Brand Evolution</h3>
                <p className="muted">TapKit remembers your strategy, experiments and results, then suggests what to test next. It never rewrites your identity without your say.</p>
              </div>
              <div className="card">
                <h3>Honest about evidence</h3>
                <p className="muted">One good post isn't a pattern. TapKit separates what happened from what's uncertain, so you learn instead of guessing.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-alt">
          <div className="container">
            <span className="eyebrow">Example output</span>
            <h2 style={{ marginTop: 10 }}>Carousels that look like you meant it.</h2>
            <p className="lead">Deterministic, pixel-perfect layouts exported at 1080 × 1350 — no AI-mangled text in images. This example was generated by TapKit&apos;s renderer for illustration.</p>
            <div className="carousel-row" tabIndex={0} aria-label="Example carousel slides">
              {EXAMPLE.map((s, i) => (
                <div key={s.id} className="slide-card">
                  <SlideSvg slide={s} index={i} total={EXAMPLE.length} themeId="tapkit" handle="@yourname" label={`Example slide ${i + 1}: ${s.heading}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="container">
            <span className="eyebrow">Pricing</span>
            <h2 style={{ marginTop: 10 }}>Start free. Upgrade when it&apos;s working.</h2>
            <div className="pricing" style={{ marginTop: 36 }}>
              <div className="card">
                <h3>Free</h3>
                <p className="muted">Genuinely useful, forever.</p>
                <ul className="check">
                  <li>Brand Blueprint with editable strategy</li>
                  <li>Proof Bank (up to {free.proofEntries} entries)</li>
                  <li>{free.aiGenerationsPerMonth} AI generations per month</li>
                  <li>{free.exportsPerMonth} carousel exports per month</li>
                  <li>Growth experiments and a monthly weekly review</li>
                  <li>Public portfolio</li>
                </ul>
              </div>
              <div className="card plan-pro">
                <span className="badge">TapKit Pro</span>
                <h3 style={{ marginTop: 10 }}>Pro</h3>
                <p className="muted">Monthly or annual subscription in the iOS app. Price shown in the App Store.</p>
                <ul className="check">
                  {proFeatureList().map((f) => (
                    <li key={f.title}>
                      <span>
                        <strong>{f.title}</strong> — {f.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section section-alt">
          <div className="container prose">
            <h2>Questions</h2>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p className="muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="container" style={{ textAlign: "center" }}>
            <h2>Your brand starts with one real story.</h2>
            <p className="lead" style={{ margin: "16px auto 28px" }}>
              Capture it today. TapKit helps you do the rest.
            </p>
            <AppStoreButton dark />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
