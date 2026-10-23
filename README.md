# Belmore Estates website

The marketing site and admin for Belmore Estates (Phase 1 lots 801–807, Legends West, North Greece, NY).

- **App:** TanStack Start (React 19, Vite, Tailwind v4). Server functions handle forms and admin.
- **Host:** Netlify (free plan). Static files plus one SSR function.
- **Database:** Neon Postgres (free plan), over the pooled connection string.
- **Sign-in:** Better Auth with Google OAuth. Only verified Google emails on the admin list get in, and email/password is off.
- **Lead emails:** Web3Forms, one submission per configured inbox.

The design (Fraunces/Outfit; paper, cream, ink, pine, copper and line colours; the 3D site model) lives in `src/styles.css` and `src/components/`. Copy is keyed in `src/data/copy.generated.ts` and can be overridden in /admin → Content.

---

## 1. Local development

Requirements: Node 20+ (Node ≥ 22.13 for deploying, because netlify-cli needs it).

```bash
npm install
npm run dev                # http://localhost:8080
```

With nothing configured, local dev uses an **in-memory PGLite** database. All migrations are applied automatically at startup, and the data resets when you restart.

To see /admin without Google keys, use the simulated sign-in. It is dev only, and production builds compile it out:

```bash
VITE_AUTH_ENABLED=false BELMORE_QA_AS=belmoreestates@gmail.com npm run dev
```

Try `BELMORE_QA_AS=someone@example.com` to see the "not on the admin list" screen.

To use real settings locally, copy `.env.example` to `.env` and fill in what you need. `.env` is gitignored and must never be committed.

Checks:

```bash
npm run typecheck
npm run lint
npm test          # deploy-script safety tests
npm run build     # Netlify output: dist/ + .netlify/functions-internal/server/
```

## 2. Environment variables

Every variable is documented in **`.env.example`**. Summary:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Netlify, local | Neon **pooled** connection string (`-pooler` host). Blank locally means PGLite. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Netlify | Google OAuth client (see §4). |
| `BETTER_AUTH_SECRET` | Netlify | 32+ random chars (`openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | set per deploy by the deploy scripts | The site origin. Local default is `http://localhost:8080`. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Netlify (optional) | Comma-separated. Default: `https://belmore-estates.netlify.app,https://preview--belmore-estates.netlify.app`. Add the custom domain later. |
| `OWNER_EMAILS` | Netlify (optional) | Owners, who can't be removed. Default: `belmoreestates@gmail.com,realtor.deleguardia@gmail.com`. |
| `WEB3FORMS_ACCESS_KEYS` | Netlify | Comma-separated, one key per inbox. Blank means no emails and a banner in /admin. |
| `WEB3FORMS_ACCESS_KEY` | Netlify (legacy) | Single key, merged with the list above. |
| `WEB3FORMS_MODE` | Netlify (optional) | `server` (default) or `client`. See §6. |
| `CONTACT_EMAIL` | Netlify (optional) | Public contact address, used for the `{{CONTACT_EMAIL}}` token. Default: `belmoreestates@gmail.com`. |
| `SITE_ENV` | set per deploy by the deploy scripts | Only `production` allows indexing. The default is noindex. |
| `TURNSTILE_SECRET_KEY` | optional | Only if Turnstile is switched on in `src/data/site-config.ts` (it's off). |
| `VITE_AUTH_ENABLED`, `BELMORE_QA_AS`, `WEB3FORMS_API_URL`, `BELMORE_LOCAL_PGLITE` | local only | Dev and QA helpers. |
| `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE`, `PREVIEW_URL`, `PRODUCTION_URL`, `BELMORE_PROD_APPROVED`, `DRY_RUN` | your machine only | Deploy script. |
| `BACKUP_DATABASE_URL` | GitHub Actions secret | Optional nightly backup. |

No secret is ever sent to the browser. The only build-time values in client code are `SITE_ENV`, `BETTER_AUTH_URL` and `VITE_AUTH_ENABLED`. Secrets are read in server code from `process.env`, and `getSql()` is only used in server files.

## 3. Database: migrations and seed

SQL migrations live in `migrations/000N_*.sql`. Each file runs once, in one transaction, and is recorded in `_migrations`.

```bash
DATABASE_URL='postgres://…' npm run db:migrate   # apply pending migrations (safe to re-run)
DATABASE_URL='postgres://…' npm run db:seed      # optional: re-upsert owners + default lots/plans
```

- Migrations already seed the default content, plus both owners: `belmoreestates@gmail.com` and `realtor.deleguardia@gmail.com` (`0007`).
- `db:seed` never overwrites rows edited in /admin.
- New schema change: add `migrations/0008_something.sql`, then run `npm run db:migrate` against each database **before** deploying code that needs it.
- The deployed site doesn't run migrations by itself.

## 4. One-time setup: Neon, Google, Netlify

Joseph or the site owner does these steps; nothing here was created by the build.

1. **Neon:** create a project and copy the **pooled** connection string. Then run `npm run db:migrate` with it.
   - Optional: create a Neon **branch** for previews (see "Preview vs production" below).
2. **Google OAuth** (Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web application):
   - **Authorized JavaScript origins:**
     - `https://belmore-estates.netlify.app`
     - `https://preview--belmore-estates.netlify.app`
     - `http://localhost:8080` (optional, for local)
   - **Authorized redirect URIs:**
     - `https://belmore-estates.netlify.app/api/auth/callback/google`
     - `https://preview--belmore-estates.netlify.app/api/auth/callback/google`
     - `http://localhost:8080/api/auth/callback/google` (optional)
   - Later, add the custom domain to both lists and to `BETTER_AUTH_TRUSTED_ORIGINS`, then set `PRODUCTION_URL`.
3. **Netlify:** create a site named **`belmore-estates`**.
   - **Do not link a Git repository.** Deploys happen only from the CLI (§5), so nothing publishes on a push.
   - Site configuration → Environment variables: add `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `WEB3FORMS_ACCESS_KEYS`, and optionally `CONTACT_EMAIL`, `OWNER_EMAILS`, `BETTER_AUTH_TRUSTED_ORIGINS` and `WEB3FORMS_MODE`.
   - Give them all the **Functions** scope; Builds also works.
   - **Don't** set `SITE_ENV` or `BETTER_AUTH_URL` there, because the deploy script sets them per deploy.
4. **Web3Forms:** create one access key per inbox and put them in `WEB3FORMS_ACCESS_KEYS`, comma-separated. Read §6 first.
5. **Netlify personal access token:** User settings → Applications → Personal access tokens. Keep it in your shell or in `.env` as `NETLIFY_AUTH_TOKEN`. Never commit it, and never put it on Netlify.

## 5. Deploying

Both commands build locally (`npm run build`, from `netlify.toml`) and upload with `netlify-cli`. They need **Node ≥ 22.13** and `NETLIFY_AUTH_TOKEN`.

```bash
npm run deploy:preview
# → https://preview--belmore-estates.netlify.app   (netlify deploy --alias preview; NOT production, never --prod)

# ONLY AFTER JOSEPH APPROVES the preview:
BELMORE_PROD_APPROVED=yes npm run deploy:prod
# → https://belmore-estates.netlify.app             (netlify deploy --prod-if-unlocked)
```

- `deploy:prod` refuses to run without `BELMORE_PROD_APPROVED=yes` on the command line. A value in `.env` is ignored on purpose.
- `DRY_RUN=1 npm run deploy:preview` prints the exact netlify command without running it.
- The script prints a reminder to run `npm run db:migrate` first when there are new migrations.
- Each deploy gets its own `SITE_ENV` and `BETTER_AUTH_URL`. They are baked into the build and also passed to the functions with `netlify deploy --env`:
  - preview: `SITE_ENV=preview`, `BETTER_AUTH_URL=https://preview--belmore-estates.netlify.app`
  - production: `SITE_ENV=production`, `BETTER_AUTH_URL=https://belmore-estates.netlify.app`, or `PRODUCTION_URL` once the custom domain is live.

Output layout, if you ever deploy by hand:

- The publish dir is `dist/`, which includes nitro's `_headers` (immutable cache for `/assets/*`) and `_redirects`.
- The SSR function is `.netlify/functions-internal/server/` and serves `/*`, with static files taking precedence.

An alternative is Netlify's own `@netlify/vite-plugin-tanstack-start` instead of the nitro `netlify` preset. It wasn't needed.

### Previews: public but unguessable, never indexed

- The preview URL isn't linked from anywhere. Every non-production deploy sends `X-Robots-Tag: noindex, nofollow` and `<meta name="robots" content="noindex, nofollow">`.
- Indexing is allowed only when `SITE_ENV=production`, and the default is noindex.
- Anyone with the link can view the preview. For a password, Netlify's site protection needs a paid plan.

### Preview vs production share one site

`preview--belmore-estates` and production are **the same Netlify site**, so they share its environment variables. That means the **same Neon database**: leads and admin edits made on the preview are real.

- If you want isolation, create a Neon branch and deploy the preview with a different `DATABASE_URL`. Netlify's per-context values ("Deploy previews" / "Branch deploys") don't reliably apply to CLI `--alias` drafts, so pass it at deploy time instead. Add `--env DATABASE_URL=…` in `scripts/deploy.mjs` for the preview target.
- Google sign-in works on both, because both origins are trusted and registered.

### Locking production

- Keep the site **unlinked from Git**, so there are no automatic builds.
- In Netlify → Deploys, use **"Lock to stop auto publishing"** on the approved production deploy. New deploys then can't go live until someone publishes or unlocks them in the Netlify UI.
- `deploy:prod` uses `netlify deploy --prod-if-unlocked`. While production is locked it uploads a **draft** instead of going live. To publish the draft, open Netlify → Deploys → that deploy → **Publish deploy**.
- A plain `netlify deploy --prod` against a locked site asks to unlock it. Answer **no**.
- Only run `deploy:prod` after Joseph approves the preview. Never run `netlify deploy --prod` directly.
- To roll back, open Deploys → pick the earlier deploy → **Publish deploy**.

## 6. Lead notifications (Web3Forms) — read this

- **Every submission is stored in Neon first.** /admin → Leads is the source of truth, and it has a CSV export.
- With keys set, each lead is sent to **every** key in parallel.
- The Email column shows `sent`, `partial` (some inboxes failed), `failed`, `not_configured` or `client`. Errors show a masked key (`…abcd`), and failures are also logged to the Netlify function log.
- **Caveat:** Web3Forms' docs say its **free plan blocks server-side submissions (HTTP 403)**. Server mode (the default) needs a paid plan with Netlify's IPs safelisted, and Netlify functions don't have fixed IPs.
- **On the free plan, set `WEB3FORMS_MODE=client`.** The lead is still stored server-side first. Then the visitor's browser sends one submission per key and reports the result back, which /admin shows.
- Web3Forms access keys are designed to be public, so client mode doesn't leak a secret.
- Test it after the first preview deploy by submitting the contact form and checking both inboxes.

## 7. Security

- **Headers:**
  - On every response: a nonce-based CSP that allows Google sign-in, `api.web3forms.com` and Google Fonts. Its `frame-ancestors 'none'` plus X-Frame-Options DENY stop the site being embedded in a frame.
  - Also: COOP, nosniff, Referrer-Policy, Permissions-Policy and HSTS (in `src/start.ts` and `netlify.toml`).
- **Forms:** zod validation, a honeypot, a minimum fill time, a human check, a link limit, and a per-IP rate limit (`x-nf-client-connection-ip`).
- **Admin:**
  - Every admin server function checks the session again, along with Google as the provider, a verified email, and the `admins` table (lowercase).
  - Owners can't be removed or demoted.

## 8. Backups

```bash
DATABASE_URL='postgres://…' npm run db:backup     # → backups/belmore-<timestamp>.json (+ .sql if pg_dump is installed; gitignored)
```

- `docs/nightly-backup.workflow.yml.example (copy to .github/workflows/nightly-backup.yml to enable)` is **disabled by default**: it runs only when started by hand. To run it nightly, uncomment its `schedule` and add a `BACKUP_DATABASE_URL` repository secret.
- Backups contain lead contact details, so keep the repo private.
- Neon also has its own point-in-time restore window.

## 9. More

- `HANDOFF.md` covers transferring the repo, Netlify, Neon and Google, rotating secrets, and changing owners.
- `CHANGES.md` is the build history.
- GLA plans: "View all plans" links to <https://greaterliving.com/shop-plans/>, and each plan links to its own GLA page. GLA images are never stored in this repo.
