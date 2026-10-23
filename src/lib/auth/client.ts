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
export async function signInWithGoogle(
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
) {
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

/**
 * Fallback sign-in with an email + password an owner created in /admin.
 * There is no public sign-up and no "forgot password" email.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const res = await authClient.signIn.email({ email, password });
  if (res?.error) {
    const status = (res.error as { status?: number }).status;
    throw new Error(
      status === 429
        ? "Too many attempts. Please wait a few minutes and try again."
        : "That email and password didn’t match. Ask the site owner to reset your password if you’ve forgotten it.",
    );
  }
}
