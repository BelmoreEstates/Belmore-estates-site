import { createFileRoute, Link } from "@tanstack/react-router";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useText } from "@/components/site/text";

// Only Google (Better Auth's built-in provider): its email is verified by
// Google. Email/password sign-in is disabled in src/lib/auth/server.ts.

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in · Belmore Estates" }, { name: "robots", content: "noindex" }] }),
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
        <Link to="/admin" className="mt-8 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream">
          Open admin
        </Link>
      ) : (
        <GoogleSignInButton callbackURL="/admin" className="mt-8" />
      )}
    </section>
  );
}
