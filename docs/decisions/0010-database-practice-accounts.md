# ADR 0010: Hosted practice accounts and separate content database

- **Status:** Accepted for a practice release
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §§5, 6, 12–13 / Q3

## Context

The owner asked to replace the local name-only sign-in with persistent
email/password accounts, to keep choosing Professor or Student on the first
visit, and to make the Next.js app the website now shown from Vercel.
Waterloo SSO and Duo are out of scope. Email verification and a separate
sign-up page are also out of scope for this practice release.

## Decision

1. First sign-in with a new email creates an account. Returning sign-ins
   require the stored password. Better Auth hashes passwords with its scrypt
   default and manages revocable database sessions. The application stores
   the first selected role in a profile row and does not change it on login.
2. Use two separate managed Neon PostgreSQL projects: identity/course records
   and anonymous board content. Runtime credentials are distinct. The content
   store contains course IDs, question and reply text, role labels, and opaque
   vote tokens, but no account ID, email, name, or session ID.
3. The Next.js app in `web/` replaces the static `public/` deployment after
   Vercel's Root Directory is changed to `web` and both databases are
   configured. The static preview remains in the repository as reference.
4. This is a practice release. Self-selected Professor accounts and unverified
   email addresses are not authority for real courses.

## Consequences

The site can persist accounts, sessions, courses, cards, and discussions.
The two projects raise operating cost and setup work, but prevent an ordinary
content connection from reading account tables. The local file stand-in in
ADR 0008 is superseded for the hosted app. The earlier threat model does not
serve as a production privacy review. The app server still holds both
connection strings and can compute a vote's owner using the identity store's
vote key. A separate narrowly scoped vote service is needed before real
anonymous participation.
