import { createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { isProductionSite } from "@/server/env";

/**
 * Content-Security-Policy. TanStack Start's hydration scripts are inline, so
 * each response gets a fresh nonce (passed to the router in src/router.tsx,
 * which stamps it on every script it renders). Allowed third parties:
 *   - Google Fonts (fonts.googleapis.com CSS, fonts.gstatic.com files)
 *   - Web3Forms API (api.web3forms.com) for lead notifications from the browser
 *   - Google sign-in: a full-page redirect to accounts.google.com via
 *     /api/auth (same origin), plus Google profile photos (googleusercontent)
 *   - Cloudflare Turnstile (only used if TURNSTILE_ENABLED is turned on)
 * style-src keeps 'unsafe-inline' for React `style={…}` attributes.
 * Local dev skips the CSP: Vite injects un-nonced inline scripts for HMR.
 */
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "connect-src 'self' https://api.web3forms.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "form-action 'self' https://accounts.google.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Security headers on every server response (pages, server functions, /api). */
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const nonce = newNonce();
  const headers = new Headers({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    // No longer embedded anywhere: refuse all framing.
    "X-Frame-Options": "DENY",
  });
  if (import.meta.env.PROD) headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  // Only the production site (SITE_ENV=production) may be indexed; previews,
  // local dev and anything unconfigured default to noindex.
  if (!isProductionSite()) headers.set("X-Robots-Tag", "noindex, nofollow");
  setResponseHeaders(headers);
  return next({ context: { cspNonce: nonce } });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
