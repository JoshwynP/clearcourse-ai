# Privacy architecture: keeping anonymous content and identity unjoinable (Q9)

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: **Q9** (primary), Q8, Q13, Q14, Q16, Q17, Q18, Q20, and the proposed questions PQ-10,
> PQ-11, PQ-12, PQ-13, PQ-19 to PQ-24, PQ-30, PQ-31, PQ-33 and others listed in section 9.
> Decision record: [ADR 0003](../decisions/0003-privacy-mechanism.md) (status Proposed).

## Contents

1. Summary and recommendation
2. Questions covered and what they block
3. Options considered
4. Evidence
5. Comparison
6. Recommendation (proposal) with trade-offs
7. Privacy implications (§6): threat-model outline and limitations of anonymity
8. Risks
9. Open questions
10. Sources and verification log

---

## 1. Summary and recommendation

**The problem.** §6.3 says some requirements force the system to know, somewhere, that an action
belongs to a student: upvotes are combined "without double-counting a student" (§7.7) and counters
must credit the right student (§6.3). Yet ordinary application queries, instructors, TAs and admins
must never get a usable student-to-content mapping (§5, §6.2, §9). Q9 asks for the exact mechanism.

**What was studied.** Three genuinely different families were designed independently, then attacked
by a red team and scored by a judge:

- **A, database-enforced:** one PostgreSQL database, a schema per §6.1 domain, locked tables
  reachable only through `SECURITY DEFINER` functions, keyed pseudonyms and per-item keyed tags.
- **B, physically separated:** about eight stores and eight or nine services, a gateway, a linkage
  service holding the key, and a delayed, batched credit queue.
- **C, cryptographic / user-held:** blind-signed, client-held per-course pseudonyms, so that even the
  server's stored data cannot link; plus a blind-token exit survey.

**Proposal (owner approval needed; Q9 stays open): "A+".** A's single-Postgres core with the red
team's fixes, plus the best ideas from B and C. In short:

- No content row stores an author, pseudonym, tag, session, IP or user agent (pillar P1).
- Private counters are keyed by `pid = HMAC(K_pid, user_id)`; upvote, follow, "Still unclear" and
  report de-duplication uses per-item keyed tags, which cannot be linked across items without the key.
- A random per-course key `K_c` is stored only wrapped under a KEK held in the host secret store.
  **All HMACs are computed in a server-only "linkage module"** with its own database role
  (`cc_link`), so key material never enters SQL.
- **No runtime role has SELECT on any base table** in the anonymous-content or identity schemas.
  Reads go through definer functions with explicit column lists; writes go through a whitelist.
- Level counts, survey results and presentation-mode counts are **frozen snapshots**, never live.
- Merge re-keys tags by recomputing them over the course roster inside one transaction.
- **Synchronous crediting (Mode S)** in the prototype, with a daily-batch mode as a no-migration
  upgrade; in-app notifications computed on read; one generic, content-free daily email digest;
  survey text revealed only after the survey closes; UUIDv4 only; crypto-shredding at end of term
  offered as a Q17 option.

**Why.** On the judge's weighted scoring (section 5) A+ scores 83.5/100 against 74.5 for A as
written, 67.0 for full B, 66.5 for B-lite, 65.0 for C's own hybrid and 53.5 for C1. It meets every
required-tier property the red team could attack, and most of its §9 proofs are Postgres catalogue
assertions that run in CI. B mainly adds protection against the operator, which the spec does not
require, at roughly twice the build cost. C's recommended hybrid stores an author pseudonym on every
content row, which makes all past authorship recoverable by any key holder.

**Main condition.** The operator (the owner, later possibly UW IT) and the hosting, database, auth
and email vendors stay **inside** the trust boundary. That is a documented limitation, not a
protection. If the owner answers **PQ-10** with "the operator must not be able to link", the
recommendation moves toward B's topology for production (section 6.16).

**Before ADR 0003 can be accepted** the owner must answer PQ-10 and the integrity forks PQ-19 to
PQ-24, PQ-30 and PQ-33, and four short spikes must run (system-column visibility, auth-session
fields, merge timing, pooler logging). The privacy core is estimated at about 18–25 sessions
(unmeasured).

## 2. Questions covered and what they block

| Question | What this file contributes | Blocks |
|---|---|---|
| **Q9** mechanism (§6.3) | The comparison and the A+ proposal | All content and participation code (§6.3): the M1b board, counters, merge, sharing, survey, analytics |
| Q8 threat model | Outline and the full limitations-of-anonymity list (section 7) | §6.3 says the threat model must exist before content code |
| Q13, Q16, Q17, Q18, Q20 | How the mechanism depends on each; no values chosen | The dependent features (section 9) |
| PQ-10 operator trust boundary | Why it is the one answer that could flip the recommendation | ADR 0003 |
| PQ-19 to PQ-24, PQ-30, PQ-33 | The integrity forks that follow from storing no author link | ADR 0003 |

**Scope split used throughout** (from §3, §5, §6.2, §9, §10):

| Tier | Actors and channels |
|---|---|
| **Required** | Ordinary application queries; instructors; TAs; institutional admins (no *routine* linking, §5); application logs, analytics events, error reports; database views; exports; admin dashboards; predictable identifiers; UI and API. Also (interpretation) learning a non-sharer's level, because §10 says "Students alone decide whether to share" and "Instructors receive no underlying participation activity" |
| **Stronger than required** | The platform operator (database console, deploys, host secrets); host, database, auth and email vendors; holders of dumps, backups or WAL; app-server compromise; legal compulsion. Not required, but every gap must appear in the documented limitations (§6.2, §11) |

"Ordinary application query" is read strictly (interpretation, shared by the red team and the
judge): anything a runtime database credential can SELECT, **including Postgres system columns such
as `xmin`**, because a later developer, or Claude, could write that query without touching a
privileged path.

---

## 3. Options considered

| Option | Family | What it is |
|---|---|---|
| **A** | A, database-enforced | One Postgres; schema per §6.1 domain; NOLOGIN owner roles; locked tables behind `SECURITY DEFINER` functions; `pid` + per-item tags under a wrapped per-course key; KEK passed per call (A's variant K3); synchronous crediting (Mode S) or client credit tokens (Mode D) |
| **A+** | A with grafts | A plus the red team's fixes and ideas from B and C (section 6) |
| **B-full** | B, separated | About 8 stores and 8–9 services (Cloudflare Workers + one D1 per store, or one Neon project per store); stateless gateway; linkage service holds the root key; signed receipts and a delayed, batched credit queue |
| **B-lite** | B, reduced | B's own fallback: 5 domain stores, 4 services (linkage + participation merged into a "Vault"; identity + shared results + notifications in the gateway) |
| **C-H1** | C, hybrid | C's own recommendation: server HMAC pseudonym **stored on content rows**, blind-token survey, two cookie-separated origins |
| **C1** | C, cryptographic | Blind-signed, client-held per-course pseudonym (RFC 9474); C itself rejects it for the prototype |
| C2, C3 | C | Per-question nullifiers (Semaphore-style; breaks merges) and BBS anonymous credentials (drafts only, not buildable now). Not scored |

Rejected outright before scoring: Cloudflare D1 for A (SQLite has no Postgres schemas or row-level
security, the §12 known issue); an unkeyed "one-way hash" of the user id (section 4.5).

---

## 4. Evidence

Summaries of the raw design notes, the red-team critique and the judge's report (kept outside the
repo). External facts carry their URL and check date; the full list is in section 10.

### 4.1 Family A: database-enforced, single Postgres

**Mechanism.** All five §6.1 domains share one Postgres database, a schema each. Questions and
comments have **no author column at all**. Per-student state (counters, and "this student already
upvoted / follows / reported / marked unclear this item") lives in locked schemas the web role
`cc_web` cannot read. Counters are keyed by a keyed pseudonym `pid`; de-duplication facts are
per-item keyed tags such as `HMAC(K_c, "up" ‖ user_id ‖ question_id)`, unlinkable across items
without the per-course key `K_c`, which is stored wrapped. Only `SECURITY DEFINER` functions, each
owned by its own NOLOGIN role, touch locked data; the caller passes a session secret, not a user
id. Crediting is synchronous in the posting transaction (**Mode S**) or via a one-time client
credit token redeemed later (**Mode D**). The Postgres catalogue makes every lock testable.

**Central side channel.** `xmin` is "the identity (transaction ID) of the inserting transaction
for this row version", and every update creates a new row version
([PG system columns](https://www.postgresql.org/docs/current/ddl-system-columns.html), checked
2026-10-11). In Mode S the new content row and the updated counter row share one `xmin`, so whoever
can read both attributes each student's latest credited action. In A that is the operator or a
physical-copy holder, because `cc_web` cannot read counters. `track_commit_timestamp` (off by
default, server start only) would make `xmin` a commit time. WAL and backups keep commit order.

**Threat model per actor.** Holds against other students, instructors, TAs and admins (no function
exposes a mapping), with residual risks from differencing aggregates, live totals in class, small
classes and writing style. A logical dump without the KEK yields no mapping. The **operator**
(database console, deploys, KEK) can unwrap `K_c`, test the roster against all tags, read counters
per named student and, in Mode S, see the latest action per student; past question and comment
authorship is not stored, so it is not recoverable from logical data. App-server compromise yields
vote, follow and report sets plus all future posts. A states plainly that the operator is inside
the trust boundary and that a solo owner cannot have a two-person rule.

**Failure modes (selected from A's 20).** Over-broad grant on a locked schema (second lock: ENABLE +
FORCE RLS, since no policy means default deny); function EXECUTE left to PUBLIC (the default, so
revoke in the creating transaction,
[PG CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html), checked
2026-10-11); `search_path` hijack; a definer that returns too much; tables owned by a `BYPASSRLS`
role (Supabase's `postgres` by default); the Supabase Data API left on; Neon console roles in
`neon_superuser`; KEK leak; statement logging switched on while debugging, which logs bind
parameters in full
([PG logging](https://www.postgresql.org/docs/current/runtime-config-logging.html), checked
2026-10-11); restoring production into a preview; ORM pressure to grant broad SELECT; an error or
analytics SDK added later; sliding session expiry or `last_seen` columns. Estimate ≈13–17 sessions
(unmeasured).

### 4.2 Family B: physically separated stores and services

**Mechanism.** Each §6.1 domain gets its own database, reachable only by one service holding its
binding. A stateless **Gateway** (request logging off) is the only component that sees user and
body together. The Board store has no author reference and holds per-item keyed tags. The key lives
only in a **Linkage** service that never sees content. Credit flows through a queue with random
delay and batching: the Board returns a signed receipt; Participation verifies it, de-duplicates on
a random `event_id` and increments a pseudonym-keyed counter. Merges are a roster recomputation in
Linkage. Shared results, survey and audit each have their own store and service.

**Platforms.** (a) Cloudflare Workers with one D1 per store: D1 Free allows 10 databases per
account (8 stores fit one environment only), Time Travel is always on (7 days Free, 30 Paid)
([D1 limits](https://developers.cloudflare.com/d1/platform/limits/), checked 2026-10-11); Workers
Free allows 10 ms CPU per invocation and Workers Paid is a USD 5 **minimum** per month
([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), checked
2026-10-11). (b) One Neon project per store, with per-project cold starts (**Unverified**). Neither
offers a Canadian location.

**Threat model and failures.** Holds for every required actor; a single-database dump or console
holder learns one domain only. The operator with deploy access, the host vendor and a compromised
Gateway are not protected. Key failures: a second Worker given two bindings (caught only by a
binding-matrix test), logging re-enabled because new Workers have observability on by default
([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
checked 2026-10-11), lost credit when the Gateway dies before enqueueing, restoring one database
but not the others, merges exceeding Free CPU. B's candid cost: debugging with logs off, eight
migration streams, ≈29–39 sessions (unmeasured).

### 4.3 Family C: cryptographic and user-held

**Mechanism (C1).** The browser derives a per-course secret `s_c`, computes a public pseudonym key
`P_c` and obtains exactly one blind RSA signature over it from the identity side
([RFC 9474](https://www.rfc-editor.org/rfc/rfc9474.html), checked 2026-10-11). On a separate,
cookie-less board origin it registers `(P_c, σ)`; content, upvotes and counters are keyed by
`P_c`. No stored value joins "Alice got a signature" to "P_c is a member". Level sharing uses a
blind level token. **C-H1**, C's actual recommendation, uses a server HMAC pseudonym now with the
same schema and keeps C1 as an upgrade.

**Threat model and failures.** Against a passive operator and holders of stored data (dumps,
backups, DB vendor) C1 is the strongest. But **the server ships the JavaScript that holds `s_c`**,
so an active operator can exfiltrate it; C says this cannot be defended in a plain web app.
Colluding students gain: level tokens can be transferred, and re-issuance after claimed device loss
creates Sybil pseudonyms (double upvotes, undetectable). Device loss without a recovery code loses
credit. WebAuthn PRF support for Safari `get()` is **conflicting** between MDN data and WebKit's
Safari 18 post. `@cloudflare/blindrsa-ts` is 0.4.6, pre-1.0, Apache-2.0 and declares `node >=24`
([npm registry](https://registry.npmjs.org/@cloudflare/blindrsa-ts/latest), checked 2026-10-11).
C's own verdict: not C1 for the prototype (client key management "High" effort, ongoing support
burden).

### 4.4 Red-team findings

Scale: strong (survives every required actor; limitations documented) / adequate (fixable gaps) /
weak (a required actor or a common mistake breaks it) / broken.

| Design | Survivability | Serious issues |
|---|---|---|
| A | **Adequate**; strong after fixes, none needs a redesign | **S-A1** `xmin` is readable on every table `cc_web` can SELECT; transaction ids are global, so content `xmin` gives an exact event order that defeats timestamp coarsening, and any readable identity row written near an action (e.g. a sign-in upsert, which writes a new row version even when nothing changed) joins by "nearest xid". **S-A2** A's variant K3 sends the KEK as a bind parameter beside the session token and body, so any parameter-logging path records all three. **S-A3** daily reads of the level distribution, differenced against new posts, leak non-sharers' levels (§10). **S-A4** Mode D tokens are bearer tokens (shared lab computers). Minor: outbox rows link users to merged items for a dump holder (M-A1); seen-marker location unspecified (M-A2); "level reached" email date (M-A3) |
| B | **Adequate**; strong after fixes; weak if one process holds every credential | **S-B1** Board receives one viewer's whole tag set per page view: a pseudonymous profile at the service layer. **S-B2** receipts are bearer tokens. **S-B3** batching hides time but not action type; with always-on Time Travel, two databases give a pseudonym → authored-questions profile. **S-B4** Free CPU feasibility under-scoped (email sweep); pressure to merge services. **S-B5** daily histogram still attributes level changes to one day |
| C (H1) | **Weak**; the data model, not the crypto | **F-C1** (fatal to H1 as a recommendation) H1 stores `author_pseudonym` on every question, comment and report while `K_c` is online, so the operator, anyone with secrets plus a dump, or a legal order, recovers **every author retroactively** with no approval or audit, defeating §6.4 "Default: nobody can deanonymize" in practice; C's claim that a dump with `K_c` "links everything" under A/B is backwards (it links votes, not authorship). **S-C1** `GROUP BY author_pseudonym` gives activity profiles. **S-C2** level token then share links pseudonym to name. **S-C3** "exact merge needs a linkable pseudonym" is overstated: it needs a linkable pseudonym **or** a server-held key that can re-derive per-item tags from the roster. **S-C4/S-C5** token transfer, Sybil re-issue, targeted email partly unmet |

Whether system columns are reachable through views or functions is **Unverified** on the official
page; the red team asks for a test that demonstrates both the S-A1 attack and its fix before the ADR.

**Cross-cutting attacks (hit every design).**

| # | Attack | Proposed fix (owner decision where marked) |
|---|---|---|
| X1 | **Error-SDK defaults.** Sentry's Next.js SDK collects server request bodies and IP by default; `setUser()` data "is always sent" ([Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/), checked 2026-10-11). One error on `POST /questions` = identity + text in one report (§3) | No error SDK on content routes unless approved (PQ-12); canary test |
| X2 | Level-histogram time series diffed against content | Frozen snapshots, fixed cadence or end of term (PQ-31) |
| X3 | Survey-then-share: a new survey text appears beside a new named share | Reveal survey results only after close (PQ-32) |
| X4 | Post-redirect-GET of a new id puts "IP X fetched the new id" in host logs | Render from the POST response (PQ-28) |
| X5 | Live counters in class while one student taps a phone (§7.8) | Snapshot at selection (PQ-35) |
| X6 | Impersonation (Q7) exposes per-student vote state | None; or privacy surfaces excluded |
| X7 | Per-event email templates plus audit dates reveal followers | One generic template, daily (PQ-40) |
| X8 | IP and timing correlation across host, auth and email logs | Document; not fixable cheaply |
| X9 | Stylometry, self-identification, small classes | Document; avoid ready-made grouping |
| X10 | Hide/delete credit and self-upvotes need an author link | Owner decision (PQ-19, PQ-20) |
| X11 | Backups outlive crypto-shredding | "Effective after the backup window" |
| X12 | Mid-term account deletion breaks merge de-duplication | Tombstones until seal (Q17) |

No design protects against the active operator or anyone with deploy rights, the host vendor,
network and timing correlation within log retention, legal compulsion of what exists, or
stylometry and very small classes: these must be documented limitations. All three designs and the
red team agree on: no author column on content; keyed, never unkeyed, pseudonyms; UUIDv4 only;
content-free email; counters untouched by merges; immutable threshold versions.

### 4.5 Critique of the chat's "one-way hashed identifier" (§12 known issue)

The unvetted chat in the source (`[src p.24–31]`, recorded in §12 as advisory) suggests linking
participation counters with a "one-way hashed identifier". §12 already records why that is not
enough. The research adds detail (analysis, not a vendor fact):

1. **An unkeyed hash is reversible by enumeration.** The set of possible inputs is the course roster,
   a few hundred user ids that the database itself holds. Anyone who can read the counters and the
   roster computes `sha256(user_id)` for every enrolled student and compares. "One-way" protects
   against inverting the function, not against guessing a tiny, known input space.
2. **A salt stored next to the hash does not help** for the same reason: the attacker has the salt.
   What helps is a **secret key** that the reader does not hold, i.e. an HMAC (RFC 2104 asks for a
   random key at least as long as the hash output; [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104.html),
   checked 2026-10-11).
3. **Even a keyed pseudonym is dangerous if it sits on content rows.** One stable pseudonym per
   student on every question and comment (C-H1's model) lets any reader group a student's whole
   history, and lets any key holder recover all authorship retroactively (F-C1, S-C1).
4. **Where the key lives matters.** A key passed into SQL can land in database logs (S-A2); a key in
   the same database as the data protects nothing against a dump.

What A+ does instead: a random 32-byte key per course, wrapped under a KEK outside the database;
HMACs computed only in the app's linkage module; the counter pseudonym used **only** in locked
tables; per-item tags (a different value for every student-item pair) for de-duplication; nothing
on content rows. Test T-19 asserts that `sha256(user_id)`, `md5(user_id)` and an empty-key HMAC match
no stored `pid` or tag.

---

## 5. Comparison

### 5.1 Criteria, weights and scores (weights are a proposal; the owner may re-weight)

Weights: **K1** required-tier unlinkability incl. system columns and non-sharers' levels (25; §6.2,
§9, §3, §10); **K2** coverage of §7.7, §7.9, §7.10, §7.12, §7.13, §7.16 and §6.4 optionality (20;
§6.3); **K3** failure severity and detectability (10); **K4** §9 testability (10); **K5** solo build
complexity (15); **K6** platform and cost fit under USD 5/month (10); **K7** production
future-proofing (5); **K8** stronger than required: operator, vendors, dumps, compromise, legal
compulsion (5). Scores 0–5; total = Σ(weight × score) / 5.

| Criterion (weight) | A | **A+** | B-full | B-lite | C-H1 | C1 |
|---|---|---|---|---|---|---|
| K1 (25) | 3.5 | **4.5** | 4.0 | 3.5 | 3.0 | 3.5 |
| K2 (20) | 3.5 | **4.5** | 3.5 | 3.5 | 3.5 | 2.0 |
| K3 (10) | 3.0 | **4.0** | 3.0 | 3.0 | 2.5 | 2.5 |
| K4 (10) | 4.0 | **4.5** | 4.5 | 4.0 | 4.0 | 3.5 |
| K5 (15) | 4.5 | 3.5 | 1.5 | 2.5 | 3.5 | 1.0 |
| K6 (10) | 4.5 | 4.5 | 2.5 | 3.0 | 4.0 | 3.5 |
| K7 (5) | 4.0 | 4.0 | 4.0 | 4.0 | 3.0 | 2.0 |
| K8 (5) | 2.5 | 2.5 | 4.5 | 3.5 | 1.5 | 4.0 |
| **Total (/100)** | **74.5** | **83.5** | **67.0** | **66.5** | **65.0** | **53.5** |

Key reasons: A loses K1 for S-A1 and S-A3, which A+ closes. B-full removes SQL joins structurally
but keeps S-B1; B-lite puts identity, shared results and notifications behind one credential. C-H1
allows `GROUP BY author_pseudonym`; C1 cannot deliver targeted email (§7.13), exact de-duplication
under re-issuance (§7.7) or a verified level under token transfer (§7.10, §7.11). K5 uses the
designs' own unmeasured estimates (A ≈13–17, B-full ≈29–39, B-lite ≈22–29, A+ ≈18–25). On K6, A and
A+ need one managed Postgres plus one app host (the ADR 0002 proposal), while Supabase Free allows
only 2 active projects ([Supabase pricing](https://supabase.com/pricing), checked 2026-10-11). On
K8, B-full is strongest, A and A+ equal (the operator holds everything), C-H1 weakest.

### 5.2 Sensitivity

| Scenario | A | A+ | B-full | B-lite | C-H1 | C1 |
|---|---|---|---|---|---|---|
| Base weights | 74.5 | **83.5** | 67.0 | 66.5 | 65.0 | 53.5 |
| K8 tripled to 15 (others × 85/95) | 71.9 | **80.0** | 69.4 | 66.9 | 61.3 | 56.3 |
| K5 cut to 5 (others × 95/85) | 72.7 | **85.1** | 71.4 | 68.4 | 64.4 | 57.4 |
| K1 + K2 only (mean, 0–5) | 3.5 | **4.5** | 3.8 | 3.5 | 3.2 | 2.8 |

**Break-even:** B-full overtakes A+ only if K8 carries about **33 %** of all weight, i.e. if
protection against the operator and vendors matters about as much as all required-tier
unlinkability together. That is PQ-10.

### 5.3 Unlinkability per actor and failure detectability

R = required tier, S = stronger than required. "Holds" = no usable mapping.

| Actor / channel | Tier | A | A+ | B-full | C-H1 | C1 |
|---|---|---|---|---|---|---|
| Ordinary query incl. `xmin` | R | Partly (S-A1) | Holds | Holds in SQL; S-B1 | Profiles (S-C1) | Grouping |
| Instructor / TA | R | Level series leaks (S-A3) | Holds | Daily histogram (S-B5) | One identification exposes a history | Plus share timing (S-C2) |
| Logs, error reports | R | KEK can reach DB logs | Holds | Holds if all logging off | If bodies stripped | Holds |
| Non-sharers' levels | R | Partly | Holds, cadence PQ-31 | Partly | Partly | Partly |
| Data + key holder | S | Votes, follows, reports; latest action | Same, narrowed; shredding bounds it | Same for votes | **All authorship** | Stored data cannot link |
| Active operator, host | S | Not protected | Not protected | Not protected | Not protected | Not protected |

Worst silent failure per design: A, a KEK + session + body log line after a debugging toggle; B, a
"temporary" service consolidation (caught only if the binding matrix is protected); C-H1, nothing
fails because the capability to recover all authorship simply exists; C1, undetectable token
transfer. **A+'s worst case**, a migration granting `cc_web` a base-table SELECT, is not silent: a
CI catalogue assertion fails on the pull request. The ranking principle: a failure a CI test turns
red is far less dangerous for a solo developer than one only a careful audit finds.

---

## 6. Recommendation (proposal) with trade-offs

Everything here is a **Proposal** for ADR 0003. Values the spec leaves open (bucket sizes, N,
cadences, copy text) are not chosen; each is tagged with the question that owns it. Schema and code
sketches are illustrative, not code. A+ assumes real Postgres with roles, RLS and definer functions
(Q3; ADR 0001 and 0002 propose this).

### 6.1 Pillars

- **P1 no author data.** No question, comment, survey response or report note stores an author,
  pseudonym, tag, session, IP or user agent.
- **P2 locked per-student state.** Counters keyed by `pid`; no runtime role can SELECT them.
- **P3 per-item tags** for upvote, follow, unclear and report de-duplication.
- **P4 keys outside SQL.** `K_c` stored only wrapped, used only in the app's linkage module; no key
  ever appears as a SQL parameter, setting or log field (fixes S-A2).
- **P5 narrow, role-split API.** No runtime role has SELECT on any base table in an anonymous or
  identity schema; credit- and tag-bearing functions are callable only by the linkage module's role
  (fixes S-A1).
- **P6 snapshot-only outputs.** Level distribution, survey results and presentation counts are
  frozen snapshots, never live reads (fixes S-A3, X2, X3, X5).

### 6.2 Stores and roles

| §6.1 domain | Schema(s) | Holds |
|---|---|---|
| (catalogue) | `catalog` | Institution config, courses, assignments, cards and versions; `cc_web` reads with RLS |
| 3 identity | `identity`, `auth_private`, `identity_private` | Users (no activity timestamps), enrolments incl. dropped and tombstoned, staff permissions, preferences; auth-library tables (`cc_auth` only); session hashes |
| 1 content | `content`, `content_tags` | Questions, comments, answers, redirects, merge events, presentation snapshots; tags |
| 2 counters | `participation`, `keys` | Counters, threshold versions, level notices, pending credit (Mode B only); wrapped keys |
| 4 shared | `shared` | `results(course_id, user_id, verified_level, threshold_version_id, shared_on, finalized_on)` |
| 5 survey | `survey`, `survey_private` | Instances, buffer, responses; completions |
| cross-cutting | `audit`, `notify`, `ratelimit`, `snapshots`, `api`, `jobs` | Ids-only moderation events; outbox; HMAC-keyed buckets; frozen aggregates; functions |

Outside `catalog`, runtime roles read only through functions. No cross-domain foreign keys except
into `catalog` and the one intended exception `shared.results.user_id` (§7.10 needs the name).
Nothing in `public`. On Supabase the Data API is disabled and default grants revoked, because
existing projects grant `anon`/`authenticated`/`service_role` privileges in `public` by default
([Supabase hardening](https://supabase.com/docs/guides/api/hardening-data-api), checked 2026-10-11).

| Role | Login | Used by | May |
|---|---|---|---|
| `cc_owner` | no | migrations | own all schemas; FORCE RLS on locked tables |
| `cc_fn_*` (board, merge, particip, survey_in, survey_out, notify, read, session) | no | own the definer functions, one per group | only their group's table rights (`cc_fn_survey_out` cannot read completions) |
| `cc_web` | yes | every ordinary route | SELECT on `catalog`; EXECUTE on read and staff functions; nothing credit- or tag-bearing |
| **`cc_link`** | yes | **only the linkage module** (own pool and secret) | EXECUTE on credited writes, tag writes, my-state, share, merge, notification inputs, `keys.get_wrapped` |
| `cc_auth` | yes | auth library and sign-in callback | `auth_private`; `create_session` |
| `cc_jobs` | yes | scheduled jobs | `jobs.*` only |
| `cc_migrate` | CI only | migrations | member of `cc_owner`; never in the app's env |
| platform admin | yes | the operator | bypasses RLS: documented limitation |

Every `cc_*` role has `rolbypassrls = false`, no `pg_read_all_data`, and role-level
`log_statement = none` and `log_min_duration_statement = -1` where the platform allows. This
matches ADR 0001's "one pool + LOGIN role + secret per privacy domain". **Why `cc_link`:** if
`cc_web` could call the tag-bearing functions, a SQL injection in any ordinary route could forge
tags; confining them to one small module's credential limits that. It does not contain full
app-server compromise, since one process holds every credential (PQ-13).

### 6.3 Keys and the linkage module

| Key | Generation and storage | Rotation / destruction |
|---|---|---|
| KEK | 32 random bytes generated offline by the owner; host secret store; one per environment | Re-wrap all `K_c`; production: a KMS |
| `K_c` per course (+ version) | 32 bytes from the runtime CSPRNG at course creation; AES-256-GCM-wrapped in `keys.course_keys` | Crypto-shred at seal (6.12) |
| Sub-keys `K_pid`, `K_up`, `K_follow`, `K_unclear`, `K_report`, `K_seen` | HKDF-SHA-256 from `K_c` with fixed labels; never stored | Die with `K_c` |
| `K_rl` | Global, random, wrapped like `K_c` | Rotate freely |

Derivations (16-byte UUID inputs): `pid = HMAC(K_pid, user_id)`;
`up_tag = HMAC(K_up, user_id ‖ canonical_question_id)`; follow, unclear and report tags likewise over
the question, answer or content id; rate-limit subject `HMAC(K_rl, user_id ‖ action)`.

**Why app-side, not pgcrypto or Vault.** pgcrypto's docs say data and passwords move in clear text
and to "do crypto inside client application" if the DBA is untrusted
([pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html), checked 2026-10-11). Supabase
Vault's root key is returned by the Management API and its decrypted view exposes secrets to any
reader ([Vault](https://supabase.com/docs/guides/database/vault), checked 2026-10-11), and it is
Supabase-only. App-side HMAC keeps keys out of every database log path and is portable.

**Contract (illustrative).** `linkage.ask(session, …)` verifies the session (no database write),
unwraps `K_c` for this request only, and calls `api.ask_question(session_hash, …, pid, rl)` as
`cc_link`. The definer re-resolves the session, checks enrolment and the rate limit, inserts the
question with no author and, in Mode S, increments the counter whose `pid` row was pre-created at
enrolment (in random order); a `pid` without a row is rejected, so nobody can act for another
student. For "you upvoted this", the definer returns the **full** tag set for the visible items and
the app tests membership; no read function accepts a viewer's tags (S-B1).

### 6.4 Function whitelist (the "narrowly scoped internal API", §6.2)

All functions are `SECURITY DEFINER` with `SET search_path = ''`, schema-qualified names,
`REVOKE ALL … FROM PUBLIC` in the creating transaction, no dynamic SQL, generic errors, minimum
return data and `ON CONFLICT DO NOTHING`.

| Caller | Functions | Returns |
|---|---|---|
| `cc_link` | `ask_question`, `post_comment`, `upvote` (credited); `follow`, `mark_unclear`, `report` (not credited, §7.9); `item_tag_sets`, `my_participation`; `share_level`, `revoke_share`; `precreate_counter`, `tombstone_enrolment` (roster sync, Q5); `merge_fetch`, `merge_commit`; `notification_inputs` | Never a pid or tag except tag sets for the requested items; own counts, level, current and original thresholds (§7.10) |
| `cc_web` | `read_board`, `read_question`, `read_search`, `me`, `course_roster_for_staff`; moderation (`answer`, `pin`, `recategorize`, `hide`, `delete`, `resolve`, `reopen`, `select_for_presentation`, `moderation_queue`); `instructor_shared`, `finalize_shared`; `publish_thresholds`, `publish_grading_scheme`; `submit_survey`, `has_completed`, `survey_results`; `course_analytics` | Explicit columns; hidden content excluded per role (§7.14); the queue never shows tags; shared results = name, level, date; analytics = latest snapshot |
| `cc_auth` / `cc_jobs` | `create_session` / `jobs.snapshot_*`, `digest_*`, `wash`, `survey_flush`, `seal_course`, `privacy_selfcheck` | Token / counts |

Any new function needs an ADR note and an entry in the whitelist test.

### 6.5 What is never stored

No author, pid, tag, session, IP or user agent on content, survey responses or report notes; no "my
posts" list (PQ-22). No timestamps on counters, tags, completions, survey responses or pending
credit. No last-seen or last-login in identity; no sliding session expiry. No unwrapped key
anywhere. No sequences or per-course "#14" numbers; UUIDv4 only. No question id, title or text in
any email, outbox row or notification URL. No outbox row after sending. No live aggregates.

### 6.6 Timestamp policy

| Data | Stored precision |
|---|---|
| Question and comment `created_at`, `last_activity_at`; "most recent" sort; displayed time | A coarsened bucket whose size is **PQ-24** (options: 15 min, 1 h, 1 day); ties broken by a random key; display no finer |
| Counters, tags, pending credit, completions, survey responses | None (§7.10 "dates"; §7.12 "no unnecessary metadata") |
| Identity rows | No activity timestamps; sign-in and roster upserts are **no-ops when unchanged** (S-A1) |
| Auth sessions | Refresh disabled: Better Auth offers `disableSessionRefresh: true` and otherwise slides expiry; its sessions hold `ipAddress`, `userAgent`, `createdAt`, `updatedAt` ([Better Auth](https://www.better-auth.com/docs/concepts/session-management), checked 2026-10-11); leaving IP/UA empty is **Unverified** (PQ-48) |
| `shared_on`, `finalized_on`, audit, snapshots, digests | Date (finer audit only if Q14 requires it) |
| `track_commit_timestamp` | Off, asserted by a test |
| Identifiers | UUIDv4 only; v7 embeds a millisecond timestamp, and UUIDs "MUST NOT be used as security capabilities" ([RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html), checked 2026-10-11) |
| `xmin` hygiene | A nightly `jobs.wash` rewrites counter and tag rows in one transaction so they share one `xmin` (effect on dead tuples and WAL **Unverified**) |

### 6.7 Merge algorithm (§7.7; §10 "Duplicate merging preserves counts correctly")

```
linkage.merge(session, A, B):              // A into B; one transaction as cc_link
  f := merge_fetch(A, B)    // checks moderation permission (§5), same course, both canonical;
                            // locks rows; returns tag sets of A and B and the ever-enrolled
                            // roster ids (incl. dropped, tombstoned), never names
  for u in f.roster:        // ≈ 4N HMACs in app memory, nothing logged
     if HMAC(K_up, u‖A) ∈ f.upA:      newUp  += HMAC(K_up, u‖B)
     if HMAC(K_follow, u‖A) ∈ f.folA: newFol += HMAC(K_follow, u‖B)
  merge_commit(A, B, newUp, newFol, orphans)
     // tags on B ON CONFLICT DO NOTHING; orphans carried over; tags on A deleted
     // comments moved to B; answers moved (proposal, PQ-25); redirect A → B; A marked merged
     // B.upvote_total := count(tags on B)       → no double counting
     // merge event + ids-only audit row (date); counters NOT touched → credit preserved
```

A student who upvoted both ends with one tag on B; whether they keep two "upvotes given" is
**PQ-20** (proposal: keep both, since §7.7 says "preserve"). The merge writes no counter or identity
row, so it creates no timing link. Timing at realistic roster size is **Unverified** (spike T-31).

### 6.8 Notification policy (§7.13; recipients and the essential set are open)

| §7.13 event | Recipient (proposal) | In-app | Email |
|---|---|---|---|
| Answer posted; Followed question updated | Followers (PQ-21; which events count is PQ-39). **No auto-follow on asking** by default: an auto-follow tag is the asker's tag, so a key holder could recover every author by roster test (breaks P1) | Compute-on-read | Generic daily digest |
| Question merged | Followers of A, re-keyed to B | From merge events + follow tags | Generic daily digest |
| Participation level reached | The student | Compared with a last-acknowledged level written at viewing time | Nightly, no level in the body, or in-app only (Q13, PQ-40) |
| Card changed (§7.6 "affected students", PQ-39); Survey available; Sharing window open | Enrolled students | Ordinary rows | Broadcast |

**Compute-on-read:** the linkage module fetches followed-item updates since the viewer's seen
bucket, computes the viewer's follow tags and keeps matches in memory for that response only; no
per-user notification row holds a question id. The **seen marker** is a locked row keyed by
`HMAC(K_seen, user_id)` at day precision, or client-side only (PQ-43). **Email** (provider: Q6):
one generic template for all content-related notices (owner-approved copy, to be written; it names
no question, event type or text); a fixed-time daily digest whose outbox rows are deleted after
send; links only to a generic `/notifications` page; tracking off (provider facts **Unverified**).
Users manage nonessential notifications (§7.13); the essential set is Q13; course names in emails
are PQ-40.

### 6.9 Survey separation (§7.12; §10 "anonymous and technically separate")

`submit_survey` checks enrolment and that the survey is open, writes a completion flag (no time) in
`survey_private` and a buffer row (no identity, no time) in `survey`, earns no credit and never
touches `participation` (§7.12). A job moves buffer rows to `responses` in random order once at
least k exist and at close (k defaults to the reveal threshold, Q16). **Results are revealed only
after the survey closes**, all at once, only above the configurable minimum (§7.12; default Q16),
in random order, never refreshed while open (X3, PQ-32). The UI presents the survey before sharing
(§7.12) and availability never depends on sharing. The thank-you renders from the POST response
(X4). The completion flag blocks a second submission; whether that is wanted is PQ-32. **Upgrade
from C:** a blind-token survey (RFC 9474 via `@cloudflare/blindrsa-ts`, `node >=24`) where identity
records only "issued" and the survey side a spent-token hash, removing the operator-level
completion-to-buffer link; adopt if PQ-10 puts the operator outside the boundary or a UW review asks.

### 6.10 Aggregates and snapshot outputs (§7.16, §7.8; N is Q16)

- **Content totals** (§7.16): frozen snapshots on the same cadence as levels, never live.
- **Level distribution:** (1) cadence fixed by the owner, weekly with lag or **one end-of-term
  snapshot only**, never on demand (PQ-31); (2) whole distribution suppressed unless enrolment ≥ N
  **and** every non-empty level ≥ N (cell suppression is not enough, since No Record = enrolled −
  the others); (3) **hidden from the moment sharing opens** (Q18), never beside shared results;
  (4) after sharing is final, nothing newer than the last pre-window snapshot.
- **Shared results:** name, verified level, date shared only (§7.10).
- **Presentation mode** (§7.8): a snapshot of upvote total, answer and status taken when staff
  select a question; no live increments (PQ-35); never §7.8's excluded items.

**Two rule shapes to reconcile.** The Q16 proposal in
[blocking-open-questions.md](blocking-open-questions.md) releases level counts to instructors
**once, after the sharing window closes and shares are final**, only if a residual check passes (at
least N non-sharers, not all in one level), with complementary suppression. The shape above allows
fixed-cadence snapshots before sharing opens. PQ-31 asks whether in-term level counts are wanted at
all; if not, both reduce to one end-of-term rule. Differential-privacy noise was rejected as hard to
explain; dropping the distribution entirely needs confirmation because §7.16 lists it.

### 6.11 Crediting modes and the evolution path

| Mode | Mechanism | Residual link | UX |
|---|---|---|---|
| **S, synchronous** (prototype proposal) | Credit in the posting transaction | Operator or physical-copy holder: content and counter rows share `xmin` until the student acts again or the nightly wash | Instant counts |
| **B, daily batch** (upgrade switch, same tables) | Posting writes `pending(kind, sealed_pid = AEAD(K_c, pid))`; one daily job per course applies credits in random order and deletes pending rows | `K_c` holder only, until the batch | Counts lag up to a day; owner-approved copy needed |
| D, client token (not recommended) | Session-bound redemption token | Closes the logical link | Device-bound; bearer and shared-device issues |

The mode is **PQ-30**; switching is a function change. **Production evolution**, each step its own
ADR, none decided: (1) KEK into a cloud KMS with separated duties; (2) Mode S → B; (3) blind-token
survey; (4) schemas → separate databases or services (B's topology) if a UW review requires it,
mechanical because there are no cross-domain FKs and each code path has its own role and secret;
(5) an institution "strong anonymity mode" using C1's client-held pseudonym as the `pid`/tag source,
still with nothing on content rows; (6) the §6.4 process only if institutional policy requires it:
forward-only escrow with k-of-n offline key shares, an external write-once audit log, a published
explanation (§11) and notification rules.

### 6.12 End-of-term options (Q17 retention, Q18 trigger; options only)

| Option | At seal (after sharing is final) | Caveat |
|---|---|---|
| R0 keep | Nothing; the latent operator capability persists | — |
| **R1 crypto-shred** (for discussion) | Delete wrapped `K_c`, tags (keep totals), counters, level notices, pending credit, completions, seen markers, rate-limit rows, tombstones; keep authorless content, shared results, survey text, ids-only audit | Effective only after every copy of the wrapped key **and** KEK history expires; Supabase Free has no automatic backups, vendor-internal copies **Unverified**, paid tiers keep daily backups (X11). Never rely on rotating the KEK alone |
| R2 | R1 plus content deletion after a set period | Q17 policy |
| R3 mid-term account deletion | Tombstone the enrolment until seal; delete identity attributes | Full deletion before seal breaks merge exactness for that student (X12, PQ-54) |

### 6.13 Integrity forks the owner must decide before ADR 0003

A+ stores no author link, so these are consequences, not choices made here; each "yes" to the
alternative weakens P1.

| Fork | A+ consequence | Alternative and its cost | Question |
|---|---|---|---|
| Hide/delete and earned credit | Credit stands, bounded by rate limits (Q20) and moderation | A per-item `AEAD(K_c, pid)` reference: authorship recoverable by key holders; revocation only as a human action (§3) | **PQ-19** |
| Self-upvotes; withdrawal; double upvoter after merge | Cannot block self-upvotes; no withdrawal (§7.7 lists only "upvote"); both credits kept | Author tag per question; tag delete semantics | **PQ-20** |
| Recipients; auto-follow on asking | Followers only; no auto-follow | Auto-follow exposes askers to key holders | **PQ-21** |
| See, edit or delete own post | Not possible | Client-held bearer capability or a stored link | **PQ-22** |
| Repeat anonymous abuser | Moderation and rate limits only (§6.4's preference) | A "sanction without reveal" escrow handle | **PQ-23** |
| Post-time precision | Coarse bucket | Finer buckets ease timing joins | **PQ-24** |
| Crediting mode | Mode S | Mode B with lagged counts | **PQ-30** |
| "Disadvantage" (§7.9) | New threshold version must be pointwise ≤ the previous one once participation starts; when it "begins" is open | Other readings | **PQ-33** |

### 6.14 Must-have controls

| Id | Control | Closes |
|---|---|---|
| C-01 | No author/pid/tag/session/IP/UA column on anonymous tables; a column **allow-list** per table, not a name regex | P1, F-C1 |
| C-02 | No runtime SELECT on base tables outside `catalog`; reads through functions with explicit columns | S-A1 |
| C-03 | Two locks: no grants **and** ENABLE + FORCE RLS with policies only for `cc_fn_*` (no policy = default deny, [PG RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), checked 2026-10-11) | Stray grants |
| C-04 | Definer hygiene (pinned `search_path`, `cc_fn_*` owner, no PUBLIC EXECUTE, exact whitelist per role) | A F2–F4 |
| C-05 | `rolbypassrls = false`, no `pg_read_all_data`, tables owned by `cc_owner` | A F5, F7 |
| C-06 | Keys only app-side; wrapped keys only via `cc_link`; one KEK per environment; no key in SQL or logs | S-A2 |
| C-07 | Credit/tag functions only for `cc_link`; only the linkage module imports it (lint) | Tag forgery |
| C-08 | No read function takes a viewer's tag list | S-B1 |
| C-09 | No-op identity upserts; no activity timestamps; session refresh off; sessions readable only by `cc_auth` | S-A1 |
| C-10 | Logging invariants (`log_statement = none`, `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0`), `track_commit_timestamp = off`, ORM logger off, bind parameters only | A F9 |
| C-11 | App logger field allow-list; no request bodies; no identity context on events that can carry content | §3, §6.2 |
| C-12 | No error, analytics or session-replay SDK on content routes unless PQ-12 approves a configuration that passes the canary test | X1 |
| C-13 | UUIDv4 only; no sequences; no ids in query strings; no post-redirect GET of a new id | §9, X4 |
| C-14 | Supabase Data API off, nothing in `public`, default grants revoked; Neon roles by SQL only | A F6, F7 |
| C-15 | Timestamp policy (6.6); counters pre-created in random order; nightly wash | `xmin` |
| C-16 | Snapshot-only levels hidden once sharing opens; survey reveal after close; presentation snapshots | S-A3, X2, X3, X5 |
| C-17 | One generic email template; daily digest; outbox deleted after send; tracking off | X7, M-A1 |
| C-18 | No auto-follow unless the owner accepts the P1 weakening | P1 |
| C-19 | Enrolment tombstones until seal; orphans carried over in merges | X12 |
| C-20 | No impersonation; if Q7 ever allows it, no `my_*` or linkage calls in impersonated sessions | X6 |
| C-21 | Never restore production into dev or preview; synthetic previews (PQ-15); per-domain dumps (PQ-14) | A F13 |
| C-22 | Any change to C-01…C-21 needs an ADR note and a threat-model update; catalogue suite on every migration and daily in production | Drift |

**Negative tests (§9)** are carried into [testing-strategy.md](testing-strategy.md): catalogue
assertions; a role × endpoint authorization matrix; canary scans (a canary name and canary text must
never co-occur in any UI page, API response, export, captured log or local error sink); identifier
tests (UUIDv4; no unkeyed-hash match, T-19); merge property tests; dump-replay without the KEK and a
dump-diff test (from C); red-team tests T-21 to T-36. Tests cannot prove that the deployed code is
the reviewed code, that vendor logs hold only their documented fields, or that the operator does
not misuse the keys.

### 6.15 Build estimate and trade-offs

Estimate (unmeasured): A's core 13–17 sessions, plus 1–2 for the function read path, 1–2 for the
linkage module and key runbook, 1 for snapshot jobs and survey reveal, 1–2 for the red-team tests
and canary sink, and 1 for the pre-ADR spikes (system columns T-21, auth-session fields T-24, merge
timing T-31, pooler logging T-33): **≈18–25** in total, against A ≈13–17 and B-full ≈29–39.

Trade-offs accepted: the operator and vendors are trusted unless PQ-10 says otherwise, and in
Mode S the operator can see each student's latest credited action until the nightly wash; without an
author link, hidden content keeps its credit, self-upvotes cannot be blocked and students cannot
edit their posts; reading through functions costs ORM convenience; one process holds every
credential (PQ-13); instructors see aggregates only as snapshots and survey text only after close.

### 6.16 What evidence would change the recommendation

| Evidence | Would move toward |
|---|---|
| PQ-10 answered "the operator and vendors must not be able to link", or a UW review demands separate stores or institution-held keys | **B topology** for production with KMS, Mode B and the blind-token survey; the prototype stays A+ only if the split is scheduled (break-even in 5.2) |
| "Even the server cannot link" wanted, with C1's email, double-counting and transfer trade-offs accepted | C1 as an institution "strong anonymity mode", nothing on content rows |
| Spike T-21 shows system columns still reachable through the read path | Reads from job-written snapshot tables, or B-style stores |
| The auth library cannot disable refresh, suppress IP/UA or be confined to `cc_auth` | Another library or a thin session layer (Q4, ADR 0004) |
| Q3 lands on a platform without Postgres roles, RLS and definers (e.g. D1) | B or C-style separation (§12) |
| Merge too slow at realistic N (T-31) | Job-based merges, or a per-course linkable pseudonym on tag rows (weaker; owner approval) |
| PQ-19, PQ-22 or PQ-23 answered "yes" | A+ with an encrypted per-item author reference, documented as a P1 weakening |
| Measured build time far beyond the estimate | A plus the required-tier fixes only (S-A1, S-A3, X1–X4) |
| A vendor changes defaults | Re-run catalogue and log tests; redesign only if a lock can no longer be asserted (C-22) |

---

## 7. Privacy implications (§6): threat-model outline and limitations of anonymity

**How A+ meets §6.** §6.1: separate schemas, owner roles and login roles, no cross-domain FKs.
§6.2: no function returns a pid or tag beside identity; ordinary queries cannot join because no
runtime role reads content or identity base tables and keys never enter SQL; the required
techniques map to batched or synchronous credit (6.11), separated schemas, restricted roles (6.2),
opaque ids (6.6) and the function whitelist (6.4); C-10 to C-12 and the canary scans cover logs,
analytics, error reports, views, exports and dashboards. §6.3: this file, ADR 0003 and the threat
model below come before any code. §6.4: authorship is never stored, so the default "nobody can
deanonymize" holds by construction.

### 7.1 Threat-model outline (Q8)

The threat model and limitations are a deliverable (§6.2, §11), required before content or
participation code (§6.3). Format and location are **Q8**; the plan proposes Markdown at
`docs/threat-model/README.md` with the OWASP four questions, a data-flow diagram of the five domains
and trust boundaries, STRIDE per component and LINDDUN for privacy. Proposed sections:

1. Status and scope (version, owner approval, link to ADR 0003; prototype vs production).
2. System overview: domains, schemas, roles, code paths, key flow (6.2–6.3).
3. Assets: identity, content, linkage facts (pids, tags, counters, completions), levels, shared
   results, survey text, keys, logs, backups.
4. Trust boundaries: the operator (PQ-10); vendors with regions and log retention (Q3, Q4, Q6).
5. Actors, required vs stronger than required (5.3).
6. Threats and mitigations per actor and channel, each with a control id (6.14).
7. Side channels: system columns, physical order, timing, email timing, IP, classroom observation,
   small classes, stylometry, aggregate differencing, survey-then-share.
8. Residual risks and why they stay.
9. **Limitations of anonymity** (7.2); the user-facing text is owner-approved copy (to be written);
   whether it must be in the app is PQ-52.
10. Vendor log inventory: one captured real entry per platform, with fields and retention.
11. Key management and incident response: KEK custody (PQ-16), rotation, leak response (rotate
    `K_c`, re-tag by roster), compromise response, shredding.
12. Deanonymization stance: default nobody (§6.4); any exceptional process only with all six §6.4
    conditions.
13. Controls ↔ tests ↔ §9/§10 traceability.
14. Change control: roles, grants, definers, logging, SDKs, templates and timestamp precision change
    only with an ADR note and an update.
15. Open questions, kept in sync with §13.

### 7.2 Limitations of anonymity (content, not copy)

(P) = depends on the proposed prototype platforms (Q3, Q4, Q6).

1. **The server knows who is posting at the moment of posting**, to credit the private counter. It
   does not store who wrote a question or comment.
2. **The operator and the hosting, database, auth and email vendors are trusted** (unless PQ-10
   decides otherwise). Whoever controls the deployment could change the software to record future
   activity; no web app can be protected against the party that ships its code.
3. **With full database access plus the application's keys**, someone could reconstruct who
   upvoted, followed, reported or marked unclear which items, each student's counts and, in
   synchronous crediting, each student's latest credited action. Instructors, TAs and admins cannot
   do this through the app.
4. **Legal process** can compel whatever exists, including logs within their retention.
5. **Destroying the course key at end of term** (if R1 is adopted) makes those records unlinkable
   only after backup and history copies expire.
6. **Network and timing metadata** (IP, time) is recorded by host, auth and email providers and
   could be correlated statistically. (P) Vercel Hobby runtime logs: 1 hour
   ([Vercel](https://vercel.com/docs/logs/runtime), checked 2026-10-11); Supabase Free API and
   database logs 1 day, auth audit logs 1 hour ([Supabase](https://supabase.com/pricing), checked
   2026-10-11). Whether IP is identity-bearing is PQ-11.
7. **Writing can identify the writer**: self-identifying details, style, being seen typing in class,
   very small classes.
8. **Post times are shown approximately** (PQ-24); posting right after a conversation can still give
   someone away.
9. **Survey written responses** appear only after close and above the minimum (Q16, PQ-32); in a
   small class they may still be recognisable.
10. **Level aggregates** appear only as snapshots above a minimum and are hidden once sharing opens
    (PQ-31); a residual risk remains in very small classes.
11. **Sharing reveals exactly name, verified level and date shared**, as the verbatim §7.10 text
    says: "Your instructor will receive your name and participation level. Your instructor will not
    receive your questions, comments, upvotes, dates, or activity breakdown."
12. **Emails never contain question text or say which question they concern**; the provider learns
    that a notification was sent, and on which day.
13. **Moderators cannot see who posted**; so credit for hidden content stands and self-upvotes
    cannot be blocked (pending PQ-19, PQ-20).
14. **Presentation mode** shows questions to the room; people nearby can see a student's screen.
15. **By default nobody can deanonymize** (§6.4). If an institution ever enables the exceptional
    process, it applies only to content posted after a published notice.
16. **No impersonation** of students exists (Q7); any future support procedure excludes privacy
    surfaces by construction.
17. **No third-party error-reporting or analytics tool** runs on pages that receive anonymous content
    (if PQ-12 is answered that way); any change is announced through this document.
18. **Grouping is not stored**: the system cannot tell that two posts came from the same anonymous
    student, only that one student did not upvote a question twice.

---

## 8. Risks

| Risk | Mitigation (proposal) |
|---|---|
| A later migration widens a grant or adds a "UX" column, creating a silent join | Catalogue suite and column allow-lists on every migration; daily self-check; C-22 |
| Debug logging, or a pooler that interpolates literals, puts token + body in one log line | Logging invariants asserted on the live project (C-10); T-33 through the production driver |
| An error or analytics SDK added with default settings (§3 breach) | C-12, canary sink, PQ-12 |
| System columns reachable through some read path | Spike T-21 before the ADR; job-written snapshot tables |
| KEK leak (env var, preview, laptop): dump + KEK links all tags | One KEK per environment; secret scanning; rotation runbook; KMS in production; PQ-16 |
| Later authorship features (edit own post, revoke credit, sanctions) | Each an explicit ADR with a documented P1 weakening (6.13) |
| Merge too slow at realistic N | Spike T-31; job-based merge |
| Supabase Free pauses or loses data (no backups); a lost key breaks re-tagging | ADR 0002's nightly per-domain encrypted dumps (PQ-14); restore runbook |
| Build effort beyond the estimate delays M1b | Fall back to A plus required-tier fixes (6.16) |
| Users over-trust the anonymity | Publish 7.2 in plain language (PQ-52) |

---

## 9. Open questions

None is answered here. "ADR" = must be answered before ADR 0003 is accepted.

### 9.1 Existing CONTRIBUTING §13 questions

| Q | How A+ depends on it | When |
|---|---|---|
| Q1 | If admin scope grows to raw DB or console access, the admin becomes the operator | Build |
| Q2 | Which privacy-touching features are in milestone 1 (survey, sharing, email) | ADR scope |
| Q3 | Needs real Postgres with roles, RLS and definers (rules out D1); a host secret store for the KEK; Node ≥ 24 if the blind-token survey is adopted | ADR |
| Q4 | Auth-library session fields and refresh (C-09, PQ-48) | ADR |
| Q5 | Roster sync must call the linkage module to pre-create counters and write tombstones | Build |
| Q6 | Email provider: tracking off, retention, body storage | Build |
| Q7 | Any impersonation must exclude privacy surfaces (C-20); proposal: none | ADR |
| Q8 | Threat-model format and location (7.1) | ADR |
| **Q9** | This file informs it; it does not close it | ADR |
| Q12 | Export or apply triggers finalisation of shares (§7.10) | Build |
| Q13 | Essential notifications; whether "level reached" is emailed | Build |
| Q14 | Audited events and retention; whether the moderation log records the staff actor | Build |
| Q16 | N for level suppression and survey reveal; flush size k | Values: build; rule shape: ADR |
| Q17 | R0–R3 retention and crypto-shredding | Before the first term ends |
| Q18 | Sharing open/close and the seal trigger (hides aggregates; triggers shredding) | Build |
| Q20 | Rate-limit values (they also bound credit farming while hidden content keeps credit) | Build |

### 9.2 Proposed new questions (brief IDs; raw-note IDs in brackets)

| ID | Question | When |
|---|---|---|
| **PQ-10** | Is the platform operator inside the trust boundary for the prototype? For production? [PQ-P1, NQ-A9, PNQ-B13, NQ-C2, NEW-3] | ADR |
| PQ-11 | Are IP addresses and request metadata identity-bearing under §6.2, and what platform-log retention is acceptable? | ADR |
| PQ-12 | May any third-party error-reporting or analytics tool run, especially on content routes, and with which settings? [PQ-P9, NEW-4] | ADR 0001 |
| PQ-13 | Must per-domain secret isolation be platform-enforced (separate deployments) in the prototype, or are separate DB roles in one deployment acceptable? | ADR |
| PQ-14 | Are backups and dumps "exports" under §3/§6.2; where, under which keys, how long? [PQ-P19] | M1a |
| PQ-15 | Must preview and staging use only synthetic data? | M0 |
| PQ-16 | Who may hold the KEK; may AI agents or tools ever access production data, secrets or logs? [PQ-P21] | M0 |
| **PQ-19** | Does hiding or deleting content remove its credit? [PQ-P2, NQ-A5, PNQ-B11, NQ-C10] | ADR |
| **PQ-20** | Self-upvotes allowed? Upvote withdrawal? Double upvoter after merge keeps two credits? [PQ-P3, NQ-A3, NQ-A4, NQ-A6] | ADR |
| **PQ-21** | Who receives "Answer posted" and "Question merged"; does asking auto-follow? [PQ-P4, NQ-A1, NQ-A13] | ADR |
| **PQ-22** | May students see, edit or delete their own anonymous posts? [PQ-P17, NQ-A2] | ADR |
| **PQ-23** | Repeat anonymous abusers: moderation and rate limits only, or a sanction-without-reveal handle? [PQ-P18] | ADR |
| **PQ-24** | Stored and shown precision of post times? [PQ-P7, NQ-A8] | ADR |
| PQ-25 | On merge: answers, unclear marks and reports on the merged-away question; when is preserving a comment "not reasonable" (§7.7)? | M1b |
| PQ-27 | Does staff identity next to content (e.g. "hidden by TA X") count as identity-bearing under §3? [PQ-P14] | M1b |
| PQ-28 | Show a new post from the POST response rather than a GET of its id? [PQ-P22, NEW-6] | M1b |
| PQ-29 | Can one person be TA and student in the same course? [PQ-P15] | M1a |
| **PQ-30** | Crediting mode: synchronous or daily batch? [PQ-P8, NQ-A10, PNQ-B1] | ADR |
| PQ-31 | Are in-term level counts wanted at all; cadence; differencing rule? [PQ-P5, NEW-1] | M2 (rule shape: ADR) |
| PQ-32 | Survey results only after close? Duplicate prevention? Survey required before sharing or skippable? [PQ-P6, NEW-2] | M2 |
| **PQ-33** | Reading of "threshold changes that would disadvantage them"; when participation "begins" (§7.9)? [PQ-P20] | ADR |
| PQ-34 | Shared level frozen at share time or live until finalisation? [PQ-P16] | M2 |
| PQ-35 | Presentation mode and analytics: snapshots or live? [PQ-P11] | M1b |
| PQ-39 | Which events count as "followed question updated"; which card edits notify, and who are the "affected students" (§7.6)? | M1a |
| PQ-40 | One generic email template? Course code in emails? Level in the "level reached" email? [PQ-P10, NEW-7] | M2 |
| PQ-43 | Seen marker: server-side at day precision under a keyed HMAC, or client-only? [PQ-P12] | M1b |
| PQ-48 | May the auth library store IP, user agent and created/updated times; must refresh be disabled? [PQ-P13] | ADR 0004 |
| PQ-52 | Must the limitations of anonymity be visible in the app? | M0 |
| PQ-54 | On account removal, does a student's anonymous content stay or go? | M1b |
| PQ-09 | Data residency in Canada for prototype and/or production? [PQ-P23] | ADR 0002, Prod |

---

## 10. Sources and verification log

**Internal inputs** (raw notes in the owner's scratch folder, outside the repo): design A
(database-enforced), design B (separated services), design C (cryptographic), the privacy red-team
critique and the judge's comparison, dated 2026-10-11/12. ADR 0001 and ADR 0002 give the proposed
platform context.

**External facts.** Verified = re-fetched by the judge or the red team; Verified (note) = verified
by one design note only.

| Claim | URL | Checked | Status |
|---|---|---|---|
| `xmin` = inserting transaction id; updates create row versions; page silent on who may select system columns | https://www.postgresql.org/docs/current/ddl-system-columns.html | 2026-10-11 | Verified (visibility **Unverified**) |
| Views use the owner's permissions unless `security_invoker = true` | https://www.postgresql.org/docs/current/sql-createview.html | 2026-10-11 | Verified |
| RLS: no policy = default deny; owners bypass unless FORCE; superusers and `BYPASSRLS` always bypass | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | 2026-10-11 | Verified |
| Definers: pin `search_path`; EXECUTE granted to PUBLIC by default; revoke in one transaction | https://www.postgresql.org/docs/current/sql-createfunction.html | 2026-10-11 | Verified |
| Logging defaults (`log_statement` none, `log_min_duration_statement` −1, `log_parameter_max_length_on_error` 0) | https://www.postgresql.org/docs/current/runtime-config-logging.html | 2026-10-11 | Verified |
| `track_commit_timestamp` off by default, server start only | https://www.postgresql.org/docs/current/runtime-config-replication.html | 2026-10-11 | Verified (note) |
| pgcrypto data moves in clear text; "do crypto inside client application" if the DBA is untrusted | https://www.postgresql.org/docs/current/pgcrypto.html | 2026-10-11 | Verified |
| Supabase Free: 2 active projects, pauses after 1 week idle, no backups, API/DB logs 1 day, auth audit 1 hour | https://supabase.com/pricing | 2026-10-11 | Verified |
| Supabase Data API off → no endpoint responds; default `public` grants on existing projects | https://supabase.com/docs/guides/api/hardening-data-api | 2026-10-11 | Verified |
| Supabase default-grant change reaches existing projects 2026-10-30 | https://github.com/orgs/supabase/discussions/45329 | 2026-10-11 | Verified (note) |
| Supabase `postgres` owns tables and has `bypassrls` | https://supabase.com/docs/guides/database/postgres/roles | 2026-10-11 | Verified (note) |
| Supabase Vault: root key outside DB; Management API returns it; decrypted view exposes secrets | https://supabase.com/docs/guides/database/vault | 2026-10-11 | Verified |
| Neon console roles join `neon_superuser`; SQL-created roles do not | https://neon.com/docs/manage/roles | 2026-10-11 | Verified (note) |
| Vercel runtime logs: path, search params, UA, time; Hobby 1 hour, Pro 1 day | https://vercel.com/docs/logs/runtime | 2026-10-11 | Verified |
| RFC 9562: v7 embeds a ms timestamp; UUIDs "MUST NOT be used as security capabilities" | https://www.rfc-editor.org/rfc/rfc9562.html | 2026-10-11 | Verified |
| RFC 2104: random HMAC keys of at least hash length | https://www.rfc-editor.org/rfc/rfc2104.html | 2026-10-11 | Verified (note) |
| RFC 9474 blind RSA signatures (Informational, Oct 2023) | https://www.rfc-editor.org/rfc/rfc9474.html | 2026-10-11 | Verified (note) |
| `@cloudflare/blindrsa-ts` 0.4.6, Apache-2.0, `node >=24` | https://registry.npmjs.org/@cloudflare/blindrsa-ts/latest | 2026-10-11 | Verified |
| Better Auth: expiry slides after `updateAge`; `disableSessionRefresh`; `ipAddress`/`userAgent` fields | https://www.better-auth.com/docs/concepts/session-management | 2026-10-11 | Verified |
| Sentry Next.js: request bodies and IP by default; `setUser()` "always sent" | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ | 2026-10-11 | Verified |
| D1: Free 10 DBs; Time Travel 7/30 days; no Canada | https://developers.cloudflare.com/d1/platform/limits/ | 2026-10-11 | Verified |
| Workers Free 10 ms CPU; Paid USD 5 minimum | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-10-11 | Verified |
| New Workers have observability on by default | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ | 2026-10-11 | Verified |
| Safari WebAuthn PRF `get()` support | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/CredentialsContainer.json ; https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ | 2026-10-11 | **Conflicting** |

**Still Unverified:** system-column reachability through functions or views (T-21); whether Better
Auth can leave IP/UA empty (T-24); `pg_stat_xact_user_tables` for the posting-transaction test and
the "no cross-domain view" query; the wash, `CLUSTER` and VACUUM effect on `xmin`; dump row order;
merge timing (T-31); driver/pooler literal interpolation (T-33); vendor-internal backup retention
after shredding; email-provider tracking defaults (Q6); Vault on Supabase Free; every session
estimate.
