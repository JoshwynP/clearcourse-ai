# ADR 0008: Stand-in sign-in and course codes

- **Status:** Accepted
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §5, §12 / Q4, Q5, Q3

## Context

The owner chose a practice sign-in, professor-created courses shared by a code, and a role picked before sign-in. Administration is not part of this pilot. Production hosting was left for this decision. University of Waterloo SSO, LTI, and CSV import are not available for this slice. ADR 0007 keeps the Next.js app local and leaves the static preview in `public/` as the only deployable site.

## Options considered

1. **Put accounts on the public static preview.** Rejected. That host serves `public/` only, and a static site cannot keep a private session.
2. **Choose a production host and database now.** Rejected. PostgreSQL is still not installed, and the access library remains an open spike under Q3.
3. **Keep a practice sign-in on the local Next.js app.** Chosen.

## Decision

Approved by the owner on 2026-10-12.

1. Sign-in is a local stand-in. The person chooses Professor or Student, then enters a name. The same name and role returns to the same courses. This is not University of Waterloo sign-in.
2. Professor is stored as the Instructor role. There is no teaching-assistant role and no administrator role in this pilot.
3. A professor creates a course and receives a join code. A student opens the course by entering that code. The join code is separate from the course code.
4. The signed-in app stays on the developer machine (`npm run dev`). Do not deploy it over the static preview, and do not change `vercel.json`.
5. Until PostgreSQL is in use, identity records live in a gitignored file on that machine. Production hosting, the database access library, and the UI component library stay open under Q3.

## Consequences

Someone with the computer can read the local files. That limit is recorded in the threat model. A later production store must use separate database roles before real students use the app. Impersonation (Q7) is still unanswered and is not implemented.
