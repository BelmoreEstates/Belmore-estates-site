# Handoff: moving Belmore Estates to a new owner

Everything runs on accounts the owner controls: a GitHub repo, a Netlify site, a Neon project, a Google Cloud OAuth client and Web3Forms keys. None of it depends on the original builder.

## What exists

| Piece | Where | Holds |
|---|---|---|
| Code | GitHub repo (private) | This repository. No secrets in it. |
| Hosting | Netlify site `belmore-estates` | Deploys plus the environment variables (all the secrets). |
| Database | Neon project | Leads, content edits, lots, plans, admins and sessions. |
| Sign-in | Google Cloud project → OAuth client | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. |
| Lead emails | Web3Forms | One access key per inbox. |
| Deploy access | Netlify personal access token | Lives on the deployer's machine only. |

## 1. Transfer the GitHub repository

1. Repo → Settings → General → Danger Zone → **Transfer ownership**, then enter the new owner's account or organization.
2. The new owner accepts the transfer. Collaborators and Actions secrets carry over.
3. Re-add `BACKUP_DATABASE_URL` under Settings → Secrets → Actions if you rotate the database password (§4).
4. Keep the repo **private**, because backup artifacts contain lead contact details.

You can also clone it without transferring: `git clone`, push to a new repo, and archive the old one.

## 2. Transfer the Netlify site

- **Option A: move the whole team.** Add the new owner as a team Owner, then remove yourself.
- **Option B: move only the site.** Site configuration → General → Danger zone → **Transfer project** to a team the new owner belongs to. The site name, URLs, deploys and env vars move with it.
- **Afterwards:**
  - The new owner creates their **own** personal access token.
  - The old owner revokes theirs (User settings → Applications).
  - Custom domain: if DNS is at Netlify, it moves with the team. Otherwise, update the registrar records.

## 3. Transfer the Neon project

1. Neon Console → Project settings → **Transfer project** to the new owner's organization. Or invite them to the org and make them an admin.
2. Rotate the database password afterwards (§4), and update `DATABASE_URL` on Netlify and `BACKUP_DATABASE_URL` on GitHub.
3. Before any transfer, take a backup: `DATABASE_URL=… npm run db:backup`.

Starting over on a fresh Neon project instead:

1. Run `npm run db:backup`. This needs `pg_dump` installed, at least the Neon server's version.
2. Create the new project and restore into the **empty** database with `psql "$NEW_DATABASE_URL" -f backups/belmore-<timestamp>.sql`. The full dump includes the schema and the `_migrations` table.
3. Run `npm run db:migrate` against it, which applies only newer migrations.
4. Switch `DATABASE_URL` on Netlify.

## 4. Rotating secrets

After changing any Netlify env var, redeploy (`npm run deploy:preview`, then `deploy:prod` once approved), because functions read env at deploy time.

| Secret | How to rotate | Effect |
|---|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`, then set it on Netlify and redeploy. | Everyone is signed out and signs in again. |
| Google client secret | Google Cloud → Credentials → OAuth client → add secret, update `GOOGLE_CLIENT_SECRET`, redeploy, then delete the old secret. A new client also needs the redirect URIs from README §4. | Sign-in keeps working once deployed. |
| Neon password | Neon → Roles → reset password. Update `DATABASE_URL` (pooled) on Netlify and `BACKUP_DATABASE_URL` on GitHub, then redeploy. | Brief errors until redeployed. |
| Netlify PAT | Revoke it in User settings → Applications, then create a new one locally. | Affects only whoever deploys. |
| Web3Forms keys | Create new keys in Web3Forms, replace `WEB3FORMS_ACCESS_KEYS`, redeploy, then delete the old keys. | Emails go to the new keys' inboxes. |

If a secret leaks (pasted somewhere, committed), rotate it immediately. Removing a secret from git history isn't enough.

## 5. Changing owner and admin emails

Owners are admins who can't be removed or demoted. Today they are `belmoreestates@gmail.com` and `realtor.deleguardia@gmail.com`.

There are two sources, both compared in lowercase:

1. **The `admins` table**, where `role = 'owner'` or `'admin'`. /admin → Admins can add and remove regular admins. It deliberately refuses to touch owners.
2. **`OWNER_EMAILS`** (Netlify env, comma-separated). These addresses are always treated as owners. The default when it's unset is the two addresses above.

To change the owners:

1. Set `OWNER_EMAILS` on Netlify to the new list, then redeploy.
2. Add a migration so the database matches, e.g. `migrations/0008_change_owners.sql`:

   ```sql
   insert into admins (email, role, added_by) values ('new.owner@gmail.com', 'owner', 'migration')
     on conflict (email) do update set role = 'owner';
   -- only if the old owner should lose access entirely:
   delete from admins where email = 'old.owner@gmail.com';
   ```

3. Run `npm run db:migrate` against Neon, and update `DEFAULT_OWNER_EMAILS` in `src/data/site-config.ts` and `scripts/seed.mjs` so the code fallback matches.
4. A removed owner stays an owner while their address is still in `OWNER_EMAILS` or in the code default. Remove it from all three places.

To change the public contact address, set `CONTACT_EMAIL`. That updates the `{{CONTACT_EMAIL}}` token everywhere in the copy. Lead notification inboxes are controlled by which Web3Forms keys are in `WEB3FORMS_ACCESS_KEYS`.

## 6. Checklist for the new owner

- [ ] GitHub repo transferred and private.
- [ ] Netlify site in your team, a new PAT created, the old PAT revoked.
- [ ] Neon project transferred, password rotated, `DATABASE_URL` updated.
- [ ] Google OAuth client owned by you; redirect URIs for both netlify.app URLs (and the custom domain).
- [ ] `BETTER_AUTH_SECRET` rotated.
- [ ] Web3Forms keys are yours; test a form on the preview.
- [ ] `OWNER_EMAILS` and the `admins` table list the right people.
- [ ] Production locked in Netlify (README §5 "Locking production").
- [ ] Optional: nightly backup enabled with a `BACKUP_DATABASE_URL` secret.
