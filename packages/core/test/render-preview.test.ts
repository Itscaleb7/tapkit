// Manual visual check: RENDER_PREVIEW=/some/dir pnpm vitest run test/render-preview.test.ts
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { it } from "vitest";
import { CAROUSEL_THEMES, renderSlideSvg } from "../src/carousel/index.ts";
import { sampleCarousel } from "./fixtures.ts";

const require = createRequire(import.meta.url);
const d = (p: string) => path.dirname(require.resolve(`@expo-google-fonts/${p}/package.json`));
const fontFiles = [
  `${d("inter")}/400Regular/Inter_400Regular.ttf`,
  `${d("inter")}/600SemiBold/Inter_600SemiBold.ttf`,
  `${d("inter")}/800ExtraBold/Inter_800ExtraBold.ttf`,
  `${d("dm-serif-display")}/400Regular/DMSerifDisplay_400Regular.ttf`,
  `${d("space-grotesk")}/500Medium/SpaceGrotesk_500Medium.ttf`,
  `${d("space-grotesk")}/700Bold/SpaceGrotesk_700Bold.ttf`,
];

it.skipIf(!process.env.RENDER_PREVIEW)("renders preview PNGs", () => {
  const slides = sampleCarousel();
  for (const theme of CAROUSEL_THEMES) {
    slides.forEach((s, i) => {
      const { svg } = renderSlideSvg(s, { index: i, total: slides.length, themeId: theme.id, handle: "@alexbuilds" });
      const png = new Resvg(svg, { fitTo: { mode: "width", value: 432 }, font: { fontFiles, loadSystemFonts: false } }).render().asPng();
      writeFileSync(path.join(process.env.RENDER_PREVIEW!, `${theme.id}-${i}.png`), png);
    });
  }
});
