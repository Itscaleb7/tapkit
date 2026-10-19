import { FONT_METRICS_RAW } from "./fontMetrics.generated.ts";

export type FontKey = keyof typeof FONT_METRICS_RAW;
export const FONT_KEYS = Object.keys(FONT_METRICS_RAW) as FontKey[];

interface FontMetrics {
  family: string;
  weight: number;
  ascent: number;
  descent: number;
  capHeight: number;
  fallback: number;
  widths: Map<string, number>;
}

const cache = new Map<FontKey, FontMetrics>();

export function fontMetrics(key: FontKey): FontMetrics {
  let m = cache.get(key);
  if (m) return m;
  const raw = FONT_METRICS_RAW[key];
  const widths = new Map<string, number>();
  const chars = Array.from(raw.chars);
  chars.forEach((ch, i) => widths.set(ch, raw.widths[i] ?? raw.fallback));
  m = {
    family: raw.family,
    weight: Number(key.split("-")[1]),
    ascent: raw.ascent,
    descent: raw.descent,
    capHeight: raw.capHeight,
    fallback: raw.fallback,
    widths,
  };
  cache.set(key, m);
  return m;
}

/**
 * How a renderer refers to a font. On iOS (react-native-svg) fonts are
 * registered under their expo-google-fonts key (e.g. "Inter_800ExtraBold"),
 * while desktop renderers (resvg) match by family + weight.
 */
export interface FontRef {
  family: string;
  weight: number;
}
export type FontResolver = (key: FontKey) => FontRef;

export const familyWeightResolver: FontResolver = (key) => {
  const m = fontMetrics(key);
  return { family: m.family, weight: m.weight };
};

/** Mapping used by the mobile app, where each weight is its own registered family. */
export const EXPO_FONT_NAMES: Record<FontKey, string> = {
  "inter-400": "Inter_400Regular",
  "inter-600": "Inter_600SemiBold",
  "inter-800": "Inter_800ExtraBold",
  "dmserif-400": "DMSerifDisplay_400Regular",
  "grotesk-500": "SpaceGrotesk_500Medium",
  "grotesk-700": "SpaceGrotesk_700Bold",
};

export const expoFontResolver: FontResolver = (key) => ({ family: EXPO_FONT_NAMES[key], weight: 400 });

/** Width of a string in px at the given size. Kerning is ignored, which slightly over-estimates width (safe for fitting). */
export function measureText(textValue: string, key: FontKey, size: number, letterSpacing = 0): number {
  const m = fontMetrics(key);
  let units = 0;
  let count = 0;
  for (const ch of textValue) {
    units += m.widths.get(ch) ?? m.fallback;
    count++;
  }
  return (units / 1000) * size + Math.max(0, count - 1) * letterSpacing;
}
