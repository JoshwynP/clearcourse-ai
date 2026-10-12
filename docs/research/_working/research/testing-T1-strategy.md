# Branch T1 — Testing strategy, with mandatory negative privacy tests (§9, §10, §15)

> Research and planning note only. Nothing here is decided. CONTRIBUTING.md is the source of truth;
> every requirement below is cited by section. Every recommendation is a **PROPOSAL for the owner**.
> Checked date for all web evidence: **2026-10-11** (session clock reads 2026-10-12; the task fixes the
> checked date as 2026-10-11).

## Contents

1. Question(s) and what they block
2. Options considered
3. Evidence
4. Privacy implications (§6)
5. Recommendation (PROPOSAL)
6. Dependencies and proposed new open questions
7. Verification log

---

## 1. Question(s) and what they block

### 1.1 What the spec actually requires (requirements only)

- §9: "An automated test suite is a deliverable." Also required: "Explicit negative tests are mandatory.
  They must prove that instructors and TAs **cannot** retrieve the authors of anonymous content through
  the **UI, API, exports, logs or predictable identifiers**." Source: `[src p.18]`, which reads
  "Include explicit negative tests proving that instructors and TAs cannot retrieve the authors of
  anonymous content through the UI, API, exports, logs, or predictable identifiers."
- §9: "Every acceptance criterion in §10 should have at least one automated test that demonstrates it."
  §10 has 15 criteria `[src p.19]`.
- §15 (definition of done), items 3 and 4: every change has automated tests, "including negative/privacy
  tests where identity or anonymous content is involved", and "All tests, type checks and lint pass
  locally."
- §11: automated tests are a deliverable `[src p.1]`.
- §6.2: identity data and anonymous-content text must not appear together "in any application log,
  analytics event, error report, database view, export or administrator dashboard". §3 makes this a
  hard prohibition. That gives the tests their target list.

**Not stated in the spec (so not a requirement):** a coverage percentage, a mutation-score threshold, a
specific test framework, CI provider, test pyramid shape, performance or load testing, browser matrix,
penetration testing, or any accessibility conformance level (Q15). Admins and operators are not named in
§9's negative-test sentence. §9 names only instructors and TAs. §5 and §6.4 still constrain admins
("must not routinely connect"; "Default: nobody can deanonymize"), so this note *proposes* also running
the admin role through the same negative tests, and labels that a proposal (PNQ-T1 below).

### 1.2 Open questions (§13) that this branch depends on or blocks

| §13 | Question | How it affects testing | Blocks in this note |
|---|---|---|---|
| Q3 | Stack and hosting | Tool choice (Vitest/Playwright assume TypeScript + Node). The leading proposal is Next.js + Drizzle + Postgres (`compare/stack-hosting.md` §15.2). Nothing is decided. | Whole tool layer is conditional on Q3 |
| Q9 | Mechanism that keeps content and identity unjoinable | Schema, role, identifier and timing tests are written against the chosen mechanism. This note writes them for a **database-enforced** design (privacy family A) and notes changes for multi-database (family B). | §4 schema/role tests |
| Q8 | Threat-model document | The negative tests should be traceable to threats in it. Each test should cite a threat ID. | Test-to-threat traceability |
| Q2 | Prototype vs production; first-milestone features | Decides which §10 tests are needed in milestone 1. §10 is labelled *production* acceptance criteria. | Milestone scoping of the §10 map |
| Q4, Q5 | Prototype sign-in; provisioning integration | §10 rows 1–2 cannot be tested concretely until these are answered. | §10 rows "sign in securely", "provisioned through supported integrations" |
| Q7 | Impersonation | If impersonation exists, it needs its own negative tests (an impersonated student session must not let a staff user read that student's private counter). | Conditional test set |
| Q12 | Grade export format | Export tests check the exact columns. §7.10 says the instructor receives only name, verified level and date shared. The file format is open. | Export schema test |
| Q13 | Essential notifications | Notification tests (content-free messages) | Notification tests |
| Q14 | Audited events and retention | Audit-log tests (moderation logged "without exposing identities", §7.7) | Audit-log negative tests |
| Q15 | Accessibility target | Which axe tags to enforce (`wcag2a`… `wcag22aa`). This note does not pick a level. | A11y gate configuration |
| Q16 | Aggregation threshold N | Suppression tests are parameterised on N. No value is assumed. | §7.12/§7.16 suppression tests |
| Q17 | Retention and deletion | Deletion tests (removed account leaves no linkable residue) | Deletion tests |
| Q18 | Sharing window | Share/revoke-until-final tests (§7.10) | Sharing tests |
| Q20 | Rate-limit values, moderation workflow | Rate-limit tests are parameterised. They must also prove that limits do not reveal identity (§6.4). | Rate-limit tests |

**This note closes none of these.** Wherever a test depends on an open value (N, thresholds, formats),
the test is written to read the value from configuration and is marked *parameterised on Qn*.

---

## 2. Options considered

Status column = what the official source showed on 2026-10-11 (URLs in §3 and §7). "Fit" is judged
against §9, §10, §15 and the owner constraints (solo, mainstream, <$5/month, free tiers).

### 2.1 Test runners and layers

| Layer | Option | Status (checked 2026-10-11) | Fit | Verdict (proposal) |
|---|---|---|---|---|
| Unit / integration runner | **Vitest** | v5.0 announced 2026-09-03 (site shows v5.0.3); needs Node >= 22.12 and Vite >= 6.4 | Mainstream TS runner; Next.js has an official Vitest guide | **Use** |
| Unit / integration runner | Jest | Not researched this session (**Unverified**) | Works, but the Next.js guide and Stryker both document Vitest | Not proposed |
| Unit / integration runner | Node built-in `node:test` | Not researched (**Unverified**) | Less ecosystem support for TS/React | Not proposed |
| E2E / browser | **Playwright Test** | 1.64 is newest in the release notes (no dates shown) | Real browser, multiple roles via separate storage states, network capture for response scanning | **Use** |
| Accessibility | **@axe-core/playwright** | npm 4.13.0 (axe-core ~4.13.0) | Official Playwright a11y guide; tags include `wcag22aa` | **Use**, tag set waits for Q15 |
| Async Server Components | Vitest | Next.js 16.4 docs: "Vitest currently does not support them ... we recommend using E2E tests for `async` components" | Gap | Cover RSC pages with Playwright |

### 2.2 Postgres in tests

| Option | Status (checked 2026-10-11) | Real roles / GRANT / RLS? | CI cost | Verdict (proposal) |
|---|---|---|---|---|
| **GitHub Actions Postgres service container** | Documented; needs a Linux (Ubuntu) runner; `pg_isready` health check | Yes, it is a real server | Free within minutes; no extra package | **Use in CI**, pinned to the production major version |
| Testcontainers (`@testcontainers/postgresql`) | npm 12.2.0; `snapshot()` / `restoreSnapshot()` | Yes, real server | Needs a Docker runtime locally and in CI | **Use locally** (same tests on a dev laptop); optional in CI |
| PGlite (`@electric-sql/pglite`) | npm 0.5.8 (pre-1.0); docs: "only has a single exclusive connection" | Docs do not say whether roles, GRANT/REVOKE, `SET ROLE` or RLS behave like a server (**Unverified**) | Fast, no Docker | **Do not rely on it for privacy tests.** Allowed only for pure-SQL logic tests that do not depend on roles |
| Supabase CLI local stack (`supabase start` + `supabase test db`) | Documented with a GitHub Actions example | Yes | Heavier (whole local stack) | Optional. The proposed stack does not use Supabase Auth or JWT-claim RLS, so the Supabase test pattern (`set local role authenticated` + JWT claims) does not match. Plain Postgres is enough |

### 2.3 SQL-level permission tests

| Option | Status | Notes | Verdict (proposal) |
|---|---|---|---|
| **pgTAP** | Docs header "pgTAP 1.3.4"; has `table_privs_are`, `schema_privs_are`, `function_privs_are`, `column_privs_are`, `sequence_privs_are`, `policies_are`, `policy_roles_are`, `policy_cmd_is`, `is_definer`, `hasnt_fk`, `roles_are`; Supabase supports the extension | Exact assertions on the catalog. Extra moving part: the stock `postgres` Docker image does not ship pgTAP (**Unverified**: check the image; apt package name also **Unverified**) | **Use** for catalog/role tests if installing it in CI is simple; otherwise use the next row |
| SQL assertions inside Vitest (`has_table_privilege`, `pg_has_role`, catalog queries) | Postgres 18 docs | No extension; one runner for everything | **Use as the baseline**; pgTAP is an optional upgrade |
| Behavioural "connect as role and try" tests | n/a | Proves `permission denied` (SQLSTATE 42501) in practice, not just on paper | **Use always**, alongside catalog assertions |

### 2.4 Property, mutation and architecture-fitness tools

| Tool | Status (checked 2026-10-11) | Use in this project | Verdict (proposal) |
|---|---|---|---|
| **fast-check** | npm 4.10.2; works in any runner, including Vitest; model-based testing (`fc.commands`, `asyncModelRun`, `scheduledModelRun`), shrinking, seed/path replay | Merge invariant, counter invariant, upvote idempotence, aggregate suppression | **Use** |
| **StrykerJS** + `@stryker-mutator/vitest-runner` | runner 10.0.0; Node >= 22; peer `vitest >= 2.0.0`; dev setup pins Vitest 4.1.10; browser mode unsupported; forces `threads` pool | Mutation-test only the privacy-critical modules (via `mutate` globs), so a weak negative test shows up as a surviving mutant | **Use, scoped and scheduled** (not on every PR). Vitest 5 compatibility is **Unverified**; spike it |
| **dependency-cruiser** | npm 18.6.0; Node `^22 \|\| ^24 \|\| >=26`; `forbidden` rules with `from`/`to` paths; TS supported | Fitness function: content-domain code must not import identity-domain code, and the other way round | **Use** (CI gate) |
| **eslint-plugin-boundaries** | Docs show v7.1.0; flat config (`eslint.config.js`); rule `boundaries/dependencies` | Same boundary rule, shown in the editor as you type | **Optional**; pick one tool as the gate (dependency-cruiser) so the rules have one source |

### 2.5 CI

| Option | Free-plan facts (checked 2026-10-11) | Verdict (proposal) |
|---|---|---|
| **GitHub Actions, private repo, GitHub Free** | 2,000 minutes/month; 500 MB artifact storage (shared with Packages); 10 GB cache per repo; Linux 2-core rate $0.006/min after quota; usage is **blocked** (not billed) when the quota is used up and no payment method is on file; private `ubuntu-latest` = 2 CPU / 8 GB RAM / 14 GB SSD (Ubuntu 24.04); 20 concurrent jobs; 6 h per job | **Use.** Stay inside the quota with the budget in §5.6 |
| GitHub Actions, public repo | Free and unlimited on standard runners; 4 CPU / 16 GB | Possible only if the owner is willing to make the repo public (PNQ-T6). Not assumed |
| Self-hosted runner | Free | Not proposed: the owner would have to operate it |

---

## 3. Evidence (all checked 2026-10-11)

Primary sources fetched this session. Version numbers come from the npm registry `latest` dist-tag or the
project's own docs page on the checked date. They will drift, so re-check them at scaffold time.

| # | Topic | URL | What it showed |
|---|---|---|---|
| E1 | GitHub Actions billing | https://docs.github.com/en/billing/concepts/product-billing/github-actions | Free: 2,000 min/month, 500 MB artifacts (shared with Packages), 10 GB cache; public repos free on standard runners; blocked at quota with no payment method; Linux 2-core $0.006/min |
| E2 | GitHub Actions limits | https://docs.github.com/en/actions/reference/limits | 20 concurrent jobs (Free); 6 h per job; 35 days per workflow run; cache rate limits |
| E3 | GitHub-hosted runners | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | Private ubuntu-latest 2 CPU / 8 GB / 14 GB; public 4 / 16 / 14; ubuntu-latest = 24.04 |
| E4 | Postgres service containers | https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers | Linux runner required; `pg_isready` health check; `ports: 5432:5432` when the job runs on the runner |
| E5 | Vitest releases | https://vitest.dev/blog/ | Vitest 5.0 on 2026-09-03; 4.1 on 2026-03-12; site shows v5.0.3 |
| E6 | Vitest 5 announcement | https://vitest.dev/blog/vitest-5 | Node >= 22.12.0, Vite >= 6.4.0; `clearMocks` true by default; un-awaited async assertions now fail |
| E7 | Next.js + Vitest | https://nextjs.org/docs/app/guides/testing/vitest | Doc version 16.4.0; async Server Components not supported by Vitest, use E2E |
| E8 | Playwright release notes | https://playwright.dev/docs/release-notes | Latest 1.64 (no dates on page); 1.63 added test locks; 1.64 added `--shuffle` |
| E9 | Playwright accessibility | https://playwright.dev/docs/accessibility-testing | `AxeBuilder.withTags()`; "automated testing cannot detect all types of WCAG violations" |
| E10 | axe-core API tags | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`; level tags are not cumulative |
| E11 | @axe-core/playwright | https://registry.npmjs.org/@axe-core/playwright/latest | 4.13.0; axe-core ~4.13.0 |
| E12 | Testcontainers Postgres | https://node.testcontainers.org/modules/postgresql/ | `PostgreSqlContainer`, `snapshot()`/`restoreSnapshot()`; do not name the db `postgres` if snapshotting |
| E13 | @testcontainers/postgresql | https://registry.npmjs.org/@testcontainers/postgresql/latest | 12.2.0 |
| E14 | PGlite getting started | https://pglite.dev/docs/ | "only has a single exclusive connection to the database" |
| E15 | PGlite about | https://pglite.dev/docs/about | "a WASM Postgres build"; no statement on roles/RLS |
| E16 | @electric-sql/pglite | https://registry.npmjs.org/@electric-sql/pglite/latest | 0.5.8 |
| E17 | pgTAP home | https://pgtap.org/ | TAP unit tests in SQL; `pg_prove`; `runtests()` |
| E18 | pgTAP docs | https://pgtap.org/documentation.html | Header "pgTAP 1.3.4"; privilege and policy assertion functions listed in the table of contents |
| E19 | Supabase pgTAP | https://supabase.com/docs/guides/database/extensions/pgtap | `create extension pgtap with schema extensions`; `policies_are` example |
| E20 | Supabase testing overview | https://supabase.com/docs/guides/local-development/testing/overview | `supabase test db`; GitHub Actions example; RLS tests via `set local role authenticated` + JWT claims |
| E21 | fast-check | https://fast-check.dev/ | Property-based testing; works in Vitest without a special integration |
| E22 | fast-check model-based | https://fast-check.dev/docs/advanced/model-based-testing/ | `fc.commands`, `modelRun`, `asyncModelRun`, `scheduledModelRun`; shrinking; `replayPath` |
| E23 | fast-check npm | https://registry.npmjs.org/fast-check/latest | 4.10.2 |
| E24 | StrykerJS intro | https://stryker-mutator.io/docs/stryker-js/introduction/ | Supports TypeScript; Vitest runner and incremental pages exist |
| E25 | Stryker Vitest runner | https://stryker-mutator.io/docs/stryker-js/vitest-runner/ | `@stryker-mutator/vitest-runner`; browser mode unsupported; forces threads; `coverageAnalysis` always `perTest` |
| E26 | Stryker Vitest runner npm | https://registry.npmjs.org/@stryker-mutator/vitest-runner/latest | 10.0.0; Node >= 22; peer `vitest >= 2.0.0`; dev-tested on Vitest 4.1.10 |
| E27 | dependency-cruiser | https://github.com/sverweij/dependency-cruiser | `forbidden` rules with `from`/`to` path; TypeScript |
| E28 | dependency-cruiser npm | https://registry.npmjs.org/dependency-cruiser/latest | 18.6.0; Node `^22\|\|^24\|\|>=26` |
| E29 | eslint-plugin-boundaries | https://www.jsboundaries.dev/docs/overview/ | v7.1.0; flat config; `boundaries/dependencies` |
| E30 | Postgres UUID functions | https://www.postgresql.org/docs/current/functions-uuid.html | Current = 18 (18.6); `uuidv7` embeds a millisecond UNIX timestamp; `uuid_extract_timestamp` returns it for v1/v7 and null otherwise; `uuid_extract_version` |
| E31 | Postgres privilege functions | https://www.postgresql.org/docs/current/functions-info.html | `has_table_privilege`, `has_column_privilege`, `has_schema_privilege`, `has_function_privilege`, `has_sequence_privilege`, `pg_has_role`; `pg_xact_commit_timestamp` needs `track_commit_timestamp` |
| E32 | `view_table_usage` | https://www.postgresql.org/docs/current/infoschema-view-table-usage.html | "A table is only included if that table is owned by a currently enabled role." Use `pg_depend`/`pg_rewrite` for a complete check |
| E33 | Postgres logging config | https://www.postgresql.org/docs/current/runtime-config-logging.html | `log_statement` default `none`; `log_min_error_statement` default `ERROR` (failing statement text **is** logged); `log_parameter_max_length_on_error` default 0 (bind values not logged on error) |
| E34 | OWASP Authorization Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | "deny access by default"; "Validate the Permissions on Every Request"; "Create Unit and Integration Test Cases for Authorization Logic"; tests catch "low-hanging fruit", not a replacement for penetration testing |

Context documents read (internal, advisory): `research/privacy-A-db-enforced.md` §7 Testability (22 proposed
checks, canary pattern); `compare/stack-hosting.md` §15.2 (Stack R proposal: TypeScript, Next.js 16.x,
Drizzle, Supabase Postgres, Vitest, Playwright + axe, GitHub Actions with a Postgres service container).

---

## 4. Privacy implications (§6)

### 4.1 What the negative tests must prove, mapped to §6

| §6 rule | Test family (names in §5.3) |
|---|---|
| §6.1 five domains "technically separated" | `schema.*`, `roles.*`, `arch.*` (import boundaries), `survey.*` |
| §6.2 staff "never receive access to mappings" | `neg.api.*`, `neg.ui.*`, `neg.export.*`, `neg.log.*`, `neg.id.*` (the five channels named in §9) |
| §6.2 "ordinary application queries must not be able to join" | `roles.web-cannot-read-linkage`, `schema.no-author-column`, `schema.no-cross-domain-view` |
| §6.2 "opaque identifiers" | `neg.id.*` |
| §6.2 no co-occurrence in log, analytics event, error report, DB view, export, admin dashboard (also §3) | Canary co-occurrence scanner (§5.2) run over every captured artefact |
| §6.3 de-duplicate upvotes and credit counters without a usable mapping | `prop.merge.*`, `prop.upvote.*`, `prop.counter.*` |
| §6.4 "Default: nobody can deanonymize" | Admin role included in every `neg.*` test (proposal, PNQ-T1); `neg.deanon.absent` (no route or function offers it while the institution has not configured it) |

### 4.2 The test suite itself must not become a privacy leak

These are **proposals**. The spec does not discuss test infrastructure. They follow directly from §6.2 and
CLAUDE.md ("Never log, trace, export or display identity together with anonymous content").

1. **Synthetic data only.** No test, preview deployment or CI job uses real student data. This matches
   the stack proposal: Preview deployments use a separate synthetic-data project.
2. **The ground-truth oracle stays in memory.** To prove a negative ("the instructor cannot learn that
   canary student S wrote text T"), the test must know that S wrote T. The seed step records that mapping
   **only in the test process's memory**. It never writes it to the database, a fixture file, a log or a
   CI artifact. Otherwise the test suite would itself create the forbidden mapping. Fixtures post content
   through the same narrow API a student would use, not through direct inserts by a privileged role.
3. **Playwright traces, screenshots and videos are artefacts in the §6.2 sense.** With synthetic data
   the risk is low, but the canary scanner should also scan them (trace `.zip` network bodies and DOM
   snapshots) and CI should upload them **only on failure**, with short retention. Retention value is the
   owner's choice (relates to Q14/Q17); GitHub's artifact quota is 500 MB on Free (E1).
4. **No privileged test role in production.** Tests may use a superuser to run migrations and build
   fixtures. A test (`roles.prod-role-inventory`) asserts that the deployed role set, attributes
   (`rolsuper`, `rolbypassrls`) and memberships equal a reviewed list, so a test-only role cannot leak into
   production unnoticed.
5. **Error output from failing tests.** Assertion messages must not print whole response bodies that
   pair identity and content. The scanner reports *which artefact and which canary pair*, not the text.

### 4.3 A database-enforced design (privacy family A) vs a multi-database design (family B)

All tests in §5.3 are written against **observable behaviour and catalog facts**, so most of them carry
over. What changes:

| Test family | Family A (one Postgres, roles + RLS + SECURITY DEFINER functions) | Family B (separate databases/services per domain) |
|---|---|---|
| `roles.*` | Connect as `cc_web` (the ordinary app role) and attempt `SELECT` on each locked table, expecting SQLSTATE 42501; catalog checks with `has_table_privilege` / pgTAP `table_privs_are` | Replace with **credential-scope tests**: the content service's credentials cannot connect to the identity database at all (connection refused or auth failure); each service's secret set is checked against an inventory |
| `schema.no-cross-domain-view` | `pg_depend` + `pg_rewrite` query over all views. Do **not** rely on `information_schema.view_table_usage`, which lists only tables owned by the current role (E32) | Trivially true across databases. Test instead that no ETL job, replica or analytics sink combines them |
| `schema.no-author-column` | Catalog scan of content schemas | Same scan per database |
| `arch.*` import boundaries | Important: one codebase, several Drizzle instances | Even more important if the services share a monorepo; also check deploy manifests so each service gets only its own secrets |
| `neg.api.*`, `neg.ui.*`, `neg.export.*`, `neg.log.*` | Unchanged | Unchanged, plus the internal service-to-service APIs join the endpoint matrix |
| `neg.timing.*` (`xmin`, commit timestamps) | Needed: content and counter rows written in one transaction share `xmin` (privacy-A §4.1) | Different: cross-database correlation runs through request timing and the event pipeline. Test that the counter event carries no content id and no timestamp finer than agreed (value open) |
| `prop.merge.*` | Run against the definer functions | Run against the service API; the invariant is the same |

Family C (cryptographic) is not covered in depth here. It would add key-handling tests (no key material
in logs or dumps; wrong key yields nothing). That is listed as a dependency in §6.

---

## 5. Recommendation (PROPOSAL for the owner; nothing here is decided)

Conditional on Q3 landing on a TypeScript + Postgres stack, as `compare/stack-hosting.md` §15.2 proposes. If
Q3 lands elsewhere, the *test families* in §5.3 and the §10 map in §5.5 still apply; only the tool names
change.

### 5.1 Layers

| Layer | Tool (proposal) | Runs against | What it proves | When |
|---|---|---|---|---|
| L0 Static fitness | `tsc --noEmit`, ESLint, **dependency-cruiser** forbidden rules | Source tree | Content code cannot import identity code (and the reverse); only the definer-function client may import the participation module; no logger import inside domain modules that handle content text (rule shape is a proposal) | Every push |
| L1 Unit | **Vitest** | Pure functions (level calculation §7.9, threshold-change guard §7.9, card override diff §7.4, DTO mappers) | Logic in isolation | Every push |
| L2 Property | **fast-check** inside Vitest | L1 functions and L3 DB functions | Merge, counter, upvote and suppression invariants hold for random inputs (§5.3 `prop.*`) | Every push, fixed run count; a long run nightly |
| L3 DB integration | Vitest + real **Postgres** (CI service container; Testcontainers locally); SQL assertions, optionally **pgTAP** | Migrated schema, real roles | Roles, grants, RLS, definer functions, catalog invariants, identifier formats, timing hygiene | Every push |
| L4 API integration | Vitest calling Route Handlers / server actions over HTTP against a running app (`next start`) with L3's database | Every route x every role | The role x endpoint matrix (§5.4); response canary scan | Every push |
| L5 E2E | **Playwright** + **@axe-core/playwright** | Built app in a browser, one storage state per role | UI negative tests, presentation mode, search, sharing flow, exports downloaded through the UI; axe scan per page (tags wait for Q15) | Every PR; full matrix nightly |
| L6 Log and artefact audit | Custom scanner (§5.2), run as the last CI step | App stdout/stderr, Postgres server log, Playwright traces, downloaded exports, any error-reporter sink | No artefact contains an identity canary together with a content canary | After L3–L5, same job |
| L7 Mutation | **StrykerJS** + vitest-runner, `mutate` limited to privacy-critical modules | L1–L4 tests | The negative tests actually fail when the privacy code is broken | Weekly or manual, not per PR (minutes budget, §5.6) |

Manual checks stay in scope because automation cannot cover everything: Playwright's own guide says
"automated testing cannot detect all types of WCAG violations" (E9), and OWASP says authorization unit and
integration tests catch "low-hanging fruit", not every attack (E34). Whether an external review or
penetration test is wanted before production is PNQ-T7.

### 5.2 Canary design (the core of the §9 negative tests)

A **canary** is a unique, high-entropy marker that can only appear in an artefact if specific data leaked.

- **Identity canaries** (domain 3): for each synthetic student, a display name such as
  `Cnry-Name-<16 random hex>`, an email local part `cnry-<hex>@<test domain>`, the internal user id, the
  SSO subject, and any derived pseudonym or tag the design has (values read back by the test harness
  through the identity domain's own test hook, never logged).
- **Content canaries** (domain 1, plus survey text in domain 5): each question, comment and survey answer
  embeds `Cnry-Text-<16 random hex>`; each content id and upvote id the API returns is also a canary.
- **Oracle**: an in-memory map `{studentCanary -> [contentCanary...]}` built during seeding (§4.2 item 2).
- **Fresh per run**: canaries are generated per CI run, so a stale snapshot cannot make a test pass.

**Scanner rule (proposal).** For every captured artefact unit (one HTTP response body plus headers, one
rendered page's DOM text plus attributes, one log line or structured log record, one export file, one
trace file), fail if the unit contains *any* identity canary of student S together with *any* content
canary authored by S. A stricter variant fails on any identity canary plus any content canary at all.
Which variant to enforce is PNQ-T2, because some legitimate pages may show a student their own name in a
header next to course content. The spec does not say whether a student's own view may show "you wrote
this".

Encodings: also search base64, URL-encoded, JSON-escaped and lowercase forms of each canary, and the
UUID without hyphens. A leak through encoding is still a leak.

Where the scanner runs:

| Channel named in §9 | Capture method (proposal) |
|---|---|
| UI | Playwright: after each navigation and each moderation action, collect `document.documentElement.outerHTML` (includes `data-*` attributes, hidden inputs, inline RSC payload script tags) |
| API | Playwright `page.on('response')` plus the L4 HTTP client; bodies **and** headers (ETags, `Location`, cookies) |
| Exports | Every export endpoint called by every role that may call it; file saved to a temp dir and scanned, including CSV headers |
| Logs | App stdout/stderr captured by the CI step; the Postgres container's log (`docker logs` of the service container); any mock error-reporter or analytics sink, wired to a local in-memory collector in tests |
| Predictable identifiers | Not a text scan; see `neg.id.*` in §5.3 |

Logs need forced failure paths too: privacy-A §7 item 17 proposes repeating the run with errors forced
inside each definer function. Postgres logs the **failing statement text** by default
(`log_min_error_statement = ERROR`) but not bind values (`log_parameter_max_length_on_error = 0`) (E33).
So a test must assert that every query touching content or identity is parameterised: content text must
never be interpolated into SQL, or it lands in the server log on any error. Test:
`neg.log.pg-error-no-literal-content`.

### 5.3 Named test catalogue (proposal)

Naming: `<family>.<subject>`. Each test should cite the CONTRIBUTING section and, once Q8 is resolved, a
threat-model ID. "Param Qn" means the test reads an owner-set value and assumes none.

#### 5.3.1 Schema-level tests (L3, family A wording)

| Test | Assertion | Source |
|---|---|---|
| `schema.no-author-column` | No column in any anonymous-content schema (content, survey, content tags) is a foreign key to an identity table (pgTAP `hasnt_fk` / catalog query on `pg_constraint`), and no column name matches a reviewed deny-list (e.g. `user`, `author`, `owner`, `email`, `ip`, `session`, `agent`; list is a proposal) | §6.1, §6.2 |
| `schema.no-cross-domain-view` | No view or materialized view depends, directly or transitively, on tables from both an identity-bearing schema and an anonymous-content schema. Use `pg_depend` joined to `pg_rewrite`, because `information_schema.view_table_usage` hides tables the current role does not own (E32) | §3, §6.2 "database view" |
| `schema.no-cross-domain-function` | No function readable by `cc_web` returns columns from both domains (checked by calling each whitelisted function, and by a reviewed list of definer functions; fully static proof is not attempted) | §6.2 |
| `schema.no-sequences-in-anon` | No sequence, `serial` or identity column in anonymous schemas; id defaults are `gen_random_uuid()` / `uuidv4()` | §6.2 opaque ids; CLAUDE.md |
| `schema.counter-no-timestamps` | Participation counter tables have no `timestamp`/`timestamptz`/`date` columns, and no `created_at`/`updated_at` columns | §7.10 "will not receive ... dates" (for shared output); timing hygiene is a privacy-A proposal |
| `schema.survey-separate` | Survey response tables have no column referencing identity, participation, enrollment or a session, and no timestamp finer than the owner sets (value open, PNQ-T4) | §7.12 "technically separated", "No unnecessary metadata" |
| `schema.migration-drift` | The applied catalog equals what the migrations produce (guards against dashboard edits on the hosted DB) | §15 item 4 |

#### 5.3.2 Role and permission tests (L3)

| Test | Assertion | Source |
|---|---|---|
| `roles.web-cannot-read-linkage` | Connected as the ordinary app role, `SELECT`/`INSERT`/`UPDATE`/`DELETE` on every linkage, counter, key, rate-limit and survey-private table fails with SQLSTATE 42501 (behavioural) **and** `has_table_privilege(...)` is false for each privilege (catalog) | §6.2 "ordinary application queries must not be able to join" |
| `roles.rls-forced` | Locked tables have row security enabled **and forced**; a temporary GRANT to the app role (simulating a migration mistake) still yields 0 rows | §6.2 restricted service roles; privacy-A §7 item 12 |
| `roles.definer-hygiene` | Every `SECURITY DEFINER` function has a fixed `search_path`, no PUBLIC EXECUTE, and the app role's EXECUTE set equals the reviewed whitelist exactly (`function_privs_are` or `has_function_privilege`) | §6.2 narrowly scoped internal APIs |
| `roles.no-bypass` | No application login role has `rolsuper` or `rolbypassrls`, or membership in `pg_read_all_data` (`pg_has_role`) | §6.2 |
| `roles.prod-role-inventory` | Role names, attributes and memberships equal a reviewed list (also run as a post-deploy check against the hosted DB, read-only) | §4.2 item 4 |
| `roles.db-settings` | `track_commit_timestamp = off`; `log_statement = none`; `log_min_duration_statement = -1`; `log_parameter_max_length_on_error = 0`. Whether these can be set or read on the hosted provider is **Unverified** | §6.2 logs; E31, E33 |

#### 5.3.3 Identifier tests (L3 + L4): "predictable identifiers" in §9

| Test | Assertion | Source |
|---|---|---|
| `neg.id.uuid-v4-only` | Every id the API exposes for content, comments, upvotes, surveys and shares parses as a UUID and `uuid_extract_version = 4` (so not v7) and `uuid_extract_timestamp` returns null (E30). A v7 id would embed a millisecond creation time, which could be matched against sign-in or enrollment times | §9, §6.2 |
| `neg.id.not-sequential` | Over 1,000 ids created in a row, no two consecutive ids differ by a small constant, and ordering ids does not reproduce creation order (Spearman rank check; the threshold is a proposal) | §9 |
| `neg.id.pseudonym-not-unkeyed-hash` | For every synthetic user id (and email, SSO subject), `sha256`, `sha1`, `md5`, and HMAC with an empty key, the course id or the user id as key match **no** stored pseudonym, tag or counter key | §12 known issue; §6.2 |
| `neg.id.roster-replay` | Given a DB dump (test DB) and the roster but not the key material, a scripted attacker cannot link any pseudonym to a user (family A/C designs with keyed derivation) | §6.2; privacy-A §7 item 20 |
| `neg.id.no-identity-in-urls` | No route path or query string contains a user id, pseudonym or email, for any role (scan of the route list plus captured requests) | §9 |
| `neg.id.etag-cookie-clean` | Response headers (ETag, Set-Cookie values other than the opaque session, Location) contain no identity canary | §9 API |

#### 5.3.4 Timing tests (L3)

| Test | Assertion | Source |
|---|---|---|
| `neg.timing.counter-no-time` | After a burst of posts by different students, reading counter rows (as the participation function role) yields no field that orders them in time (no timestamps; `ctid` and `xmin` exposure documented below) | §6.2; §7.10 "dates" not shared |
| `neg.timing.xmin` | Documents a limitation: if content and counter writes share a transaction, their `xmin` values match. If the design writes them in separate transactions (privacy-A "Mode D"), assert the `xmin` values differ. The design choice is Q9 | Q9; privacy-A §4.1 |
| `neg.timing.no-commit-ts` | `pg_xact_commit_timestamp` returns null/errors because `track_commit_timestamp` is off (E31) | §6.2 |
| `neg.timing.share-output` | The instructor's share view and export carry only `date shared` as a date (§7.10), not first or last activity dates | §7.10 |

#### 5.3.5 Channel negative tests (L4–L6): the five channels in §9

Roles exercised: instructor of the course, TA with **each** instructor-assignable permission combination
(§5; the permission list itself is not yet specified, PNQ-T3), TA of another course, instructor of another
course, institutional admin (proposal, PNQ-T1), a second student, unauthenticated.

| Test | Assertion | Source |
|---|---|---|
| `neg.api.matrix-authors` | For every (role, endpoint, method) in the generated matrix (§5.4), no response body or header contains an identity canary paired with its author's content canary (scanner rule, §5.2) | §9 API; §6.2 |
| `neg.api.moderation-identity-free` | Each moderation action (answer, pin, merge, recategorize, hide, delete, resolve, reopen, select for presentation) returns and logs no identity canary | §7.7; §10 "moderate without accessing identities" |
| `neg.api.report-queue-identity-free` | The moderation queue and report details show content and the report reason, never the reporter's or author's identity | §7.7 safe reporting; §6.4 |
| `neg.api.rate-limit-no-reveal` | When a student hits a rate limit, staff-visible responses and logs gain no identity canary, and the error to the student says nothing about other users. Limit values: Param Q20 | §6.4, §7.7 |
| `neg.api.student-isolation` | Student A cannot read student B's counter, upvote state, follows, share status or survey state (IDOR test with B's ids) | §5, §7.10 |
| `neg.api.course-isolation` | Every role gets a uniform not-found/forbidden for another course's objects; error bodies do not differ between "exists" and "does not exist" (prevents probing) | §5 course-based authz |
| `neg.ui.staff-pages` | Playwright crawls every page reachable by instructor, TA and admin storage states (including moderation queue, merged-question redirect pages, analytics, settings) and the scanner finds no pair | §9 UI |
| `neg.ui.rsc-payload` | The serialized React Server Components payload and hidden form fields are scanned too, not only visible text | §9 UI |
| `neg.export.columns` | The shared-results export contains exactly: student name, verified level, date shared (§7.10). File format: Param Q12 | §7.10, §7.11 |
| `neg.export.content-identity-free` | Any content or analytics export contains no identity canary; survey exports contain no identity canary and no per-response timestamp beyond what the owner allows (PNQ-T4) | §6.2 exports; §7.12 |
| `neg.log.co-occurrence` | Scanner over all captured logs after the full run, and again after a forced-error run | §9 logs; §6.2 |
| `neg.log.pg-error-no-literal-content` | Force a constraint error while posting content: the Postgres log line contains no content canary (proves parameterised queries) | E33; §6.2 |
| `neg.log.audit-identity-free` | Moderation audit records contain the action and object id but no identity of the author or of upvoters. Whether the acting moderator's identity is recorded is part of Q14 and is not assumed | §7.7 "without exposing identities"; §7.17; Q14 |
| `neg.notify.content-free` | Email notifications to a student contain no content text and no other student's identity (privacy-A / O1 proposal: content-free messages). Which notifications are essential: Param Q13 | §7.13, §6.2 |
| `neg.deanon.absent` | With no institutional deanonymization configuration, no route, function or role exists that returns an author for content (route list and function whitelist checked) | §6.4 default |
| `neg.analytics.suppression` | Level distribution and survey text are suppressed below N for each role; differencing (query before and after one student shares) does not reveal one student's level. N: Param Q16 | §7.12, §7.16 |

#### 5.3.6 Property tests (L2/L3, fast-check)

| Test | Property | Source |
|---|---|---|
| `prop.merge.union` | For random sets of voters on question A and B (with overlap), after merging A into B: total(B) = size of (voters(A) union voters(B)). Run model-based with `fc.commands` (vote, unvote, merge, merge-chain) and `asyncModelRun` against the DB function | §7.7 "without double-counting"; §10 |
| `prop.merge.credit-preserved` | Every student's "upvotes given", "questions", "comments" counters are identical before and after any merge sequence | §7.7 "Preserve qualifying private participation credit" |
| `prop.merge.comments-preserved` | Comment count of B after merge = comments(A) + comments(B). The spec says "where reasonable", so the exact rule is an owner decision (PNQ-T5); the test is parameterised | §7.7 |
| `prop.merge.redirect` | Every old id of a merged question redirects to the surviving question, including chained merges | §7.7 |
| `prop.upvote.idempotent` | Upvoting twice adds one to the total and one to the counter; the undo path (if the design has one, not specified) restores both | §7.7, §7.9 |
| `prop.counter.only-qualifying` | Random sequences of actions (ask, comment, upvote, view, report, follow, open card, mark "Still unclear", survey) change counters **only** for ask, comment, upvote | §7.9 |
| `prop.level.three-levels` | For any counts and any valid published thresholds, the level is one of exactly {No Record, Contributor, Sustained Contributor}; defaults per §7.9 | §7.9; §10 |
| `prop.level.no-received-upvotes` | Changing upvotes *received* never changes a level | §7.9 |
| `prop.threshold.no-disadvantage` | After participation starts, any threshold change that would lower any student's level is rejected; the originally published version is retained | §7.9 |

Hide/delete and participation credit: the spec does not say whether hiding or deleting content removes
credit (privacy-A NQ-A5). No test asserts either way until the owner decides.

#### 5.3.7 Feature tests with privacy weight (L4/L5)

| Test | Assertion | Source |
|---|---|---|
| `survey.separate-store` | Survey answers are written by a role that cannot read identity or participation, and the participation tables are unchanged after a survey submission (no credit) | §7.12 "technically separated", "no participation credit" |
| `survey.before-sharing` | The survey is presented before the share step, and remains available when the student declines to share | §7.12 |
| `survey.instructor-aggregate-only` | Instructor sees aggregate counts and anonymous text only; text is withheld below the configured minimum (Param Q16) | §7.12 |
| `survey.verbatim-questions` | The three question texts match §7.12 exactly (string equality against a fixture copied from CONTRIBUTING) | §7.12 |
| `search.no-hidden` | For each role, search results (all filters and sorts listed in §7.14) never include hidden, removed or moderator-only content, nor moderator notes, nor identity canaries; seeded hidden items carry their own canary so a leak is detectable | §7.14 |
| `search.course-scoped` | Search never returns another course's content | §7.14 "within the current course" |
| `present.exclusions` | In presentation mode the DOM and network contain the §7.8 "Display" items and none of the "Exclude" items: identities, private participation counts, activity breakdowns, moderator-only notes, reports, hidden comments (each seeded with a distinct canary) | §7.8; §10 |
| `share.only-level` | The share confirmation shows the §7.10 text verbatim; the instructor receives only name, verified level, date shared | §7.10 |
| `share.student-alone` | No staff or admin route can create, change or revoke a share for a student; only the student's own session can | §7.10; §10 |
| `share.revoke-until-final` | Revocation works until export/apply, then is refused with the explanation. Window timing: Param Q18 | §7.10 |
| `card.versioning` | Publish, edit, republish: earlier versions stay retrievable as students saw them at each point in time; a published-rule change requires what/why/effective date/applies-to-underway fields | §7.6 |
| `card.override-visible` | Where an assignment card differs from the course card, the student view marks the difference visibly | §7.4; §10 |
| `card.verbatim-defaults` | The §7.3 default principle and the §7.4 default statement match the spec text exactly (as configurable defaults) | §7.3, §7.4 |
| `tags.two-only` | The question tag type admits only Course and Specific Assignment (DB enum/check constraint and API validation reject anything else); filters are All / Course / one assignment | §7.2; §10 |
| `prohibited.absent` | Fitness test: the dependency list and the route list contain no AI-detection, sentiment or scoring package or endpoint (deny-list is a proposal and can only catch known names, so it supports, not replaces, review) | §3; §10 "No AI detection" |
| `a11y.axe-pages` | axe scan on every page in the crawl, for every role, with the tag set chosen once Q15 is answered. Until then, run in report-only mode | §8; Q15 |

### 5.4 Role x endpoint authorization matrix, generated from the route list

Goal: no endpoint can be forgotten. OWASP: "Validating permissions correctly on just the majority of
requests is insufficient" (E34).

1. **Route inventory (generated).** A script lists every Route Handler (`app/**/route.ts`, each exported
   HTTP method), every server action, and every page route. With Next.js App Router this can be done by
   globbing the file system at build time; whether Next.js offers a supported manifest to read instead is
   **Unverified**.
2. **Policy table (hand-written, reviewed).** A typed file `authz-policy.ts` lists, for each route and
   method, which roles may call it and with which TA permission. The **default is deny** (E34).
3. **Completeness test** `authz.policy-complete`: the generated inventory equals the policy table's keys.
   A new route without a policy entry fails CI. A policy entry without a route also fails (stale).
4. **Matrix test** `authz.matrix`: for each (route, method, role) cell, call it with a valid request
   built from a per-route fixture; assert 2xx where allowed and a uniform 403/404 where denied; run the
   canary scanner on every response, allowed or not.
5. **Cross-course cell**: each role is tried against an object of a course where it has no role.

Pseudocode (illustrative only):

```ts
// illustrative, not code to adopt as-is
for (const r of routeInventory) for (const role of ROLES) {
  test(`authz ${role} ${r.method} ${r.path}`, async () => {
    const res = await call(r, asRole(role), fixtures.for(r));
    expect(allowed(policy, r, role) ? isOk(res) : isDenied(res)).toBe(true);
    scanner.assertNoPair(await capture(res));
  });
}
```

### 5.5 Every §10 acceptance criterion mapped to named automated tests (§9 last bullet)

| # | §10 criterion `[src p.19]` | Named automated tests (proposal) | Blocked or parameterised by |
|---|---|---|---|
| 1 | Institutional users can sign in securely | `auth.sign-in-happy-path` (E2E per role); `auth.session-cookie-flags` (HttpOnly, Secure, SameSite, `__Host-` prefix if adopted); `auth.no-session-fixation` (id rotates on sign-in); `auth.sign-out-invalidates`; `auth.forged-session-generic-error` | Q4 (which IdP) |
| 2 | Courses and roles can be provisioned through supported integrations | `provision.import-creates-roles`; `provision.idempotent-reimport`; `provision.role-change-takes-effect`; `provision.no-cross-course-leak` | Q5 (integration type); LTI-specific tests only if Q5 picks LTI |
| 3 | Instructors can create, edit, preview, publish and version course and assignment cards | `card.create-edit-preview-publish` (E2E); `card.versioning`; `card.states` (draft, published, archived, superseded, §7.4); `card.verbatim-defaults`; `card.permitted-requires-fields` (§7.3 rule) | Q10 for wizard recommendations |
| 4 | Students can clearly distinguish course rules from assignment overrides | `card.override-visible`; `a11y.axe-pages` on the card view (difference not conveyed by colour alone is a manual check) | Q15 |
| 5 | Questions use only Course or Specific Assignment categorization | `tags.two-only`; `tags.recategorize` (staff can move between the two, §7.7) | none |
| 6 | Students can ask, comment and upvote anonymously | `board.ask-comment-upvote` (E2E); `neg.api.matrix-authors`; `neg.ui.staff-pages`; `schema.no-author-column`; `roles.web-cannot-read-linkage` | Q9 |
| 7 | Instructors and TAs can moderate without accessing identities | `neg.api.moderation-identity-free`; `neg.api.report-queue-identity-free`; `neg.log.audit-identity-free`; `authz.matrix` for every TA permission combination | PNQ-T3 (TA permission list) |
| 8 | Duplicate merging preserves counts correctly | `prop.merge.union`; `prop.merge.credit-preserved`; `prop.merge.comments-preserved`; `prop.merge.redirect` | PNQ-T5 ("where reasonable") |
| 9 | Presentation mode reveals no private data | `present.exclusions`; scanner over presentation-mode DOM and network | none |
| 10 | Participation uses only question, comment and upvote counts | `prop.counter.only-qualifying`; `survey.separate-store` (no credit); `prop.level.no-received-upvotes` | none |
| 11 | Exactly three levels are supported | `prop.level.three-levels`; `level.enum-closed` (DB check constraint / TS union has three members) | none |
| 12 | Students alone decide whether to share their level | `share.student-alone`; `share.revoke-until-final`; `share.only-level` | Q18 |
| 13 | Instructors receive no underlying participation activity | `neg.export.columns`; `neg.timing.share-output`; `neg.analytics.suppression`; `authz.matrix` (no counter route reachable by staff) | Q12, Q16 |
| 14 | The exit survey is anonymous and technically separate | `survey.separate-store`; `schema.survey-separate`; `survey.instructor-aggregate-only`; `neg.export.content-identity-free` | Q16, PNQ-T4 |
| 15 | No AI detection or automated student judgment exists | `prohibited.absent`; `prop.level.*` (level depends only on the three counts and thresholds); code review checklist item (manual) | none |

The five §9 channels are covered as follows: UI by `neg.ui.*`, `present.exclusions` and `search.no-hidden`;
API by `neg.api.*` and `authz.*`; exports by `neg.export.*`; logs by `neg.log.*` and the scanner;
predictable identifiers by `neg.id.*` and `neg.timing.*`.

### 5.6 CI on GitHub Actions within the free plan

Facts (E1–E4): a private repo on GitHub Free gets 2,000 Linux minutes/month on a 2-CPU/8 GB runner,
and usage is blocked (not billed) at the quota if no payment method is on file. Proposal: keep **no
payment method** on the account, or set a $0 budget, so CI can never cost money. Whether a $0 budget
blocks or only alerts is **Unverified** (E1 does not give a default spending limit).

Proposed workflow shape (one Linux job per PR; jobs are illustrative):

| Job | Contents | Estimated minutes (**Unverified**; measure in a spike) |
|---|---|---|
| `check` | install with cache, `tsc`, ESLint, dependency-cruiser, Vitest L1/L2 | ~3 |
| `db-api` | Postgres service container pinned to the hosted major version (with `pg_isready` health check, E4), migrations, L3 SQL tests (pgTAP optional), `next build` + `next start`, L4 matrix, L6 log scan | ~6 |
| `e2e` | Playwright Chromium only on PRs; scanner; axe in report mode until Q15 | ~8 |
| `nightly` (schedule) | Full Playwright crawl for all roles, long fast-check runs | ~20 |
| `mutation` (weekly or manual) | Stryker on privacy-critical modules only, incremental mode | ~30–60 |

Rough budget: 40 PR pushes a month x ~17 min = ~680; nightly 30 x 20 = 600; weekly mutation 4 x 60 = 240.
Total ~1,520 of 2,000. These figures are estimates, not measurements. Levers if the quota is tight:
`concurrency` groups that cancel superseded runs; path filters so docs-only changes skip DB/E2E; run e2e on
PR-ready only; drop nightly to weekly. A public repo would make minutes free (E1) but exposes the code
(PNQ-T6).

Postgres version in CI: pin the service image to the **same major version as the hosted database**. The
hosted version for the proposed provider is still **Unverified** (stack-hosting §15.2 says so too).
Current upstream is 18 (E30). The UUID functions this note uses (`uuidv4`, `uuid_extract_version`) exist in
the 18 docs; their availability on an older hosted major is **Unverified**. If the host runs an older
major, test with `gen_random_uuid()` and a regex version check instead.

### 5.7 Mutation testing and fitness functions

**Stryker scope (proposal).** Mutate only the files whose failure breaks §6: authorization policy and
guard, DTO mappers for staff-visible responses, the export builders, the log redaction layer, the
counter/level logic, the merge logic, the id generator wrapper. Use the `mutate` option to list them
(option documented on Stryker's configuration page; this session did not fetch that page, so its exact
shape is **Unverified**). A surviving mutant in these modules is treated as a missing negative test. A
mutation-score threshold is not in the spec; the owner chooses one or none (PNQ-T8). The SQL side (roles,
RLS, definer functions) cannot be mutated by Stryker. Cover it with a small hand-written "break it" set:
each migration-level safeguard has a test that temporarily removes it (drop the policy, grant the
privilege, add a timestamp column) and asserts that the matching test now fails.

**dependency-cruiser rules (illustrative, not tested config):**

```js
// .dependency-cruiser.cjs (sketch)
forbidden: [
  { name: 'content-not-to-identity', severity: 'error',
    from: { path: '^src/server/domains/content' },
    to:   { path: '^src/server/domains/(identity|participation|survey)' } },
  { name: 'identity-not-to-content', severity: 'error',
    from: { path: '^src/server/domains/identity' },
    to:   { path: '^src/server/domains/(content|survey)' } },
  { name: 'ui-only-via-dto', severity: 'error',
    from: { path: '^src/app' },
    to:   { path: '^src/server/domains/.+/(db|repo)' } },
]
```

Folder names follow the stack note's proposed `server/domains/*` layout and are not decided. A matching
eslint-plugin-boundaries config is optional, for editor feedback. Keep one source of truth for the rules.

### 5.8 Summary of the proposal, and order of work

**Proposal:** Vitest (unit, property, DB and API integration) + fast-check + a real Postgres (GitHub
Actions service container in CI, Testcontainers locally; not PGlite for anything role-related) + SQL
catalog assertions (pgTAP optional) + Playwright with @axe-core/playwright + a canary co-occurrence scanner
over UI, API, exports, logs and traces + a generated role x endpoint matrix with deny-by-default +
dependency-cruiser boundary rules + scoped, scheduled StrykerJS. All of it runs on GitHub Actions Free
within 2,000 minutes, with no payment method so it cannot bill. Every §10 criterion has named tests (§5.5).

Suggested order (each step is a proposal and depends on the ADRs for Q3 and Q9):

1. Before any content or participation code (§6.3 requires the ADR first): write the scanner, the
   canary seeding helper, `schema.*`, `roles.*`, `neg.id.*` and the dependency-cruiser rules against the
   empty schema. They should pass trivially, then guard every later migration.
2. With the first route: `authz.policy-complete` and `authz.matrix`, so no route can ship without a policy.
3. With the board: `prop.merge.*`, `prop.counter.*`, `neg.api.*`, `neg.ui.*`, `present.exclusions`, `search.*`.
4. With sharing and survey: `share.*`, `survey.*`, `neg.export.*`, `neg.analytics.suppression`.
5. Before any public sign-in (owner's first milestone): the full §5.5 map green for whatever features Q2
   puts in the milestone, plus a first Stryker run on the privacy modules.

---

## 6. Dependencies and proposed new open questions

### 6.1 Dependencies on other branches and decisions

- **Q3 ADR (stack).** Tool names assume TypeScript, Node >= 22.12 (Vitest 5, E6), Next.js App Router,
  Postgres. Stryker's vitest-runner needs Node >= 22 (E26). dependency-cruiser needs Node 22, 24 or >= 26 (E28).
- **Q9 ADR (privacy mechanism).** Table and role names in `roles.*`, the `xmin` test and the keyed-derivation
  replay test depend on it. Family B swaps role tests for credential-scope tests (§4.3). Family C adds
  key-handling tests.
- **Q8 threat model.** Each `neg.*` test should cite a threat ID; the suite and the threat model should be
  reviewed together.
- **Auth branch (Q4)** for §10 row 1; **provisioning branch (Q5)** for row 2; **design/a11y branch (Q15)**
  for the axe tag set; **notifications branch (Q6, Q13)** for `neg.notify.content-free`.
- **Hosting.** Whether the hosted Postgres lets the owner read the settings in `roles.db-settings`, and
  which Postgres major it runs, are **Unverified**.

### 6.2 Proposed new open questions (for the owner; none answered here)

| ID | Question | Why it matters |
|---|---|---|
| PNQ-T1 | §9 names only instructors and TAs. Should the mandatory negative tests also cover **institutional admins** and **operators** (DB owner, hosting dashboard)? §5 and §6.4 suggest admins at least, but §9 does not say so | Scope of `neg.*`; operator coverage is only possible for some privacy families |
| PNQ-T2 | Scanner strictness: fail on *any* identity canary next to *any* content canary in one artefact, or only on a student's identity next to **their own** content? Relatedly, may a student's own view show "you asked this"? | Defines the pass/fail rule for every UI/API test |
| PNQ-T3 | What exact TA permissions can an instructor assign? §5 gives "e.g. moderation, card editing" only | The matrix needs the full list to test every combination |
| PNQ-T4 | What survey metadata is "necessary" (§7.12 "No unnecessary metadata")? For example, is a submission date kept at all, and at what granularity? | `schema.survey-separate`, survey export test |
| PNQ-T5 | What does "Preserve all comments where reasonable" (§7.7) mean when merging, i.e. when is it *not* reasonable? | `prop.merge.comments-preserved` cannot assert an exact rule yet |
| PNQ-T6 | Will the repository be private or public? Public makes CI minutes free and runners larger (E1, E3) but publishes the code | CI budget (§5.6) |
| PNQ-T7 | Is an external security or privacy review (penetration test, accessibility audit) wanted before production, given that automated tests catch only part of the problem (E9, E34)? | Production readiness (§10, §11) |
| PNQ-T8 | Any required coverage or mutation-score threshold, or none? The spec sets none | CI gates |
| PNQ-T9 | Should CI run the full negative suite against a deployed **preview** environment (synthetic data) as well as locally built code, to catch host-level logging and caching leaks (e.g. platform request logs)? | §9 "logs" covers platform logs only if tested on the platform |
| PNQ-T10 | Retention for CI artefacts (Playwright traces, logs) that contain synthetic canaries | §4.2 item 3; relates to Q14/Q17 |
| PNQ-T11 | Is a post-deploy self-check against production (read-only catalog assertions such as `roles.prod-role-inventory`) acceptable, and which credentials may run it? | Guards against dashboard edits after deploy |

---

## 7. Verification log

| Claim | URL | Checked | Status |
|---|---|---|---|
| GitHub Free private repos: 2,000 Actions min/month, 500 MB artifacts (shared with Packages), 10 GB cache/repo | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Public repos free on standard GitHub-hosted runners | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Usage blocked at quota when no payment method is on file; billed (subject to budgets) when one is | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Linux 2-core overage $0.006/min | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Default spending limit / whether a $0 budget blocks | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | **Unverified** (not stated on page) |
| Free plan: 20 concurrent jobs; 6 h per job; 35 days per workflow run | https://docs.github.com/en/actions/reference/limits | 2026-10-11 | Verified |
| Private ubuntu-latest: 2 CPU, 8 GB RAM, 14 GB SSD; public 4/16/14; ubuntu-latest = Ubuntu 24.04 | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | 2026-10-11 | Verified |
| Service containers need a Linux runner; `pg_isready` health check; port mapping when the job runs on the runner | https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers | 2026-10-11 | Verified |
| Vitest 5.0 announced 2026-09-03; site shows v5.0.3 | https://vitest.dev/blog/ | 2026-10-11 | Verified |
| Vitest 5 needs Node >= 22.12.0 and Vite >= 6.4.0 | https://vitest.dev/blog/vitest-5 | 2026-10-11 | Verified |
| Vitest does not support async Server Components; Next.js recommends E2E for them (doc v16.4.0) | https://nextjs.org/docs/app/guides/testing/vitest | 2026-10-11 | Verified |
| Playwright latest is 1.64 | https://playwright.dev/docs/release-notes | 2026-10-11 | Verified (no release date on page) |
| Playwright a11y uses @axe-core/playwright `AxeBuilder.withTags()`; automated testing cannot detect all WCAG violations | https://playwright.dev/docs/accessibility-testing | 2026-10-11 | Verified |
| axe-core tags include `wcag22aa`; level tags are not cumulative | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | 2026-10-11 | Verified |
| @axe-core/playwright 4.13.0 | https://registry.npmjs.org/@axe-core/playwright/latest | 2026-10-11 | Verified |
| @testcontainers/postgresql 12.2.0; snapshot/restore API | https://registry.npmjs.org/@testcontainers/postgresql/latest ; https://node.testcontainers.org/modules/postgresql/ | 2026-10-11 | Verified |
| PGlite has a single exclusive connection | https://pglite.dev/docs/ | 2026-10-11 | Verified |
| PGlite behaves like a server for roles, GRANT/REVOKE, SET ROLE, RLS | https://pglite.dev/docs/about | 2026-10-11 | **Unverified** (not stated) |
| @electric-sql/pglite 0.5.8 | https://registry.npmjs.org/@electric-sql/pglite/latest | 2026-10-11 | Verified |
| pgTAP docs are for 1.3.4 and list `table_privs_are`, `function_privs_are`, `policies_are`, `hasnt_fk`, `is_definer`, `roles_are` etc. | https://pgtap.org/documentation.html | 2026-10-11 | Verified (names from TOC; signatures not read) |
| pgTAP is preinstalled in the stock `postgres` Docker image, and its apt package name | n/a | 2026-10-11 | **Unverified** |
| Supabase supports the pgTAP extension; `supabase test db` with a GitHub Actions example | https://supabase.com/docs/guides/database/extensions/pgtap ; https://supabase.com/docs/guides/local-development/testing/overview | 2026-10-11 | Verified |
| fast-check 4.10.2; runs in Vitest without special integration; `fc.commands`, `asyncModelRun`, `scheduledModelRun`, shrinking, `replayPath` | https://registry.npmjs.org/fast-check/latest ; https://fast-check.dev/ ; https://fast-check.dev/docs/advanced/model-based-testing/ | 2026-10-11 | Verified |
| @stryker-mutator/vitest-runner 10.0.0; Node >= 22; peer `vitest >= 2.0.0`; dev-tested on Vitest 4.1.10 | https://registry.npmjs.org/@stryker-mutator/vitest-runner/latest | 2026-10-11 | Verified |
| Stryker Vitest runner: browser mode unsupported; forces threads; coverageAnalysis always perTest | https://stryker-mutator.io/docs/stryker-js/vitest-runner/ | 2026-10-11 | Verified |
| Stryker works with Vitest 5 | n/a | 2026-10-11 | **Unverified** (peer range allows it; not stated as tested) |
| Stryker `mutate` option exact syntax | https://stryker-mutator.io/docs/stryker-js/introduction/ | 2026-10-11 | **Unverified** (configuration page not fetched) |
| dependency-cruiser 18.6.0; Node ^22, ^24 or >= 26; `forbidden` rules with `from`/`to` paths; TypeScript | https://registry.npmjs.org/dependency-cruiser/latest ; https://github.com/sverweij/dependency-cruiser | 2026-10-11 | Verified |
| eslint-plugin-boundaries v7.1.0 docs; flat config; `boundaries/dependencies` rule | https://www.jsboundaries.dev/docs/overview/ | 2026-10-11 | Verified (supported ESLint versions not stated) |
| Postgres current = 18 (18.6 docs); 19 in beta | https://www.postgresql.org/docs/current/functions-uuid.html | 2026-10-11 | Verified |
| `uuidv7` embeds a millisecond UNIX timestamp; `uuid_extract_timestamp` returns it for v1/v7, null otherwise; `uuid_extract_version` exists | https://www.postgresql.org/docs/current/functions-uuid.html | 2026-10-11 | Verified (for PG 18) |
| `has_table_privilege`, `has_function_privilege`, `pg_has_role` etc. signatures; `pg_xact_commit_timestamp` needs `track_commit_timestamp` | https://www.postgresql.org/docs/current/functions-info.html | 2026-10-11 | Verified |
| `information_schema.view_table_usage` lists only tables owned by a currently enabled role | https://www.postgresql.org/docs/current/infoschema-view-table-usage.html | 2026-10-11 | Verified |
| Postgres logs failing statement text by default (`log_min_error_statement = ERROR`); bind values not logged on error by default | https://www.postgresql.org/docs/current/runtime-config-logging.html | 2026-10-11 | Verified |
| OWASP: deny by default; validate permissions on every request; authorization unit/integration tests catch low-hanging fruit only | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | 2026-10-11 | Verified |
| Hosted Postgres major version for the proposed provider; ability to read/set logging settings there | n/a | 2026-10-11 | **Unverified** |
| Next.js offers a supported route manifest usable for the route inventory | n/a | 2026-10-11 | **Unverified** |
| Jest / `node:test` status | n/a | 2026-10-11 | **Unverified** (not researched) |
| CI minute estimates in §5.6 | n/a | 2026-10-11 | **Unverified** (estimates; measure in a spike) |
