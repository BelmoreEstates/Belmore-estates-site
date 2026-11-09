import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { comingSoonDestination, isComingSoon, normalizePath } =
  await import("../src/lib/site-mode.ts");

test("SITE_MODE is full-site unless baked as coming-soon", () => {
  assert.equal(isComingSoon(), false);
});

test("public routes redirect to the coming-soon landing", () => {
  assert.equal(comingSoonDestination("/"), null);
  assert.deepEqual(comingSoonDestination("/about"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/lots/801"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/lots"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/plans/stonebridge"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/homes/801"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/contact"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/community/"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/does-not-exist"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/privacy"), { to: "/" });
  assert.deepEqual(comingSoonDestination("/legal"), { to: "/" });
});

test("operational routes stay reachable in coming-soon mode", () => {
  for (const path of [
    "/admin",
    "/admin/leads",
    "/login",
    "/editor",
    "/api/auth/callback/google",
    "/media/abc",
    "/robots.txt",
    "/sitemap.xml",
    "/_serverFn/getFormToken",
  ]) {
    assert.equal(comingSoonDestination(path), null, path);
  }
  assert.equal(normalizePath("/about/"), "/about");
});

test("coming-soon copy does not name Andrew Schram", () => {
  const page = readFileSync(
    new URL("../src/components/site/coming-soon.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(/andrew/i.test(page), false);
  assert.equal(page.includes("Shelby Circle"), false);
  assert.equal(page.includes("801"), false);
  assert.equal(/instagram/i.test(page), false);
  assert.equal(page.includes("belmoreestates@gmail.com"), false);
  assert.equal(
    page.includes(
      "Twenty-Four custom built homes completing the final section of the well-established Legends West subdivision in the Town of Greece, NY.",
    ),
    true,
  );
  assert.equal(page.includes("Belmore Way"), false);
  assert.equal(page.includes("Barclay"), false);
  assert.equal(page.includes("LegalPage"), false);
  assert.equal(page.includes("PrivacyPolicy"), false);
  assert.equal(page.includes("Request Additional Info"), true);
  assert.equal(page.includes("Send Request"), true);
  assert.equal(page.includes("3 + 4"), true);
});
