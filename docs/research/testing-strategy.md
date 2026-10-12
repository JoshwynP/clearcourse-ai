# Testing strategy and mandatory negative privacy tests (§9, §10, §15)

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: the §9 testing requirements, the §10 acceptance criteria and §15 items 3–4; depends on
> Q3, Q8 and Q9; also Q2, Q4, Q5, Q7, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q20; PQ-65 to PQ-70, and
> PQ-10 to PQ-16, PQ-19 to PQ-25, PQ-29 to PQ-33, PQ-35, PQ-36, PQ-43, PQ-47, PQ-48, PQ-54.
> Related: [ADR 0003](../decisions/0003-privacy-mechanism.md) and the
> [privacy architecture](privacy-architecture.md) (controls C-01 to C-22, which this file turns into
> tests), [ADR 0001](../decisions/0001-application-stack.md) (stack),
> [ADR 0002](../decisions/0002-hosting-and-infrastructure.md) (hosting),
> [ADR 0004](../decisions/0004-prototype-authentication.md) (sign-in),
> [design system and accessibility](design-system-and-accessibility.md) (Q15).

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

§9 makes three demands: an automated test suite is a deliverable; "explicit negative tests are
mandatory" and must prove that instructors and TAs **cannot** retrieve the authors of anonymous
content through the **UI, API, exports, logs or predictable identifiers**; and every §10 criterion
"should have at least one automated test that demonstrates it". §15 items 3 and 4 add that every
change has tests, "including negative/privacy tests where identity or anonymous content is
involved", and that all tests, type checks and lint pass locally.

The spec sets **no** coverage percentage, mutation score, framework, CI provider, browser matrix,
load test or penetration test. None is assumed here.

**Proposal (owner approval needed).** Conditional on ADR 0001 (TypeScript, Next.js, Drizzle,
Postgres) and ADR 0003 (privacy mechanism "A+"):

| Layer | Proposal |
|---|---|
| Unit, property, DB and API tests | **Vitest 5** with **fast-check** |
| Database under test | A **real Postgres**: a GitHub Actions service container in CI, **Testcontainers** locally, pinned to the hosted major version. **Not PGlite** for anything that depends on roles, grants or RLS |
| SQL permission tests | Plain **SQL catalogue assertions** plus behavioural "connect as role and try" tests; pgTAP optional (it is not in the stock `postgres:18` image) |
| Browser and accessibility | **Playwright** with **@axe-core/playwright**, one storage state per role |
| Leak detection | A **canary co-occurrence scanner** over UI DOM and RSC payloads, API bodies and headers, exports, app and Postgres logs, error sinks and Playwright traces |
| Authorization | A **deny-by-default role × endpoint matrix** generated from the route list, with a completeness test so no route ships without a policy |
| Architecture | **dependency-cruiser** boundary rules as the CI gate |
| Mutation | **StrykerJS** scoped to privacy modules, weekly, after a Vitest 5 compatibility spike |
| CI | **GitHub Actions Free**, standard Ubuntu runners only, no payment method on file, so CI is blocked rather than billed at the quota |

The negative privacy suite uses the test IDs **T-01 to T-36** that ADR 0003 and the privacy
architecture already cite, and each test traces to one or more controls **C-01 to C-22**
(section 6.4). Every one of the 15 §10 criteria maps to named tests (section 6.7).

**Main trade-offs.** Real Postgres costs CI minutes and needs Docker locally, but it is the only
option that tests the roles, grants and RLS the privacy design depends on. Tests cannot prove that
the deployed code is the reviewed code, that vendor logs hold only their documented fields, or that
the operator does not misuse the keys; those stay documented limitations (§6.2, §11).

## 2. Questions covered and what they block

**Requirements.** §9 / `[src p.18]`: "Include explicit negative tests proving that instructors and
TAs cannot retrieve the authors of anonymous content through the UI, API, exports, logs, or
predictable identifiers." §9 / `[src p.19]`: at least one automated test per §10 criterion (15
criteria). §11: tests are a deliverable. §15 items 3–4: tests with every change; tests, type checks
and lint pass locally. §6.2 and §3 name the places where identity and content text must never meet
(log, analytics event, error report, database view, export, admin dashboard), which gives the
scanner its targets (interpretation).

**Not in the spec, so proposals only:** coverage or mutation thresholds (PQ-69); testing admins and
the operator, since §9 names only instructors and TAs (PQ-65); an accessibility level (Q15).

**Dependencies.** This file closes no question. A test that depends on an open value reads it from
configuration and is marked "parameterised on Qn/PQ-nn".

| Question | Effect on testing |
|---|---|
| Q3 (ADR 0001, 0002) | All tool names assume TypeScript, Node, Next.js App Router, Postgres |
| Q9 (ADR 0003) | T-01 to T-36 are written for A+; integrity forks PQ-19 to PQ-25, PQ-30, PQ-33 change some assertions |
| Q8 | Each negative test should cite a threat ID from the threat model |
| Q2, PQ-08 | Which §10 rows apply in M1a/M1b; §10 is labelled *production* criteria |
| Q4, Q5 | §10 rows 1 and 2 (sign-in, provisioning) |
| Q7 | T-34; any impersonation path needs its own negative tests |
| Q12, Q13, Q14 | Export format (T-16); essential notifications (T-28); audit-row contents |
| Q15 | axe tag set and whether the axe gate blocks |
| Q16, Q18 | N in T-26 and T-27; the sharing window in T-36 |
| Q17, Q20 | Deletion and tombstone tests; rate-limit values |

## 3. Options considered

Status as shown by the official page or npm registry (checked 2026-10-11); URLs are in section 10.
Versions drift, so re-check them at scaffold time.

| Need | Option | Status | Verdict (proposal) |
|---|---|---|---|
| Unit and integration runner | **Vitest** | 5.0.3; Node `^22.12.0 \|\| ^24 \|\| >=26`; Vite >= 6.4; `clearMocks` now true by default, un-awaited async assertions fail | **Use** |
| | Jest, `node:test` | Not researched (**Unverified**) | Not proposed |
| Async Server Components | Vitest | Not supported; Next.js recommends E2E | Cover with Playwright |
| Browser E2E | **Playwright Test** | 1.64.0 (2026-10-07); Node >= 20 | **Use** |
| Accessibility | **@axe-core/playwright** | 4.13.0 (axe-core 4.14.0), MPL-2.0; `wcag22aa` tag exists, no `wcag22a`; tags not cumulative | **Use**; tags follow Q15 |
| Postgres in CI | **GitHub Actions service container** | Ubuntu runner required; `pg_isready` health check | **Use**, pinned to the hosted major |
| Postgres locally | **Testcontainers** `@testcontainers/postgresql` | 12.2.0; `snapshot()`/`restoreSnapshot()` (not on a database named `postgres`; disconnect first) | **Use**, same suite as CI |
| | PGlite `@electric-sql/pglite` | 0.5.8, pre-1.0; "only has a single exclusive connection"; docs silent on roles, GRANT, `SET ROLE`, RLS | **Not for privacy tests** |
| | Supabase CLI (`supabase test db`) | Documented CI example; starts the whole local Supabase stack | Not proposed: ADR 0002 uses Supabase as plain Postgres (interpretation) |
| SQL permission tests | **Catalogue assertions in Vitest** (`has_table_privilege`, `has_function_privilege`, `pg_has_role`, `pg_class`, `pg_proc`, `pg_policy`) | Postgres 18 docs | **Baseline** |
| | **Behavioural tests** (connect as `cc_web` and try) | Expect SQLSTATE 42501 | **Always**, beside the catalogue checks |
| | pgTAP 1.3.4 (`table_privs_are`, `policies_are`, `is_definer`, `hasnt_fk`, `roles_are`) | Not in the official `postgres:18` image; `postgresql-18-pgtap` in PGDG apt | Optional; needs a custom image or install step |
| Property tests | **fast-check** | 4.10.2; any runner; `fc.commands`, `asyncModelRun`, shrinking, `replayPath` | **Use** |
| Mutation tests | **StrykerJS** + `@stryker-mutator/vitest-runner` | Runner 10.0.0 (2026-08-14, before Vitest 5); browser mode unsupported; `thresholds.break` null by default | **Use, scoped and weekly**, after a spike; Vitest 5 support **Unverified** |
| Architecture rules | **dependency-cruiser** | 18.6.0 (published on the check date); `forbidden` from/to rules; TypeScript | **CI gate**; pin it |
| | eslint-plugin-boundaries | 7.2.0; ESLint 10 support **Unverified** | Optional editor feedback |
| CI | **GitHub Actions, private repo, Free** | 2,000 min/month; 500 MB artifacts; 10 GB cache; blocked, not billed, at quota without a payment method; larger runners always charged; 2 CPU / 8 GB runner | **Use**, standard runners only |
| | Public repo | Free standard runners; 4 CPU / 16 GB | Only if the owner chooses (PQ-68) |
| | Self-hosted runner | Free | Not proposed: the owner would have to run it |

## 4. Evidence

The facts that shape the proposal (checked 2026-10-11; full log in section 10):

1. **Postgres logs failing statement text** by default (`log_min_error_statement = ERROR`) but not
   bind values (`log_parameter_max_length_on_error = 0`). So content interpolated into SQL reaches
   the server log on any error; bind parameters do not (inference). Hosted defaults: **Unverified**.
2. **`information_schema.view_table_usage`** includes a table "only if that table is owned by a
   currently enabled role", so cross-domain view checks must query the system catalogues
   (`pg_depend`/`pg_rewrite` is an inference, not a documented remedy).
3. **UUIDv7 leaks time**: Postgres 18's `uuidv7` embeds a millisecond timestamp that
   `uuid_extract_timestamp` returns; RFC 9562 says UUIDs "MUST NOT be used as security
   capabilities". Whether the host runs 18 is **Unverified**; on older majors use
   `gen_random_uuid()` and a regex version check.
4. **Commit timestamps** exist only with `track_commit_timestamp` on and are "routinely removed
   during vacuum".
5. **PGlite** has a single connection and no documented role or RLS fidelity; **pgTAP** is not in
   the official `postgres:18` image.
6. **GitHub keeps workflow artifacts and logs 90 days** by default (private repos 1–400 days); the
   Free artifact quota is 500 MB and cannot be raised.
7. **Node range** shared by Vitest 5.0.3, dependency-cruiser 18.6.0, ESLint 10.12.0, Playwright and
   the Stryker runner: **22.13+ on the 22 line, any 24.x, or >= 26** (not 23 or 25).
8. **Limits of automation.** Playwright: "automated testing cannot detect all types of WCAG
   violations"; OWASP: authorization tests catch "low-hanging fruit", and access should be denied
   by default and validated on every request. Stryker never fails CI unless `thresholds.break` is
   set; its 80/60 defaults are report colours only.
9. **WCAG 2.2 SC 3.3.8**: a one-time-code field must accept a pasted whole code and allow autofill;
   a split input that takes one digit on paste is failure F109.

## 5. Comparison

The privacy design (ADR 0003) rests on roles, grants, FORCE RLS and `SECURITY DEFINER` functions,
so the test database must behave like the hosted server on exactly those points.

| Criterion | Service container (CI) | Testcontainers (local) | PGlite | Supabase CLI stack |
|---|---|---|---|---|
| Real roles, grants, RLS, definers | Yes | Yes | **Unverified** | Yes |
| Several login roles and pools at once (ADR 0001) | Yes | Yes | No (one connection) | Yes |
| Same major as the host | Pin the tag | Pin the tag | No control | Follows the CLI |
| Server log for the scanner | Yes | Yes | No | Yes |
| CI cost | Low | Docker needed | Lowest | Highest |

**Result:** service container in CI, Testcontainers locally, one suite.

**Plain SQL or pgTAP.** Plain SQL needs no custom image, runs in the same Vitest report and is the
same SQL a read-only production self-check would use; pgTAP gives ready-made assertions at the cost
of an install step on every run. **Result:** plain SQL baseline, pgTAP optional.

**Private or public repository (PQ-68).** Private: 2,000 minutes then blocked, 2 CPU / 8 GB,
retention up to 400 days. Public: free minutes, 4 CPU / 16 GB, retention up to 90 days, but code,
fixtures and CI logs become public. The budget in 6.9 assumes private.

## 6. Recommendation (proposal) with trade-offs

Everything in this section is a **Proposal**. Table, role and function names follow the privacy
architecture (sections 6.2–6.4) and are illustrative until ADR 0003 is accepted. Test names use two
schemes: **T-nn** for the negative privacy suite that ADR 0003 cites, and dotted names
(`family.subject`) for the code-level tests, with a cross-reference where they overlap.

### 6.1 Layers

| Layer | Tool | Runs against | What it proves | When |
|---|---|---|---|---|
| L0 Static | `tsc --noEmit`, ESLint, **dependency-cruiser** | Source tree | Domain import boundaries; only the linkage module imports the `cc_link` credential (T-22); no logger import in modules that handle content text (rule shape is a proposal) | Every push |
| L1 Unit | Vitest | Pure functions: level calculation and threshold guard (§7.9), card override diff (§7.4), DTO mappers | Logic in isolation | Every push |
| L2 Property | fast-check in Vitest | L1 functions and L3 database functions | Merge, counter, upvote, level and suppression invariants | Every push (fixed runs); long runs nightly |
| L3 Database | Vitest + real Postgres | Migrated schema, real roles | Catalogue assertions, behavioural role tests, identifiers, timing hygiene | Every push |
| L4 API | Vitest over HTTP against `next start` with the L3 database | Every route × every role | The role × endpoint matrix (6.6); response canary scan | Every push |
| L5 E2E | Playwright + @axe-core/playwright | Built app in Chromium, one storage state per role | UI negative tests, presentation mode, search, sharing, exports downloaded through the UI, axe per page | Every PR; full crawl nightly |
| L6 Artefact audit | Canary scanner (6.3) | App stdout/stderr, Postgres log, ORM/driver logs, local error sink, traces, exports | No artefact holds an identity canary with a content canary | Last step of the same job |
| L7 Mutation | StrykerJS | L1–L4 tests over privacy modules | Negative tests fail when privacy code is broken | Weekly or manual |

Manual checks stay in scope: a keyboard and screen-reader checklist per page (Q15; see
[design system and accessibility](design-system-and-accessibility.md)) and a code-review checklist
item for §3 prohibitions. Whether an external security, privacy or accessibility review is wanted is
PQ-69.

### 6.2 The suite must not become a leak

The spec does not discuss test infrastructure; these follow from §6.2 and CLAUDE.md
("Never log, trace, export or display identity together with anonymous content").

1. **Synthetic data only**, in tests, CI and previews (PQ-15). Never restore production into dev or
   preview (C-21).
2. **The oracle stays in memory.** To prove "the instructor cannot learn that canary student S wrote
   text T", the test must know that S wrote T. The seeding step keeps that map **only in the test
   process's memory**, never in the database, a fixture file, a log or a CI artifact. Fixtures post
   content through the same narrow API a student uses, not by privileged inserts.
3. **Traces, screenshots and videos are artefacts in the §6.2 sense.** The scanner scans them too.
   CI uploads them **only on failure**, with a short retention set per artifact; GitHub's default
   is 90 days for artifacts and logs (PQ-70).
4. **No test role in production.** `roles.prod-role-inventory` asserts that the deployed role set,
   attributes (`rolsuper`, `rolbypassrls`) and memberships equal a reviewed list.
5. **Failure output is redacted.** The scanner reports *which artefact and which canary pair*,
   never the text. Assertion messages never print whole response bodies.

### 6.3 Canary co-occurrence scanner

A **canary** is a unique, high-entropy marker that can appear in an artefact only if specific data
leaked. Canaries are generated fresh per CI run.

| Kind | Examples (illustrative formats) |
|---|---|
| Identity canaries (domain 3) | Display name `CANARY_NAME_<hex>`, email local part `canary<hex>@<test domain>`, internal user id, SSO subject; the test harness also reads back any derived `pid` or tag through a test hook, never logged |
| Content canaries (domains 1 and 5) | `CANARY_TEXT_<hex>` in each question, comment and survey answer; each returned content id |
| Secret canaries | KEK and `K_c` bytes in hex and base64 (T-17 b); session tokens (T-17 c) |

**Unit of scan:** one HTTP response (body and headers), one rendered page (DOM text, attributes,
hidden inputs and inline RSC payload), one log record, one export file, one trace file.

**Rule.** Fail if one unit holds an identity canary of student S together with a content canary
authored by S. The stricter variant fails on *any* identity canary next to *any* content canary.
Which one is enforced is **PQ-66**; whether a student's own view may show "you asked this" is
**PQ-22**. The privacy architecture states the strict form ("a canary name and canary text must
never co-occur"), so the strict variant is the default proposal for every staff and admin view.

**Encodings.** Also search base64, URL-encoded, JSON-escaped and lowercase forms, and UUIDs without
hyphens. A leak through an encoding is still a leak.

| §9 channel | Capture (proposal) |
|---|---|
| UI | Playwright: after each navigation and moderation action, `document.documentElement.outerHTML`, including `data-*` attributes and inline RSC payload scripts |
| API | Playwright `page.on('response')` plus the L4 HTTP client; bodies **and** headers (`ETag`, `Location`, `Set-Cookie`) |
| Exports | Every export endpoint, called by every role that may call it; saved to a temp directory and scanned, including CSV headers |
| Logs | App stdout/stderr, the Postgres service container's log, ORM/driver logs, and an in-memory collector standing in for any error-reporting or analytics sink |
| Predictable identifiers | Not a text scan: see T-18 to T-20 |

**Forced-error runs.** The log scan runs twice: once on the normal suite and once with errors forced
inside every definer function (T-17), because Postgres logs failing statement text by default
(section 4, item 1). `neg.log.pg-error-no-literal-content` forces a constraint error while posting
content and asserts that the Postgres log line holds no content canary.

**Fixtures** (from the privacy judge): a canary student posts canary text; seeded courses include a
tiny class below N and a class where all but one student share, so suppression tests (T-26) have
something to catch.

### 6.4 The negative privacy suite (T-01 to T-36)

These IDs come from the privacy judge and are the ones ADR 0003 and the privacy architecture cite.
Roles exercised wherever a role matters: instructor of the course; TA with **each** assignable
permission combination (the list is PQ-67); TA and instructor of another course; institutional admin
(proposal, PQ-65); a second student; unauthenticated. A person who is both TA and student in one
course is a separate fixture if PQ-29 allows it.

**Catalogue and configuration** (L3; CI on every migration and as a daily read-only production
self-check, C-22, PQ-70)

| ID | Test | Code-level names | Controls | §9 channel / §10 item |
|---|---|---|---|---|
| T-01 | `has_table_privilege` for every runtime role × every table equals a checked-in matrix; no runtime role has SELECT on any base table outside `catalog` (`cc_auth` only on `auth_private`); behavioural SELECT/INSERT/UPDATE/DELETE as `cc_web` fails with 42501 | `roles.privilege-matrix`, `roles.web-cannot-read-linkage` | C-02 | Ordinary queries; "moderate without accessing identities" |
| T-02 | Column **allow-list** per anonymous table (not a name regex, per C-01); no FK from anonymous schemas to `identity`; only allow-listed timestamp columns, all bucketed (PQ-24); counters, tags, completions and survey responses have none | `schema.no-author-column`, `schema.counter-no-timestamps`, `schema.survey-separate` | C-01, C-15 | Predictable ids; "ask, comment and upvote anonymously" |
| T-03 | No view or materialised view depends on both an identity-bearing and an anonymous schema, checked through the system catalogues, not `information_schema` (exact query **Unverified**) | `schema.no-cross-domain-view` | C-02 | Database views (§6.2) |
| T-04 | Every `SECURITY DEFINER` function: `search_path` in `proconfig`, owner `cc_fn_*`, no PUBLIC EXECUTE | `roles.definer-hygiene` | C-04 | API |
| T-05 | Locked tables: `relrowsecurity` and `relforcerowsecurity` true; policies only `TO cc_fn_*` | `roles.rls-forced` | C-03 | Ordinary queries |
| T-06 | `rolbypassrls = false`, no `rolsuper`, no `pg_read_all_data` for `cc_*`; tables owned by `cc_owner`; `track_commit_timestamp = off` | `roles.no-bypass`, `neg.timing.no-commit-ts` | C-05, C-15 | Ordinary queries |
| T-07 | `log_statement = none`, `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0` on the live project (whether the host lets us read or set them is **Unverified**) | `roles.db-settings` | C-10 | Logs |
| T-08 | EXECUTE set per role equals the function whitelist exactly; each function's return columns match an allow-list | `roles.function-whitelist`, `schema.no-cross-domain-function` | C-04, C-07 | API |

**Functions, API, UI and exports** (L3–L5)

| ID | Test | Code-level names | Controls | §9 channel / §10 item |
|---|---|---|---|---|
| T-09 | As instructor, TA (every permission combination) and admin, call every route and function from the generated inventory and the whitelist; no response holds a student id, name, email, pid or tag next to content | `authz.matrix`, `neg.api.matrix-authors`, `neg.api.moderation-identity-free`, `neg.api.report-queue-identity-free` | C-02, C-08 | UI/API; "moderate without accessing identities" |
| T-10 | Forged or absent session → generic error; student A cannot read B's counts, level, upvote or follow state; another course's objects give a uniform not-found that does not differ between "exists" and "does not exist" | `neg.api.student-isolation`, `neg.api.course-isolation`, `auth.forged-session-generic-error` | C-09 | API |
| T-11 | Upvote twice → total +1, counter +1; merge property test (total(B) = \|A ∪ B\|, counters unchanged, comments moved, redirect works, audit row ids-only); a tombstoned voter is still de-duplicated | `prop.upvote.idempotent`, `prop.merge.*` (6.5) | C-19 | "Duplicate merging preserves counts correctly" |
| T-12 | A simulated stray `GRANT SELECT` to `cc_web` on a locked table still returns 0 rows (FORCE RLS) | `roles.rls-forced` (break-it case) | C-03 | Ordinary queries |
| T-13 | The posting transaction writes no row in any table a runtime role can read through a function that returns identity (tool `pg_stat_xact_user_tables` is **Unverified**) | `neg.timing.posting-transaction` | C-02, C-15 | Ordinary queries |
| T-14 | Browser E2E: staff pages, moderation queue, merged-question redirects, analytics, settings, presentation mode and search never render a canary name beside canary text, including RSC payload and hidden fields; presentation shows only the §7.8 "Display" items; its upvote total does not change after a new upvote until re-selected | `neg.ui.staff-pages`, `neg.ui.rsc-payload`, `present.exclusions` | C-16 | UI; "Presentation mode reveals no private data" |
| T-15 | Hidden, removed and moderator-only content and moderator notes never appear in student search, filters or sorts (§7.14); search never crosses courses | `search.no-hidden`, `search.course-scoped` | C-02 | UI |
| T-16 | The shared-results export has exactly name, verified level, date shared (plus Q12 format fields); no other export exists; any content or analytics export has no identity canary; no first or last activity dates | `neg.export.columns`, `neg.export.content-identity-free`, `neg.timing.share-output` | C-16 | Exports; "Instructors receive no underlying participation activity" |

**Logs and identifiers** (L3, L4, L6)

| ID | Test | Code-level names | Controls | §9 channel |
|---|---|---|---|---|
| T-17 | Whole suite with app stdout, Postgres log, ORM/driver logs and a local error sink captured, then again with errors forced inside every definer: (a) no record holds an identity canary with a content canary; (b) no record holds KEK or `K_c` bytes; (c) no session token next to body text | `neg.log.co-occurrence`, `neg.log.pg-error-no-literal-content` | C-06, C-10, C-11 | Logs |
| T-18 | Every exposed id is UUID version 4 (`uuid_extract_timestamp` null); no sequential pattern over 1,000 ids (rank check; threshold is a proposal); no id or identity in a URL or query string; headers carry no identity canary; after `POST` the client does not `GET` the new id (PQ-28) | `neg.id.uuid-v4-only`, `neg.id.not-sequential`, `neg.id.no-identity-in-urls`, `neg.id.etag-cookie-clean` | C-13 | Predictable identifiers |
| T-19 | For every enrolled user, `sha256(user_id)`, `sha1`, `md5`, and HMACs with an empty key, the course id or the user id as key match no stored pid or tag (§12 known issue) | `neg.id.pseudonym-not-unkeyed-hash` | C-06 | Predictable identifiers |
| T-20 | Dump-replay: with a dump and the roster but no KEK, a scripted attacker matches no pid or tag (covers outbox, follows, reports, rate-limit buckets, snapshots, seen markers). Dump-diff: no byte string of 8+ bytes appears in both identity and anonymous schemas except allow-listed course ids | `neg.id.roster-replay`, `neg.id.dump-diff` | C-06, C-21 | Dumps, predictable ids |

**Red-team additions** (L0–L5)

| ID | Test | Controls | Closes |
|---|---|---|---|
| T-21 | (a) `cc_web` gets "permission denied" selecting `xmin`/`ctid` from any content or identity base table; (b) read functions return no system column; (c) a repeat sign-in and roster sync leave `identity.*` `xmin` unchanged. The attack is first demonstrated on the unhardened design, then shown to fail. Also an M0 spike | C-02, C-09 | `xmin` linkage through identity writes |
| T-22 | Lint: only the linkage module imports the `cc_link` credential; as `cc_web`, any tag- or credit-bearing function fails | C-07 | Tag forgery via SQL injection |
| T-23 | No read function has a tag-list parameter; `item_tag_sets` returns per-item sets only | C-08 | Probing by tag lists |
| T-24 | After N authenticated requests the session row is byte-identical (refresh off); `cc_web` cannot read `auth_private`; IP/UA empty if suppressible (**Unverified**, PQ-48). Also an M0 spike | C-09 | Session-table timing |
| T-25 | If PQ-12 approves any error tool: a forced error on each content route reaches a local sink without body, cookies, IP or user context | C-12 | Error-SDK leaks |
| T-26 | Two analytics calls in one period return the identical snapshot; level distribution suppressed when enrolment < N or any non-empty level < N; hidden once sharing opens; one-non-sharer and all-non-sharers-same-level cases reveal nothing (N: Q16; rule shape: PQ-31) | C-16 | Differencing; §10 "Students alone decide" |
| T-27 | Survey rows have no metadata columns; submission changes no counter; results empty while open, revealed only after close and at or above the minimum; order is not completion order (statistical); second submission rejected only if PQ-32 says so | C-16 | §10 "exit survey is anonymous and technically separate" |
| T-28 | Email sink: every content-related email uses the single template; no question id, title, text or level; outbox empty after the digest job | C-17 | Email linkage |
| T-29 | Asking a question creates no follow tag, unless the owner accepts auto-follow (PQ-21) | C-18 | Asker exposure |
| T-30 | Supabase `/rest/v1/` does not respond (Data API off); nothing in `public`; default grants revoked | C-14 | Platform defaults |
| T-31 | Spike: merge HMAC timing at realistic roster sizes on the chosen host (feasibility, not privacy) | — | §7.7 |
| T-32 | Mode S: a test **demonstrates** content/counter `xmin` equality (a documented limitation); after `jobs.wash`, live counter rows share one `xmin`; under Mode B, counter `xmin` differs from content `xmin` after the batch (PQ-30) | C-15 | `xmin` linkage |
| T-33 | T-17 through the production driver and pooler mode, proving parameters are never interpolated into logged literals. Also an M0 spike | C-10 | Pooler logging |
| T-34 | No route switches the acting user; admin sessions cannot call any `my_*` or linkage function (Q7) | C-20 | Impersonation |
| T-35 | A disadvantaging threshold change after participation starts is rejected; the original version stays readable and shown; the level enum has exactly three members (reading of "disadvantage" and "begins": PQ-33) | — | §7.9; "Exactly three levels" |
| T-36 | The level is server-computed (a client-supplied level is ignored); verbatim §7.10 text shown before confirmation; revoke works until finalisation and fails after; the instructor sees exactly three fields | — | §7.10; "Students alone decide whether to share" |

**Additional negative tests** not in the T-nn list: `neg.deanon.absent` (with no institutional
deanonymization configuration, no route, function or role returns an author, §6.4);
`neg.api.rate-limit-no-reveal` (hitting a limit adds no identity to staff-visible responses or logs;
values parameterised on Q20); `neg.log.audit-identity-free` (moderation audit rows hold the action and
object ids, never the author or upvoters; whether the acting moderator is recorded is Q14 and PQ-27).

**Break-it set.** Stryker cannot mutate SQL. Each migration-level safeguard gets a test that removes
it temporarily (drop a policy, grant a privilege, add a timestamp column) and asserts that the
matching T-nn test then fails.

### 6.5 Property and feature tests

**Property tests** (L2/L3, fast-check; model-based where noted)

| Test | Property | Source |
|---|---|---|
| `prop.merge.union` | For random voter sets on A and B with overlap, after merging A into B: total(B) = \|voters(A) ∪ voters(B)\|. Model-based with `fc.commands` (vote, merge, merge chain) and `asyncModelRun` against the database functions | §7.7 "without double-counting" |
| `prop.merge.credit-preserved` | Every student's questions, comments and upvotes-given counts are identical before and after any merge sequence. Whether a double upvoter keeps two credits is PQ-20 (privacy architecture proposes keeping both) | §7.7 "Preserve qualifying private participation credit" |
| `prop.merge.comments-preserved` | Comments(B) after merge = comments(A) + comments(B); parameterised, because "where reasonable" and the fate of answers, "Still unclear" marks and reports are PQ-25 | §7.7 |
| `prop.merge.redirect` | Every old id of a merged question redirects to the survivor, including chained merges | §7.7 |
| `prop.upvote.idempotent` | Upvoting twice adds one to the total and one to the counter. No withdrawal path is assumed (PQ-20) | §7.7, §7.9 |
| `prop.counter.only-qualifying` | Random action sequences (ask, comment, upvote, view, report, follow, open card, "Still unclear", survey) change counters **only** for ask, comment and upvote | §7.9 |
| `prop.level.three-levels` | For any counts and valid published thresholds, the level is one of exactly No Record, Contributor, Sustained Contributor; the §7.9 recommended defaults give the expected level | §7.9 |
| `prop.level.no-received-upvotes` | Changing upvotes *received* never changes a level | §7.9 |
| `prop.threshold.no-disadvantage` | After participation starts, any threshold change that would lower any student's level is rejected; the published version is kept (feeds T-35) | §7.9 |
| `prop.suppression` | For random level distributions and N, no released aggregate lets one student's level be derived by differencing (feeds T-26) | §7.16, Q16 |

Hide/delete and credit: no test asserts either way until the owner answers PQ-19.

**Feature tests with privacy weight** (L4/L5)

| Test | Assertion | Source |
|---|---|---|
| `survey.separate-store` | Answers are written by a role that cannot read identity or participation; participation tables are unchanged after a submission | §7.12 |
| `survey.before-sharing` | The survey is shown before the share step and stays available if the student declines to share (whether it is required or skippable is PQ-32) | §7.12 |
| `survey.instructor-aggregate-only` | The instructor sees aggregate counts and anonymous text only; text withheld below the minimum (parameterised on Q16) | §7.12 |
| `survey.verbatim-questions` | The three questions equal the §7.12 text exactly (fixture copied from CONTRIBUTING) | §7.12 |
| `share.only-level`, `share.student-alone`, `share.revoke-until-final` | Verbatim §7.10 text before confirmation; the instructor receives only name, verified level, date shared; no staff or admin route can create, change or revoke a share; revoke refused after export/apply with the explanation (window: Q18) | §7.10 |
| `card.create-edit-preview-publish`, `card.states`, `card.versioning` | Full card lifecycle; states draft, published, archived, superseded; earlier versions retrievable as students saw them; a published-rule change requires what, why, effective date, applies-to-underway | §7.3, §7.4, §7.6 |
| `card.permitted-requires-fields` | If AI is permitted, permitted uses, prohibited uses and disclosure expectations are required | §7.3 |
| `card.override-visible` | Where an assignment card differs from the course card, the student view marks it visibly (field mapping: PQ-62) | §7.4 |
| `card.verbatim-defaults` | The §7.3 default principle and §7.4 default statement equal the spec text | §7.3, §7.4 |
| `tags.two-only`, `tags.recategorize` | The tag type admits only Course and Specific Assignment (DB constraint and API validation); filters are All / Course / one assignment; staff can move a question between the two | §7.2, §7.7 |
| `prohibited.absent` | Dependency and route lists hold no known AI-detection, sentiment or scoring package or endpoint (a deny-list catches only known names, so it supports review) | §3 |
| `notify.content-free` | Covered by T-28; in-app notifications are compute-on-read and store no question id per user | §7.13, C-17 |
| `a11y.axe-pages` | axe on every crawled page for every role. If Q15 = WCAG 2.2 AA (the proposal), tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`; report-only until Q15 is answered. Passing axe is never presented as conformance | §8, Q15 |
| `auth.*` | Sign-in per role; cookie flags (HttpOnly, Secure, SameSite, `__Host-` prefix per ADR 0004); session id rotates on sign-in; sign-out invalidates; forged session gives a generic error; the one-time-code field accepts a pasted whole code and allows autofill (WCAG 2.2 SC 3.3.8) | §10, ADR 0004 |
| `provision.*` | Course creation by a vetted instructor; join link or code is hashed, expiring and revocable; TA invite is single-use and grants nothing until permissions are assigned; role change takes effect; no cross-course leak. LTI 1.3 tests (saLTIre, Moodle in Docker) only once Q5 picks LTI | §10, Q5, PQ-46 |

### 6.6 Role × endpoint authorization matrix

OWASP: "Permission should be validated correctly on every request". The matrix makes it impossible
to forget an endpoint.

1. **Route inventory (generated).** A script lists every Route Handler (`app/**/route.ts` and each
   exported HTTP method), every Server Action and every page route, by globbing at build time.
   Whether Next.js offers a supported manifest to read instead is **Unverified**.
2. **Policy table (hand-written, reviewed).** A typed file lists, for each route and method, the
   roles allowed and the TA permission required. **Default deny.**
3. **`authz.policy-complete`.** The inventory equals the policy table's keys. A new route without a
   policy entry fails CI; a stale entry without a route also fails.
4. **`authz.matrix`.** For every (route, method, role) cell, call it with a valid request from a
   per-route fixture; expect success where allowed and a uniform denial where not; run the canary
   scanner on every response, allowed or not (T-09).
5. **Cross-course cells.** Each role is tried against an object of a course where it has no role
   (T-10).
6. **Function whitelist.** The same idea at the database level: the EXECUTE set per role equals the
   reviewed whitelist (T-08); any new function needs an ADR note and a whitelist entry (C-22).

Roles in the matrix: student, second student, instructor, each TA permission combination (PQ-67),
other-course instructor and TA, institutional admin, unauthenticated, and the operator only where it
is testable (PQ-65). Service-to-service APIs join the matrix if the design moves to separate stores
(6.12).

### 6.7 Every §10 acceptance criterion mapped to named tests

§9: "Every acceptance criterion in §10 should have at least one automated test that demonstrates
it." §10 is labelled *production* criteria; the milestone column (from the plan skeleton) says when
each row first applies, as a proposal.

| # | §10 criterion `[src p.19]` | Named automated tests (proposal) | Parameterised or blocked by | First milestone |
|---|---|---|---|---|
| 1 | Institutional users can sign in securely | `auth.*` (sign-in per role, cookie flags, rotation, sign-out, forged-session error, one-time-code paste and autofill); T-10; T-24 | Q4 (ADR 0004), PQ-47, PQ-48 | M1a (prototype sign-in); production SSO later |
| 2 | Courses and roles can be provisioned through supported integrations | `provision.*` (manual course creation, join code, TA invite, role change, no cross-course leak); `authz.matrix` cross-course cells; LTI tests only if Q5 picks LTI | Q5, PQ-46, PQ-50 | M1a (manual); M4 (LTI) |
| 3 | Instructors can create, edit, preview, publish and version course and assignment cards | `card.create-edit-preview-publish`; `card.states`; `card.versioning`; `card.permitted-requires-fields`; `card.verbatim-defaults` | Q10 (wizard recommendations only) | M1a |
| 4 | Students can clearly distinguish course rules from assignment overrides | `card.override-visible`; `a11y.axe-pages` on the card view; "not by colour alone" is a manual check | Q15, PQ-62 | M1a |
| 5 | Questions use only Course or Specific Assignment categorization | `tags.two-only`; `tags.recategorize` | none | M1b |
| 6 | Students can ask, comment and upvote anonymously | `board.ask-comment-upvote` (E2E); T-01; T-02; T-09; T-14; T-17; T-18; T-19; T-22 | Q9 (ADR 0003), PQ-66 | M1b |
| 7 | Instructors and TAs can moderate without accessing identities | T-09 (every TA permission combination); `neg.api.report-queue-identity-free`; `neg.log.audit-identity-free`; `neg.api.rate-limit-no-reveal`; T-14 (moderation queue) | PQ-67, Q14, Q20, PQ-27 | M1b |
| 8 | Duplicate merging preserves counts correctly | T-11; `prop.merge.union`; `prop.merge.credit-preserved`; `prop.merge.comments-preserved`; `prop.merge.redirect` | PQ-20, PQ-25, PQ-08 | M1b if PQ-08 puts merge in milestone 1 |
| 9 | Presentation mode reveals no private data | T-14 (`present.exclusions`, each "Exclude" item seeded with its own canary; snapshot behaviour) | PQ-35, PQ-17 | M1b |
| 10 | Participation uses only question, comment and upvote counts | `prop.counter.only-qualifying`; `prop.level.no-received-upvotes`; T-27 (survey earns no credit) | PQ-19 | M1b |
| 11 | Exactly three levels are supported | `prop.level.three-levels`; T-35 (three-member level enum) | PQ-33 | M1b |
| 12 | Students alone decide whether to share their level | T-36; `share.student-alone`; `share.revoke-until-final`; T-26 (no level inferable from aggregates) | Q18, PQ-34 | M2 |
| 13 | Instructors receive no underlying participation activity | T-16; T-26; `authz.matrix` (no counter route reachable by staff); T-28 (no level in email) | Q12, Q16, PQ-31, PQ-40 | M2 (private view from M1b) |
| 14 | The exit survey is anonymous and technically separate | T-27; T-02 (survey columns); `survey.separate-store`; `survey.instructor-aggregate-only`; `survey.verbatim-questions`; T-16 (survey export) | Q16, PQ-32, PQ-36 | M2 |
| 15 | No AI detection or automated student judgment exists | `prohibited.absent`; `prop.level.*` (level depends only on the three counts and thresholds); code-review checklist item (manual) | none | M0 (gate from the first commit) |

### 6.8 The five §9 channels: coverage summary

| §9 channel | Tests |
|---|---|
| UI | T-14, T-15, T-26 (rendered analytics), `a11y.axe-pages` crawl reused by the scanner |
| API | T-01, T-08 to T-13, T-21 to T-23, `authz.policy-complete`, `authz.matrix`, `neg.api.*` |
| Exports | T-16, T-20 (dumps, if PQ-14 counts them as exports), T-27 |
| Logs | T-07, T-17, T-25, T-28, T-33, `neg.log.*`; platform logs only if PQ-70 adds preview runs |
| Predictable identifiers | T-02, T-18, T-19, T-20, T-21, T-32 |

### 6.9 CI design within GitHub Actions Free

**Account settings (proposal).** Keep **no payment method** on the account, so usage is blocked, not
billed, at the 2,000-minute quota. Whether a $0 budget alone blocks or only alerts is **Unverified**
(the billing page says only that spending "may be limited by one or more budgets", with alerts at
90% and 100%). Use **standard runners only**: larger runners are always charged.

**Pins.** One Node line in CI, locally (`.nvmrc` plus `engines`) and on the host, inside **22.13+,
any 24.x, or >= 26**. Postgres service image pinned to the **hosted major version**, read at
scaffold time (ADR 0002 spike 4); a mismatch can give false-green RLS tests. ESLint: either ESLint 9
with eslint-plugin-jsx-a11y, or ESLint 10 with Biome's a11y rules (jsx-a11y 6.10.2 does not support
ESLint 10); the axe gate is unaffected.

**Workflow shape (illustrative).** Minute figures are estimates, not measurements (**Unverified**);
measure them in M0.

| Job | Trigger | Contents | Est. minutes |
|---|---|---|---|
| `check` | Every push | Install with cache; `tsc`; ESLint; dependency-cruiser; Vitest L1/L2 | ≈ 3 |
| `db-api` | Every push | Postgres service (`pg_isready` health check); migrations as a migration role; L3 catalogue and behavioural tests (T-01 to T-06, T-08, T-12, T-13, T-18 to T-24; T-07 against the container's settings); `next build` + `next start`; L4 matrix; L6 log scan including the forced-error run | ≈ 6 |
| `e2e` | Every PR | Playwright, Chromium only; scanner on DOM, network and traces; axe (report-only until Q15) | ≈ 8 |
| `nightly` | Schedule | Full crawl for all roles; long fast-check runs; the break-it set | ≈ 20 |
| `mutation` | Weekly or manual | Stryker on privacy modules, incremental mode | ≈ 30–60 |
| `selfcheck` | Daily, if PQ-70 allows | Read-only catalogue assertions and `roles.prod-role-inventory` against the hosted database; T-07 and T-30 run here because they need the live project. C-22 also proposes an in-database `jobs.privacy_selfcheck`; one of the two may be enough | ≈ 1 |

**Rough budget:** 40 PR pushes × ≈ 17 = ≈ 680; nightly 30 × 20 = 600; weekly mutation 4 × 60 = 240;
≈ 1,520 of 2,000 before the daily self-check and ADR 0002's nightly dump job, which share the same
quota. **Levers:** `concurrency` groups that cancel superseded runs; path filters so docs-only
changes skip DB and E2E; e2e only when a PR is ready; nightly to weekly. A public repository makes
minutes free (PQ-68).

**Artefacts and logs.** Upload Playwright traces, screenshots and videos **only on failure**, with a
short per-artifact retention (value: PQ-70); the 500 MB quota fills quickly. Shorten the repository
retention for workflow logs too, since scanner output and anything printed to logs persist for 90
days by default. The scanner prints artefact names and canary pairs, never text (6.2).

**Secrets in CI.** Test jobs use throwaway credentials for the service container only. The
self-check, if approved, uses a dedicated read-only role whose rights are themselves asserted by
T-01; which credential may run it is PQ-70. AI coding agents' access to secrets and logs is PQ-16.

### 6.10 Mutation testing and architecture fitness

**Stryker scope.** `mutate` lists only the files whose failure breaks §6: authorization policy and
guard, DTO mappers for staff-visible responses, export builders, the log redaction layer, counter and
level logic, merge logic, the id generator wrapper and the linkage module. A surviving mutant there
is treated as a missing negative test. Stryker's `thresholds.break` stays unset unless the owner sets
a score (PQ-69), so it reports but never fails CI. **Precondition:** an M0 spike showing the Vitest
runner works with Vitest 5 (the runner predates Vitest 5; Vitest 5 changed defaults such as
`clearMocks`). If it fails, mutation testing waits for a compatible runner; nothing else depends on
it.

**dependency-cruiser rules (sketch, not tested config).** Folder names follow ADR 0001's proposed
`server/domains/<domain>/` layout.

| Rule | From | Must not import |
|---|---|---|
| `content-not-to-identity` | `server/domains/content` | `server/domains/(identity\|participation\|survey)` |
| `identity-not-to-content` | `server/domains/identity` | `server/domains/(content\|survey)` |
| `survey-isolated` | `server/domains/survey` | `server/domains/(identity\|participation\|content)` |
| `linkage-credential` | anything except the linkage module | the `cc_link` pool module (T-22) |
| `ui-only-via-dto` | `app/` | any domain's database or repository module |
| `no-logger-in-content` | modules handling content text | the app logger, except the redacting wrapper (proposal) |

eslint-plugin-boundaries may mirror these for editor feedback; dependency-cruiser stays the single
source of truth.

### 6.11 Order of work by milestone

| Milestone (plan skeleton) | Tests that land (proposal) |
|---|---|
| M0 | Spikes T-21, T-24, T-31, T-33 and the Stryker/Vitest 5 check; the scanner and canary seeding helper; catalogue suite T-01 to T-08 and the break-it set against the empty schema (they pass trivially, then guard every migration); T-18, T-19; dependency-cruiser rules; `prohibited.absent`; CI skeleton with pins; axe in report-only mode |
| M1a | `authz.policy-complete` and `authz.matrix` with the first route; `auth.*`; `provision.*` (manual); `card.*`; T-10; T-30 and the daily self-check against the prototype database (if PQ-70 allows); a11y gate once Q15 is answered |
| M1b | T-09, T-11 to T-15, T-17, T-20, T-22, T-23, T-29, T-32, T-35; `prop.merge.*`, `prop.counter.*`, `prop.level.*`; `tags.*`; `neg.api.*`; first scheduled Stryker run. **No board code before ADR 0003 is accepted and the threat model exists (§6.3)** |
| M2 | T-16, T-26, T-27, T-28, T-36; `share.*`, `survey.*`; `prop.suppression` |
| M3, M4 | Self-check against pilot and production databases; preview-environment runs (if PQ-70 allows); LTI tests (if Q5 picks LTI); T-25 only if PQ-12 approves a tool; any external review (PQ-69) |

### 6.12 If the privacy design moves to separate databases

The privacy architecture (6.11 step 4, 6.16) names separate databases or services (family B) as a
possible production step, if PQ-10 or a UW review requires it. Most tests check observable
behaviour, so they carry over. What changes:

| Test family | A+ (one Postgres, roles, RLS, definers) | Separate databases or services |
|---|---|---|
| T-01, T-05, T-06, T-12 (roles) | Connect as `cc_web` and expect 42501; catalogue checks | **Credential-scope tests**: the content service's credentials cannot connect to the identity database at all; each deployment's secret set equals an inventory (PQ-13) |
| T-03 (cross-domain views) | System-catalogue query over all views | Trivially true across databases; test instead that no ETL job, replica or analytics sink combines them |
| T-02 (columns) | One scan of anonymous schemas | The same scan per database |
| T-22 and dependency-cruiser | One codebase, several pools | Still needed in a monorepo; also check deploy manifests give each service only its own secrets |
| T-09, T-14 to T-17 (channels) | Unchanged | Unchanged, plus internal service-to-service APIs join the matrix (6.6) |
| T-21, T-32 (`xmin`) | Needed: one transaction can link rows | Replaced by event-pipeline tests: the counter event carries no content id and no timestamp finer than agreed (value open) |
| T-11 and `prop.merge.*` | Against definer functions | Against the service API; same invariants |
| T-20 (dumps) | One dump with all schemas | Per-database dumps; dump-diff across them |

CI cost rises: one service container per database, or one server with several databases (whether
the latter is a faithful test is an interpretation to check then). The canary scanner and the §10
map do not change.

### 6.13 Trade-offs

| Choice | Gain | Cost |
|---|---|---|
| Real Postgres everywhere | Tests the mechanism the privacy design depends on | Docker locally; ≈ 6 CI minutes per push (estimate) |
| Plain SQL over pgTAP | No custom image; same SQL for the production self-check | Hand-written assertions |
| Strict scanner by default | Catches more leaks | Some legitimate student views may need an allow-list entry (PQ-66) |
| Weekly, non-blocking Stryker | Fits the minute budget | Weak tests found days later, not per PR |
| GitHub Actions Free, no payment method | CI can never bill | A spent quota blocks CI until the month resets |
| Tests in M0 before features | Every migration is guarded from the first one | M0 takes longer before visible progress |

## 7. Privacy implications (§6)

**What the suite proves (§6).** §6.1 separation: T-01 to T-06, T-22, dependency-cruiser.
§6.2 "ordinary application queries must not be able to join": T-01, T-03, T-05, T-08, T-12, T-13,
T-21, T-23. §6.2 opaque identifiers: T-18 to T-20. §6.2 no co-occurrence in logs, analytics events,
error reports, views, exports and dashboards: the scanner (T-09, T-14, T-16, T-17, T-25), T-03.
§6.3 de-duplication and crediting without a usable mapping: T-11, `prop.*`. §6.4 "Default: nobody
can deanonymize": `neg.deanon.absent`, T-34, and the admin role in every staff test (PQ-65).

**What it cannot prove** (state in the threat model, Q8): that the deployed code is the reviewed
code; that vendor logs (host, database, email) hold only their documented fields; that the operator
does not misuse the keys or database access (PQ-10). Host request logs are tested only if the suite
also runs against a preview deployment (PQ-70). Mode S's content/counter `xmin` equality is a
limitation that T-32 *demonstrates* rather than prevents (PQ-30).

**The suite as a privacy risk.** Synthetic data only; the oracle stays in memory; artefacts are
scanned, uploaded only on failure and kept briefly; no test role reaches production (6.2). A public
repository (PQ-68) would make CI logs public; with synthetic data that exposes nothing personal, but
it does publish the test fixtures (interpretation).

## 8. Risks

| Risk | Likelihood / impact | Mitigation (proposal) |
|---|---|---|
| CI Postgres major differs from the host's | Medium / High (false-green RLS and UUID tests) | Read the host version in M0 and pin the image; regex UUID check on older majors |
| PGlite or a mock used for a role-dependent test | Low / High | Rule: role tests only on a real server; review checklist item |
| A route ships without a policy entry | Medium / High | `authz.policy-complete` fails CI |
| A negative test passes vacuously (empty pages, no canaries seeded) | Medium / High | Each test first asserts the canary *is* present where it legitimately should be (for example, the student's own view), then that the pair is absent elsewhere; break-it set; Stryker |
| Leak through an encoding or header the scanner misses | Medium / High | Scan encoded forms, headers, RSC payloads and traces |
| Canary output persists in CI logs or artifacts | High / Low (synthetic data) | Upload on failure only; short retention (PQ-70); scanner prints no text |
| Stryker incompatible with Vitest 5 | Medium / Low | M0 spike; mutation testing is not a gate |
| Free minutes run out | Medium / Medium (CI blocked) | Concurrency cancel, path filters, nightly to weekly, or a public repo (PQ-68) |
| Hosted logging settings cannot be read or set (T-07) | Medium / Medium | M0 spike T-33; document as a limitation if not assertable |
| Next.js route discovery misses Server Actions | Medium / High | Glob-based inventory plus a test that every exported action appears; re-check for a supported manifest (**Unverified**) |
| Fresh tool releases (dependency-cruiser published on the check date; frequent Next.js advisories) | Medium / Medium | Pin versions; Dependabot; re-run the full suite on each bump |
| Tests treated as proof of anonymity | Medium / High | The threat model lists what tests cannot prove (section 7) |

## 9. Open questions

None is answered here.

### 9.1 Existing CONTRIBUTING §13 questions

Q2, Q3, Q4, Q5, Q7, Q8, Q9, Q12 to Q18 and Q20 affect this file as listed in section 2.

### 9.2 New questions owned by this file

| ID | Question | When |
|---|---|---|
| PQ-65 | Must the mandatory negative tests also cover institutional admins and the operator? (§9 names only instructors and TAs) [PNQ-T1] | M0 |
| PQ-66 | How strict is the canary scanner: any identity canary next to any content canary, or only a student next to their own content? [PNQ-T2] | M0 |
| PQ-67 | What is the exact list of TA permissions an instructor can assign? (§5 gives only examples) [PNQ-T3] | M1a |
| PQ-68 | Private or public GitHub repository? (Affects free CI minutes and runner size.) [PNQ-T6] | M0 |
| PQ-69 | Is an external security/privacy/accessibility review wanted before production? Is there any required coverage or mutation-score threshold? [PNQ-T7, PNQ-T8] | Pilot / M0 |
| PQ-70 | Should the negative suite also run against deployed previews (synthetic data)? How long are CI artefacts with canaries kept? Is a read-only post-deploy catalogue self-check against production acceptable, and with which credentials? [PNQ-T9, PNQ-T10, PNQ-T11] | M1a |

### 9.3 Other questions the tests depend on

| ID | Dependency |
|---|---|
| PQ-10, PQ-13 | Operator coverage; credential-scope tests if domains get separate deployments |
| PQ-11, PQ-12 | Whether IP is an identity canary; T-25 |
| PQ-14, PQ-15, PQ-16 | Dumps as exports (T-20); synthetic previews; agent access to CI secrets and logs |
| PQ-19, PQ-20, PQ-21, PQ-22 | Credit after hide/delete; double upvoter after merge; auto-follow (T-29); "you asked this" in the scanner |
| PQ-24, PQ-25, PQ-27, PQ-28 | Timestamp buckets (T-02); merge rules [PNQ-T5]; staff identity in the moderation log; POST-response rendering (T-18) |
| PQ-29 | TA-and-student fixture in the matrix |
| PQ-30, PQ-31, PQ-33 | Mode S/B in T-32; level-count rule shape in T-26; "disadvantage" in T-35 |
| PQ-32, PQ-34, PQ-35, PQ-36 | Survey timing, duplicate prevention and metadata [PNQ-T4] (T-27); sharing freeze (T-36); presentation snapshots (T-14); N per output |
| PQ-43, PQ-47, PQ-48, PQ-54 | Seen marker; "sign in securely"; session fields (T-24); account removal and tombstones |

## 10. Sources and verification log

Internal sources: [ADR 0003](../decisions/0003-privacy-mechanism.md) and the
[privacy architecture](privacy-architecture.md) (controls C-01 to C-22, test IDs T-01 to T-36 from
the privacy judge), the testing research note (branch T1) and the final fact-check, both kept
outside the repository.

| Claim | URL | Checked | Status |
|---|---|---|---|
| GitHub Free private repos: 2,000 min/month, 500 MB artifacts (shared with Packages), 10 GB cache; overage $0.006/min (Linux 2-core); blocked at quota with no payment method; larger runners always charged | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 2026-10-11 | Verified |
| Whether a $0 budget blocks or only alerts | same | 2026-10-11 | **Unverified** (page silent) |
| 20 concurrent jobs, 6 h per job, 35 days per run; 500 MB artifacts on Free, not raisable by Support | https://docs.github.com/en/actions/reference/limits | 2026-10-11 | Verified |
| Private `ubuntu-latest` 2 CPU / 8 GB / 14 GB, public 4 / 16 / 14; Ubuntu 24.04 | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | 2026-10-11 | Verified |
| Service containers need an Ubuntu runner; `pg_isready` health check | https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers | 2026-10-11 | Verified |
| Artifacts and logs kept 90 days by default; private 1–400, public 1–90; per-artifact setting | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository | 2026-10-11 | Verified |
| Vitest 5.0 on 2026-09-03; 5.0.3 latest; Node `^22.12.0 \|\| ^24 \|\| >=26`; Vite >= 6.4; `clearMocks` default true | https://vitest.dev/blog/vitest-5 ; https://registry.npmjs.org/vitest | 2026-10-11 | Verified |
| Vitest does not support async Server Components; use E2E (doc 16.4.0) | https://nextjs.org/docs/app/guides/testing/vitest | 2026-10-11 | Verified |
| Playwright 1.64.0 published 2026-10-07 | https://playwright.dev/docs/release-notes ; https://registry.npmjs.org/playwright | 2026-10-11 | Verified |
| Automated testing "cannot detect all types of WCAG violations"; `AxeBuilder.withTags()` | https://playwright.dev/docs/accessibility-testing | 2026-10-11 | Verified |
| axe tags `wcag2a` … `wcag22aa`, no `wcag22a`, not cumulative | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | 2026-10-11 | Verified |
| @axe-core/playwright 4.13.0; axe-core 4.14.0; MPL-2.0 | https://registry.npmjs.org/@axe-core/playwright/latest ; https://registry.npmjs.org/axe-core/latest | 2026-10-11 | Verified |
| WCAG 2.2 SC 3.3.8: paste and autofill for codes; F109 | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | 2026-10-11 | Verified |
| Testcontainers Postgres 12.2.0; snapshot/restore; do not use the `postgres` database name; disconnect first | https://node.testcontainers.org/modules/postgresql/ ; https://registry.npmjs.org/@testcontainers/postgresql/latest | 2026-10-11 | Verified |
| PGlite 0.5.8; single exclusive connection | https://pglite.dev/docs/ ; https://registry.npmjs.org/@electric-sql/pglite/latest | 2026-10-11 | Verified |
| PGlite behaves like a server for roles, GRANT, `SET ROLE`, RLS | https://pglite.dev/docs/about | 2026-10-11 | **Unverified** (not stated) |
| pgTAP 1.3.4 functions; not in official `postgres:18` image; `postgresql-18-pgtap` 1.3.4 in PGDG | https://pgtap.org/documentation.html ; https://github.com/docker-library/postgres/blob/master/18/trixie/Dockerfile | 2026-10-11 | Verified (function signatures not all read) |
| Supabase pgTAP support; `supabase test db` CI example | https://supabase.com/docs/guides/database/extensions/pgtap ; https://supabase.com/docs/guides/local-development/testing/overview | 2026-10-11 | Verified |
| fast-check 4.10.2; any runner; `fc.commands`, `asyncModelRun`, `scheduledModelRun`, `replayPath` | https://fast-check.dev/docs/advanced/model-based-testing/ ; https://registry.npmjs.org/fast-check | 2026-10-11 | Verified |
| Stryker vitest-runner 10.0.0 (2026-08-14); Node >= 22; browser mode unsupported; `perTest`; `mutate` globs; `thresholds.break` null by default | https://stryker-mutator.io/docs/stryker-js/vitest-runner/ ; https://stryker-mutator.io/docs/stryker-js/configuration/ | 2026-10-11 | Verified |
| Stryker works with Vitest 5 | same | 2026-10-11 | **Unverified** (spike) |
| dependency-cruiser 18.6.0 (2026-10-11); Node `^22 \|\| ^24 \|\| >=26`; `forbidden` rules | https://registry.npmjs.org/dependency-cruiser ; https://github.com/sverweij/dependency-cruiser | 2026-10-11 | Verified |
| Node intersection 22.13+ / 24.x / >= 26 (ESLint 10.12.0 `^20.19 \|\| ^22.13 \|\| >=24`) | https://registry.npmjs.org/eslint/latest | 2026-10-11 | Verified; LTS status **Unverified** |
| eslint-plugin-boundaries 7.2.0; ESLint 10 support | https://registry.npmjs.org/eslint-plugin-boundaries | 2026-10-11 | Version verified; ESLint 10 **Unverified** |
| jsx-a11y does not support ESLint 10 (issue #1075 open) | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075 | 2026-10-11 | Verified |
| Postgres 18: `uuidv7` timestamp; `uuid_extract_timestamp`, `uuid_extract_version` | https://www.postgresql.org/docs/current/functions-uuid.html | 2026-10-11 | Verified |
| UUIDs "MUST NOT be used as security capabilities" | https://www.rfc-editor.org/rfc/rfc9562.html | 2026-10-11 | Verified |
| Privilege functions; commit timestamps need `track_commit_timestamp`, removed by vacuum | https://www.postgresql.org/docs/current/functions-info.html | 2026-10-11 | Verified |
| `view_table_usage` lists only tables owned by an enabled role | https://www.postgresql.org/docs/current/infoschema-view-table-usage.html | 2026-10-11 | Verified; the `pg_depend`/`pg_rewrite` remedy is inference |
| Failing statement text logged by default; bind values not | https://www.postgresql.org/docs/current/runtime-config-logging.html | 2026-10-11 | Verified; hosted defaults **Unverified** |
| OWASP: deny by default; validate every request; tests catch low-hanging fruit | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | 2026-10-11 | Verified |
| Hosted Postgres major; readable logging settings on the host | n/a | 2026-10-11 | **Unverified** (ADR 0002 spike) |
| A supported Next.js route manifest | n/a | 2026-10-11 | **Unverified** |
| Jest and `node:test` status | n/a | 2026-10-11 | **Unverified** (not researched) |
| CI minute estimates (6.9) | n/a | 2026-10-11 | **Unverified** (estimates; measure in M0) |
| `pg_stat_xact_user_tables` suits T-13; exact T-03 catalogue query | n/a | 2026-10-11 | **Unverified** |
