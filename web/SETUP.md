# Database-backed practice app

The Next.js app in `web/` is the application to deploy. Its sign-in is independent
of University of Waterloo. A new email and password create a practice account;
the chosen role is stored once. No email ownership or instructor status is
verified. Do not invite real students or enter real student information yet.

## Databases

Create **two separate Neon PostgreSQL projects**, one for identity and course
membership and one for anonymous discussion. They must have separate connection
strings and credentials. The content project must not contain identity tables.
Vercel's [Neon Marketplace integration](https://vercel.com/marketplace/neon)
can create a Neon account from your Vercel account. Review the displayed plan
and select Free if available before creating each project.

1. In the identity project's SQL editor, run
   [001-accounts-and-courses.sql](db/001-accounts-and-courses.sql).
2. In the content project's SQL editor, run [002-content.sql](db/002-content.sql).
3. In the identity project's SQL editor, run
   [003-assignment-cards-and-participation.sql](db/003-assignment-cards-and-participation.sql).
4. Copy `.env.example` to `.env.local` in `web/` and set both Neon pooled
   connection strings, a random secret of at least 32 characters, and
   `BETTER_AUTH_URL=http://localhost:3000`.
5. From the repository root, run `npm ci`, then `npm run dev`.

The local JSON files in `web/.data/` are not migrated. Do not delete them until
you have checked whether they contain work you need.

## Vercel

In the existing Vercel project's Build and Deployment settings, set **Root
Directory** to `web` and **Framework Preset** to Next.js. Clear the former
Output Directory override of `public`. The current Neon integration supplies
`DATABASE_URL` for the identity project and `CONTENT_DATABASE_DATABASE_URL`
for the content project; the app also accepts `CONTENT_DATABASE_URL` if you
configure it manually. Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` as
server-side environment variables. Set `BETTER_AUTH_URL` to the exact HTTPS
site origin, with no trailing slash. Redeploy only after the two SQL scripts
have run. Verify first sign-in, wrong-password rejection, returning role,
course creation and joining, sign-out, and anonymous questions.

The current Vercel static deployment serves `public/`; changing the root
directory is a dashboard action. A code build alone does not change the live
site. Do not put the database URLs or auth secret in `NEXT_PUBLIC_` variables.

## Limits

Professor is self-selected and email is unverified. The content store contains
no account ID or author name, but service operators and hosting metadata can
still make timing-based inferences. The app server currently holds both
database credentials while processing votes; a server operator could compute
the identity behind a vote. Do not promise full anonymity or invite real
students on this architecture. Assignment-card publishing and basic participation
counts/sharing now work for practice accounts. Counter updates span two databases
without a distributed transaction; a failed second write could leave a count
out of sync. Version history, institutional enrollment checks, abuse handling,
and the full privacy review in CONTRIBUTING.md §6 are still required before
real student use. The instructor view shows only a student's shared level,
but operators may still infer activity from the identity-side counters.
