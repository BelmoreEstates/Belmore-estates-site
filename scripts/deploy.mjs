#!/usr/bin/env node
/**
 * Deploy to Netlify with netlify-cli (needs Node >= 22.13 and a personal
 * access token in NETLIFY_AUTH_TOKEN; nothing here creates sites or accounts).
 *
 *   npm run deploy:preview   -> https://preview--belmore-estates.netlify.app
 *                               (`netlify deploy --alias preview`: a draft
 *                               deploy, NOT production; never uses --prod)
 *   npm run deploy:prod      -> https://belmore-estates.netlify.app
 *                               ONLY AFTER JOSEPH APPROVES. Refuses to run
 *                               unless BELMORE_PROD_APPROVED=yes is set.
 *
 * Both targets are the same Netlify site, so they share its environment
 * variables (DATABASE_URL, secrets, keys). What differs per deploy, SITE_ENV
 * and BETTER_AUTH_URL, is set here: baked into the build (vite.config.ts) and
 * passed to the deployed functions with `--env`.
 *
 * Options (env):
 *   NETLIFY_SITE      site name or ID (default "belmore-estates")
 *   PREVIEW_URL       default https://preview--belmore-estates.netlify.app
 *   PRODUCTION_URL    default https://belmore-estates.netlify.app (set this to
 *                     the custom domain once it is live)
 *   DRY_RUN=1         print the command instead of running it
 *
 * NETLIFY_* / *_URL values may live in .env; BELMORE_PROD_APPROVED may not
 * (it is read from the real environment only).
 */
import { spawnSync } from "node:child_process";

const target = process.argv[2];
if (target !== "preview" && target !== "production") {
  console.error("usage: node scripts/deploy.mjs preview|production");
  process.exit(2);
}

// Approval must come from the command line, never from a .env file, so read it
// before loading .env (for NETLIFY_AUTH_TOKEN etc.).
const approved = process.env.BELMORE_PROD_APPROVED === "yes";
await import("./env.mjs");

const site = process.env.NETLIFY_SITE || "belmore-estates";
const previewUrl = (process.env.PREVIEW_URL || `https://preview--${site}.netlify.app`).replace(/\/+$/, "");
const productionUrl = (process.env.PRODUCTION_URL || `https://${site}.netlify.app`).replace(/\/+$/, "");
const dryRun = process.env.DRY_RUN === "1";

if (target === "production" && !approved) {
  console.error(
    "[deploy] Refusing to deploy to production.\n" +
      "         Production deploys happen only after Joseph approves the preview at\n" +
      `         ${previewUrl}. Then run: BELMORE_PROD_APPROVED=yes npm run deploy:prod`,
  );
  process.exit(1);
}
if (!dryRun && !process.env.NETLIFY_AUTH_TOKEN) {
  console.error("[deploy] NETLIFY_AUTH_TOKEN is not set (Netlify > User settings > Applications > Personal access tokens).");
  process.exit(1);
}
const [major, minor] = process.versions.node.split(".").map(Number);
if (!dryRun && (major < 22 || (major === 22 && minor < 13))) {
  console.error(`[deploy] netlify-cli needs Node >= 22.13 (this is ${process.versions.node}).`);
  process.exit(1);
}

const siteEnv = target === "production" ? "production" : "preview";
const authUrl = target === "production" ? productionUrl : previewUrl;

const args = [
  "--yes",
  "netlify-cli@27",
  "deploy",
  "--site", site,
  // Builds locally first (`npm run build`, from netlify.toml).
  "--context", target === "production" ? "production" : "deploy-preview",
  "--env", `SITE_ENV=${siteEnv}`,
  "--env", `BETTER_AUTH_URL=${authUrl}`,
  "--message", `${siteEnv} deploy from ${process.env.USER || "cli"}`,
  // Production: --prod-if-unlocked, so a production deploy that Netlify has
  // locked ("Lock to stop auto publishing") becomes a draft instead of
  // replacing the live site; publish it from the Netlify UI.
  ...(target === "production" ? ["--prod-if-unlocked"] : ["--alias", "preview"]),
];

console.log(`[deploy] ${siteEnv} -> ${authUrl}`);
console.log(`[deploy] npx ${args.join(" ")}`);
if (dryRun) process.exit(0);

console.log("[deploy] Reminder: run `npm run db:migrate` against this site's DATABASE_URL first if there are new migrations.");
const result = spawnSync("npx", args, {
  stdio: "inherit",
  env: { ...process.env, SITE_ENV: siteEnv, BETTER_AUTH_URL: authUrl },
});
process.exit(result.status ?? 1);
