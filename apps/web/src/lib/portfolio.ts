import { type Slide, slidesSchema } from "@tapkit/core";
import { cache } from "react";
import { site } from "./config";
import { publicClient } from "./supabase";

export interface PortfolioItemView {
  kind: string;
  title: string;
  description: string | null;
  url: string | null;
  content: { format: string; caption: string | null; published_url: string | null; theme_id: string; slides: Slide[] } | null;
}

export interface PortfolioView {
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
  items: PortfolioItemView[];
  offers: { title: string; offer_type: string; audience: string | null; problem: string | null; deliverables: string[]; description: string | null; pricing_hypothesis: string | null; cta_url: string | null }[];
}

const SAFE_URL = /^https?:\/\//i;
const safeUrl = (u: unknown) => (typeof u === "string" && SAFE_URL.test(u) ? u : null);

/** Fetch + sanitise a published portfolio (null when missing or unpublished). */
export const getPortfolio = cache(async (slug: string): Promise<PortfolioView | null> => {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const { data, error } = await publicClient().rpc("get_public_portfolio", { p_slug: slug });
  if (error) throw new Error("Portfolio unavailable");
  if (!data) return null;
  const p = data as Record<string, unknown>;
  const items = ((p.items as Record<string, unknown>[]) ?? []).map((i) => {
    const c = i.content as Record<string, unknown> | null;
    const slides = c ? slidesSchema.safeParse(c.slides) : null;
    return {
      kind: String(i.kind),
      title: String(i.title),
      description: (i.description as string) ?? null,
      url: safeUrl(i.url),
      content: c ? { format: String(c.format), caption: (c.caption as string) ?? null, published_url: safeUrl(c.published_url), theme_id: String(c.theme_id ?? "tapkit"), slides: slides?.success ? slides.data : [] } : null,
    };
  });
  const avatarPath = p.avatar_path as string | null;
  return {
    slug: String(p.slug),
    display_name: String(p.display_name),
    headline: (p.headline as string) ?? null,
    bio: (p.bio as string) ?? null,
    positioning: (p.positioning as string) ?? null,
    skills: (p.skills as string[]) ?? [],
    experience: (p.experience as string) ?? null,
    avatar_url: avatarPath ? `${site.supabaseUrl}/storage/v1/object/public/portfolio-media/${avatarPath.split("/").map(encodeURIComponent).join("/")}` : null,
    contact_email: (p.contact_email as string) ?? null,
    contact_url: safeUrl(p.contact_url),
    accent_color: /^#[0-9a-f]{6}$/i.test(String(p.accent_color)) ? String(p.accent_color) : "#FF6A13",
    enquiries_enabled: Boolean(p.enquiries_enabled),
    items,
    offers: ((p.offers as PortfolioView["offers"]) ?? []).map((o) => ({ ...o, cta_url: safeUrl(o.cta_url) })),
  };
});
