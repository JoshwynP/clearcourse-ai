# Research branch S0: Application framework and data-access layer (Q3)

> **Status:** DRAFT v2, 2026-10-11. Research and planning only. **Nothing here is a requirement.**
> Requirements live in `P:/code/clearcourse-ai/CONTRIBUTING.md` and are cited as §N.N. Every
> recommendation is a **PROPOSAL** for the owner to approve through an ADR (CONTRIBUTING §1, §12,
> §14). If this note conflicts with CONTRIBUTING.md, CONTRIBUTING.md wins.
>
> **Scope:** the framework + data-access + validation + migration half of Q3, independent of host.
> Hosting, DB vendor, email and cost tables belong to other branches. As the brief asked, this note
> concentrates on checklist items 6–8 and 10. Items 2–5 and 9 (cost, free-tier behaviour, ToS,
> regions, ops) are covered only where the framework or data-layer choice itself changes the answer.
> **No cost tables are given here.**
>
> **Evidence rule:** every fact has an official URL and "(checked 2026-10-11)" (collected in §7).
> Anything I could not verify on a current official page is marked **Unverified**. Conclusions I drew
> from verified facts are marked **(inference)**.
>
> **Prototype-scale ASSUMPTION (not a requirement; the owner gave no user counts):** up to ~5 pilot
> courses, ~500 registered users, ~100 daily active users, bursts of ~100 concurrent users in class,
> ~30k page views/month, DB under 250 MB. A burst from one 1,000-student course is discussed in §3.6.

---

## 0. Summary (PROPOSAL, for owner approval via ADR)

- **Framework:** **Next.js 16.x App Router, Node.js runtime only**, under a strict
  "privacy-domain Data Access Layer" rule set (§5.1). **Close alternative: React Router v8
  framework mode.** Pick it if the hosting branch chooses Cloudflare Workers, or if the owner
  prefers an explicit request/response model that is simpler to audit and to negative-test (§9).
  Django 6.x is a credible third choice. SvelteKit 3 is not recommended *right now* because it shipped
  10 days ago.
- **Data access:** **Drizzle ORM** for table definitions and type-safe queries. Use **one Drizzle
  instance per privacy domain, each on its own pool and its own Postgres LOGIN role and secret**.
  The driver depends on the host: postgres.js or node-postgres via a pooler or Hyperdrive, or the
  Neon serverless driver on Neon. **Alternative: Kysely** (SQL-first; also Better Auth's built-in
  adapter). **Prisma is not recommended** for design A.
- **Migrations:** `drizzle-kit generate` for tables, plus **hand-written SQL custom migrations for
  every security object**: roles, GRANT/REVOKE, ENABLE + FORCE RLS, policies, SECURITY DEFINER
  functions and default privileges. Security DDL then stays reviewable in plain SQL and portable to
  any Postgres 15+. CI applies migrations to a fresh Postgres 18 container and runs **catalogue-level
  privacy assertions** (pgTAP or SQL-in-Vitest) as part of the §9 negative tests.
- **Validation:** **Zod 4** (4.6 stable) at every trust boundary: route handlers and actions,
  environment variables (a separate env schema per domain), and DB row → DTO.
- **Auth library (input to Q4, not a decision):** Better Auth. The Auth.js maintainers now recommend
  it for new projects. Its tables live only in the identity domain.
- **Deal-breakers found:** Prisma's only documented RLS pattern is "not intended to be used in
  production". Sentry's default data collection (IP + incoming request bodies) would breach §6.2/§3
  if left on. Atlas puts policies, roles, grants and functions behind its paid Pro tier.
  Django and SvelteKit have no first-class Cloudflare Workers story for this app (Django: Unverified).

---

## 1. Question(s) and what they block

### 1.1 The question

- **Q3 "Tech stack and hosting (§12)" blocks all code** (CONTRIBUTING §13). This branch answers the
  framework / data-access / validation / migration sub-question only.
- The §12 advisory (Next.js + Tailwind; Node/TS or FastAPI backend; PostgreSQL with Identity /
  Content / Participation / Audit schemas; SSO; RBAC middleware) is **advisory only**. This note
  tests it. It confirms Next.js + PostgreSQL as reasonable choices. It challenges the advisory's
  "RBAC middleware on every API request" framing: in Next.js 16, request interception moved to
  `proxy.ts`, and the Next.js docs say authorization must be re-checked inside every Server Action
  and DAL call, not only in an interceptor (§3.1).

### 1.2 Open questions this choice touches (none are closed here)

| Q | Why the framework/data layer matters | What this branch does |
|---|---|---|
| Q9 (unjoinability mechanism) | The data layer must be able to implement design **A** (one Postgres: roles, schemas, RLS, SECURITY DEFINER), **B** (physically separate DBs/services with separate secrets) or **C** (client-side crypto). | Rates support for A/B/C per option (§4.4). Does **not** pick a mechanism. |
| Q4 (prototype auth) | The auth library must sit only in the identity domain and support OIDC/SAML later (§10 "sign in securely"). | Surveys auth libraries. Does not pick an IdP. |
| Q5 (provisioning) | LTI 1.3 library availability differs by language. | **Not researched** → NQ-S0-5. |
| Q8 (threat model) | ORM logging, error reporting and ID generation are threat-model inputs. | Lists framework-level leakage channels (§4.3). |
| Q14 (audit) | "Immutable" audit (§6.4, §7.17) needs an INSERT-only DB role. | Shows how migrations express it (§4.2). |
| Q15 (a11y target) | Accessible component ecosystems differ by framework. | Compares them (§3). Does not pick a WCAG level. |
| Q16 (aggregation N) | Thresholds should be enforced in SQL views/functions, not only in the UI. | Notes the pattern only. |
| Q19 (i18n) | React Aria ships translations. | Notes it only. |

### 1.3 Requirements relied on

§3 (last row: no identity + anonymous text in the same log/error report/view/export/dashboard);
§5 (strict course-based authorization); §6.1 (five domains "technically separated"); §6.2 ("ordinary
application queries must not be able to join the action content back to the student's identity";
"separated tables or schemas, restricted service roles, opaque identifiers, and narrowly scoped
internal APIs"); §6.3 (de-duplicate upvotes and credit counters without a usable mapping; mechanism =
Q9); §6.4 (default nobody can deanonymize; immutable audit logging if ever enabled); §7.7 (rate
limiting; merges "without double-counting a student"); §7.8 (presentation mode excludes private
data); §7.12 (survey "technically separated"; "No unnecessary metadata"); §7.17 (audit logging
required); §8 (accessibility required); §9 (negative tests via "UI, API, exports, logs or
predictable identifiers"); §11 (tests and deployment docs are deliverables); §14 (no committed
secrets); §15 (tests, type checks, lint pass).

---

## 2. Options considered

### 2.1 Frameworks

| Option | Current version (official, checked 2026-10-11) | Server model | Mainstream signal (SO Survey 2026, all respondents, n=10,281) |
|---|---|---|---|
| **Next.js App Router** | 16.4, released 2026-10-06; major 16 released 2025-10-21 | React Server Components; Server Actions (reachable by direct POST); Route Handlers; `proxy.ts` on Node.js runtime | Next.js 20.6% |
| **React Router framework mode** | Docs "latest (8.4.0)"; v8 announced 2026-06-17 | Route modules with `loader`/`action`; SSR/SPA/static; RSC "Unstable" | Remix 1.7%; React Router not listed. The React ecosystem (React 41.5%) applies. |
| **SvelteKit** | SvelteKit 3, announced 2026-10-01 | `load` + form actions; remote functions "Not quite" stable | SvelteKit 5.6% (Svelte 7.8%) |
| **Django** (batteries-included pick) | 6.1.2 latest; 5.2 LTS, extended support to April 2028; 6.2 LTS planned April 2027 | WSGI/ASGI views + templates, or headless API | Django 11.3% |

**Why Django and not Rails or Laravel:** (1) Django's multi-database support gives each alias its own
`USER`/`PASSWORD`, with routers (`db_for_read`, `db_for_write`, `allow_relation`, `allow_migrate`)
and per-database `migrate --database`. That maps directly onto "restricted service roles" (§6.2).
(2) Adoption is higher (Django 11.3% vs Laravel 7.6% vs Ruby on Rails 5.7%, SO 2026), which matters
for a solo builder working with Claude. (3) django-allauth (65.19.7, 2026-10-01) covers OIDC as both
client and provider, lists SAML, and has MFA and a headless mode. (4) Vercel now deploys Django as a
single Fluid-compute function, so Django is no longer limited to always-on containers. Rails and
Laravel also have multi-DB features, but I did not verify their current docs (**Unverified**), so they
are not ranked.

**Not evaluated in depth:** Remix 3 (RC on 2026-08-31, not stable; whether it is React-based is
**Unverified** because the RC post returned 404); TanStack Start (not in brief); Express, NestJS or
FastAPI as a separate backend (adds a second app for the UI). These stay candidates for a small
**isolated internal service** under design B.

### 2.2 Data-access layers (TypeScript)

| Option | Version (checked 2026-10-11) | Declares RLS policies | Declares roles | Declares GRANTs | Declares SECURITY DEFINER fns | Other notes |
|---|---|---|---|---|---|---|
| **Drizzle ORM + drizzle-kit** | 0.45.4 "Latest" (08 Oct); v1.0.0-rc.4 pre-release (27 Jun); docs target v1 (`npm i drizzle-orm@rc`) | **Yes**: `pgPolicy` (as/for/to/using/withCheck), `withRLS`, `.link()` | **Yes**: `pgRole` with few options ("more options… in a future release"); opt-in `entities.roles` | **Not mentioned** → custom SQL | **Not mentioned** → custom SQL | `generate --custom` for SQL-only custom migrations. v1 restructures the migrations folder (`journal.json` removed; `drizzle-kit up`). |
| **Prisma ORM** | Prisma 8 on `prisma@latest` since 2026-08-28 | **No** (not in schema docs or changelog) | No | No | No | Multi-schema works on PostgreSQL. RLS only via a client-extension example "not intended to be used in production". Hand SQL via `migrate dev --create-only`. |
| **Kysely** | 0.29.6 "Latest" (16 Sep); 0.30 beta; pre-1.0 | n/a (no schema DSL) | n/a | n/a | n/a | `Migrator` with a DB-level lock. Migrations hand-written. `kysely-ctl` "not part of the core". Better Auth's built-in adapter. |
| **postgres.js** (raw SQL) | v3.4.9 "Latest" | n/a | n/a | n/a | n/a | Single maintainer; 257 open issues. Named by Hyperdrive. Needs `prepare: false` on Supabase transaction mode. |
| **node-postgres `pg`** (raw SQL) | **Unverified** (repo publishes no GitHub Releases) | n/a | n/a | n/a | n/a | Named by Hyperdrive as supported |

### 2.3 Migration tools

| Tool | What it can version-control | Notes |
|---|---|---|
| drizzle-kit generate + `--custom` | Tables, schemas, policies, roles (opt-in) + any SQL file in the same ordered folder | Recommended (§5) |
| Prisma Migrate `--create-only` | Tables, multi-schema; everything else hand-edited | Workable, but all security objects are manual |
| Kysely `Migrator` / kysely-ctl | Whatever you write | No diffing; locking built in |
| **Atlas** | RLS *enable* is free. **Policies, roles/users, permissions and functions are "available only to Atlas Pro users".** | Strong tool, but the privacy-critical features need a paid tier (price **Unverified**) |
| dbmate / plain SQL | Anything | Not researched (**Unverified**) |
| Django migrations + `RunSQL` | Models + arbitrary SQL with `reverse_sql`; `hints` reach the routers' `allow_migrate()` | Mature |

---

## 3. Evidence per option (checklist items)

Items 2–5 and 9 depend mostly on the host. Here they cover only framework-driven effects.

### 3.1 Next.js 16 (App Router)

**1. Architecture sketch (PROPOSAL):**

```
Browser ──HTTPS──> Next.js (Node.js runtime only; no Edge)
                    ├─ proxy.ts            → coarse checks only (session cookie present, CSP nonce); never authorization
                    ├─ app/** pages        → Server Components call DAL "DTO" functions only
                    ├─ app/api/** routes   → explicit HTTP API for every privacy-relevant read/mutation (testable)
                    ├─ server actions      → thin wrappers that call the same DAL functions
                    └─ server/domains/     ← the only code allowed to import DB clients or read DB secrets
                         ├─ identity/      (pool A, role app_identity, secret IDENTITY_DB_URL)
                         ├─ content/       (pool B, role app_content,  secret CONTENT_DB_URL)
                         ├─ participation/ (pool C, role app_particip, secret PARTICIPATION_DB_URL)  [Q9 decides shape]
                         ├─ shared/        (pool D, role app_shared — instructor-visible shared results, §6.1 #4)
                         ├─ survey/        (pool E, role app_survey — exit survey, §7.12)
                         └─ audit/         (role app_audit_writer: INSERT only)
```

Each domain module starts with `import 'server-only'`. Next.js: "causing a build error if the module is
imported in the client environment". Next.js also says "only the Data Access Layer should access
`process.env`". A lint rule (e.g. `no-restricted-imports`) can stop `content/` from importing
`identity/`. That is **convention plus CI enforcement, not isolation**: every module in one Node
process can read every env var **(inference)**. Real secret separation per code path needs separate
deployments (design B; see §4.4).

**6. Privacy-architecture support:**
- *Multiple pools / credentials:* framework-neutral. Any number of Drizzle/pg instances can be
  created in server modules. Supported.
- *Server Actions are a hidden API surface.* Next.js: "even if a Server Action … is not imported
  elsewhere in your code, it can still be called externally". Treat them "as reachable via direct
  POST requests and verify authentication and authorization inside each one". Action IDs are
  encrypted and "periodically recalculated", which makes **API-level negative tests (§9) harder to
  write against actions** (inference). Proposal: put every privacy-relevant operation behind
  explicit Route Handlers that tests can call directly. Actions stay thin wrappers.
- *Return values and props leak:* the docs warn that passing whole DB rows to Client Components
  "exposes all the fields". Taint APIs are `experimental_`. Proposal: DTO-only returns, checked by
  types.
- *Errors:* in production, Server Component errors reach the client as "a generic message with an
  identifier" (`error.digest`), and the full error is in server logs. The client is safe, but **server
  logs then hold whatever the error message contained**. That puts §6.2 at risk if an error message
  includes both a user id and content text. Proposal: domain-specific error classes with no
  interpolated identity or content.
- *Caching:* Next.js 16.4 enables Cache Components by default in `create-next-app`. Caching is
  opt-in through `"use cache"`. Proposal: ban `"use cache"` in identity, participation and
  instructor-shared DAL modules, so per-user data can never be served to another user.
- *Security track record (ops impact):* CVE-2025-66478 (Critical, CVSS 10.0, RCE in the RSC protocol,
  2025-12-03); CVE-2025-55184 / 55183 (2025-12-11); an out-of-band update is scheduled for
  **2026-10-14** for "two Critical and one High" upstream vulnerabilities. Patching fast is
  mandatory, so CI and Dependabot must be ready.

**7. DX:** most mainstream option (20.6%). The docs ship `llms.txt` and a DevTools MCP. Next.js
officially lists testing guides for Vitest, Jest, Playwright and Cypress, and recommends "End-to-End
Testing over Unit Testing for `async` components". The best accessible component ecosystems are
React ones: React Aria (Adobe; "extensively tested using many popular screen readers"; follows the
W3C ARIA APG; 30+ languages) and shadcn/ui (copy-in code). Vercel gives preview URLs for each pull
request. Risk: Next.js changes quickly (16.0 → 16.4 in a year; async `params`/`cookies()`;
`middleware.ts` deprecated). Claude's training data may lag, so read the versioned docs.

**8. Lock-in:** since 16.2 there is a stable Adapter API. "Vercel's adapter uses this same public
contract". Adapters for Netlify, Cloudflare and AWS via OpenNext were "in active development, with
expected releases later this year" (2026). Many apps run as "a single Node.js server running `next
start`", which can be self-hosted or institution-hosted **(inference)**. Cloudflare today goes through
`@opennextjs/cloudflare` with the Node.js runtime. It notes "Node Middleware… introduced in 15.2 are
not yet supported", and Next 16's `proxy.ts` runs on Node.js, so **proxy.ts support on OpenNext is
Unverified** (NQ-S0-3). Worker size limit: 3 MiB Free / 10 MiB Paid.

**2–5, 9 (framework-driven only):** Next.js fits serverless Node free tiers. It is first-class on
Vercel (all features in Vercel's matrix). It needs Node 20.9+. Regions and ToS depend on the host.

**10. Verdict:** *Strengths:* most mainstream; official DAL guidance; `server-only`; richest
accessible-component ecosystem; best on Vercel; credible portability via the Adapter API.
*Weaknesses:* biggest and most complex server surface (RSC protocol, hidden action endpoints,
caching); unit-testing async Server Components is not supported; the record of critical CVEs means
constant patching. *Deal-breakers:* none, if the §5.1 rules are adopted. *Choose when* hosting is
Vercel or a Node container and polish plus ecosystem matter most (the owner's §8 "polished and
credible" milestone).

### 3.2 React Router v8 (framework mode)

**1. Sketch:** same domain layout as §3.1, but under `app/.server/domains/*`. Route modules export
`loader`/`action(request)`. Optional custom server entry (e.g. Hono) to build per-request context.

**6. Privacy:** `.server` files or directories: "The build will fail if any code in a `.server` file
or `.server` directory accidentally ends up in the client module graph". Each loader/action is a plain
function of a `Request`, so **every data endpoint is an explicit URL**. Loaders also answer `.data`
requests, per the v8 `v8_passThroughRequests` notes. That makes §9 "API" negative tests
straightforward (inference). Middleware is standard in v8 (the `v8_middleware` flag becomes the
behaviour). RSC is "Unstable" and not needed. Whether React Router's non-RSC mode was exposed to the
Dec-2025 RSC CVEs is **Unverified**. The same env-var caveat as Next.js applies (one process, all
secrets).

**7. DX:** loaders and actions are easy to unit-test (call them with a `Request`) and to
integration-test against real Postgres **(inference)**. Uses the full React ecosystem (React Aria,
shadcn/ui). Much less mainstream as a *framework* (Remix 1.7%), so Claude has fewer examples. v8
requires Node 22.22+, React 19.2.7+, Vite 7+. It removed `react-router-dom`. The upgrade from v7 is
via future flags ("simple and boring").

**8. Lock-in:** lowest of the JS options. Vercel preset (`@vercel/react-router`, SSR on Vercel
Functions, Fluid compute). Cloudflare via `@cloudflare/vite-plugin` (v8 replaced the old dev proxy).
Node via `@react-router/serve`. Containers and institution hosting are easy **(inference)**.

**10. Verdict:** *Strengths:* explicit request/response model that is easiest to audit and test for
§9; native Cloudflare and Vercel support; small surface. *Weaknesses:* less mainstream; fewer
batteries; RSC experimental. *Choose when* hosting is Cloudflare Workers, or auditability ranks above
ecosystem size.

### 3.3 SvelteKit 3

**1/6.** Server-only modules: importing them from browser code makes "SvelteKit … error". It covers
`.server` files, `server` directories (now allowed outside `src/lib`) and `$app/env/private`.
**Caveat:** the check is disabled when `process.env.TEST === 'true'`, so tests cannot prove it holds.
Official adapters: node, static, vercel, cloudflare, netlify, bun.

**7.** SvelteKit 3 was released **2026-10-01** with breaking changes ("configuration now lives in
`vite.config.ts`"; "`$lib` alias is now `#lib`"). Remote functions are "Not quite" stable. Async Svelte
"requires an `experimental` flag". The accessible-component ecosystem is thinner: Bits UI is headless
and claims WAI-ARIA, keyboard and screen-reader support, and is credited to one primary maintainer.
Adoption is 5.6%. Claude's knowledge is very likely pre-v3 **(inference)**, so mismatch risk is high.

**8.** Low lock-in (official adapters).

**10. Verdict:** good technology, wrong moment. *Choose* only if the owner strongly prefers Svelte;
otherwise revisit when v3 has matured. No deal-breaker.

### 3.4 Django 6.x

**1. Sketch:** a Django project with `DATABASES` aliases `identity`, `content`, `participation`,
`shared`, `survey`, `audit`. Each alias has its own `USER`/`PASSWORD` (one Postgres or separate DBs).
A router uses `db_for_read/write` by app label. `allow_migrate` limits each app's tables to its alias.
Templates render the UI, with small JS islands for live presentation mode.

**6. Privacy (strongest native story):** per-alias credentials are built in. "Django doesn't
currently provide any support for foreign key or many-to-many relationships spanning multiple
databases". For design B that **helps**: the ORM refuses cross-domain joins (inference). Postgres
pooling: psycopg pool, "a separate pool for each database alias in each process". Transaction-mode
poolers need `DISABLE_SERVER_SIDE_CURSORS`. `RunSQL` puts roles, grants, policies and SECURITY DEFINER
functions in migrations, with `reverse_sql`. **Hazard:** `django.contrib.admin` is an "administrator
dashboard". §3 and §6.2 forbid identity + anonymous text together there, and admin "must be with
auth". Proposal: do not ship `contrib.admin` in production, or limit it to configuration models.
Whether the DEBUG-mode SQL logger records parameters is **Unverified**. Assume it does and keep DEBUG
off.

**7. DX:** excellent test runner and mature migrations. Claude knows Django well. Supports PostgreSQL
15+. **UI is the weak side:** there is no first-party accessible component library. Rich widgets
(dialogs, comboboxes, live voting) need htmx/Alpine (**Unverified**, not researched) or a separate
React app, which means two stacks.

**8. Lock-in:** most portable (WSGI/ASGI; any container; institution hosting likely; **Unverified**
for UW). Vercel: "it becomes a single Vercel Function", Fluid compute, Channels WebSockets, 500 MB
bundle limit. Cloudflare Python Workers do not mention Django, so treat Django as **unsupported on
Workers (Unverified)**.

**9.** Choose LTS 5.2 (to April 2028) or 6.x (shorter windows; 6.2 LTS planned April 2027).

**10. Verdict:** *Strengths:* best built-in multi-credential DB story, tests and auth (allauth: OIDC
and SAML). *Weaknesses:* weaker polished interactive UI; dual-stack if React is added; no Workers
option. *Choose when* the owner values backend robustness over UI polish, and hosting is Vercel or a
container.

### 3.5 Data-access layers (items 6–8, 10)

**Drizzle.** *6:* declares RLS policies and roles (opt-in, limited role options). Does **not** declare
GRANTs or SECURITY DEFINER functions (not mentioned in the docs), so those go in `--custom` SQL. Any
number of instances with different pools and credentials **(inference from the API)**. Has Neon and
Supabase helpers, but those tie policies to vendor roles and functions (`auth.user_id()`, `anon`,
`authenticated`). Proposal: **avoid them** to stay portable and use our own GUCs. A custom logger
receives `logQuery(query, params)`, so params (content text and ids) would reach logs. Keep the logger
off in production, or use one that drops params. *7:* the most popular TS ORM choice with Claude
(**Unverified**, no adoption data fetched); good docs; an MCP server in v1 rc.4. *8:* plain SQL
migrations in the repo, portable. *Version risk:* the docs target v1 (RC), while stable is 0.45.x;
v1 changes the migration folder layout. *10:* recommended, with security DDL in hand-written SQL.

**Prisma.** *6:* the schema cannot express RLS, roles or grants. The official RLS example wraps every
query in a new batch transaction, so "explicitly running transactions … may not work as intended". It
"is not intended to be used in production environments". Running multiple clients with different
URLs is possible via driver adapters **(inference)**. PgBouncer: `pgbouncer=true` only for PgBouncer
older than 1.21. Migrations need a direct URL. *10:* **deal-breaker for design A with per-transaction
RLS context**; acceptable only for a grants-only design. Not recommended.

**Kysely.** *6:* full control of SQL and transactions. Hand-written migrations with a DB-level lock.
*7:* strong typing; pre-1.0 (0.29.6). Better Auth's `migrate` CLI is "only supported for the built-in
Kysely adapter". *10:* the best **alternative** if the owner wants zero ORM magic.

**Raw postgres.js / pg.** Maximum control, minimum type safety. Best used as Drizzle's or Kysely's
driver rather than alone.

### 3.6 Load note, including a 1,000-student burst (inference, not measured)

The framework is not the bottleneck at this scale. **Connection count is**, once per-domain pools are
used: about (number of domains touched per request) × (concurrent serverless instances). Supabase's
guidance for serverless is "Set the pool to 1 connection" and to use the transaction-mode pooler.
Proposal: lazily created per-domain pools, `max: 1` per instance in serverless, all through a
transaction-mode pooler (or Hyperdrive), and touch only the domains a request needs. A vote from a
1,000-student class (say 1,000 votes in 60 s ≈ 17 writes/s) is small for Postgres. The risk is pooler
or connection limits on free tiers, which the hosting branch must check. Presentation-mode refresh
should be cached aggregate reads (no identity), polled or pushed.

---

## 4. Privacy implications (§6)

### 4.1 Per-request context behind poolers (verified behaviour)

| Mechanism | Fact (source in §7) | Consequence for ClearCourse |
|---|---|---|
| Postgres `SET LOCAL` / `set_config(name, v, true)` | Lasts "only till the end of the current transaction"; outside a transaction it "emits a warning and otherwise has no effect"; `is_local=true` "will only apply during the current transaction" | Always set context **inside** an explicit transaction, via one helper |
| `current_setting(name, true)` | Returns NULL if the setting does not exist | Policies can fail closed. **Unverified gotcha:** once a placeholder GUC has been set in a session, later reads may return `''` rather than NULL. Write policies as `nullif(current_setting('app.x', true), '')` and **integration-test this behind the pooler** |
| PgBouncer transaction mode | `SET/RESET`: "Never"; `PREPARE`: "Never"; protocol prepared statements need `max_prepared_statements` > 0; latest 1.26.0 | Session `SET` must be banned (CI grep). `SET LOCAL` inside a transaction is safe because the transaction keeps its server connection **(inference)** |
| Supabase Supavisor transaction mode (6543) | "does not support prepared statements"; session state (`set`, temp tables) doesn't carry across transactions; custom-role username `[ROLE].[PROJECT-REF]` | Custom per-domain roles **are** usable; driver `prepare: false` |
| Neon serverless driver | HTTP `transaction()` is non-interactive (array of queries); Neon's own RLS example puts `set_config('request.jwt.claims', …, true)` first; the role must not have `BYPASSRLS`; interactive transactions need WebSocket `Pool`; on edge runtimes pools must be opened and closed per request | Design A works over HTTP if each unit of work is one non-interactive batch. Otherwise use `Pool` |
| Cloudflare Hyperdrive | Transaction mode; `SET` works inside BEGIN/COMMIT; connection is `RESET` on return; named prepared statements supported for pg and postgres.js | Compatible with the helper pattern |

Illustrative helper (pseudocode, not a code file):

```ts
// server/domains/content/tx.ts — import 'server-only'
export function withContentTx(ctx: { courseId: string }, fn) {
  return contentDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.course_id', ${ctx.courseId}, true)`); // = SET LOCAL
    return fn(tx);
  });
}
// policy (in hand-written SQL migration):
// CREATE POLICY course_scope ON content.question FOR SELECT TO app_content
//   USING (course_id = nullif(current_setting('app.course_id', true), '')::uuid);
```

### 4.2 Roles, grants, RLS and SECURITY DEFINER in migrations (proposal, design A)

- **Separate LOGIN roles per domain, each with its own secret.** Do not use one login role that does
  `SET ROLE` per request: a role that can switch can reach any domain **(inference)**. Drizzle's
  `pgRole` supports `inherit`. No membership between runtime roles.
- **Runtime roles never own tables.** Owners bypass RLS unless `FORCE ROW LEVEL SECURITY`. Superusers
  and `BYPASSRLS` roles "always bypass". So: a separate migration-owner role, plus `ENABLE` **and**
  `FORCE` RLS on every domain table.
- **Grants are the hard boundary between domains; RLS is defence-in-depth for course scoping (§5).**
  `app_content` has no privileges on `identity.*`. App-set GUCs protect against buggy queries, not
  against compromised app code **(inference)**.
- **SECURITY DEFINER = the "narrowly scoped internal API" (§6.2)** for cross-domain bridges, such as
  crediting a counter. The Postgres docs require `SET search_path = <trusted>, pg_temp`. Functions
  get `EXECUTE` to `PUBLIC` by default, so `REVOKE ALL … FROM PUBLIC` and grant selectively "within a
  single transaction". What the bridge receives and returns is Q9.
- **Audit (§6.4, §7.17):** an `app_audit_writer` role with INSERT only, no UPDATE/DELETE/TRUNCATE.
  "Immutable" beyond grants (e.g. hash chaining) is Q14.
- **Covert channels:** "Referential integrity checks … always bypass row security". A unique
  constraint used for upvote de-duplication (§7.7) or an FK across domains can reveal existence.
  No cross-domain FKs. Q9 must address the de-dup constraint.
- **IDs (§9 "predictable identifiers"):** no serial IDs for anonymous content. **Avoid `uuidv7()`**:
  it contains a "UNIX timestamp with millisecond precision" that `uuid_extract_timestamp` can read,
  which could help timing correlation with identity-domain events **(inference)**. Use
  `gen_random_uuid()` (v4). Better Auth offers `generateId: "serial"`; do not use it.
- **CI catalogue assertions (PROPOSAL, part of §9 negative tests):** pgTAP 1.3.4 lists `roles_are`,
  `table_privs_are`, `schema_privs_are`, `function_privs_are`, `policies_are`, `policy_roles_are`,
  `is_definer` (signatures **Unverified**). Equivalent SQL over `pg_class.relrowsecurity` /
  `relforcerowsecurity`, `pg_roles.rolbypassrls`, `pg_proc.proconfig` and ACLs also works. Assert:
  only the expected roles; no runtime role is superuser, has BYPASSRLS or owns tables; every domain
  table has RLS forced; every SECURITY DEFINER function pins `search_path` and is not executable by
  PUBLIC; `app_content` gets "permission denied" on identity tables. Running pgTAP on the managed
  host is not needed; CI uses a container (**Unverified** per host).
- Whether drizzle-kit wraps each migration in a transaction, and whether `drizzle-kit push` would drop
  policies created only in custom SQL, is **Unverified**. Proposal: never `push` to shared databases.
  The CI `policies_are` check catches silent drift.

### 4.3 Framework and tooling leakage channels (§3 last row, §6.2, §9 "logs")

| Channel | Verified fact | Proposal |
|---|---|---|
| ORM query logs | Drizzle custom logger receives `(query, params)` | Off in production, or log the statement name only |
| Framework error logs | Next.js: full errors in server logs, a digest on the client | Error messages never interpolate identity or content |
| Error reporting (Sentry) | Next.js SDK by default sends the IP, **incoming request bodies on the server**, query strings and console breadcrumbs; `user.id` is not set automatically | If used: `dataCollection.userInfo=false`, `httpBodies: []`, drop the Console integration, never `setUser()`. Or no SaaS error reporting in the prototype (NQ-S0-2) |
| Auth tokens | Better Auth magic link: `storeToken` default `"plain"`, 300 s, single-use, rate limit 5/60 s | Set `storeToken: "hashed"` |
| DB server logs / `pg_stat_statements` | **Unverified** per host | Hosting branch must check that statement logging with parameters is off |
| Caches | Next.js `"use cache"` opt-in | Banned in per-user domain modules |

### 4.4 Support for candidate privacy designs (A/B/C)

| | Next.js | React Router | SvelteKit | Django | Drizzle | Prisma | Kysely |
|---|---|---|---|---|---|---|---|
| **A** single PG + roles/schemas/RLS/DEFINER | Good (framework-neutral) | Good | Good | **Very good** (per-alias creds) | **Good** (declares RLS/roles; SQL for the rest) | **Poor** (no RLS story fit for production) | Good (all SQL) |
| **B** separate DBs/services + separate secrets | Good if each service is a **separate deployment**; within one deployment secrets are shared **(inference)** | Same; easiest to split into small services | Same | Good; no cross-DB FKs enforces separation; separate projects for secret isolation | Good (one instance per DB) | OK | Good |
| **C** client-side crypto | Good (Web Crypto in client components; CSP guide exists) | Good (Vercel docs show nonce CSP in `entry.server`) | Good | Weaker (hand-written JS, no component model) | Neutral | Neutral | Neutral |

Notes. B needs an asynchronous "privacy-preserving event processing" path (§6.2) between services,
with consistency trade-offs. Design is Q9. For C, XSS means key theft, so strict CSP is essential.
Key management is Q9 (inference).

---

## 5. Recommendation (PROPOSAL, owner approval required, then an ADR)

### 5.1 Framework: Next.js 16.x App Router, under these rules

1. Node.js runtime only; no Edge.
2. DB clients and DB secrets only in `server/domains/<domain>/*` with `import 'server-only'`. A lint
   rule blocks cross-domain imports.
3. Every privacy-relevant operation is an explicit Route Handler (testable by §9 API negative tests).
   Server Actions are thin wrappers that re-check auth.
4. DTO-only returns.
5. `"use cache"` is banned in per-user domains.
6. Errors are domain-specific and free of identity and content.
7. Patch within days of advisories; Dependabot on.

**Switch to React Router v8** if the hosting branch selects Cloudflare Workers, or if the owner ranks
auditability over ecosystem size. Rules 2, 4, 6 and 7 carry over unchanged.

### 5.2 Data access

Drizzle (0.45.x stable, unless v1 is stable at ADR time; re-check then). One instance and pool per
domain, each with a distinct LOGIN role and secret. Context goes in `set_config(…, true)` inside a
transaction helper. Driver by host. Fallback: Kysely.

### 5.3 Migrations

`drizzle-kit generate` for tables. Hand-written `--custom` SQL for all security objects. Migrations
run with a direct (non-pooled) owner URL, as Prisma and Supabase also advise for poolers. Never use
`push` on shared databases. CI applies migrations to a fresh Postgres 18 container (Testcontainers
`@testcontainers/postgresql`, with snapshot/restore between tests) and runs the §4.2 catalogue
assertions plus behavioural negative tests.

### 5.4 Validation

Zod 4 at every boundary, including a separate env schema per domain, so each domain only parses its
own secret.

### 5.5 Testing stack

Vitest for unit tests (listed by Next.js); integration tests against real Postgres via Testcontainers
or a GitHub Actions service container; Playwright E2E plus `@axe-core/playwright`. Playwright warns
that automated tests "cannot detect all types of WCAG violations", so manual checks are still needed
(Q15). GitHub Free private repos get 2,000 Actions minutes/month, and usage is blocked when the quota
runs out unless a payment method exists.

### 5.6 Auth library (input to Q4 only)

Better Auth: the Auth.js team "strongly recommend new projects to start with Better Auth". It has an
SSO plugin with OIDC and SAML 2.0 (signatures verified with samlify). Its tables go in the identity
domain only. Use `storeToken: "hashed"` and UUID IDs. Lucia is deprecated (March 2025).

---

## 6. Dependencies and proposed new open questions

**Depends on:** Q9 (mechanism), Q4 (IdP), the hosting branch (Vercel vs Workers vs container; pooler;
connection limits; platform logs), Q14, Q15.

**Proposed new open questions:**
- **NQ-S0-1** Production data residency: is Canadian hosting of app and DB required? Not in
  CONTRIBUTING.
- **NQ-S0-2** Is any third-party error-reporting or analytics SaaS allowed at all? If yes, which
  fields may it receive (§6.2)?
- **NQ-S0-3** If hosting is Cloudflare: does OpenNext support Next 16 `proxy.ts` (Node runtime)? If
  not, React Router becomes the default.
- **NQ-S0-4** Must secret isolation per privacy domain be *enforced by the platform* (separate
  deployments, design B), or is a single deployment with separate DB roles acceptable for the
  prototype? This affects the threat model (Q8).
- **NQ-S0-5** Which LTI 1.3 library (by language) will Q5 use? This could favour Python or Node.
- **NQ-S0-6** Can preview deployments and staging ever contain real pilot data? (Proposal: never.)
- **NQ-S0-7** Drizzle v1 (RC) vs 0.45.x at scaffolding time.
- **NQ-S0-8** Is `uuidv7` banned for all anonymous-domain IDs, and are content timestamps coarsened?
  (Ties to Q9.)

---

## 7. Verification log (all checked 2026-10-11)

| Claim | URL | Checked | Status |
|---|---|---|---|
| Next.js 16.4 released 2026-10-06; create-next-app enables Cache Components; security update scheduled 2026-10-14 (2 Critical, 1 High upstream); CVE-2025-66478 CVSS 10 (2025-12-03); CVE-2025-55184/55183 (2025-12-11) | https://nextjs.org/blog | 2026-10-11 | Verified |
| Next 16 (2025-10-21): proxy.ts replaces middleware.ts and runs on Node.js; Node 20.9+ | https://nextjs.org/blog/next-16 | 2026-10-11 | Verified |
| DAL for new projects; server-only; Server Actions callable by direct POST; taint experimental | https://nextjs.org/docs/app/guides/data-security | 2026-10-11 | Verified |
| Adapter API stable in 16.2; Cloudflare/Netlify/AWS adapters in development | https://nextjs.org/blog/nextjs-across-platforms | 2026-10-11 | Verified |
| E2E recommended over unit tests for async Server Components | https://nextjs.org/docs/app/guides/testing | 2026-10-11 | Verified |
| Production Server Component errors: generic message + digest | https://nextjs.org/docs/app/api-reference/file-conventions/error | 2026-10-11 | Verified |
| React Router docs 8.4.0; framework mode features; RSC unstable | https://reactrouter.com/start/modes | 2026-10-11 | Verified |
| RR v8 minimums (Node 22.22, React 19.2.7, Vite 7); react-router-dom removed; Cloudflare uses @cloudflare/vite-plugin | https://reactrouter.com/upgrading/v7 | 2026-10-11 | Verified |
| RR v8 announced 2026-06-17; Remix 3 RC 2026-08-31 | https://remix.run/blog | 2026-10-11 | Verified |
| RR .server modules fail the build if in the client graph | https://reactrouter.com/api/framework-conventions/server-modules | 2026-10-11 | Verified |
| Vercel React Router preset; SSR on Functions | https://vercel.com/docs/frameworks/frontend/react-router | 2026-10-11 | Verified |
| SvelteKit 3 (2026-10-01); #lib; config in vite.config.ts; remote functions not stable | https://svelte.dev/blog/sveltekit-3-is-here | 2026-10-11 | Verified |
| SvelteKit server-only import error; check disabled when TEST=true | https://svelte.dev/docs/kit/server-only-modules | 2026-10-11 | Verified |
| SvelteKit official adapters | https://svelte.dev/docs/kit/adapters | 2026-10-11 | Verified |
| Django 6.1.2; 5.2 LTS extended support to April 2028 | https://www.djangoproject.com/download/ | 2026-10-11 | Verified |
| Django multi-DB per-alias creds; routers; no cross-DB FKs; admin lacks multi-DB support | https://docs.djangoproject.com/en/stable/topics/db/multi-db/ | 2026-10-11 | Verified |
| Django PG 15+; per-alias pools; DISABLE_SERVER_SIDE_CURSORS for transaction pooling | https://docs.djangoproject.com/en/stable/ref/databases/ | 2026-10-11 | Verified |
| Django RunSQL reverse_sql and hints | https://docs.djangoproject.com/en/stable/ref/migration-operations/ | 2026-10-11 | Verified |
| django-allauth 65.19.7: OIDC, SAML listed, MFA, headless | https://docs.allauth.org/en/latest/ | 2026-10-11 | Verified |
| Vercel runs Django as a single Fluid-compute function | https://vercel.com/docs/frameworks/full-stack/django | 2026-10-11 | Verified |
| Python Workers page does not mention Django | https://developers.cloudflare.com/workers/languages/python/ | 2026-10-11 | Verified (Django support Unverified) |
| OpenNext CF: Next 16 supported; Node Middleware not yet; 3/10 MiB limit | https://opennext.js.org/cloudflare | 2026-10-11 | Verified |
| Vercel framework matrix; PR preview URLs | https://vercel.com/docs/frameworks | 2026-10-11 | Verified |
| Drizzle 0.45.4 latest; v1 rc.4 pre-release | https://github.com/drizzle-team/drizzle-orm/releases | 2026-10-11 | Verified (years inferred) |
| Drizzle pgPolicy/pgRole/entities.roles; GRANT and DEFINER not mentioned | https://orm.drizzle.team/docs/rls | 2026-10-11 | Verified |
| drizzle-kit generate --custom (SQL only) | https://orm.drizzle.team/docs/kit-custom-migrations | 2026-10-11 | Verified |
| Drizzle v1 @rc; migration folder change | https://orm.drizzle.team/docs/upgrade-v1 | 2026-10-11 | Verified |
| Drizzle logger gets (query, params) | https://orm.drizzle.team/docs/goodies | 2026-10-11 | Verified |
| Prisma 8 latest; no RLS in changelog | https://www.prisma.io/changelog | 2026-10-11 | Verified |
| Prisma multi-schema; no RLS/roles | https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema | 2026-10-11 | Verified |
| Prisma hand SQL via --create-only | https://www.prisma.io/docs/orm/prisma-schema/postgresql-extensions | 2026-10-11 | Verified |
| Prisma RLS example "not intended… production" | https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security | 2026-10-11 | Verified |
| Prisma PgBouncer guidance | https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer | 2026-10-11 | Verified |
| Kysely 0.29.6 latest | https://github.com/kysely-org/kysely/releases | 2026-10-11 | Verified |
| Kysely Migrator lock; kysely-ctl not core | https://kysely.dev/docs/migrations | 2026-10-11 | Verified |
| postgres.js v3.4.9; single maintainer | https://github.com/porsager/postgres/releases | 2026-10-11 | Verified |
| node-postgres current version | https://github.com/brianc/node-postgres/releases | 2026-10-11 | Unverified |
| Atlas policies/roles/permissions/functions are Pro-only | https://atlasgo.io/atlas-schema/hcl#row-level-security | 2026-10-11 | Verified (price Unverified) |
| PgBouncer transaction-mode feature table; 1.26.0 | https://www.pgbouncer.org/features.html | 2026-10-11 | Verified |
| Supabase pooler modes; custom-role username; no prepared statements | https://supabase.com/docs/guides/database/connecting-to-postgres | 2026-10-11 | Verified |
| Neon HTTP vs WebSocket transactions | https://neon.com/docs/serverless/serverless-driver | 2026-10-11 | Verified |
| Neon set_config inside transaction(); no BYPASSRLS | https://neon.com/docs/serverless/serverless-driver-configuration | 2026-10-11 | Verified |
| Hyperdrive SET in transaction; RESET on return | https://developers.cloudflare.com/hyperdrive/concepts/how-hyperdrive-works/ | 2026-10-11 | Verified |
| PostgreSQL 18.6 current, EOL 2030-11-14 | https://www.postgresql.org/support/versioning/ | 2026-10-11 | Verified |
| SET LOCAL semantics | https://www.postgresql.org/docs/current/sql-set.html | 2026-10-11 | Verified |
| set_config is_local; current_setting missing_ok | https://www.postgresql.org/docs/current/functions-admin.html | 2026-10-11 | Verified |
| RLS bypass rules; FORCE; RI covert channel | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | 2026-10-11 | Verified |
| SECURITY DEFINER safe-writing rules | https://www.postgresql.org/docs/current/sql-createfunction.html | 2026-10-11 | Verified |
| PUBLIC gets EXECUTE on functions by default | https://www.postgresql.org/docs/current/ddl-priv.html | 2026-10-11 | Verified |
| uuidv7 embeds ms timestamp; extractable | https://www.postgresql.org/docs/current/functions-uuid.html | 2026-10-11 | Verified |
| pgTAP 1.3.4 security assertion names | https://pgtap.org/documentation.html | 2026-10-11 | Verified (signatures Unverified) |
| Testcontainers PostgreSQL module, snapshot/restore | https://node.testcontainers.org/modules/postgresql/ | 2026-10-11 | Verified |
| @axe-core/playwright; automation can't find all WCAG issues | https://playwright.dev/docs/accessibility-testing | 2026-10-11 | Verified |
| GitHub Free private: 2,000 min, 500 MB; blocked without payment | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Zod 4.6 stable | https://zod.dev/ | 2026-10-11 | Verified |
| Standard Schema spec | https://standardschema.dev/ | 2026-10-11 | Verified (adopter list Unverified) |
| Auth.js part of Better Auth; new projects → Better Auth | https://www.better-auth.com/blog/authjs-joins-better-auth | 2026-10-11 | Verified |
| Better Auth SSO: OIDC + SAML 2.0 via samlify | https://www.better-auth.com/docs/plugins/sso | 2026-10-11 | Verified |
| Better Auth Kysely built-in; generateId incl. serial | https://www.better-auth.com/docs/concepts/database | 2026-10-11 | Verified |
| Magic link: 300 s, single-use, storeToken plain default, 5/60 s | https://www.better-auth.com/docs/plugins/magic-link | 2026-10-11 | Verified |
| Lucia deprecated March 2025 | https://lucia-auth.com/ | 2026-10-11 | Verified |
| React Aria accessibility and i18n claims | https://react-aria.adobe.com/ | 2026-10-11 | Verified |
| shadcn/ui copy-in "accessible" | https://ui.shadcn.com/docs | 2026-10-11 | Verified (primitives Unverified) |
| Bits UI WAI-ARIA claims | https://bits-ui.com/docs/introduction | 2026-10-11 | Verified |
| SO 2026 framework usage (n=10,281) | https://survey.stackoverflow.co/2026/technology/data | 2026-10-11 | Verified |
| SO 2026 PostgreSQL 57.9% | https://survey.stackoverflow.co/2026/technology | 2026-10-11 | Verified |
| Sentry Next.js default data collection | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ | 2026-10-11 | Verified |
| Framework licences (MIT/BSD) | (not fetched) | 2026-10-11 | Unverified |
| Rails/Laravel multi-DB; htmx/Alpine; TanStack Start adoption | (not fetched) | 2026-10-11 | Unverified |
| Placeholder GUC returns '' after reset | (not fetched) | 2026-10-11 | Unverified |
| drizzle-kit migrate transaction wrapping; push dropping policies | (not documented on fetched pages) | 2026-10-11 | Unverified |
