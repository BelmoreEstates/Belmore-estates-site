import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signInWithPassword } from "@/lib/auth/client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useText } from "@/components/site/text";

// Google (Better Auth's built-in provider; its email is verified by Google),
// plus a fallback email + password form for admins whose password an owner
// created in /admin → Admins. There is no public sign-up.

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · Belmore Estates" }, { name: "robots", content: "noindex" }],
  }),
});

function LoginPage() {
  const t = useText();
  const { user, isPending } = useCurrentUserState();
  return (
    <section className="mx-auto max-w-xl px-5 py-20">
      <p className="text-xs uppercase tracking-widest text-copper">Belmore Estates</p>
      <h1 className="mt-3 text-5xl">{t("login.h1")}</h1>
      <p className="mt-4 text-muted">{t("login.body")}</p>
      {isPending ? null : user ? (
        <Link
          to="/admin"
          className="mt-8 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream"
        >
          Open admin
        </Link>
      ) : (
        <>
          <GoogleSignInButton callbackURL="/admin" className="mt-8" />
          <PasswordSignIn />
        </>
      )}
    </section>
  );
}

function PasswordSignIn() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 block text-sm text-muted underline underline-offset-4"
      >
        Sign in with email and password instead
      </button>
    );
  return (
    <form
      onSubmit={submit}
      className="mt-8 grid max-w-sm gap-4 border-t border-line pt-6"
      aria-label="Sign in with email and password"
    >
      <label className="grid gap-1 text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-11 border border-line bg-white px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Password
        <input
          type="password"
          required
          minLength={12}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-11 border border-line bg-white px-3"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-[#9a3b1e]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center bg-pine px-5 text-sm text-cream disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-muted">
        Passwords are created by the site owner in Admin → Admins. Forgot yours? Ask the owner to
        set a new one.
      </p>
    </form>
  );
}
