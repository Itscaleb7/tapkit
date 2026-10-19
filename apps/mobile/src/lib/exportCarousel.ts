// Carousel export: each slide is rendered by the deterministic layout engine
// (packages/core) into an SVG, drawn offscreen at 1080×1350 and captured to PNG.
// Files are then shared individually, saved to Photos, or bundled into a ZIP.
import { safeFileBase, SLIDE_HEIGHT, SLIDE_WIDTH, slideFileName } from "@tapkit/core";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { AppError } from "./errors";

export const EXPORT_SIZE = { width: SLIDE_WIDTH, height: SLIDE_HEIGHT };

export interface ExportedSlide {
  index: number;
  name: string;
  uri: string;
}

/** Copy a captured temp PNG into a stable, correctly named file in the cache directory. */
export function persistSlide(tmpUri: string, index: number, total: number, title: string): ExportedSlide {
  const name = `${safeFileBase(title)}-${slideFileName(index, total, "slide")}`;
  const target = new File(Paths.cache, name);
  if (target.exists) target.delete();
  new File(tmpUri).copySync(target);
  return { index, name, uri: target.uri };
}

export async function buildZip(slides: ExportedSlide[], title: string): Promise<string> {
  const zip = new JSZip();
  const ordered = [...slides].sort((a, b) => a.index - b.index);
  for (const s of ordered) {
    const bytes = await new File(s.uri).bytes();
    zip.file(slideFileName(s.index, ordered.length, "slide"), bytes);
  }
  const data = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  const out = new File(Paths.cache, `${safeFileBase(title)}-carousel.zip`);
  if (out.exists) out.delete();
  out.create();
  await out.write(data);
  return out.uri;
}

export async function shareFile(uri: string, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new AppError("Sharing isn't available on this device.", "unavailable");
  await Sharing.shareAsync(uri, { mimeType, UTI: uti, dialogTitle: "Export carousel" });
}

export async function saveToPhotos(slides: ExportedSlide[]) {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new AppError("Allow TapKit to add photos in Settings to save your slides.", "permission");
  for (const s of [...slides].sort((a, b) => a.index - b.index)) await MediaLibrary.Asset.create(s.uri);
}
