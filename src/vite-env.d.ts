/// <reference types="vite/client" />

/** SITE_ENV at build time ("production" | "preview" | ""), baked in by vite.config.ts. */
declare const __SITE_ENV__: string;
/** BETTER_AUTH_URL at build time ("" if unset), baked in by vite.config.ts. */
declare const __BUILD_AUTH_URL__: string;
/** SITE_ORIGIN at build time: the production origin for canonical URLs ("" if unset). */
declare const __SITE_ORIGIN__: string;

interface ImportMetaEnv {
  /** Local dev only: "false" turns off Google sign-in UI (use BELMORE_QA_AS). */
  readonly VITE_AUTH_ENABLED?: string;
}
