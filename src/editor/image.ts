/**
 * Photo preparation in the browser, before upload: accepts JPG / PNG / WebP
 * up to 8 MB, fixes rotation, scales down to at most 2400 px on the long side
 * and re-encodes (WebP, or JPEG if the browser can't). Re-drawing through a
 * canvas drops all EXIF/GPS metadata. The server checks everything again.
 */
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_ORIGINAL_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 2400;

export type Prepared = {
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
  bytes: number;
};

export function checkFile(file: File): string | null {
  if (!(ACCEPTED as readonly string[]).includes(file.type))
    return "Please choose a JPG, PNG or WebP photo.";
  if (file.size > MAX_ORIGINAL_BYTES)
    return "That photo is over 8 MB. Please choose a smaller one.";
  return null;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<Prepared> {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("That file couldn't be opened as a photo.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the photo.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // Transparent PNGs (logos) stay PNG-like via WebP (keeps transparency).
  let blob = await toBlob(canvas, "image/webp", 0.82);
  let mime: Prepared["mime"] = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, file.type === "image/png" ? "image/png" : "image/jpeg", 0.84);
    mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  }
  if (!blob) throw new Error("Your browser couldn't process the photo.");
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const base = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "photo";
  return { name: `${base}.${mime.split("/")[1]}`, mime, dataBase64: btoa(bin), bytes: buf.length };
}
