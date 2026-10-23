/**
 * Upload checks for editor photos (server only).
 *
 * The editor resizes and re-encodes every photo in the browser first (canvas →
 * WebP/JPEG, max 2400 px, which also drops EXIF/GPS data). This module is the
 * server-side backstop: it checks the bytes really are a JPEG/PNG/WebP, caps
 * the size, and strips any metadata segments that are still present (EXIF,
 * XMP, comments, text chunks), so nothing private is ever served.
 */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export const MAX_EDITOR_IMAGE_BYTES = 3_000_000;

export function sniffMime(b: Buffer): ImageMime | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (
    b.length > 12 &&
    b.subarray(0, 4).toString("latin1") === "RIFF" &&
    b.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "image/webp";
  return null;
}

/** JPEG: drop APP1–APP15 (EXIF, XMP, ICC-less profiles, maker notes) and COM segments; keep APP0 (JFIF). */
function stripJpeg(b: Buffer): Buffer {
  const out: Buffer[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error("Damaged JPEG file");
    const marker = b[i + 1];
    if (marker === 0xda) {
      out.push(b.subarray(i)); // start of scan: the rest is image data
      return Buffer.concat(out);
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    const end = i + 2 + len;
    if (len < 2 || end > b.length) throw new Error("Damaged JPEG file");
    const isMeta = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMeta) out.push(b.subarray(i, end));
    i = end;
  }
  throw new Error("Damaged JPEG file");
}

/** PNG: drop eXIf / tEXt / iTXt / zTXt / tIME chunks. */
function stripPng(b: Buffer): Buffer {
  const out: Buffer[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = b.readUInt32BE(i);
    const type = b.subarray(i + 4, i + 8).toString("latin1");
    const end = i + 12 + len;
    if (end > b.length) throw new Error("Damaged PNG file");
    if (!["eXIf", "tEXt", "iTXt", "zTXt", "tIME"].includes(type)) out.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return Buffer.concat(out);
  }
  throw new Error("Damaged PNG file");
}

/** WebP: drop EXIF / XMP chunks and clear their flags in VP8X. */
function stripWebp(b: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = b.subarray(i, i + 4).toString("latin1");
    const len = b.readUInt32LE(i + 4);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > b.length) throw new Error("Damaged WebP file");
    const chunk = Buffer.from(b.subarray(i, Math.min(end, b.length)));
    if (type === "VP8X" && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04); // EXIF + XMP flags
    if (type !== "EXIF" && type !== "XMP ") chunks.push(chunk);
    i = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "latin1");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "latin1");
  return Buffer.concat([header, body]);
}

/** Validate + strip metadata. Throws a readable Error. */
export function cleanImage(bytes: Buffer, declared: ImageMime): { mime: ImageMime; bytes: Buffer } {
  if (bytes.length === 0) throw new Error("The photo is empty");
  if (bytes.length > MAX_EDITOR_IMAGE_BYTES)
    throw new Error("The photo is too large after resizing (max 3 MB)");
  const mime = sniffMime(bytes);
  if (!mime || mime !== declared) throw new Error("Only JPG, PNG or WebP photos can be uploaded");
  const clean =
    mime === "image/jpeg"
      ? stripJpeg(bytes)
      : mime === "image/png"
        ? stripPng(bytes)
        : stripWebp(bytes);
  return { mime, bytes: clean };
}
