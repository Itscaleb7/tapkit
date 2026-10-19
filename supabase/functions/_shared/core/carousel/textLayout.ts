import { type FontKey, fontMetrics, measureText } from "./fonts.ts";

export interface WrapOptions {
  font: FontKey;
  size: number;
  maxWidth: number;
  letterSpacing?: number;
}

/** Greedy word wrap with hard breaks for words longer than the line. Respects explicit newlines. */
export function wrapText(input: string, opts: WrapOptions): string[] {
  const { font, size, maxWidth, letterSpacing = 0 } = opts;
  const width = (s: string) => measureText(s, font, size, letterSpacing);
  const lines: string[] = [];
  const paragraphs = input.replace(/\r\n?/g, "\n").split("\n");
  for (const para of paragraphs) {
    const words = para.split(/[ \t]+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (width(word) <= maxWidth) {
        current = word;
        continue;
      }
      // Hard-break an over-long word.
      let chunk = "";
      for (const ch of word) {
        if (width(chunk + ch) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      current = chunk;
    }
    lines.push(current);
  }
  // Trim trailing empty lines.
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export interface FitOptions {
  font: FontKey;
  maxSize: number;
  minSize: number;
  maxWidth: number;
  maxHeight: number;
  /** Line height as a multiple of font size. */
  lineHeight: number;
  maxLines?: number;
  letterSpacing?: number;
  step?: number;
}

export interface FittedText {
  size: number;
  lineHeightPx: number;
  lines: string[];
  height: number;
  /** True when the text could not fit at the minimum size and was truncated. */
  overflow: boolean;
}

export function blockHeight(lines: number, size: number, lineHeight: number): number {
  return lines <= 0 ? 0 : lines * size * lineHeight;
}

/** Choose the largest font size (in `step` increments) at which the text fits the box. */
export function fitText(input: string, opts: FitOptions): FittedText {
  const { font, maxSize, minSize, maxWidth, maxHeight, lineHeight, maxLines, letterSpacing = 0, step = 2 } = opts;
  const trimmed = input.trim();
  if (!trimmed) return { size: maxSize, lineHeightPx: maxSize * lineHeight, lines: [], height: 0, overflow: false };
  for (let size = maxSize; size >= minSize; size -= step) {
    const lines = wrapText(trimmed, { font, size, maxWidth, letterSpacing });
    const h = blockHeight(lines.length, size, lineHeight);
    if (h <= maxHeight && (!maxLines || lines.length <= maxLines)) {
      return { size, lineHeightPx: size * lineHeight, lines, height: h, overflow: false };
    }
  }
  // Truncate at min size.
  const size = minSize;
  const all = wrapText(trimmed, { font, size, maxWidth, letterSpacing });
  const capacity = Math.max(1, Math.min(maxLines ?? Infinity, Math.floor(maxHeight / (size * lineHeight))));
  const lines = all.slice(0, capacity);
  if (all.length > capacity) {
    let last = lines[capacity - 1] ?? "";
    while (last.length > 0 && measureText(`${last}…`, font, size, letterSpacing) > maxWidth) last = last.slice(0, -1);
    lines[capacity - 1] = `${last.trimEnd()}…`;
  }
  return { size, lineHeightPx: size * lineHeight, lines, height: blockHeight(lines.length, size, lineHeight), overflow: all.length > capacity };
}

/** Baseline y for line `i` of a block whose top is `top`, vertically centring cap height in each line box. */
export function baselineFor(top: number, i: number, size: number, lineHeightPx: number, font: FontKey): number {
  const cap = (fontMetrics(font).capHeight / 1000) * size;
  return top + i * lineHeightPx + (lineHeightPx + cap) / 2;
}
