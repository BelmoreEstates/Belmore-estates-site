# Belmore Estates: launch build changes

This repository is a fresh, self-hostable port of the original build (original baseline commit `d4eaac8`). Rounds 1–3 below describe work done before the port; anything they say about the old host has been replaced by Round 4.
Nothing was deployed or published. No service was signed up for and nobody was contacted. There is no `.env` file.

## Round 4: portable port (Netlify + Neon + Better Auth Google)
- **Host:** Netlify (nitro `netlify` preset + `netlify.toml`): static files in `dist/`, one SSR function in `.netlify/functions-internal/server/`. Client IP for rate limits comes from `x-nf-client-connection-ip`. Vercel config was removed.
- **Database:** Neon Postgres over the pooled `DATABASE_URL` (`@neondatabase/serverless`). Local dev with no `DATABASE_URL` uses in-memory PGLite. `npm run db:migrate` applies `migrations/000N_*.sql`; `npm run db:seed` re-applies seed rows.
- **Auth:** Better Auth with Google OAuth only (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, optional `BETTER_AUTH_TRUSTED_ORIGINS`). Only verified Google emails get in; email/password is off. The admin allowlist is the `admins` table, compared in lowercase. The simulated dev sign-in (`BELMORE_QA_AS`) is compiled out of production builds.
- **Owners:** `belmoreestates@gmail.com` and `realtor.deleguardia@gmail.com` are seeded as owners (`0007_owners_and_multi_notify.sql`) and are the `OWNER_EMAILS` fallback. Owners can't be removed or demoted; the server refuses it, not just the UI.
- **Lead emails:** `WEB3FORMS_ACCESS_KEYS` (comma-separated) sends one Web3Forms submission per key, server-side and in parallel. The lead is stored first; failures are logged and shown in /admin → Leads as `failed` or `partial` with a masked key (`…abcd`). There's still a "Notifications not configured" banner when no keys are set. `WEB3FORMS_MODE=client` is a fallback for Web3Forms' free plan, which rejects server-side calls.
- **Contact email:** `CONTACT_EMAIL` (default `belmoreestates@gmail.com`) fills the `{{CONTACT_EMAIL}}` copy token.
- **Environments:** `SITE_ENV=production` is the only value that allows indexing. Everything else (the default) sends `X-Robots-Tag: noindex, nofollow` plus a robots meta tag. `npm run deploy:preview` publishes to the `preview` alias; `npm run deploy:prod` refuses unless `BELMORE_PROD_APPROVED=yes` (only after Joseph approves).
- **Security:** CSP with per-request nonces (allows Google sign-in, api.web3forms.com and Google Fonts), X-Frame-Options DENY, frame-ancestors 'none', COOP, nosniff, Referrer-Policy, Permissions-Policy and HSTS. The rate limit, honeypot, timing check and validation are unchanged.
- **Removed:** the old hosting platform's identity header, connector broker, preview bridge, manifest route and config folder. The privacy copy now says "the Belmore Estates website".
- **Backups:** `npm run db:backup` (pg_dump + JSON) and an optional GitHub Action (`.github/workflows/nightly-backup.yml`, manual-only until you uncomment the schedule).

## Round 3: model home and the fuller /plans page
- **Model home:** The Stonebridge (GLA 2300-2) is flagged as the model home. It gets a feature block on Home and at the top of /plans (`#model-home`) with GLA specs, the "Plan by GLA Architecture" credit, a "View on GLA" link, a placeholder image, and model-home details. Those details are placeholders: **[MODEL HOME ADDRESS — TO COME]**, **[MODEL HOME HOURS — TO COME]** and [PRICING — TBD].
- **Flags, not lists:** `migrations/0006_plan_showcase.sql` adds `plans.is_model` and `plans.featured`. It sets Stonebridge as the model, makes Stonebridge, Applewood, Saranac and Cravenwood featured, and moves them to the top of the sort order. /admin → Plans has **Model home** and **Featured** checkboxes and list badges. Only one model is allowed (enforced on the server), and the model is always featured. Add, hide and reorder all still work.
- **Home** shows ONLY the model plus the first three featured plans (Applewood, Saranac, Cravenwood). It then shows "View all plans" (GLA collection), "See the floor plans" (/plans) and a team-voice agent CTA. Other plans never appear on Home, even when visible. The round-3 screenshots confirm it: all 15 plans are visible, and Home renders exactly 4.
- **/plans** runs in this order: intro (GLA line, fit line, price note) → model home → showcase (3 large cards; bed chips filter showcase and more) → "More plans to explore" (the other 11 plans, compact cards, plus a "View all plans" button) → how it works (3 steps) → customizing → the page's single agent CTA ("Contact our team" → /contact, "Book a tour" → tour form).
- **Plan buttons:** every card's primary button, and the plan detail page's primary button, is "View on GLA". It links to that plan's `glaUrl` in a new tab with `rel="noopener noreferrer"` and a title of "View renderings and floor plans on GLA's site" (shared `GlaLink` component). "Plan details" links keep the internal `/plans/$slug` pages working. The detail page shows "GLA plan {plan_no}" in the eyebrow and a per-floor sub-line under Living area.
- **View all plans** links to `GLA_PLANS_URL = https://greaterliving.com/shop-plans/` (`site-config.ts`; checked 200 on Oct 23 2026, title "House Plans for Sale | Greater Living Architecture").
- **No fit claims:** fit badges and fit language were removed. Cards show specs only, with placeholder images.
- **Copy (Quill):** re-imported, 625 keys.
  - The old site-model keys `home.model.*` were renamed to `home.sitemodel.*` (eyebrow, h2, link, hint, caption, panel.*). `home.model.*` is now the Stonebridge feature, and `home.plans.card.price` was removed.
  - New tokens: `{plan_no}`, `{floors}` and `{gla_url}`. `{floors}` is empty for one-story plans and the Edgewater.
  - Calls to action are in a team voice ("Contact our team"). Joseph's name remains only in the formal listing-agent attributions (footer, About, FAQ developer answer, Privacy, contact meta description). No component hard-codes "Joseph" in visitor-facing text, and the Web3Forms subject is "Belmore Estates: <type>".
  - **Importer fix:** `scripts/import-copy.mjs` silently dropped keys containing `_` (e.g. `home.plans.agent_cta.*`). It now accepts them.
  - Interim placeholder text from earlier in this round was removed. Rendered pages were checked for raw keys and unfilled `{tokens}`, and none were found.
- **Applewood** is confirmed by Joseph as a selected plan; its notes in code, data and `gla-plans.json` now say so.
- **FLAG: Carverdale and Saranac share GLA plan no. 2313R.** Their GLA pages are distinct (`/product/the-carverdale/` and `/product/the-saranac/`, both 200), with different widths (98'-1 3/4" vs 66'). GLA's page data lists SKU 2313R for both. They are shown as two plans, so confirm with GLA which number is correct.
- **Edgewater:** 2,425 sq ft includes a 589 sq ft in-law space (1,836 main floor). No floor split is shown.
- **Model-home block copy:** the model feature's specs and heading come from Quill's copy, which is written for The Stonebridge. If the admin flags a different plan as the model, edit `plans.model.*` / `home.model.*` in /admin → Content to match.

## What changed
- **Leads in Postgres** (`migrations/0002_leads.sql`, `src/server/leads.ts`, `src/server/lead-schema.ts`). Lead types are contact, tour, waitlist and reservation (lots 801–807, first and second choice, non-binding acknowledgement). Leads are validated with zod on the server. All SQL uses tagged-template parameters, and `getSql` is only called inside `createServerFn`.
- **Spam protection:**
  - a hidden honeypot (`website`), which returns a fake success and stores nothing;
  - a signed form token with a 3-second minimum fill time and a 2-hour expiry;
  - a simple human check;
  - an IP rate limit of 5 per 10 minutes, keyed on a salted SHA-256 hash of the IP (hashes are pruned after 1 day);
  - rejection of more than 2 links;
  - a Turnstile hook that is present but off (`TURNSTILE_ENABLED=false`).
- **Web3Forms notifications** in client mode: after the lead is saved, the browser POSTs to api.web3forms.com and then confirms back with a single-use token (`markLeadNotified`). Leads are saved even when no key is set (status `not_configured`).
- **One form for every lead type:** `InquiryForm` was rewritten with a type selector (contact / tour / waitlist / reservation). `/contact` accepts `?form=&lot=&plan=&interest=`. No new layouts were added.
- **/admin** (`src/routes/admin.tsx`, `src/server/admin.ts`). Every server function checks authorization on the server (`requireAdmin`). The tabs are:
  - Leads: filter, search, status, expandable details, CSV export.
  - Content: every copy block, with save and reset.
  - Photos: by URL, or upload of up to 1 MB stored in the DB and served at `/media/$id`.
  - Lots: Available / Reserved / Sold, price (default "On request"), premium (default TBD), note.
  - Future section: waitlist copy.
  - Plans: add, edit, reorder, hide or show.
  - Admins: owner only.
- **Content from the DB:** `migrations/0005_seed_content.sql` seeds the content from Quill's copy (`scripts/import-copy.mjs`, 540 keys, re-run after the faq.md and home.md updates on schools, utilities and taxes) and the 15 GLA plans (`scripts/import-gla-plans.mjs`, `scripts/gen-seed.mjs`). Pages render from the DB and fall back to the static defaults in `src/data/*.generated.ts` and `content.ts`.
- **Lot status labels** appear everywhere: /homes cards, /homes/$slug, home, the 3D model panel and the contact lot picker.
- **Pages wired to keyed copy with SEO per page:** home, plans, plan detail, homes, lot detail, community, design studio, process, about, FAQ (q1–q13), privacy, contact, login. The footer reads "Developer office".
- **Plans by GLA Architecture:** each plan carries a credit and a link to the GLA plan page, and uses a shared placeholder image (`public/images/plan-placeholder.svg`, with `imagesPending`). There are no GLA images in the repo.
- **Security headers:** nosniff, Referrer-Policy, Permissions-Policy and HSTS. (Round 4 added a nonce CSP and X-Frame-Options DENY.)
- **Sign-in:** `/login` is Google only. Email/password is **not** enabled. (Round 4: Better Auth with your own Google OAuth client.)
- **Admins table** (`0004_admins.sql`) plus the `OWNER_EMAILS` fallback. The owner manages admins, and admins cannot remove the owner. Email comparisons are lowercase. Accounts with unverified emails are denied.
- **Crash fixes from Steering 6:** missing exports, plan highlights and gallery, empty image boxes, the "Four ways…" copy, pages not reading the copy, and the missing /admin.

## Files
New:
- `migrations/0001–0006`
- `src/server/{admin,content.server,lead-schema,leads,public,security.server}.ts`
- `src/routes/{admin,login}.tsx`, `src/routes/media.$id.ts`, `src/routes/api/auth/*`, `src/start.ts`
- `src/components/site/{plan-image,text}.tsx`
- `src/data/{content,copy.generated,plans.generated,site-config}.ts`
- `scripts/{import-copy,import-gla-plans,gen-seed}.mjs`
- `public/images/plan-placeholder.svg`
- `qa/`

Modified:
- `src/components/site/{chrome,inquiry-form,site-model}.tsx`
- `src/data/site.ts`
- every page in `src/routes/` (including `__root.tsx`, with no og tags)
- `routeTree.gen.ts`
- `package-lock.json`

Deleted:
- `src/lib/inquiries.ts` (replaced by the server)
- `src/components/site/plan-sketch.tsx`

## Configuration
Everything lives in `src/data/site-config.ts`, with no secrets in it:
- `CONTACT_EMAIL = 'realtor.deleguardia@gmail.com'`
- `WEB3FORMS_ACCESS_KEY = ''` (TODO). Get a free key at web3forms.com for that address and paste it in. Web3Forms access keys are meant to be public. While the key is empty, /admin shows a "Notifications not configured" banner.
- `OWNER_EMAILS = ['realtor.deleguardia@gmail.com']`. More admins can be added under /admin → Admins.
- `SPAM` limits, `TURNSTILE_ENABLED` and `TURNSTILE_SITE_KEY`. The secret goes in the server env var `TURNSTILE_SECRET_KEY`.
- Server env: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, which is also used to sign form tokens and salt IP hashes.

## Pre-launch checklist
1. Set `DATABASE_URL` and `BETTER_AUTH_SECRET` in the host env. Without the secret, a dev-only fallback secret is used, so **this must be set**.
2. Run the migrations (`npm run build` runs `scripts/migrate.mjs` when `DATABASE_URL` is set).
3. Add the Web3Forms key and send a test lead to confirm the email arrives.
4. Sign in at /login as the owner and confirm /admin opens; add any other admins.
5. Fill every placeholder below, either in /admin → Content or in the copy source.
6. Replace the plan placeholder images once GLA grants permission, or upload licensed photos.
7. Confirm the plat findings below and fill the model-home address and hours.
8. Settle the privacy-policy draft (effective date, retention, analytics), then remove the draft flag.
9. Optionally turn on Turnstile.
10. Remove `BELMORE_QA_AS` from any env. It is ignored in production builds anyway.

## Placeholders still in the copy (count)
| Placeholder | Count |
|---|---|
| [PRICING — TBD] | 9 (8 in copy, 1 in `site.ts`); the lot price shows "On request" in its place |
| [SALES PHONE — TO COME] | 7 |
| [BUILDER — TO CONFIRM] | 6 |
| [TOUR HOURS — TO COME] | 4 |
| [STUDIO PARTNER — TO COME] | 4 |
| [RESERVATION TERMS — TBD] | 4 |
| [BUILD TIMELINE — TBD] | 4 |
| [STATUS — TBD] | 3 |
| [LOT PREMIUM — TBD] | 3, plus the premium on every lot |
| [FINISH ALLOWANCE — TBD] | 3 |
| [WARRANTY TERMS — TBD] | 2 |
| [HOA — TBD] | 2 |
| Each once | [UTILITIES — TO CONFIRM], [TAX ESTIMATE — TO COME], [STANDARD FEATURES — TO COME], [RETENTION PERIOD — TBD], [FUTURE SECTION TIMING — TBD], [EFFECTIVE DATE — TO COME], [CONTRACT SIGNATORY — TO COME], [COMPANY HISTORY — TO COME], [CO-OP POLICY — TBD], [BROKER DISCLOSURE — TO CONFIRM], [ANALYTICS — TO CONFIRM] |

Other placeholders:
- All 15 plan images are a shared placeholder (`imagesPending`).
- Placeholders render with a dashed copper style.

## Plat findings
Source: `23041 Legends West 8 Signed Plan Set.pdf`, p.1; see `/workspace/belmore/plat-lots.csv`.
- Lots 801–807 match `site.ts` for area and acres:
  - 801 is 18,802 sq ft;
  - 802–804 are 12,000 sq ft (80×150);
  - 805 is 12,400 sq ft (80×155);
  - 806 is 17,632 sq ft (corner);
  - 807 is 18,009 sq ft (corner).
- 801, 806 and 807 are irregular, so frontage is shown as segments and arcs, not as one width.
- **FLAG:** the plat labels only "FUTURE SECTION". No lots from 808 up are numbered or dimensioned, so the "24 lots / 17 future" figure **cannot be confirmed** from this PDF.

## Web3Forms and Gmail findings
- Web3Forms needs a free access key tied to the destination email. No account was created, as instructed. The free tier sends to that one email. Client mode avoids any server-side secret.
- The Gmail connector was not used and the site does not depend on it. It could later be used to read or forward notifications, but it is not part of the lead path. Leads are always in Postgres and in /admin.
- **Copy accuracy:** form success lines saying the note reached our team are only true once the Web3Forms key is set. Set the key before launch.

## Plan width notes (internal only; never shown on the site)
The site makes **no claim that any plan fits any lot**: there are no fit badges and no fit language, only GLA's specs, and the copy says lot fit is confirmed by our sales team with [BUILDER — TO CONFIRM]. For that conversation, GLA's published widths are: Carverdale 98'-1 3/4", Sheridan 84', Edgewater 80', Cravenwood 72'4", Windsor Farm 68', Stanton 67'8", Pelham 66'8", Saranac 66', Maple Place 65', Rhinecliff 63', Evans Farm 59', Larkin Creek 59', Stonebridge 57'8", Applewood 56', Wisteria Lane 43'4". Interior lots 802–805 are 80 ft wide on the plat; setbacks are unverified.

## Layout additions or deviations
- the future-section card on /homes;
- the type chips on the contact form;
- the consent checkbox is required;
- phone is required for tours and reservations;
- the contact-page aside is sparse in its idle state;
- `privacy.s8.body2` is my own addendum, added so the privacy text accurately describes the IP-hash spam measures.

## Local QA hook
`checkAdmin` in `src/server/security.server.ts` has a **LOCAL QA ONLY** branch. It is active only when `import.meta.env.DEV`, auth is off (`VITE_AUTH_ENABLED=false`) and `BELMORE_QA_AS=<email>` is set. It simulates that signed-in email. It is compiled out of production builds (verified: the string is not in the Netlify function bundle).

## QA results (local; screenshots in `qa/`, log in `qa/qa-log.txt`)
- `npm run build` and `tsc --noEmit` pass.
- All pages return 200, and an unknown path shows the 404 page.
- There is no "by appointment" or "four plans" text anywhere.
- Page titles come from the SEO keys.
- Forms:
  - empty submit → "This one's required.";
  - wrong human check, too-fast submit and 3 links are rejected;
  - the honeypot gets a fake success and nothing is stored;
  - valid contact, tour, waitlist and reservation (803, second choice 804) are all saved;
  - a reservation without the acknowledgement is blocked;
  - the 6th submission in 10 minutes → "Too many requests…".
- Admin:
  - signed out → sign-in prompt;
  - owner (simulated as `Realtor.Deleguardia@gmail.com`, mixed case) → admin, with the banner, a CSV with 1 row, lead status → contacted, and a content edit visible on home;
  - lot 803 → Reserved and 805 → Sold, shown on /homes, /homes/803 and home;
  - hiding Applewood removes it from /plans;
  - a non-allowlisted user (simulated) → denied screen, and direct replays of listLeads, listBlocks and saveLot return "Not an admin" (TanStack sends the error in a 200 response).
- Headers: nosniff, Referrer-Policy, Permissions-Policy and HSTS are present (CSP and X-Frame-Options were added in Round 4).
- No browser console errors (only Vite's dev-only "Outdated Optimize Dep" message).

## What cannot run locally
- Real Google sign-in (needs a Google OAuth client); admin access was tested with the simulated QA hook.
- Neon Postgres: local runs use in-memory PGLite, which resets on restart.
- Web3Forms email delivery: there is no key.
