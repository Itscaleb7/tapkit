import type { Slide, SlideLayout } from "../schemas.ts";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5 portrait, Instagram's recommended carousel size.
export const MAX_SLIDES = 20;

export const LAYOUT_INFO: Record<SlideLayout, { label: string; description: string; uses: (keyof Slide)[] }> = {
  hook: { label: "Hook", description: "Big opening statement", uses: ["kicker", "heading", "body"] },
  title_body: { label: "Title + text", description: "A point with explanation", uses: ["kicker", "heading", "body"] },
  list: { label: "Numbered list", description: "Steps or ideas", uses: ["heading", "items"] },
  checklist: { label: "Checklist", description: "Things to tick off", uses: ["heading", "items"] },
  quote: { label: "Story / quote", description: "A personal moment or quote", uses: ["heading", "body"] },
  comparison: { label: "Comparison", description: "Two columns side by side", uses: ["heading", "left_title", "left_items", "right_title", "right_items"] },
  myth_fact: { label: "Myth vs fact", description: "Bust a misconception", uses: ["heading", "body"] },
  big_number: { label: "Big number", description: "A figure you can stand behind", uses: ["heading", "body"] },
  cta: { label: "Call to action", description: "Close with a clear next step", uses: ["heading", "body", "kicker"] },
};

let counter = 0;
export function newSlideId(): string {
  counter = (counter + 1) % 1_000_000;
  return `s_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function blankSlide(layout: SlideLayout = "title_body", partial: Partial<Slide> = {}): Slide {
  return {
    id: newSlideId(),
    layout,
    heading: "",
    body: "",
    items: [],
    left_title: "",
    right_title: "",
    left_items: [],
    right_items: [],
    kicker: "",
    ...partial,
  };
}

/** Polished starting templates for the editor's "Add slide" menu. */
export const SLIDE_TEMPLATES: { id: string; label: string; make: () => Slide }[] = [
  { id: "hook", label: "Hook", make: () => blankSlide("hook", { kicker: "Read this first", heading: "The one thing nobody tells you about…", body: "Swipe →" }) },
  { id: "educational", label: "Educational point", make: () => blankSlide("title_body", { kicker: "Lesson 1", heading: "Make one clear point per slide", body: "Explain it in two or three short sentences. Use plain words." }) },
  { id: "list", label: "List", make: () => blankSlide("list", { heading: "3 things to try this week", items: ["First idea", "Second idea", "Third idea"] }) },
  { id: "story", label: "Personal story", make: () => blankSlide("quote", { heading: "What happened", body: "Describe a real moment in your own words." }) },
  { id: "comparison", label: "Comparison", make: () => blankSlide("comparison", { heading: "Before vs after", left_title: "Before", right_title: "After", left_items: ["…"], right_items: ["…"] }) },
  { id: "checklist", label: "Checklist", make: () => blankSlide("checklist", { heading: "Checklist", items: ["Step one", "Step two", "Step three"] }) },
  { id: "myth", label: "Myth vs fact", make: () => blankSlide("myth_fact", { heading: "A common belief", body: "What's actually true" }) },
  { id: "cta", label: "Closing CTA", make: () => blankSlide("cta", { heading: "Found this useful?", body: "Save it for later and share it with someone who needs it.", kicker: "Follow for more" }) },
];

/* ---------------- Pure slide-list operations (used by the editor + tests) --------------- */

export function addSlide(slides: Slide[], slide: Slide, atIndex = slides.length): Slide[] {
  if (slides.length >= MAX_SLIDES) throw new Error(`A carousel can have at most ${MAX_SLIDES} slides`);
  const i = Math.max(0, Math.min(atIndex, slides.length));
  return [...slides.slice(0, i), slide, ...slides.slice(i)];
}

export function duplicateSlide(slides: Slide[], id: string): Slide[] {
  const i = slides.findIndex((s) => s.id === id);
  if (i < 0) return slides;
  const src = slides[i]!;
  const copy: Slide = { ...src, id: newSlideId(), items: [...src.items], left_items: [...src.left_items], right_items: [...src.right_items] };
  return addSlide(slides, copy, i + 1);
}

export function deleteSlide(slides: Slide[], id: string): Slide[] {
  return slides.filter((s) => s.id !== id);
}

export function moveSlide(slides: Slide[], from: number, to: number): Slide[] {
  if (from < 0 || from >= slides.length || to < 0 || to >= slides.length || from === to) return slides;
  const next = [...slides];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function updateSlide(slides: Slide[], id: string, patch: Partial<Omit<Slide, "id">>): Slide[] {
  return slides.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

/**
 * Change layout while carrying content across sensibly: list-like layouts share
 * `items`; comparison seeds its columns from items when empty.
 */
export function changeLayout(slides: Slide[], id: string, layout: SlideLayout): Slide[] {
  return slides.map((s) => {
    if (s.id !== id) return s;
    const next: Slide = { ...s, layout };
    if (layout === "comparison" && next.left_items.length === 0 && next.right_items.length === 0 && s.items.length) {
      const half = Math.ceil(s.items.length / 2);
      next.left_items = s.items.slice(0, half).slice(0, 5);
      next.right_items = s.items.slice(half).slice(0, 5);
    }
    if ((layout === "list" || layout === "checklist") && next.items.length === 0 && s.body) {
      next.items = s.body
        .split(/\n+/)
        .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 7);
    }
    return next;
  });
}

/** Filenames used by image/ZIP export. Zero-padded so lexical order == slide order. */
export function slideFileName(index: number, total: number, baseName = "slide"): string {
  const width = Math.max(2, String(total).length);
  return `${baseName}-${String(index + 1).padStart(width, "0")}.png`;
}

export function safeFileBase(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "tapkit-carousel";
}

/** Assign ids to AI-produced slides and coerce them into editor slides. */
export function slidesFromAi(aiSlides: Omit<Slide, "id">[]): Slide[] {
  return aiSlides.slice(0, MAX_SLIDES).map((s) => blankSlide(s.layout, { ...s }));
}

/** Plain-text rendering of a carousel (accessibility, copy-to-clipboard, caption helpers). */
export function slidesToPlainText(slides: Slide[]): string {
  return slides
    .map((s, i) => {
      const parts = [`Slide ${i + 1}`];
      if (s.kicker) parts.push(s.kicker);
      if (s.heading) parts.push(s.heading);
      if (s.body) parts.push(s.body);
      for (const it of s.items) parts.push(`• ${it}`);
      if (s.layout === "comparison") {
        parts.push(`${s.left_title}: ${s.left_items.join("; ")}`);
        parts.push(`${s.right_title}: ${s.right_items.join("; ")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}
