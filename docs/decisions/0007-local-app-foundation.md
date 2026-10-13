# ADR 0007: Local application foundation

- **Status:** Accepted
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §8, §12 / Q3

## Context

Q3 blocked real application code. ADR 0001 proposes a full stack, including Drizzle, hand-written security SQL, and a shadcn/ui primitive base that cannot be changed after initialization. ADR 0002 proposes hosting, gated on unanswered commercial-use and institutional-approval questions. The next build slice only needs a local course list and one read-only sample card. The fictional preview in `public/` must keep its own static deploy (ADR 0006).

Checked on 2026-10-12 against current npm and the Next.js installation docs: Next.js `16.4.0` is the `latest` release, React `19.3.0` is the version `create-next-app@16.4.0` installs, and the App Router requires Node.js 20.9 or newer. The official starter now defaults to Tailwind CSS and Cache Components. ADR 0001 already recorded a Next.js security update scheduled for 2026-10-14; that date is still ahead of this decision.

## Options considered

1. **Accept ADR 0001 and ADR 0002 in full now.** Rejected for this slice. The database spikes have not been run, the component-base choice locks in at init, and hosting still depends on unanswered owner questions.
2. **Keep waiting to scaffold.** Rejected. The owner asked to proceed with the design that is sound, and the course-list slice does not need a database or a host.
3. **Accept a local Next.js foundation and leave the rest proposed.** Chosen.

## Decision

Approved by the owner on 2026-10-12.

1. The local app uses TypeScript and Next.js 16.4.0 with the App Router and the Node.js runtime only.
2. The app lives in `web/`. `public/` remains the fictional preview.
3. Do not add `proxy.ts`, `middleware.ts`, Cache Components, or a third-party error or analytics SDK.
4. Use plain CSS custom properties for these screens. Do not initialize Tailwind or a component library yet.
5. PostgreSQL is the intended database when persistence starts. Do not install it, Drizzle, or Kysely in this slice.
6. ADR 0002 stays Proposed. Do not deploy this app to a host yet.
7. Upgrade Next.js when the 2026-10-14 security release is published, then record the new pin here.

## Consequences

Enables the course list and read-only card without choosing hosting or a data-access library. Constrains later work: authorization stays out of middleware, and the UI library still needs a spike before initialization. No identity or anonymous content is stored, so §6 separation is not implemented here and must not be implied.
