import type { Slide } from "../schemas.ts";
import { type FontKey, type FontResolver, familyWeightResolver, measureText } from "./fonts.ts";
import { SLIDE_HEIGHT as H, SLIDE_WIDTH as W } from "./slides.ts";
import { baselineFor, type FittedText, fitText, wrapText } from "./textLayout.ts";
import { type CarouselTheme, getTheme } from "./themes.ts";

/* Deterministic slide layout → drawing primitives → SVG.
 * The exact same layout is used for on-device preview/export (react-native-svg)
 * and for server/test rendering (resvg), so exported images match the editor. */

export const MARGIN = 96;
const CONTENT_W = W - MARGIN * 2;
const TOP = 150;
const CONTENT_BOTTOM = H - 190;

export type Primitive =
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; fill: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; opacity?: number }
  | { t: "path"; d: string; stroke: string; strokeWidth: number; fill?: string }
  | { t: "text"; x: number; y: number; text: string; font: FontKey; size: number; fill: string; anchor: "start" | "middle" | "end"; letterSpacing?: number };

export interface SlideRenderContext {
  index: number;
  total: number;
  /** e.g. "@alexbuilds" — shown in the footer when provided. */
  handle?: string;
  themeId?: string | null;
}

export interface SlideLayoutResult {
  primitives: Primitive[];
  /** Fields that had to be truncated to fit. Surfaced as warnings in the editor. */
  overflow: string[];
  theme: CarouselTheme;
}

const cased = (theme: CarouselTheme, s: string) => (theme.headingCase === "upper" ? s.toUpperCase() : s);

function textLines(
  fitted: FittedText,
  x: number,
  top: number,
  font: FontKey,
  fill: string,
  anchor: "start" | "middle" | "end" = "start",
  letterSpacing?: number,
): Primitive[] {
  return fitted.lines.map((line, i) => ({
    t: "text" as const,
    x,
    y: baselineFor(top, i, fitted.size, fitted.lineHeightPx, font),
    text: line,
    font,
    size: fitted.size,
    fill,
    anchor,
    letterSpacing,
  }));
}

function pill(label: string, x: number, y: number, theme: CarouselTheme, size = 26, anchor: "start" | "middle" = "start"): { prims: Primitive[]; height: number } {
  const textValue = label.toUpperCase();
  const spacing = 2;
  const maxTextW = CONTENT_W - 56;
  let s = size;
  while (s > 16 && measureText(textValue, theme.labelFont, s, spacing) > maxTextW) s -= 2;
  const tw = Math.min(maxTextW, measureText(textValue, theme.labelFont, s, spacing));
  const h = s + 30;
  const w = tw + 56;
  const left = anchor === "middle" ? x - w / 2 : x;
  return {
    height: h,
    prims: [
      { t: "rect", x: left, y, w, h, r: h / 2, fill: theme.accent },
      { t: "text", x: left + 28, y: baselineFor(y, 0, s, h, theme.labelFont), text: textValue, font: theme.labelFont, size: s, fill: theme.accentText, anchor: "start", letterSpacing: spacing },
    ],
  };
}

function decorations(theme: CarouselTheme): Primitive[] {
  switch (theme.decoration) {
    case "corner":
      return [
        { t: "circle", cx: W - 20, cy: 20, r: 150, fill: theme.accent, opacity: 0.12 },
        { t: "circle", cx: W - 20, cy: 20, r: 80, fill: theme.accent },
      ];
    case "bar":
      return [{ t: "rect", x: MARGIN, y: 84, w: 120, h: 12, r: 6, fill: theme.accent }];
    case "frame":
      return [{ t: "rect", x: 40, y: 40, w: W - 80, h: H - 80, r: 36, fill: "none", stroke: theme.muted, strokeWidth: 3, opacity: 0.6 }];
    case "grid": {
      const out: Primitive[] = [];
      for (let x = 90; x < W; x += 90) out.push({ t: "line", x1: x, y1: 0, x2: x, y2: H, stroke: theme.text, strokeWidth: 1, opacity: 0.06 });
      for (let y = 90; y < H; y += 90) out.push({ t: "line", x1: 0, y1: y, x2: W, y2: y, stroke: theme.text, strokeWidth: 1, opacity: 0.06 });
      out.push({ t: "rect", x: MARGIN, y: 56, w: 36, h: 36, fill: theme.accent });
      return out;
    }
    default:
      return [];
  }
}

function footer(ctx: SlideRenderContext, theme: CarouselTheme): Primitive[] {
  const y = H - 96;
  const out: Primitive[] = [];
  if (ctx.handle) {
    let label = ctx.handle.trim().slice(0, 40);
    while (label.length > 1 && measureText(label, theme.labelFont, 28) > CONTENT_W - 200) label = label.slice(0, -1);
    out.push({ t: "text", x: MARGIN, y, text: label, font: theme.labelFont, size: 28, fill: theme.muted, anchor: "start" });
  }
  if (ctx.total > 1) {
    const isLast = ctx.index === ctx.total - 1;
    const counter = `${ctx.index + 1}/${ctx.total}${isLast ? "" : "  →"}`;
    out.push({ t: "text", x: W - MARGIN, y, text: counter, font: theme.labelFont, size: 28, fill: theme.muted, anchor: "end" });
  }
  return out;
}

interface Box {
  prims: Primitive[];
  overflow: string[];
}

function layoutItems(
  items: string[],
  theme: CarouselTheme,
  top: number,
  bottom: number,
  marker: "number" | "check" | "bullet",
  x = MARGIN,
  width = CONTENT_W,
  sizes: [number, number] = [40, 24],
  color = theme.text,
): Box {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return { prims: [], overflow: [] };
  const markerW = marker === "bullet" ? 36 : 84;
  const textW = width - markerW;
  const gap = 30;
  const lh = 1.3;
  const available = bottom - top;
  let chosen: { size: number; wrapped: string[][] } | null = null;
  for (let size = sizes[0]; size >= sizes[1]; size -= 2) {
    const wrapped = clean.map((it) => wrapText(it, { font: theme.bodyFont, size, maxWidth: textW }));
    const total = wrapped.reduce((s, l) => s + Math.max(l.length * size * lh, marker === "bullet" ? 0 : 60), 0) + gap * (clean.length - 1);
    if (total <= available) {
      chosen = { size, wrapped };
      break;
    }
  }
  let overflow = false;
  if (!chosen) {
    const size = sizes[1];
    const perItem = Math.max(1, Math.floor((available - gap * (clean.length - 1)) / clean.length / (size * lh)));
    chosen = {
      size,
      wrapped: clean.map((it) => {
        const f = fitText(it, { font: theme.bodyFont, maxSize: size, minSize: size, maxWidth: textW, maxHeight: perItem * size * lh, lineHeight: lh });
        if (f.overflow) overflow = true;
        return f.lines;
      }),
    };
  }
  const prims: Primitive[] = [];
  let y = top;
  const { size, wrapped } = chosen;
  const lhPx = size * lh;
  const used = wrapped.reduce((s, l) => s + Math.max(l.length * lhPx, marker === "bullet" ? 0 : 60), 0) + gap * (wrapped.length - 1);
  const spread = wrapped.length > 1 ? Math.min(marker === "bullet" ? 20 : 48, Math.max(0, (available - used) / (wrapped.length - 1) / 2)) : 0;
  wrapped.forEach((lines, i) => {
    const blockH = Math.max(lines.length * lhPx, marker === "bullet" ? 0 : 60);
    const firstCenter = y + lhPx / 2;
    if (marker === "number") {
      prims.push({ t: "circle", cx: x + 30, cy: firstCenter, r: 30, fill: theme.accent });
      prims.push({ t: "text", x: x + 30, y: firstCenter + 10, text: String(i + 1), font: theme.labelFont, size: 28, fill: theme.accentText, anchor: "middle" });
    } else if (marker === "check") {
      prims.push({ t: "rect", x, y: firstCenter - 28, w: 56, h: 56, r: 14, fill: "none", stroke: theme.accent, strokeWidth: 5 });
      prims.push({ t: "path", d: `M ${x + 14} ${firstCenter} L ${x + 25} ${firstCenter + 12} L ${x + 43} ${firstCenter - 12}`, stroke: theme.accent, strokeWidth: 6, fill: "none" });
    } else {
      prims.push({ t: "circle", cx: x + 8, cy: firstCenter, r: 7, fill: theme.accent });
    }
    lines.forEach((line, li) => {
      prims.push({ t: "text", x: x + markerW, y: baselineFor(y, li, size, lhPx, theme.bodyFont), text: line, font: theme.bodyFont, size, fill: color, anchor: "start" });
    });
    y += blockH + gap + spread;
  });
  return { prims, overflow: overflow ? ["items"] : [] };
}

export function layoutSlide(slide: Slide, ctx: SlideRenderContext): SlideLayoutResult {
  const theme = getTheme(ctx.themeId);
  const prims: Primitive[] = [{ t: "rect", x: 0, y: 0, w: W, h: H, fill: theme.background }, ...decorations(theme)];
  const overflow: string[] = [];
  const flag = (f: FittedText, field: string) => {
    if (f.overflow) overflow.push(field);
    return f;
  };
  const heading = cased(theme, slide.heading);
  let y = TOP;
  const placeKicker = (anchor: "start" | "middle" = "start") => {
    if (!slide.kicker.trim()) return;
    const p = pill(slide.kicker, anchor === "middle" ? W / 2 : MARGIN, y, theme, 26, anchor);
    prims.push(...p.prims);
    y += p.height + 48;
  };

  switch (slide.layout) {
    case "hook": {
      placeKicker();
      const areaTop = Math.max(y, 300);
      const areaH = CONTENT_BOTTOM - areaTop;
      const h = flag(fitText(heading, { font: theme.headingFont, maxSize: 116, minSize: 56, maxWidth: CONTENT_W, maxHeight: areaH * 0.75, lineHeight: 1.08 }), "heading");
      const b = flag(fitText(slide.body, { font: theme.bodyFont, maxSize: 42, minSize: 28, maxWidth: CONTENT_W, maxHeight: areaH - h.height - 48, lineHeight: 1.35 }), "body");
      const total = h.height + (b.lines.length ? 48 + b.height : 0);
      const top = areaTop + Math.max(0, (areaH - total) / 2);
      prims.push(...textLines(h, MARGIN, top, theme.headingFont, theme.text));
      prims.push(...textLines(b, MARGIN, top + h.height + 48, theme.bodyFont, theme.muted));
      break;
    }
    case "title_body": {
      placeKicker();
      const h = flag(fitText(heading, { font: theme.headingFont, maxSize: 84, minSize: 46, maxWidth: CONTENT_W, maxHeight: 440, lineHeight: 1.12 }), "heading");
      prims.push(...textLines(h, MARGIN, y, theme.headingFont, theme.text));
      y += h.height + (h.lines.length ? 48 : 0);
      prims.push({ t: "rect", x: MARGIN, y: y - 20, w: 72, h: 8, r: 4, fill: theme.accent });
      y += 24;
      const b = flag(fitText(slide.body, { font: theme.bodyFont, maxSize: 42, minSize: 26, maxWidth: CONTENT_W, maxHeight: CONTENT_BOTTOM - y, lineHeight: 1.45 }), "body");
      prims.push(...textLines(b, MARGIN, y, theme.bodyFont, theme.text));
      break;
    }
    case "list":
    case "checklist": {
      const h = flag(fitText(heading, { font: theme.headingFont, maxSize: 72, minSize: 42, maxWidth: CONTENT_W, maxHeight: 300, lineHeight: 1.12 }), "heading");
      prims.push(...textLines(h, MARGIN, y, theme.headingFont, theme.text));
      y += h.height + 64;
      const items = layoutItems(slide.items, theme, y, CONTENT_BOTTOM, slide.layout === "list" ? "number" : "check", MARGIN, CONTENT_W, [50, 24]);
      prims.push(...items.prims);
      overflow.push(...items.overflow);
      break;
    }
    case "quote": {
      if (slide.heading.trim()) {
        const label = fitText(heading.toUpperCase(), { font: theme.labelFont, maxSize: 28, minSize: 22, maxWidth: CONTENT_W, maxHeight: 80, lineHeight: 1.3, letterSpacing: 2 });
        flag(label, "heading");
        prims.push(...textLines(label, MARGIN, y, theme.labelFont, theme.accent, "start", 2));
        y += label.height + 40;
      }
      const q = flag(fitText(slide.body, { font: theme.headingFont, maxSize: 68, minSize: 32, maxWidth: CONTENT_W, maxHeight: CONTENT_BOTTOM - y - 210, lineHeight: 1.22 }), "body");
      const offset = Math.max(0, (CONTENT_BOTTOM - y - 210 - q.height) * 0.4);
      prims.push({ t: "text", x: MARGIN - 8, y: y + offset + 170, text: "“", font: "dmserif-400", size: 260, fill: theme.accent, anchor: "start" });
      prims.push(...textLines(q, MARGIN, y + offset + 210, theme.headingFont, theme.text));
      break;
    }
    case "comparison": {
      const h = flag(fitText(heading, { font: theme.headingFont, maxSize: 64, minSize: 40, maxWidth: CONTENT_W, maxHeight: 230, lineHeight: 1.12 }), "heading");
      prims.push(...textLines(h, MARGIN, y, theme.headingFont, theme.text));
      y += h.height + 56;
      const gap = 32;
      const colW = (CONTENT_W - gap) / 2;
      const cardH = CONTENT_BOTTOM - y;
      const cols: [string, string[], boolean][] = [
        [slide.left_title, slide.left_items, false],
        [slide.right_title, slide.right_items, true],
      ];
      cols.forEach(([title, items, highlight], ci) => {
        const x = MARGIN + ci * (colW + gap);
        const fill = highlight ? theme.accent : theme.surface;
        const fg = highlight ? theme.accentText : theme.text;
        prims.push({ t: "rect", x, y, w: colW, h: cardH, r: 32, fill });
        const t = flag(fitText(cased(theme, title), { font: theme.labelFont, maxSize: 46, minSize: 24, maxWidth: colW - 64, maxHeight: 120, lineHeight: 1.2 }), ci ? "right_title" : "left_title");
        prims.push(...textLines(t, x + 32, y + 40, theme.labelFont, fg));
        const itemsTop = y + 40 + t.height + 36;
        const box = layoutItems(items, { ...theme, accent: highlight ? theme.accentText : theme.accent }, itemsTop, y + cardH - 40, "bullet", x + 32, colW - 64, [40, 20], fg);
        prims.push(...box.prims);
        if (box.overflow.length) overflow.push(ci ? "right_items" : "left_items");
      });
      break;
    }
    case "myth_fact": {
      const gap = 32;
      const cardH = (CONTENT_BOTTOM - y - gap) / 2;
      const blocks: [string, string, boolean, string][] = [
        ["Myth", heading, false, "heading"],
        ["Fact", slide.body, true, "body"],
      ];
      blocks.forEach(([label, body, highlight, field], bi) => {
        const top = y + bi * (cardH + gap);
        const fill = highlight ? theme.accent : theme.surface;
        const fg = highlight ? theme.accentText : theme.text;
        prims.push({ t: "rect", x: MARGIN, y: top, w: CONTENT_W, h: cardH, r: 36, fill });
        prims.push({ t: "text", x: MARGIN + 48, y: top + 80, text: label.toUpperCase(), font: theme.labelFont, size: 28, fill: highlight ? theme.accentText : theme.muted, anchor: "start", letterSpacing: 3 });
        const f = flag(fitText(body, { font: theme.headingFont, maxSize: 56, minSize: 30, maxWidth: CONTENT_W - 96, maxHeight: cardH - 150, lineHeight: 1.18 }), field);
        prims.push(...textLines(f, MARGIN + 48, top + 116, theme.headingFont, fg));
        if (!highlight && f.lines.length) {
          prims.push({ t: "line", x1: MARGIN + 48, y1: top + 104, x2: MARGIN + 48 + 64, y2: top + 104, stroke: theme.muted, strokeWidth: 4 });
        }
      });
      break;
    }
    case "big_number": {
      placeKicker();
      const n = flag(fitText(heading, { font: theme.headingFont, maxSize: 260, minSize: 96, maxWidth: CONTENT_W, maxHeight: 420, lineHeight: 1.0 }), "heading");
      const top = Math.max(y, 320);
      prims.push(...textLines(n, MARGIN, top, theme.headingFont, theme.accent));
      const b = flag(fitText(slide.body, { font: theme.bodyFont, maxSize: 48, minSize: 28, maxWidth: CONTENT_W, maxHeight: CONTENT_BOTTOM - top - n.height - 48, lineHeight: 1.35 }), "body");
      prims.push(...textLines(b, MARGIN, top + n.height + 48, theme.bodyFont, theme.text));
      break;
    }
    case "cta": {
      const areaTop = 260;
      const areaH = CONTENT_BOTTOM - areaTop;
      const h = flag(fitText(heading, { font: theme.headingFont, maxSize: 92, minSize: 50, maxWidth: CONTENT_W, maxHeight: areaH * 0.55, lineHeight: 1.1 }), "heading");
      const b = flag(fitText(slide.body, { font: theme.bodyFont, maxSize: 40, minSize: 26, maxWidth: CONTENT_W - 40, maxHeight: areaH * 0.3, lineHeight: 1.4 }), "body");
      const pillH = slide.kicker.trim() ? 32 + 30 : 0;
      const total = h.height + (b.lines.length ? 40 + b.height : 0) + (pillH ? 64 + pillH : 0);
      let top = areaTop + Math.max(0, (areaH - total) / 2);
      prims.push(...textLines(h, W / 2, top, theme.headingFont, theme.text, "middle"));
      top += h.height + 40;
      prims.push(...textLines(b, W / 2, top, theme.bodyFont, theme.muted, "middle"));
      top += b.height + 64;
      if (pillH) prims.push(...pill(slide.kicker, W / 2, top, theme, 32, "middle").prims);
      break;
    }
  }

  prims.push(...footer(ctx, theme));
  return { primitives: prims, overflow: Array.from(new Set(overflow)), theme };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function primitivesToSvg(prims: Primitive[], resolveFont: FontResolver = familyWeightResolver, scale = 1): string {
  const body = prims
    .map((p) => {
      switch (p.t) {
        case "rect":
          return `<rect x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}"${p.r ? ` rx="${num(p.r)}"` : ""} fill="${p.fill}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.strokeWidth ?? 1}"` : ""}${p.opacity !== undefined ? ` opacity="${p.opacity}"` : ""}/>`;
        case "circle":
          return `<circle cx="${num(p.cx)}" cy="${num(p.cy)}" r="${num(p.r)}" fill="${p.fill}"${p.opacity !== undefined ? ` opacity="${p.opacity}"` : ""}/>`;
        case "line":
          return `<line x1="${num(p.x1)}" y1="${num(p.y1)}" x2="${num(p.x2)}" y2="${num(p.y2)}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}"${p.opacity !== undefined ? ` opacity="${p.opacity}"` : ""}/>`;
        case "path":
          return `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linecap="round" stroke-linejoin="round"/>`;
        case "text": {
          const f = resolveFont(p.font);
          return `<text x="${num(p.x)}" y="${num(p.y)}" font-family="${esc(f.family)}" font-weight="${f.weight}" font-size="${num(p.size)}" fill="${p.fill}" text-anchor="${p.anchor}"${p.letterSpacing ? ` letter-spacing="${p.letterSpacing}"` : ""} xml:space="preserve">${esc(p.text)}</text>`;
        }
      }
    })
    .join("");
  const w = W * scale;
  const h = H * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

export function renderSlideSvg(slide: Slide, ctx: SlideRenderContext, resolveFont?: FontResolver, scale = 1): { svg: string; overflow: string[] } {
  const { primitives, overflow } = layoutSlide(slide, ctx);
  return { svg: primitivesToSvg(primitives, resolveFont, scale), overflow };
}
