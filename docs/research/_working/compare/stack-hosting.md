# Stack-and-hosting comparison (judge's report): H1–H4 + framework/data access (Q3)

> **Status:** COMPLETE first pass, 2026-10-11 (judge's report on the S0, H1H2, H3H4 notes and the stack
> fact-check). Research and planning only.
> **Nothing here is a decision.** Every recommendation is a **PROPOSAL** for the owner to approve through an
> ADR (CONTRIBUTING §1, §12, §14). `P:/code/clearcourse-ai/CONTRIBUTING.md` is the source of truth; if this
> note conflicts with it, CONTRIBUTING wins.

## Contents

0. Reading guide and evidence rules
1. Executive summary (PROPOSAL)
2. Inputs, and corrections applied from the fact-check
3. Requirements and owner constraints used; prototype-scale assumption
4. The four end-to-end options (with S0's framework fit per host)
5. Cost at prototype scale vs the <$5/month target
6. Free-tier failure behaviour
7. Credibility and always-on availability
8. Privacy-family support (A / B / C)
9. Platform logs and what they reveal
10. Developer experience for a solo builder with Claude
11. Lock-in, production path (§10–§11) and Canadian residency
12. Terms-of-service and contract risks
13. Scored matrix and sensitivity
14. The unvetted advice on PDF pages 24–31: claim-by-claim verdicts
15. Recommended prototype stack (PROPOSAL)
16. Production evolution path (PROPOSAL)
17. Estimated monthly running cost per phase
18. Key risks and mitigations
19. What evidence would change the recommendation
20. Proposed new open questions (consolidated)
21. Spikes to run before the ADR
22. Verification log

---

## 0. Reading guide and evidence rules

- **Requirement** = text CONTRIBUTING.md cites to the spec (written `§N.N`). **Owner constraint** = the four
  statements in the brief (public sign-in prototype, polished and credible; <$5/month; don't paint §6/§10–11 into a
  corner; mainstream tools for a solo builder with Claude). **PROPOSAL** = my recommendation; it binds nothing.
  **(inference)** = my reasoning from verified facts. **[Estimate]** = a number I computed, not measured.
- **Evidence.** Facts come from the four input notes (each fact carries its URL and "(checked 2026-10-11)") as
  corrected by the adversarial fact-check (where they disagree, the fact-check wins, §2). I fetched eleven
  official pages myself on 2026-10-11 to settle points the inputs left open (marked **[J]** and listed in §22).
  Anything not verified on a current official page is labelled **Unverified**.
- **Currency.** Vendors quote USD. I convert at the Bank of Canada indicative rate **1.4271 CAD per USD for
  2026-10-09** (https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/, checked 2026-10-11) **[J]**.
  Whether the owner's "$5" is USD or CAD, and whether it includes tax, is unknown (PQ-J1, §20).
- **Scale.** All cost and limit estimates use the input notes' shared **ASSUMPTION** (not a requirement; the owner
  gave no user counts): ~5 pilot courses, ~500 registered users, ~100 daily active users, class bursts of ~100
  concurrent users, ~30k page views/month, ~2,000 transactional emails/month, database < 250 MB. A single
  1,000-student course is treated as a stress case.
- **Option labels.** H1 = Vercel + Neon; H2 = Vercel + Supabase; H3 = Cloudflare Workers (+ D1 or Hyperdrive);
  H4 = portable container on Google Cloud Run + managed Postgres. Privacy families: **A** = one Postgres with
  roles, schemas, RLS and SECURITY DEFINER; **B** = physically separate stores/services with separate secrets;
  **C** = client-side cryptography (the C research note is still an empty skeleton, so C is assessed only as
  "what the platform must allow").

---

## 1. Executive summary (PROPOSAL for the owner; closes no open question)

**Recommended prototype stack (conditional on one owner answer, PQ-J2):**

| Layer | Proposal |
|---|---|
| Framework / language | **Next.js 16.x App Router, Node.js runtime only, TypeScript**, under S0's privacy-domain DAL rules (pin the release that ships the 2026-10-14 out-of-band security fix) |
| Data access / migrations | **Drizzle ORM** (0.45.x stable unless v1 is stable at ADR time), one instance + pool + Postgres LOGIN role + secret per privacy domain; `drizzle-kit generate` for tables plus **hand-written SQL** for every role, grant, RLS policy and SECURITY DEFINER function; CI catalogue assertions |
| Database | **Supabase Free, region Canada (Central) `ca-central-1`, used only as plain managed Postgres**: Data API disabled, default grants revoked, no Supabase Auth, no Supabase client SDK |
| Host | **Vercel Hobby, functions pinned to `yul1` (Montréal)** — *only if* the owner confirms Hobby eligibility (non-commercial personal use) and that no DPA is required for the prototype (PQ-J2, PQ-J3). **Pre-agreed fallback: H4-CA** = the same app as a container on Cloud Run `northamerica-northeast1` with the same Supabase database |
| Auth library (input to Q4) | Better Auth, database sessions in the identity schema, email one-time codes (A1 proposal) |
| Email integration point | A provider-neutral `mailer` port **inside the identity domain only**, sending content-free messages; **Amazon SES `ca-central-1`** (O1 proposal) on an AWS **Paid-plan** account (the Free plan auto-closes after 6 months **[J]**) |
| Domain / registrar | Porkbun: `.ca` if the owner meets CIRA's Canadian Presence Requirements, else `.com` (≈ USD 0.92–0.97/month) |
| CI | GitHub Actions on a **personal** (not organisation) repository: Postgres service container, migrations, privacy catalogue assertions, Vitest, Playwright + axe, **plus a container build** so the H4 fallback stays one deploy away |

**Estimated prototype cost:** ≈ **USD 1.17/month ≈ CAD 1.67** (domain + SES), before tax. Under the <$5 target in
either currency. See §17 for pilot and production.

**Why this, briefly.** S0's framework choice (Next.js) is first-class on Vercel and on any Node container, and only
beta/community-supported on Cloudflare. The likeliest privacy family (A, per the privacy-A and privacy-B notes) needs
real Postgres, which rules out D1 (H3a). Supabase is the only free managed Postgres in the inputs with a Canadian
region, and used as plain Postgres it has the lowest lock-in. Vercel gives the most polished, lowest-operations path
for a solo builder, but its Hobby plan is "restricted to non-commercial personal use only" and has no DPA. That is a
binary gate the owner can answer, so the fallback is fixed in advance.

**Scores (§13):** H2 (Vercel + Supabase-as-Postgres) **78.5**, H4 (Cloud Run + Postgres) **77.5**, H3b (Workers +
Hyperdrive + Postgres) **70.5**, H1 (Vercel + Neon) **70.0**, H3a (Workers + D1) **62.0** out of 100. H4 is the most
robust option across scenarios. It wins if Vercel Hobby is ineligible, if a DPA is required, or if the owner wants
protection against the operator (family B-full).

**Top corrections to the unvetted PDF advice (§14):** **AWS App Runner is now closed to new customers [J]**. D1 is
available on Workers Free, and Workers Paid is a USD 5 *minimum*, not a flat fee. D1 cannot host family A. An
unkeyed "one-way hash" is reversible. OAuth 2.0 alone does not authenticate users; OIDC does **[J]**. JWT-in-cookie
sessions should become revocable server-side sessions **[J]**. "Vercel is free for hobby projects" omits the
non-commercial clause, the hard caps and the missing DPA. Supabase Free is "zero cost" but has no backups and pauses
after a week idle.

---

## 2. Inputs, and corrections applied from the fact-check

**Inputs read (all 2026-10-11):**
- `P:/code/_clearcourse-scratch/research/stack-S0-framework-data-access.md` (S0: framework, data access, migrations)
- `P:/code/_clearcourse-scratch/research/stack-H1H2-vercel.md` (H1 Vercel + Neon; H2 Vercel + Supabase)
- `P:/code/_clearcourse-scratch/research/stack-H3H4-cloudflare-container.md` (H3 Cloudflare; H4 containers)
- `P:/code/_clearcourse-scratch/factcheck/stack.md` (adversarial fact-check; about 85 official fetches)
- For context only (not re-verified): the auth-A1, auth-A2, other-O1, privacy-A and privacy-B notes in the same
  `research/` folder. Their facts are cited as "(per <note>, checked 2026-10-11 by that branch)".

**Corrections from the fact-check, applied everywhere below:**

| # | Input claim | Corrected value used here | Source (checked 2026-10-11) |
|---|---|---|---|
| C1 | S0: Worker size limit "3 MiB Free / 10 MiB Paid" | **64 MiB uncompressed on both plans; "There is no compressed size limit"**. OpenNext's figure is stale | https://developers.cloudflare.com/workers/platform/limits/ |
| C2 | S0: "Cloudflare today goes through `@opennextjs/cloudflare`" | Cloudflare **recommends vinext (beta)** by default; OpenNext is the fallback. vinext's table lists `proxy.ts` as Supported; OpenNext still does not state it | https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ |
| C3 | H3H4: Cloudflare Email Sending "Paid-only" | Sending to **verified destination addresses is free on all plans**; arbitrary recipients need Workers Paid. Sign-in codes go to arbitrary users, so Paid is still needed in practice | https://developers.cloudflare.com/email-service/platform/pricing/ |
| C4 | H1H2: Porkbun `.ca` renewal $11.60 | **$11.61** regular renewal (register $11.12; sale now $8.66 / renew $9.15). Currency not named on the page | https://porkbun.com/tld/ca |
| C5 | S0/H1H2: Next.js `middleware.ts` "replaced" | `middleware.ts` is **deprecated, not removed**; `proxy.ts` runs on Node.js | https://nextjs.org/blog/next-16 |
| C6 | H1H2: Sentry defaults via `sendDefaultPii` (default Unverified) | Defaults are now the `dataCollection` option; **by default all categories are collected, including IP** | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ |
| C7 | H3H4: Fly $2.19/month | Applies only in `iad`/`ewr`; Toronto `yyz` price **Unverified** | https://docs.fly.io/about/pricing |
| C8 | H3H4 cost table: Workers Logs allowances | Valid now, but "Beginning December 1, 2026, Workers Logs will use Cloudflare Observability pricing" — **re-check after 2026-12-01** | https://developers.cloudflare.com/workers/platform/pricing/ |
| C9 | Prisma 8 maturity | `prisma@latest` since 2026-08-28, yet GitHub tags 8.0.0 builds as rc pre-releases: **ambiguous**. Not recommended anyway | https://www.prisma.io/changelog ; https://github.com/prisma/prisma/releases |
| C10 | Several "right claim, wrong URL" items | Cite: Hyperdrive limits on `/hyperdrive/platform/limits/`; Cloud Run request logs on `/run/docs/logging`; Render/Railway regions on `render.com/docs/regions` and `docs.railway.com/reference/deployment-regions` | as listed |

**Still Unverified after the fact-check (kept Unverified here):** Cloud Run idle min-instance price and Tier 2 rates
(https://cloud.google.com/run/pricing returns no figures to the fetch tool); Render paid prices
(https://render.com/pricing is dynamic); Cloudflare Registrar dollar prices; Cloudflare "Data Localization Suite is
Enterprise-only" (the cited D1 page does not say it; H3H4 cites https://developers.cloudflare.com/data-localization/ for
it, which the fact-check did not re-read); global external load-balancer price on GCP.

**New facts I verified myself [J] (details in §22):** AWS App Runner closed to new customers; AWS Free Tier is now a
credit plan whose Free-plan accounts close after 6 months; GCP "alerts-only" budgets do not cap spend, but
"spend cap budgets" exist for eligible services; GCP Terms have no non-commercial clause in the visible text;
Cloudflare's DPA forms part of the Self-Serve Subscription Agreement; Vercel Routing Middleware "runs globally before
the cache" and Next.js 16 uses its own `proxy.ts`; OIDC is "a simple identity layer on top of the OAuth 2.0
protocol"; OWASP session-cookie and server-side invalidation guidance; the USD/CAD rate.

---

## 3. Requirements and owner constraints used; what is *not* a requirement

**Requirements relied on (CONTRIBUTING):**
- §3 last row and §6.2: identity-bearing data and anonymous-content text never together in any application log,
  analytics event, error report, database view, export or administrator dashboard. Platform logs are in scope
  because §9 requires negative tests through "UI, API, exports, logs or predictable identifiers".
- §6.1: five technically separated domains. §6.2: "privacy-preserving event processing, separated tables or schemas,
  restricted service roles, opaque identifiers, and narrowly scoped internal APIs". §6.3: the unjoinability
  mechanism is open (Q9). §6.4: by default nobody can deanonymize; immutable audit logging if it is ever enabled.
- §5: strict role- and course-based authorization. §7.7: rate limiting, merges "without double-counting a student".
  §7.13: in-app **and email** notifications. §7.17: audit logging is required.
- §8: calm, credible design; accessibility required (target is Q15). §9: automated tests with mandatory negative
  tests. §10: "Institutional users can sign in securely"; "Courses and roles can be provisioned through supported
  integrations". §11: deliverables include the database, authentication, automated tests and **deployment
  documentation**. §12: the stack is undecided, and the known issues with the PDF advice must not be adopted blindly.
- §13: Q3 (stack and hosting) blocks all code. Related open questions: Q2, Q4, Q5, Q6, Q8, Q9, Q14, Q15, Q17.

**Owner constraints (from the brief; not yet recorded in CONTRIBUTING):** first milestone is a public prototype people
can sign in to and use, polished and credible (§8); target **<$5/month**, prefer free tiers and managed services the
owner does not operate; the prototype must not paint the production system (§10–11) or the privacy architecture (§6)
into a corner; solo builder with Claude, so mainstream, well-documented tools. *Proposal:* record the milestone
statement under Q2 and §16 before relying on it (CONTRIBUTING §1), as H1H2 also notes.

**Not requirements (treated as open questions, §20):** Canadian data residency; any availability or latency target;
live (push) updates in presentation mode; a DPA or institutional privacy review before real users; the currency of
the budget; whether the hosting operator is trusted; whether IP addresses count as identity-bearing; user counts.

---

## 4. The four end-to-end options, with S0's framework fit per host

| ID | Compute + framework | Database | Data path | Canadian placement possible? | Framework fit (S0, corrected) |
|---|---|---|---|---|---|
| **H1** | Next.js 16 (Node runtime) on **Vercel Hobby**, functions in `iad1` next to the DB | **Neon Free**, `aws-us-east-1` (no Canadian Neon region; region immutable) | Server-side only; one LOGIN role + connection string per domain through Neon's PgBouncer (transaction mode) | Compute yes (`yul1`), **DB no** | **First-class.** Vercel's adapter uses the public Adapter API (stable since 16.2) |
| **H2** (= H2a) | Next.js 16 on **Vercel Hobby**, functions pinned to **`yul1`** | **Supabase Free `ca-central-1`** used as plain Postgres: Data API off, default grants revoked, no Supabase Auth | Server-side only, through the Supavisor transaction pooler with custom roles `role.projectref` (`prepare: false`) | **Yes** for function compute and DB; Vercel platform data is US-primary (DPA) and Routing Middleware runs globally **[J]** | First-class (as H1) |
| H2b / H2c | As H2, but Supabase Auth (H2b) or the browser calling the Data API with RLS (H2c) | Same | — | Same | H2c is **rejected** for any anonymous-content, vote, participation or survey path (gateway logs keep IP, geo and can be matched to the JWT subject) |
| **H3a** | **Cloudflare Workers**, React Router v8 (S0's Workers alternative) or Hono; one Worker per privacy domain | **D1**, one database per domain, bound to one Worker each | Service-binding RPC between Workers | **No** (no Canada location hint or jurisdiction; Workers run at the edge) | Next.js only via **vinext (beta)** or OpenNext (community; Windows "not guaranteed"). React Router is first-class |
| **H3b** | Workers as H3a | **Hyperdrive → Postgres** (Neon in the input; Supabase `ca-central-1` would be a variant, Hyperdrive–Supabase compatibility **Unverified** here) | One Hyperdrive config (= DB user) per domain Worker | Data at rest could be in Canada in the Supabase variant; compute not pinned | As H3a |
| **H4** (= H4-CR) | Next.js 16 `output: standalone` (or any Node server) in **one Docker container on Google Cloud Run**; split into per-domain services later | Neon Free (US) or **Supabase Free `ca-central-1`** (H4-CA) | Server-side, per-domain roles; later per-service service accounts and secrets | **Yes** with H4-CA (`northamerica-northeast1` Montréal + Supabase `ca-central-1`); custom domain needs Firebase Hosting or a load balancer in Canadian regions | **First-class** (plain Node server; "a single Node.js server running `next start`") |

Rejected before scoring (evidence in H3H4 §4 and the fact-check): **Render Free** (15-minute spin-down with ~1-minute
wake; free Postgres "expire[s] 30 days after creation", deleted after a 14-day grace; "Do not use them for production
applications", https://render.com/docs/free); **Railway Free** ("0 custom domains", https://railway.com/pricing) and
**Railway Hobby** (USD 5 minimum + usage, so ≥ target); **Fly.io** ("New organizations don't have a free tier";
Managed Postgres "$38/month (Basic)", https://docs.fly.io/about/pricing); **AWS App Runner** (closed to new
customers **[J]**); bare **AWS ECS/RDS** (operations burden; RDS price Unverified, §14).

**One integration point common to all options (S0, adopted):** domain modules under `server/domains/<domain>/` with
`import 'server-only'`, a lint rule against cross-domain imports, every privacy-relevant operation behind an explicit
Route Handler (Server Actions are thin wrappers that re-check auth), DTO-only returns, no `"use cache"` in per-user
domains, error messages free of identity and content, and Zod 4 at every trust boundary including a separate
environment schema per domain. S0's caveat stands: inside **one** deployment every module can read every environment
variable, so per-domain secret isolation is convention plus CI, not platform enforcement (NQ-S0-4). Platform-enforced
secret separation needs separate deployments (Vercel projects, Workers, or Cloud Run services).

---

## 5. Cost at prototype scale vs the <$5/month target

All figures USD per month, at the §0 ASSUMPTION, before sales tax/GST/HST. CAD at 1.4271 **[J]**.

| Line item | H1 Vercel + Neon | H2 Vercel + Supabase (CA) | H3a Workers + D1 | H3b Workers + Hyperdrive + PG | H4 Cloud Run + PG |
|---|---|---|---|---|---|
| Compute | Vercel Hobby **$0** | Vercel Hobby **$0** | Workers Free **$0** *if* SSR fits 10 ms CPU (unmeasured); else Paid **$5.00 minimum** | same as H3a | Cloud Run free tier **$0** (≈13% of free vCPU-s at the assumption, H3H4 [Estimate]) |
| Database | Neon Free **$0** if < 100 CU-h/project; H1H2 estimates **89 CU-h** at a fixed 0.25 CU, **134 CU-h** if it autoscales in class → Launch **≈ $9.43–14.20** | Supabase Free **$0** (always-on Nano compute, no metered CU-hours) | D1 Free **$0** | Hyperdrive **$0** + Neon Free **$0** (same CU-hour risk as H1) | Neon or Supabase Free **$0** |
| Custom domain routing | included | included | included | included | US region: domain mapping $0 but "not production-ready" (Preview). **Canada: Firebase Hosting (quota and price Unverified) or a load balancer (price Unverified)** |
| Registry, secrets | — | — | — | — | Artifact Registry 0.5 GB free; Secret Manager 6 versions free; overage rates **Unverified** (cents) |
| Email (sign-in codes + notices, ~2,000/month) | SES **$0.20** ($0.10 per 1,000, per O1) | SES **$0.20** | Cloudflare Email Sending is not available for arbitrary recipients on Free → SES **$0.20**; on Paid, 3,000/month included → **$0** | same as H3a | SES **$0.20** |
| Domain (Porkbun, renewal price) | `.com` $11.08/yr ≈ **$0.92** or `.ca` $11.61/yr ≈ **$0.97** | same | same (Cloudflare Registrar "at cost", price Unverified) | same | same |
| CI | GitHub Free, 2,000 min/month private (public repos free on standard runners) **$0** | same | same, or Workers Builds 3,000 min | same | same, or Cloud Build 2,500 min |
| **Total (USD)** | **≈ $1.17** if Neon stays under 100 CU-h; **≈ $10.6–15.4** if not | **≈ $1.17** | **≈ $1.17** on Free; **≈ $5.97** on Paid | **≈ $1.17** on Free; **≈ $5.97** on Paid; + Neon risk | **≈ $1.2–1.5** (US) ; **H4-CA ≈ $1.2 + Unverified routing line** |
| **Total (CAD)** | ≈ 1.67 / 15–22 | **≈ 1.67** | ≈ 1.67 / **8.52** | ≈ 1.67 / 8.52 | ≈ 1.7–2.1 + unknown |
| **vs <$5 target** | Under, **only** with Neon capped at 0.25 CU and the class-burst estimate holding | **Under** | Under on Free; **over** on Paid (USD 5 minimum alone meets the target; with the domain it exceeds it) | as H3a | Under in US; **unknown** in Canada until the routing line is priced |

Sources (checked 2026-10-11): Vercel https://vercel.com/docs/plans/hobby ; Neon https://neon.com/docs/introduction/plans
and https://neon.com/pricing ; Supabase https://supabase.com/pricing ; Workers and D1
https://developers.cloudflare.com/workers/platform/pricing/ ; Hyperdrive
https://developers.cloudflare.com/hyperdrive/platform/pricing/ ; Cloud Run free tier
https://docs.cloud.google.com/free/docs/free-cloud-features ; domain mapping
https://docs.cloud.google.com/run/docs/mapping-custom-domains ; Porkbun https://porkbun.com/tld/com and
https://porkbun.com/tld/ca ; SES per O1 (https://aws.amazon.com/ses/pricing/, checked by that branch) ; GitHub
https://docs.github.com/en/billing/concepts/product-billing/github-actions ; Cloudflare Email
https://developers.cloudflare.com/email-service/platform/pricing/ .

**What pushes each option above USD 5:**
- **H1/H2:** any Vercel Hobby cap or a "commercial" determination → Vercel Pro "$20 per user / month"; a required
  DPA (Vercel's DPA covers only Pro and Enterprise) → Pro; Supabase backups / no pausing / 7-day logs → Supabase
  Pro "from $25/month"; H1 only: Neon above 100 CU-h → Launch $0.106/CU-hour.
- **H3:** anything that needs Workers Paid (CPU over 10 ms per request, more than 10 D1 databases, Cloudflare
  email to arbitrary recipients, longer log retention). After 2026-12-01, Workers Logs pricing changes (C8).
- **H4:** `min-instances = 1` to remove cold starts (rate Unverified); a load balancer for a Canadian custom domain
  (Unverified); **automatic overage billing** past the free tier; Neon above 100 CU-h if Neon is used.
- **All:** a 1,000-student course polling live would exhaust Vercel Hobby's 1M invocations / 4 CPU-hours within a
  few sessions (H1H2 [Estimate]) and Workers Free's 100,000 requests/day in one session (H3H4 [Estimate]); Cloud Run's
  2M free requests absorb about three such sessions a month (H3H4 [Estimate]). Supabase Free Realtime caps at 200
  peak connections. **A large course is outside every free tier** unless live updates use a cheap channel (PQ-H5).

---

## 6. Free-tier failure behaviour (pause, sleep, hard caps, surprise billing)

| Component | What happens at the limit or when idle | Duration of impact | Surprise bill? | Source (checked 2026-10-11) |
|---|---|---|---|---|
| Vercel Hobby (H1, H2) | "limited to the usage caps and cannot purchase additional usage"; "In most cases … you will have to wait until 30 days have passed before you can use the feature again" | **Up to 30 days** (hard outage of that feature) | No | https://vercel.com/docs/plans/hobby |
| Neon Free (H1, H3b, H4) | At 100 CU-h/project: "compute is suspended until the next billing period or until you upgrade". Storage over cap: writes fail. "None of these limits delete your data." Idle: scale to zero after 5 min (cannot disable), wakes "within a few hundred milliseconds" (vendor claim) | Rest of month unless upgraded (needs a card) | No (until upgraded) | https://neon.com/docs/introduction/plans ; https://neon.com/docs/introduction/scale-to-zero |
| Supabase Free (H2, H4-CA) | Over quota: notification and grace period, then possibly "Pausing projects", "read-only mode" or "402 status code for all API requests"; abuse cases "without prior notice". **Idle: "paused after 1 week of inactivity"**, one-click restore; restore window text says 1 year (screenshot says 90 days) | Pause lasts until the owner restores it | No | https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/billing-faq ; https://supabase.com/docs/guides/platform/upgrading |
| Workers Free (H3) | 100,000 requests/day → "Error 1027" (fail closed) or the Worker is bypassed (fail open). 10 ms CPU per request. D1/Hyperdrive/Durable Objects over limit: operations "fail with an error". No idle pausing found (absence is not proof, Unverified) | **Until 00:00 UTC** (daily reset) | No | https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/hyperdrive/platform/pricing/ |
| Workers Paid (H3) | USD 5 minimum, then metered overage ($0.30/M requests, $0.02/M CPU-ms; D1 $0.001/M rows read, $1.00/M rows written) | No outage | Small, metered | https://developers.cloudflare.com/workers/platform/pricing/ |
| Cloud Run on a paid billing account (H4) | "If you have a Paid billing account and go beyond those limits, then you will be billed for the overage". Alerts-only budgets do **not** cap spend: "doesn't automatically cap Google Cloud … usage or spending" **[J]**. A "spend cap budget" exists for *eligible* services: "When enforced, the specified services are paused until you manually lift the cap" **[J]** — whether Cloud Run is eligible is **Unverified** | No outage; or a pause if a spend cap is enforced | **Yes, possible** | https://docs.cloud.google.com/free/docs/free-cloud-features ; https://docs.cloud.google.com/billing/docs/how-to/budgets |
| Cloud Run idle | Scales to zero by default; next request cold-starts (duration Unverified). Never deleted for inactivity | Seconds on first request (Unverified) | No | https://docs.cloud.google.com/run/docs/configuring/min-instances |
| Amazon SES (all options, per O1) | New accounts start in the **sandbox**: verified recipients only, 200 messages/24 h, 1/s, until production access is granted. **AWS Free-plan accounts "close on [their] own 6 months after you open [them] or when your credits run out"** **[J]** | Sign-in breaks if the account closes or stays in the sandbox | Paid plan: per-use ($0.10/1,000) | https://aws.amazon.com/free/ **[J]**; SES sandbox per O1 |
| Resend Free (fallback email) | 3,000/month **but 100/day** | Rest of the UTC day | No | https://resend.com/pricing |
| GitHub Actions Free (private repo) | "usage is blocked once you use up your quota" without a payment method | Rest of month | No | https://docs.github.com/en/billing/concepts/product-billing/github-actions |

**Reading (inference).** Two failure styles exist. **Hard stop, no bill:** Vercel Hobby (worst: up to 30 days), Neon
(rest of month), Workers Free (until midnight UTC; mildest). **Keep running, bill automatically:** Cloud Run. Supabase
sits between (grace, then restrictions) but adds the **idle pause**, which matters for a *public* prototype that may
see no traffic for a week (for example between terms or before a demo). Which style the owner prefers is PQ-H4.

**Mitigations that apply whichever option is chosen (PROPOSAL):** a weekly synthetic sign-in check that also counts as
activity (whether Supabase treats scheduled pings as activity, or as circumvention, is **Unverified** — ask Supabase
before relying on it); usage alerts on every vendor that offers them; email sign-in on SES Paid-plan with production
access granted before launch; on GCP, a project spend-cap if Cloud Run is eligible, otherwise a Pub/Sub budget
notification that disables billing (documented pattern **[J]**) plus a low `max-instances`.

---

## 7. Credibility and always-on availability (§8 "calm and credible"; owner: "polished and credible")

CONTRIBUTING sets no availability or latency target (PQ-H6). "Credible" is judged here as: custom domain with TLS,
no sleeping site, no multi-second first load, no mid-class outage.

| | H1 | H2 | H3a | H3b | H4 |
|---|---|---|---|---|---|
| Custom domain + TLS on the free plan | Yes | Yes | Yes | Yes | US: Preview domain mapping ("not production-ready"); Canada: Firebase Hosting or LB needed |
| Idle behaviour | Neon wakes in "a few hundred ms" (vendor claim) | Always-on DB; **pauses after a week idle** | No sleeping found | Neon wake | **Container cold start** (Unverified, likely seconds for Next.js) + DB wake if Neon |
| Mid-class outage risk | Vercel/Neon caps → long outage | Vercel caps → long outage | Daily request cap if live mode polls | same | Low (bills instead) |
| Live updates in class (§7.8; PQ-H5) | Polling burns CPU-hours; Vercel WebSockets are beta and end at 300 s | same; Supabase Realtime 200 peak | **Durable Objects + WebSockets**, cheap and native | same | One instance with high concurrency, or polling with ETags |
| Score (0–5, §13) | 3.5 | 3.5 | 4.5 | 4 | 3 |

**Proposal for any option:** design presentation mode and vote totals around **cached aggregate reads with short
polling and ETags** first (cheap everywhere, no identity in the response), and treat push updates as a later
enhancement once PQ-H5 is answered.

---

## 8. Privacy-family support (A / B / C), integrating S0's data-access design

Q9 (the mechanism) is **open**; nothing here picks it. What the sibling privacy notes say, as context: privacy-A
proposes one Postgres with **no author column**, per-item keyed tags `HMAC(K_c, …)`, a per-course key `K_c` stored
only wrapped, and SECURITY DEFINER functions as the narrow internal API (≈13–17 Claude sessions, unmeasured).
Privacy-B proposes ~8 databases and 8–9 services with a delayed credit queue (≈29–39 sessions, unmeasured) and itself
suggests adopting B's *principles* on any platform and choosing "B-full" only if the owner wants protection against
the operator. The C note is an empty skeleton. **So the hosting choice must keep A fully available and B reachable.**

| Capability (requirement it serves) | H1 Vercel + Neon | H2 Vercel + Supabase | H3a Workers + D1 | H3b Workers + Hyperdrive + PG | H4 Cloud Run + PG |
|---|---|---|---|---|---|
| **A**: roles by SQL, GRANT/REVOKE, ENABLE+FORCE RLS, SECURITY DEFINER with pinned `search_path` (§6.2 "restricted service roles", "narrowly scoped internal APIs") | **Yes.** Create app roles by SQL, never via Console (Console/API roles join `neon_superuser`: BYPASSRLS, `pg_read_all_data`) | **Yes.** Custom roles via `role.projectref`; `postgres` (dashboard) is admin with `bypassrls` (per privacy-A, roles page) → operator-only | **No** (SQLite: no roles, schemas or RLS; §12 known issue confirmed) | **Yes** | **Yes** |
| Per-domain credentials through the pooler (S0 §4.1) | PgBouncer transaction mode, pools per user+DB; `SET`/`RESET` unsupported → `set_config(…, true)` inside a transaction | Supavisor transaction mode, no prepared statements → `prepare: false` | Bindings per Worker (no DB users) | One Hyperdrive config per DB user; `SET` inside a transaction works; `RESET` on return | Any pooler or direct; same helper |
| **B**: physically separate DBs with separate credentials (§6.1 "technically separated") | **Strong**: 100 free projects (each 1 GB, 100 CU-h, own cold start) | **Weak on Free**: 2 active projects; ≈ $10/month per extra project on Pro | **Strong**: 10 DBs Free (one environment), 50,000 Paid | Strong (Neon projects) | Strong (separate projects/providers) |
| **B**: separate secrets per code path, platform-enforced | Separate **Vercel projects** (200 on Hobby); env vars are per project, not per function; internal calls over public HTTPS, signed | Same as H1 | **Strongest**: per-Worker secrets hidden after set; binding-only Workers have no public route | Same as H3a | Per-service service accounts + Secret Manager (per-secret IAM: standard GCP, **Unverified** here) |
| Delayed / batched event processing (§6.2; privacy-B random delay) | DIY (cron + table); Vercel cron limits on Hobby **Unverified** | DIY, or `pg_cron` (availability on Free **Unverified**) | **Queues** on Free (10,000 ops/day) | Queues | Cloud Tasks / Pub/Sub (free quotas Unverified) |
| Key custody for `K_c` (privacy-A K2/K3) | K3: KEK in a Vercel env var (Secret type), DB holds only wrapped keys | K2 Supabase Vault, **or** K3 (portable; preferred by privacy-A for portability) | Per-Worker secret | K3 | K3, later KMS (K4) |
| **C**: client crypto needs strict CSP, no key material in logs | CSP via headers/config; host can serve altered JS (threat model) | same | CSP on every response | same | same, full header control |
| Preview / branch data safety (§6.2; PQ-9) | **Neon branches copy all parent data by default** → seed-only parents or schema-only branches | Supabase branches start empty by default | Version URLs **hit production D1** → don't use them for privacy Workers | Neon risk as H1 | Revision tags + Neon/Supabase branches (Unverified details) |
| Operator / vendor can join everything? (§6.4; PQ-H2) | Yes (one account) | Yes | Yes | Yes | Yes |

**Score (0–5, §13):** H1 **4.5**, H2 **4.0**, H3a **2.5**, H3b **4.5**, H4 **5.0**. Rationale: H4 supports A and B fully
with the most portable primitives; H1/H3b are strong on B but carry Neon's console-role caveat; H2 is full on A but
weak on B at $0; H3a forecloses A.

**Requirements-driven proposals that hold on every option (from S0/H1H2/H3H4, adopted):**
1. Separate LOGIN role and secret per domain; runtime roles never own tables; FORCE RLS; no cross-domain foreign keys
   (they create a covert channel, PostgreSQL RLS docs, via S0); `REVOKE ALL … FROM PUBLIC` on every SECURITY DEFINER
   function in the same transaction.
2. `gen_random_uuid()` (v4) for anonymous-content IDs, never serial and never `uuidv7()` (it embeds a millisecond
   timestamp extractable with `uuid_extract_timestamp`) — §9 "predictable identifiers". (NQ-S0-8 stays open.)
3. Better Auth `storeToken: "hashed"`, UUID IDs, tables only in the identity schema (S0, A1).
4. One full-database dump would hold identity and content together: **back up per domain with separate keys**
   until PQ-4 (are backups "exports"?) is answered.
5. Never use `drizzle-kit push` on shared databases; never give runtime code the owner/migration URL.

---

## 9. Platform logs and what they reveal (§3, §6.2, §9 "logs")

| Platform | What is recorded | Retention | Can it be turned off? | Who can read it | Source (checked 2026-10-11) |
|---|---|---|---|---|---|
| **Vercel runtime logs** (H1, H2) | Method, **path, search params**, host, **user agent**, region, cache, outgoing requests, all `console.*`; the "logs from your browser" filter matches **IP + user agent**, so IP is held | **Hobby 1 hour**; Pro 1 day; 30 days with Observability Plus; build logs indefinitely | Not documented (Unverified) | Team members with project access; Vercel staff "based on their job function" (DPA) | https://vercel.com/docs/logs/runtime ; https://vercel.com/docs/limits ; https://vercel.com/legal/dpa |
| **Vercel Routing Middleware** (Next.js `proxy.ts`) | Same log stream; "runs globally before the cache" **[J]**; deployed "to all regions by default, regardless of your region settings" (fact-check) | as above | Avoid by not using `proxy.ts` | as above | https://vercel.com/docs/routing-middleware **[J]** ; https://vercel.com/docs/functions/configuring-functions/region |
| **Supabase**, server-side use only (H2, H4-CA) | Gateway sees the *server's* IP, not students'. `postgres_logs`: statement text and errors "can appear in `event_message`". `auth_logs` only if Supabase Auth is used (not proposed) | Free 1 day; Pro 7 days | `log_statement` etc. settable via supautils (per privacy-A); gateway logging off: not documented | Project members | https://supabase.com/docs/guides/observability/log-field-reference ; https://supabase.com/pricing |
| Supabase **Data API from the browser** (H2c, rejected) | `request.path`, query string, `cf-connecting-ip`, city/lat/long/postal code; filterable by "API Gateway JWT subjects" | 1 / 7 days | No | Project members | same + https://supabase.com/docs/guides/telemetry/logs |
| **Neon** (H1, H3b, H4) | Connections come from servers, so no end-user IPs. Neon-side query logging and staff access **Unverified** | Unverified | Unverified | Unverified | — |
| **Cloudflare Workers Logs** (H3) | Invocation logs "contain details such as the Request, Response, and related metadata", custom logs, errors. **Exact fields (IP, headers, cookies) not documented** | Free 3 days; Paid 7 days | **Yes, per Worker**: `invocation_logs = false`; sampling via `head_sampling_rate` | Account members (roles Unverified) | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ |
| **Cloud Run** (H4) | Request logs "are created automatically"; "you cannot control the amount of request logs directly from Cloud Run"; stdout/stderr captured. `httpRequest` fields (remote IP, user agent) **Unverified** (reference page 404) | `_Default` 30 days, configurable **1–3650 days**; `_Required` 400 days (project admin activity) | **Exclusion filters** in Cloud Logging; `_Default` sink can be modified or disabled | IAM-governed (Unverified details) | https://docs.cloud.google.com/run/docs/logging ; https://docs.cloud.google.com/logging/quotas ; https://docs.cloud.google.com/logging/docs/routing/overview |
| **Email provider** (all) | SES: no documented body store; event records only if you configure destinations; open/click tracking off unless configured (per O1). Resend stores bodies 30 days (per O1) | per provider | SES: tracking opt-in | Account members; recipient's mail admins (UW message trace, per O1) | per O1 note |

**Score (0–5, §13):** H1 **4**, H2 **4**, H3a/H3b **4**, H4 **3.5**. Vercel's 1-hour Hobby retention limits exposure but
cannot be turned off; Cloudflare can switch logs off per Worker but does not document the fields; Cloud Run logs by
default for 30 days but can exclude and shorten.

**Proposals (all options):** never put identity or content in URLs or query strings (POST bodies only); a field
allow-listing logger; no `console.log` of request bodies; Drizzle logger off in production (it receives `params`);
**no `proxy.ts` on Vercel in the prototype** (CSP via static headers; authorization stays in the DAL, per S0), so no
code runs outside `yul1`; no third-party error-reporting SDK in the prototype (Sentry collects IP and request bodies
by default, C6) unless NQ-S0-2 allows it; capture one real log entry per platform before launch and make its field list
part of the threat model (Q8) and of the §9 log negative tests; treat IP + timestamp as potentially identity-bearing
until PQ-H3 is answered. AI agents get no production log access (PQ-8): Vercel exposes runtime logs to agents via MCP
(per H1H2).

---

## 10. Developer experience and mainstream-ness (solo builder with Claude)

| Factor | H1 | H2 | H3a | H3b | H4 |
|---|---|---|---|---|---|
| Framework mainstream-ness (Stack Overflow 2026, n=10,281, via S0) | Next.js 20.6% | Next.js 20.6% | React Router framework mode (Remix 1.7%; React 41.5%) | same | Next.js 20.6% |
| Database mainstream-ness | PostgreSQL 57.9% (SO 2026, via S0) | same | SQLite dialect (D1) | PostgreSQL | PostgreSQL |
| Local dev identical to prod | Plain Postgres in Docker (no Neon emulator found) | `supabase start` full local stack, or plain Postgres | `wrangler dev` (Miniflare/workerd), local D1 | Local Postgres + Hyperdrive wiring (Unverified) | **Docker Compose: same image, same Postgres, same roles** |
| Deploy from Git + PR previews | Vercel Git integration, previews with Vercel Authentication on Hobby (**personal repos only**: Hobby cannot connect GitHub-organisation repos) | same | Workers Builds previews | same | DIY: GitHub Actions → Artifact Registry → Cloud Run (Workload Identity Federation, Unverified details) |
| Moving parts for one person | 2 vendors | 2 vendors | 1 vendor but ~6 Workers + 6 DBs for design B | 2 vendors + multi-Worker | GCP IAM, Dockerfile, registry cleanup, domain routing, budgets |
| Windows (owner's OS) | Fine (Node) | Fine; `supabase start` needs Docker | OpenNext "Windows full support is not guaranteed"; React Router + Vite plugin on Windows Unverified | same | Docker Desktop/WSL (Unverified on this machine) |
| Claude-familiar patterns | Highest | Highest | Lower (bindings, RPC, D1) | Medium | High (plain Node) |
| Agent-readable docs | Vercel, Neon, Next.js publish llms-style docs (per H1H2/S0) | Supabase docs | Cloudflare `llms.txt` (per H3H4) | same | GCP docs (not checked) |
| **Score (0–5)** | **4.5** | **4.5** | **3** | **3** | **3.5** |

**Framework-level caution (S0, verified):** Next.js has a record of critical advisories (CVE-2025-66478, CVSS 10.0,
2025-12-03) and an out-of-band security update is scheduled for **2026-10-14** for "two Critical and one High"
upstream vulnerabilities (https://nextjs.org/blog, checked 2026-10-11). Better Auth published 10 security advisories
between 26 Jun and 30 Sep 2026, two Critical (per A1). **Proposal:** Dependabot on, pin versions, patch within days,
and make "upgrade and redeploy" a documented runbook step (§11 deployment documentation).

---

## 11. Lock-in, production migration path (§10–§11) and Canadian residency

**What §10–§11 require of the hosting choice:** institutional sign-in (SSO; Q4), provisioning "through supported
integrations" (LTI 1.3 per A2; Q5), the database, deployment documentation. **Where** production runs is not stated.
A2 found that LEARN integration needs UW's LEARN team, Privacy Officer and Information Security Officer review "prior
to integration with LEARN", and an IRA-PIA that "typically takes 2–4 weeks" (https://uwaterloo.ca/privacy/information-risk-assessment,
checked 2026-10-11 by that branch). A review can impose hosting conditions nobody knows yet; portability is the
insurance (inference).

| | H1 | H2 | H3a | H3b | H4 |
|---|---|---|---|---|---|
| Compute lock-in | Low: `next start`/Docker; avoid `@vercel/functions` and WebSockets beta | Low (same) | **High**: bindings, RPC, Queues, Durable Objects | Medium: Workers APIs; keep domain logic in plain TS modules | **Very low**: OCI image runs on any cloud or an institution's servers |
| Data lock-in | Low: plain Postgres (`pg_dump`) | Low if H2a (plain Postgres); Vault (K2) would add Supabase lock-in → prefer K3 | **High**: SQLite dialect, per-store ports | Low | Low |
| Canadian compute | `yul1` possible (but H1 co-locates in `iad1` for the DB) | **`yul1`** | **No** | **No** (edge) | **`northamerica-northeast1/2`** |
| Canadian data at rest | **No** (Neon has no CA region; region immutable) | **Yes** (`ca-central-1`) | **No** (no CA hint/jurisdiction) | Only with a Canadian Postgres (Supabase variant; Unverified with Hyperdrive) | **Yes** with Supabase (H4-CA) |
| Vendor metadata location | Vercel: "primary processing facilities are in the United States"; backups "globally replicated" (DPA) | same | Cloudflare global network; Data Localization Suite reported Enterprise-only (H3H4; not re-checked by fact-check) | same | GCP: DPA visible text has no location commitment **[J]** (rest truncated; Unverified) |
| Paid "in place" path | Vercel Pro + Neon Launch | **Vercel Pro + Supabase Pro in `ca-central-1`** | Workers Paid | Workers Paid + Postgres | Cloud Run + Supabase Pro / Cloud SQL (price Unverified) |
| Move to institution-hosted | Container + any Postgres 15+ | same | Rewrite data layer + service wiring | Re-target compute | **Redeploy the image** |
| **Score (0–5)** | **3** | **4.5** | **1.5** | **2.5** | **5** |

**Canadian data residency — PROPOSED open question (merges NQ-S0-1, H1H2 PQ-1, H3H4 PQ-H1, privacy-B PNQ-B12):**
*"Must the prototype and/or production keep application processing and stored data in Canada (or on
institution-hosted infrastructure)? If yes, which data: database only, or also platform logs, backups and email
metadata?"* Nothing in CONTRIBUTING requires it, and I did not find a UW rule on it in the inputs (UW policy not
checked). Options and their honest residency reach:

| Option | Database at rest | Function compute | Platform logs / metadata | Email |
|---|---|---|---|---|
| H2 (recommended) | Canada | Canada (`yul1`), **if `proxy.ts` is not used** | US-primary (Vercel DPA); TLS terminates at Vercel's global edge | SES `ca-central-1` (whether all processing stays in-region is Unverified, per O1) |
| H4-CA (fallback) | Canada | Canada | GCP logs in the project's log buckets (bucket region configurable: Unverified here) | same |
| H1, H3a, H3b | Not in Canada (unless the H3b Supabase variant) | US / edge | US / global | same |

So **no free option gives end-to-end Canadian residency** for every byte (vendor metadata, edge TLS termination,
support access). H2 and H4-CA keep the *database* and *compute* in Canada, which keeps the most doors open (inference).

---

## 12. Terms-of-service and contract risks

| Vendor / plan | Restriction or contract fact (quoted) | Risk for ClearCourse | Source (checked 2026-10-11) |
|---|---|---|---|
| **Vercel Hobby** | "Hobby teams are restricted to non-commercial personal use only." Commercial = "financial gain of anyone involved in any part of the production of the project, including a paid employee or consultant writing the code". "Asking for Donations does not fall under commercial usage." | **High.** Whether a free public pilot with real courses is "personal, non-commercial" is an owner/legal question. It becomes commercial if anyone is paid to build or run it (UW duties, a grant, a contract, a startup) — interpretation, Unverified. Vercel says to contact support if unsure | https://vercel.com/docs/limits/fair-use-guidelines |
| Vercel DPA | Applies "for Customers who are on Enterprise and Pro plans"; "primary processing facilities are in the United States" | **High** if a DPA is required before real student data (PQ-3). Hobby has none | https://vercel.com/legal/dpa |
| Vercel Hobby, Git | Cannot connect projects to repositories owned by GitHub organizations | Low; keep the repo personal | https://vercel.com/docs/limits |
| Supabase | No Free-plan non-commercial clause; use "limited to Customer's internal business purposes" (typical SaaS wording; reading it as permitting a public app is an Unverified interpretation); DPA "incorporated into this Agreement"; California law | Low–medium | https://supabase.com/terms |
| Neon | Terms schedule (updated 2026-08-05) has no Free non-commercial clause; "subject to … the Databricks Master Cloud Services Agreement" (MCSA not fetched; DPA applicability to Free Unverified) | Medium (unknowns) | https://neon.com/terms-of-service |
| **Cloudflare** | Developer Platform terms (updated 2026-09-28): no non-commercial clause found; may limit requests that put "an undue burden" on the network; may change `workers.dev` subdomains. **DPA "forms part of the Main Agreement"**, which includes the "Self-Serve Subscription Agreement"; effective "from the date on which Customer signed or the parties otherwise agreed"; Version 6.4, effective April 3, 2026 **[J]** | **Low** | https://www.cloudflare.com/service-specific-terms-developer-platform/ ; https://www.cloudflare.com/cloudflare-customer-dpa/ **[J]** |
| **Google Cloud** | Visible Terms text has **no non-commercial restriction**; forbids using the Services "in a manner intended to avoid incurring Fees (including creating multiple … Projects …) or to circumvent Service-specific usage limits or quotas"; references the Cloud Data Processing Addendum, which "is incorporated into the Agreement(s)". Whether online self-serve terms incorporate it was not visible (page truncated) **[J]** | Low–medium. Note: splitting into many projects to stay in free quotas could breach the anti-circumvention clause (inference) | https://cloud.google.com/terms ; https://cloud.google.com/terms/data-processing-addendum **[J]** |
| Firebase Hosting (H4-CA domain) | "Firebase Hosting is not covered by Google Cloud Terms of Service" (fact-check) | Medium: a second contract for the H4-CA front door | https://docs.cloud.google.com/run/docs/mapping-custom-domains |
| Render Free / Railway | "Do not use them for production applications"; Railway Hobby positioned "for solo developers and side projects" | Rejected anyway | https://render.com/docs/free ; https://railway.com/pricing |
| AWS (SES) | Free plan: "Limited to select services only"; account "closes on its own 6 months after you open it or when your credits run out" **[J]** | Medium: create the SES account on the **Paid plan** | https://aws.amazon.com/free/ **[J]** |

**Score (0–5, §13):** H1 **2**, H2 **2.5**, H3a/H3b **4**, H4 **3.5**.

---

## 13. Scored matrix and sensitivity

**Weights (PROPOSAL; derived from the owner's constraints and §6; the owner may re-weight):** privacy-architecture fit
20 · cost vs <$5 15 · DX/mainstream 15 · lock-in & production path 15 · failure behaviour 10 · credibility 10 · ToS &
contracts 10 · platform logs 5 = 100.

**Scores (0–5; 5 best).** Rationale for each cell is in §5–§12.

| Criterion (weight) | H1 Vercel + Neon | **H2 Vercel + Supabase-as-PG** | H3a Workers + D1 | H3b Workers + Hyperdrive + PG | **H4 Cloud Run + PG** |
|---|---|---|---|---|---|
| Privacy fit (20) | 4.5 | 4.0 | 2.5 | 4.5 | 5.0 |
| Cost vs target (15) | 3.5 (CU-hour cliff) | 4.5 | 3.5 (Free if 10 ms fits; else $5.97) | 3.0 | 3.5 (Canadian routing line unknown) |
| DX / mainstream (15) | 4.5 | 4.5 | 3.0 | 3.0 | 3.5 |
| Lock-in & production path (15) | 3.0 | 4.5 | 1.5 | 2.5 | 5.0 |
| Failure behaviour (10) | 2.0 | 3.0 | 3.5 | 3.5 | 2.5 |
| Credibility / always-on (10) | 3.5 | 3.5 | 4.5 | 4.0 | 3.0 |
| ToS & contracts (10) | 2.0 | 2.5 | 4.0 | 4.0 | 3.5 |
| Platform logs (5) | 4.0 | 4.0 | 4.0 | 4.0 | 3.5 |
| **Weighted total (/100)** | **70.0** | **78.5** | **62.0** | **70.5** | **77.5** |

(Weighted total = Σ score × weight ÷ 5. Example H2: 4.0×20 + 4.5×15 + 4.5×15 + 4.5×15 + 3.0×10 + 3.5×10 + 2.5×10 +
4.0×5 = 392.5 → 78.5.)

**Sensitivity (each scenario changes only the cells named):**

| Scenario (owner answer) | Cells changed | H1 | H2 | H3a | H3b | H4 | Leader |
|---|---|---|---|---|---|---|---|
| Base case | — | 70.0 | **78.5** | 62.0 | 70.5 | 77.5 | H2 (narrowly) |
| **S1: Vercel Hobby ineligible or a DPA is required** (→ Vercel Pro $20) | H1/H2 cost → 1; ToS → 4 | 66.5 | 71.0 | 62.0 | 70.5 | **77.5** | **H4** |
| **S2: Canadian residency required now** | H1 lock-in → 1, H3a → 0.5, H3b → 1; H2 lock-in → 4; H4 cost → 3 | 64.0 | **77.0** | 59.0 | 66.0 | 76.0 | H2 ≈ H4 |
| **S3: protect against the operator too (B-full)** | privacy: H1 5, H2 3, H3a 4.5, H3b 5, H4 5 | 72.0 | 74.5 | 70.0 | 72.5 | **77.5** | **H4** |
| S4: owner prefers a hard stop over any surprise bill | H4 failure → 1.5 | 70.0 | **78.5** | 62.0 | 70.5 | 75.5 | H2 |
| S5: measured SSR fits Workers Free 10 ms and owner accepts React Router | H3 cost → 4.5 | 70.0 | **78.5** | 65.0 | 75.0 | 77.5 | H2 |

**Reading (inference).** H2 and H4 are effectively tied and well ahead of the rest. H2 wins on ease and cost **only
while Vercel Hobby is usable**; H4 never drops below 75.5 in any scenario, so it is the robust fallback. H1 is
dominated by H2 once Canadian placement or the CU-hour cliff matters. H3a is last because it forecloses family A and
any non-Cloudflare production. H3b is a reasonable pick only if the owner wants Cloudflare specifically (hard daily
stop, per-Worker secrets) and accepts React Router and the USD 5 minimum.

---

## 14. The unvetted advice on PDF pages 24–31: claim-by-claim verdicts

CONTRIBUTING §12 records this advice as *Advisory* and lists four known issues. Verdict key: **Agree** · **Partly** (right
direction, incomplete or overstated) · **Outdated** · **Wrong** · **Unverified** (cannot be checked on an official page).

### 14.1 Architecture, data and auth (pp. 24–27)

| # | Claim (page) | Verdict | Evidence (checked 2026-10-11) | What to do instead (PROPOSAL) |
|---|---|---|---|---|
| P1 | "Next.js (React) with Tailwind CSS. This ensures a fast, accessible, and clean user interface" (p.25) | **Partly** | Next.js is the most-used framework (20.6%, SO 2026 via S0). No framework "ensures" accessibility: Playwright says automated tests "cannot detect all types of WCAG violations" (https://playwright.dev/docs/accessibility-testing via S0). Tailwind's current version and status were not checked (**Unverified**) | Next.js, plus accessible primitives (React Aria or shadcn/ui, per S0), axe in CI, manual checks; styling library chosen at scaffold time; WCAG target is Q15 |
| P2 | Backend "Node.js with TypeScript (Express or NestJS) or Python (FastAPI)" (p.25) | **Partly** | A second app is unnecessary for the prototype: Next.js Route Handlers + a server-only DAL are the vendor's recommended pattern ("For new projects, we recommend creating a dedicated Data Access Layer", https://nextjs.org/docs/app/guides/data-security via S0) | One TypeScript codebase; a separate service only where design B needs platform-enforced secret isolation |
| P3 | "PostgreSQL. A relational database is mandatory here to enforce strict schema separation, row-level security, and complex role-based authorization" (p.25) | **Agree with the choice; "mandatory" is overstated** | PostgreSQL provides roles, RLS (with FORCE) and SECURITY DEFINER (https://www.postgresql.org/docs/current/ddl-rowsecurity.html via S0). Family B could run on D1 without RLS (privacy-B), so it is not strictly mandatory | Postgres, because it keeps family A *and* B open |
| P4 | Frontend on a CDN (Vercel/CloudFront), backend "in isolated Docker containers (e.g., AWS ECS or Google Cloud Run)" (p.25) | **Partly** | Cloud Run is viable (H4). Splitting frontend and backend doubles the deployables for no requirement | One deployable (H2), or one container (H4) |
| P5 | "the database must be split into isolated schemas. A single query must not be able to join a user's identity to their anonymous posts" (p.25) | **Partly** | Schemas alone do not stop joins: any role with privileges on both schemas can join. Isolation comes from **separate roles and grants** (plus FORCE RLS; runtime roles never own tables). Superusers and BYPASSRLS roles "always bypass" RLS (PostgreSQL docs via S0) | Per-domain LOGIN roles and secrets; catalogue assertions in CI |
| P6 | Content schema: "Posts are linked only to a generic course ID, never to an author ID" (p.26) | **Agree, incomplete** | Matches privacy-A ("no author column at all"). But upvote de-duplication (§7.7 "without double-counting a student") still needs per-student facts (privacy-A: per-item keyed tags); timestamps, WAL and physical order are side channels (privacy-A §4.1) | Q9 must cover de-duplication and timing; no `uuidv7` IDs |
| P7 | Participation counters updated by "an event" using "a secure, one-way hashed identifier" (p.26) | **Wrong as written** (§12 known issue) | A plain hash of a known user ID is reversible by hashing every enrolled user (CONTRIBUTING §12). A synchronous trigger in the posting transaction also links content and counter by time (privacy-B uses random delay and batching) | Keyed HMAC with the key outside the DB (privacy-A K3) or in a separate service (privacy-B); delay or batch crediting. Mechanism is Q9 |
| P8 | Audit schema: "An immutable log" (p.26) | **Partly** | An INSERT-only role makes it append-only for the app, not for the operator or DB owner. "Immutable" beyond grants (hash chaining, WORM) is Q14 | INSERT-only `app_audit_writer` now; stronger immutability per Q14 |
| P9 | "you should not build a custom password system" (p.26) | **Agree** | Consistent with A1 (email one-time codes now, SSO later) | Better Auth with database sessions (A1 proposal; Q4 open) |
| P10 | "SSO … using SAML or OAuth 2.0" (p.26) | **Partly (imprecise)** | "OpenID Connect 1.0 is a simple identity layer on top of the OAuth 2.0 protocol"; OAuth 2.0 alone "do[es] not define standard methods to provide identity information" (https://openid.net/specs/openid-connect-core-1_0.html) **[J]** | Say **OIDC or SAML 2.0** for sign-in; OAuth 2.0 alone is authorization |
| P11 | "For the University of Waterloo, this means integrating with Microsoft Entra ID … or WatIAM" (p.26) | **Partly** | A1: `uwaterloo.ca` is an Entra tenant federated to `adfs.uwaterloo.ca` (https://login.microsoftonline.com/uwaterloo.ca/v2.0/.well-known/openid-configuration, checked by A1). Whether UW allows user consent for an unknown app is **not published**; publisher verification needs a registered business (A1). What WatIAM offers as an IdP: **Unverified** | Prototype cannot depend on UW SSO (§12 known issue; Q4). Run A1's one-hour consent spike |
| P12 | "Secure, HTTP-only cookies storing JWTs" for sessions (p.26) | **Partly** | OWASP: Secure and HttpOnly are "mandatory"; set `SameSite=Strict` or `Lax`; "Session timeout management and expiration must be enforced server-side"; on logout "the web application must invalidate the session at least on server side"; the session ID "must be meaningless" (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) **[J]**. A self-contained JWT cannot be invalidated server-side without extra state (inference) | Opaque session ID in a `__Host-` cookie (Secure, HttpOnly, SameSite), session rows in the identity schema (Better Auth database sessions, per A1). Timeout values are an owner decision |
| P13 | "Authorization must be handled at the API route level"; "Every API request must pass through middleware" checking role and enrollment (pp.26–27) | **Partly** | Next.js: treat Server Actions "as reachable via direct POST requests and verify authentication and authorization inside each one" (https://nextjs.org/docs/app/guides/data-security via S0). Interception alone is not enough; on Vercel, `proxy.ts` also runs globally **[J]** | Check role + course + TA permission inside every DAL function (S0 §5.1); no `proxy.ts` for authorization |
| P14 | "TAs require dynamic permission checks … on a per-course basis" (p.27) | **Agree** | §5: TAs exercise "the specific permissions an instructor assigns" | Per-course permission table checked in the DAL |

### 14.2 Hosting and pricing (pp. 27–31)

| # | Claim (page) | Verdict | Evidence (checked 2026-10-11) | Corrected view |
|---|---|---|---|---|
| P15 | Hosting: provider runs servers, but "you are still responsible for configuring the database, securing the network rules, deploying updates, and managing backups … not completely hands-off unless you use a fully managed" PaaS (pp.27–28) | **Agree, with a correction** | Even managed free tiers leave backups to you: Supabase Free has **no backups** ("regularly export … using the Supabase CLI `db dump`", https://supabase.com/docs/guides/platform/backups via H1H2); Neon Free history is 6 hours | Nightly per-domain encrypted dumps from CI on every option |
| P16 | Cloudflare: "Cloudflare Pages to host the Next.js frontend, Cloudflare Workers for the backend API, and Cloudflare D1" (p.28) | **Outdated** | "Cloudflare recommends vinext as the default way to run Next.js applications on Cloudflare Workers"; "vinext is in beta" (https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) | On Cloudflare, use React Router on Workers (S0); D1 conflicts with family A (§12 known issue) |
| P17 | "Everything is deployed automatically when you push code to GitHub" (p.28) | **Agree** | Workers Builds creates previews for non-production branches (https://developers.cloudflare.com/workers/ci-cd/builds/ via H3H4) | Note: Version URLs share production resources, so they would hit production D1 |
| P18 | Cloudflare "Operational Work: Very low … no virtual servers or network configurations" (p.28) | **Partly** | True for servers. But Free has a "10 ms" CPU limit per request and 100,000 requests/day (https://developers.cloudflare.com/workers/platform/limits/); design B means ~6 Workers + 6 DBs to wire | Low ops, real design constraints |
| P19 | "To get production limits and D1 database access, you need the Workers Paid plan" (p.29) | **Wrong** | "D1 is available on both the Workers Free and Workers Paid plans" (https://developers.cloudflare.com/workers/platform/pricing/) | D1 on Free: 10 DBs, 500 MB each |
| P20 | "a flat $5/month" (p.29) | **Wrong framing** | "a minimum charge of $5 USD per month for an account", plus metered overage (same URL) | USD 5 **minimum** ≈ CAD 7.14 **[J]**; meets but does not beat the target |
| P21 | "covers 10 million backend requests" (p.29) | **Agree, incomplete** | 10M requests included, +$0.30/M; CPU billed separately: 30M CPU-ms included, +$0.02/M (same URL) | — |
| P22 | "25 billion database reads" (p.29) | **Right number, wrong unit** | D1 includes 25 billion **rows read**/month, +$0.001/M rows; writes 50M rows, +$1.00/M (same URL) | Unindexed scans consume rows fast; index everything |
| P23 | "5 GB of database storage" (p.29) | **Agree** | "First 5 GB included + $0.75 / GB-mo" (same URL); Free also 5 GB total | — |
| P24 | "Costs only increase slightly if you exceed those massive limits" (p.29) | **Unverifiable as stated** | Overage rates above are small at prototype scale; Workers Logs pricing changes "Beginning December 1, 2026" (same URL) | Re-check after 2026-12-01 |
| P25 | AWS: frontend "on AWS Amplify or S3/CloudFront", backend "using AWS App Runner or ECS", "Amazon RDS" (p.29) | **Outdated** | "AWS App Runner is no longer open to new customers"; AWS recommends "Amazon ECS Express Mode", which provisions "an ECS service on Fargate, an Application Load Balancer, auto scaling, and networking" (https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html) **[J]** | App Runner is not an option for a new account |
| P26 | AWS "Operational Work: High … VPCs, security groups …" (p.29) | **Plausible (opinion)** | Consistent with ECS Express Mode creating an ALB, networking and IAM roles **[J]**; effort not measurable | Agree for a solo builder |
| P27 | AWS minimal setup "around $30 to $50 per month"; Multi-AZ RDS "over $70/month" (p.29) | **Unverified** | AWS pricing pages were not machine-readable in this research; the AWS Free Tier is now "up to $200" in credits over 6 months, and Free-plan accounts close after 6 months (https://aws.amazon.com/free/) **[J]**. ECS Express Mode includes an ALB (price Unverified) | Do not use these figures; AWS is not proposed for the prototype |
| P28 | "the Cloudflare stack … or a modern PaaS like Vercel paired with a Supabase database is highly recommended over bare AWS" (pp.29–30) | **Partly** | Agree on avoiding bare AWS. But D1 conflicts with family A, and Vercel Hobby is "restricted to non-commercial personal use only" with no DPA (§12) | H2 conditional on the Hobby gate; H4 as fallback |
| P29 | PaaS "handle the build process, SSL certificates, and public domains automatically" (pp.30–31) | **Partly** | True for Vercel and Cloudflare. Cloud Run domain mapping is Preview, "not recommended for production", and not in Canadian regions; Railway Free has "0 custom domains" | Check domain support per plan and region |
| P30 | "Vercel is free for hobby projects" (p.31) | **Incomplete** | Hobby is "for personal, non-commercial use", "limited to the usage caps and cannot purchase additional usage", up to 30-day lockout, no DPA, 1-hour logs (https://vercel.com/pricing ; https://vercel.com/docs/plans/hobby ; https://vercel.com/legal/dpa) | Owner must answer PQ-J2 |
| P31 | Supabase "for the PostgreSQL database and authentication" (p.31) | **Partly** | Supabase Auth stores users in the `auth` schema of the same database (https://supabase.com/docs/guides/auth/architecture); SAML is Pro-only; built-in SMTP sends "2 messages per hour" to team members only | Supabase as Postgres only; identity in our own schema via Better Auth |
| P32 | Supabase free tier "500 MB Postgres database" (p.31) | **Agree** | "500 MB database size" (https://supabase.com/pricing) | — |
| P33 | "up to 50,000 monthly active users" (p.31) | **Agree, but it is an Auth quota** | 50,000 Auth MAU; SAML "Not included" on Free (same URL) | Irrelevant if Supabase Auth is not used |
| P34 | "The database will pause after 7 days of inactivity" (p.31) | **Agree** | "paused after 1 week of inactivity" (same URL); what counts as activity is undocumented | Weekly synthetic check; ask Supabase whether it counts (§6) |
| P35 | "perfect for a zero cost public prototype" (p.31) | **Misleading by omission** | No backups on Free; 2 active projects; pausing; Data API default grants (being changed to opt-in); email limits (H1H2 §5.2) | Zero cost is achievable with the H2 hardening list (§15) |
| P36 | Railway: "pay as you go … starting at $5 per month, which includes a $5 usage credit"; "always on prototype … between $10 and $20 per month" (p.31) | **Partly** | Hobby "$5 / month", "includes $5 of resource usage per month"; a Free plan exists ($1 credit, "0 custom domains") (https://docs.railway.com/reference/pricing/plans ; https://railway.com/pricing). $10–20 is plausible from unit prices but unmeasured; no Canadian region | Not proposed (≥ target) |
| P37 | Railway "builds it automatically without requiring Docker configurations" (p.31) | **Unverified** | Not checked by any branch | — |
| P38 | Render: "free database expires after 30 days"; web services "spin down after 15 minutes" (p.31) | **Agree, and worse** | Free DB expires after 30 days, 14-day grace, then "Render deletes the database (along with all of its data)"; no backups; spin-up "takes about one minute" (https://render.com/docs/free) | Not proposed |
| P39 | Render paid "7 … ( web service and $6 for the database)" (p.31) | **Unverified** | https://render.com/pricing loads prices dynamically; no figures returned | — |
| P40 | (Omissions across pp.24–31) | **Gap** | No mention of data residency, vendor logs, DPAs, email delivery, LTI, backups-as-exports, or preview-data leaks | Covered in §6–§12 and §20 |

---

## 15. Recommended prototype stack (PROPOSAL; owner approval and an ADR required)

### 15.1 The gate (answer before the ADR)

1. **PQ-J2:** Is the project "non-commercial personal use" under Vercel's definition? Is anyone paid to build or run
   it, or is commercialisation intended? (Ask Vercel support in writing, as H1H2 proposes.)
2. **PQ-J3 (= H1H2 PQ-3 / fact-check PQ-FC-3):** Must a signed or incorporated DPA cover every processor before real
   UW users sign in?

If both answers allow Vercel Hobby → **Stack R (H2)**. If either fails → **Stack R-fallback (H4-CA)**, same code.
If the owner also wants operator-proof privacy (PQ-H2 "yes") → still H4-CA, built as separate services (§16).

### 15.2 Stack R, layer by layer

| Layer | Proposal | Why (requirement / constraint) | Key evidence |
|---|---|---|---|
| Language | **TypeScript** everywhere (one language for UI, DAL, migrations tooling, tests) | Solo builder, mainstream; S0 | SO 2026 via S0 |
| Framework | **Next.js 16.x App Router, Node.js runtime only**; no Edge; **no `proxy.ts`**; S0 §5.1 rules (server-only domain modules, explicit Route Handlers, DTO-only, no `"use cache"` in per-user domains, identity/content-free errors). Pin a release that includes the 2026-10-14 out-of-band fix | §6.2, §9 API negative tests, §8 polish; Routing Middleware runs globally **[J]** | https://nextjs.org/blog ; https://vercel.com/docs/routing-middleware |
| UI primitives | React Aria or shadcn/ui (S0); axe in Playwright; manual checks | §8 accessibility (target Q15) | S0 §3.1 |
| Validation | **Zod 4** (4.6) at every boundary; one env schema per domain | §6.2 narrow APIs | https://zod.dev/ via S0 |
| Auth (input to Q4 only) | **Better Auth**, database sessions in the identity schema, opaque `__Host-` cookie, `storeToken: "hashed"`, UUID IDs; email one-time codes restricted to admin-configured domains (A1); "Sign in with Microsoft" only if A1's consent spike succeeds | §10 "sign in securely"; OWASP **[J]** | A1; OWASP cheat sheet |
| Data access | **Drizzle ORM** (0.45.x stable; re-check v1 at ADR time, NQ-S0-7); **one Drizzle instance + pool + LOGIN role + secret per privacy domain**; `postgres.js` or `pg` with `prepare: false` through Supavisor transaction mode; context via `set_config(…, true)` inside a transaction helper; Drizzle logger off in production. Fallback: Kysely | §6.2 restricted service roles | S0 §4–§5; Supabase connecting docs |
| Migrations | `drizzle-kit generate` for tables + **hand-written `--custom` SQL** for roles, grants, ENABLE+FORCE RLS, policies, SECURITY DEFINER functions, default privileges; applied **only from GitHub Actions** in a protected environment with the owner URL; never `push`; CI catalogue assertions (pgTAP or SQL-in-Vitest) | §9 negative tests; §14 secrets | S0 §4.2, §5.3 |
| Database | **Supabase Free, `ca-central-1`, Postgres only**: Data API **disabled**; default privileges revoked; no Supabase Auth, no `supabase-js`, no Vault (use privacy-A's portable K3 key wrapping unless the owner accepts Supabase lock-in for K2); app roles created by SQL; `postgres`/dashboard treated as operator-only | §6 family A; Canadian option; lowest lock-in | H1H2 §5; privacy-A §2.5, §8.2 |
| Host | **Vercel Hobby, functions in `yul1`**, repo under a personal GitHub account; Preview deployments use a **separate synthetic-data Supabase project** (the second free project) — never production data | Owner: managed, free, polished | H1H2 §4–§5; https://vercel.com/docs/limits |
| Email integration point | `server/domains/identity/mailer/` (port + adapter). Only the identity domain knows addresses. Messages are **content-free and type-free** (O1). Sign-in codes sent inline; digests from a scheduled job (Vercel Hobby cron limits **Unverified** → GitHub Actions schedule calling an authenticated endpoint as fallback). **Amazon SES `ca-central-1`**, Paid-plan AWS account, production access requested before launch, tracking off. Resend Free as dev/demo fallback | §7.13, §3, §6.2; Q6 open | O1; https://aws.amazon.com/free/ **[J]** |
| Domain / registrar | **Porkbun**: `.ca` ($11.12 reg, $11.61 renewal; Canadian Presence Requirements) if eligible, else `.com` ($11.08); WHOIS privacy free on `.com` (per H1H2). Registrar DNS; Vercel records | §8 credibility | https://porkbun.com/tld/ca ; https://porkbun.com/tld/com |
| CI | **GitHub Actions**: Postgres service container at Supabase's major version (version **Unverified** — check at scaffold), migrations, catalogue assertions, Vitest, Playwright + `@axe-core/playwright`, **`docker build` of the standalone image** (keeps H4 one deploy away), Dependabot | §9, §15 DoD | S0 §5.5; GitHub billing docs |
| Backups | Nightly **per-domain** `pg_dump`, each encrypted with its own key, to owner-controlled storage (Supabase Free has none) — pending PQ-4 | §6.2 exports; §11 deployment docs | H1H2 §5.10 |
| Error reporting / analytics | **None** in the prototype (NQ-S0-2) | §3, §6.2 | C6 |

### 15.3 Stack R-fallback (H4-CA), the differences only

- Same repository and image. Deploy the `output: standalone` container to **Cloud Run `northamerica-northeast1`**,
  `min-instances = 0`, low `max-instances`; Supabase project unchanged.
- Custom domain through **Firebase Hosting rewrites** (supports `northamerica-northeast1`; requires the Blaze plan;
  "not covered by Google Cloud Terms of Service") or a load balancer — **price both before switching** (Unverified).
- Request-log **exclusion filters** for content-bearing routes and `_Default` retention shortened (owner decides the
  value; Q14/Q17); budget alerts plus a spend cap if Cloud Run is eligible **[J]**.
- Expect cold starts; measure them (spike 2).

### 15.4 Explicitly not proposed for the prototype

H2c (browser Data API), Supabase Auth, Neon (no Canadian region; CU-hour cliff) unless family B-full is chosen and US
hosting is accepted, D1, Next.js on Cloudflare (vinext beta / OpenNext), Render, Railway, Fly, AWS App Runner, any SaaS
error reporting or analytics, `proxy.ts` on Vercel, `uuidv7` for anonymous IDs.

---

## 16. Production evolution path (PROPOSAL)

Phases are proposals; Q2 (milestones) is open. Each step changes deployment, not the data model, because the
prototype already uses per-domain roles, no cross-domain foreign keys and a container build.

| Phase | Trigger (owner decides) | Hosting change | Privacy change | §10–§11 items it unlocks |
|---|---|---|---|---|
| **P0 Prototype** | Now | Stack R (or R-fallback) on free tiers | Family A per the Q9 ADR, with B's principles (no author column, keyed per-item tags, content-free email) | Sign-in (email codes), cards, board, counters, survey — whatever Q2 scopes |
| **P1 Pilot with real courses** | A UW sponsor, an IRA-PIA (A2), real student volume, or any need for backups, no pausing, a DPA | **Supabase Pro in `ca-central-1`** (daily backups 7 days, no pausing, 7-day logs); **Vercel Pro** if Hobby is ineligible or a DPA is required — *or* move compute to Cloud Run (H4-CA) and stay off Vercel Pro | Key custody K3 → KMS-held KEK (privacy-A K4) if the review asks; threat model (Q8) published | Real UW sign-in if UW allows the Entra app (A1); manual course creation + join links (A2 proposal) |
| **P2 Production at UW** | LTI 1.3 registration approved by UW's LEARN admins (A2) | Either (a) **Vercel Pro `yul1` + Supabase Pro/Team `ca-central-1`**; (b) **Cloud Run in Canada + Supabase Pro** or a Canadian Cloud SQL (price Unverified); or (c) **institution-hosted** container + Postgres 15+ | Split participation/linkage (and survey) into **separate deployments with their own secrets** if the review or PQ-H2 asks (family B-lite or B-full; possible because there are no cross-domain FKs) | §10 provisioning "through supported integrations" (LTI 1.3 launch, NRPS, AGS; A2), SSO, deployment documentation |
| **P3 Multi-institution** | Another institution (§4 "supportable without code changes") | Same image per institution or multi-tenant; region per institution | Per-institution keys | §4 configurability |

**What would force a data migration (avoid it):** choosing Neon (no Canadian region; immutable region) and later
needing Canada; choosing D1; using Supabase Auth, Vault or the Data API. Stack R avoids all four.

---

## 17. Estimated monthly running cost per phase

USD per month, before tax; CAD at 1.4271 **[J]**. Usage beyond the §0 assumption is **unknown** (the owner gave no
user counts), so pilot and production are ranges with named triggers.

| Phase | Line items (source, checked 2026-10-11) | USD/month | CAD/month |
|---|---|---|---|
| **P0 Stack R** | Vercel Hobby $0 · Supabase Free $0 · SES ~2,000 msgs × $0.10/1,000 = $0.20 (O1) · domain $0.92–0.97 (Porkbun) · GitHub Free $0 | **≈ 1.12–1.17** | **≈ 1.60–1.67** |
| P0 Stack R-fallback (H4-CA) | Cloud Run free tier $0 · Supabase Free $0 · SES $0.20 · domain $0.97 · Artifact Registry / Secret Manager cents (rates Unverified) · **Firebase Hosting or LB: Unverified** | **≈ 1.2 + routing (Unverified)** | ≈ 1.7 + routing |
| P0 alternatives for reference | H1 ≈ 1.17 if Neon < 100 CU-h, else ≈ 10.6–15.4 · H3 Free ≈ 1.17 / Paid ≈ 5.97 | — | 1.67 / 15–22 / 8.52 |
| **P1 Pilot, minimum** | Supabase **Pro "from $25/month"** incl. $10 compute credits (one Micro) · Vercel Hobby if still eligible · SES ≤ $1 · domain ~$1 | **≈ 27** | ≈ 38.5 |
| **P1 Pilot, if Vercel Pro is needed** | + Vercel Pro "$20 per user / month" (one seat) | **≈ 47** | ≈ 67 |
| P1 Pilot via H4-CA | Supabase Pro $25 + Cloud Run (free tier; `min-instances = 1` rate Unverified) + routing (Unverified) + SES + domain | **≈ 27 + Unverified lines** | ≈ 38.5 + … |
| **P2 Production, lean** | Vercel Pro $20 + Supabase Pro $25 + compute upgrade to Small "~$15" (minus the $10 credit) + SES + domain | **≈ 52–62** | ≈ 74–88 |
| P2 Production, with PITR | + PITR "$100 per month per 7 days retention" (needs at least Small compute) | **≈ 152–162** | ≈ 217–231 |
| P2 Production, institution-hosted | Unknown (UW infrastructure and support) | **Unverified** | — |
| Stress: one 1,000-student course with live polling | Outside every free tier; budget the pilot tier at least | ≥ P1 | ≥ P1 |

Sources: https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/compute-and-disk ;
https://supabase.com/docs/guides/platform/backups ; https://vercel.com/docs/plans/hobby ; SES via O1
(https://aws.amazon.com/ses/pricing/) ; https://porkbun.com/tld/ca ; https://porkbun.com/tld/com (all checked
2026-10-11). Supabase's "Pro" includes "$10/month in compute credits, which covers one Micro instance"; the
"Small ~$15" figure is from H1H2's reading of the compute page and is net ≈ $5 after the credit **[Estimate]**.

---

## 18. Key risks and mitigations (for Stack R unless noted)

| # | Risk | Likelihood / impact (judgement) | Mitigation (PROPOSAL) |
|---|---|---|---|
| R1 | Vercel Hobby judged commercial, or a DPA is required | Medium / High (forces $20/month or a move) | Answer PQ-J2/PQ-J3 before the ADR; keep the container build green so H4-CA is a deploy, not a rewrite |
| R2 | Vercel Hobby cap hit (Active CPU 4 h, 1M invocations) → up to 30-day lockout mid-term | Medium / High | No auto-refresh on student devices; cached aggregates with ETags; usage review weekly; spike 1 measures CPU per request |
| R3 | Supabase Free pauses after a week idle (between terms, before a demo) | Medium / Medium | Weekly synthetic sign-in check (ask Supabase whether it counts as activity); restore runbook; Pro for the pilot |
| R4 | No backups on Supabase Free; operator error or bad migration | Medium / High | Nightly per-domain encrypted dumps; restore drill documented (§11 deployment docs); migrations only from CI |
| R5 | Default Supabase grants or Data API expose tables | Low (Data API off) / High | Disable Data API; revoke default privileges; CI test that `/rest/v1/` answers nothing; catalogue assertions. Per privacy-A, the platform default flips to opt-in for all existing projects on 2026-10-30 (not re-checked here) |
| R6 | Identity + content co-occur in Vercel logs (path, query, UA, IP held 1 h) | Medium / High (§3) | POST bodies only; opaque IDs; allow-listing logger; no `proxy.ts`; capture and inspect a real log entry (spike 3); document IP+time correlation as a limitation of anonymity |
| R7 | Email sign-in breaks: SES sandbox, Free-plan account closure, daily caps | Medium / High (nobody can sign in) | AWS **Paid plan**; request SES production access early; budget alert; Resend fallback adapter behind the same port |
| R8 | Next.js / Better Auth critical advisories | High / High | Pin, Dependabot, patch within days; minimal plugins; runbook |
| R9 | Supabase pooler or IPv6-only direct connection blocks CI migrations from GitHub-hosted runners | Unknown / Medium | Use the IPv4 session pooler for migrations (GitHub runner IPv6 support **Unverified**); spike 4 |
| R10 | CI Postgres major version differs from Supabase's | Medium / Medium (false-green RLS tests) | Read Supabase's version at scaffold time; pin the CI image to it |
| R11 | Preview deployments touch real data | Low (separate project) / High | Previews only on the synthetic-data project; env vars scoped per environment |
| R12 | H4-CA routing cost (Firebase/LB) or cold starts make the fallback unattractive | Medium / Medium | Price Firebase Hosting and an LB before needing them (spike 2) |
| R13 | Owner's "$5" is CAD incl. tax → USD headroom ≈ 3.1 (CAD 5 ÷ 1.13 ÷ 1.4271) if 13% HST applies (rate and whether it applies to these vendors: Unverified) | Low / Low for Stack R (≈ CAD 1.67) | Answer PQ-J1; Stack R fits either way; H3 Paid would not |
| R14 | Cloud Run surprise bill (fallback only) | Low / Medium | Spend cap if eligible, else Pub/Sub-driven billing disable; `max-instances` |

---

## 19. What evidence would change this recommendation

| Evidence | Change |
|---|---|
| Vercel (in writing) or the owner says the project is commercial, or the owner/UW requires a DPA for the prototype | Switch to **H4-CA** (or pay Vercel Pro if the budget is raised) |
| Owner wants protection even against the operator (PQ-H2 "yes") → family B-full | **H4** with separate Cloud Run services and separate Postgres projects; reconsider **H3b** if Canada is not required |
| Canadian residency is ruled out *and* family B needs ≥ 3 databases | **H1** (Neon's 100 free projects) becomes competitive again |
| Spike shows SSR fits Workers Free 10 ms CPU, the owner prefers hard stops, accepts React Router and US/edge hosting | **H3b** rises to ≈ 75 (S5) |
| Supabase confirms that inactivity pausing cannot be prevented by legitimate traffic, or changes Free terms | H4-CA with Neon (US) or move to Supabase Pro earlier |
| GCP confirms Cloud Run is spend-cap eligible and Firebase Hosting fits the free quota with a custom domain in Canada | H4-CA overtakes H2 in the base case (higher failure and cost scores) |
| UW's IRA-PIA or IST requires institution hosting, a named cloud, or Canadian residency for all metadata | Plan P2(c) now; prefer H4 (container) |
| Next.js 16 `proxy.ts` (or another needed feature) cannot be avoided on Vercel and residency matters | Prefer H4-CA |
| Measured Vercel Active CPU per request is high (e.g. > 15 ms average at the assumed load) | Budget Vercel Pro or move to H4 |
| Drizzle v1 stable, or Drizzle-kit drops custom-SQL policies on generate | Re-check S0's data-access choice (Kysely fallback) |
| The privacy-C note concludes that client-side crypto is required | Re-score privacy fit; all hosts are neutral, but strict CSP control and static-asset integrity would favour H4 (full header control) slightly |

---

## 20. Proposed new open questions (consolidated; none are answered here)

These are **not** in CONTRIBUTING §13. Duplicates across the input notes are merged; the original IDs are kept so
the owner can trace them. Proposal: add the ones the owner accepts to §13 with a §16 changelog line.

| ID | Question | Merges | Blocks |
|---|---|---|---|
| **PQ-J1** | Is the "<$5/month" target in USD or CAD, and does it include tax? | PQ-FC-1 | Q3 cost test |
| **PQ-J2** | Is anyone paid to build or run ClearCourse AI, or is commercialisation intended? (Decides Vercel Hobby eligibility.) | H1H2 PQ-2 | Q3 (the §15 gate) |
| **PQ-J3** | Must a DPA (or institutional privacy review) cover every processor before real UW users sign in to the prototype? | H1H2 PQ-3, PQ-FC-3 | Q3, launch |
| **PQ-J4** | Must the prototype and/or production keep processing and stored data in Canada or on institution-hosted infrastructure? Which data (DB, logs, backups, email metadata)? | NQ-S0-1, H1H2 PQ-1, H3H4 PQ-H1, PNQ-B12, PQ-FC-2 | Q3, P2 |
| **PQ-J5** | Is the hosting-account operator (the owner, later UW IT) trusted, or must the mapping be unrecoverable even with full DB and log access? | H3H4 PQ-H2, PNQ-B13 | Q8, Q9 |
| **PQ-J6** | Are IP addresses and request metadata identity-bearing under §6.2? What platform-log retention is acceptable? | H1H2 PQ-5, H3H4 PQ-H3 | §6.2, §9, Q14, Q17 |
| **PQ-J7** | At a free-tier limit, does the owner prefer a hard stop (outage, no bill) or automatic billing (no outage)? What monthly ceiling is acceptable? | H3H4 PQ-H4 | Q3 |
| **PQ-J8** | Must presentation mode and voting update live (push), or is periodic refresh acceptable? | H1H2 PQ-6, H3H4 PQ-H5 | §7.8 design, cost |
| **PQ-J9** | What availability/latency counts as "credible" for the prototype (cold start, idle pause)? | H1H2 PQ-7, H3H4 PQ-H6 | §8, Q3 |
| **PQ-J10** | Must preview and staging use only synthetic data? | NQ-S0-6, H1H2 PQ-9 | CI/CD |
| **PQ-J11** | Do backups and dumps count as "exports" under §6.2/§3? Where may they be stored, under which keys, for how long? | H1H2 PQ-4 | Backups, Q17 |
| **PQ-J12** | May AI coding agents access production data or logs (e.g. via MCP)? | H1H2 PQ-8 | Operations |
| **PQ-J13** | Is any third-party error-reporting or analytics SaaS allowed, and with which fields? | NQ-S0-2 | Observability |
| **PQ-J14** | Must per-domain secret isolation be platform-enforced (separate deployments) in the prototype, or are separate DB roles in one deployment acceptable? | NQ-S0-4 | Q8, Q9, hosting shape |
| **PQ-J15** | Expected pilot scale: courses, students, largest course? | H1H2 PQ-10 | Cost, plan choice |
| **PQ-J16** | Is the owner eligible for `.ca` (CIRA Canadian Presence Requirements), and is `.ca` or `.com` preferred? Has the name "ClearCourse AI" been checked for conflicts? | new | Domain purchase |
| **PQ-J17** | Is the owner willing to hold an AWS account on the Paid plan (for SES), given that Free-plan accounts close after 6 months? | new (from **[J]** AWS Free Tier fact) | Q6 |
| **PQ-J18** | Is Next.js `proxy.ts` (code that Vercel runs in all regions) acceptable, or must all application code run in the chosen region? | PQ-FC-2 (part) | Framework rules |

---

## 21. Spikes to run before the ADR (each about a day or less; PROPOSAL)

1. **Vercel + Supabase measurement.** Deploy a Next.js page that signs in (test IdP or email code to a verified
   address) and does one per-domain query through Supavisor from `yul1` to `ca-central-1`. Record: Active CPU per
   request, cold and warm latency, and whether `set_config(…, true)` + RLS behaves as expected through the pooler
   (S0's `nullif(current_setting(…), '')` gotcha).
2. **H4-CA readiness.** Deploy the same image to Cloud Run `northamerica-northeast1`; measure cold start; price
   Firebase Hosting with a custom domain and a load balancer in the official calculator; check spend-cap
   eligibility for Cloud Run.
3. **Log capture.** Capture one real Vercel runtime-log entry, one Supabase `postgres_logs` entry, and (if H4) one
   Cloud Run request log; list every field. Feed into Q8 and the §9 log tests.
4. **CI connectivity and version.** From a GitHub-hosted runner, apply migrations to Supabase via the IPv4 session
   pooler with a custom owner role; read Supabase's Postgres major version and pin the CI image to it.
5. **Email path.** Create the AWS account (Paid plan), verify the domain in SES `ca-central-1`, request production
   access, send a content-free code email to a UW mailbox, and note what UW's Safe Links does to it (A1/O1).
6. **Hobby eligibility.** Send Vercel support the written question (PQ-J2) and keep the reply in `docs/decisions/`.

---

## 22. Verification log

### 22.1 Pages fetched by this judge on 2026-10-11 **[J]**

| Claim | URL | Checked | Status |
|---|---|---|---|
| "AWS App Runner is no longer open to new customers"; existing customers continue; AWS recommends Amazon ECS Express Mode (Fargate + ALB + auto scaling + networking) | https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html ; https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html | 2026-10-11 | Verified (closure date not stated on the page) |
| AWS Free Tier: "$100 in credits immediately", "up to $100 more", "up to $200 over 6 months"; Free-plan account "closes on its own 6 months after you open it or when your credits run out"; Free plan "Limited to select services only"; RDS "Available on both plans" | https://aws.amazon.com/free/ | 2026-10-11 | Verified (no effective date shown) |
| GCP alerts-only budgets: "doesn't automatically cap Google Cloud … usage or spending"; "spend cap budget" for eligible services: "When enforced, the specified services are paused until you manually lift the cap"; Pub/Sub automation can disable billing | https://docs.cloud.google.com/billing/docs/how-to/budgets | 2026-10-11 | Verified (Cloud Run eligibility Unverified) |
| GCP Terms: no non-commercial restriction in visible text; anti-circumvention clause (§3.3(d)(iii)); suspension rights (§4.1–4.2); references Cloud DPA updates (§1.4) | https://cloud.google.com/terms | 2026-10-11 | Verified for the first 100,000 characters; date and incorporation sentence not visible (Unverified) |
| Cloud DPA "is incorporated into the Agreement(s) … between Google and Customer"; no data-location commitment in visible text | https://cloud.google.com/terms/data-processing-addendum | 2026-10-11 | Verified (partial page; whether self-serve terms incorporate it: Unverified) |
| Cloudflare DPA "forms part of the Main Agreement" (incl. "Self-Serve Subscription Agreement"); effective when the customer "signed or the parties otherwise agreed"; Version 6.4, effective April 3, 2026 | https://www.cloudflare.com/cloudflare-customer-dpa/ | 2026-10-11 | Verified |
| Vercel Routing Middleware "available on all plans", "runs globally before the cache", Node.js runtime by default; Next.js 16 uses its own `proxy.ts`; page last_updated 2026-08-14 | https://vercel.com/docs/routing-middleware | 2026-10-11 | Verified (that a Next.js `proxy.ts` is deployed *as* Routing Middleware is strongly implied, not stated verbatim) |
| "OpenID Connect 1.0 is a simple identity layer on top of the OAuth 2.0 protocol"; OAuth 2.0 "do[es] not define standard methods to provide identity information" | https://openid.net/specs/openid-connect-core-1_0.html | 2026-10-11 | Verified |
| OWASP: Secure and HttpOnly "mandatory"; `SameSite=Strict` (preferred) or `Lax`; `__Host-` prefix; expiry "must be enforced server-side"; logout must invalidate server-side; no JWTs in localStorage | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | 2026-10-11 | Verified |
| USD/CAD 1.4271 for 2026-10-09 ("indicative rates only") | https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/ | 2026-10-11 | Verified |

### 22.2 Load-bearing facts inherited from the input notes (re-verified by the fact-check unless noted)

| Claim | URL | Status |
|---|---|---|
| Vercel Hobby: non-commercial personal use; caps; "wait until 30 days have passed"; 1M invocations, 4 CPU-h; logs 1 h; no drains | https://vercel.com/docs/limits/fair-use-guidelines ; https://vercel.com/docs/plans/hobby | Confirmed by fact-check |
| Vercel DPA covers Pro and Enterprise; US primary processing | https://vercel.com/legal/dpa | Confirmed |
| Vercel `yul1` = ca-central-1; Hobby single region; Routing Middleware deployed to all regions regardless of region settings | https://vercel.com/docs/regions ; https://vercel.com/docs/functions/configuring-functions/region | Confirmed |
| Vercel Hobby cannot connect GitHub-organisation repos | https://vercel.com/docs/limits | Verified by H1H2 |
| Supabase Free: 500 MB, 2 active projects, paused after 1 week, no backups, 1-day logs; Pro from $25 incl. $10 credits; PITR $100/7 days | https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/backups | Confirmed |
| Supabase `ca-central-1`; Data API can be disabled; Auth in `auth` schema; transaction pooler: no prepared statements, custom roles `role.projectref` | https://supabase.com/docs/guides/platform/regions ; https://supabase.com/docs/guides/database/hardening-data-api ; https://supabase.com/docs/guides/database/connecting-to-postgres | Confirmed |
| Supabase `postgres` role has `bypassrls`; Data API default becomes opt-in for existing projects on 2026-10-30 | per privacy-A [V12], [V22] | Verified by privacy-A only (H1H2 had marked the first Unverified) |
| Neon Free 100 CU-h/project, suspension at cap, no Canadian region, region immutable; `neon_superuser` has BYPASSRLS; branches copy data | https://neon.com/docs/introduction/plans ; https://neon.com/docs/introduction/regions ; https://neon.com/docs/manage/roles ; https://neon.com/docs/introduction/branching | Confirmed |
| Workers Paid USD 5 minimum; D1 on Free and Paid; D1 included rows; Workers Free 100k/day, 10 ms CPU; size 64 MiB | https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/workers/platform/limits/ | Confirmed |
| D1 has no Canada hint or jurisdiction | https://developers.cloudflare.com/d1/configuration/data-location/ | Confirmed |
| Workers Logs on by default, `invocation_logs = false`, 3/7-day retention; pricing change 2026-12-01 | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ | Confirmed |
| Cloud Run free tier; Montréal/Toronto Tier 2; domain mapping Preview, not in Canadian regions; Firebase Hosting not covered by GCP ToS; request logs automatic, exclusion filters; `_Default` 30 days (1–3650) | https://docs.cloud.google.com/free/docs/free-cloud-features ; https://docs.cloud.google.com/run/docs/locations ; https://docs.cloud.google.com/run/docs/mapping-custom-domains ; https://docs.cloud.google.com/run/docs/logging ; https://docs.cloud.google.com/logging/quotas | Confirmed |
| Render Free sleep/deletion; Railway plans; Fly no free tier, MPG $38 | https://render.com/docs/free ; https://railway.com/pricing ; https://docs.fly.io/about/pricing | Confirmed |
| Porkbun `.com` $11.08; `.ca` $11.12 / renew $11.61 (currency not named) | https://porkbun.com/tld/com ; https://porkbun.com/tld/ca | Confirmed (C4 correction) |
| Resend Free 3,000/month, 100/day | https://resend.com/pricing | Confirmed |
| SES $0.10/1,000 à la carte; sandbox 200/24 h; `ca-central-1` | https://aws.amazon.com/ses/pricing/ ; SES docs (per O1) | Verified by O1 only |
| GitHub Free private 2,000 min; blocked at quota without payment method | https://docs.github.com/en/billing/concepts/product-billing/github-actions | Confirmed |
| Next.js 16.4 (2026-10-06); OOB security update 2026-10-14; DAL guidance; Adapter API stable since 16.2 | https://nextjs.org/blog ; https://nextjs.org/docs/app/guides/data-security ; https://nextjs.org/blog/nextjs-across-platforms | Confirmed |
| Drizzle 0.45.4 latest, v1 rc; RLS/roles in DSL, GRANT/DEFINER not | https://github.com/drizzle-team/drizzle-orm/releases ; https://orm.drizzle.team/docs/rls | Confirmed |
| Sentry collects IP and bodies by default (`dataCollection`) | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ | Confirmed |

### 22.3 Still Unverified (do not rely on without checking)

Cloud Run idle min-instance and Tier 2 prices; GCP load-balancer and Firebase Hosting prices/quotas; whether Cloud Run
is spend-cap eligible; Render paid prices; Cloudflare Registrar prices; Vercel Hobby cron limits; whether Supabase
counts scheduled pings as activity; Supabase's current Postgres major version; GitHub-hosted runner IPv6; Neon-side
query logging; exact Cloudflare and Cloud Run log fields; AWS RDS/ALB prices and the PDF's "$30–50" and "$70" figures;
Tailwind's current version; what WatIAM offers as an IdP; whether HST applies to these vendors; Neon's billing currency.

