# Stack and hosting for the prototype (Q3)

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: **Q3** (primary); Q2, Q4, Q5, Q6, Q8, Q9, Q14, Q15, Q17; PQ-02, PQ-03, PQ-04, PQ-05,
> PQ-07, PQ-09 to PQ-18, PQ-42, PQ-68.
> Proposed ADRs: [ADR 0001](../decisions/0001-application-stack.md) (application stack) and
> [ADR 0002](../decisions/0002-hosting-and-infrastructure.md) (hosting and infrastructure).

## Contents

1. [Summary and recommendation](#1-summary-and-recommendation)
2. [Questions covered and what they block](#2-questions-covered-and-what-they-block)
3. [Options considered](#3-options-considered)
4. [Evidence](#4-evidence)
5. [Comparison](#5-comparison)
6. [Recommendation (proposal) with trade-offs](#6-recommendation-proposal-with-trade-offs)
7. [Privacy implications (§6)](#7-privacy-implications-6)
8. [Risks](#8-risks)
9. [Open questions](#9-open-questions)
10. [Sources and verification log](#10-sources-and-verification-log)

## 1. Summary and recommendation

Q3 ("Tech stack and hosting", §12) blocks all code (§13). This file compares framework and
data-access options and four end-to-end hosting options (H1 to H4). Everything below is a
**Proposal** for the owner; no open question is closed.

**Proposal: "Stack R"** (full detail in section 6.2), conditional on the Vercel Hobby gate
(PQ-03, PQ-02):

- **Application:** TypeScript; **Next.js 16.x App Router, Node.js runtime only**, no Edge, **no
  `proxy.ts`**; server-only domain modules with a lint rule against cross-domain imports; explicit
  Route Handlers for privacy-relevant operations; **Drizzle ORM** with **one pool + LOGIN role +
  secret per privacy domain**; `drizzle-kit generate` plus **hand-written SQL** for roles, grants,
  RLS and SECURITY DEFINER functions, applied only from CI; **Zod 4** at every boundary; Kysely as
  the fallback data layer; **shadcn/ui + Tailwind CSS v4 on React Aria**, Base UI as the fallback
  primitive base after a spike. Pin a Next.js release that includes the out-of-band security update
  scheduled for 2026-10-14.
- **Hosting:** **Vercel Hobby, functions pinned to `yul1` (Montréal)** + **Supabase Free in
  `ca-central-1` used only as plain Postgres** (Data API disabled, default grants revoked, no
  Supabase Auth, no `supabase-js`, no Vault). Previews use the second free project with synthetic
  data only.
- **Pre-agreed fallback, same code:** a **container on Google Cloud Run `northamerica-northeast1`**
  with the same database. CI always builds the container.
- **Around it:** Amazon SES `ca-central-1` behind a mailer port in the identity domain (Q6 open);
  Porkbun domain; GitHub Actions; nightly per-domain encrypted backups.

**Estimated prototype cost:** about **USD 1.12–1.17/month** (domain about 0.92–0.97 plus SES
about 0.20), about CAD 1.60–1.67, before tax: under "<$5/month" in either currency (PQ-04).

**Why.** Next.js is first-class on Vercel and on any Node container, but only beta or
community-supported on Cloudflare Workers. The proposed privacy mechanism, A+ in
[ADR 0003](../decisions/0003-privacy-mechanism.md), needs real Postgres with roles, RLS and
SECURITY DEFINER functions, which rules out Cloudflare D1 (§12). Supabase is the only free managed
Postgres found with a Canadian region, and as plain Postgres it has the lowest lock-in. Vercel is
the most polished, lowest-operations path for one person, but Hobby is "restricted to
non-commercial personal use only" and has no DPA, so the fallback is agreed in advance.

**Scores** (section 5.2, weights a proposal): H2 Vercel + Supabase **78.5**, H4 Cloud Run +
Postgres **77.5**, H3b Workers + Hyperdrive **70.5**, H1 Vercel + Neon **70.0**, H3a Workers + D1
**62.0**. H4 never drops below 75.5 in any scenario and leads if Hobby is ineligible, a DPA is
required, or the owner wants protection against the operator.

**The unvetted advice on PDF pages 24–31** (section 5.3) is mostly right in direction but has
outdated or wrong points: AWS App Runner is closed to new customers; D1 is on Workers Free; Workers
Paid is a USD 5 *minimum*; D1 cannot host A+; an unkeyed hash is reversible; OAuth 2.0 alone does
not authenticate; "Vercel is free" omits the non-commercial clause; Supabase Free has no backups.

## 2. Questions covered and what they block

| Question | What this file covers | Blocks |
|---|---|---|
| **Q3** Tech stack and hosting (§12) | Framework, data access, migrations, validation, UI layer, host, database, CI, domain, backups, cost | All code (§13) |
| Q9 Privacy mechanism | Which platforms can carry A+ and a later separated (B) topology; does not choose Q9 | ADR 0003 |
| Q4, Q5, Q6 | Only where the stack constrains sign-in, provisioning and email | Sign-in, provisioning, §7.13 |
| Q8, Q14, Q17 | Platform-log fields, log retention, backups | Threat model, audit, data model |
| Q15 | The UI layer's support for accessibility | §8 |

**Requirements relied on.** §3 last row and §6.2 (identity and anonymous-content text never
together in any log, analytics event, error report, database view, export or admin dashboard;
platform logs are in scope because §9 tests "logs"); §6.1–§6.4 (five separated domains; restricted
service roles, opaque identifiers, narrowly scoped internal APIs; Q9 open; nobody can deanonymize by
default); §5 (role- and course-based authorization); §7.7 (rate limiting, merges); §7.13 (in-app
and email); §7.17 (audit); §8 (credible design, accessibility); §9 (negative tests); §10 ("sign in
securely", provisioning "through supported integrations"); §11 (database, authentication, tests,
deployment documentation); §12 (known issues with the PDF advice).

**Owner constraints** (stated in the research brief, not yet in CONTRIBUTING): a public, polished,
sign-in-able prototype first; under $5/month on free tiers and managed services; no corner painted
for §6 or §10–§11; mainstream tools for a solo builder with Claude. *Proposal:* record them under
Q2 and in §16 before relying on them (§1).

**Not requirements** (open questions, section 9): Canadian residency (PQ-09), availability and
live updates (PQ-17), a DPA or UW review (PQ-02), budget currency and failure style (PQ-04),
operator trust (PQ-10), IP as identity-bearing (PQ-11), user counts (PQ-05).

**Prototype-scale assumption** (shared by the research notes; not a requirement): about 5 pilot
courses, 500 registered users, 100 daily active users, bursts of 100 concurrent users, 30,000 page
views/month, 2,000 emails/month, database under 250 MB. One 1,000-student course is a stress case.

**Currency.** CAD figures use the Bank of Canada indicative rate of **1.4271 CAD per USD for
2026-10-09** (checked 2026-10-11). All prices are before tax.

## 3. Options considered

### 3.1 S0: framework, data access and migrations (host-independent)

| Framework | Version (checked 2026-10-11) | Stack Overflow 2026 (n=10,281) | Verdict (S0) |
|---|---|---|---|
| **Next.js App Router** | 16.4 (2026-10-06) | 20.6% | **Proposed**, under the rules in section 4.1 |
| React Router framework mode | 8.4.0 | Remix 1.7%; React 41.5% | Close alternative if hosting is Cloudflare Workers or auditability ranks first |
| SvelteKit | 3 (2026-10-01) | 5.6% | Not now ("good technology, wrong moment") |
| Django | 6.1.2; 5.2 LTS to April 2028 | 11.3% | Credible third choice; weaker for a polished interactive UI |

| Data layer | Version (checked 2026-10-11) | RLS / roles in schema | GRANT / SECURITY DEFINER | Verdict (S0) |
|---|---|---|---|---|
| **Drizzle ORM + drizzle-kit** | 0.45.4 latest; v1.0.0-rc.4 pre-release | Yes / yes (few options) | Not mentioned → `--custom` SQL | **Proposed** |
| **Kysely** | 0.29.6 (pre-1.0) | n/a (no schema DSL) | Hand-written | **Fallback** |
| Prisma ORM | Prisma 8 (`latest` since 2026-08-28; GitHub tags still rc) | No / no | No | Not recommended |
| postgres.js / `pg` | 3.4.9 / Unverified | n/a | n/a | Drivers under Drizzle or Kysely |

Migration tools: drizzle-kit `generate --custom` (proposed); Prisma `--create-only`, Kysely
`Migrator` and Django `RunSQL` are workable; **Atlas** puts policies, roles, permissions and
functions behind its paid Pro tier (price Unverified).

### 3.2 End-to-end hosting options

| ID | Compute and framework | Database | Canadian placement | Framework fit |
|---|---|---|---|---|
| **H1** | Next.js 16 (Node runtime) on **Vercel Hobby**, functions in `iad1` next to the database | **Neon Free**, `aws-us-east-1` (no Canadian Neon region; region cannot be changed) | Compute possible, database **no** | First-class (Vercel's adapter uses the public Adapter API, stable since 16.2) |
| **H2** | Next.js 16 on **Vercel Hobby**, functions pinned to **`yul1`** | **Supabase Free `ca-central-1`** used as plain Postgres (H2a). Variants: Supabase Auth (H2b); browser calls the Data API under RLS (H2c) | Database and function compute **yes**; Vercel platform data is US-primary | First-class |
| **H3a** | **Cloudflare Workers** with React Router v8 or Hono; one Worker per privacy domain | **D1** (SQLite), one database per domain | **No** (no Canadian location hint or jurisdiction) | Next.js only via vinext (beta) or OpenNext (community) |
| **H3b** | Workers as H3a | **Hyperdrive → Postgres** (Neon; a Supabase variant is Unverified) | Database only in the Supabase variant | As H3a |
| **H4** | Next.js `output: standalone` in **one container on Google Cloud Run**; can split into per-domain services later | Neon Free (US) or **Supabase Free `ca-central-1`** (H4-CA) | **Yes** with H4-CA (`northamerica-northeast1` + `ca-central-1`) | First-class ("a single Node.js server running `next start`") |

**Rejected before scoring** (evidence from the H3H4 note and the fact-check, checked 2026-10-11):

| Option | Reason | Source |
|---|---|---|
| Render Free | Spins down after 15 minutes, about one-minute wake; free Postgres "expire[s] 30 days after creation", then is deleted after a 14-day grace; "Do not use them for production applications" | [Render free](https://render.com/docs/free) |
| Railway Free / Hobby | Free has "0 custom domains"; Hobby is a USD 5 minimum plus usage, so at or above the target | [Railway pricing](https://railway.com/pricing) |
| Fly.io | "New organizations don't have a free tier"; Managed Postgres "$38/month (Basic)" | [Fly pricing](https://docs.fly.io/about/pricing) |
| AWS App Runner | "No longer open to new customers" | [App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html) |
| Bare AWS ECS/RDS | Operations burden for one person; prices Unverified | — |

## 4. Evidence

All facts were checked on official pages on 2026-10-11 by the research branches and the
fact-check; URLs are in section 10. Where the fact-check corrected a note, the corrected value is
used. **(inference)** marks reasoning from verified facts.

### 4.1 Framework and data access (S0)

**Next.js 16: facts that shape the rules.**

| Fact (checked 2026-10-11) | Rule (Proposal) |
|---|---|
| "For new projects, we recommend creating a dedicated Data Access Layer"; `server-only` causes "a build error" if imported on the client | DB secrets only in `server/domains/<domain>/` |
| A Server Action "can still be called externally"; verify auth "inside each one"; action IDs are recalculated, so §9 API tests are harder (inference) | Explicit Route Handlers; actions as thin wrappers |
| Whole rows passed to Client Components expose "all the fields" | DTO-only returns |
| Production errors reach the client as a digest; the full message goes to server logs | Errors free of identity and content |
| Caching is opt-in through `"use cache"` | Banned in per-user domains |
| `middleware.ts` deprecated; `proxy.ts` runs on Node.js; on Vercel, Routing Middleware "runs globally" and deploys to all regions "regardless of your region settings" (that `proxy.ts` deploys this way is strongly implied) | **No `proxy.ts`** (PQ-18) |
| CVE-2025-66478 (CVSS 10.0); an out-of-band update is scheduled for 2026-10-14 ("two Critical and one High") | Pin, Dependabot, patch within days |
| Stable Adapter API since 16.2; apps run as "a single Node.js server running `next start`" | Portable to a container or institution hosting |

Weaknesses: the largest server surface of the four; Next.js recommends end-to-end over unit tests
for async Server Components; fast change, so Claude must read the versioned docs.

**Data layers.** Drizzle's logger receives `(query, params)`, so it stays off in production; its
Neon and Supabase helpers tie policies to vendor roles, so avoid them. Whether `drizzle-kit push`
drops custom-SQL policies, and whether migrate wraps migrations in transactions, are
**Unverified**; hence never `push`. Prisma's only RLS example "is not intended to be used in
production environments", a deal-breaker for per-transaction RLS context. Kysely is Better Auth's
built-in adapter.

**Context behind poolers.** `set_config(…, true)` lasts "only till the end of the current
transaction", so context is set inside a transaction helper. An **Unverified** gotcha: an unset
`current_setting(…, true)` may read `''` after first use, so policies use `nullif(…, '')`.
Supavisor transaction mode "does not support prepared statements" (`prepare: false`) but accepts
custom roles as `role.projectref`; PgBouncer (Neon) does not support session `SET`; Hyperdrive
allows `SET` inside a transaction.

**Other facts.** Zod 4.6 is stable. Sentry's Next.js SDK collects all data categories by default,
including IP and request bodies (PQ-12). Connection count, not the framework, is the load limit
with per-domain pools; Supabase advises "Set the pool to 1 connection" for serverless (inference
for the rest; a 1,000-student vote burst is about 17 writes/s).

**UI layer (design research).** shadcn/ui is copy-in source (MIT); its `style` "cannot be changed
after initialization", so the primitive base is a day-one choice (inference). Base UI has been the
default since July 2026; `aria-*` styles are React Aria based (inference); whether every component
has an `aria-*` variant is **Unverified**. Current: Tailwind CSS 4.3.3, React Aria Components
1.22.1, Base UI 1.9.0. Detail belongs to the planned `docs/research/design-system-and-accessibility.md`.

### 4.2 Vercel Hobby (shared by H1 and H2)

| Topic | Evidence (checked 2026-10-11) |
|---|---|
| Allowances and cost | 1M invocations, 4 Active CPU-hours, 100 GB Fast Data Transfer, 1M CDN requests per month; **$0** at the assumption. Active CPU (14,400 CPU-seconds) is the likely binding limit (Estimate; spike 1) |
| At the limit | "limited to the usage caps and cannot purchase additional usage"; "you will have to wait until 30 days have passed". **Hard stop up to 30 days, no bill** |
| ToS | "Hobby teams are restricted to non-commercial personal use only"; commercial includes "financial gain of anyone involved … including a paid employee or consultant writing the code"; donations are not commercial. Whether a free public pilot qualifies is an owner/legal question (interpretation, Unverified) |
| DPA | Applies "for Customers who are on Enterprise and Pro plans"; "primary processing facilities are in the United States". **None on Hobby** |
| Regions | `yul1` = Montréal (`ca-central-1`); Hobby functions in one region; Routing Middleware deploys to all regions |
| Logs | Runtime logs hold method, **path, search parameters**, host, **user agent**, region and all `console.*` output; IP is held (the browser filter matches IP + user agent). **Hobby keeps 1 hour**, Pro 1 day. Turning them off is not documented (Unverified) |
| Other | Hobby cannot connect GitHub-organisation repositories; WebSockets are beta and end at 300 s; Pro is "$20 per user / month" |

### 4.3 H1: Vercel + Neon Free

| Topic | Evidence (checked 2026-10-11) |
|---|---|
| Allowances and cost | 100 CU-hours per project, 1 GB per project, 100 projects, scale to zero after 5 minutes (cannot be disabled), 6-hour history. **$0** under 100 CU-h; estimated 89 CU-h at a fixed 0.25 CU and 134 if it autoscales in class (Estimates) → Launch at $0.106/CU-hour, about $9.43–14.20 extra |
| At the limit | "compute is suspended until the next billing period or until you upgrade"; "None of these limits delete your data" |
| ToS / DPA | No Free non-commercial clause (terms updated 2026-08-05); DPA coverage of Free **Unverified** |
| Regions | **No Canadian region**; region cannot be changed |
| Logs | No end-user IPs (server connections); Neon-side query logging **Unverified** |
| Privacy fit | A+ yes, if app roles are created by SQL (Console/API roles join `neon_superuser`, which has BYPASSRLS). B strong (100 projects). **Branches copy all parent data by default** |

### 4.4 H2: Vercel + Supabase Free as plain Postgres

| Topic | Evidence (checked 2026-10-11) |
|---|---|
| Allowances and cost | 500 MB database, 5 GB egress, **2 active projects**, Nano compute (shared CPU, up to 0.5 GB RAM, 200 pooler clients), 200 Realtime peak connections, 1-day logs. **$0**; always-on, no metered CU-hours |
| At the limit | Grace period, then possibly "Pausing projects", "read-only mode" or "402 status code for all API requests" |
| Idle | **"paused after 1 week of inactivity"**; one-click restore. "Activity" is not defined |
| Backups | **None on Free**; Supabase advises regular `db dump` exports |
| ToS / DPA | No Free non-commercial clause; use "limited to Customer's internal business purposes" (reading it as allowing a public app is an Unverified interpretation); DPA "incorporated into this Agreement" |
| Regions | `ca-central-1` available |
| Logs (server-side use) | The gateway sees the server's IP; statement text and errors "can appear in `event_message`" in `postgres_logs`. Free 1 day, Pro 7 days |
| Rejected variants | **H2c** (browser Data API): gateway logs keep path, query, IP, city, postal code and the JWT subject. **H2b** (Supabase Auth): users sit in the same database's `auth` schema; SAML Pro-only; built-in SMTP 2 messages/hour |
| Privacy fit | A+ yes: custom roles via `role.projectref`; the dashboard `postgres` role has `bypassrls` (per the privacy research), so it is operator-only; Data API can be disabled. B weak on Free (2 projects). Branches start empty |
| Paid step | Pro "from $25/month" with "$10/month in compute credits"; daily backups for 7 days; no pausing; PITR "$100 per month per 7 days retention" |

### 4.5 H3: Cloudflare Workers + D1 (H3a) or Hyperdrive + Postgres (H3b)

| Topic | Evidence (checked 2026-10-11) |
|---|---|
| Allowances | Free: 100,000 requests/day, **10 ms CPU per request**, Worker size 64 MiB uncompressed ("There is no compressed size limit"). D1 is "available on both the Workers Free and Workers Paid plans" (Free: 10 databases, 5 GB). Hyperdrive $0, 10 configurations |
| Paid | "a minimum charge of $5 USD per month for an account", then metered: $0.30/M requests, $0.02/M CPU-ms; D1 $0.001/M rows read, $1.00/M rows written |
| Cost | **≈ $1.17** on Free *if* rendering fits 10 ms CPU (unmeasured); **≈ $5.97** on Paid |
| At the limit | "Error 1027" (fail closed) or the Worker is bypassed (fail open) **until 00:00 UTC**; D1 and Hyperdrive operations "fail with an error". No idle pausing found (absence is not proof) |
| Email | Free only to verified destination addresses; arbitrary recipients (sign-in codes) need Paid |
| ToS / DPA | No non-commercial clause found (terms updated 2026-09-28); the DPA "forms part of the Main Agreement", including the "Self-Serve Subscription Agreement" |
| Regions | Edge compute; D1 has **no Canadian location hint or jurisdiction**; "Data Localization Suite is Enterprise-only" is Unverified |
| Logs | Invocation logs hold "Request, Response, and related metadata" (exact fields not documented); Free 3 days, Paid 7; **can be turned off per Worker**. Logs pricing changes from 2026-12-01 |
| Framework | Cloudflare "recommends vinext" for Next.js, and "vinext is in beta"; OpenNext is the fallback ("Windows full support is not guaranteed"). React Router is first-class |
| Privacy fit | **H3a cannot host A+** (SQLite: no roles, schemas or RLS). H3b can. B: the strongest secret separation (per-Worker secrets; binding-only Workers have no public route); Queues on Free. Version URLs **hit production D1** |

### 4.6 H4: container on Google Cloud Run + Postgres

| Topic | Evidence (checked 2026-10-11) |
|---|---|
| Free tier and cost | "2 million requests per month", "180,000 vCPU-seconds", "360,000 GB-seconds", "1 GB of outbound data transfer from North America". About 13% of free vCPU-seconds at the assumption (Estimate). **≈ $1.2–1.5** in a US region; registry and secret overage rates Unverified |
| Custom domain | Domain mapping is Preview, "not production-ready", and **not in Canadian regions**. In Canada: Firebase Hosting rewrites (Blaze plan; "not covered by Google Cloud Terms of Service") or a load balancer. **Prices Unverified** |
| At the limit | Overage is billed on a paid account. Alerts-only budgets do not cap spend; a "spend cap budget" pauses eligible services (Cloud Run eligibility **Unverified**); a Pub/Sub pattern can disable billing |
| Idle | Scales to zero; cold start on the next request (duration Unverified); never deleted |
| ToS / DPA | No non-commercial restriction in the visible Terms; forbids creating multiple projects "to circumvent … usage limits or quotas"; the Cloud DPA "is incorporated into the Agreement(s)" (self-serve incorporation not visible, Unverified) |
| Regions | `northamerica-northeast1` (Montréal), `northamerica-northeast2` (Toronto) |
| Logs | Request logs "are created automatically" and cannot be reduced from Cloud Run; fields (remote IP, user agent) Unverified; `_Default` 30 days, configurable 1–3,650; **exclusion filters** available |
| Privacy fit | A+ yes (any Postgres). B strong: separate services, service accounts and secrets. Very low lock-in: the same image runs anywhere; local Docker Compose matches production |

### 4.7 Items common to every option

| Item | Evidence (checked 2026-10-11) |
|---|---|
| Email: Amazon SES | À la carte "$0.10 / 1,000 emails" → about $0.20/month at 2,000 emails. Plans exist (Essentials $0.16/1,000); "Accounts with no metered SES activity since June 1, 2025 will start on the Essentials plan beginning July 21, 2026"; "Cancel plan to return to à la carte pricing". New accounts start in the **sandbox** (verified recipients only, 200 messages/24 h) until production access is granted (per the email research). `ca-central-1` available |
| AWS account plan | AWS Free Tier is now a credit plan ("up to $200" over 6 months); a Free-plan account "closes on its own 6 months after you open it or when your credits run out" → use the **Paid plan** (PQ-42) |
| Email fallback: Resend Free | 3,000/month **but 100/day**; stores bodies 30 days (per the email research) |
| Domain: Porkbun | `.com` $11.08/year (≈ $0.92/month); `.ca` register $11.12, renewal **$11.61** (≈ $0.97/month), a sale is live (register $8.66, renew $9.15); currency not named on the page. `.ca` needs CIRA's Canadian Presence Requirements (PQ-07) |
| CI: GitHub Actions Free | 2,000 minutes/month for private repositories; public repositories free on standard runners; "usage is blocked once you use up your quota" without a payment method (PQ-68) |

## 5. Comparison

### 5.1 Cost at prototype scale against the <$5/month target

USD per month at the section 2 assumption, before tax; CAD at 1.4271.

| Line item | H1 Vercel + Neon | H2 Vercel + Supabase (CA) | H3a Workers + D1 | H3b Workers + Hyperdrive + PG | H4 Cloud Run + PG |
|---|---|---|---|---|---|
| Compute | $0 | $0 | $0 if SSR fits 10 ms CPU; else $5.00 minimum | as H3a | $0 |
| Database | $0 under 100 CU-h; else ≈ $9.43–14.20 | $0 | $0 | $0 (+ Neon CU-hour risk) | $0 |
| Custom domain routing | included | included | included | included | US: Preview mapping $0; **Canada: Unverified** |
| Email (SES, ~2,000/month) | $0.20 | $0.20 | $0.20 (Free) / $0 (Paid) | as H3a | $0.20 |
| Domain (Porkbun) | $0.92–0.97 | $0.92–0.97 | $0.92–0.97 | $0.92–0.97 | $0.92–0.97 |
| CI | $0 | $0 | $0 | $0 | $0 |
| **Total USD** | **≈ 1.17**, or ≈ 10.6–15.4 | **≈ 1.12–1.17** | ≈ 1.17 / **≈ 5.97** | ≈ 1.17 / ≈ 5.97 | ≈ 1.2–1.5 (US); H4-CA ≈ 1.2 + Unverified routing |
| **Total CAD** | ≈ 1.67 / 15–22 | **≈ 1.60–1.67** | ≈ 1.67 / 8.52 | ≈ 1.67 / 8.52 | ≈ 1.7–2.1 + unknown |
| vs target | Under only if Neon stays under 100 CU-h | **Under** | Under on Free; **over** on Paid | as H3a | Under in US; **unknown** in Canada |

**What pushes each option above USD 5.** H1/H2: a Vercel "commercial" determination or a required
DPA → Vercel Pro; Supabase backups, no pausing or 7-day logs → Supabase Pro; H1 only, Neon above
100 CU-h. H3: anything needing Workers Paid. H4: `min-instances = 1`, a load balancer for a
Canadian custom domain, or automatic overage billing. **All:** a 1,000-student course polling live
would exhaust Vercel Hobby's invocations and CPU within a few sessions and Workers Free's daily
requests in one session; Cloud Run's free requests absorb about three such sessions a month (all
Estimates). A large course is outside every free tier unless live updates use a cheap channel
(PQ-17).

**Failure styles (inference).** Hard stop, no bill: Vercel Hobby (up to 30 days, the worst), Neon
(rest of month), Workers Free (until midnight UTC, the mildest). Keep running, bill automatically:
Cloud Run. Supabase sits between (grace, then restrictions) but adds the **idle pause**, which
matters for a public prototype that may see no traffic for a week. Which style the owner prefers
is PQ-04.

**Residency reach.** No free option gives end-to-end Canadian residency for every byte (vendor
metadata, edge TLS termination, support access).

| Option | Database at rest | Function compute | Platform logs and metadata |
|---|---|---|---|
| H2 | Canada | Canada (`yul1`), if `proxy.ts` is not used | US-primary (Vercel DPA); TLS ends at Vercel's global edge |
| H4-CA | Canada | Canada | GCP log buckets (bucket region configurable: Unverified) |
| H1, H3a, H3b | Not in Canada (except an H3b Supabase variant) | US or edge | US or global |

### 5.2 Scored matrix and sensitivity

**Weights (Proposal; the owner may re-weight):** privacy-architecture fit 20 · cost against the
target 15 · developer experience and mainstream-ness 15 · lock-in and production path 15 ·
failure behaviour 10 · credibility and always-on 10 · ToS and contracts 10 · platform logs 5 = 100.
Scores are 0–5 (5 best); weighted total = Σ score × weight ÷ 5. The evidence behind each cell is in
sections 4 and 5.1.

| Criterion (weight) | H1 | **H2** | H3a | H3b | **H4** |
|---|---|---|---|---|---|
| Privacy fit (20) | 4.5 | 4.0 | 2.5 | 4.5 | 5.0 |
| Cost vs target (15) | 3.5 | 4.5 | 3.5 | 3.0 | 3.5 |
| DX / mainstream (15) | 4.5 | 4.5 | 3.0 | 3.0 | 3.5 |
| Lock-in and production path (15) | 3.0 | 4.5 | 1.5 | 2.5 | 5.0 |
| Failure behaviour (10) | 2.0 | 3.0 | 3.5 | 3.5 | 2.5 |
| Credibility / always-on (10) | 3.5 | 3.5 | 4.5 | 4.0 | 3.0 |
| ToS and contracts (10) | 2.0 | 2.5 | 4.0 | 4.0 | 3.5 |
| Platform logs (5) | 4.0 | 4.0 | 4.0 | 4.0 | 3.5 |
| **Weighted total (/100)** | **70.0** | **78.5** | **62.0** | **70.5** | **77.5** |

**Sensitivity** (each scenario changes only the cells named):

| Scenario (owner answer) | Cells changed | H1 | H2 | H3a | H3b | H4 | Leader |
|---|---|---|---|---|---|---|---|
| Base case | — | 70.0 | **78.5** | 62.0 | 70.5 | 77.5 | H2, narrowly |
| S1: Vercel Hobby ineligible or a DPA required (→ Vercel Pro $20) | H1/H2 cost → 1; ToS → 4 | 66.5 | 71.0 | 62.0 | 70.5 | **77.5** | **H4** |
| S2: Canadian residency required now | H1 lock-in → 1, H3a → 0.5, H3b → 1; H2 lock-in → 4; H4 cost → 3 | 64.0 | **77.0** | 59.0 | 66.0 | 76.0 | H2 ≈ H4 |
| S3: protect against the operator too (B-full) | privacy: H1 5, H2 3, H3a 4.5, H3b 5, H4 5 | 72.0 | 74.5 | 70.0 | 72.5 | **77.5** | **H4** |
| S4: hard stop preferred over any surprise bill | H4 failure → 1.5 | 70.0 | **78.5** | 62.0 | 70.5 | 75.5 | H2 |
| S5: SSR measured within Workers Free 10 ms; owner accepts React Router | H3 cost → 4.5 | 70.0 | **78.5** | 65.0 | 75.0 | 77.5 | H2 |

**Reading (inference).** H2 and H4 are effectively tied and well ahead. H2 wins on ease and cost
**only while Vercel Hobby is usable**; H4 never drops below 75.5, so it is the robust fallback. H1
is dominated by H2 once Canadian placement or the CU-hour cliff matters. H3a is last because it
forecloses the database-enforced design and any non-Cloudflare production. H3b fits only if the
owner wants Cloudflare specifically and accepts React Router and the USD 5 minimum.

### 5.3 The unvetted advice on PDF pages 24–31: claim-by-claim verdicts

§12 records this advice as *Advisory* with four known issues. Verdicts: **Agree**, **Partly**
(right direction, incomplete or overstated), **Outdated**, **Wrong**, **Unverified**. Evidence is
in section 4 and its URLs in section 10.

| # | Claim [src page] | Verdict | Evidence → what to do instead (Proposal) |
|---|---|---|---|
| P1 | Next.js with Tailwind "ensures a fast, accessible, and clean user interface" [src p.25] | **Partly** | Most-used framework, but nothing "ensures" accessibility; automated tests "cannot detect all types of WCAG violations" → accessible primitives, axe in CI, manual checks (Q15) |
| P2 | Separate backend: Express, NestJS or FastAPI [src p.25] | **Partly** | Next.js recommends a server-only DAL in the same app → one TypeScript codebase; a separate service only where B needs platform-enforced secrets |
| P3 | PostgreSQL is "mandatory" [src p.25] | **Agree with the choice** | Roles, RLS with FORCE and SECURITY DEFINER exist; "mandatory" overstates (B could run without RLS) → Postgres, because it keeps A+ and B open |
| P4 | Frontend on a CDN, backend in containers (ECS or Cloud Run) [src p.25] | **Partly** | Cloud Run is viable, but two deployables meet no requirement → one deployable (H2) or one container (H4) |
| P5 | Isolated schemas stop identity–content joins [src p.25] | **Partly** | Any role with privileges on both schemas can join; superusers and BYPASSRLS "always bypass" → per-domain roles and grants, catalogue assertions |
| P6 | Posts linked to a course ID, never an author ID [src p.26] | **Agree, incomplete** | De-duplication (§7.7) still needs per-student facts; timing is a side channel → Q9 (ADR 0003); no `uuidv7` |
| P7 | Counters credited with "a secure, one-way hashed identifier" [src p.26] | **Wrong as written** | An unkeyed hash is reversible (§12) → keyed HMAC with keys outside SQL (ADR 0003); crediting mode PQ-30 |
| P8 | Audit schema "An immutable log" [src p.26] | **Partly** | An INSERT-only role is append-only for the app, not the operator → stronger immutability is Q14 |
| P9 | No custom password system [src p.26] | **Agree** | Q4 stays open |
| P10 | SSO "using SAML or OAuth 2.0" [src p.26] | **Partly** | OIDC is "a simple identity layer on top of the OAuth 2.0 protocol" → say OIDC or SAML 2.0 |
| P11 | For UW, Entra ID or WatIAM [src p.26] | **Partly** | `uwaterloo.ca` is an Entra tenant; consent policy not published; WatIAM as an IdP **Unverified** → no dependency on UW SSO (Q4, PQ-44) |
| P12 | "Secure, HTTP-only cookies storing JWTs" [src p.26] | **Partly** | OWASP: expiry and logout invalidation "server-side"; session ID "must be meaningless" → opaque `__Host-` cookie with database sessions |
| P13 | Authorization in middleware on every request [src p.26–27] | **Partly** | Next.js: verify auth inside each Server Action; `proxy.ts` would run globally on Vercel → checks inside every DAL function |
| P14 | Per-course dynamic TA permissions [src p.27] | **Agree** | §5 → per-course permission table (PQ-67) |
| P15 | You still manage backups unless fully managed [src p.27–28] | **Agree** | Supabase Free has no backups; Neon Free keeps 6 hours → nightly per-domain encrypted dumps |
| P16 | Cloudflare Pages + Workers + D1 [src p.28] | **Outdated** | Cloudflare now recommends vinext (beta) for Next.js; D1 conflicts with A+ |
| P17 | Automatic deploys on push [src p.28] | **Agree** | Note: Version URLs hit production D1 |
| P18 | Cloudflare operational work "Very low" [src p.28] | **Partly** | 10 ms CPU and 100,000 requests/day on Free; B means many Workers to wire |
| P19 | D1 needs Workers Paid [src p.29] | **Wrong** | "D1 is available on both the Workers Free and Workers Paid plans" |
| P20–P24 | "a flat $5/month" covering 10M requests, "25 billion database reads", 5 GB; costs rise "only slightly" [src p.29] | **Wrong framing / partly** | A USD 5 *minimum* plus metering; CPU billed separately; 25 billion **rows read**; 5 GB correct; Workers Logs pricing changes from 2026-12-01 |
| P25 | AWS Amplify, App Runner or ECS, RDS [src p.29] | **Outdated** | "AWS App Runner is no longer open to new customers"; AWS points to ECS Express Mode |
| P26 | AWS operational work "High" [src p.29] | **Plausible (opinion)** | Consistent with ECS Express Mode's ALB, networking and IAM |
| P27 | AWS "$30 to $50 per month"; RDS Multi-AZ "over $70" [src p.29] | **Unverified** | Do not use these figures; Free-plan accounts close after 6 months |
| P28 | Cloudflare or Vercel + Supabase over bare AWS [src p.29–30] | **Partly** | Agree on avoiding bare AWS; D1 conflicts with A+; Hobby non-commercial, no DPA → H2 behind the gate, H4 fallback |
| P29 | PaaS handle builds, TLS and domains [src p.30–31] | **Partly** | Cloud Run domain mapping is Preview and not in Canada; Railway Free "0 custom domains" |
| P30 | "Vercel is free for hobby projects" [src p.31] | **Incomplete** | Non-commercial only, hard caps, up to 30-day lockout, no DPA, 1-hour logs → PQ-03 |
| P31 | Supabase for database and authentication [src p.31] | **Partly** | Supabase Auth shares the database (`auth` schema); SAML Pro-only; built-in SMTP 2/hour → Postgres only |
| P32–P34 | Free: 500 MB, 50,000 MAU, pause after 7 days idle [src p.31] | **Agree** | 50,000 is an Auth quota (irrelevant without Supabase Auth); "activity" is undefined |
| P35 | "perfect for a zero cost public prototype" [src p.31] | **Misleading by omission** | No backups, 2 projects, pausing, Data API grants → achievable with the section 6 hardening |
| P36–P37 | Railway from $5 with $5 credit; $10–20 always-on; no Docker config needed [src p.31] | **Partly / Unverified** | Hobby "includes $5 of resource usage"; $10–20 unmeasured; no Canadian region; Docker claim not checked |
| P38–P39 | Render free DB expires after 30 days, 15-minute spin-down; paid "$7 … $6" [src p.31] | **Agree, and worse / Unverified** | Then "Render deletes the database (along with all of its data)"; paid prices load dynamically |
| P40 | Omissions [src p.24–31] | **Gap** | Nothing on residency, vendor logs, DPAs, email, LTI, backups as exports, preview-data leaks |

## 6. Recommendation (proposal) with trade-offs

### 6.1 The gate (answer before ADR 0002 is accepted)

1. **PQ-03:** Is anyone paid to build or run ClearCourse AI, or is commercialisation intended? This
   decides whether Vercel Hobby's "non-commercial personal use" applies. Proposal: ask Vercel
   support in writing and keep the reply with the ADR.
2. **PQ-02:** Is a UW privacy review, a signed DPA or other institutional approval needed before
   real UW users sign in? Vercel's DPA covers only Pro and Enterprise.

If both answers allow Vercel Hobby → **Stack R (H2)**. If either fails → **Stack R-fallback
(H4-CA)**, same code. If the owner also wants protection against the operator (PQ-10) → still
H4-CA, built as separate services (section 6.5).

### 6.2 Stack R, layer by layer (Proposal)

| Layer | Proposal | Why |
|---|---|---|
| Language, framework | **TypeScript**; **Next.js 16.x App Router, Node.js runtime only**; no Edge; **no `proxy.ts`** (CSP through static headers; authorization in the DAL); pin a release with the 2026-10-14 fix | §6.2, §8; PQ-18 |
| Code rules | `server/domains/<domain>/` with `import 'server-only'`; lint or dependency-cruiser rules against cross-domain imports; Route Handlers for every privacy-relevant read and write; Server Actions as thin wrappers that re-check auth; DTO-only returns; no `"use cache"` in per-user domains; errors free of identity and content | §3, §6.2, §9 |
| UI layer | **shadcn/ui + Tailwind CSS v4 on React Aria Components**; **Base UI** fallback if spike 7 finds a needed component missing in the `aria-*` style; own design tokens; no UW or D2L logos, fonts or BrightspaceUI components | §8; Q15 |
| Validation | **Zod 4** at every boundary; one environment schema per domain | §6.2 |
| Auth (input to Q4) | Better Auth with database sessions in the identity schema, opaque `__Host-` cookie, hashed tokens, UUID IDs (ADR 0004) | §10 |
| Data access | **Drizzle** (0.45.x unless v1 is stable at acceptance); **one instance + pool + LOGIN role + secret per domain**, including the linkage role; `prepare: false` through Supavisor transaction mode; `set_config(…, true)` inside a transaction helper; logger off in production. Under A+, anonymous and identity data are read through SECURITY DEFINER functions with raw parameterised SQL, not ORM table reads. Fallback: **Kysely** | §6.2 restricted roles |
| Migrations | `drizzle-kit generate` + **hand-written `--custom` SQL** for roles, grants, ENABLE + FORCE RLS, policies, definer functions and default privileges; applied **only from GitHub Actions** in a protected environment; **never `push`**; catalogue assertions in CI | §9; §14 |
| Database | **Supabase Free `ca-central-1`, Postgres only**: Data API disabled, default privileges revoked, no Supabase Auth, `supabase-js` or Vault; app roles by SQL; the dashboard `postgres` role is operator-only | §6; lock-in |
| Host | **Vercel Hobby, functions in `yul1`**; personal GitHub repository; previews on the **second free Supabase project, synthetic data only** | Owner constraints; PQ-15 |
| Email | Mailer port in `server/domains/identity/mailer/`; content-free, type-free messages; **SES `ca-central-1`**, AWS Paid plan, production access early, tracking off, à la carte (cancel a defaulted Essentials plan); Resend Free for dev/demo only. Digests: Vercel Hobby cron limits are Unverified, so a GitHub Actions schedule calling an authenticated endpoint is the fallback | §7.13, §3; Q6 |
| Domain, CI | **Porkbun** `.ca` if eligible, else `.com`. **GitHub Actions**: Postgres service container at Supabase's major version, migrations, catalogue assertions, Vitest, Playwright + axe, **container build**, Dependabot | §8, §9, §15 |
| Backups | Nightly **per-domain** `pg_dump`, each encrypted with its own key, to owner-controlled storage, pending PQ-14 | §6.2; §11 |
| Error reporting | **None** unless PQ-12 allows one | §3 |

**Trade-offs accepted.** Stack R depends on one owner answer (PQ-03, PQ-02). A Vercel cap means an
outage of up to 30 days, not a bill. Supabase Free pauses after a week idle and has no backups, so
the owner runs nightly dumps and a weekly synthetic check. Inside one deployment, per-domain secret
isolation is convention plus CI (PQ-13). Vercel platform metadata is US-primary.

### 6.3 Stack R-fallback (H4-CA): differences only

- Same repository and image. Deploy the `output: standalone` container to **Cloud Run
  `northamerica-northeast1`**, `min-instances = 0`, a low `max-instances`; the Supabase project is
  unchanged.
- Custom domain through **Firebase Hosting rewrites** (Blaze plan; a second contract outside the
  GCP Terms) or a load balancer. **Price both before switching** (Unverified).
- Request-log **exclusion filters** for content-bearing routes and a shorter `_Default` retention
  (the owner sets the value; Q14, Q17); budget alerts plus a spend cap if Cloud Run is eligible,
  otherwise the Pub/Sub billing-disable pattern.
- Expect cold starts and measure them (spike 2).

### 6.4 Explicitly not proposed for the prototype

H2c (browser Data API), Supabase Auth, Supabase Vault, Neon (no Canadian region; CU-hour cliff)
unless B-full is chosen and US hosting is accepted, D1, Next.js on Cloudflare (vinext beta or
OpenNext), Render, Railway, Fly, AWS App Runner, any SaaS error reporting or analytics, `proxy.ts`
on Vercel, `uuidv7` for anonymous IDs, Prisma, Atlas Pro.

### 6.5 Production evolution (Proposal)

Phases are proposals; Q2 is open. Each step changes deployment, not the data model, because the
prototype already uses per-domain roles, no cross-domain foreign keys and a container build.

| Phase | Trigger (owner decides) | Hosting change | Privacy change | §10–§11 items it unlocks |
|---|---|---|---|---|
| **Prototype** | Now | Stack R (or R-fallback) on free tiers | A+ per ADR 0003 | Whatever Q2 scopes; sign-in by email codes |
| **Pilot with real courses** | A UW sponsor and IRA-PIA, real student volume, or any need for backups, no pausing or a DPA (PQ-01, PQ-02) | **Supabase Pro `ca-central-1`** (daily backups for 7 days, no pausing, 7-day logs); **Vercel Pro** if Hobby is ineligible or a DPA is required, *or* move compute to Cloud Run (H4-CA) and stay off Vercel Pro | KEK moved to a KMS if a review asks; threat model (Q8) published | Real UW sign-in if UW allows the Entra app (PQ-44) |
| **Production at UW** | LTI 1.3 registration approved by UW's LEARN admins | (a) Vercel Pro `yul1` + Supabase Pro/Team `ca-central-1`; (b) Cloud Run in Canada + Supabase Pro or Cloud SQL (price Unverified); or (c) institution-hosted container + Postgres 15+ | Split participation/linkage (and survey) into **separate deployments with their own secrets** if a review or PQ-10 asks | §10 provisioning "through supported integrations" (LTI 1.3), SSO, deployment documentation |
| **Multi-institution** | Another institution (§4) | Same image per institution or multi-tenant; region per institution | Per-institution keys | §4 configurability |

**What would force a data migration (avoid it):** choosing Neon and later needing Canada; choosing
D1; using Supabase Auth, Vault or the Data API. Stack R avoids all four.

UW context (per the provisioning research, checked 2026-10-11): LEARN integration needs review
"prior to integration with LEARN", and an [Information Risk
Assessment](https://uwaterloo.ca/privacy/information-risk-assessment) "typically takes 2–4 weeks".
A review can impose hosting conditions nobody knows yet; portability is the insurance (inference).

### 6.6 Estimated monthly running cost per phase

USD per month, before tax; CAD at 1.4271. Usage beyond the section 2 assumption is unknown (PQ-05),
so pilot and production are ranges with named triggers.

| Phase | Line items (sources in section 10) | USD/month | CAD/month |
|---|---|---|---|
| **Prototype, Stack R** | Vercel Hobby $0 · Supabase Free $0 · SES ~2,000 × $0.10/1,000 = $0.20 · domain $0.92–0.97 · GitHub Free $0 | **≈ 1.12–1.17** | **≈ 1.60–1.67** |
| Prototype, R-fallback (H4-CA) | Cloud Run free tier $0 · Supabase Free $0 · SES $0.20 · domain $0.97 · registry/secrets cents (Unverified) · **Firebase Hosting or LB: Unverified** | **≈ 1.2 + routing (Unverified)** | ≈ 1.7 + routing |
| Prototype alternatives, for reference | H1 ≈ 1.17 if Neon < 100 CU-h, else ≈ 10.6–15.4 · H3 Free ≈ 1.17 / Paid ≈ 5.97 | — | 1.67 / 15–22 / 8.52 |
| **Pilot, minimum** | Supabase Pro "from $25/month" incl. $10 compute credits · Vercel Hobby if still eligible · SES ≤ $1 · domain ~$1 | **≈ 27** | ≈ 38.5 |
| **Pilot, with Vercel Pro** | + Vercel Pro "$20 per user / month" (one seat) | **≈ 47** | ≈ 67 |
| Pilot via H4-CA | Supabase Pro $25 + Cloud Run (free tier; `min-instances = 1` rate Unverified) + routing (Unverified) + SES + domain | **≈ 27 + Unverified lines** | ≈ 38.5 + … |
| **Production, lean** | Vercel Pro $20 + Supabase Pro $25 + compute upgrade to Small "~$15" (net ≈ $5 after the credit, Estimate) + SES + domain | **≈ 52–62** | ≈ 74–88 |
| Production, with PITR | + PITR "$100 per month per 7 days retention" | **≈ 152–162** | ≈ 217–231 |
| Production, institution-hosted | Unknown (UW infrastructure and support) | **Unverified** | — |
| Stress: one 1,000-student course polling live | Outside every free tier; budget the pilot tier at least | ≥ pilot | ≥ pilot |

If the owner's "$5" is CAD including tax, USD headroom is about 3.1 (CAD 5 ÷ 1.13 ÷ 1.4271), assuming
13% HST applies (whether it applies to these vendors is Unverified). Stack R fits either way;
Workers Paid would not.

### 6.7 Spikes to run before the ADRs are accepted (each about a day or less; Proposal)

All spikes run in a throwaway folder outside the repository.

| # | Spike | Pass/fail measure |
|---|---|---|
| 1 | **Vercel + Supabase measurement.** A Next.js page that signs in (test identity provider or an email code to a verified address) and runs one per-domain query through Supavisor from `yul1` to `ca-central-1` | Active CPU per request recorded (the stack judge's example level of concern: above 15 ms average at the assumed load); cold and warm latency recorded; `set_config(…, true)` + RLS behaves as expected through the pooler, including the `nullif(current_setting(…), '')` case |
| 2 | **H4-CA readiness.** Deploy the same image to Cloud Run `northamerica-northeast1` | Cold start measured; Firebase Hosting with a custom domain and a load balancer priced in the official calculator; spend-cap eligibility for Cloud Run confirmed or refuted |
| 3 | **Log capture.** One real Vercel runtime-log entry, one Supabase `postgres_logs` entry and (if H4) one Cloud Run request log | Every field listed; the list goes into the threat model (Q8) and the §9 log tests |
| 4 | **CI connectivity and version.** From a GitHub-hosted runner, apply migrations to Supabase through the IPv4 session pooler with a custom owner role | Migrations apply; Supabase's Postgres major version read and the CI image pinned to it |
| 5 | **Email path.** AWS account on the Paid plan; verify the domain in SES `ca-central-1`; request production access; send a content-free code email to a UW mailbox | Production access granted; plan is à la carte; what UW's Safe Links does to the message noted |
| 6 | **Hobby eligibility.** Written question to Vercel support (PQ-03) | Reply received and stored with ADR 0002 |
| 7 | **UI primitive base.** `shadcn init` with an `aria-*` style in a scratch app | Every component the milestone-1 screens need exists in the `aria-*` style; if not, use `base-*` |

ADR 0003 adds its own spikes (system columns, auth session rows, merge timing, driver logging),
which run on the same scratch deployment.

### 6.8 What evidence would change the recommendation

| Evidence | Change |
|---|---|
| Vercel or the owner says the project is commercial, or a DPA is required for the prototype | Switch to **H4-CA** (or pay Vercel Pro if the budget is raised) |
| The owner wants protection against the operator (PQ-10) | **H4** with separate Cloud Run services and separate Postgres projects; reconsider H3b if Canada is not required |
| Canadian residency is ruled out *and* B needs three or more databases | **H1** (100 free Neon projects) becomes competitive |
| SSR fits Workers Free 10 ms, the owner prefers hard stops, accepts React Router and edge hosting | **H3b** rises to about 75 |
| Supabase confirms legitimate traffic cannot prevent pausing, or changes Free terms | H4-CA with Neon (US), or Supabase Pro earlier |
| GCP confirms Cloud Run spend-cap eligibility and Firebase Hosting fits the free quota with a Canadian custom domain | H4-CA overtakes H2 in the base case |
| UW's review requires institution hosting, a named cloud, or Canadian residency for all metadata | Plan the institution-hosted path now; prefer H4 |
| A needed feature forces `proxy.ts` on Vercel and residency matters | Prefer H4-CA |
| Measured Vercel Active CPU per request is high | Budget Vercel Pro or move to H4 |
| Drizzle v1 is stable, or drizzle-kit drops custom-SQL policies on generate | Re-check the data layer (Kysely fallback) |

## 7. Privacy implications (§6)

Q9 is decided only through ADR 0003 (Proposed: A+). This section states what the platform must
allow and the rules that hold on every option.

| Need | A+ (one Postgres) | B (separated) | Stack R | R-fallback (H4-CA) |
|---|---|---|---|---|
| SQL roles, GRANT/REVOKE, ENABLE + FORCE RLS, SECURITY DEFINER with pinned `search_path` | Required | Optional | Yes | Yes |
| One LOGIN role + pool + secret per domain, incl. the `cc_link` linkage role | Required | Required | Yes (Supavisor, `prepare: false`) | Yes |
| Keys outside SQL (KEK in the host secret store) | Required | Required | Vercel environment variable | Secret Manager, later a KMS |
| Physically separate databases | — | Required | **Weak** (2 free projects) | Strong |
| Platform-enforced secrets per code path | — | Required | Separate Vercel projects only | Separate services and service accounts |
| Delayed or batched crediting (PQ-30) | Optional upgrade | Required | DIY scheduled job | Cloud Tasks or Pub/Sub (quotas Unverified) |

**Rules on every option (Proposal).**

1. Runtime roles never own tables; FORCE RLS; no cross-domain foreign keys (referential checks
   "always bypass row security"); `REVOKE ALL … FROM PUBLIC` on every definer function in the same
   transaction (PUBLIC gets EXECUTE by default).
2. `gen_random_uuid()` (v4) for anonymous IDs; never serial or `uuidv7()`, which embeds a
   millisecond timestamp (§9 "predictable identifiers").
3. Back up **per domain with separate keys**, because one full dump holds identity and content
   together (PQ-14).
4. Identity and content never in URLs or query strings (Vercel logs paths and search parameters);
   a field allow-listing logger; no `console.log` of request bodies.
5. Capture one real log entry per platform (spike 3) and feed its fields into the threat model (Q8)
   and the §9 log tests. Treat IP + timestamp as potentially identity-bearing until PQ-11 is
   answered, and list the correlation as a limitation of anonymity.
6. AI coding agents get no production data, secret or log access (PQ-16); Vercel exposes runtime
   logs to agents through MCP (per the H1H2 research).

**Limitations that remain (inference).** The operator and vendors can read everything in one
account: Vercel logs for an hour, Supabase's dashboard role bypasses RLS, GCP in the fallback. This
is the trust boundary ADR 0003 records unless PQ-10 says otherwise. Within one Vercel deployment,
any module can read any environment variable (PQ-13).

## 8. Risks

For Stack R unless noted. Likelihood and impact are judgements.

| # | Risk | Likelihood / impact | Mitigation (Proposal) |
|---|---|---|---|
| R1 | Vercel Hobby judged commercial, or a DPA is required | Medium / High (forces $20/month or a move) | Answer PQ-03 and PQ-02 before ADR 0002; keep the container build green so H4-CA is a deploy, not a rewrite |
| R2 | A Vercel Hobby cap is hit (4 Active CPU-hours, 1M invocations) → up to a 30-day lockout mid-term | Medium / High | No auto-refresh on student devices; cached aggregates with ETags; weekly usage review; spike 1 measures CPU per request |
| R3 | Supabase Free pauses after a week idle (between terms, before a demo) | Medium / Medium | Weekly synthetic sign-in check (ask Supabase whether it counts as activity; Unverified); restore runbook; Supabase Pro for the pilot |
| R4 | No backups on Supabase Free; operator error or a bad migration | Medium / High | Nightly per-domain encrypted dumps; documented restore drill (§11); migrations only from CI |
| R5 | Supabase default grants or the Data API expose tables | Low (Data API off) / High | Disable the Data API; revoke default privileges; CI test that `/rest/v1/` answers nothing; catalogue assertions |
| R6 | Identity and content co-occur in Vercel logs (path, query, user agent, IP held 1 hour) | Medium / High (§3) | POST bodies only; opaque IDs; allow-listing logger; no `proxy.ts`; inspect a real log entry (spike 3); document IP + time correlation as a limitation |
| R7 | Email sign-in breaks: SES sandbox, Free-plan account closure, daily caps | Medium / High (nobody can sign in) | AWS Paid plan; request SES production access early; budget alert; Resend fallback adapter behind the same port |
| R8 | Next.js or Better Auth critical advisories (Better Auth: 10 advisories in about 3 months, 2 Critical, per the sign-in research) | High / High | Pin versions; Dependabot; patch within days; minimal plugins; an "upgrade and redeploy" runbook step (§11) |
| R9 | The Supabase pooler or an IPv6-only direct connection blocks CI migrations from GitHub-hosted runners | Unknown / Medium | Use the IPv4 session pooler for migrations (runner IPv6 support Unverified); spike 4 |
| R10 | CI Postgres major version differs from Supabase's | Medium / Medium (false-green RLS tests) | Read Supabase's version at scaffold time; pin the CI image to it |
| R11 | Preview deployments touch real data | Low / High | Previews only on the synthetic-data project; environment variables scoped per environment |
| R12 | H4-CA routing cost (Firebase or LB) or cold starts make the fallback unattractive | Medium / Medium | Price both and measure cold start before they are needed (spike 2) |
| R13 | The owner's "$5" is CAD including tax | Low / Low for Stack R | Answer PQ-04; Stack R fits either way |
| R14 | Surprise bill on Cloud Run (fallback only) | Low / Medium | Spend cap if eligible, else Pub/Sub-driven billing disable; low `max-instances` |
| R15 | Fast-moving versions (Next.js 16.x, Drizzle v1 rc, Zod 4, Tailwind v4) differ from Claude's training data | Medium / Medium | Read the versioned docs in each session; pin; record versions in the ADR at acceptance |
| R16 | The shadcn `style` (primitive base) cannot be changed after init | Medium / Medium | Spike 7 before scaffolding |

## 9. Open questions

None is answered here. Proposal: add the PQ items the owner accepts to §13 with a §16 line.
Raw-note IDs are in brackets.

**Existing questions informed:** Q3 (primary); Q2 (milestone and owner constraints); Q4, Q5, Q6;
Q8 (log fields, vendor access); Q9 (platform support for A+ and B); Q14, Q17 (retention,
backups); Q15 (UI layer).

| ID | Question (short form) | When | Why it matters here |
|---|---|---|---|
| PQ-02 | UW privacy review, signed DPA or other approval before real UW users sign in? UW sponsor? [PQ-J3] | M1a (if PQ-01 = real) | Half of the Hobby gate |
| PQ-03 | Is anyone paid to build or run it, or is commercialisation intended? [PQ-J2] | ADR 0002 | Hobby eligibility |
| PQ-04 | "<$5" in USD or CAD, with tax? Hard stop or automatic billing at a limit, and what ceiling? [PQ-J1, PQ-J7] | ADR 0002 | Cost test; H2 vs H4 failure style |
| PQ-05 | Pilot scale: courses, students, largest course? [PQ-J15] | Pilot | Pilot and production cost |
| PQ-07 | `.ca` or `.com`; name conflicts; UW name or marks? [PQ-J16] | M1a | Domain |
| PQ-09 | Must data stay in Canada or on institution infrastructure, and which data? [PQ-J4, NQ-S0-1] | ADR 0002 (prototype), Prod | Rules out H1 and H3 if yes |
| PQ-10 | Is the operator inside the trust boundary? [PQ-J5] | ADR 0003 | B-full → H4 |
| PQ-11 | Are IP addresses and request metadata identity-bearing; what log retention is acceptable? [PQ-J6] | ADR 0003 | Vercel 1 h vs Cloud Run 30 days |
| PQ-12 | May any third-party error-reporting or analytics tool run? [PQ-J13, NQ-S0-2] | ADR 0001 | Sentry defaults breach §3 |
| PQ-13 | Platform-enforced per-domain secrets, or DB roles in one deployment? [PQ-J14, NQ-S0-4] | ADR 0003 | Separate projects or services |
| PQ-14 | Are backups "exports"? Where, under which keys, how long? [PQ-J11] | M1a | Per-domain dumps |
| PQ-15 | Synthetic data only in preview and staging? [PQ-J10, NQ-S0-6] | M0 | Second Supabase project |
| PQ-16 | Who holds the KEK; may AI agents access production data, secrets or logs? [PQ-J12] | M0 | Vercel MCP log access |
| PQ-17 | Live updates in presentation mode and voting? What counts as "credible" availability? [PQ-J8, PQ-J9] | M1b | Polling cost, cold starts, idle pause |
| PQ-18 | Is `proxy.ts` acceptable, or must all code run in the chosen region? [PQ-J18] | ADR 0001 | Routing Middleware runs globally |
| PQ-42 | AWS Paid-plan account for SES; UW sending path; CASL; retention; fallback? [PQ-J17] | M1a | Sign-in email |
| PQ-68 | Private or public GitHub repository? [PNQ-T6] | M0 | Free CI minutes |

Other raw-note items: the LTI library by language [NQ-S0-5] belongs to Q5 and PQ-50; Drizzle v1
versus 0.45.x [NQ-S0-7] is a re-check at ADR acceptance; `uuidv7` and timestamp coarsening
[NQ-S0-8] are covered by ADR 0003 and PQ-24.

**Unverified items (check before relying on them):** Cloud Run `min-instances` and Tier 2 prices,
cold-start time, spend-cap eligibility, request-log fields and log-bucket region; Firebase Hosting
and load-balancer prices; self-serve incorporation of the GCP DPA; Vercel Hobby cron limits, log
opt-out, and that `proxy.ts` deploys as Routing Middleware; whether Supabase counts scheduled pings
as activity, its Postgres major version, `pg_cron` on Free, the restore window, and the "internal
business purposes" reading; GitHub runner IPv6; Neon query logging, DPA for Free and billing
currency; Cloudflare log fields, Registrar prices, Data Localization Suite tier, Hyperdrive with
Supabase; Render and AWS prices (including the PDF's figures); drizzle-kit transaction and `push`
behaviour; the `''` setting gotcha; every shadcn component in an `aria-*` style; WatIAM as an IdP;
HST on these vendors; and whether a free public pilot is "non-commercial personal use" (PQ-03).

## 10. Sources and verification log

**Inputs** (the owner's scratch folder, not in this repository): the S0 framework note, the H1H2
Vercel note, the H3H4 Cloudflare and container note, an adversarial fact-check of all three (about
85 official fetches) and the stack judge's comparison (eleven more fetches, marked "judge"). Each
note's full verification log lists every page; the load-bearing ones are below. "Verified" means
confirmed on the official page.

| Claim | URL | Checked | Status |
|---|---|---|---|
| Next.js 16.4, OOB update 2026-10-14, CVEs; DAL and Server Action guidance | https://nextjs.org/blog ; https://nextjs.org/docs/app/guides/data-security | 2026-10-11 | Verified |
| Drizzle RLS/roles DSL; GRANT/DEFINER not mentioned; logger params | https://orm.drizzle.team/docs/rls ; https://orm.drizzle.team/docs/goodies | 2026-10-11 | Verified |
| Prisma RLS example "not intended… production" | https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security | 2026-10-11 | Verified |
| PostgreSQL RLS bypass, FORCE, covert channel; `uuidv7` timestamp | https://www.postgresql.org/docs/current/ddl-rowsecurity.html ; https://www.postgresql.org/docs/current/functions-uuid.html | 2026-10-11 | Verified |
| Supavisor: no prepared statements; custom roles | https://supabase.com/docs/guides/database/connecting-to-postgres | 2026-10-11 | Verified |
| Sentry collects IP and bodies by default | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ | 2026-10-11 | Verified |
| shadcn `style` fixed after init; Base UI default | https://ui.shadcn.com/docs/components-json ; https://ui.shadcn.com/docs/changelog | 2026-10-11 | Verified (design research) |
| Vercel Hobby caps, 30-day wait; non-commercial clause | https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits/fair-use-guidelines | 2026-10-11 | Verified |
| Vercel DPA (Pro/Enterprise; US); Routing Middleware global; runtime logs | https://vercel.com/legal/dpa ; https://vercel.com/docs/routing-middleware ; https://vercel.com/docs/logs/runtime | 2026-10-11 | Verified |
| Neon plans and regions | https://neon.com/docs/introduction/plans ; https://neon.com/docs/introduction/regions | 2026-10-11 | Verified |
| Supabase Free/Pro, pause, no backups, terms | https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/backups ; https://supabase.com/terms | 2026-10-11 | Verified (terms reading Unverified) |
| Workers pricing and limits; vinext; D1 location; Workers Logs | https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ ; https://developers.cloudflare.com/d1/configuration/data-location/ | 2026-10-11 | Verified |
| Cloudflare DPA part of the Main Agreement | https://www.cloudflare.com/cloudflare-customer-dpa/ | 2026-10-11 | Verified, judge |
| Cloud Run free tier; domain mapping; logging; Firebase rewrites | https://docs.cloud.google.com/free/docs/free-cloud-features ; https://docs.cloud.google.com/run/docs/mapping-custom-domains ; https://docs.cloud.google.com/run/docs/logging ; https://firebase.google.com/docs/hosting/cloud-run | 2026-10-11 | Verified (prices Unverified) |
| GCP budgets and spend caps; Terms; Cloud DPA | https://docs.cloud.google.com/billing/docs/how-to/budgets ; https://cloud.google.com/terms ; https://cloud.google.com/terms/data-processing-addendum | 2026-10-11 | Verified, judge (partial pages) |
| Render, Railway, Fly | https://render.com/docs/free ; https://railway.com/pricing ; https://docs.fly.io/about/pricing | 2026-10-11 | Verified |
| App Runner closed; AWS Free plan closes after 6 months | https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html ; https://aws.amazon.com/free/ | 2026-10-11 | Verified, judge |
| SES price and plans; Resend Free | https://aws.amazon.com/ses/pricing/ ; https://docs.aws.amazon.com/ses/latest/dg/pricing-plans.html ; https://resend.com/pricing | 2026-10-11 | Verified (SES by the email research) |
| Porkbun; GitHub Actions Free | https://porkbun.com/tld/ca ; https://porkbun.com/tld/com ; https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| OIDC; OWASP sessions; USD/CAD 1.4271 | https://openid.net/specs/openid-connect-core-1_0.html ; https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html ; https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/ | 2026-10-11 | Verified, judge |
| UW IRA "typically takes 2–4 weeks" | https://uwaterloo.ca/privacy/information-risk-assessment | 2026-10-11 | Verified (provisioning research) |
| CU-hour, invocation, CPU, egress and burst figures | (derived) | — | Estimate, unmeasured |
