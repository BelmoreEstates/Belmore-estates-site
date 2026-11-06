/**
 * Manual browser check for the preview construction hero.
 * Not part of `npm test` (needs Chrome and a dev server on :8080).
 *
 *   npm run dev
 *   node scripts/construction-hero.browser.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BELMORE_BASE || "http://127.0.0.1:8080";
const out = process.env.BELMORE_SHOTS || "/tmp/hero-shots";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});

const failures = [];
const check = (name, ok, detail) => {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`;
  console.log(line);
  if (!ok) failures.push(line);
};

async function sample(page) {
  return page.evaluate(() => {
    const video = document.querySelector("video");
    const hero = document.querySelector("[data-construction-hero]");
    return {
      state: hero?.getAttribute("data-state") ?? null,
      progress: hero?.dataset.progress ?? null,
      time: video?.currentTime ?? null,
      paused: video?.paused ?? null,
      muted: video?.muted ?? null,
      volume: video?.volume ?? null,
      src: video?.getAttribute("src") || "",
      duration: Number.isFinite(video?.duration) ? video.duration : null,
      pausedAttr: video?.paused ?? null,
      hasControls: video ? video.hasAttribute("controls") : null,
    };
  });
}

async function scrollFraction(page, fraction) {
  await page.evaluate((fraction) => {
    const track = document.querySelector("[data-construction-hero]");
    const pin = track.querySelector("[data-construction-pin]");
    const header = document.querySelector("header");
    const pinTop = header?.getBoundingClientRect().height ?? 0;
    const start = track.getBoundingClientRect().top + window.scrollY - pinTop;
    const range = track.offsetHeight - pin.getBoundingClientRect().height;
    window.scrollTo(0, start + range * fraction);
  }, fraction);
  await page.waitForTimeout(500);
}

async function runMotion(viewport, label) {
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const homeHero = await page.locator("[data-construction-hero]").count();
  const homeStill = await page.getByAltText(/timber front porch/i).count();
  check(`${label} homepage has no scroll hero`, homeHero === 0, `count=${homeHero}`);
  check(`${label} homepage still uses the existing photo`, homeStill > 0, `count=${homeStill}`);
  if (label === "desktop") await page.screenshot({ path: `${out}/homepage-desktop.png` });

  await page.goto(`${base}/preview/construction-hero`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.querySelector("[data-construction-hero]")?.getAttribute("data-state") === "ready",
    { timeout: 20000 },
  );
  if (label === "desktop") await page.screenshot({ path: `${out}/preview-desktop-start.png` });
  if (label === "mobile") await page.screenshot({ path: `${out}/preview-mobile-start.png` });
  const start = await sample(page);
  check(
    `${label} clip ready`,
    start.state === "ready" && start.duration > 4,
    JSON.stringify(start),
  );
  check(`${label} starts near the foundation`, start.time < 0.4, `t=${start.time}`);
  check(
    `${label} muted, no controls, volume 0`,
    start.muted === true && start.volume === 0 && start.hasControls === false,
  );

  await scrollFraction(page, 0.45);
  const mid = await sample(page);
  if (label === "desktop")
    await page.screenshot({ path: `${out}/preview-desktop-mid.png`, fullPage: false });
  if (label === "mobile")
    await page.screenshot({ path: `${out}/preview-mobile-mid.png`, fullPage: false });
  check(
    `${label} scroll down advances`,
    mid.time > start.time + 0.6,
    `t=${mid.time} progress=${mid.progress}`,
  );

  await scrollFraction(page, 0.92);
  const late = await sample(page);
  if (label === "desktop")
    await page.screenshot({ path: `${out}/preview-desktop-late.png`, fullPage: false });
  check(`${label} further scroll advances further`, late.time > mid.time + 0.5, `t=${late.time}`);

  await scrollFraction(page, 0.2);
  const back = await sample(page);
  if (label === "desktop")
    await page.screenshot({ path: `${out}/preview-desktop-rewind.png`, fullPage: false });
  check(`${label} scroll up rewinds`, back.time < late.time - 0.8, `t=${back.time}`);

  await page.waitForTimeout(700);
  const held = await sample(page);
  check(
    `${label} pause holds the frame`,
    held.paused === true && Math.abs(held.time - back.time) < 0.08,
    `t=${held.time} paused=${held.paused}`,
  );

  const copy = await page.locator("body").innerText();
  check(
    `${label} keeps Belmore hero copy`,
    copy.includes("Belmore Estates") && copy.includes("Phase 1"),
  );
  check(
    `${label} shows the review disclaimer`,
    copy.includes("Conceptual visualization for review"),
  );
  check(`${label} marks the clip as a prototype`, /review prototype/i.test(copy));
  check(`${label} does not invent a construction day count`, !/day\s+\d+/i.test(copy));
  check(`${label} page below the hero is still there`, copy.includes("The neighborhood is done"));

  await scrollFraction(page, 1);
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(300);
  const released = await page.evaluate(() => {
    const offer = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("neighborhood"),
    );
    const pin = document.querySelector("[data-construction-pin]");
    return {
      offerTop: offer?.getBoundingClientRect().top ?? null,
      pinTop: pin?.getBoundingClientRect().top ?? null,
    };
  });
  if (label === "desktop") await page.screenshot({ path: `${out}/preview-desktop-after-pin.png` });
  check(
    `${label} pin releases into the rest of the page`,
    released.offerTop !== null && released.offerTop < 320 && released.pinTop < -200,
    JSON.stringify(released),
  );
  check(`${label} no page errors`, errors.length === 0, errors.join(" | "));
  await context.close();
}

await runMotion({ width: 1440, height: 900 }, "desktop");
await runMotion({ width: 390, height: 844 }, "mobile");

const stillContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const stillPage = await stillContext.newPage();
await stillPage.goto(`${base}/preview/construction-hero`, { waitUntil: "networkidle" });
await stillPage.waitForFunction(
  () => document.querySelector("[data-construction-hero]")?.getAttribute("data-state") === "still",
  { timeout: 10000 },
);
const still = await sample(stillPage);
const stillText = await stillPage.locator("body").innerText();
await stillPage.screenshot({ path: `${out}/preview-reduced-motion.png` });
check(
  "reduced motion shows the still",
  still.state === "still" && still.src === "",
  JSON.stringify(still),
);
check(
  "reduced motion keeps the poster",
  (await stillPage.locator("img[alt*='Conceptual finished']").count()) === 1,
);
check("reduced motion explains the still", stillText.includes("Motion is off"));
const runway = await stillPage.evaluate(() => {
  const track = document.querySelector("[data-construction-hero]");
  return track.offsetHeight / window.innerHeight;
});
check(
  "reduced motion does not add a long scroll runway",
  runway < 1.6,
  `ratio=${runway.toFixed(2)}`,
);
await stillContext.close();
await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nAll browser checks passed");
