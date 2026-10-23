import { IMAGE_VARIANTS } from "@/data/image-variants";

/** `sizes` for the site's photos: they fill about 7/12 of the row on desktop, all of it on mobile. */
export const PHOTO_SIZES = "(min-width: 1024px) 60vw, 100vw";

/**
 * Responsive WebP variants for a bundled stock photo (scripts/optimize-images.py),
 * or null for anything else (owner uploads, external URLs): those render as-is.
 */
export function responsiveImage(src: string) {
  const v = IMAGE_VARIANTS[src];
  if (!v) return null;
  return {
    srcSet: v.webp.map((x) => `${x.src} ${x.w}w`).join(", "),
    width: v.width,
    height: v.height,
  };
}

/** Photos at the top of a page (the LCP candidate) load eagerly at high priority. */
export function isAboveFoldImageKey(srcKey: string) {
  return /\.hero\.image\.src$/.test(srcKey) || srcKey === "homes.detail.image.src";
}
