import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/client";

/** "Continue with Google" (full-page redirect to Google, back to callbackURL). */
export function GoogleSignInButton({
  callbackURL = "/admin",
  className = "",
}: {
  callbackURL?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className={`grid max-w-sm gap-2 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          signInWithGoogle({ callbackURL, errorCallbackURL: "/login" }).catch((e: unknown) => {
            setError(e instanceof Error ? e.message : "Sign-in failed");
            setBusy(false);
          });
        }}
        className="inline-flex min-h-11 items-center justify-center border border-ink bg-cream px-5 text-sm disabled:opacity-60"
      >
        Continue with Google
      </button>
      {error ? (
        <p className="text-sm text-copper" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
