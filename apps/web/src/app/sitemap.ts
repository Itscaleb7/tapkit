import type { MetadataRoute } from "next";
import { site } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/privacy", "/terms", "/support"].map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly" }));
}
