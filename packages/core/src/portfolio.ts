/** Public portfolio DTO + sanitisation. The DB function `get_public_portfolio` is the source of truth; this mirrors its shape. */

export interface PublicPortfolio {
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  positioning: string | null;
  skills: string[];
  experience: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  contact_url: string | null;
  accent_color: string;
  enquiries_enabled: boolean;
  items: { kind: string; title: string; description: string | null; url: string | null; content?: { format: string; caption: string | null; slides_text: string | null; published_url: string | null } | null }[];
  offers: { title: string; offer_type: string; audience: string | null; problem: string | null; deliverables: string[]; description: string | null; pricing_hypothesis: string | null; cta_url: string | null }[];
}

export const DEFAULT_ACCENT = "#FF6A13";

export function suggestSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base.length >= 3 ? base : `${base || "me"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function portfolioUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/p/${encodeURIComponent(slug)}`;
}

/** Hex colour → whether white text is readable on it (WCAG relative luminance). */
export function readableOn(hex: string): "#FFFFFF" | "#1A1410" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const n = parseInt(m[1]!, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  return (1.05 / (L + 0.05)) >= 3 ? "#FFFFFF" : "#1A1410";
}
