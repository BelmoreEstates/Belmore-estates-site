import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "belmore:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[belmore] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

// Local .env (never committed) -> process.env for server code in dev/build.
// Real environment variables win.
function loadDotEnv(mode: string) {
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Local dev server: http://localhost:8080 (BETTER_AUTH_URL default).
export default defineConfig(({ command, isPreview, mode }) => {
  loadDotEnv(mode);
  return {
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  // Per-deploy values baked into the server bundle by `npm run deploy:*`
  // (scripts/deploy.mjs): the production site and the preview alias are the
  // same Netlify site, so their runtime env vars are shared — these are not.
  // Neither is a secret.
  define: {
    __SITE_ENV__: JSON.stringify(process.env.SITE_ENV ?? ""),
    __BUILD_AUTH_URL__: JSON.stringify(process.env.BETTER_AUTH_URL ?? ""),
    // Canonical / og:url origin (always the production site, also on the preview).
    __SITE_ORIGIN__: JSON.stringify(process.env.SITE_ORIGIN ?? ""),
  },
  // router.tsx imports getGlobalStartContext (an isomorphic fn). Pre-bundling
  // start-client-core would skip the server/client split and drag
  // node:async_hooks into the browser in dev.
  optimizeDeps: { exclude: ["@tanstack/start-client-core", "@tanstack/start-storage-context"] },
  plugins: [
    pgliteBootstrapPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          // Netlify output: static assets in dist/, the SSR + server-function
          // handler in .netlify/v1/functions (Netlify Frameworks API).
          nitro({ preset: "netlify" }),
        ]
      : []),
    viteReact(),
  ],
};
});
