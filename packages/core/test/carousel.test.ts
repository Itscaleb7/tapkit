import { Resvg } from "@resvg/resvg-js";
import JSZip from "jszip";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addSlide, blankSlide, CAROUSEL_THEMES, changeLayout, deleteSlide, duplicateSlide, expoFontResolver, fitText, layoutSlide,
  measureText, MARGIN, moveSlide, renderSlideSvg, SLIDE_HEIGHT, SLIDE_WIDTH, slideFileName, slidesFromAi, wrapText, safeFileBase,
} from "../src/carousel/index.ts";
import { slideSchema } from "../src/schemas.ts";
import { sampleCarousel } from "./fixtures.ts";

const require = createRequire(import.meta.url);
const fontDir = (pkg: string) => path.dirname(require.resolve(`@expo-google-fonts/${pkg}/package.json`));
const fontFiles = [
  path.join(fontDir("inter"), "400Regular/Inter_400Regular.ttf"),
  path.join(fontDir("inter"), "600SemiBold/Inter_600SemiBold.ttf"),
  path.join(fontDir("inter"), "800ExtraBold/Inter_800ExtraBold.ttf"),
  path.join(fontDir("dm-serif-display"), "400Regular/DMSerifDisplay_400Regular.ttf"),
  path.join(fontDir("space-grotesk"), "500Medium/SpaceGrotesk_500Medium.ttf"),
  path.join(fontDir("space-grotesk"), "700Bold/SpaceGrotesk_700Bold.ttf"),
];

function rasterise(svg: string): Buffer {
  const r = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Inter" } });
  return Buffer.from(r.render().asPng());
}

function pngSize(buf: Buffer) {
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("text measurement and fitting", () => {
  it("measures wider text as wider and scales with size", () => {
    expect(measureText("WWWW", "inter-400", 40)).toBeGreaterThan(measureText("iiii", "inter-400", 40));
    expect(measureText("Hello", "inter-400", 80)).toBeCloseTo(measureText("Hello", "inter-400", 40) * 2, 5);
  });
  it("wraps within the max width and keeps every word", () => {
    const text = "Consistency is a multiplier, not a strategy, so decide what you stand for first";
    const lines = wrapText(text, { font: "inter-800", size: 80, maxWidth: 888 });
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measureText(l, "inter-800", 80)).toBeLessThanOrEqual(888);
    expect(lines.join(" ")).toBe(text);
  });
  it("hard-breaks very long words", () => {
    const lines = wrapText("a".repeat(300), { font: "inter-400", size: 40, maxWidth: 400 });
    for (const l of lines) expect(measureText(l, "inter-400", 40)).toBeLessThanOrEqual(400);
  });
  it("shrinks font to fit, then truncates with an ellipsis", () => {
    const short = fitText("Short", { font: "inter-800", maxSize: 100, minSize: 40, maxWidth: 888, maxHeight: 300, lineHeight: 1.1 });
    expect(short.size).toBe(100);
    expect(short.overflow).toBe(false);
    const long = fitText("word ".repeat(400), { font: "inter-800", maxSize: 100, minSize: 40, maxWidth: 888, maxHeight: 300, lineHeight: 1.1 });
    expect(long.overflow).toBe(true);
    expect(long.height).toBeLessThanOrEqual(300);
    expect(long.lines.at(-1)?.endsWith("…")).toBe(true);
  });
});

describe("slide operations", () => {
  it("adds, duplicates, reorders, deletes and changes layout", () => {
    let s = sampleCarousel();
    const n = s.length;
    s = duplicateSlide(s, s[1]!.id);
    expect(s.length).toBe(n + 1);
    expect(s[2]!.heading).toBe(s[1]!.heading);
    expect(s[2]!.id).not.toBe(s[1]!.id);
    const firstId = s[0]!.id;
    s = moveSlide(s, 0, 3);
    expect(s[3]!.id).toBe(firstId);
    s = deleteSlide(s, firstId);
    expect(s.find((x) => x.id === firstId)).toBeUndefined();
    s = addSlide(s, blankSlide("cta"), 0);
    expect(s[0]!.layout).toBe("cta");
    const listId = s.find((x) => x.layout === "list")!.id;
    s = changeLayout(s, listId, "comparison");
    const cmp = s.find((x) => x.id === listId)!;
    expect(cmp.layout).toBe("comparison");
    expect(cmp.left_items.length + cmp.right_items.length).toBe(3);
    for (const slide of s) expect(slideSchema.safeParse(slide).success).toBe(true);
  });
  it("names export files so lexical order matches slide order", () => {
    const names = Array.from({ length: 12 }, (_, i) => slideFileName(i, 12));
    expect(names[0]).toBe("slide-01.png");
    expect([...names].sort()).toEqual(names);
    expect(safeFileBase("Héllo, World! / 2026")).toBe("hello-world-2026");
  });
  it("assigns ids to AI slides", () => {
    const s = slidesFromAi([{ layout: "hook", heading: "H", body: "", items: [], left_title: "", right_title: "", left_items: [], right_items: [], kicker: "" }]);
    expect(s[0]!.id).toMatch(/^s_/);
  });
});

describe("layout geometry", () => {
  it("keeps all text inside the safe margins for every layout and theme", () => {
    const slides = sampleCarousel();
    for (const theme of CAROUSEL_THEMES) {
      slides.forEach((slide, index) => {
        const { primitives, overflow } = layoutSlide(slide, { index, total: slides.length, themeId: theme.id, handle: "@alexbuilds" });
        expect(overflow, `${theme.id}/${slide.layout}`).toEqual([]);
        for (const p of primitives) {
          if (p.t !== "text" || p.text === "“") continue;
          const w = measureText(p.text, p.font, p.size, p.letterSpacing ?? 0);
          const left = p.anchor === "start" ? p.x : p.anchor === "middle" ? p.x - w / 2 : p.x - w;
          expect(left, `${theme.id}/${slide.layout}: "${p.text}"`).toBeGreaterThanOrEqual(MARGIN - 1);
          expect(left + w, `${theme.id}/${slide.layout}: "${p.text}"`).toBeLessThanOrEqual(SLIDE_WIDTH - MARGIN + 1);
          expect(p.y).toBeLessThanOrEqual(SLIDE_HEIGHT - 60);
          expect(p.y).toBeGreaterThan(0);
          expect(p.size).toBeGreaterThanOrEqual(20);
        }
      });
    }
  });
  it("reports overflow for text that cannot fit", () => {
    const slide = blankSlide("title_body", { heading: "A heading", body: "Lorem ipsum dolor sit amet ".repeat(80) });
    const { overflow } = layoutSlide(slide, { index: 0, total: 1 });
    expect(overflow).toContain("body");
  });
  it("escapes user text in SVG output", () => {
    const { svg } = renderSlideSvg(blankSlide("hook", { heading: `<script>alert("x")</script> & co` }), { index: 0, total: 1 });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
  it("uses expo font names when asked (iOS renderer)", () => {
    const { svg } = renderSlideSvg(blankSlide("hook", { heading: "Hi" }), { index: 0, total: 1 }, expoFontResolver);
    expect(svg).toContain('font-family="Inter_800ExtraBold"');
  });
});

describe("image + ZIP export", () => {
  it("renders every slide to a 1080×1350 PNG and zips them in order", async () => {
    const slides = sampleCarousel();
    const zip = new JSZip();
    const pngs: Buffer[] = [];
    slides.forEach((slide, index) => {
      const { svg } = renderSlideSvg(slide, { index, total: slides.length, themeId: "tapkit", handle: "@alexbuilds" });
      const png = rasterise(svg);
      expect(pngSize(png)).toEqual({ width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
      pngs.push(png);
      zip.file(slideFileName(index, slides.length), png);
    });
    // Different slides must produce different images (content actually drawn).
    expect(new Set(pngs.map((p) => p.toString("base64"))).size).toBe(slides.length);
    const blob = await zip.generateAsync({ type: "nodebuffer" });
    const reread = await JSZip.loadAsync(blob);
    const names = Object.keys(reread.files);
    expect(names).toEqual(slides.map((_, i) => slideFileName(i, slides.length)));
    for (let i = 0; i < names.length; i++) {
      const data = await reread.file(names[i]!)!.async("nodebuffer");
      expect(data.equals(pngs[i]!)).toBe(true);
    }
  }, 60_000);

  it("draws text pixels using the bundled fonts for each theme", () => {
    for (const theme of CAROUSEL_THEMES) {
      const blank = rasterise(renderSlideSvg(blankSlide("hook", { heading: "" }), { index: 0, total: 1, themeId: theme.id }).svg);
      const withText = rasterise(renderSlideSvg(blankSlide("hook", { heading: "Hello world" }), { index: 0, total: 1, themeId: theme.id }).svg);
      expect(withText.equals(blank), theme.id).toBe(false);
    }
  }, 60_000);
});
