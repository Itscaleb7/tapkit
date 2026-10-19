import type { FontKey } from "./fonts.ts";

export interface CarouselTheme {
  id: string;
  name: string;
  premium: boolean;
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  headingFont: FontKey;
  bodyFont: FontKey;
  labelFont: FontKey;
  /** Decorative treatment drawn by the renderer. */
  decoration: "corner" | "bar" | "grid" | "none" | "frame";
  headingCase: "none" | "upper";
}

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: "tapkit",
    name: "TapKit",
    premium: false,
    background: "#FFFFFF",
    surface: "#FFF4EC",
    text: "#1A1410",
    muted: "#6B5E55",
    accent: "#FF6A13",
    accentText: "#FFFFFF",
    headingFont: "inter-800",
    bodyFont: "inter-400",
    labelFont: "inter-600",
    decoration: "corner",
    headingCase: "none",
  },
  {
    id: "ink",
    name: "Ink",
    premium: false,
    background: "#16120F",
    surface: "#241E1A",
    text: "#FFFFFF",
    muted: "#B8ADA4",
    accent: "#FF7A2E",
    accentText: "#16120F",
    headingFont: "inter-800",
    bodyFont: "inter-400",
    labelFont: "inter-600",
    decoration: "bar",
    headingCase: "none",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    premium: true,
    background: "#FF6A13",
    surface: "#FF8642",
    text: "#FFFFFF",
    muted: "#FFE3D1",
    accent: "#1A1410",
    accentText: "#FFFFFF",
    headingFont: "inter-800",
    bodyFont: "inter-400",
    labelFont: "inter-600",
    decoration: "frame",
    headingCase: "none",
  },
  {
    id: "editorial",
    name: "Editorial",
    premium: true,
    background: "#F7F1E8",
    surface: "#EFE6D8",
    text: "#231C15",
    muted: "#6E6253",
    accent: "#D9531E",
    accentText: "#FFFFFF",
    headingFont: "dmserif-400",
    bodyFont: "inter-400",
    labelFont: "inter-600",
    decoration: "none",
    headingCase: "none",
  },
  {
    id: "grid",
    name: "Grid",
    premium: true,
    background: "#FAFAF7",
    surface: "#FFFFFF",
    text: "#111111",
    muted: "#5C5C5C",
    accent: "#FF5A00",
    accentText: "#FFFFFF",
    headingFont: "grotesk-700",
    bodyFont: "grotesk-500",
    labelFont: "grotesk-700",
    decoration: "grid",
    headingCase: "upper",
  },
];

export const DEFAULT_THEME_ID = "tapkit";

export function getTheme(id: string | null | undefined): CarouselTheme {
  return CAROUSEL_THEMES.find((t) => t.id === id) ?? CAROUSEL_THEMES[0]!;
}

export function isPremiumTheme(id: string | null | undefined): boolean {
  return getTheme(id).premium && getTheme(id).id === id;
}
