import { renderSlideSvg, type Slide } from "@tapkit/core";

/** Server-rendered slide: identical deterministic layout to the app's exports. Text is XML-escaped by the renderer. */
export function SlideSvg({ slide, index, total, themeId, handle, label }: { slide: Slide; index: number; total: number; themeId: string; handle?: string; label?: string }) {
  const { svg } = renderSlideSvg(slide, { index, total, themeId, handle });
  return <div role="img" aria-label={label ?? `Slide ${index + 1} of ${total}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
