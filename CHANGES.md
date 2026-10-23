# Belmore Estates: launch build changes

This repository is a fresh, self-hostable port of the original build (original baseline commit `d4eaac8`). Rounds 1–3 below describe work done before the port; anything they say about the old host has been replaced by Round 4.
Nothing was deployed or published. No service was signed up for and nobody was contacted. There is no `.env` file.

## Round 6: social icons, footer notices, /legal, Quill copy (draft only)
Nothing was published, nothing went to production, and no domains were changed. Code was deployed to the preview only. Full Faber notes: `/workspace/belmore/faber-review.md`.

**Social icons (top bar).**
- Inline-SVG icons for Facebook, Instagram, YouTube, LinkedIn, TikTok and X (`src/site/social-icons.ts`).
- URLs are settings (`global.social.*`) in Editor → Social & footer and in /admin → Social & legal.
- https only (validated on the server). Links use `target=_blank`, `rel="noopener noreferrer"` and aria-labels.
- Each icon is hidden until its URL is set. Edit mode shows the empty slots.

**Footer notices.**
- The `FooterLegal` block holds the official HUD Equal Housing Opportunity logo (vectorized from HUD's public-domain `fheo200.tif`, saved as `public/images/equal-housing-opportunity*.svg`, alt "Equal Housing Opportunity").
- It also has the editable EHO statement, a Privacy Notice summary linking to /privacy, Fair Housing Notice / SOP / Legal links, and broker lines.
- It is controlled by `global.legal.enabled` (Show/Hide), so it stays off on the published site until a publish.

**NY 19 NYCRR §175.29.**
- A homepage `HomeFairHousing` line plus a footer link to the NY DOS Fair Housing Notice.
- The URL setting is `global.footer.fairhousing.url`. While it is empty, the link falls back to /legal#dos.

**New /legal page** ("Fair Housing & Legal", system page `legal`, 31 `legal.*` keys). It returns 404 unless `global.legal.enabled` is on.

**Quill copy v2.**
- 63 new keys are in `src/data/copy-round6.ts`.
- Code defaults for new public sections are empty, so they render only when set (the published site is unchanged). Quill's text was written into the draft.
- New optional home sections: `HomeTrust`, `HomeTestimonial` (hidden publicly until a real quote and name exist), `HomeFairHousing`.
- Conditional additions: community facts (utilities, builder, HOA), a Process warranty box, the FAQ intro plus groups, and `home.sitemodel.intro`.
- Joseph's 31 overridden keys were not touched. Quill's proposals for them are in `/workspace/belmore/round-6-proposed-override-changes.md`.

**Library blocks (Faber-inspired).** Key facts strip, Photo link tiles, Centered intro. All start with `[PLACEHOLDER]`s.

## Round 5: visual editor (Wix-style, built on Puck)
**How to use it:** see `docs/editor-how-to.md` (plain English; also at `/workspace/belmore/editor-how-to.md`).

**What it is.** When an admin is signed in, every public page shows a "✎ Edit this page" button. It opens `/editor?page=…`, which shows the real page:
- Click any text to type over it. Click any photo to upload a replacement, pick an earlier upload or paste an https address; you can set alt text too.
- Sections can be moved ↑↓, hidden or shown, duplicated or deleted (with a confirm).
- "Add a section" drags in any of 13 blocks: hero, text + photo, gallery, plan cards (from Plans), lots list or map (from Lots), CTA, FAQ, testimonials (empty by default; real quotes only), lead form (the existing `/api/lead` backend), Google map, YouTube/Vimeo video, spacer/divider and rich text.
- Left-hand panels:
  - "Pages & menu": new pages with a slug and their own SEO, page settings and deletion. The menu supports add (page or https link), rename, reorder, hide and remove.
  - "Colors & fonts": presets, 9 color roles, curated Google fonts, button shape, spacing, and a logo as text or image.
  - "All text": search every piece of copy.
  - "Versions".
- Toolbar: page picker, Undo/Redo (covers every change, including theme and menu), Desktop/Tablet/Mobile, autosave status, Preview, Publish… and Exit.
- Plan and lot detail pages stay data-driven from /admin. The sections around them are editable.

**Why Puck (`@puckeditor/core` 0.23.0).**
- It's an MIT-licensed React page editor that renders our own components, so the canvas is the real site and not a re-creation.
- It ships drag-and-drop, an outline, undo/redo history, viewport switching and an iframe canvas.
- Its data is plain JSON that we validate and render ourselves on the server.
- Alternatives considered:
  - GrapesJS and Builder.io generate their own HTML/CSS (or are hosted SaaS), which would mean a second design system.
  - TinaCMS and Payload are Git- or CMS-centred rather than click-on-the-page.
  - A hand-rolled editor would mean rebuilding drag-drop and history.

**Data and publishing.** One source of truth, the `site_docs` table (migration `0008_site_editor.sql`), with two rows: `draft` and `published`.
- The doc holds text overrides, theme, nav and custom pages and sections. Anything missing falls back to the code defaults, so the seeded doc `{"v":1,"texts":{…}}` renders the original site exactly. Before/after visitor screenshots of 15 pages at desktop and mobile were pixel-identical.
- The old `content_blocks` overrides were folded into both rows. The table was renamed `content_blocks_legacy` and is no longer read. /admin → Content now edits the same doc's draft texts, so changes go live with the next Publish in the editor.
- The editor autosaves the draft about 1 s after a change. The save uses optimistic revision checks, so a second window gets a friendly "changed in another window" message instead of overwriting.
- Visitors only ever get `published`. Preview (a `belmore_preview` cookie, admins only, `no-store`) shows the draft with a banner.
- Publish needs the button plus a confirm. It copies the draft, writes a `site_versions` snapshot and never happens automatically.
- Restoring a version (or "Discard unpublished changes") only replaces the draft: it first saves a restore point, and Undo still works. The `Original site` version is kept forever.

**Security.**
- All editor server functions are admin-checked (`authMiddleware` + allowlist) and zod-validated (`src/server/editor.ts`). The doc is size-capped and sanitized on save and on read.
- Rich text goes through an allowlist sanitizer: p, br, strong, b, em, i, u, s, a (http/https/mailto/tel and relative only, with rel=noopener), ul, ol, li, h2–h4, blockquote, hr and code. Links are checked with `safeHref`; map and video embeds are rebuilt from a parsed ID, never from raw iframe HTML.
- Images are jpg, png or webp only, up to 8 MB. The browser fixes the rotation, resizes the photo to at most 2400 px and re-encodes it to WebP, which drops EXIF and GPS data. The server then re-checks the magic bytes, caps the size at 3 MB and strips any metadata segments still left. Photos are stored in the Neon `media` table and served from `/media/$id`. A 3000×2000 test JPEG with camera EXIF came back as a 2400×1600 WebP with no EXIF.
- The editor is a lazily loaded chunk that only `/editor` imports. The visitor entry's static import graph contains no Puck code (checked on the build output).
- **CSP changes (minimal):**
  - `frame-src` adds `https://www.google.com` (Maps embed), `https://www.youtube-nocookie.com` and `https://player.vimeo.com` for the new map and video blocks.
  - `img-src` widens from `'self' data: blob: googleusercontent` to `'self' data: blob: https:` so the "Web address" photo option works. Images can't run script.
  - The editor canvas is a same-origin `srcdoc` iframe, which inherits the page CSP; `frame-ancestors 'none'` and `X-Frame-Options: DENY` are unchanged.

**Sign-in fallback.** Better Auth email + password, with public sign-up disabled (`disableSignUp`); the server returns `EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- Only emails already in `admins` can get a password, either from /admin → Admins → "Password sign-in (backup)" (owners only) or with `npm run admin:password -- email@example.com` (hidden prompt; needs `DATABASE_URL`).
- Passwords are 12–128 characters, scrypt-hashed. Setting a new one signs that person out everywhere.
- `/sign-in/email` is rate limited: 10 tries per 15 min, plus Better Auth's default 3 per 10 s, stored in the database (a `rateLimit` table) and shared across functions.
- Limitations: there is no "forgot password" email and no email verification, so an owner resets passwords. Sessions use a 5-minute cookie cache, so removing an admin can take up to 5 minutes to sign them out everywhere.

**Google sign-in (checked on the preview, Oct 23 2026).**
- The preview starts a valid Google OAuth request: Google accepts the client ID and the `https://preview--belmore-estates.netlify.app/api/auth/callback/google` redirect URI and shows its account picker. There's no `redirect_uri_mismatch` or `invalid_client`.
- The scopes are only `openid email profile`, which are non-sensitive.
- Sign-in works with the app in **Testing** status, but only for Google accounts listed as **test users** (up to 100). Anyone else gets "Access blocked: … has not completed the Google verification process".
- Simplest fix: Google Cloud Console → **Google Auth Platform → Audience → Test users → + Add users**, then add `realtor.deleguardia@gmail.com` and `belmoreestates@gmail.com` and save.
- Optional, for everyone: on **Audience**, click **Publish app** (no Google review needed for these scopes).
- Before launch: under **Clients → (this client) → Authorized redirect URIs**, add the production `https://<domain>/api/auth/callback/google`.

**Other limitations.**
- One editor at a time per site: a second window is stopped, not merged.
- There's no image cropping (photos are resized only), and video or map embeds don't play inside the editor canvas.
- The editor isn't designed for use on a phone; preview the mobile view with the Mobile toggle instead.
- Custom pages can't change the plan or lot detail data itself (that stays in /admin → Plans / Lots).
- Testimonials stay empty until real quotes are added.

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
- **Backups:** `npm run db:backup` (pg_dump + JSON) and an optional GitHub Action (`docs/nightly-backup.workflow.yml.example (copy to .github/workflows/nightly-backup.yml to enable)`, manual-only until you uncomment the schedule).

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
