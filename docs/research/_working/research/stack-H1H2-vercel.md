# Stack research: H1 (Vercel + Neon) and H2 (Vercel + Supabase)

> **Status:** Research notes, advisory only (CONTRIBUTING §1, §12). Nothing here is a decision. A stack is
> chosen only through an owner-approved ADR (§12, §14).
> **Source of truth:** `P:/code/clearcourse-ai/CONTRIBUTING.md`. Requirements are cited as §N.N.
> **Evidence rule:** every vendor fact carries an official URL and "(checked 2026-10-11)". Anything not
> verified against a current official page is marked **Unverified**. Numbers I derived myself are marked
> **[Estimate]**. My suggestions are marked **[Proposal]**. Requirements are marked **[Req §x]**.

---

## 0. Summary

- Both options use the same front half: Next.js on Vercel. Vercel Hobby is free but its pricing page says
  "Our Hobby plan is for personal, non-commercial use" (https://vercel.com/pricing, checked 2026-10-11).
  Whether a free pilot with real university courses is "personal, non-commercial" is **Unverified
  interpretation**, and it is the largest shared risk.
- **H1 (Neon)**: generous free tier (100 projects, 1 GB per project) and strong support for physically
  separate databases. However, Neon has **no Canadian region**, and the Free plan has a **compute-hours
  cliff**: at 100 CU-hours per project per month, "compute is suspended until the next billing period or
  until you upgrade". At the assumed prototype scale my estimate lands near that limit.
- **H2 (Supabase)**: offers **Canada (Central) `ca-central-1`**, co-locatable with Vercel's Montréal
  region `yul1` (also `ca-central-1`). Free compute is always on (no metered CU-hours). The trade-offs:
  only **2 active free projects**, **no backups on Free**, and projects pause after 1 week of inactivity.
  The PDF chat's three Supabase claims (500 MB, 50,000 MAU, 7-day pause) are **still accurate**, but the
  chat leaves out the limitations that matter.
- **Privacy (§6):** both support design (A), a single Postgres with roles, schemas, RLS and SECURITY
  DEFINER. H1 supports (B), physically separate databases, much more cheaply. Neither helps or hinders (C),
  browser cryptography. Using Supabase's **client-side Data API for anonymous content is a poor fit for
  §6**. The vendor's API-gateway logs record the end-user IP, detailed geolocation and request path, and
  the logs UI says you can filter by "API Gateway JWT subjects". Database access should be server-side only.
- **[Proposal]** For the prototype, use **H2a: Vercel plus Supabase Free used purely as managed Postgres**
  (Data API disabled, in-app auth library, functions in `yul1`, database in `ca-central-1`). Switch to
  **H1** if the privacy design selects (B) with three or more physically separate databases and Canadian
  residency is ruled out. Both depend on the owner confirming Vercel Hobby eligibility.

---

## 1. Question(s) and what they block

| § / Q | Question | How this research bears on it |
|---|---|---|
| **Q3** (§12) | Tech stack and hosting | Primary question. It blocks all code (§13). |
| **Q2** | Prototype vs production; first-milestone features | The owner's brief says the first milestone is a public prototype that people can sign in to and use. That statement is **not yet recorded in CONTRIBUTING §13/§16**. Under §1 it should be recorded before it is relied on. |
| **Q4** | Prototype authentication (UW SSO, generic OIDC, stand-in) | H2 can bundle Supabase Auth. H1 uses an in-app library. The choice of sign-in also decides email volume (magic links), which affects cost. |
| **Q6** | Email provider | Not bundled in either option. Supabase Auth needs custom SMTP for real use (see §5.3). |
| **Q8** | Threat-model format and location | Platform logs (Vercel, Supabase) belong in the threat model as a limitation of anonymity [Req §6.2]. |
| **Q9** | Mechanism that keeps content and identity unjoinable | The platform must support designs (A), (B) and (C). See §6. |
| **Q14** | Audited events and audit-log retention | Both options can do append-only audit tables through grants. Neither free tier offers WORM storage. |
| **Q17** | Retention and deletion | Interacts with backup retention and platform log retention. |

Requirements this research relies on:
- **[Req §6.1]** five technically separated data domains.
- **[Req §6.2]** no join from content to identity for ordinary queries; restricted service roles; narrowly
  scoped internal APIs; identity and content text never together in any log, analytics event, error report,
  DB view, export or admin dashboard.
- **[Req §3]** the same rule appears in the prohibitions table.
- **[Req §9]** negative tests through UI, API, exports, logs and predictable identifiers.
- **[Req §8]** a polished, credible design.
- **[Req §10–11]** production acceptance criteria, including secure institutional sign-in, provisioning
  through integrations, and deployment documentation.

---

## 2. Options considered

| ID | Front/compute | Database | Auth | Data access pattern | Notes |
|---|---|---|---|---|---|
| **H1** | Next.js on Vercel Hobby | Neon Free (serverless Postgres) | In-app library (e.g. Better Auth) storing identity in its own schema | Server-side only (Neon serverless driver or `pg`) | Brief's Option H1 |
| H1-NA | as H1 | Neon Free | Neon Auth (managed Better Auth in the `neon_auth` schema) | Server-side | Variant noted, not recommended (§4.6) |
| **H2a** | Next.js on Vercel | Supabase Free **as plain Postgres**, Data API disabled | In-app library | Server-side only, through the Supavisor pooler | Brief's "Supabase purely as Postgres" |
| **H2b** | as H2a | Supabase Free | **Supabase Auth**, used server-side (SSR cookies) | Server-side DB access with custom roles; Data API disabled or limited | Middle ground |
| **H2c** | as H2a | Supabase Free | Supabase Auth | **Browser calls the Data API (PostgREST) with the user's JWT, protected by RLS** | What the PDF chat (p.31) implies. Assessed and **not recommended** for anonymous content (§6). |

Out of scope here, researched by other branches: Cloudflare/D1, Railway, Render, AWS (§12).

---

## 3. Prototype-scale ASSUMPTION used for cost estimates

**This is an assumption for costing, not a requirement. The owner gave no user counts.**

- About 5 pilot courses, about 500 registered users, about 100 daily active users.
- Bursts of about 100 concurrent users during a class (presentation mode plus voting, §7.8, §7.7).
- About 30,000 page views per month and about 2,000 transactional emails per month (including sign-in
  emails if magic links are used).
- Database under 250 MB.
- Also considered: a burst from a single 1,000-student course.
- Derived assumption **[Estimate]**: 60 in-class sessions per month (5 courses × 3 sessions per week ×
  4 weeks), each about 50 minutes.

---

## 4. Option H1 — Next.js on Vercel Hobby + Neon Free + in-app auth

### 4.1 Architecture sketch

```
Browser ──HTTPS──► Vercel CDN PoP ──► Vercel Function (Next.js 16.x, Node runtime, Fluid compute)
                                        region: iad1 (us-east-1), co-located with Neon aws-us-east-1
                                        │  DB credentials exist only server-side (env vars, Secret type)
                                        ├─ conn string A: role app_identity   ─► schema identity (+ Better Auth tables)
                                        ├─ conn string B: role app_content    ─► schema content
                                        ├─ conn string C: role app_particip   ─► schema participation (EXECUTE on SECURITY DEFINER fns only)
                                        ├─ conn string D: role app_survey     ─► schema survey
                                        └─ conn string E: role app_audit_w    ─► schema audit (INSERT only)
          Design (B) variant: each domain lives in its own Neon *project* (separate endpoint, credentials and quota),
          and the identity/participation bridge runs in a separate Vercel project with its own env vars,
          reached over a signed internal HTTPS API.
Migrations: CI-only owner role (never in runtime env vars). Tables owned by a NOLOGIN owner; FORCE ROW LEVEL SECURITY.
```

Region note: Neon has no Canadian region (§4.5). For latency, functions should sit in the same region as
the database (https://vercel.com/docs/regions, checked 2026-10-11: "Functions should be executed in the
same region as your database, or as close to it as possible"). That puts **all H1 compute and data in the
US** (`iad1` / `aws-us-east-1`).

### 4.2 Monthly cost at prototype scale

| Line item | Plan | Price (source) | Prototype-scale cost |
|---|---|---|---|
| Vercel hosting | Hobby | $0 (https://vercel.com/pricing, checked 2026-10-11) | **$0**, if within caps and eligible (§4.4) |
| Neon Postgres | Free | $0. 100 CU-hours/project/month, 1 GB/project (https://neon.com/docs/introduction/plans, checked 2026-10-11) | **$0**, if under 100 CU-hours (see the estimate below) |
| Domain `.com` | Porkbun | $11.08/yr, free WHOIS privacy (https://porkbun.com/tld/com, checked 2026-10-11). Renewal is not stated separately; the page says "The price you see is the price you pay, year after year" | **≈ $0.92/mo** |
| Domain `.ca` (alternative) | Porkbun | $11.12 regular registration, $11.60 regular renewal (sale $8.66/$9.13). Currency not stated (**Unverified**: probably USD). Needs Canadian Presence Requirements (https://porkbun.com/tld/ca, checked 2026-10-11) | **≈ $0.97/mo** at renewal price |
| Email (not bundled; Q6) | e.g. Resend Free | 3,000/month **but 100/day** (https://resend.com/pricing, checked 2026-10-11) | $0 if under 100 per day |
| CI | GitHub Free, private repo | 2,000 minutes/month, 500 MB artifacts (https://docs.github.com/en/billing/concepts/product-billing/github-actions, checked 2026-10-11) | $0 |
| **Total** | | | **≈ $1/month** (domain only) |

**Neon compute estimate [Estimate, unmeasured].** Free scale-to-zero suspends after 5 minutes idle
(cannot be disabled). With 100 DAU spread across the day, assume the compute is awake about 14 h on
weekdays and 6 h on weekend days: 14 × 22 + 6 × 8 = 356 h.
- At a fixed 0.25 CU: 356 × 0.25 = **89 CU-hours**. That is just under the 100 CU-hour cap.
- If autoscaling is allowed to reach 1 CU during the 60 class sessions: +0.75 × 60 = **134 CU-hours**,
  which exceeds the cap and suspends compute for the rest of the month.
- **[Proposal]** Pin max autoscaling to 0.25 CU on Free. Keep health checks and uptime pings away from
  the database.

**What pushes H1 above $5/month**

| Trigger | Consequence | Cost (source) |
|---|---|---|
| Neon above 100 CU-hours | Must move to Launch: "$0.106/CU-hour", "$0.35/GB-month", "no minimum monthly fee" (https://neon.com/pricing, checked 2026-10-11) | 89 CU-h ≈ $9.43; 134 CU-h ≈ $14.20; always-on 0.25 CU (730 h) ≈ $19.35. Storage 0.25 GB ≈ $0.09 **[Estimate]** |
| Vercel Hobby caps exceeded, or use judged commercial | Pro "$20/mo" per developer seat with "$20 included credit" (https://vercel.com/pricing, checked 2026-10-11) | +$20 |
| Email above 100/day (magic-link sign-in at the start of a class) | Resend Pro "$20/mo" for 50,000 (https://resend.com/pricing, checked 2026-10-11) | +$20 (or another Q6 provider) |
| Longer database history than 6 h | Launch allows up to 7 days (https://neon.com/docs/introduction/point-in-time-restore, checked 2026-10-11) | Storage-based |

### 4.3 Free-tier limits and behaviour at the limit

| Resource | Free limit | At the limit | Source (checked 2026-10-11) |
|---|---|---|---|
| Vercel function invocations | 1,000,000/month | Hobby is "limited to the usage caps and cannot purchase additional usage". "In most cases ... you will have to wait until 30 days have passed before you can use the feature again." | https://vercel.com/pricing ; https://vercel.com/docs/plans/hobby |
| Vercel Active CPU | 4 CPU-hours/month | same | https://vercel.com/docs/plans/hobby |
| Vercel provisioned memory | 360 GB-hrs/month | same | same |
| Vercel Fast Data Transfer / Origin | 100 GB / 10 GB | same | same |
| Vercel CDN requests | 1,000,000/month | same | same |
| Vercel function duration, size | 300 s; 2 GB / 1 vCPU | request fails | https://vercel.com/docs/limits |
| Vercel deployments | 100/day; 1 concurrent build | queued or wait | https://vercel.com/docs/limits |
| Neon compute | 100 CU-hours/project/month, up to 2 CU | "compute is suspended until the next billing period or until you upgrade" | https://neon.com/docs/introduction/plans |
| Neon storage | 1 GB/project, 20 GB/account | inserts, updates and deletes fail. "None of these limits delete your data." | same |
| Neon egress | 5 GB/project/month | compute suspended | same |
| Neon branches | 10/project | branch creation fails | same |
| Neon projects | 100 | — | https://neon.com/pricing |

**Vercel Hobby estimate [Estimate, unmeasured; CPU cost per request unknown]**

| Traffic source | Invocations/month |
|---|---|
| 30,000 page views × about 3 invocations (SSR plus 1–2 server actions) | 90,000 |
| Presenter screen polling every 5 s for 50 min × 60 sessions | 36,000 |
| *If* student devices auto-refresh every 30 s while the tab is visible (100 students × 100 × 60) | 600,000 |
| **Total** | **≈ 726,000** (under 1M) |

Active CPU is the likely binding limit: 4 h = 14,400 CPU-seconds. At 15 ms per invocation, about 3.0 h. At
25 ms, about 5.0 h, which **exceeds** the cap and pauses the feature for up to 30 days. Student-device
polling frequency is the main lever. Alternatives:
- Server-Sent Events.
- Vercel WebSockets: "WebSocket support is in public beta on all plans and runs on Fluid Compute"
  (https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections, checked
  2026-10-11; page updated 2026-10-01). Connections end at the function max duration (300 s on Hobby), so
  clients need reconnect logic.

Whether live updating is needed at all is not stated in §7.8. See proposed question PQ-6.

**Cold starts and always-on credibility (§8)**
- Neon: "Once you query the database again, it reactivates automatically within a few hundred
  milliseconds" (https://neon.com/docs/introduction/scale-to-zero, checked 2026-10-11). This is a vendor
  claim with no figure; the real number is **Unverified** and should be measured.
- Vercel: Fluid compute claims "function pre-warming on production deployments" and bytecode caching
  (https://vercel.com/docs/fluid-compute, checked 2026-10-11). Vendor claim, unmeasured.
- Result: the first visitor after a quiet period probably waits an extra fraction of a second
  (**Unverified**). The project itself never pauses for inactivity on Neon AWS.
- The real credibility risk is the CU-hour and Vercel caps. Hitting either causes a **hard outage**
  lasting until the next billing period, unless the owner upgrades (Neon) or waits (Vercel Hobby).

### 4.4 Terms that restrict use

- **Vercel (explicit).** "Hobby teams are restricted to non-commercial personal use only." Commercial usage
  is "any Deployment that is used for the purpose of financial gain of anyone involved in any part of the
  production of the project, including a paid employee or consultant writing the code". Examples include
  payments, advertising, being paid to create or host the site, and ads. "Asking for Donations does not
  fall under commercial usage." (https://vercel.com/docs/limits/fair-use-guidelines, checked 2026-10-11)
  - **Interpretation (Unverified):** a free, ad-free prototype built unpaid by an individual matches none
    of the listed examples. It becomes commercial if the owner (or anyone involved) is paid to build or
    run it: UW employment duties, a grant, a contract, or a startup intending to sell to institutions.
  - "Personal use" is also hard to square with piloting real university courses. Vercel's page says to
    contact support if unsure. **[Proposal]** Ask Vercel support in writing, or budget Pro ($20/mo).
- **Vercel Hobby also cannot connect projects to Git repositories owned by GitHub organizations**
  (https://vercel.com/docs/limits, checked 2026-10-11). A personal private repo is fine.
- **Vercel DPA:** the Data Processing Addendum says it applies "for Customers who are on Enterprise and Pro
  plans" (https://vercel.com/legal/dpa, last updated 2026-03-17, checked 2026-10-11). Hobby is not
  mentioned. This matters if real student personal data is processed (see PQ-3).
- **Neon:** the Terms schedule (last updated 2026-08-05) has no non-commercial or fair-use clause for Free.
  It is "subject to the terms of the then-current Databricks Master Cloud Services Agreement"
  (https://neon.com/terms-of-service, checked 2026-10-11). The MCSA itself was not fetched, so
  restrictions there are **Unverified**.

### 4.5 Regions and data residency

| Component | Regions | Canadian? | Source (checked 2026-10-11) |
|---|---|---|---|
| Vercel functions | 19 regions, including `yul1` = `ca-central-1` Montréal. Default `iad1`. Hobby: **single region**. | Yes (`yul1`) | https://vercel.com/docs/regions ; https://vercel.com/docs/functions/configuring-functions/region |
| Neon Postgres | AWS: us-east-1, us-east-2, us-west-2, eu-central-1, eu-west-2, ap-southeast-1, ap-southeast-2, sa-east-1 (Azure deprecated). "You cannot change the region for an existing project." | **No** | https://neon.com/docs/introduction/regions |
| Vercel platform data (logs, metadata) | DPA: "Vercel's primary processing facilities are in the United States"; "Backups are globally replicated" | No guarantee | https://vercel.com/legal/dpa |

Canadian residency is **not a requirement** in CONTRIBUTING. See PQ-1. If it later becomes one, H1 needs a
database migration to another provider, because Neon regions cannot be changed and there is no Canadian
option.

### 4.6 Privacy-architecture support (§6)

**Roles, grants, RLS and SECURITY DEFINER on Neon**
- Supported: "To create a role with SQL, issue a CREATE ROLE statement"; NOLOGIN roles; "500 roles per
  branch" (https://neon.com/docs/manage/roles, checked 2026-10-11).
- **Important caveat:** roles created through the Console, CLI or API get `neon_superuser` membership.
  `neon_superuser` has `CREATEROLE`, `CREATEDB` and `BYPASSRLS` (projects after 2023-08-15), plus
  `pg_read_all_data` and `pg_write_all_data` (same page).
- So the Console's default role and SQL editor can read every schema and bypass RLS.
- Application roles must be **created via SQL**: "SQL roles are not granted membership in the
  neon_superuser role".
- RLS is standard Postgres (https://neon.com/docs/guides/row-level-security, checked 2026-10-11).
  Postgres 18 docs: "Superusers and roles with the BYPASSRLS attribute always bypass the row security
  system"; table owners bypass RLS unless `FORCE ROW LEVEL SECURITY`; no policies means default-deny;
  "security-definer functions can be used to access data not available to the calling user"
  (https://www.postgresql.org/docs/current/ddl-rowsecurity.html, checked 2026-10-11).
- No Neon restriction on SECURITY DEFINER is documented. It is a standard Postgres feature, but Neon does
  not mention it explicitly (**Unverified as explicitly supported**).

**Pooling and role separation**
- Neon's pooler is "PgBouncer in transaction mode", not configurable, and `SET`/`RESET` are unsupported
  (https://neon.com/docs/connect/connection-pooling, checked 2026-10-11).
- So session-level `SET ROLE` switching is out. Use **separate LOGIN roles with separate connection
  strings** per code path; the pooler keeps "separate [pools] for each combination of database user and
  database name".
- `SET LOCAL` inside a transaction is standard practice with transaction pooling but is **Unverified** for
  Neon's pooler.
- For `search_path`, Neon suggests `ALTER ROLE ... SET search_path`. Better Auth's `database.schemaName`
  avoids relying on it (https://www.better-auth.com/docs/adapters/postgresql, checked 2026-10-11).

**Separate databases (design B)**
- 100 Free projects, each with its own credentials, 1 GB and 100 CU-hours. This is the strongest
  free-tier support for (B) in this comparison.
- Cost: each project scales to zero independently, so one request touching N databases may pay up to N
  reactivations.

**Different credentials per code path**
- Vercel env vars are scoped by team or project, environment and Git branch, and the "Secret" type is
  "write-only after saving" (https://vercel.com/docs/environment-variables, checked 2026-10-11).
- **No per-function or per-route scoping is documented.** Inside one Vercel project every function can
  read every env var, so separation there is code discipline only.
- For platform-enforced separation, put the sensitive bridge (for example the participation-crediting
  service that holds the HMAC key) in a **separate Vercel project**. Hobby allows 200 projects. It would
  have its own env vars and a narrowly scoped, signed internal API [Req §6.2 "narrowly scoped internal APIs"].
- Private networking between projects on Hobby: **Unverified (not documented on pages checked)**. The
  internal API would be internet-reachable and must authenticate every call.

**Platform logs (what Vercel records)**
- Runtime log detail shows request method, request path, **search params**, host, **user agent**, region,
  firewall, cache, function metadata, outgoing requests and all `console.*` output.
- A "logs from your browser" filter "works by matching your IP address and User Agent", so IP is held
  (https://vercel.com/docs/logs/runtime, checked 2026-10-11).
- Retention: **Hobby 1 hour**, Pro 1 day, 30 days with Observability Plus. Build logs are kept
  indefinitely (https://vercel.com/docs/limits, checked 2026-10-11).
- Drains are not available on Hobby (https://vercel.com/docs/plans/hobby, checked 2026-10-11).
- Visible to team members with project access. Vercel personnel access is "based on their job function"
  with approval (DPA).
- No documented way to disable platform request logging (**Unverified**).
- **[Proposal]** Never put identity or content in URLs or query strings. Never `console.log` request
  bodies. Use a log helper that whitelists fields. Keep build logs free of data.
- Neon receives connections from Vercel's servers, not browsers, so end-user IPs never reach Neon.
  Neon-side query logging and staff access: **Unverified**.

**Error reporting**
- No bundled tool on Hobby.
- If Sentry is added later, its docs say user context is "controlled via sendDefaultPii" and recommend
  `beforeSend` scrubbing and server-side scrubbing
  (https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/sensitive-data/, checked
  2026-10-11). The default value of `sendDefaultPii` is **Unverified**.
- **[Proposal]** Report only error class plus route *template*. No bodies, no user IDs on content routes.

**Preview branches leak risk**
- "By default, branches are created with all of the data that existed in the parent branch"
  (https://neon.com/docs/introduction/branching, checked 2026-10-11).
- Both managed Vercel integrations auto-create preview branches. Vercel-managed cleanup "can delay branch
  deletion by months" (https://neon.com/docs/guides/vercel-overview, checked 2026-10-11).
- So a preview deployment of unreviewed branch code could hold a full copy of real identity and content.
- **[Proposal]** Create preview branches only from a seeded, synthetic parent, or use "schema-only
  branching" (exists per the branching page; plan availability **Unverified**).

**Neon Auth variant (H1-NA)**
- Managed Better Auth that "stores users, sessions, and auth configuration directly in your Neon database"
  in the `neon_auth` schema. Free plan "Up to 60,000 MAU". The page mentions only email/password and
  Google OAuth (https://neon.com/docs/neon-auth/overview, checked 2026-10-11).
- Not recommended: there is no stated SAML/OIDC for UW SSO, and it couples the identity code path to the
  vendor.

### 4.7 Developer experience (solo builder with Claude)

- **Mainstream.** Next.js docs at version 16.4.0 (https://nextjs.org/docs/app/guides/self-hosting, checked
  2026-10-11). Vercel and Neon both publish `llms.txt`-style agent docs.
- **Auth library.** "The Auth.js project is now part of Better Auth" (https://authjs.dev/, checked
  2026-10-11). Better Auth supports Postgres through `pg`/Kysely, a non-public schema
  (`database.schemaName`), CLI migrations, and an SSO plugin with "OpenID Connect (OIDC), OAuth2 providers,
  and SAML 2.0" (https://www.better-auth.com/docs/plugins/sso, checked 2026-10-11).
  - SAML defaults are permissive (`allowIdpInitiated` true, `requireTimestamps` false) and need hardening.
  - A magic-link plugin is **Unverified** (not fetched).
- **Local dev.** Neon offers no documented local emulator on the pages checked (**Unverified**). Use plain
  Postgres locally and in CI with the same roles and migrations; this is the best way to test RLS and
  grants for real [Req §9].
- **Driver.** The Neon serverless driver is a near drop-in for `pg` ("import @neondatabase/serverless
  instead") and has an HTTP mode for single queries and non-interactive `transaction()`
  (https://neon.com/docs/serverless/serverless-driver, checked 2026-10-11). Plain `pg` keeps local and CI
  parity.
- **Previews.** Vercel preview deployments with Vercel Authentication protection on Hobby
  (https://vercel.com/docs/plans/hobby, checked 2026-10-11). Neon preview branches (see the leak caveat).
- **CI.** GitHub Actions, 2,000 free minutes per month for a private repo.

### 4.8 Lock-in and migration path (§10–11)

- Next.js self-hosts through `next start`, Docker or static export. `after()` "is fully supported when
  self-hosting" (https://nextjs.org/docs/app/guides/self-hosting, checked 2026-10-11).
- Avoid Vercel-only APIs (`@vercel/functions`, WebSockets beta) or wrap them.
- Neon is standard Postgres. Move with `pg_dump` or logical replication (dump tooling is standard Postgres;
  Neon-specific export docs not checked).
- Paths:
  - **Paid in place:** Vercel Pro + Neon Launch, about $30–40/month **[Estimate]**.
  - **Another cloud or UW-hosted:** Node container plus any Postgres. Low lock-in if Neon Auth and
    Neon-specific HTTP features are avoided.

### 4.9 Operational burden and backup/restore on Free

- **Restore window.** History "defaults of 6 hours on Free plan" (https://neon.com/docs/introduction/
  point-in-time-restore, checked 2026-10-11). Free has "1 manual snapshot" (plans page). The pricing page
  lists "Instant restore: Not offered" on Free. **Conflicting/ambiguous** whether Free can roll back or
  only branch from the past.
- **Off-site backups.** **[Proposal]** Nightly `pg_dump` from GitHub Actions, **per schema/domain and
  encrypted with separate keys**, to an owner-controlled store. This raises PQ-4: a single full dump would
  put identity and content together in one artifact.
- **Upgrades.** Neon manages servers; minor-version handling **Unverified**.
- **Monitoring.** Vercel basic observability. Neon console metrics.
- **Usage alerts.** Needed to avoid the CU-hour cliff (Neon alerting **Unverified**).

### 4.10 Verdict H1

| | |
|---|---|
| Strengths | 100 free projects, so design (B) at $0. 1 GB per project. Instant branching. Mature Vercel integration. Plain Postgres semantics. Very low base cost (≈ $1/mo). |
| Weaknesses | No Canadian region, and the region is immutable. Scale-to-zero cold starts. Only 6 h of history. `neon_superuser` has BYPASSRLS and read-all, so the owner console sees everything. Preview branches copy production data by default. |
| Deal-breakers | (1) The **CU-hour cliff**: compute suspended until next month. My estimate puts the prototype near 89–134 CU-hours, so a free H1 must cap compute at 0.25 CU or accept about $10–15/mo on Launch. (2) The **Vercel Hobby commercial clause** (shared with H2). |
| Choose it when | The privacy design needs three or more physically separate databases (B); US hosting is acceptable for the prototype; and the owner accepts a card on file to upgrade Neon on demand. |

---

## 5. Option H2 — Next.js on Vercel + Supabase

### 5.1 Architecture sketches

```
H2a (Supabase purely as Postgres)                     H2c (PDF-chat style; NOT recommended for content)
Browser ─► Vercel yul1 (ca-central-1)                 Browser ──JWT──► Supabase API gateway (Envoy) ─► PostgREST ─► Postgres (RLS)
             │ server-only, custom LOGIN roles          (logs: path, query string, cf-connecting-ip, geo, user agent;
             │ via Supavisor pooler                      logs UI filter on "API Gateway JWT subjects")
             │ user = "<role>.<project-ref>"
             ▼
          Supabase Postgres ca-central-1  (Data API DISABLED)
             schemas: identity | content | participation | survey | audit
H2b: as H2a, but sign-in uses Supabase Auth server-side; users live in the `auth` schema of the SAME database.
```

Facts behind the sketch:
- Direct connections are IPv6 unless the IPv4 add-on is bought. "The shared pooler is IPv4-only on every
  plan." Transaction mode (port 6543) is recommended "for serverless and edge functions" and "does not
  support prepared statements". Custom roles use the pooler username `[ROLE].[PROJECT-REF]`
  (https://supabase.com/docs/guides/database/connecting-to-postgres, checked 2026-10-11).
- Whether Vercel functions can reach IPv6 endpoints: **Unverified**. Use the pooler.

### 5.2 Verification of the PDF chat's Supabase claims (src p.30–31)

| Claim (src p.31) | Current official statement | Status |
|---|---|---|
| "Supabase free tier provides a 500 MB Postgres database" | Free: "500 MB database size" (https://supabase.com/pricing, checked 2026-10-11) | **Verified** |
| "up to 50,000 monthly active users" | Free: "50,000 monthly active users" (Auth MAU), plus 50,000 third-party MAU. **SAML SSO "Not included" on Free.** (same) | **Verified**, but it is an Auth quota, not database capacity, and excludes SSO |
| "The database will pause after 7 days of inactivity" | "paused after 1 week of inactivity" (same). What counts as activity is not documented on the pages checked. | **Verified** (definition **Unverified**) |
| "Vercel is free for hobby projects" | Free, but "for personal, non-commercial use" (https://vercel.com/pricing) | **Incomplete**: omits the commercial restriction |
| "perfect for a zero cost public prototype" | Omits: no backups on Free; 2 active projects; default email 2 messages/hour and team-only; pausing; Data API default grants | **Misleading by omission** |
| Supabase "for the PostgreSQL database and authentication" | Auth "uses the auth schema in your Postgres database" (https://supabase.com/docs/guides/auth/architecture) | True, but has §6.1 implications (§5.6) |

### 5.3 Monthly cost at prototype scale

| Line item | Plan | Price (source) | Cost |
|---|---|---|---|
| Vercel | Hobby | $0 (https://vercel.com/pricing, checked 2026-10-11) | **$0** if eligible and within caps (same caps as §4.3) |
| Supabase | Free | $0. Nano compute "Shared", "Up to 0.5 GB" RAM, 60 DB connections, 200 pooler clients (https://supabase.com/docs/guides/platform/compute-and-disk, checked 2026-10-11) | **$0** |
| Domain | `.com` / `.ca` at Porkbun | as §4.2 | **≈ $0.92–0.97/mo** |
| Email | Required if Supabase Auth sends email: built-in SMTP is "2 messages per hour" and only to "addresses that are part of the project's team"; "not meant for production use". With custom SMTP the default auth rate limit is "30 messages per hour" (raisable) (https://supabase.com/docs/guides/auth/auth-smtp, checked 2026-10-11) | e.g. Resend Free, 100/day | $0 if under 100 per day |
| CI | GitHub Free | 2,000 min/month | $0 |
| **Total** | | | **≈ $1/month** |

Supabase Free quotas versus the assumption (https://supabase.com/pricing, checked 2026-10-11):

| Quota | Free | Assumption | Fits? |
|---|---|---|---|
| Database | 500 MB | < 250 MB | Yes |
| Egress | 5 GB | ≈ 0.6 GB of DB results, i.e. 30k views × 20 KB **[Estimate]** | Yes |
| Auth MAU | 50,000 | 500 | Yes |
| Realtime peak connections | 200 | ~100 concurrent | Yes (1,000 does not) |
| Realtime messages | 2 million | — | Yes |

**What pushes H2 above $5/month**

| Trigger | Cost (source, checked 2026-10-11) |
|---|---|
| Need backups, no pausing, 7-day logs, SAML SSO, or more than 2 projects | Supabase Pro "from $25/month", including "$10/month in compute credits, which covers one Micro instance" (https://supabase.com/pricing) |
| Each extra project on Pro (design B) | Micro "~$10"/month each (https://supabase.com/docs/guides/platform/compute-and-disk) |
| PITR | "$100 per month per 7 days retention", needs at least Small compute (https://supabase.com/docs/guides/platform/backups) |
| Vercel caps or commercial use | Pro $20/mo |
| Email above 100/day | e.g. Resend Pro $20/mo |

### 5.4 Free-tier limits, pausing and behaviour at the limit

- **Projects.** "Limit of 2 active projects." "Paused projects do not count towards your free project
  limit." The cap applies "across all organizations where you are an Owner or Administrator"
  (https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/billing-on-supabase, checked
  2026-10-11).
- **Over quota.** You are notified and get a grace period. Then Fair Use Policy restrictions may include
  "Pausing projects", "Switching databases to read-only mode", or "Responding with a 402 status code for all
  API requests". These are lifted when the quota refills or immediately on upgrade. "In some cases, like
  suspected abuse ... restrictions may be applied without prior notice"
  (https://supabase.com/docs/guides/platform/billing-faq, checked 2026-10-11). This is softer than Neon's
  immediate compute suspension, but still an outage risk.
- **Pausing.**
  - After 1 week of inactivity. "Paid projects can't be paused."
  - Restore: "a paused project can be restored to the platform with a single button click".
  - Restore window: the text says "a 1-year window", but a screenshot caption reads "90 Days Remaining"
    (**Conflicting**). After the window you can download the backup and Storage objects.
  - "Free projects will move to the latest minor version when their paused project is restored"
    (https://supabase.com/docs/guides/platform/upgrading, checked 2026-10-11).
  - Effect on credibility: an active pilot will not pause. Between terms the site goes down until the
    owner clicks restore.
  - A scheduled keep-alive ping might be treated as circumvention; Supabase's position is **Unverified**.
- **Cold starts.** No scale-to-zero is documented for Nano; compute stays up until paused (inferred, not
  explicitly stated: **Unverified**).
- **Compute headroom.** Nano is shared CPU with up to 0.5 GB RAM. Probably fine for 100 concurrent simple
  requests (**Unverified**, measure it).

### 5.5 Terms that restrict use

- **Supabase Terms.** No Free-plan-specific non-commercial clause. Use is "limited to Customer's internal
  business purposes" (typical SaaS wording; reading it as permitting a public app built on Supabase is an
  **Unverified interpretation**). Supabase may suspend access for security threats or illegal activity.
  The DPA "is incorporated into this Agreement". Governed by California law
  (https://supabase.com/terms, checked 2026-10-11; page date not captured).
- The Acceptable Use Policy was not fetched (**Unverified**).
- The Vercel Hobby restriction (§4.4) applies equally to H2.

### 5.6 Regions and data residency

- Supabase specific regions include **"Canada (Central) `ca-central-1`"**. No plan restrictions are
  mentioned. The page cautions that region choice "is a data-location control, not proof of regulatory
  compliance" (https://supabase.com/docs/guides/platform/regions, checked 2026-10-11).
- Changing region after creation: **Unverified**.
- Pair with Vercel `yul1` (`ca-central-1`), so **function compute and DB are both in Montréal**.
- Vercel's platform data is still US-primary (DPA). See PQ-1.

### 5.7 Privacy-architecture support (§6)

**Roles**
- Custom login roles: `create role "role_name" with login password ...`.
- `postgres` "has admin privileges", and dashboard queries "run as postgres".
- `service_role` "is used by the API (PostgREST) to bypass Row Level Security".
- `supabase_etl_admin` "bypasses Row Level Security".
- `supabase_auth_admin` access is "scoped to the auth schema"
  (https://supabase.com/docs/guides/database/postgres/roles, checked 2026-10-11).
- Whether `postgres` is a true superuser or has BYPASSRLS is not stated (**Unverified**). Treat the
  dashboard as all-seeing.

**Data API exposure**
- On existing projects, tables created in `public` receive SELECT/INSERT/UPDATE/DELETE grants for `anon`,
  `authenticated` and `service_role`. Supabase "is changing the platform default to revoke these automatic
  grants".
- You can turn "Enable Data API" off, after which "none of the auto-generated REST endpoints respond,
  regardless of grants or RLS".
- "Internal tables and helper functions remain in schemas that aren't exposed"
  (https://supabase.com/docs/guides/database/hardening-data-api, checked 2026-10-11).
- **[Proposal]** For H2a/H2b: disable the Data API, revoke default privileges, and add a CI test that
  `/rest/v1/` returns nothing [Req §9 "API"].

**Supabase Auth and §6.1**
- Users are stored in the `auth` schema of the same database. "This schema is not exposed on the
  auto-generated API" (https://supabase.com/docs/guides/auth/architecture, checked 2026-10-11).
- Consequence: identity (domain 3) lives in the **same Postgres cluster** as content (domain 1), and the
  `postgres`/dashboard role can query both. Separation relies on design (A) controls. It also relies on
  content rows holding **no** user key, with any linking token being a keyed HMAC whose key lives
  **outside** the database [Req §6.2 "opaque identifiers"].

**SAML SSO**
- "SAML 2.0 support is offered on plans Pro and above". "$0.015 per SSO MAU" beyond the quota (pricing page:
  50 included on Pro). Supports "Microsoft Entra". No Single Logout
  (https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml, checked 2026-10-11).
- An Azure (Entra) OAuth provider with tenant restriction exists
  (https://supabase.com/docs/guides/auth/social-login/auth-azure, checked 2026-10-11). Plan availability
  not stated (**Unverified**).

**Vault and pgsodium**
- Vault encrypts with libsodium AEAD. The key is "never stored in the database alongside the encrypted
  data"; Supabase manages it per project.
- "anyone that has access to the view has access to decrypted secrets"
  (https://supabase.com/docs/guides/database/vault, checked 2026-10-11).
- "Supabase does not recommend the usage of pgsodium as it will be deprecated". "Vault doesn't depend on
  pgsodium" (https://supabase.com/docs/guides/database/extensions/pgsodium, checked 2026-10-11).
- **[Proposal]** Do **not** keep the identity-linking HMAC key in Vault. Anyone with database admin access
  could read it and compute the join. Keep it in the separate bridge service's env var (Secret type).

**What Supabase logs**

| Source | Fields | Notes |
|---|---|---|
| API Gateway `edge_logs` | `request.path`, `request.search` (query string), full URL, method; headers `cf-connecting-ip`, `x-real-ip`, `x-client-info`, `referer`; Cloudflare geo including **city, latitude, longitude, postalCode**, ASN; response status | Field reference lists no JWT-claim or body fields, but the logs page offers a filter matching "API Gateway JWT subjects" (**Conflicting**: assume the user ID can be associated). |
| `auth_logs` | actor_id, user email, user ID, phone, **IP `remote_addr`**, path | Identity data, no content |
| `postgres_logs` | Statement text and error details "can appear in `event_message`" | Use parameterized queries; never interpolate content into SQL text. |

Sources: https://supabase.com/docs/guides/observability/log-field-reference ;
https://supabase.com/docs/guides/telemetry/logs (both checked 2026-10-11).

- Retention: Free "1 day", Pro "7-day" (https://supabase.com/pricing, checked 2026-10-11).
- Viewers: anyone with project access (exact org-role rules **Unverified**).
- Disabling gateway logging: not documented (**Unverified**).
- With H2a (server-side only), the gateway and Postgres see Vercel's server IP, not students.

**H2c (client-side Data API) against §6**
- RLS-guarded inserts of anonymous content tend to need `author = auth.uid()` on the row to enforce
  ownership. That creates exactly the join §6.2 forbids for ordinary queries.
- Even without that column, every POST to `/rest/v1/questions` produces a vendor log line with end-user
  IP, precise geo and timestamp. The logs UI says the line can be matched to the JWT subject. Matching
  timestamps with `content.created_at` produces an identity-to-content mapping in a log that project
  members can see.
- **[Proposal] Do not use H2c for any anonymous-content, vote, participation or survey path** [Req §6.2,
  §3, §9 "logs"].

**Design (B) on Supabase**
- The 2 free projects allow at most a two-way split (for example identity in one project; content,
  participation and survey in the other).
- Three or more separate databases need Pro: $25 plus about $10 per extra project. Or a hybrid with Neon.

**Preview branches**
- "By default, new branches do not start with any data or storage objects from your main project"
  (https://supabase.com/docs/guides/deployment/branching, checked 2026-10-11). This default is more
  privacy-friendly than Neon's.
- Branching plan requirement and price: **Unverified**.

### 5.8 Developer experience

- Full local stack: `supabase init` then `supabase start` (needs Docker or a compatible tool). It provides
  local Postgres, Auth and Storage at `localhost:54323`, plus an experimental Docker-free `supabase stack`
  (https://supabase.com/docs/guides/local-development, checked 2026-10-11).
- Very mainstream, well documented, and pairs naturally with Vercel.
- Using Supabase Auth or `supabase-js` adds Supabase-specific concepts (`anon`/`authenticated` roles,
  `auth.uid()`). H2a avoids them.
- CI against a real Postgres, as in H1. Supabase CLI in CI is documented.

### 5.9 Lock-in and migration path

| Variant | Lock-in | Migration path |
|---|---|---|
| H2a | Lowest. Plain Postgres. | `supabase db dump` / `pg_dump` to any Postgres, including Canadian or UW-hosted. |
| H2b | Medium. | Supabase Auth (GoTrue) users and sessions in the `auth` schema, plus Supabase JWTs. Migrating means moving users to another IdP or library. Self-hosting Supabase is **Unverified** (not fetched). |
| H2c | Highest. | RLS policies written around `auth.uid()` and PostgREST client calls throughout the frontend. |

Production on platform: Vercel Pro ($20) + Supabase Pro ($25) ≈ **$45/mo**, plus PITR if needed (+$100).

### 5.10 Operational burden and backup on Free

- **Backups.** Free has none. "We automatically back up all Pro, Team, and Enterprise Plan projects". For
  Free, "regularly export their data using the Supabase CLI `db dump` command" and "maintain off-site
  backups" (https://supabase.com/docs/guides/platform/backups, checked 2026-10-11).
- **Backup contents (Pro).** Daily backups "do not store passwords for custom roles", so the role setup
  must be reproducible from migrations.
- **Major upgrades.** Take the project offline ("plan for your database and associated services to be
  unavailable") (https://supabase.com/docs/guides/platform/upgrading, checked 2026-10-11).
- **Pausing.** Watch for pausing between terms.

### 5.11 Verdict H2

| | |
|---|---|
| Strengths | Canadian region co-located with Vercel `yul1`. Always-on Free compute with no metered CU-hours. Softer over-quota handling (grace period). Excellent local dev. Previews start empty by default. A credible production SSO path (SAML on Pro, Entra). Data API can be switched off entirely. |
| Weaknesses | 500 MB DB. Only 2 free projects. No backups on Free. Pause after 1 week idle. Auth email needs custom SMTP. `auth` schema co-located with content. Dashboard runs as `postgres`. Default Data API grants are a foot-gun. Pro jump is $25. |
| Deal-breakers | H2c for anonymous content (vendor logs plus RLS design pull identity toward content). Vercel Hobby commercial clause (shared). Design (B) with three or more databases at under $5 is not possible. |
| Choose it when | Design (A), or (B) with at most two databases; Canadian hosting is wanted or likely; Supabase is used server-side only (H2a, or H2b with care). |

---

## 6. Head-to-head

| Criterion | H1 Vercel + Neon | H2a Vercel + Supabase (as Postgres) |
|---|---|---|
| Prototype cost | ≈ $1/mo if under 100 CU-h; else about $10–15 | ≈ $1/mo |
| Failure mode at limit | Neon compute **suspended until next period** (hard) | Grace period, then read-only/402/pause (soft, then hard) |
| Idle behaviour | Scale to zero after 5 min (cold start of "a few hundred ms", vendor claim) | Always on; **pause after 1 week idle**, one-click restore |
| Canadian hosting | Functions possible (`yul1`) but **DB not** (no Neon CA region) | **Both** (`yul1` + `ca-central-1`) |
| Design (A) | Full; mind `neon_superuser` BYPASSRLS; separate login roles | Full; mind `postgres`/`service_role`; disable Data API |
| Design (B) | **Strong**: 100 free projects | Weak on Free (2 projects); about $10 per extra DB on Pro |
| Design (C) | Neutral | Neutral |
| Vendor sees end-user IP? | No (server-side access) | No in H2a. **Yes, with geo, in H2c.** |
| Backups on Free | 6 h history + 1 snapshot (ambiguous restore) | None; DIY `db dump` |
| Storage | 1 GB/project | 500 MB |
| Preview data safety | Branches copy all data by default (risk) | Branches start empty by default |
| Local dev | Plain Postgres (no official emulator found) | `supabase start` full stack |
| Production SSO path | Better Auth SSO (OIDC + SAML) | Same, or Supabase Auth SAML (Pro) |
| Lock-in | Low | Low (H2a); medium (H2b); high (H2c) |
| Paid "production-ish" | Vercel Pro $20 + Neon Launch ~$10–20 **[Estimate]** | Vercel Pro $20 + Supabase Pro $25 |

**Burst from one 1,000-student course [Estimate]**
- **Vercel Hobby.** 1,000 devices refreshing every 30 s for 50 min is about 100,000 invocations per
  session. A handful of sessions would exhaust 1M invocations and 4 CPU-hours, pausing features for up to
  30 days. In practice this needs **Pro**.
- **Neon Free.** 0.25 CU gives 104 `max_connections`, behind a pooler that accepts 10,000 clients
  (https://neon.com/docs/connect/connection-pooling). Queries would queue. Autoscaling to 2 CU burns
  CU-hours 8× faster.
- **Supabase Free.** Nano gives 200 pooler clients. Realtime is capped at 200 peak connections, so 1,000
  live subscribers are impossible on Free (Pro: 500, then $10 per 1,000).
- **Email.** 1,000 magic links in a day far exceeds Resend's 100/day free cap.
- **Conclusion.** A 1,000-student course is outside both free tiers. Budget about $45+/month and prefer
  SSO or OIDC sign-in, which sends no email (Q4).

---

## 7. Privacy implications (§6), consolidated

### 7.1 Support for the candidate privacy designs

| Design | H1 (Neon) | H2a/H2b (Supabase server-side) | H2c (Supabase client Data API) |
|---|---|---|---|
| **(A)** single Postgres, multiple roles, schemas, RLS, SECURITY DEFINER | **Good.** CREATE ROLE via SQL (not Console), NOLOGIN owners, FORCE RLS, per-role connection strings (separate PgBouncer pools). Console role bypasses RLS. | **Good.** Custom roles through the pooler (`role.projectref`). Data API off. `postgres`/dashboard and `service_role` bypass. `auth` schema co-resident. | **Poor.** Pushes `auth.uid()` into content RLS. Gateway logs tie the JWT subject to writes. |
| **(B)** physically separate DBs and services, scoped internal APIs, separate secrets | **Best.** One Neon project per domain at $0. Separate Vercel projects per service with separate env vars. Internal APIs are public HTTPS and must be signed. | **Limited.** Two DBs on Free; more costs about $10 each on Pro. A hybrid (Supabase identity + Neon content) is possible but cross-vendor. | Not applicable. |
| **(C)** client-side cryptography | **Neutral.** Static hosting plus WebCrypto; CSP headers via Next.js config. The host can always serve altered JS, which belongs in the threat model. | **Neutral**, same. Vault is server-side and not a substitute. | Neutral. |

### 7.2 Cross-cutting privacy findings (input for the threat model, Q8)

1. **Platform request logs exist outside our control.**
   - Vercel keeps path, query string, user agent and IP for 1 h on Hobby, 1 day on Pro, and 30 days with
     Observability Plus.
   - With H2c, Supabase keeps IP and precise geo for 1 day on Free and 7 days on Pro.
   - IP plus timestamp of a content POST can be correlated with the sign-in request from the same IP. This
     is a **limitation of anonymity** that must be documented [Req §6.2]. Short retention (Hobby's 1 h)
     limits exposure; Observability Plus or drains would extend it.
2. **No identity or content in URLs.** Search params are logged on both platforms. Use POST bodies and
   opaque, non-sequential IDs (CLAUDE.md "Never use sequential or guessable IDs").
3. **Operator consoles see everything.** Neon `neon_superuser` (BYPASSRLS, `pg_read_all_data`) and
   Supabase `postgres`, which the dashboard uses. Design (A) alone does not stop the owner or an operator
   joining tables. The join must be cryptographically impossible without a key held outside the database,
   or the domains must be physically separate (B). This relates to Q9.
4. **Backups and dumps.** A whole-database dump co-locates identity and content. Should that count as an
   "export" under §6.2/§3? See PQ-4.
5. **Preview environments.** Neon branches copy data by default; Supabase branches do not. Preview
   deployments must never hold real student data (PQ-9).
6. **Contracts.** The Vercel DPA covers Pro/Enterprise as written; Hobby is not mentioned. The Supabase
   DPA is incorporated into its Terms. Neon's DPA sits under Databricks terms (applicability to Free
   **Unverified**). See PQ-3.
7. **AI tooling.** Vercel offers runtime-log access to agents via MCP (linked from
   https://vercel.com/docs/logs/runtime). **[Proposal]** Agents never get production database or log
   access (PQ-8).
8. **Error reporting.** Neither option bundles error reporting. Any added tool must scrub (§4.6).

---

## 8. Recommendation (PROPOSAL for the owner to approve; not a decision)

1. **[Proposal] Prototype stack: H2a.**
   - Next.js on Vercel, functions pinned to `yul1`.
   - Supabase Free in `ca-central-1`, used **only as managed Postgres**: Data API disabled, default grants
     revoked, custom login role per data domain through the Supavisor transaction pooler.
   - Identity in an in-app auth library (Better Auth, tables in an `identity` schema). Supabase Auth is
     not used.
   - Rationale: keeps Canadian co-location open, has no compute-hour cliff, has the best local-dev story,
     previews start empty by default, and lock-in is lowest.
2. **[Proposal] Switch to H1** (Vercel `iad1` + Neon `aws-us-east-1`) if the privacy-design branch selects
   **(B) with three or more physically separate databases** and the owner confirms US hosting is acceptable.
   Configure Neon at fixed 0.25 CU, keep a card ready to upgrade, and use seeded or schema-only preview
   branches.
3. **[Proposal] Avoid H2c** for any anonymous-content, upvote, participation or survey path.
4. **[Proposal] Before relying on Vercel Hobby:**
   - The owner states whether anyone is paid for, or intends to commercialise, the project (PQ-2).
   - Ask Vercel support in writing.
   - Otherwise budget Pro ($20/mo). That alone breaks the $5 target; the owner should know this up front.
5. **[Proposal] Prototype hardening regardless of option:**
   - Run a measured spike (cold-start latency, CPU per request, CU-hours per day) before committing.
   - Nightly per-domain encrypted dumps.
   - Usage alerts.
   - Field-whitelisting logger.
   - CI negative tests: no Data API exposure; no identity in logs or URLs [Req §9].
6. **Not decided here:** Q4 (sign-in method) and Q6 (email provider). Note that magic-link sign-in plus a
   free email tier with a 100/day cap is fragile at class start.

---

## 9. Dependencies and proposed new open questions

**Depends on:** Q3 (decision), Q2 (record the owner's milestone statement), Q4, Q6, Q8, Q9 (privacy
design A/B/C from the parallel branch), Q14, Q17.

**Proposed new open questions (not in §13; for the owner to add or answer):**

| # | Proposed question | Why it matters |
|---|---|---|
| PQ-1 | Is Canadian data residency required for production, and for a pilot with real UW users? | Neon has no Canadian region and regions are immutable. Supabase and Vercel compute can be in Montréal, but Vercel platform data is US-primary. |
| PQ-2 | Is anyone paid to build or run ClearCourse AI, or is commercialisation intended? | Decides Vercel Hobby eligibility under its non-commercial clause. |
| PQ-3 | Must a DPA or institutional privacy review be in place before real student personal data is used? | The Vercel DPA, as written, covers Pro/Enterprise only. |
| PQ-4 | Do database backups and dumps count as "exports" under §6.2/§3? Where may they be stored, encrypted with which keys, and kept how long? | A full dump holds identity and content together. Interacts with Q17. |
| PQ-5 | How should hosting-platform request logs (IP, user agent, path, time) be treated under §6.2, and what retention is acceptable? | Not app-controllable. Must appear in the threat model (Q8). |
| PQ-6 | Must presentation mode and voting update live, or is periodic/manual refresh acceptable? | §7.8 is silent. Live updates drive realtime technology and Hobby CPU and invocation usage. |
| PQ-7 | What availability and latency does "polished and credible" (§8) require for the prototype? | Decides whether scale-to-zero cold starts and pause-after-idle are acceptable. |
| PQ-8 | May AI coding agents access production data or logs (e.g. via MCP)? | Agents would see identity and content. |
| PQ-9 | Must preview and staging environments use only synthetic data? | Neon branches copy production data by default. |
| PQ-10 | Expected pilot scale (courses, students, largest course)? | The owner gave no counts. The cost estimates rest on assumptions, and a 1,000-student course breaks both free tiers. |

---

## 10. Verification log

| Claim | URL | Checked | Status |
|---|---|---|---|
| Vercel Hobby $0, 1 dev seat; Pro $20/mo per developer seat, $20 included credit | https://vercel.com/pricing | 2026-10-11 | Verified |
| "Our Hobby plan is for personal, non-commercial use." Hobby "limited to the usage caps and cannot purchase additional usage" | https://vercel.com/pricing | 2026-10-11 | Verified |
| Hobby includes 1M invocations, 4 CPU-h, 360 GB-hrs, 100 GB FDT, 10 GB FOT, 1M CDN requests | https://vercel.com/docs/plans/hobby | 2026-10-11 | Verified |
| Hobby over-limit: wait until 30 days have passed | https://vercel.com/docs/plans/hobby | 2026-10-11 | Verified |
| Commercial-usage definition includes "a paid employee or consultant writing the code"; donations not commercial | https://vercel.com/docs/limits/fair-use-guidelines | 2026-10-11 | Verified |
| Interpretation that an unpaid personal pilot is non-commercial | https://vercel.com/docs/limits/fair-use-guidelines | 2026-10-11 | Unverified (interpretation) |
| Hobby cannot connect projects to Git organization repos | https://vercel.com/docs/limits | 2026-10-11 | Verified |
| Hobby: 200 projects, 100 deployments/day, 300 s max duration, 2 GB/1 vCPU | https://vercel.com/docs/limits | 2026-10-11 | Verified |
| Runtime logs 1 h Hobby / 1 day Pro / 30 days Observability Plus; build logs indefinite | https://vercel.com/docs/logs/runtime ; https://vercel.com/docs/limits | 2026-10-11 | Verified |
| Runtime log detail: method, path, search params, host, user agent, region; IP+UA used for the "your browser" filter | https://vercel.com/docs/logs/runtime | 2026-10-11 | Verified |
| Drains not available on Hobby | https://vercel.com/docs/plans/hobby | 2026-10-11 | Verified |
| Vercel platform request logging cannot be disabled | — | 2026-10-11 | Unverified (not documented) |
| 19 compute regions incl. `yul1` = ca-central-1 Montréal; default `iad1` | https://vercel.com/docs/regions | 2026-10-11 | Verified |
| Hobby functions: single region; failover regions Enterprise only | https://vercel.com/docs/functions/configuring-functions/region | 2026-10-11 | Verified |
| Pro multi-region functions: "5 regions" vs "Up to 3" | https://vercel.com/docs/functions/configuring-functions/region ; https://vercel.com/docs/fluid-compute | 2026-10-11 | Conflicting |
| Fluid compute: in-function concurrency, pre-warming on production, bytecode caching | https://vercel.com/docs/fluid-compute | 2026-10-11 | Verified (vendor claim) |
| Vercel Functions serve WebSockets natively, public beta on all plans | https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections | 2026-10-11 | Verified |
| Env vars scoped by team/project/environment/branch; Secret type write-only; no per-function scoping documented | https://vercel.com/docs/environment-variables | 2026-10-11 | Verified (absence of per-function scoping = not documented) |
| Private networking between Vercel projects on Hobby | — | 2026-10-11 | Unverified |
| Vercel DPA applies "for Customers who are on Enterprise and Pro plans"; primary processing in US | https://vercel.com/legal/dpa | 2026-10-11 | Verified |
| Hobby has Vercel Authentication deployment protection for previews | https://vercel.com/docs/plans/hobby | 2026-10-11 | Verified |
| Neon Free: 100 CU-h/project/month, 1 GB/project, 20 GB account, 100 projects, 10 branches, up to 2 CU, scale-to-zero 5 min (cannot disable), 6 h history (1 GB cap), 1 manual snapshot, 5 GB egress | https://neon.com/pricing ; https://neon.com/docs/introduction/plans | 2026-10-11 | Verified |
| Neon Free over-limit: compute suspended until next period; storage over cap fails writes; no data deleted | https://neon.com/docs/introduction/plans | 2026-10-11 | Verified |
| Neon Free "Instant restore: Not offered" vs "History and restore: no charge, 6-hour limit" | https://neon.com/pricing ; https://neon.com/docs/introduction/plans | 2026-10-11 | Conflicting/ambiguous |
| Neon Launch $0.106/CU-h, $0.35/GB-month, no minimum, invoices under $0.50 not collected; Scale $0.222/CU-h | https://neon.com/pricing ; https://neon.com/docs/introduction/plans | 2026-10-11 | Verified |
| Neon regions: 8 AWS, no Canadian region; region cannot be changed | https://neon.com/docs/introduction/regions | 2026-10-11 | Verified |
| Neon reactivation "within a few hundred milliseconds" | https://neon.com/docs/introduction/scale-to-zero | 2026-10-11 | Verified as vendor claim; actual latency Unverified |
| Neon: CREATE ROLE via SQL; SQL roles not in neon_superuser; neon_superuser has CREATEROLE, CREATEDB, BYPASSRLS, pg_read_all_data/pg_write_all_data; 500 roles/branch | https://neon.com/docs/manage/roles | 2026-10-11 | Verified |
| Neon supports standard RLS; Data API uses `auth.user_id()` | https://neon.com/docs/guides/row-level-security | 2026-10-11 | Verified |
| SECURITY DEFINER explicitly documented by Neon | — | 2026-10-11 | Unverified (standard Postgres; not mentioned by Neon) |
| Neon pooler = PgBouncer transaction mode, not configurable; SET/RESET, LISTEN/NOTIFY, SQL PREPARE unsupported; separate pools per user+db; 0.25 CU = 104 max_connections | https://neon.com/docs/connect/connection-pooling | 2026-10-11 | Verified |
| `SET LOCAL ROLE` safe through Neon's pooler | — | 2026-10-11 | Unverified |
| Neon serverless driver: HTTP mode + non-interactive `transaction()`; WebSocket Pool/Client node-postgres compatible | https://neon.com/docs/serverless/serverless-driver | 2026-10-11 | Verified |
| Neon–Vercel: Vercel-managed (billed by Vercel) or Neon-managed; both auto-create preview branches; Vercel-managed cleanup can lag months | https://neon.com/docs/guides/vercel-overview | 2026-10-11 | Verified |
| Neon branches copy all parent data by default; schema-only branching exists | https://neon.com/docs/introduction/branching | 2026-10-11 | Verified (plan for schema-only Unverified) |
| Neon Auth = managed Better Auth in `neon_auth` schema; Free up to 60,000 MAU; email/password + Google mentioned | https://neon.com/docs/neon-auth/overview | 2026-10-11 | Verified |
| Neon terms are a schedule to the Databricks MCSA; no Free non-commercial clause in the schedule | https://neon.com/terms-of-service | 2026-10-11 | Verified (MCSA content Unverified) |
| Supabase Free: 500 MB DB, 50,000 MAU, 5 GB egress, 1 GB storage, 200 realtime peak, 2 active projects, paused after 1 week inactivity, no backups, 1-day logs | https://supabase.com/pricing | 2026-10-11 | Verified |
| Supabase Pro from $25/mo incl. $10 compute credits; 8 GB disk; 100k MAU; SAML 50 SSO MAU then $0.015; 7-day logs; daily backups 7 days; PITR $100/mo per 7 days; spend cap on by default | https://supabase.com/pricing | 2026-10-11 | Verified |
| What counts as "inactivity" for Supabase pausing | — | 2026-10-11 | Unverified |
| Paused project restore: one click; "1-year window" vs screenshot "90 Days Remaining" | https://supabase.com/docs/guides/platform/upgrading | 2026-10-11 | Conflicting |
| Free over-quota: grace period, then pause/read-only/402 | https://supabase.com/docs/guides/platform/billing-faq | 2026-10-11 | Verified |
| Supabase regions include Canada (Central) ca-central-1 | https://supabase.com/docs/guides/platform/regions | 2026-10-11 | Verified |
| Data API default grants to anon/authenticated/service_role on public; platform changing to opt-in; Data API can be disabled | https://supabase.com/docs/guides/database/hardening-data-api | 2026-10-11 | Verified |
| Supabase Auth stores data in `auth` schema of the project DB; not exposed on auto API | https://supabase.com/docs/guides/auth/architecture | 2026-10-11 | Verified |
| Supabase roles: postgres admin, dashboard runs as postgres, service_role bypasses RLS, supabase_etl_admin bypasses RLS | https://supabase.com/docs/guides/database/postgres/roles | 2026-10-11 | Verified |
| Supabase `postgres` role is superuser / BYPASSRLS | — | 2026-10-11 | Unverified |
| edge_logs capture path, query string, cf-connecting-ip, x-real-ip, geo city/lat/long/postal, ASN; no body fields listed | https://supabase.com/docs/guides/observability/log-field-reference | 2026-10-11 | Verified |
| Gateway logs associate JWT subject (logs UI filter) vs no JWT fields in field reference | https://supabase.com/docs/guides/telemetry/logs ; https://supabase.com/docs/guides/observability/log-field-reference | 2026-10-11 | Conflicting |
| auth_logs record user email, user ID, IP (`remote_addr`) | https://supabase.com/docs/guides/observability/log-field-reference | 2026-10-11 | Verified |
| Vault: libsodium AEAD, key outside DB, decrypted view readable by anyone granted; pgsodium to be deprecated; Vault independent | https://supabase.com/docs/guides/database/vault ; https://supabase.com/docs/guides/database/extensions/pgsodium | 2026-10-11 | Verified |
| SAML SSO on Pro and above, supports Entra, no SLO | https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml | 2026-10-11 | Verified |
| Supabase Azure/Entra OAuth provider with tenant URL | https://supabase.com/docs/guides/auth/social-login/auth-azure | 2026-10-11 | Verified (plan availability Unverified) |
| Built-in SMTP 2 messages/hour, team-only, not for production; custom SMTP default 30/hour | https://supabase.com/docs/guides/auth/auth-smtp | 2026-10-11 | Verified |
| Nano: shared CPU, up to 0.5 GB, 60 DB conns, 200 pooler clients; Micro ~$10, Small ~$15 | https://supabase.com/docs/guides/platform/compute-and-disk | 2026-10-11 | Verified |
| Direct connection IPv6 unless IPv4 add-on; shared pooler IPv4; transaction mode for serverless, no prepared statements; custom roles `role.projectref` | https://supabase.com/docs/guides/database/connecting-to-postgres | 2026-10-11 | Verified |
| IPv4 add-on price; Vercel outbound IPv6 | — | 2026-10-11 | Unverified |
| Supabase backups: Pro/Team/Enterprise daily; Free advised to use `db dump`; custom-role passwords not in backups | https://supabase.com/docs/guides/platform/backups | 2026-10-11 | Verified |
| Supabase local dev via `supabase start` (Docker) | https://supabase.com/docs/guides/local-development | 2026-10-11 | Verified |
| Supabase branches start empty by default | https://supabase.com/docs/guides/deployment/branching | 2026-10-11 | Verified (plan/price Unverified) |
| Supabase Terms: "internal business purposes"; DPA incorporated; California law; no Free non-commercial clause | https://supabase.com/terms | 2026-10-11 | Verified (AUP Unverified) |
| Postgres 18: superusers/BYPASSRLS bypass RLS; owners bypass unless FORCE; default-deny; security-definer functions | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | 2026-10-11 | Verified |
| Auth.js "is now part of Better Auth" | https://authjs.dev/ | 2026-10-11 | Verified |
| Better Auth Postgres adapter, `schemaName`, CLI migrate | https://www.better-auth.com/docs/adapters/postgresql | 2026-10-11 | Verified |
| Better Auth SSO plugin: OIDC, OAuth2, SAML 2.0; permissive SAML defaults | https://www.better-auth.com/docs/plugins/sso | 2026-10-11 | Verified |
| Better Auth magic-link plugin | — | 2026-10-11 | Unverified (not fetched) |
| Next.js 16.4.0 self-hosting via next start/Docker/static export; `after()` supported | https://nextjs.org/docs/app/guides/self-hosting | 2026-10-11 | Verified |
| Porkbun .com $11.08/yr, free WHOIS privacy | https://porkbun.com/tld/com | 2026-10-11 | Verified (renewal not separately stated) |
| Porkbun .ca $11.12 reg / $11.60 renewal (sale $8.66/$9.13); Canadian presence needed | https://porkbun.com/tld/ca | 2026-10-11 | Verified (currency Unverified) |
| Resend Free 3,000/month, 100/day, 3 domains; Pro $20/mo for 50,000 | https://resend.com/pricing | 2026-10-11 | Verified |
| GitHub Free: 2,000 Actions minutes/month private repos; public repos free | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Sentry: user context via `sendDefaultPii`; `beforeSend` scrubbing; default value | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/sensitive-data/ | 2026-10-11 | Verified (default value Unverified) |
| All CU-hour, invocation, CPU, egress and burst figures in §4.2, §4.3, §5.3, §6 | (derived) | 2026-10-11 | Estimate, unmeasured |
