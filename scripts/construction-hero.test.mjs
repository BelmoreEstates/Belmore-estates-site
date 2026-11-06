import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  CONSTRUCTION_HERO_PATH,
  CONSTRUCTION_HERO_MEDIA,
  constructionHeroPreviewEnabled,
  clamp01,
  scrollProgress,
  timeForProgress,
} = await import("../src/site/construction-hero.ts");

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("construction hero stays off when SITE_ENV is production", () => {
  assert.equal(constructionHeroPreviewEnabled("production"), false);
  assert.equal(constructionHeroPreviewEnabled("preview"), true);
  assert.equal(constructionHeroPreviewEnabled(""), true);
  assert.equal(constructionHeroPreviewEnabled(undefined), true);
  const prev = process.env.SITE_ENV;
  process.env.SITE_ENV = "production";
  try {
    assert.equal(constructionHeroPreviewEnabled("preview"), false);
    assert.equal(constructionHeroPreviewEnabled(""), false);
  } finally {
    if (prev === undefined) delete process.env.SITE_ENV;
    else process.env.SITE_ENV = prev;
  }
});

test("scroll progress and time mapping stay inside the clip", () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(Number.NaN), 0);
  assert.equal(scrollProgress(0, 100, 500), 0);
  assert.equal(scrollProgress(100, 100, 500), 0);
  assert.equal(scrollProgress(350, 100, 500), 0.5);
  assert.equal(scrollProgress(1000, 100, 500), 1);
  assert.equal(scrollProgress(100, 100, 0), 0);
  assert.equal(timeForProgress(0, 5), 0);
  assert.equal(timeForProgress(0.5, 5), 2.5);
  assert.ok(timeForProgress(1, 5) < 5);
  assert.ok(timeForProgress(1, 5) > 4.9);
  assert.equal(timeForProgress(0.5, 0), 0);
  assert.equal(timeForProgress(0.5, Number.NaN), 0);
});

test("media paths are the swappable review clip and finished still", () => {
  assert.equal(CONSTRUCTION_HERO_PATH, "/preview/construction-hero");
  assert.match(CONSTRUCTION_HERO_MEDIA.videoSrc, /belmore-construction-forward-start-end\.mp4$/);
  assert.match(CONSTRUCTION_HERO_MEDIA.posterSrc, /poster\.jpg$/);
  assert.equal(CONSTRUCTION_HERO_MEDIA.videoSrc.startsWith("/"), true);
  assert.equal(CONSTRUCTION_HERO_MEDIA.posterSrc.startsWith("/"), true);
});

test("public homepage and sitemap do not mount the preview hero", () => {
  const home = read("../src/site/sections/home.tsx");
  const sitemap = read("../src/routes/sitemap[.]xml.ts");
  const index = read("../src/routes/index.tsx");
  assert.equal(home.includes("ConstructionScrollHero"), false);
  assert.equal(home.includes("construction-hero"), false);
  assert.equal(home.includes('srcKey="home.hero.image.src"'), true);
  assert.equal(sitemap.includes("/preview/construction-hero"), false);
  assert.equal(index.includes("construction-hero"), false);
});

test("preview route redirects production and does not autoplay with sound", () => {
  const route = read("../src/routes/preview.construction-hero.tsx");
  const hero = read("../src/components/site/construction-scroll-hero.tsx");
  assert.match(route, /constructionHeroPreviewEnabled/);
  assert.match(route, /redirect\(\{ to: "\/"/);
  assert.match(route, /noindex, nofollow/);
  assert.equal(hero.includes("autoPlay"), false);
  assert.equal(hero.includes("autoplay"), false);
  assert.match(hero, /muted/);
  assert.match(hero, /prefers-reduced-motion/);
  assert.equal(hero.includes("crossfade"), false);
});
