# Stack research — H3 (Cloudflare) and H4 (portable container on a PaaS + managed Postgres)

> Research and planning notes only. Nothing here is a decision. CONTRIBUTING.md is the source of truth;
> anything not written there is an open question. Every price/limit below carries the official URL it
> was read from and "(checked 2026-10-11)". Items I could not verify are labelled **Unverified**.
> Estimates I computed myself are labelled **[Estimate]**. "Requirement" means a CONTRIBUTING citation;
> everything else is my proposal or analysis.

Status: COMPLETE for this pass (2026-10-11). Open items are labelled **Unverified** and listed in §9.

**Summary.**
- **H3 (Cloudflare):** the chat's p.29 figures are mostly right in number but wrong in framing. D1 is on Free too,
  "$5" is a minimum and not a flat fee, and "25 billion reads" counts rows scanned, not queries.
- **H3a (Workers + D1)** costs about $1/month (the domain) on Free, never sleeps and makes physically separate
  per-domain databases easy. But it has no roles, schemas or RLS (design A impossible), no Canadian location, heavy
  Cloudflare-specific APIs, and Next.js runs there only via beta (vinext) or community (OpenNext) adapters.
- **H3b (Workers + Hyperdrive + Neon)** keeps Postgres but still has no Canadian residency.
- **H4:** of the container PaaSes, only **Google Cloud Run** has a real, non-expiring free tier. It has Canadian
  regions and, paired with Neon or Supabase Postgres, supports every privacy design and every production path for
  about $1–1.50/month. Its costs are cold starts, GCP complexity and automatic overage billing.
- Render Free (sleep + DB deletion), Railway (no custom domain on Free; Hobby likely > $5) and Fly.io (no free tier)
  are not suitable.
- **Proposal:** H4-CR first, H3b if the owner prefers Cloudflare, H3a only with design B and Cloudflare as the
  permanent home (§7).

Evidence: all evidence is inline in §3 (H3) and §4 (H4), with exact URLs and "(checked 2026-10-11)", and it is
consolidated in the §9 verification log.

## 1. Question(s) and what they block

| §13 item | How this branch bears on it | What it blocks |
|---|---|---|
| **Q3** Tech stack and hosting (§12) | Primary question. H3 and H4 are two of the hosting/stack families listed in §12 *Advisory* ("Railway · Render · Cloudflare Pages/Workers/D1"). | "All code" (§13). CLAUDE.md: no framework scaffold until an ADR is approved. |
| **Q2** Prototype vs production, first milestone | The owner's constraint says milestone 1 is a public prototype people can sign in to. Hosting must make that credible (§8) without blocking the §10–§11 production path. This branch does not decide feature scope. | Roadmap |
| **Q9** Mechanism keeping content and identity unjoinable (§6.3) | Hosting determines which separation mechanisms are *available*: Postgres roles/schemas/RLS/SECURITY DEFINER (design A), physically separate databases/services (design B), browser crypto (design C). D1 lacks schemas/RLS (§12 known issue). | §6, §7.7, §7.9 |
| **Q4** Prototype authentication | Affects cost (magic-link email volume), and whether an auth library runs on the platform (Workers runtime vs Node). Researched by the auth branches; only runtime fit is covered here. | Sign-in |
| **Q6** Email provider | Only whether the platform bundles email and its cost line. Provider choice is the O1 branch's. | §7.13 |
| **Q14** Audit events and retention; **Q17** data retention | Platform log retention and backup retention are inputs to both. Not decided here. | §7.17, data model |

Requirements this branch relies on (all from CONTRIBUTING.md):
- §6.1 five technically separated data domains; §6.2 restricted service roles, opaque IDs, narrowly scoped internal
  APIs, and no identity + anonymous text together in any log, analytics event, error report, DB view, export or
  dashboard; §3 last row (same prohibition).
- §9 negative tests must prove authors cannot be retrieved via UI, API, exports, **logs** or predictable IDs, so
  platform logs are in scope.
- §8 calm, credible design (owner: prototype "must look polished and credible").
- §10 "Institutional users can sign in securely"; "Courses and roles can be provisioned through supported integrations".
- §11 deliverables include "deployment documentation" and "database".
- §12 known issue: "Cloudflare D1 is SQLite-based. It does not offer the Postgres schemas or row-level security…".

Owner constraints (not in CONTRIBUTING; from the task brief): public prototype people can sign in to; target
<$5/month; prefer free tiers and managed services; do not paint the production system (§10–§11) or the privacy
architecture (§6) into a corner; solo builder with Claude, so mainstream, well-documented tools.

**Prototype-scale ASSUMPTION** used for every cost estimate (not a requirement; the owner gave no numbers): up to ~5
pilot courses, ~500 registered users, ~100 DAU, bursts of ~100 concurrent users in class (presentation mode +
voting), ~30k page views/month, ~2,000 transactional emails/month, database < 250 MB. A burst from one
1,000-student course is discussed separately.

## 2. Options considered

| ID | Compute / framework | Data | Separation fit (A / B / C) | One-line take |
|---|---|---|---|---|
| **H3a** | Cloudflare Workers. Framework: React Router (Workers-native, Vite plugin) or Hono; Next.js only via vinext (beta) or OpenNext (community) | **D1**, one database per §6.1 domain, each bound to only one Worker; Workers talk via **service bindings** | A: **no** (no roles/schemas/RLS). B: **strong**. C: neutral | Cheapest and most "physically separated", but SQLite and Cloudflare-specific bindings make it the hardest to port |
| **H3b** | Cloudflare Workers (same framework choice) | **Hyperdrive** → external Postgres (Neon Free); one Hyperdrive config per DB role or per Neon project | A: **yes** (Postgres). B: **yes** (separate Neon projects). C: neutral | Keeps Postgres (portable data layer) on edge compute; two vendors, Neon has no Canadian region |
| **H4-CR** | **Google Cloud Run** container (any Node framework, e.g. Next.js standalone) | Neon Free (or Cloud SQL, not free) | A: yes. B: yes (several services + DBs). C: neutral | Most portable; generous free tier; Canadian regions exist for compute; cold starts unless min instances (cost) |
| H4-RE | Render web service (Docker) | Render Postgres or Neon | A/B: yes | Free web service sleeps; free Postgres expires (see §4) |
| H4-RW | Railway service (Docker/Nixpacks) | Railway Postgres (container) or Neon | A/B: yes | No free tier beyond a trial; Hobby is a paid plan (see §4) |
| H4-FL | Fly.io Machine | Fly Managed Postgres or Neon | A/B: yes | No free allowance for new orgs (see §4) |

Design labels: (A) one Postgres, multiple roles, schemas, RLS, SECURITY DEFINER; (B) physically separate
databases/services with narrow internal APIs and separate secrets; (C) client-side cryptography in the browser.
(C) is a browser concern; every option can serve it, so it differs only in CSP/header control and in whether
server logs could capture key material (see §6).

Out of scope here (other branches): Vercel + Neon/Supabase (H1/H2), auth provider choice (Q4), email provider (Q6).

## 3. Option H3 — Cloudflare

### 3.0 Checking the unvetted chat's claim (PDF p.29)

The chat says: "To get production limits and D1 database access, you need the Workers Paid plan, which is a flat
$5/month. This covers 10 million backend requests, 25 billion database reads, and 5 GB of database storage. Costs
only increase slightly if you exceed those massive limits."

| Part of the claim | What the official page says now | Verdict |
|---|---|---|
| "need the Workers Paid plan … D1 database access" | "D1 is available on both the Workers Free and Workers Paid plans" (https://developers.cloudflare.com/workers/platform/pricing/, checked 2026-10-11) | **Wrong.** D1 is on Free too (500 MB/DB, 10 DBs, §3.3) |
| "flat $5/month" | "minimum charge of $5 USD per month for an account", plus metered overage (same URL) | **Misleading.** It is a minimum, not a flat fee |
| "10 million backend requests" | "10 million included per month" then "+$0.30 per additional million" (same URL) | Correct, but CPU is metered separately: "30 million CPU milliseconds included per month" then "+$0.02 per additional million CPU milliseconds" |
| "25 billion database reads" | D1 "First 25 billion / month included" **rows read**, "+$0.001 / million rows" (same URL) | Correct figure, wrong unit. They are rows scanned, not queries. Unindexed scans consume them fast |
| "5 GB of database storage" | D1 "First 5 GB included + $0.75 / GB-mo" (same URL) | Correct. Free also has "5 GB (total)" |
| (omitted) writes | D1 Paid "First 50 million / month included + $1.00 / million rows"; Free "100,000 / day" (same URL) | Chat omitted writes |
| "Costs only increase slightly" | Not a verifiable statement | Depends on usage. At prototype scale overage is ~$0 [Estimate, §3.2] |
| Uses "Cloudflare Pages to host the Next.js frontend" | Cloudflare now says "Cloudflare recommends vinext as the default way to run Next.js applications on Cloudflare Workers" and "vinext is in beta"; OpenNext is the fallback (https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/, checked 2026-10-11). Pages' current status not checked (**Unverified**) | **Out of date.** The current path is Workers, not Pages |

### 3.1 Architecture sketch

**H3a — Workers + D1, one database per privacy domain (design B)**

```
Browser ──HTTPS──► [web] Worker (React Router SSR or Hono; static assets free)        no D1 bindings
                     │  holds: session-cookie key; service bindings only
                     ├─RPC─► [identity] Worker ── D1: identity_db (users, enrollment, roles, sessions)
                     ├─RPC─► [content]  Worker ── D1: content_db  (questions, comments, upvote records keyed by opaque IDs)
                     ├─RPC─► [particip] Worker ── D1: particip_db (counters keyed by keyed-HMAC pseudonym; secret held only here)
                     ├─RPC─► [shared]   Worker ── D1: shared_db   (name + level + date, only after student consent §7.10)
                     ├─RPC─► [survey]   Worker ── D1: survey_db   (anonymous survey text; no user key at all)
                     └─RPC─► [audit]    Worker ── D1: audit_db    (append-only API; no update/delete method exposed)
   optional: Queue between content → particip (privacy-preserving event processing §6.2); Durable Object for
   live presentation/voting fan-out over WebSockets (§7.8).
```

- Internal Workers have no public route. Cloudflare: a Worker "not reachable via the public Internet … can only be
  reached via an explicit Service binding that another Worker declares"; RPC "is recommended for most use cases";
  "Service bindings don't increase costs" (https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/,
  checked 2026-10-11). How to switch off `workers.dev` for those Workers is not on that page (**Unverified** detail;
  normally `workers_dev = false`).
- Limits relevant to this fan-out: binding calls count toward the subrequest limit; "One request can make at most
  32 Worker invocations" (same URL). Free subrequests: "50" per invocation (https://developers.cloudflare.com/workers/platform/limits/,
  checked 2026-10-11). Six domains fit, but chatty designs need batching.
- Free accounts allow "100" Workers, Paid "500" (limits URL above). Free allows "10" D1 databases, Paid "50,000"
  (https://developers.cloudflare.com/d1/platform/limits/, checked 2026-10-11). Six domains + a staging copy of each
  = 12, which **exceeds Free's 10**. Staging must then share a DB or use local-only D1. [Estimate]

**H3b — Workers + Hyperdrive + Neon Postgres (design A or B)**

```
Browser ─► [web] Worker ─RPC─► [domain] Workers ── Hyperdrive config per role ──► Neon Postgres (aws-us-east-1 etc.)
                                                   (identity_rw, content_rw, particip_rw, survey_w …)
  Design A: one Neon project, separate schemas + roles + RLS; each domain Worker gets its own Hyperdrive config
            (= its own DB user/password) so no Worker holds another domain's credential.
  Design B: one Neon project per domain (Neon Free allows 100 projects; see §3.3), one Hyperdrive config each.
```

- Hyperdrive is on Free: "Hyperdrive is included in both the Free and Paid Workers plans"; Free "100,000 / day"
  queries, and "whether cached or uncached, whether query or mutation" all count
  (https://developers.cloudflare.com/hyperdrive/platform/pricing/, checked 2026-10-11).
- Configs: Free "10 per account", Paid "25 per account"; origin connections "~20" Free, "~100" Paid per config
  (https://developers.cloudflare.com/hyperdrive/platform/limits/, checked 2026-10-11). Ten configs fit the five §6.1
  domains + audit with a few to spare; staging configs eat into the same 10.
- Neon is a documented provider. Use the **direct (non-pooled)** Neon string, `pg` ≥ 8.16.3 or Postgres.js, not the
  Neon serverless driver, and the `nodejs_compat` flag
  (https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/, checked 2026-10-11).
- Whether one Worker can have several Hyperdrive bindings with different DB users: the Neon page shows the config
  as an array but only one entry (**Unverified**; one config per domain Worker avoids the question).
- **Caching caveat:** Hyperdrive caches query results by default (pricing page says cached queries exist). For
  privacy-sensitive reads (e.g. a student's own counter) caching must be understood or disabled per config —
  the exact defaults were not checked (**Unverified**).

**Framework choice on Workers (both sub-options)**

| Framework | Status on Workers (official pages) | Fit |
|---|---|---|
| React Router (framework mode) | First-class Cloudflare guide; the page now refers to **"React Router v8"**; uses the Cloudflare Vite plugin, which "runs your server code in the Workers runtime" with "local emulations of bindings"; "SPA mode and prerendering are not currently supported" with the plugin (https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/, checked 2026-10-11) | **Best Workers-native fit.** Mainstream React, SSR, loaders/actions |
| Hono (+ React SSR or a small SPA) | Not fetched (**Unverified** maturity statement). Widely used on Workers (model knowledge, **Unverified**) | Good for the internal domain Workers (tiny RPC services) |
| Next.js via **vinext** | "Cloudflare recommends vinext as the default way to run Next.js applications on Cloudflare Workers"; "vinext is in beta"; image optimization "Partially supported", `next/*` imports "Mostly supported" (nextjs guide URL above) | Beta. Not a sound base for a project that must not paint itself into a corner |
| Next.js via **OpenNext** (`@opennextjs/cloudflare`) | "Maintained by the OpenNext community"; supports "All minor and patch versions of Next.js 16 and the latest minors of Next.js 14 and 15"; "Node Middleware introduced in 15.2 are not yet supported"; "Windows full support is not guaranteed" (https://opennext.js.org/cloudflare, checked 2026-10-11). Cloudflare now positions it as the fallback for apps that "cannot yet migrate to vinext" | Works, but third-party, and the owner develops on Windows (WSL needed) |

**Conflict to note:** OpenNext says Worker size limits are "3 MiB on the Workers Free plan, and 10 MiB on the Workers
Paid plan" (compressed). Cloudflare's limits page now says "There is no compressed size limit. Only the uncompressed
bundle size counts", with "64 MiB" on both plans (https://developers.cloudflare.com/workers/platform/limits/,
checked 2026-10-11). Cloudflare's own page should win, but the OpenNext page is stale or the limits recently changed
(**Conflicting**).

### 3.2 Monthly cost at prototype scale [Estimate unless cited]

Request model (assumption): 30k page views/month × ~4 Worker invocations (SSR + data/RSC calls) ≈ 120k/month ≈ 4k/day.
Static assets are free: "Requests to static assets are free and unlimited"
(https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/, checked 2026-10-11).
Service-binding calls "don't increase costs" (service bindings URL above).

**Live class traffic is the swing factor.** Polling every 5 s by 100 students for a 50-minute class ≈ 60,000 Worker
requests in one session; a 1,000-student course ≈ 600,000. On Free (100,000/day) **two polled classes in one day, or
one large class, hit the cap**. Using a Durable Object with WebSockets instead: "A request is needed to create a
WebSocket connection", "a 20:1 ratio is applied to incoming WebSocket messages", "no charge for outgoing WebSocket
messages"; Free DO "100,000 / day" requests and "13,000 GB-s / day"; use the Hibernation API to avoid duration
charges (https://developers.cloudflare.com/durable-objects/platform/pricing/, checked 2026-10-11). 1,000 students ×
(1 connect + ~20 votes/20) ≈ 2,000 billable requests. **Proposal:** design presentation/voting around a DO from day one.

| Line item | H3a on **Free** | H3a/H3b on **Paid** | Source |
|---|---|---|---|
| Workers plan | $0 | $5.00 minimum | pricing URL §3.0 |
| Requests / CPU | within 100k/day if live mode uses WebSockets; **10 ms CPU per invocation** is the risk (below) | 10M req + 30M CPU-ms included; ~120k req × ~20 ms ≈ 2.4M CPU-ms → $0 | pricing + limits URLs |
| D1 (H3a) | 5M rows read/day, 100k written/day, 500 MB/DB → $0 | 25B read / 50M written / 5 GB included → $0 | D1 limits + pricing |
| Hyperdrive + Neon (H3b) | Hyperdrive $0 (100k queries/day); Neon Free $0 if < 100 CU-h/project (sibling H1H2 note, https://neon.com/docs/introduction/plans, checked 2026-10-11 by that branch) | Hyperdrive unlimited; Neon same | Hyperdrive pricing |
| Workers Logs | 200k events/day, 3-day retention → $0 | 20M/month, 7-day → $0 | workers-logs URL §3.6 |
| Email (Q6) | Cloudflare Email Sending **"Not available"** on Free → separate provider | **3,000 included/month**, then "$0.35 per 1,000"; 2,000/month → $0 (https://developers.cloudflare.com/email-service/platform/pricing/, checked 2026-10-11); product is **beta** (https://developers.cloudflare.com/email-service/, checked 2026-10-11) | |
| CI | Workers Builds Free "3,000 per month" build minutes, "1" concurrent, "20 minutes" timeout; Paid "6,000" (https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/, checked 2026-10-11). Private-repo support not stated (**Unverified**); GitHub Actions is the fallback | same | |
| Domain `.com` | Cloudflare Registrar charges "the exact fee set by the registry … no markups" but the page shows no number (https://www.cloudflare.com/application-services/products/registrar/buy-com-domains/, checked 2026-10-11): **price Unverified**. Reference: Porkbun .com $11.08/yr ≈ $0.92/mo (sibling H1H2 note, https://porkbun.com/tld/com, checked 2026-10-11 by that branch) | same | |
| Domain `.ca` | **Cloudflare Registrar supports .ca** ("ca" / "CIRA", listed under recently added, https://www.cloudflare.com/tld-policies/, checked 2026-10-11); price Unverified. Porkbun .ca renewal $11.60 ≈ $0.97/mo (sibling note, https://porkbun.com/tld/ca) | same | |
| **Total** | **≈ $0.95/month** (domain only) + an external email provider (Q6) | **≈ $5.95/month** (above the $5 target by the domain cost) | |

**What pushes H3 above $5/month:** simply needing Workers Paid (CPU limit, Cloudflare email, more D1 databases,
longer log retention, 30-day Time Travel). Paid + domain is ≈ $6. Beyond that, overage is cents at this scale. A
real risk is Neon (H3b) exceeding 100 CU-h/project (Launch "$0.106/CU-hour", per sibling note citing
https://neon.com/pricing).

**The Free-plan CPU question (potential deal-breaker for Free):** Free is "10 ms" CPU per HTTP request
(limits URL). React SSR of a full page plus auth/session checks may exceed 10 ms on some requests; I have no
measurement (**Unverified**, must be measured with a spike). Cloudflare docs fetched here do not describe any grace
behaviour. If it is exceeded routinely, H3 effectively costs $5/month + domain.

### 3.3 Free-tier limits and behaviour at the limit

| Resource | Free limit | At the limit | Source (checked 2026-10-11) |
|---|---|---|---|
| Worker requests | "100,000/day", "resetting at midnight UTC" | "Cloudflare returns **Error 1027**". Per route: fail open "Bypasses the Worker" or fail closed "Returns a Cloudflare 1027 error page". **Hard stop, no billing** | https://developers.cloudflare.com/workers/platform/limits/ |
| Static assets with `run_worker_first` | free | over the limit these requests "will receive a 429 (Too Many Requests)" | https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ |
| CPU per request | "10 ms" (Paid "5 min (default: 30 seconds)") | request error (exact code not on the pages fetched, **Unverified**) | limits URL |
| Memory | "128 MB" per isolate (both plans) | | limits URL |
| Subrequests | "50" (Paid "10,000") | | limits URL |
| Variables/secrets per Worker | "64" (Paid "128"), "5 KB" each | | limits URL |
| D1 | 10 DBs; "500 MB (Free)" per DB; 5 GB/account; 5M rows read/day; 100k rows written/day; "50" queries per invocation | Pricing page only says "Free limits reset daily at 00:00 UTC"; over-limit behaviour not stated (**Unverified**: presumably errors, no billing) | https://developers.cloudflare.com/d1/platform/limits/ ; pricing URL |
| D1 throughput | "Each individual D1 database is inherently single-threaded"; "If your average query takes 1 ms, you can run approximately 1,000 queries per second" | queue, then "overloaded" error | D1 limits URL |
| Hyperdrive | 100,000 queries/day; 10 configs; ~20 origin connections/config | "further operations of that type will fail with an error" | Hyperdrive pricing + limits URLs |
| Durable Objects | 100k requests/day; 13,000 GB-s/day; SQLite only | "further operations of that type will fail with an error" | DO pricing URL |
| Queues | "10,000 operations/day"; retention "24 hours (non-configurable)" | not stated | https://developers.cloudflare.com/queues/platform/pricing/ |
| Workers Logs | 200,000 events/day; 3 days retention | account-level: beyond 5 billion/day "a 1% head-based sample" (per-account Free behaviour at 200k not stated, **Unverified**) | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ |

**Inactivity, sleeping, cold starts.** None of the Cloudflare pages fetched describe pausing or deleting idle Workers
or D1 databases (no such clause found; absence is not proof, **Unverified**). Isolate cold-start behaviour was not
checked (**Unverified**). For H3b, Neon Free scales to zero after 5 minutes idle and reactivates "within a few
hundred milliseconds" (sibling note citing https://neon.com/docs/introduction/scale-to-zero). Hyperdrive's idle
connection timeout is "10 minutes" (Hyperdrive limits URL); whether Hyperdrive's pooled idle connections keep a Neon
compute awake (burning CU-hours) is **Unverified** and must be measured.

**Credibility assessment [opinion].** H3 never sleeps, so first page loads in a class are fast. The real risk on Free is
a **hard daily stop** (1027 or 429) in the middle of a class. Mitigations: WebSockets via DO for live mode; Workers Paid
($5) removes the daily request cap ("No limit" on Paid, limits URL).

### 3.4 Terms that restrict use

- Developer Platform terms, "Last updated: September 28, 2026" (https://www.cloudflare.com/service-specific-terms-developer-platform/,
  checked 2026-10-11): no non-commercial or "fair use" wording was found on that page. It does say Cloudflare
  "may temporarily limit your storage and/or the number of requests … if processing such requests would put an undue
  burden on the Cloudflare network"; may "limit or suspend … without notice"; may change `workers.dev`/`pages.dev`
  subdomains "for any or no reason" (so use a custom domain); keeps Customer Content "for up to thirty (30) days"
  after termination; and "Cloudflare does not reference or use any Customer Content except as needed to provide the Services".
- The master Self-Serve Subscription Agreement and Privacy Policy were **not fetched** (**Unverified**).
- **Interpretation (Unverified):** nothing found restricts a free, public, non-commercial or institutional pilot.
  Unlike Vercel Hobby (sibling note: "for personal, non-commercial use"), Workers Free has no such clause on the page read.

### 3.5 Regions and data residency

- D1 location hints: `wnam`, `enam`, `weur`, `eeur`, `apac`, `oc`; "Providing a location hint does not guarantee that
  D1 runs in your preferred location". Jurisdictions: `eu`, `fedramp`, `us`, set only "on database creation".
  **No Canada hint or jurisdiction** (https://developers.cloudflare.com/d1/configuration/data-location/, checked 2026-10-11).
- Workers code runs on Cloudflare's network wherever requests arrive (exact placement rules not fetched; Smart
  Placement mentioned on the service-bindings page). Restricting processing to a region needs the Data Localization
  Suite, an "Enterprise-only paid add-on" (https://developers.cloudflare.com/data-localization/, checked 2026-10-11).
  Whether it offers a Canada region was not stated there (**Unverified**).
- H3b: Neon has no Canadian region (sibling note citing https://neon.com/docs/introduction/regions, checked 2026-10-11).
- **Conclusion:** neither H3a nor H3b can keep app processing or data in Canada on a self-serve plan. Canadian
  residency is **not** a CONTRIBUTING requirement; it is proposed as a new open question (§8).

### 3.6 Privacy-architecture support (§6)

| Mechanism | H3a (D1) | H3b (Hyperdrive + Neon Postgres) |
|---|---|---|
| Multiple DB roles with different grants | **No.** D1 has no users/roles; whoever holds the binding has full read/write on that DB (no D1 role concept on any page fetched) | **Yes**, standard Postgres; caveat that Neon Console/API roles get `neon_superuser` with `BYPASSRLS` (sibling note citing https://neon.com/docs/manage/roles) → create restricted roles with SQL |
| RLS | **No** (SQLite) — §12 known issue confirmed | Yes (standard Postgres) |
| Separate schemas | **No**; use separate D1 databases instead | Yes |
| Multiple physically separate DBs | **Yes**, cheap: 10 (Free) / 50,000 (Paid) | Yes: separate Neon projects (100 on Free per sibling note) |
| SECURITY DEFINER-style narrow access | Equivalent: a Worker exposing only specific RPC methods over its own DB | Yes (Postgres functions), plus the same Worker RPC pattern |
| Different code paths hold different secrets | **Yes.** "Secrets … are defined and managed on a per-Worker level"; values "are not visible within Wrangler or Cloudflare dashboard after you define them" (https://developers.cloudflare.com/workers/configuration/secrets/, checked 2026-10-11). Bindings are per-Worker too | Same, plus distinct DB passwords per Hyperdrive config |
| Isolated internal services | **Yes**, binding-only Workers (§3.1) | Yes |
| Event processing between domains | Queues (Free 10k ops/day) or direct RPC; no cross-DB transactions | Same, or in-DB functions within one project |

**What the platform logs (Workers Logs).** "Logs include invocation logs, custom logs, errors, and uncaught
exceptions"; each invocation log "contains details such as the Request, Response, and related metadata" and is
"enriched with information available to Cloudflare"; "All newly created Workers will come with the observability
setting enabled by default"; invocation logs can be turned off with `invocation_logs = false`; sampling via
`head_sampling_rate` (0–1); retention Free "3 Days", Paid "7 Days"; "Data is written to your Cloudflare Account"
(https://developers.cloudflare.com/workers/observability/logs/workers-logs/, checked 2026-10-11). The page does **not**
list the exact fields (client IP, headers, cookies?) or any redaction, and does not say which account roles can read
logs (**Unverified**). The Logpush Workers Trace Events dataset lists `Event` only as "Details about the source event"
and no `ClientIP` field (https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/account/workers_trace_events/,
checked 2026-10-11). Pricing changes: "Beginning December 1, 2026, Workers Logs will use Cloudflare Observability
pricing" (pricing URL) — **re-check after that date**.

**Proposal for §6.2 / §9 compliance on H3:**
1. Set `invocation_logs = false` on the content, participation and survey Workers (they must never log request
   metadata next to content), and keep them free of `console.log` except allowlisted structured fields.
2. The web Worker may keep invocation logs only if it never carries content in URLs/query strings (POST bodies only)
   and session identifiers are not in paths. Whether invocation logs include headers (cookies) is **Unverified** →
   test by inspecting a real log event before launch, and make that inspection a §9 negative test artefact.
3. Separate Workers mean separate log streams per service (`ScriptName` field), so identity-service and
   content-service logs are never in the same event — but they are in the same account, viewable by any account
   member with log access.
4. Error reporting: avoid third-party SDKs in content Workers or scrub to error class + Worker name only.

**Fit for the three designs:** (A) **impossible on H3a**, fully possible on H3b. (B) **excellent on both** — H3a
gives physical DB separation plus binding-scoped access essentially for free. (C) neutral; Workers can set strict CSP
headers on every response. Note that browser crypto keys must never be logged, so (C) also depends on log hygiene.

### 3.7 Developer experience (solo builder + Claude)

- Local dev runs in the real runtime: `wrangler dev` "uses local mode by default, powered by Miniflare and workerd";
  local D1 data persists across runs; `wrangler d1 migrations apply <db> --local`; set `"remote": true` to reach
  production data (https://developers.cloudflare.com/d1/best-practices/local-development/, checked 2026-10-11).
  Vitest integration was not on that page (**Unverified**). For H3b, local dev needs a local Postgres (Docker) and a
  local Hyperdrive connection string (**Unverified** mechanism).
- Preview deployments: Workers Builds creates Previews for non-production branches and can post the URL on the PR
  (https://developers.cloudflare.com/workers/ci-cd/builds/, checked 2026-10-11). Version URLs are "public" when enabled
  and can be protected with Cloudflare Access; they share production's "existing configuration and resources"
  (https://developers.cloudflare.com/workers/configuration/previews/, checked 2026-10-11) → **a Version URL would hit
  production D1**. Use branch Previews with isolated bindings, or skip previews for privacy-bearing Workers.
- Docs quality: Cloudflare publishes `llms.txt` indexes (referenced on the React Router page). Mainstream adoption
  numbers not verified (**Unverified**). Multi-Worker apps (six Workers, six DBs) add wiring overhead for one person.
- Windows: OpenNext says "Windows full support is not guaranteed" (opennext URL). React Router + Vite plugin on
  Windows not checked (**Unverified**).

### 3.8 Lock-in and migration path (§10–§11)

- **H3a: high lock-in.** D1 is SQLite with Cloudflare bindings; service-binding RPC, Durable Objects and Queues are
  Cloudflare APIs. Moving to Postgres/another cloud means a data-dialect migration and replacing bindings with network
  calls. An institution cannot run D1 on its own servers (no self-hosted D1 product found; **Unverified**).
- **H3b: medium.** Data is ordinary Postgres (portable via `pg_dump`). Compute code depends on Workers APIs; a
  React Router app can be re-targeted to a Node server (model knowledge, **Unverified**), so keeping domain logic in
  plain TypeScript modules behind thin Worker adapters limits the rewrite.
- **Paid path in place:** Workers Paid $5 minimum (+ usage) covers production-like limits cheaply; Neon Launch if
  needed. Enterprise-only features (Data Localization) are the expensive step.

### 3.9 Operational burden

- No servers or OS patching. D1 Time Travel: "always on", "incur no additional costs", restore "to any minute",
  window "30 days (Workers Paid plan) or 7 days (Workers Free plan)", restore "is a destructive operation, and
  overwrites the database in place"; longer retention by exporting to R2 via Workflows
  (https://developers.cloudflare.com/d1/reference/time-travel/, checked 2026-10-11). Six DBs = six restore points to
  coordinate (cross-DB consistency after a restore is the owner's problem).
- H3b: Neon Free history window 6 hours (sibling note citing https://neon.com/docs/introduction/point-in-time-restore).
- Monitoring: Workers Observability dashboard; no uptime alerting checked (**Unverified**).

### 3.10 Verdict on H3

| | H3a Workers + D1 | H3b Workers + Hyperdrive + Neon |
|---|---|---|
| Strengths | ~$1/month on Free; no sleeping; physical separation (design B) cheap and natural; per-Worker secrets; WebSockets via DO for class bursts; email bundled on Paid | Postgres keeps design A open and the data portable; same edge compute; Hyperdrive free |
| Weaknesses | No roles/RLS/schemas; SQLite dialect; heavy Cloudflare-specific primitives; Next.js only via beta/community adapters; 10 ms Free CPU; email not on Free | Two vendors; Neon CU-hour budget per project; Hyperdrive caching semantics to audit; still Workers-specific compute |
| Deal-breakers | If production must be institution-hosted, Canadian-resident, or use Postgres RLS (design A), H3a means a rewrite | Canadian residency impossible (neither CF nor Neon) |
| Choose when | The owner picks design B, accepts Cloudflare as the long-term home, and wants the lowest cost | The owner wants Workers' cost/performance but Postgres for portability and design A |

## 4. Option H4 — Portable container on a PaaS + managed Postgres

### 4.0 Checking the unvetted chat's claims (PDF p.31)

| Claim | What the official page says now | Verdict |
|---|---|---|
| Railway "pay as you go model starting at $5 per month, which includes a $5 usage credit" | Hobby "$5 / month", "includes $5 of resource usage per month"; "If your total resource usage exceeds $5 in any given billing period, you will be charged the delta" (https://docs.railway.com/reference/pricing/plans, checked 2026-10-11). There is now also a **Free** plan: "$0/month with $1 of monthly usage credits" (https://railway.com/pricing, checked 2026-10-11) | **Correct for Hobby; incomplete** ("starting at $5" ignores Free, which allows "0 custom domains") |
| Railway always-on prototype "between $10 and $20 per month" | Unit prices: RAM "$10 / GB / month", CPU "$20 / vCPU / month", volume "$0.15 / GB / month", egress "$0.05 / GB"; "Service builds are free" (plans URL) | **Plausible, not verifiable**: depends on measured RAM. My estimate is $5–10 (§4.2) |
| Railway "builds it automatically without requiring Docker configurations" | Not checked (**Unverified**) | — |
| Render "free database expires after 30 days" | "Free Render Postgres databases expire 30 days after creation"; then "a grace period of 14 days"; then "Render deletes the database (along with all of its data)"; "don't support any form of backups" (https://render.com/docs/free, checked 2026-10-11) | **Correct, and worse than stated** (deletion, no backups) |
| Render web services "spin down after 15 minutes of inactivity" | "spins down a Free web service that goes 15 minutes without receiving any inbound traffic"; spin-up "takes about one minute" (same URL) | **Correct** |
| Render "$7 web service and $6 database" | render.com/pricing loads its tables dynamically; the fetch tool received no prices (https://render.com/pricing, checked 2026-10-11) | **Unverified** |

### 4.1 Picking the best container platform

| Criterion | Google Cloud Run | Render | Railway | Fly.io |
|---|---|---|---|---|
| Free compute | "2 million requests per month", "360,000 GB-seconds of memory, 180,000 vCPU-seconds", "1 GB of outbound data transfer from North America per month" (https://docs.cloud.google.com/free/docs/free-cloud-features, checked 2026-10-11) | 750 instance-hours/workspace/month; spins down after 15 min; ~1 min spin-up; "Do not use them for production applications" (render.com/docs/free) | Free: $1 credit, "1 vCPU / 0.5 GB per service, 1 replica", **"0 custom domains"** (railway.com/pricing). Trial "$5 in credits for 30 days" | **None**: "New organizations don't have a free tier or a monthly free usage allowance"; trial "up to 2 hours of Machine runtime or 7 days" (https://docs.fly.io/about/pricing, checked 2026-10-11) |
| Cheapest always-on paid | min-instances ≥ 1 at an idle rate; rate not readable (**Unverified**, §4.2) | **Unverified** prices | Hobby $5 incl. $5 usage, then usage | "shared-cpu-1x with 256MB RAM \| $2.19/month" (iad/ewr; "Other regions cost more") (fly pricing URL) |
| Managed Postgres | Cloud SQL: not in Free Tier; only "a 30-day Cloud SQL free trial instance" (free-features URL) → pair with Neon/Supabase | Free DB deleted after 30 + 14 days | Volume-backed DB; backups exist (plan availability not stated) (https://docs.railway.com/reference/backups) | Managed Postgres "$38/month (Basic)" and up (fly pricing URL) |
| Canadian region | **Yes**: `northamerica-northeast1` (Montreal), `northamerica-northeast2` (Toronto), both "Tier 2" (https://docs.cloud.google.com/run/docs/locations, checked 2026-10-11) | **No** (Oregon, Ohio, Virginia, Frankfurt, Singapore; https://render.com/docs/regions) | **No** (California, Virginia, Amsterdam, Singapore; https://docs.railway.com/reference/deployment-regions) | **Yes**: `yyz` Toronto, which also hosts Managed Postgres (https://docs.fly.io/reference/regions) |
| Sleeping / cold start | Scales to zero by default; min instances are "a best-effort target to keep instances warm" (https://docs.cloud.google.com/run/docs/configuring/min-instances) | 15 min idle → ~1 min wake | Optional Serverless: sleeps 5–10 min after last outbound packet; "The first request sent to a slept service may return a 502 Bad Gateway" (https://docs.railway.com/reference/app-sleeping) | Machines can be stopped/started (auto-stop details not fetched, **Unverified**) |

**Pick: Google Cloud Run + external managed Postgres (Neon Free, or Supabase Free used only as Postgres for a
Canadian option).** It is the only container platform with a real, non-expiring free tier that fits the prototype,
it has Canadian regions, and per-service identities/secrets suit design B. Render Free fails "always-available"
(1-minute wake, DB deleted). Railway Free cannot use a custom domain and Hobby likely exceeds $5. Fly has no free tier
and its managed Postgres starts at $38.

### 4.2 Architecture sketch (H4-CR)

```
Browser ─HTTPS─► custom domain ─► (Firebase Hosting rewrite  OR  global external Application Load Balancer)
                                   └► Cloud Run service "web" (Next.js standalone or React Router on Node; Docker image)
                                         │ runs as service account sa-web (no DB credentials of its own)
                                         ├─ private HTTP ─► Cloud Run "identity"  (sa-identity → secret: identity DB role)
                                         ├─ private HTTP ─► Cloud Run "content"   (sa-content  → secret: content DB role)
                                         ├─ private HTTP ─► Cloud Run "particip"  (sa-particip → secrets: DB role + HMAC key)
                                         └─ …  survey, shared-results, audit
   Postgres: design A = one Neon project, schemas + roles + RLS, one role per service;
             design B = one Neon project per domain (or separate Supabase projects in ca-central-1).
   Prototype simplification (proposal): ONE Cloud Run service with in-process module boundaries and one DB role per
   module (design A), splitting into separate services later — the container makes that split cheap.
```

- Internal service auth (IAM-authenticated invocations, `--no-allow-unauthenticated`) and per-secret IAM in Secret
  Manager are standard GCP features (model knowledge, **Unverified** on pages fetched here).
- Custom domain: Cloud Run domain mapping is "in the preview launch stage … not recommended for production services"
  and is available only in us/eu/asia Tier 1 regions listed on the page, **not** Montreal/Toronto; options are the
  load balancer ("Recommended") or Firebase Hosting, which "has a low price"
  (https://docs.cloud.google.com/run/docs/mapping-custom-domains, checked 2026-10-11). Firebase rewrites to Cloud Run
  support `northamerica-northeast1` and `-northeast2` but require a billing account, which "automatically upgraded to
  the Blaze pricing plan" (https://firebase.google.com/docs/hosting/cloud-run, checked 2026-10-11). Firebase Hosting's
  own free quota, request timeout and WebSocket support through rewrites were not on the part of the page read
  (**Unverified**). Load-balancer price not on the page (**Unverified**).

### 4.3 Monthly cost at prototype scale [Estimate unless cited]

Usage model: ~120k requests/month (same as §3.2); ~200 ms average request time [assumption]; 1 vCPU / 512 MiB.
Request-based billing, min instances 0. Compute ≈ 120k × 0.2 s = 24,000 vCPU-s and 12,000 GB-s: about 13% of the
free vCPU-seconds and 3% of free GB-seconds.

| Line item | Cost | Source (checked 2026-10-11) |
|---|---|---|
| Cloud Run compute + requests | $0 (inside 2M requests, 180k vCPU-s, 360k GB-s) | free-features URL |
| Postgres | Neon Free $0 (100 CU-h/project; sibling H1H2 note citing https://neon.com/docs/introduction/plans). Or Supabase Free in `ca-central-1` $0 (sibling note citing https://supabase.com/docs/guides/platform/regions; Supabase free-project pausing is in that note) | sibling note |
| Artifact Registry | "0.5 GB of storage per month" free; several Node images may exceed it → cents (rate **Unverified**). Use a cleanup policy | free-features URL |
| Secret Manager | "6 active secret versions per month", "10,000 access operations per month" free; design B with ~8 secrets → small overage (rate **Unverified**) | free-features URL |
| Cloud Logging | "First 50 GiB of log data per project per month" free | free-features URL |
| Cloud Build / CI | "2,500 build-minutes per month" free, or GitHub Actions (sibling note: 2,000 min/month private) | free-features URL |
| Custom domain routing | US region: domain mapping $0 but Preview. Canada: Firebase Hosting (Blaze; quota **Unverified**) or LB (**Unverified**, likely the largest line) | mapping URL |
| Email (Q6) | Not bundled. E.g. Resend Free 3,000/month but 100/day (sibling note citing https://resend.com/pricing) | — |
| Domain | ≈ $0.92 (.com) or ≈ $0.97 (.ca) per month at Porkbun (sibling note) | — |
| **Total** | **≈ $1–1.50/month** in a US region; Canada adds the routing line (unknown, possibly $0 via Firebase) | |

**What pushes H4-CR above $5/month:** (1) `min-instances = 1` to remove cold starts (idle rate **Unverified**: the
pricing page https://cloud.google.com/run/pricing could not be read by the fetch tool on 2026-10-11, it truncated);
(2) a load balancer for a Canadian-region custom domain; (3) Neon above 100 CU-h/project; (4) automatic overage:
"If you have a Paid billing account and go beyond those limits, then you will be billed for the overage"
(free-features URL). There is no spending hard cap on the pages read (**Unverified**); budget alerts and a low
`max-instances` are the controls.

**1,000-student burst.** Polling every 5 s for 50 minutes ≈ 600k requests — inside the 2M free requests, but three
such classes a month would pass it (overage per million **Unverified**). Live WebSockets/SSE keep a request open, and
under request-based billing an instance is billed while any request is active, so 1,000 open connections for 50
minutes on several instances could use tens of thousands of vCPU-s per class [Estimate]. Fan-out across instances
also needs a shared channel (e.g. Postgres LISTEN/NOTIFY over a direct, non-pooled connection, **Unverified** on Neon).
Simplest prototype design (proposal): short polling with ETags for vote totals, or one live service with
`max-instances = 1` and high concurrency.

Comparison lines for the other container platforms (same assumption):

| Platform | Monthly estimate | Basis |
|---|---|---|
| Render | Free unusable for an always-on prototype; paid web + DB **Unverified** (chat says $7 + $6) | §4.0 |
| Railway Hobby | $5 minimum; web (≈0.25–0.5 GB RAM) + Postgres (≈0.25 GB) ≈ $5–10 [Estimate, unmeasured] + domain | Railway unit prices |
| Fly.io | Machine $2.19 (256 MB, likely too small for Next.js, **Unverified**) or more in yyz; + Neon/Supabase $0; + dedicated IPv4 "$2/mo" only if needed (shared is free) ≈ $3–6 [Estimate] | fly pricing URL |

### 4.4 Free-tier limits and behaviour at the limit (H4-CR)

| Resource | Limit | At the limit | Source (checked 2026-10-11) |
|---|---|---|---|
| Cloud Run requests / compute | 2M requests, 180k vCPU-s, 360k GB-s per month | **Automatic billing** at standard rates on a paid billing account; "Free Tier limits aren't credit; they don't accumulate or roll over" | free-features URL |
| Billing account | "A Google Cloud billing account is required to access the Google Cloud Free Tier" | — | free-features URL |
| $300 trial | "$300 Welcome credit to spend over 90 days"; "You will not be billed … during your Free Trial"; after it ends without upgrade, resources stop, then a 30-day grace before deletion | trial ends → services stop | free-features URL |
| Scale to zero | default min instances "0"; "Cloud Run removes instances that are not processing requests (idle)" | next request cold-starts (duration not stated on the page, **Unverified**) | min-instances URL |
| Neon Free (paired DB) | 100 CU-h/project/month, 1 GB/project, 5 GB egress/project | compute "suspended until the next billing period or until you upgrade"; "None of these limits delete your data" | sibling H1H2 note citing https://neon.com/docs/introduction/plans |
| Render Free (for contrast) | 750 h/workspace; DB 1 GB | "Render suspends all of your Free web services until the start of the next month"; DB deleted 30 + 14 days after creation | render.com/docs/free |
| Railway (for contrast) | credit-based | Credits at zero: "your subscription will be cancelled" and "we will stop all of your workloads" | Railway plans URL |

**Credibility assessment [opinion].** Cloud Run never deletes or suspends the app for inactivity; the cost of scale-to-
zero is a cold start on the first request after idle (plus a Neon wake of "a few hundred milliseconds", sibling note).
For a class, the first student to open the page pays it. Mitigation options to test: a cheap periodic warm-up
request, or `min-instances = 1` (cost **Unverified**). The more serious credibility risk is a surprise bill, not an
outage, because the free tier rolls into billing.

### 4.5 Terms that restrict use

- Google Cloud Terms / Service Specific Terms were **not fetched** (**Unverified**). No non-commercial clause is
  known to me; this must be checked before launch.
- Neon: per the sibling H1H2 note, the Terms schedule "last updated 2026-08-05" has no non-commercial or fair-use clause
  for Free (https://neon.com/terms-of-service, checked 2026-10-11 by that branch).
- Render Free: "Do not use them for production applications"; "Render might restart a Free web service at any time"
  (render.com/docs/free). A public pilot with real courses is arguably "production" (**interpretation, Unverified**).
- Railway: Hobby is described as "for indie hackers and developers to build and deploy personal projects" and
  "For solo developers and side projects"; Pro is "for professional developers and their teams shipping to production"
  (railway.com/pricing). These are positioning statements, not stated restrictions (**interpretation, Unverified**).

### 4.6 Regions and data residency

- Cloud Run: Montreal and Toronto both available, "Subject to Tier 2 pricing" (locations URL). Domain mapping not
  available there (mapping URL); Firebase Hosting rewrites are (firebase URL).
- Postgres in Canada: **Neon has no Canadian region** (sibling note). Options with a Canadian region: Supabase
  `ca-central-1` on Free (sibling note), Fly Managed Postgres in `yyz` from $38/month (fly URLs), Cloud SQL in Montreal/
  Toronto (not free; price **Unverified**).
- **So H4-CR is the only option in this file that can put both app processing and the database in Canada for about
  $0**: Cloud Run `northamerica-northeast1` + Supabase Free `ca-central-1` used purely as Postgres (Supabase details in
  the sibling note; its Free inactivity pausing is a separate risk recorded there). This matters only if residency
  becomes a requirement (proposed open question, §8).

### 4.7 Privacy-architecture support (§6)

| Mechanism | H4-CR + Neon (or any Postgres) |
|---|---|
| Multiple DB roles, different grants | Yes (standard Postgres). Neon caveat: Console/API-created roles get `neon_superuser` incl. `BYPASSRLS`; create app roles with SQL (sibling note citing https://neon.com/docs/manage/roles) |
| RLS, separate schemas, SECURITY DEFINER | Yes (standard Postgres; sibling note) |
| Multiple physically separate DBs | Yes: separate Neon projects (100 on Free; each with its own 100 CU-h and its own cold start) or separate providers |
| Different code paths hold different secrets | Yes, two levels: one Cloud Run service per domain, each with its own service account and its own secrets (per-secret IAM is standard GCP, **Unverified** here) — or, in a single service, one DB role per module (weaker: one process can read every module's env) |
| Isolated internal services | Yes: private, IAM-authenticated Cloud Run services (**Unverified** details) |
| Event processing between domains | Pub/Sub or Cloud Tasks (free quotas **Unverified**), or in-DB functions/queues in design A |

**What the platform logs.** Cloud Run request logs "are created automatically"; "you cannot control the amount of
request logs directly from Cloud Run", but "you can make use of the logs exclusion feature from Cloud Logging"; stdout/
stderr go to Cloud Logging automatically (https://docs.cloud.google.com/run/docs/logging, checked 2026-10-11). The
`httpRequest` subfields were not listed on that page; Cloud Logging's HttpRequest type is commonly documented with
URL, remote IP and user agent (**Unverified**: the reference URL I tried returned 404). "You can modify and disable
the `_Default` log sink" and add exclusion filters; "You can't modify or delete the `_Required` log sink"
(https://docs.cloud.google.com/logging/docs/routing/overview, checked 2026-10-11). Retention: `_Default` "30 days",
project-configurable "between 1 day and 3650 days"; `_Required` "400 days", "Not configurable"
(https://docs.cloud.google.com/logging/quotas, checked 2026-10-11). `_Required` holds admin-activity audit logs about
the cloud project itself, not user requests (model knowledge, **Unverified**). Who can read logs is governed by IAM
(not stated on the pages read, **Unverified**).

**Proposal for §6.2 / §9 on H4-CR:** exclude request logs for the content, participation and survey services with
a Cloud Logging exclusion filter (or set `_Default` retention to 1 day for them); keep identity-service request logs
only if needed; never carry content or identity in URLs; allowlisted structured logging only; and treat Google
Error Reporting (which parses errors out of logs, **Unverified**) as a log destination covered by the same rule.
A §9 negative test can query Cloud Logging for a seeded marker string and assert it never co-occurs with an identity
field.

**Fit for the three designs:** (A) **full** (real Postgres, testable locally). (B) **full** (separate services, service
accounts, DBs). (C) neutral; full control of CSP and headers.

### 4.8 Developer experience (solo builder + Claude)

- Local dev and tests run against a **real local Postgres** (Docker Compose) with the same roles, schemas and RLS as
  production, so §9 negative tests ("cannot retrieve authors … through the UI, API, exports, logs") run in CI
  unchanged. This is the strongest testing story of the four options [opinion].
- The app is a plain Node server (Next.js `output: standalone` or React Router's Node server), so Claude can use the
  most common, best-documented patterns. No edge-runtime constraints (e.g. 10 ms CPU, no TCP sockets).
- Costs of the container path: a Dockerfile, an image registry, GCP IAM/console complexity, and wiring CI (GitHub
  Actions → Cloud Run, e.g. with Workload Identity Federation, **Unverified** details). Preview environments: Cloud Run
  revision tags give per-PR URLs (model knowledge, **Unverified**); Neon branches give per-PR databases (sibling note).
- Windows: Docker Desktop/WSL is the normal route (**Unverified** for this machine).

### 4.9 Lock-in, portability and the production path (§10–§11)

- **Compute lock-in: very low.** An OCI image runs on Cloud Run, AWS (ECS/App Runner), Azure Container Apps,
  Kubernetes/OpenShift, or a VM with Docker. GCP-specific glue (IAM invoker auth, Secret Manager, Firebase Hosting)
  should sit behind env vars and a thin adapter (proposal).
- **Data lock-in: low.** Standard Postgres; move with `pg_dump`/logical replication.
- **How much portability matters here [analysis, not a requirement]:**
  - CONTRIBUTING requires "deployment documentation" (§11) and production sign-in/provisioning through "supported
    integrations" (§10), but says nothing about *where* production runs. That is an unknown, not a requirement.
  - It matters a lot **if** UW (or a later institution, §4 "later institutions must be supportable without code
    changes") requires institution-hosted or Canadian-resident deployment, or a procurement/security review that
    rejects a given vendor. A container + Postgres is the most widely accepted deliverable; a Workers + D1 app
    would need its data layer and service wiring rewritten.
  - It matters little **if** the product stays a vendor-hosted SaaS-style service run by the owner; then Workers' lower
    cost and edge performance win.
  - Vendor free tiers change (Fly removed free allowances: "Organizations on plans discontinued in October 2024 keep
    the free allowances", fly pricing URL; Cloudflare Workers Logs pricing changes "Beginning December 1, 2026").
    Portability is insurance against that.

### 4.10 Operational burden

- No servers, but the owner **does** own the container: base-image and dependency updates mean periodic rebuilds.
- Backups: Neon Free history 6 hours (sibling note). Proposal: a scheduled `pg_dump` per domain (Cloud Run Job or
  GitHub Actions) to encrypted storage, with **separate dumps and keys per privacy domain**, since one dump containing
  identity and content together would recreate the joinable dataset §6.2 forbids in exports. Restore drills are part of
  "deployment documentation" (§11).
- Monitoring: Cloud Monitoring/uptime checks (free quota **Unverified**); budget alerts are essential because overage
  bills automatically (§4.4).

### 4.11 Verdict on H4

| | H4-CR (Cloud Run + Neon/Supabase) | Render / Railway / Fly |
|---|---|---|
| Strengths | Real free tier; never deleted for inactivity; Canadian regions; full Postgres (A) and service isolation (B); best local testing; most portable to production | Simpler dashboards (Render/Railway); Fly has Toronto + managed Postgres |
| Weaknesses | Cold starts at min-instances 0; GCP complexity; no hard spending cap; custom domain in Canada needs Firebase Hosting or an LB; live-mode fan-out across instances is DIY | Render Free sleeps 15 min and deletes the DB; Railway Free has no custom domain and Hobby likely > $5; Fly has no free tier, MPG $38+ |
| Deal-breakers | None found; the unknown idle/LB prices must be checked before relying on min-instances or an LB | Render Free and Railway Free are deal-breakers for a credible always-on prototype |
| Choose when | Portability, Postgres-based privacy (A), or Canadian residency matter more than the last dollar and edge latency | Only as paid fallbacks if the owner accepts ~$6–15/month [Estimate] |

## 5. Head-to-head

Scores are my judgement (✓✓ strong, ✓ adequate, ~ weak, ✗ fails) against the owner's constraints and CONTRIBUTING.

| Criterion | H3a Workers + D1 | H3b Workers + Hyperdrive + Neon | H4-CR Cloud Run + Neon/Supabase |
|---|---|---|---|
| Prototype cost (< $5 target) | ✓✓ ≈ $1 on Free; ≈ $6 on Paid | ✓✓ ≈ $1 on Free; ≈ $6 on Paid | ✓✓ ≈ $1–1.5; more with min-instances/LB (**Unverified** rates) |
| Behaviour at limits | Hard stop (1027/429), no surprise bill | Hard stop (Workers, Hyperdrive) + Neon suspend | Automatic billing; Neon suspend |
| Always-available / cold start | ✓✓ no sleeping found | ✓ Neon wake (few hundred ms) | ✓ Cloud Run cold start + Neon wake |
| Class burst (100) | ✓✓ (DO WebSockets) | ✓✓ | ✓✓ |
| 1,000-student burst | ✓ on Paid; Free cap risk if polling | same | ✓ (free tier absorbs a few; then cents) |
| §8 credible (custom domain, TLS) | ✓✓ custom domain on Free; Cloudflare Registrar sells .com and .ca | ✓✓ | ✓ US region easy (Preview mapping) / Canada needs Firebase or LB |
| Design A (roles, schemas, RLS, SECURITY DEFINER) | ✗ | ✓✓ | ✓✓ |
| Design B (separate DBs/services/secrets) | ✓✓ cheapest, most natural | ✓✓ | ✓✓ |
| Design C (browser crypto) | ✓ neutral | ✓ neutral | ✓ neutral |
| Platform log control | ✓ `invocation_logs = false` per Worker; fields **Unverified**; 3/7-day retention | ✓ same | ✓ exclusion filters, 1–3650-day retention; request logs on by default |
| Canadian residency possible | ✗ (no CA hint/jurisdiction; DLS Enterprise-only) | ✗ (Cloudflare + Neon) | ✓✓ (Cloud Run Montreal/Toronto + Supabase ca-central-1) |
| Mainstream / docs / Claude familiarity | ✓ (React Router guide first-class; Next.js path beta/community) | ✓ | ✓✓ plain Node + Postgres + Docker |
| Local testing against real DB | ✓ local D1 via Miniflare (SQLite dialect) | ~ local Postgres + Hyperdrive wiring (**Unverified**) | ✓✓ Docker Postgres identical to prod |
| Lock-in / production portability | ✗ high | ~ medium (compute only) | ✓✓ low |
| Operational burden | ✓✓ lowest (Time Travel free, 7/30 days) | ✓ | ✓ image rebuilds, own backup job |

**Bottom line [analysis].** H3a is the cheapest way to get physically separated stores, but it forecloses design A and
any institution-hosted or Canadian-resident production without a rewrite. H4-CR keeps every privacy design and every
production path open at roughly the same prototype cost, at the price of cold starts, GCP complexity and no hard
spending cap. H3b sits between them: Postgres data portability with Cloudflare compute.

## 6. Privacy implications (§6)

Requirements in play: §6.1 (five separated domains), §6.2 (restricted service roles, opaque IDs, narrow internal
APIs, privacy-preserving event processing; no identity + anonymous text together in logs, analytics, error reports,
DB views, exports, dashboards), §6.3 (Q9 tension), §6.4 (default nobody can deanonymize), §9 (negative tests incl.
logs), §3 last row.

1. **Separation strength is ultimately about who holds which credential.** On H3a the "credential" is a D1 *binding*
   attached to exactly one Worker; on H3b/H4 it is a Postgres role password held by exactly one service. Both satisfy
   "restricted service roles" (§6.2) in spirit. H3a cannot additionally enforce rules *inside* a database (no RLS,
   no grants), so every rule lives in Worker code and tests.
2. **The account owner can always read everything** on every platform here (single Cloudflare account, single GCP
   project/billing account). §6.4 says "Default: nobody can deanonymize", including admins. The threat model (Q8) must
   state that the operator of the hosting account is a trusted party, or the design must use (C)-style or keyed
   techniques so that even the operator's DB access does not yield the mapping. This is not solvable by hosting choice
   alone (**proposed new open question**, §8).
3. **Platform logs are a §6.2/§9 surface on both stacks.** Cloudflare invocation logs and Cloud Run request logs are
   on by default. Both can be suppressed for content-bearing services (Cloudflare `invocation_logs = false`; GCP
   exclusion filters). The exact fields logged by Cloudflare (IP? headers? cookies?) are **Unverified** and must be
   inspected on a real deployment before launch.
4. **Timing correlation.** If a content insert and a counter increment happen in the same request, timestamps in the
   two stores (or in logs) can re-link them. Queues (Cloudflare) or Pub/Sub/Cloud Tasks (GCP) allow delayed or batched
   counter updates; counters need not store per-event timestamps. This is a Q9 design input, not a decision.
5. **Backups and exports.** D1 Time Travel is per database (good: per-domain). For Postgres, one `pg_dump` of a
   design-A database would contain identity and content together; per-schema or per-project dumps with separate keys
   are needed (§6.2 "export").
6. **Caching.** Hyperdrive (H3b) caches query results; any edge cache must never serve one user's private counter or
   identity-linked data to another (**Unverified** defaults; must be configured).
7. **Keyed pseudonyms.** §12 already flags that an unkeyed hash of a user ID is reversible. On both stacks the HMAC key
   can live only in the participation service's secrets (per-Worker secrets or a per-service Secret Manager secret),
   so the content service never holds it. This is a supporting mechanism for Q9, not a closed answer.

## 7. Recommendation (PROPOSAL for owner approval)

> This is a proposal. It closes no open question. Q3 is decided only by an owner-approved ADR (§12, CLAUDE.md).

**Proposal 1 — between H3 and H4, prefer H4-CR: one portable Docker container on Google Cloud Run + managed
Postgres (Neon Free), with an exit to separate services later.**
- Why: it keeps **all three** privacy designs open (A needs Postgres; B needs separate services/DBs; C is neutral),
  costs about **$1–1.50/month** at the prototype assumption (domain + cents), never deletes or suspends the app for
  inactivity, and leaves every production path open (§10–§11): paid GCP, another cloud, or institution-hosted
  infrastructure, plus a Canadian-resident variant if that becomes a requirement.
- Shape for milestone 1 (proposal): a single Cloud Run service with strict module boundaries, one Postgres role per
  §6.1 domain (design A or a hybrid with B), each role's credential loaded only by its module. Split the participation
  and survey modules into separate Cloud Run services (own service accounts, own secrets) when the Q9 design calls
  for it; the container makes that a deployment change rather than a rewrite.
- Canadian variant (only if the owner wants it now): Cloud Run `northamerica-northeast1` + Supabase Free
  `ca-central-1` used purely as Postgres (see the sibling H1H2 note for Supabase limits) + Firebase Hosting for the
  custom domain. Costs the same on paper; Firebase quota and LB pricing are **Unverified**.

**Proposal 2 — if the owner prefers Cloudflare (lowest cost, no cold starts, hard stop instead of surprise bills),
choose H3b (Workers + Hyperdrive + Postgres), not H3a.** H3b keeps the data in Postgres (design A possible, data
portable). Budget for **Workers Paid ($5) + domain ≈ $6/month**, because the Free plan's 10 ms CPU limit for SSR is
unmeasured and Cloudflare Email Sending is Paid-only. Use React Router (first-class Workers guide) rather than
Next.js via vinext (beta) or OpenNext (community-maintained, Windows not guaranteed).

**Proposal 3 — choose H3a (D1) only if** the owner adopts design B, accepts Cloudflare as the long-term production
home, and accepts that Canadian residency and institution hosting would require rewriting the data layer.

**Not recommended for this prototype:** Render Free (15-minute sleep with ~1-minute wake; free DB deleted after 30 +
14 days, no backups), Railway Free (no custom domain) and Railway Hobby (likely > $5), Fly.io (no free tier; managed
Postgres from $38).

**Spikes to run before the ADR (each ≤ 1 day, proposals):**
1. Deploy a hello-world SSR page + one Postgres query on Cloud Run (min 0) and measure cold start + Neon wake from
   idle; repeat on Workers + Hyperdrive and record CPU ms per SSR request against the 10 ms Free limit.
2. Read the Cloud Run idle min-instance rate, Tier 2 (Montreal) rates and load-balancer price in the official
   Pricing Calculator (the pricing page could not be read on 2026-10-11).
3. Capture one real platform log entry from each stack (Cloudflare invocation log; Cloud Run request log) and record
   exactly which fields appear (IP, headers, cookies, URL). Feed this into the threat model (Q8) and §9 log tests.
4. Load-test a 1,000-client polling burst against the chosen stack's free tier.

## 8. Dependencies and proposed new open questions

**Dependencies on other branches / questions**
- **Q9 privacy design (A/B/C)** — decides whether D1 (H3a) is even eligible. If A is chosen, H3a is out.
- **Framework (S0 branch)** — Next.js is first-class on Cloud Run (Node) but beta/community on Workers; React Router
  is first-class on both (Workers guide verified here; Node server **Unverified** here).
- **Q4 auth (A1/A2 branches)** — whether the chosen auth library runs in the Workers runtime vs Node; magic-link email
  volume affects the email line.
- **Q6 email (O1 branch)** — Cloudflare Email Sending (beta, Paid-only, 3,000/month included) vs an external provider.
- **Q2 milestone scope** — whether live presentation/voting updates are in milestone 1 changes the burst design.
- **Q14/Q17 retention** — platform log retention (Cloudflare 3/7 days; GCP 30 days default, 1–3650 configurable) and
  backup windows (D1 7/30 days; Neon Free 6 hours) must fit whatever retention policy is decided.

**PROPOSED new open questions (not in §13; for the owner to add or reject)**

| # | Proposed question | Why it matters | Blocks |
|---|---|---|---|
| PQ-H1 | Must production processing and data stay in **Canada**, or on **institution-hosted** infrastructure? Does UW require a privacy/security review before a pilot with real students? (Nothing in CONTRIBUTING says so; UW policy not checked.) | H3 cannot offer Canadian residency on self-serve plans; Neon has no Canadian region; H4-CR + a Canadian Postgres can | Q3, production path |
| PQ-H2 | Is the **hosting-account operator** (the owner, or later UW IT) a trusted party in the threat model, or must the identity↔content mapping be unrecoverable even with full database and log access? | §6.4 "nobody can deanonymize" vs. the operator's inherent access on every platform | Q8, Q9 |
| PQ-H3 | Are **IP addresses and request metadata** treated as identity-bearing for §6.2 (e.g. an IP next to a "post question" request)? How long may platform logs keep them? | Both platforms log request metadata by default; determines log exclusion and retention settings | §6.2, §9, Q14, Q17 |
| PQ-H4 | At a free-tier limit, does the owner prefer a **hard stop** (outage, no bill: Cloudflare) or **automatic billing** (no outage: GCP)? What monthly ceiling is acceptable? | Determines plan choice and budget alerts | Q3 |
| PQ-H5 | Must presentation mode / voting update **live** (push), or is periodic refresh acceptable? CONTRIBUTING §7.8 lists what to display but not update latency. | Drives WebSockets/Durable Objects vs polling, and burst cost | §7.8 |
| PQ-H6 | What **availability / latency** is "credible" for the prototype (e.g. acceptable cold-start delay on first load)? No target exists in CONTRIBUTING. | Decides min-instances (cost) vs scale-to-zero | §8, Q3 |

## 9. Verification log

Status key: **Verified** = read on the official page by this branch; **Verified (sibling)** = read on the official
page on 2026-10-11 by the H1H2 branch (stack-H1H2-vercel.md), not re-fetched here; **Conflicting**; **Unverified**.

| Claim | URL | Checked | Status |
|---|---|---|---|
| Workers Paid "minimum charge of $5 USD per month"; 10M requests/month incl., +$0.30/M | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-10-11 | Verified |
| Workers Paid 30M CPU-ms/month incl., +$0.02/M CPU-ms | same | 2026-10-11 | Verified |
| D1 on both Free and Paid (chat's "need Paid for D1" is wrong) | same | 2026-10-11 | Verified |
| D1 Paid 25B rows read, 50M rows written, 5 GB included; overage $0.001/M read, $1.00/M written, $0.75/GB-mo | same | 2026-10-11 | Verified |
| D1 Free 5M rows read/day, 100k written/day, 5 GB total; reset 00:00 UTC | same | 2026-10-11 | Verified |
| Workers Logs Free 200k/day, 3 days; Paid 20M/month, 7 days, +$0.60/M; Observability pricing from 2026-12-01 | same | 2026-10-11 | Verified |
| Workers Free 100,000 requests/day; Error 1027; fail open/closed per route | https://developers.cloudflare.com/workers/platform/limits/ | 2026-10-11 | Verified |
| Workers Free CPU 10 ms; Paid 5 min (default 30 s); memory 128 MB | same | 2026-10-11 | Verified |
| Worker size 64 MiB uncompressed, "no compressed size limit" | same | 2026-10-11 | Conflicting (OpenNext page says 3 MiB Free / 10 MiB Paid compressed) |
| Workers per account 100 Free / 500 Paid; vars 64/128, 5 KB; subrequests 50 / 10,000 | same | 2026-10-11 | Verified |
| D1: 10 DBs Free / 50,000 Paid; 500 MB / 10 GB per DB; Time Travel 7 / 30 days; 50 / 1000 queries per invocation | https://developers.cloudflare.com/d1/platform/limits/ | 2026-10-11 | Verified |
| D1 is single-threaded per DB; ~1,000 qps at 1 ms queries; "overloaded" error | same | 2026-10-11 | Verified |
| Hyperdrive on Free; 100,000 queries/day; over limit "fail with an error"; Paid unlimited; no egress charge | https://developers.cloudflare.com/hyperdrive/platform/pricing/ | 2026-10-11 | Verified |
| Hyperdrive 10 configs Free / 25 Paid; ~20 / ~100 origin connections; idle timeout 10 min | https://developers.cloudflare.com/hyperdrive/platform/limits/ | 2026-10-11 | Verified |
| Hyperdrive + Neon: use direct (non-pooled) string; pg ≥ 8.16.3 or Postgres.js; nodejs_compat | https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/ | 2026-10-11 | Verified |
| Multiple Hyperdrive bindings per Worker with different DB users | same | 2026-10-11 | Unverified |
| Workers Logs captures invocation logs, console.log, errors; on by default; `invocation_logs = false`; `head_sampling_rate` | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ | 2026-10-11 | Verified |
| Exact Workers Logs fields (IP, headers, cookies), redaction, viewer roles | same; https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/account/workers_trace_events/ | 2026-10-11 | Unverified (not documented on pages read) |
| Worker secrets per-Worker, hidden after set; `.dev.vars`/`.env` locally; Secrets Store beta | https://developers.cloudflare.com/workers/configuration/secrets/ | 2026-10-11 | Verified |
| Service bindings: binding-only Workers, RPC recommended, "don't increase costs", max 32 invocations/request | https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/ | 2026-10-11 | Verified |
| D1 location hints wnam/enam/weur/eeur/apac/oc; jurisdictions eu/fedramp/us; no Canada | https://developers.cloudflare.com/d1/configuration/data-location/ | 2026-10-11 | Verified |
| Data Localization Suite is an "Enterprise-only paid add-on"; Canada region not stated | https://developers.cloudflare.com/data-localization/ | 2026-10-11 | Verified / Canada Unverified |
| Cloudflare Registrar supports .com and .ca (CIRA) | https://www.cloudflare.com/tld-policies/ | 2026-10-11 | Verified |
| Cloudflare Registrar at-cost, no markup; free WHOIS redaction, DNSSEC | https://www.cloudflare.com/products/registrar/ | 2026-10-11 | Verified |
| Cloudflare Registrar .com / .ca dollar price | https://www.cloudflare.com/application-services/products/registrar/buy-com-domains/ | 2026-10-11 | Unverified (no price on page) |
| Porkbun .com $11.08/yr; .ca $11.12 reg / $11.60 renewal | https://porkbun.com/tld/com ; https://porkbun.com/tld/ca | 2026-10-11 | Verified (sibling) |
| OpenNext: community-maintained; Next.js 16 + latest 14/15; Node Middleware unsupported; Windows not guaranteed | https://opennext.js.org/cloudflare | 2026-10-11 | Verified |
| Cloudflare recommends vinext (beta) as default for Next.js on Workers; OpenNext as fallback | https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ | 2026-10-11 | Verified |
| React Router guide is first-class, refers to "React Router v8", Vite plugin runs in Workers runtime with local bindings | https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/ | 2026-10-11 | Verified |
| Developer Platform terms (updated 2026-09-28): no non-commercial clause found; may limit "undue burden"; may change workers.dev subdomains | https://www.cloudflare.com/service-specific-terms-developer-platform/ | 2026-10-11 | Verified (master agreement Unverified) |
| Email Sending beta, Paid-only; 3,000/month incl., then $0.35/1,000 | https://developers.cloudflare.com/email-service/ ; https://developers.cloudflare.com/email-service/platform/pricing/ | 2026-10-11 | Verified |
| Workers Builds 3,000 / 6,000 build-min, 1 / 6 concurrent, 20-min timeout | https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ | 2026-10-11 | Verified (private repo support Unverified) |
| Version URLs public when enabled; protect with Access; share production resources | https://developers.cloudflare.com/workers/configuration/previews/ | 2026-10-11 | Verified |
| DO Free 100k req/day, 13,000 GB-s/day, SQLite only; WebSocket 20:1 incoming, outgoing free | https://developers.cloudflare.com/durable-objects/platform/pricing/ | 2026-10-11 | Verified |
| Queues Free 10,000 ops/day, 24 h retention; Paid 1M/month + $0.40/M | https://developers.cloudflare.com/queues/platform/pricing/ | 2026-10-11 | Verified |
| Static asset requests "free and unlimited"; 429 over limit with run_worker_first | https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ | 2026-10-11 | Verified |
| D1 Time Travel always on, free, minute granularity, destructive restore | https://developers.cloudflare.com/d1/reference/time-travel/ | 2026-10-11 | Verified |
| D1 local dev via Miniflare/workerd; `--local` migrations; `remote: true` | https://developers.cloudflare.com/d1/best-practices/local-development/ | 2026-10-11 | Verified |
| React SSR fits within 10 ms Free CPU | — | — | Unverified (needs measurement) |
| Cloud Run free: 2M requests, 360k GB-s, 180k vCPU-s, 1 GB NA egress; billing account required; overage billed | https://docs.cloud.google.com/free/docs/free-cloud-features | 2026-10-11 | Verified |
| Logging 50 GiB/project/month free; Secret Manager 6 versions + 10k ops; Artifact Registry 0.5 GB; Cloud Build 2,500 min; Cloud SQL only a 30-day trial | same | 2026-10-11 | Verified |
| $300 / 90-day trial; no billing during trial | same | 2026-10-11 | Verified |
| Cloud Run Montreal + Toronto exist, both Tier 2 | https://docs.cloud.google.com/run/docs/locations | 2026-10-11 | Verified |
| Cloud Run idle min-instance rate, Tier 2 rates, request overage price | https://cloud.google.com/run/pricing | 2026-10-11 | Unverified (page truncated by fetch tool) |
| Domain mapping Preview, not for production, not in Canadian regions; LB recommended; Firebase option | https://docs.cloud.google.com/run/docs/mapping-custom-domains | 2026-10-11 | Verified |
| Firebase Hosting rewrites support northamerica-northeast1/2; need billing (Blaze) | https://firebase.google.com/docs/hosting/cloud-run | 2026-10-11 | Verified (quota, timeout, WebSockets Unverified) |
| Cloud Run request logs automatic; can't be disabled in Cloud Run; exclusion filters work | https://docs.cloud.google.com/run/docs/logging | 2026-10-11 | Verified |
| `_Default` sink can be modified/disabled; `_Required` cannot | https://docs.cloud.google.com/logging/docs/routing/overview | 2026-10-11 | Verified |
| `_Default` 30 days (1–3650 configurable); `_Required` 400 days | https://docs.cloud.google.com/logging/quotas | 2026-10-11 | Verified |
| Cloud Run request log `httpRequest` includes remote IP / user agent | (reference page 404) | 2026-10-11 | Unverified |
| Min instances default 0; idle min instances billed at lower rate (request-based) | https://docs.cloud.google.com/run/docs/configuring/min-instances | 2026-10-11 | Verified |
| Render Free: 15-min spin-down, ~1-min spin-up, 750 h/month, DB expires 30 days + 14-day grace then deleted, 1 GB, no backups, "Do not use … for production" | https://render.com/docs/free | 2026-10-11 | Verified |
| Render paid "$7 web service and $6 database" | https://render.com/pricing | 2026-10-11 | Unverified (dynamic page) |
| Render regions: Oregon, Ohio, Virginia, Frankfurt, Singapore (no Canada) | https://render.com/docs/regions | 2026-10-11 | Verified |
| Railway Hobby $5 incl. $5 usage; Pro $20 incl. $20; Free $0 with $1 credit; unit prices RAM $10/GB-mo, CPU $20/vCPU-mo | https://docs.railway.com/reference/pricing/plans ; https://railway.com/pricing | 2026-10-11 | Verified |
| Railway Free: 0 custom domains, 0.5 GB RAM, 1 replica | https://railway.com/pricing | 2026-10-11 | Verified |
| Railway regions: California, Virginia, Amsterdam, Singapore (no Canada) | https://docs.railway.com/reference/deployment-regions | 2026-10-11 | Verified |
| Railway Serverless sleeps 5–10 min after last outbound packet; first request may 502 | https://docs.railway.com/reference/app-sleeping | 2026-10-11 | Verified |
| Railway volume backups daily/weekly/monthly; plan availability | https://docs.railway.com/reference/backups | 2026-10-11 | Verified / plans Unverified |
| Fly.io: no free tier for new orgs; trial 2 h or 7 days; shared-cpu-1x 256 MB $2.19/month; MPG from $38; IPv4 $2 | https://docs.fly.io/about/pricing | 2026-10-11 | Verified |
| Fly.io has yyz (Toronto) with Managed Postgres | https://docs.fly.io/reference/regions | 2026-10-11 | Verified |
| Neon Free 100 CU-h/project, 1 GB/project, 100 projects; suspend at limit, no data deletion | https://neon.com/docs/introduction/plans ; https://neon.com/pricing | 2026-10-11 | Verified (sibling) |
| Neon has no Canadian region | https://neon.com/docs/introduction/regions | 2026-10-11 | Verified (sibling) |
| Neon Console/API roles get neon_superuser with BYPASSRLS | https://neon.com/docs/manage/roles | 2026-10-11 | Verified (sibling) |
| Neon Free history 6 hours | https://neon.com/docs/introduction/point-in-time-restore | 2026-10-11 | Verified (sibling) |
| Supabase offers ca-central-1 on Free | https://supabase.com/docs/guides/platform/regions | 2026-10-11 | Verified (sibling) |
| Hyperdrive idle pool keeps Neon awake (CU-h burn) | — | — | Unverified (needs measurement) |
| Google Cloud ToS has no non-commercial clause | — | — | Unverified (not fetched) |
