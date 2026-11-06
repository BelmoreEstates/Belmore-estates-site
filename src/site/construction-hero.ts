/**
 * Preview-only construction hero: gate, media paths, and scroll math.
 *
 * The public homepage is unchanged. This module is used only by
 * `/preview/construction-hero`, and that route redirects home when
 * SITE_ENV is production.
 *
 * Swap the review clip by replacing the files below (or these two paths).
 * The hero component does not need to change.
 *
 * videoSrc — forward foundation → finished prototype for user review.
 * Not an approved animation. Re-encoded all-intra (every frame a keyframe)
 * from the attached 5s, 854×480, silent clip so scroll seeking can land
 * on a frame. The source file had a single keyframe, which makes scrubbing
 * jump. No audio track.
 *
 * posterSrc — finished-concept still used as the poster and as the
 * reduced-motion / load-failure fallback. Drop a replacement file at this
 * path to swap it. The separate high-resolution approved still was not in
 * the workspace, so this poster is the clip's finished end frame (the same
 * approved concept the clip was made to land on).
 */

export const CONSTRUCTION_HERO_PATH = "/preview/construction-hero";

export const CONSTRUCTION_HERO_MEDIA = {
  videoSrc: "/media/construction-hero/belmore-construction-forward-start-end.mp4",
  posterSrc: "/media/construction-hero/poster.jpg",
  width: 854,
  height: 480,
} as const;

/** Production builds and a production runtime never show the prototype. */
export function constructionHeroPreviewEnabled(bakedSiteEnv: string | undefined): boolean {
  if (bakedSiteEnv === "production") return false;
  if (typeof process !== "undefined" && process.env?.SITE_ENV === "production") return false;
  return true;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** 0 at the start of the pinned runway, 1 after `range` pixels of extra scroll. */
export function scrollProgress(scrollY: number, start: number, range: number): number {
  if (!(range > 0)) return 0;
  return clamp01((scrollY - start) / range);
}

/**
 * Map scroll progress onto the clip. Stops 1ms before the end so the last
 * frame stays on screen instead of the player clamping past the media.
 */
export function timeForProgress(progress: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(duration)) return 0;
  const t = clamp01(progress) * duration;
  return Math.min(Math.max(0, t), Math.max(0, duration - 0.001));
}
