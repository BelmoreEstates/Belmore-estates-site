import { createAuthClient } from "better-auth/react";

/** Better Auth browser client: talks to this site's own /api/auth/*. */
export const authClient = createAuthClient();

/**
 * Whether sign-in UI is live. Local dev sets `VITE_AUTH_ENABLED=false` to use
 * the simulated QA sign-in instead (see security.server.ts). Production builds
 * always have auth on.
 */
export const authEnabled = import.meta.env.PROD || import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Start Google sign-in (full-page redirect). */
export async function signInWithGoogle(opts: { callbackURL?: string; errorCallbackURL?: string } = {}) {
  const res = await authClient.signIn.social({
    provider: "google",
    callbackURL: opts.callbackURL ?? "/admin",
    errorCallbackURL: opts.errorCallbackURL ?? "/login",
  });
  if (res?.error) throw new Error(res.error.message ?? "Sign-in failed");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    if (typeof window !== "undefined") window.location.assign(redirectTo);
  }
}
