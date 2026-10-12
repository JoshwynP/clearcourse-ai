# ADR 0001: Application stack: framework, language, data access, migrations and UI layer (Q3)

- **Status:** Proposed
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §3, §6.1–§6.3, §8, §9, §11, §12, §14, §15 / Q3 (primary); Q4, Q9,
  Q15; PQ-12, PQ-13, PQ-18

Research: [docs/research/stack-and-hosting.md](../research/stack-and-hosting.md). Hosting is
proposed separately in [ADR 0002](0002-hosting-and-infrastructure.md); the privacy mechanism in
[ADR 0003](0003-privacy-mechanism.md).

## Context

Q3 ("Tech stack and hosting", §12) blocks all code (§13). §12 records advice from the source chat
(Next.js with Tailwind; a Node/TypeScript or FastAPI backend; PostgreSQL with separated schemas;
SSO; RBAC middleware) as *Advisory* only, with known issues that must not be adopted blindly. This
ADR covers the host-independent half of Q3: language, framework, data access, migrations,
validation and the UI layer. Hosting is ADR 0002.

The requirements that shape the choice:

- **Privacy (§6).** Five technically separated domains (§6.1). "Ordinary application queries must
  not be able to join the action content back to the student's identity", using "separated tables
  or schemas, restricted service roles, opaque identifiers, and narrowly scoped internal APIs"
  (§6.2). The proposed mechanism, A+ in ADR 0003, needs real PostgreSQL with one login role per
  domain, row-level security (RLS), and SECURITY DEFINER functions as the narrow API.
- **No co-occurrence (§3 last row, §6.2).** Identity and anonymous-content text never together in
  any log, error report, view or export. Framework logging, error handling, ORM loggers and
  third-party SDKs are therefore part of the privacy surface.
- **Testing (§9).** Negative tests through the "UI, API, exports, logs or predictable
  identifiers". The API surface must be explicit enough to test.
- **Design (§8).** Calm, credible, accessible design; the conformance target is Q15 (WCAG 2.2 AA
  proposed elsewhere). Institution-specific branding is configurable (§4).
- **Deliverables and process (§11, §14, §15).** Tests, deployment documentation, no committed
  secrets, type checks and lint pass.
- **Owner constraints** (from the research brief, not yet in CONTRIBUTING): a polished public
  prototype first; under $5/month; mainstream, well-documented tools for one builder working with
  Claude; no corner painted for §6 or §10–§11.

Facts that matter (checked 2026-10-11; details and URLs in the research file):

- Next.js 16.4 is current. Next.js recommends "a dedicated Data Access Layer" and warns that a
  Server Action "can still be called externally". An out-of-band security update is scheduled for
  2026-10-14 for "two Critical and one High" upstream vulnerabilities; CVE-2025-66478 (CVSS 10.0)
  shows the pace of critical advisories.
- On Vercel, Routing Middleware "runs globally before the cache" and deploys to all regions
  "regardless of your region settings". That a Next.js `proxy.ts` deploys this way is strongly
  implied, not stated.
- Drizzle declares RLS policies and roles but not GRANTs or SECURITY DEFINER functions; its logger
  receives query parameters. Prisma's only RLS example "is not intended to be used in production
  environments". Atlas puts policies, roles and functions behind a paid tier.
- shadcn/ui's `style` (which fixes the primitive base) "cannot be changed after initialization".
- Sentry's Next.js SDK collects IP and request bodies by default.

## Options considered

**Framework and language**

1. **Next.js 16 App Router, TypeScript, Node.js runtime only.** Pros: the most-used framework
   (20.6%, Stack Overflow 2026); official DAL and `server-only` guidance; first-class on Vercel and
   on any Node container; a stable Adapter API; the richest accessible React component ecosystem.
   Cons: the largest server surface (RSC protocol, hidden Server Action endpoints, caching);
   frequent critical advisories; fast change, so training data lags the docs.
2. **React Router v8 framework mode.** Pros: explicit request/response model, easiest to audit and
   negative-test; native on Vercel and Cloudflare. Cons: less mainstream; RSC unstable. Best if
   hosting were Cloudflare Workers, which ADR 0002 does not propose.
3. **SvelteKit 3.** Pros: small, low lock-in. Cons: released 2026-10-01; thinner accessible
   component ecosystem; high mismatch risk with training data.
4. **Django 6.x.** Pros: the best built-in multi-credential database story; mature migrations;
   allauth for OIDC. Cons: weaker for a polished interactive UI; a second language if React is
   added; no Workers option.
5. **A separate backend** (Express, NestJS or FastAPI, as the PDF suggests). Cons: a second
   deployable that no requirement needs; kept only as a candidate for an isolated service if a
   separated topology is chosen later.

**Data access**

1. **Drizzle ORM** (0.45.x stable; v1 in release candidate). Pros: typed tables; declares RLS and
   roles; any number of instances, so one pool and role per domain. Cons: GRANTs and SECURITY
   DEFINER need hand-written SQL; logger receives parameters; v1 changes the migration layout.
2. **Kysely.** Pros: full SQL and transaction control; Better Auth's built-in adapter. Cons: no
   schema DSL; pre-1.0.
3. **Prisma.** Cons: cannot express RLS, roles or grants; its RLS example is not for production. A
   deal-breaker for per-transaction RLS context.
4. **Raw `postgres.js` or `pg`.** Maximum control, least type safety; better as the driver under 1
   or 2.

**Migrations**

1. **drizzle-kit `generate` + hand-written `--custom` SQL** for every security object. Pros:
   security DDL reviewable as plain SQL, portable to any Postgres 15+. Cons: two kinds of migration
   file; whether `push` would drop custom-SQL policies is Unverified.
2. **Atlas.** Cons: policies, roles, permissions and functions need Atlas Pro (price Unverified).
3. **Prisma Migrate `--create-only`.** Workable, but every security object is manual.

**UI layer** (from the design research)

1. **shadcn/ui copy-in source + Tailwind CSS v4 on React Aria Components.** Pros: we own the
   component source (MIT), so it can be fully re-tokenised; React Aria publicly claims screen-reader
   testing across devices and ships translations and RTL. Cons: whether every needed component
   exists in the `aria-*` style is Unverified; the primitive base cannot change after init.
2. **The same on Base UI** (shadcn's default since July 2026). Pros: the default path, widest
   coverage. Cons: fewer published accessibility claims. Proposed fallback.
3. **Mantine.** A credible pre-styled alternative if the owner prefers not to own component source.
4. **Not proposed:** MUI (Material look conflicts with §8, inference), Radix Themes (fixed palette
   makes admin branding awkward), Headless UI (too few components), BrightspaceUI (affiliation and
   trademark risk; a second component model).

## Decision

**Proposed (not yet approved by the owner):** adopt "Stack R" for the application layer, as in
section 6.2 of the research file.

1. **Language:** TypeScript everywhere (UI, server code, migration tooling, tests).
2. **Framework:** **Next.js 16.x App Router, Node.js runtime only.** No Edge runtime. **No
   `proxy.ts`** (or deprecated `middleware.ts`): CSP comes from static headers and authorization
   lives in the data-access layer, so no application code runs outside the chosen region (PQ-18).
   Pin a release that includes the out-of-band security update scheduled for 2026-10-14.
3. **Code structure (privacy-domain DAL rules):**
   - DB clients and DB secrets only in `server/domains/<domain>/`, each module starting with
     `import 'server-only'`; a lint or dependency-cruiser rule blocks cross-domain imports.
   - Every privacy-relevant read and write is an explicit Route Handler that §9 tests can call.
     Server Actions are thin wrappers that re-check authentication and authorization.
   - Role, course and TA-permission checks inside every DAL function (§5), not in an interceptor.
   - DTO-only returns; no `"use cache"` in identity, participation or instructor-shared modules.
   - Domain-specific error classes that never interpolate identity or content.
4. **Data access:** **Drizzle ORM** (0.45.x stable unless v1 is stable when this ADR is
   accepted). **One Drizzle instance + pool + Postgres LOGIN role + secret per privacy domain**
   (and for the linkage role in ADR 0003). Per-request context with `set_config(…, true)` inside a
   transaction helper; policies written with `nullif(current_setting(…, true), '')`. Driver with
   `prepare: false` behind a transaction pooler. Drizzle's logger off in production. Under A+,
   anonymous and identity data are read only through SECURITY DEFINER functions with raw
   parameterised SQL, not ORM table reads. **Fallback: Kysely.** Prisma is not used.
5. **Migrations:** `drizzle-kit generate` for tables, plus **hand-written SQL** (`--custom`) for
   roles, GRANT/REVOKE, ENABLE + FORCE RLS, policies, SECURITY DEFINER functions (pinned
   `search_path`, `REVOKE … FROM PUBLIC` in the same transaction) and default privileges.
   Migrations run **only from CI** with the owner URL in a protected environment; runtime code
   never sees that URL; **never `drizzle-kit push`**. CI applies them to a fresh Postgres at the
   host's major version and runs catalogue assertions as part of the §9 negative tests.
6. **Validation:** **Zod 4** at every trust boundary (Route Handlers, actions, DB row → DTO), and
   one environment schema per domain so each domain parses only its own secret.
7. **Identifiers:** `gen_random_uuid()` (v4) for anonymous-content IDs; never serial or `uuidv7()`.
8. **UI layer:** **shadcn/ui copy-in source + Tailwind CSS v4 on React Aria Components**, with
   **Base UI** as the fallback primitive base. The choice is made after a short spike that checks
   every component the milestone-1 screens need exists in the `aria-*` style, because the base
   cannot change after init. Components are heavily customised through our own three-layer
   CSS-custom-property tokens (calm palette, radii, typography, density); no gradients or sparkle
   icons (§8 "avoid AI-generated aesthetics"); admin brand colours pass a server-side WCAG contrast
   guardrail (PQ-61); open-licence, self-hosted fonts; **no UW or D2L logos, fonts or
   BrightspaceUI components**; GOV.UK and USWDS used only as pattern and content sources. Checks:
   axe through Playwright in CI plus a manual keyboard, screen-reader, zoom and forced-colours
   checklist; passing axe is never presented as conformance (target Q15).
9. **Third-party error reporting and analytics:** none in the prototype unless the owner allows
   one under PQ-12, with data collection settings named in that answer.
10. **Auth library placement (input to Q4 and ADR 0004 only):** whatever library ADR 0004 chooses
    keeps its tables only in the identity domain.
11. **Patching:** Dependabot on; versions pinned; critical advisories patched within days; an
    "upgrade and redeploy" step in the deployment documentation (§11).

**Conditions before this ADR can be accepted:**

- The owner answers **PQ-18** (is `proxy.ts` acceptable?) and **PQ-12** (third-party error
  reporting or analytics). PQ-13 (platform-enforced secret isolation) is answered under ADR 0003;
  a "yes" changes the deployment shape (ADR 0002), not this stack.
- Spikes pass (research file section 6.7): spike 1 shows `set_config` + RLS behaving as expected
  through the pooler; spike 4 shows CI can apply migrations and pins the Postgres version; spike 7
  settles React Aria vs Base UI.
- Drizzle v1 status and the exact Next.js release are re-checked and recorded here at acceptance.

Approved by: (pending)

## Consequences

**Enables.**

- One TypeScript codebase that runs on Vercel or as a plain Node container (`output: standalone`),
  so ADR 0002's fallback is a deploy, not a rewrite, and an institution-hosted production remains
  possible (§10–§11).
- §6.2's restricted service roles become database facts: each domain's code holds only its own
  role, and CI catalogue assertions prove that no runtime role owns tables, bypasses RLS or reaches
  another domain's base tables.
- §9 API negative tests run against explicit Route Handlers rather than hidden action endpoints.
- §8 polish with owned component source, re-tokenised so it does not look templated.

**Constrains.**

- No `proxy.ts`, no Edge runtime and no `"use cache"` in per-user domains; some Next.js
  conveniences are unavailable.
- Security DDL is hand-written SQL that must be reviewed like code; Drizzle's schema covers tables
  only. Never `push`.
- Under A+, ORM table reads are not used for anonymous or identity data; those go through definer
  functions.
- Inside one deployment, every module can still read every environment variable. Per-domain secret
  isolation is convention plus CI, not platform enforcement, unless the owner answers PQ-13 "yes"
  (then separate deployments per ADR 0002).
- Fast-moving dependencies (Next.js, Drizzle v1, Zod 4, Tailwind v4, the auth library) need
  frequent patching; every session reads the versioned docs instead of relying on memory.

**Privacy implications (§6).** The stack itself creates leak channels that the rules above close:
framework error logs (no identity or content in messages), the Drizzle logger (off), Sentry-style
SDKs (none unless PQ-12), caching (banned in per-user modules), predictable IDs (UUIDv4 only),
whole-row props (DTOs only) and global middleware (no `proxy.ts`). Each of these needs a negative
test or a CI check (§9).

**Follow-up work.**

- After acceptance: record the pinned versions here; scaffold the repository (M0) and update
  CLAUDE.md "Stack" and "Commands", the README status line and CONTRIBUTING §12 and §16.
- Write the lint and dependency-cruiser boundary rules, the transaction helper and the catalogue
  assertion suite before any domain code.
- The design-system research file and the plan carry the UI tokens and the accessibility
  checklist.
