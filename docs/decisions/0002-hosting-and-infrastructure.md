# ADR 0002: Hosting and infrastructure for the prototype (Q3)

- **Status:** Proposed
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §3, §6.1–§6.4, §7.13, §8, §9, §10, §11, §12, §14 / Q3 (primary);
  Q6, Q8, Q9, Q14, Q17; PQ-02, PQ-03, PQ-04, PQ-07, PQ-09, PQ-10, PQ-11, PQ-14, PQ-15, PQ-16,
  PQ-17, PQ-42, PQ-68

Research: [docs/research/stack-and-hosting.md](../research/stack-and-hosting.md). Application
stack: [ADR 0001](0001-application-stack.md). Privacy mechanism:
[ADR 0003](0003-privacy-mechanism.md).

## Context

Q3 blocks all code (§13). ADR 0001 proposes the application stack; this ADR proposes where it
runs for the prototype, and how it grows. §12 lists hosting options from the source chat (Vercel +
Supabase, Railway, Render, Cloudflare Pages/Workers/D1, AWS) as *Advisory*, warns that D1 lacks
Postgres schemas and RLS, and that the chat's prices are unverified.

The requirements that shape the choice:

- **§6 privacy.** ADR 0003 (Proposed: A+) needs real PostgreSQL with roles, RLS and SECURITY
  DEFINER functions, one login role and secret per domain, and keys outside SQL in the host's
  secret store. A later separated topology (B) must stay reachable.
- **§3 last row, §6.2, §9.** Platform logs are a co-occurrence risk and must be testable ("logs").
- **§7.13.** In-app **and email** notifications; sign-in codes also go by email (ADR 0004), so
  email is critical infrastructure.
- **§8, §10, §11.** A credible public site; secure sign-in; deployment documentation and the
  database are deliverables.

**Owner constraints** (from the research brief, not yet in CONTRIBUTING): a public, polished,
sign-in-able prototype first; **under $5/month**, preferring free tiers and managed services; no
corner painted for production; one builder with Claude.

**Assumed prototype scale** (an assumption, not a requirement): about 5 courses, 500 users, 100
daily actives, class bursts of 100, 30,000 page views and 2,000 emails a month, database under
250 MB.

Facts that decide it (checked 2026-10-11; URLs in the research file):

- **Vercel Hobby** is "restricted to non-commercial personal use only"; commercial includes the
  "financial gain of anyone involved … including a paid employee or consultant writing the code".
  At a cap, Hobby "cannot purchase additional usage" and "you will have to wait until 30 days have
  passed". Vercel's DPA applies only "for Customers who are on Enterprise and Pro plans". Runtime
  logs keep paths, query strings, user agent and IP for 1 hour on Hobby. Functions can be pinned
  to `yul1` (Montréal).
- **Supabase Free** has a `ca-central-1` region, 500 MB, 2 active projects, **no backups**, and
  projects are "paused after 1 week of inactivity". The Data API can be disabled; custom roles
  work through the Supavisor pooler.
- **Neon** has no Canadian region and a 100 CU-hour monthly cap. **Cloudflare D1** is SQLite (no
  roles or RLS) with no Canadian location. Workers Paid is "a minimum charge of $5 USD per month".
- **Google Cloud Run** has a free tier (2 million requests a month) in Montréal and Toronto, no
  non-commercial clause in its visible terms, but bills overage automatically and its custom-domain
  mapping is not available in Canadian regions.
- **Amazon SES** costs "$0.10 / 1,000 emails" à la carte; AWS Free-plan accounts close after 6
  months.

## Options considered

Scores are the stack judge's weighted totals out of 100 (privacy fit 20, cost 15, developer
experience 15, lock-in and production path 15, failure behaviour 10, credibility 10, ToS 10,
platform logs 5). The weights are a proposal; the owner may re-weight. Prototype costs are USD per
month before tax.

1. **H2: Vercel Hobby (`yul1`) + Supabase Free (`ca-central-1`) as plain Postgres. 78.5.** Pros:
   lowest operations; first-class Next.js; database and function compute in Canada; plain Postgres
   with the lowest data lock-in; ≈ $1.12–1.17. Cons: the non-commercial clause and no DPA (a
   yes/no gate); a cap means an outage of up to 30 days; Supabase pauses after a week idle and has
   no backups; only 2 free projects, so a separated topology is weak at $0; Vercel metadata is
   US-primary.
2. **H4: one container on Cloud Run + Postgres (H4-CA: Montréal + Supabase `ca-central-1`).
   77.5.** Pros: the most portable (same image anywhere, including institution hosting); full
   support for A+ and for separate services and secrets; no non-commercial clause; never drops below
   75.5 in any scenario tested. Cons: cold starts; a Canadian custom domain needs Firebase Hosting
   or a load balancer (prices Unverified); automatic overage billing (spend-cap eligibility
   Unverified); more GCP setup for one person.
3. **H3b: Cloudflare Workers + Hyperdrive + Postgres. 70.5.** Pros: hard daily stop instead of a
   bill; the strongest per-Worker secret separation; a DPA in the self-serve agreement. Cons:
   Next.js only through vinext (beta) or OpenNext; 10 ms CPU on Free, otherwise a USD 5 minimum;
   no Canadian compute.
4. **H1: Vercel Hobby + Neon Free. 70.0.** Pros: 100 free projects suit a separated topology.
   Cons: no Canadian Neon region (region immutable); a CU-hour cliff (estimates 89–134 CU-h against
   100) that could push the cost to ≈ $10.6–15.4; the same Vercel gate as H2.
5. **H3a: Cloudflare Workers + D1. 62.0.** Cons: cannot host A+ (no roles, schemas or RLS; §12);
   no Canadian location; high lock-in.
6. **Rejected before scoring:** Render Free (database deleted after 30 days plus grace), Railway
   (no custom domain on Free; Hobby at or above the target), Fly.io (no free tier), AWS App Runner
   (closed to new customers), bare AWS ECS/RDS (operations burden).

Sensitivity: H4 leads if Vercel Hobby is ineligible or a DPA is required (77.5 vs 71.0), or if the
owner wants protection against the operator (77.5 vs 74.5). H2 stays ahead if Canadian residency is
required now (77.0 vs 76.0) or the owner prefers a hard stop to any bill.

## Decision

**Proposed (not yet approved by the owner):** host the prototype on **H2** behind a gate, with
**H4-CA** agreed in advance as the fallback, using the same code.

**1. The Vercel Hobby gate.** Before this ADR is accepted, the owner answers:

- **PQ-03:** is anyone paid to build or run ClearCourse AI, or is commercialisation intended?
  (Proposal: also ask Vercel support in writing and keep the reply with this ADR.)
- **PQ-02:** is a UW privacy review, a signed DPA or other institutional approval needed before
  real UW users sign in?

If both answers allow Hobby → H2. If either fails → H4-CA, or Vercel Pro ($20 per user per month)
if the owner raises the budget. If PQ-10 says the operator must be outside the trust boundary →
H4-CA built as separate services.

**2. Compute (H2).** **Vercel Hobby**, all functions pinned to **`yul1`**; Node.js runtime only;
no `proxy.ts` (ADR 0001), so no application code runs outside the region. The repository stays
under a **personal** GitHub account (Hobby cannot connect organisation repositories). Vercel
Authentication protects previews.

**3. Database.** **Supabase Free in `ca-central-1`, used only as plain Postgres**: Data API
disabled; default privileges revoked; **no Supabase Auth, no `supabase-js`, no Vault** (key
wrapping per ADR 0003 stays portable); application roles created by SQL and reached through the
Supavisor transaction pooler (`role.projectref`, `prepare: false`); the dashboard `postgres` role
treated as operator-only. A CI test checks that `/rest/v1/` answers nothing. **Previews use the
second free Supabase project with synthetic data only** (PQ-15); environment variables are scoped
per environment.

**4. Supabase Free caveats and mitigations.**

| Caveat | Mitigation (Proposal) |
|---|---|
| Paused "after 1 week of inactivity" | A weekly synthetic sign-in check. Whether Supabase counts it as activity (or as circumvention) is **Unverified**: ask Supabase before relying on it. A documented restore runbook. Supabase Pro for the pilot |
| **No backups** | Nightly **per-domain** `pg_dump` from CI, each encrypted with its own key, to owner-controlled storage; a documented restore drill (§11). Where dumps may live and for how long waits on PQ-14 (are backups "exports"?) |
| 2 active projects | Production and the synthetic preview project use both; a separated topology (B) would need Pro or another host |
| 1-day logs; statement text can appear in `postgres_logs` | Parameterised queries only; check statement-logging settings; capture a real log entry (spike 3) |
| Over-quota restrictions after a grace period | Usage alerts; Supabase Pro "from $25/month" when the pilot starts |

**5. Pre-agreed fallback: H4-CA (same code).** CI always builds the `output: standalone`
container. Deploy it to **Cloud Run `northamerica-northeast1`** with `min-instances = 0` and a low
`max-instances`; the Supabase project is unchanged. Custom domain through Firebase Hosting rewrites
(Blaze plan; not covered by the Google Cloud Terms) or a load balancer; **price both before
switching** (Unverified). Request-log exclusion filters for content-bearing routes and a shorter
`_Default` retention (value set by the owner; Q14, Q17). Budget alerts, plus a spend cap if Cloud
Run is eligible (Unverified), otherwise the documented Pub/Sub pattern that disables billing.

**6. Email integration point.** A provider-neutral **mailer port inside the identity domain**
(`server/domains/identity/mailer/`); only that domain knows addresses; messages are content-free
and type-free (ADR 0003). **Amazon SES `ca-central-1`** as the adapter, on an AWS **Paid-plan**
account (Free-plan accounts close after 6 months), à la carte pricing (cancel a defaulted
Essentials plan), production access requested early, open and click tracking off. Resend Free
(3,000/month, 100/day) only as a dev/demo fallback behind the same port. Scheduled digests run from
a GitHub Actions schedule calling an authenticated endpoint if Vercel Hobby cron limits are not
enough (Unverified). Q6 and PQ-42 stay open.

**7. Domain and registrar.** **Porkbun**: `.ca` (register $11.12, renew $11.61 a year) if the
owner meets CIRA's Canadian Presence Requirements, otherwise `.com` ($11.08 a year); registrar
DNS pointing to Vercel. Name, TLD and any use of UW's name are PQ-07.

**8. CI.** **GitHub Actions** (2,000 free minutes a month for private repositories; blocked, not
billed, at the quota; PQ-68): a Postgres service container at Supabase's major version (read at
scaffold time), migrations applied from a protected environment, catalogue assertions, Vitest,
Playwright + axe, `docker build` of the standalone image, and Dependabot. Production migrations
connect through the IPv4 session pooler (spike 4).

**9. Logs and access.** No identity or content in URLs or query strings; an allow-listing logger;
no third-party error reporting (ADR 0001, PQ-12); one real log entry captured per platform before
launch for the threat model (Q8) and §9 log tests; IP + timestamp treated as potentially
identity-bearing until PQ-11 is answered; no AI-agent access to production data, secrets or logs
(PQ-16).

**10. Cost per phase** (USD per month before tax; CAD at 1.4271; sources in the research file):

| Phase | Proposal | USD | CAD |
|---|---|---|---|
| Prototype (H2) | Vercel Hobby $0 · Supabase Free $0 · SES ≈ $0.20 · domain ≈ $0.92–0.97 · GitHub Free $0 | **≈ 1.12–1.17** | ≈ 1.60–1.67 |
| Prototype (H4-CA) | As above, Cloud Run free tier, plus Firebase Hosting or LB (Unverified) | ≈ 1.2 + routing | ≈ 1.7 + routing |
| Pilot | Supabase Pro (backups, no pausing) | **≈ 27** | ≈ 38.5 |
| Pilot with Vercel Pro | + one Pro seat | **≈ 47** | ≈ 67 |
| Production, lean | Vercel Pro + Supabase Pro + Small compute | **≈ 52–62** | ≈ 74–88 |
| Production with PITR | + PITR "$100 per month per 7 days retention" | **≈ 152–162** | ≈ 217–231 |
| Institution-hosted | UW infrastructure | Unknown | — |

Whether the "<$5" target is USD or CAD, includes tax, and whether a hard stop or automatic billing
is preferred at a limit is PQ-04. Pilot and production need PQ-05 (scale).

**Conditions before this ADR can be accepted:**

- The owner answers **PQ-03** and **PQ-02** (the gate), **PQ-04** (budget currency and failure
  style) and **PQ-09** for the prototype (Canadian residency; H2 and H4-CA both keep the database
  and compute in Canada, but no free option keeps vendor metadata there).
- Spikes pass (research file section 6.7): Vercel + Supabase measurement through Supavisor (1),
  H4-CA readiness and routing price (2), log capture (3), CI connectivity and version (4), SES
  production access (5), Vercel's written reply on Hobby eligibility (6).

Approved by: (pending)

## Consequences

**Enables.**

- A public prototype at about USD 1.12–1.17 a month, well under the target in either currency.
- A Canada-resident database and function compute from day one, which keeps the most options
  open if a UW review asks for residency (inference).
- A no-rewrite move to Cloud Run, to Vercel Pro + Supabase Pro, or to an institution-hosted
  container + Postgres 15+, because the prototype already uses plain Postgres, per-domain roles, no
  cross-domain foreign keys and a container build. Avoided on purpose: Neon (no Canadian region),
  D1, Supabase Auth, Vault and the Data API, any of which would force a data migration later.
- Production evolution (Proposal): pilot on Supabase Pro in `ca-central-1` and, if needed, Vercel
  Pro or Cloud Run; production at UW on one of Vercel Pro + Supabase Pro, Cloud Run in Canada +
  managed Postgres, or institution hosting; participation, linkage and survey split into separate
  deployments with their own secrets if a review or PQ-10 asks.

**Constrains.**

- The prototype depends on the gate answers (PQ-03, PQ-02). A "commercial" finding or a DPA
  requirement moves it to H4-CA or a paid plan.
- Vercel Hobby fails as a **hard stop**: hitting a cap can disable a feature for up to 30 days.
  Presentation mode and vote totals should use cached aggregate reads with short polling and ETags,
  with no auto-refresh on student devices; live push waits for PQ-17. A 1,000-student course polling
  live is outside every free tier (Estimate).
- The owner operates backups, the weekly check and the restore runbook, because Supabase Free
  provides neither backups nor protection against pausing.
- Only two free Supabase projects: a separated (B) topology needs Supabase Pro or H4.
- The owner holds an AWS Paid-plan account for SES (PQ-42).

**Privacy implications (§6).**

- The operator and the vendors (Vercel, Supabase, AWS; GCP in the fallback) are inside the trust
  boundary: anyone with the accounts can read data and logs. This matches ADR 0003's stated
  limitation unless PQ-10 is answered otherwise.
- Vercel keeps request paths, query strings, user agent and IP for 1 hour, and turning this off
  is not documented (Unverified); Vercel's metadata is US-primary and Hobby has no DPA. These go into the threat model (Q8) and
  the limitations of anonymity (§6.2, §11).
- One full-database dump would hold identity and content together; dumps are per domain with
  separate keys until PQ-14 is answered.
- Preview deployments never see real data (PQ-15).

**Follow-up work.**

- Run spikes 1–6 and store the results and Vercel's reply with this ADR.
- Write the deployment documentation (§11): setup, migration pipeline, backup and restore drill,
  upgrade-and-redeploy runbook, the H4-CA switch procedure, and usage alerts on every vendor.
- When the owner approves: record the answers in CONTRIBUTING (§13 → relevant section, §16) and
  update CLAUDE.md and the README status line.
