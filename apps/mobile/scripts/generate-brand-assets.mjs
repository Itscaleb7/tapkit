// Generates the TapKit app icon, splash mark and favicons from SVG (deterministic).
// Usage: node scripts/generate-brand-assets.mjs
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = (p) => path.join(here, "..", p);

const mark = (fg, dot) => `<g transform="translate(-48 0)">
  <rect x="262" y="292" width="500" height="120" rx="60" fill="${fg}"/>
  <rect x="452" y="292" width="120" height="460" rx="60" fill="${fg}"/>
  <path d="M640 560 a150 150 0 0 1 0 212" stroke="${dot}" stroke-width="44" stroke-linecap="round" fill="none"/>
  <path d="M700 500 a240 240 0 0 1 0 332" stroke="${dot}" stroke-width="44" stroke-linecap="round" fill="none" opacity="0.55"/></g>`;

export const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7F2E"/><stop offset="1" stop-color="#F25A06"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${mark("#FFFFFF", "#FFFFFF")}
</svg>`;

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark("#FFFFFF", "#FFFFFF")}</svg>`;
const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark("#000000", "#000000")}</svg>`;

const render = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

writeFileSync(out("assets/icon.png"), render(iconSvg, 1024));
writeFileSync(out("assets/splash-icon.png"), render(splashSvg, 1024));
writeFileSync(out("assets/favicon.png"), render(iconSvg, 196));
writeFileSync(out("assets/android-icon-foreground.png"), render(splashSvg, 1024));
writeFileSync(out("assets/android-icon-monochrome.png"), render(monoSvg, 1024));
const webPublic = out("../web/public");
mkdirSync(webPublic, { recursive: true });
writeFileSync(path.join(webPublic, "icon.png"), render(iconSvg, 512));
writeFileSync(path.join(webPublic, "apple-touch-icon.png"), render(iconSvg, 180));
writeFileSync(path.join(webPublic, "icon.svg"), iconSvg);
console.log("Brand assets written.");
