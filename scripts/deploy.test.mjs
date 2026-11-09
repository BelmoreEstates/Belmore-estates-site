// `npm test`: the deploy script's safety rails (dry runs only; nothing is deployed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run = (target, env = {}) =>
  spawnSync(process.execPath, ["scripts/deploy.mjs", target], {
    encoding: "utf8",
    env: { ...process.env, BELMORE_PROD_APPROVED: "", DRY_RUN: "1", ...env },
  });

test("preview uses the stable alias and never --prod", () => {
  const r = run("preview");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--alias preview/);
  assert.doesNotMatch(r.stdout, /--prod/);
  assert.match(r.stdout, /SITE_ENV=preview/);
  assert.match(r.stdout, /BETTER_AUTH_URL=https:\/\/preview--belmore-estates\.netlify\.app/);
  // Canonical URLs on the preview still name the production origin.
  assert.match(r.stdout, /SITE_ORIGIN=https:\/\/belmore-estates\.netlify\.app(?!\S*preview)/);
});

test("production refuses without explicit approval", () => {
  const r = run("production");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Refusing to deploy to production/);
});

test("SITE_MODE=coming-soon is forwarded; anything else is not", () => {
  const on = run("preview", { SITE_MODE: "coming-soon" });
  assert.equal(on.status, 0, on.stderr);
  assert.match(on.stdout, /--env SITE_MODE=coming-soon/);
  assert.doesNotMatch(on.stdout, /--prod/);
  const off = run("preview", { SITE_MODE: "" });
  assert.equal(off.status, 0, off.stderr);
  assert.doesNotMatch(off.stdout, /SITE_MODE/);
});

test("approved production sets SITE_ENV=production and the prod URL", () => {
  const r = run("production", { BELMORE_PROD_APPROVED: "yes" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--prod-if-unlocked/);
  assert.match(r.stdout, /SITE_ENV=production/);
  assert.match(r.stdout, /BETTER_AUTH_URL=https:\/\/belmore-estates\.netlify\.app/);
});
