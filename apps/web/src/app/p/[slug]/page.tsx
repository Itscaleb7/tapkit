import { labelOf, OFFER_TYPES, readableOn } from "@tapkit/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Chrome";
import { SlideSvg } from "@/components/Slide";
import { getPortfolio } from "@/lib/portfolio";
import { EnquiryForm } from "./EnquiryForm";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPortfolio(slug).catch(() => null);
  if (!p) return { title: "Portfolio not found", robots: { index: false } };
  return {
    title: p.display_name,
    description: p.headline ?? p.positioning ?? `${p.display_name} on TapKit`,
    openGraph: { title: p.display_name, description: p.headline ?? p.positioning ?? undefined, images: p.avatar_url ? [p.avatar_url] : undefined },
  };
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPortfolio(slug);
  if (!p) notFound();
  const accentText = readableOn(p.accent_color);
  return (
    <div style={{ ["--accent" as string]: p.accent_color }}>
      <main className="container" style={{ maxWidth: 880 }}>
        <header className="pf-header">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pf-avatar" src={p.avatar_url} alt={p.display_name} width={96} height={96} />
          ) : (
            <div className="pf-avatar" aria-hidden>
              {p.display_name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>{p.display_name}</h1>
            {p.headline && (
              <p className="lead" style={{ margin: "8px 0 0" }}>
                {p.headline}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {p.contact_url && (
                <a className="btn" style={{ background: p.accent_color, color: accentText }} href={p.contact_url} rel="noopener noreferrer nofollow" target="_blank">
                  Visit website
                </a>
              )}
              {p.contact_email && (
                <a className="btn btn-secondary" href={`mailto:${p.contact_email}`}>
                  Email
                </a>
              )}
              {p.enquiries_enabled && (
                <a className="btn btn-secondary" href="#contact">
                  Send a message
                </a>
              )}
            </div>
          </div>
        </header>

        {p.positioning && (
          <section className="pf-section">
            <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, margin: 0 }}>{p.positioning}</p>
          </section>
        )}
        {(p.bio || p.skills.length > 0) && (
          <section className="pf-section">
            <h2 style={{ fontSize: 22 }}>About</h2>
            {p.bio && <p style={{ whiteSpace: "pre-line" }}>{p.bio}</p>}
            {p.skills.length > 0 && (
              <div className="pf-skills" aria-label="Skills">
                {p.skills.map((s) => (
                  <span key={s} className="pf-skill">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
        {p.experience && (
          <section className="pf-section">
            <h2 style={{ fontSize: 22 }}>Experience</h2>
            <p style={{ whiteSpace: "pre-line" }}>{p.experience}</p>
          </section>
        )}

        {p.offers.length > 0 && (
          <section className="pf-section">
            <h2 style={{ fontSize: 22 }}>Work with me</h2>
            <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 16 }}>
              {p.offers.map((o) => (
                <div key={o.title} className="card">
                  <span className="badge">{labelOf(OFFER_TYPES, o.offer_type)}</span>
                  <h3 style={{ marginTop: 10 }}>{o.title}</h3>
                  {o.description && <p className="muted">{o.description}</p>}
                  {o.deliverables.length > 0 && (
                    <ul className="check">
                      {o.deliverables.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {o.cta_url && (
                    <a className="btn" style={{ marginTop: 16, background: p.accent_color, color: accentText }} href={o.cta_url} rel="noopener noreferrer nofollow" target="_blank">
                      Get in touch
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {p.items.length > 0 && (
          <section className="pf-section">
            <h2 style={{ fontSize: 22 }}>Selected work</h2>
            <div style={{ display: "grid", gap: 28, marginTop: 16 }}>
              {p.items.map((item, idx) => (
                <article key={idx}>
                  <h3>{item.title}</h3>
                  {item.description && <p className="muted">{item.description}</p>}
                  {item.content && item.content.slides.length > 0 && (
                    <div className="carousel-row" tabIndex={0} aria-label={`${item.title} carousel`}>
                      {item.content.slides.map((s, i) => (
                        <div key={s.id} className="slide-card">
                          <SlideSvg slide={s} index={i} total={item.content!.slides.length} themeId={item.content!.theme_id} label={`${item.title}, slide ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}
                  {item.content?.caption && <p style={{ whiteSpace: "pre-line" }}>{item.content.caption}</p>}
                  {(item.url || item.content?.published_url) && (
                    <a href={(item.url || item.content?.published_url)!} rel="noopener noreferrer nofollow" target="_blank">
                      View →
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {p.enquiries_enabled && (
          <section id="contact" className="pf-section">
            <h2 style={{ fontSize: 22, marginBottom: 16 }}>Send {p.display_name.split(" ")[0]} a message</h2>
            <EnquiryForm slug={p.slug} name={p.display_name} />
          </section>
        )}
        <p className="muted" style={{ fontSize: 13, padding: "24px 0" }}>
          Made with <a href="/">TapKit</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
