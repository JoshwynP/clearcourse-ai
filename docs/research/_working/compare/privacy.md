# Privacy mechanism comparison (judge's report) for Q9 (CONTRIBUTING §6.3)

> **Status:** COMPLETE draft for owner review, 2026-10-11 (checked date). Research and planning only. Sections 0–10
> all present; pre-ADR spikes (§7 T-21, T-24, T-31, T-33) not yet run.
> **Nothing here is a decision.** Every recommendation is a **PROPOSAL** for the owner to approve via an ADR
> (CONTRIBUTING §1, §6.3, §14). `P:/code/clearcourse-ai/CONTRIBUTING.md` is the source of truth; where this note
> conflicts with it, CONTRIBUTING wins. Q9 stays open until the owner decides.

## Contents

0. Inputs, evidence rules, scope
1. Executive summary (PROPOSAL)
2. Scored comparison matrix
3. Head-to-head discussion
4. Recommended mechanism "A+" (PROPOSAL), concrete specification
5. Threat-model document outline and the "limitations of anonymity" list (§6.2, §11)
6. Must-have controls
7. Negative tests that prove it (§9)
8. Open questions it depends on (existing §13 and PROPOSED new)
9. What evidence would change this recommendation
10. Verification log

---

## 0. Inputs, evidence rules, scope

**Inputs read (all 2026-10-11/12):** privacy-A (`research/privacy-A-db-enforced.md`), privacy-B
(`research/privacy-B-separated-services.md`), privacy-C (`research/privacy-C-cryptographic.md`), the red team
(`critique/privacy-redteam.md`), and the stack judge's report (`compare/stack-hosting.md`, skimmed for platform
context: its PROPOSAL is Next.js 16 + Drizzle + Supabase Free used as plain Postgres in `ca-central-1` + Vercel
Hobby, with a Cloud Run fallback; that is itself undecided, Q3).

**Evidence rules.**
- **Requirement** = text in CONTRIBUTING.md, cited `§N.N`. Nothing else is a requirement.
- **PROPOSAL** = my recommendation for the owner. It binds nothing until an ADR is approved (§1, §6.3, §14).
- **[J-n]** = a fact I re-fetched myself on 2026-10-11 (Verification log, §10). **[A Vn] / [B Fn] / [RT]** = a fact
  verified by an input note and not re-fetched by me; I rely on it only where the red team re-checked it or where it
  is not decision-critical, and say so.
- **Unverified** = not confirmed on a current official page. Never relied on as fact.
- I close no open question. New uncertainties are listed as **PROPOSED NEW** open questions (§8), numbered
  **PQ-P1…**, with cross-references to the designs' own NQ-A*, PNQ-B*, NQ-C* and the red team's NEW-* items.

**Scope split used throughout (from §6.2, §9, §3, §10).**

| Tier | Actors / channels | Source |
|---|---|---|
| **REQUIRED** | ordinary application queries; instructors; TAs; institutional admins (no *routine* linking); application logs, analytics events, error reports; DB views; exports; admin dashboards; predictable identifiers; UI and API surfaces. Also: learning a non-sharer's level, because §10 says "Students alone decide whether to share" and "Instructors receive no underlying participation activity" | §5, §6.2, §9, §3 last row, §10 |
| **STRONGER THAN REQUIRED** | the platform operator (the owner: DB console, deploy, host secrets); host, DB, auth and email vendors; holders of dumps, backups or WAL; app-server compromise; legal compulsion | not required; every gap must appear in the documented limitations (§6.2, §11) |

"Ordinary application query" is read strictly, as the red team does: anything an application runtime credential can
SELECT, **including Postgres system columns** such as `xmin`, because a later developer (or Claude) can write such a
query without touching a privileged path.

---

## 1. Executive summary (PROPOSAL; Q9 stays open)

**Recommended mechanism: "A+"**, a layered hybrid built on design A's single-Postgres, database-enforced core, with the
red team's fixes applied and the best ideas of B and C grafted on. In one paragraph:

> All five §6.1 domains live in one PostgreSQL database, each in its own schema with its own NOLOGIN owner. **No
> content row stores an author, pseudonym, tag or session** (A/B pillar P1). Per-student state (counters and per-item
> de-duplication facts) is keyed only by **keyed HMACs** under a per-course random key `K_c`. `K_c` is stored only
> wrapped, and **the HMACs are computed in a server-only "linkage" module of the app, so key material never enters
> SQL** (red team S-A2 fix). Runtime database roles have **no SELECT on any base table** in anonymous or identity
> schemas; they read through explicit-column views or definer functions, and write only through a whitelist of
> `SECURITY DEFINER` functions (A's narrow internal API, plus red team S-A1 fix). Upvotes, follows, unclear marks and
> reports are **per-item tags**, which are unlinkable across items without `K_c` (A/B). Merges re-key tags by roster
> recomputation inside one definer call (A/B). Crediting is synchronous in the posting transaction (A's Mode S) in the
> prototype, behind an interface that can switch to a **server-side daily batch** (B's batching idea, without B's
> services) if the owner wants more protection against the operator. Notifications are compute-on-read in-app and
> **one generic, content-free daily email** (A/B/C agree; red team X7). Level aggregates are **frozen snapshots on a
> fixed cadence and hidden once sharing opens**; survey text is **revealed only after the survey closes** (red team
> X2, X3). The exit survey uses A's completion flag plus shuffle-flush, with C's **blind-token survey** kept as a
> ready upgrade. At end of term the owner may crypto-shred `K_c` (Q17 option).

**Why A+ and not the others (detail in §2–§3):**

- It meets every REQUIRED-tier property the red team could attack, once the four A fixes are in (S-A1…S-A4), and its
  §9 negative tests are mostly **catalogue assertions that run in CI**, which is the cheapest reliable proof for a
  solo developer.
- B's separation buys protection mainly against the operator, which the spec does not require, at roughly twice A's
  build cost (B's own estimate ≈29–39 sessions vs A's ≈13–17, both unmeasured) and with Free-plan CPU risk. B's
  *principles* are kept; its *topology* is deferred to production, where A+'s no-cross-domain-FK rule makes the split
  mechanical (§4.12).
- C's client-held pseudonyms break or weaken §7.13 targeted email, §7.10/§7.11 integrity (token transfer, Sybil
  re-issuance) and the §6.4 option, and C's recommended H1 hybrid **stores an author pseudonym on every content row**,
  which makes past authorship recoverable by any `K_c` holder (red team F-C1). Only C's blind-token survey and its
  structural "no shared byte string across dumps" test survive into A+.

**Scores (§2, weighted, out of 100):** A+ **83.5**, A as written **74.5**, B-full **67.0**, B-lite **66.5**, C-H1 as
written **65.0**, C1 **53.5**. A+ still leads (80.0 vs B-full 69.4) when protection against the operator is weighted
three times higher; B-full wins only if that protection carries about a third of all weight (§2.4).

**What the owner must decide before the Q9 ADR** (§8): the operator trust boundary (PQ-P1 = NQ-A9/PNQ-B13/NQ-C2/
NEW-3); hide/delete credit and self-upvotes (NQ-A4/A5, PNQ-B11, NQ-C10); "Answer posted" recipients (NQ-A1, PNQ-B7);
level-aggregate cadence and differencing rule (NQ-A7, NEW-1); survey reveal timing (NEW-2); timestamp precision
(NQ-A8); plus existing Q8, Q13, Q14, Q16, Q17, Q18, Q20.

---

## 2. Scored comparison matrix

### 2.1 Options scored

| Option | What it is (as scored) |
|---|---|
| **A** | privacy-A exactly as written: one Postgres, schemas, `SECURITY DEFINER` API, keyed `pid` + per-item tags, K3 KEK passed per call, Mode S default |
| **A+** | the hybrid recommended in §4 below (A + red-team fixes S-A1…S-A4, M-A1…M-A3, X1–X7, plus grafts from B and C) |
| **B-full** | privacy-B as written: ~8 stores, 8–9 services, Gateway, LINKAGE, delayed batched credit queue (Cloudflare mapping (a), or Neon mapping (b1)) |
| **B-lite** | privacy-B §9 fallback: 5 domain stores, 4 services (Vault = LINKAGE + PARTICIPATION; Gateway = IDENTITY + SHARED + NOTIFY) |
| **C-H1** | privacy-C's own recommendation: server HMAC pseudonym **stored on content rows**, blind-token survey, two cookie-separated origins |
| **C1** | privacy-C's blind-signed, client-held per-course pseudonym (C itself rejects it for the prototype; scored for completeness) |

### 2.2 Criteria and weights (PROPOSAL; the owner may re-weight)

| # | Criterion | Weight | Why this weight |
|---|---|---|---|
| K1 | Unlinkability against the **REQUIRED** actors and channels (ordinary queries incl. system columns, instructors, TAs, admins, logs, exports, views, dashboards, predictable ids; non-sharers' levels) | 25 | §6.2, §9, §3, §10; CONTRIBUTING calls §6 "the most important section" |
| K2 | Coverage of the privacy-touching functional requirements: §7.7 merges, §7.9 counters, §7.10 sharing, §7.12 survey, §7.13 notifications, §7.16 aggregates, §6.4 optionality | 20 | §6.3: the mapping must stay unusable *while* these work |
| K3 | Failure modes: severity, silence, detectability | 10 | §6 "a mistake here violates the product's core promise" |
| K4 | Testability of the §9 negative tests (UI, API, exports, logs, predictable ids) | 10 | §9, §15 item 3 |
| K5 | Build complexity for a solo developer with Claude (mainstream, well documented) | 15 | owner constraint |
| K6 | Platform requirements and cost fit (<$5/month, free/managed tiers) | 10 | owner constraint; stack judge's PROPOSAL (Q3 open) |
| K7 | Future-proofing for production (§10–§11): portability, splittability, §6.4 escrow path, SSO/LTI untouched | 5 | owner constraint "must not paint us into a corner" |
| K8 | **Stronger than required**: operator, vendors, dump/backup holders, app compromise, legal compulsion | 5 | not a requirement; low weight, stress-tested in §2.4 |

Scale 0–5 (half points allowed). Weighted score = Σ(weight × score) / 5, out of 100.

### 2.3 Scores

| Criterion (weight) | A | **A+** | B-full | B-lite | C-H1 | C1 |
|---|---|---|---|---|---|---|
| K1 required-tier unlinkability (25) | 3.5 | **4.5** | 4.0 | 3.5 | 3.0 | 3.5 |
| K2 requirement coverage (20) | 3.5 | **4.5** | 3.5 | 3.5 | 3.5 | 2.0 |
| K3 failure modes (10) | 3.0 | **4.0** | 3.0 | 3.0 | 2.5 | 2.5 |
| K4 §9 testability (10) | 4.0 | **4.5** | 4.5 | 4.0 | 4.0 | 3.5 |
| K5 solo build complexity (15) | 4.5 | 3.5 | 1.5 | 2.5 | 3.5 | 1.0 |
| K6 platform and cost fit (10) | 4.5 | 4.5 | 2.5 | 3.0 | 4.0 | 3.5 |
| K7 production future-proofing (5) | 4.0 | 4.0 | 4.0 | 4.0 | 3.0 | 2.0 |
| K8 stronger than required (5) | 2.5 | 2.5 | 4.5 | 3.5 | 1.5 | 4.0 |
| **Weighted total (/100)** | **74.5** | **83.5** | **67.0** | **66.5** | **65.0** | **53.5** |

**Why each score (detail in §3).**

- **K1.** A loses a point for the red team's S-A1 (`xmin` on `cc_web`-readable base tables gives an exact global
  order of content and identity writes, i.e. an ordinary-query join) and S-A3 (the level time series leaks
  non-sharers' levels, §10). A+ closes both (reads only through definer functions; snapshot-only aggregates) and adds
  fixes for X2, X3 and X4. B-full removes the SQL-join class structurally, but S-B1 remains (BOARD receives one
  viewer's tag set per page view: a pseudonymous profile at the service layer, §3 "identity-linked discussion
  analytics"), as do X2/X3. B-lite also puts identity, shared results and the notification sweep behind one Gateway
  credential. C-H1 stores `author_pseudonym` on every content row, so any reader of the Board store can `GROUP BY` a
  per-student activity profile (S-C1). C1 removes stored linkage but keeps the grouping and adds the share-timing link
  (S-C2), which exposes a whole history at once.
- **K2.** A+ covers every listed requirement with a concrete mechanism and leaves only owner forks open (§8). A and B
  leave survey-then-share sequencing (X3) and the aggregate time series (X2) partly open; B adds bearer receipts
  (S-B2) and deliberate credit lag (PNQ-B1); A's Mode D has bearer tokens (S-A4). C-H1 is functionally complete, but
  its §6.4 "Default: nobody can deanonymize" holds only in name (F-C1). C1 cannot deliver targeted email (§7.13,
  S-C5), cannot guarantee "without double-counting a student" under re-issuance (§7.7, S-C4) or a "verified level"
  under token transfer (§7.10, §7.11), and corners the §6.4 option.
- **K3.** The worst silent failures: A's KEK in bind parameters (S-A2: master key + session token + content in one log
  record, invisible until someone reads the log); B's config drift and "temporary" consolidation (P-B2) while request
  logs are off; C-H1's undetectable retroactive authorship recovery by any `K_c` holder (F-C1); C1's undetectable
  token transfer and Sybil pseudonyms. A+ moves keys out of SQL, makes every lock a CI catalogue assertion, and adds a
  canary error sink.
- **K4.** B-full's binding matrix and per-DB schema scans are the most structural tests. A/A+ get nearly the same
  from Postgres catalogue assertions in one database (cheaper to run in CI), and A+ adds C's "no shared byte string
  across dumps" test (T-C1). C1's "the server ships the JS" limitation is untestable by design.
- **K5.** Session estimates are the designs' own and **unmeasured**: A ≈13–17, B-full ≈29–39, B-lite ≈22–29 (B's
  "~25 % fewer", itself a guess), C1 "High" on the riskiest UX (key recovery). A+ ≈18–25 (my estimate, §4.15,
  unmeasured).
- **K6.** A/A+ need only plain managed Postgres plus one app host. The stack judge's PROPOSAL (Supabase Free used as
  plain Postgres + Vercel Hobby, ≈USD 1.17/month per stack-hosting §1) fits, and every Postgres feature used is core
  ([J-1]…[J-5], [J-9]). B-full needs ≈8 DBs and 8–9 services: on Cloudflare Free it fits one environment only, Free's
  10 ms CPU per invocation is at risk from the email sweep (S-B4), and Workers Paid is a USD 5 *minimum* (B [F2],
  re-checked by the red team), which meets but does not beat "<$5"; Supabase Free allows only 2 active projects
  [J-6]. C1/C-H1 need two origins and `@cloudflare/blindrsa-ts`, which declares `node >=24` [J-11].
- **K7.** A/A+ have no cross-domain FKs (mechanical split later, §4.12) and a forward-only escrow path for §6.4.
  C-H1's pseudonym-on-row schema makes a later §6.4 escrow pointless because authorship is *already* recoverable, the
  wrong corner. C1 corners §6.4 and §7.13.
- **K8.** B-full is strongest (no single DB dump or console holds linkage), C1 next (no stored key), then B-lite.
  A/A+ are equal: the operator holds everything (documented limitation). C-H1 is weakest because every post's
  authorship is recoverable with `K_c`.

### 2.4 Sensitivity

| Scenario | A | A+ | B-full | B-lite | C-H1 | C1 |
|---|---|---|---|---|---|---|
| Base weights | 74.5 | **83.5** | 67.0 | 66.5 | 65.0 | 53.5 |
| K8 (operator/vendors) ×3 = 15, other weights scaled by 85/95 | 71.9 | **80.0** | 69.4 | 66.9 | 61.3 | 56.3 |
| K5 (build cost) cut to 5, other weights scaled by 95/85 | 72.7 | **85.1** | 71.4 | 68.4 | 64.4 | 57.4 |
| K1 + K2 only (weighted mean, 0–5) | 3.5 | **4.5** | 3.8 | 3.5 | 3.2 | 2.8 |

**Break-even.** B-full overtakes A+ only if K8 carries about **33 %** of all weight (solve
92.5 × (100 − w) / 95 = 2w; w ≈ 32.7), i.e. only if the owner treats protection against the operator and vendors as
roughly as important as all required-tier unlinkability put together. That is PQ-P1 (§8), the one answer that could
flip the recommendation (§9).

---

## 3. Head-to-head discussion

### 3.1 Unlinkability per threat actor

"Holds" = no usable student↔content mapping. **R** = REQUIRED tier, **S** = stronger than required (§0).

| Actor / channel | Tier | A (as written) | A+ | B-full | C-H1 | C1 |
|---|---|---|---|---|---|---|
| Ordinary app query (runtime credential, incl. `xmin`/`ctid`) | R | **Partly**: `xmin` on readable `content.*` and `identity.users` orders events globally (S-A1) | Holds: no base-table SELECT on content/identity; reads via definer functions; no-op identity upserts | Holds for SQL (separate DBs); service-layer tag sets reach BOARD (S-B1) | Holds for identity; pseudonymous profiles readable by any Board reader (S-C1) | Same grouping as C-H1, no key |
| Instructor / TA (UI, API, exports, presentation) | R | Holds; level time series leaks non-sharers (S-A3) | Holds; snapshot-only levels, close-only survey reveal, frozen presentation counts | Holds; daily histogram still a channel (S-B5) | Holds through staff APIs; but one identification (self-identifying post, classroom observation) exposes the student's whole grouped history (S-C1) | As C-H1, plus the token-then-share timing link (S-C2) |
| Institutional admin | R | Holds (no function) | Holds; impersonation excluded by construction (X6, Q7) | Holds | Holds | Holds |
| App logs, error reports, analytics | R | Holds if rules followed; error-SDK defaults not named (X1); KEK can land in DB logs (S-A2) | Holds; no third-party error SDK on content routes by default, canary sink test, no key in SQL | Holds if every Worker's observability is off (P-B1) | Holds if bodies stripped | Holds; two origins help |
| Predictable identifiers | R | Holds (UUIDv4, keyed HMAC) | Holds (+ no post-redirect GET of new id, X4) | Holds (UUIDv4, `WITHOUT ROWID` Unverified on D1) | Holds | Holds |
| Non-sharers' levels (§10 "Students alone decide") | R | Partly (S-A3, X2) | Holds subject to owner's cadence choice (NEW-1) | Partly (S-B5) | Partly | Partly |
| Single-DB dump / console holder, no key | S | Holds (tags keyed; counters pre-created) | Holds | Holds (each DB non-identifying) | Holds | Holds |
| All data + key holder (operator, legal order) | S | Votes/follows/reports linkable; authorship not stored; Mode S `xmin` gives latest action | Same; optional daily batch credit (Mode B) and nightly wash narrow `xmin`; shredding bounds it in time | Same as A for votes; queue batching narrows timing, S-B3 per-type deltas | **All authorship linkable** (F-C1) | Stored data cannot link; logs + JS can |
| Active operator / deploy rights / host vendor | S | Not protected | Not protected (documented) | Not protected | Not protected | Not protected (served JS) |
| Network/timing (host + auth + email logs) | S | Documented | Documented; X4 mitigated; 1-hour Vercel Hobby retention [J-8] | Documented | Documented | Documented |

**Reading.** On the REQUIRED tier, every design is fixable to "holds"; the differences are *how many fixes* and *how
structural* they are. A+ and B-full end up equivalent for required actors. Their only real difference is on the S
tier, where B-full is better against a holder of some but not all stores, and C1 is better against a holder of
stored data without deploy rights. Neither helps against the active operator or host, the actor who usually matters
most in a solo-run service (red team §4.1).

### 3.2 Requirement coverage

| Requirement | A | A+ | B-full | C-H1 | C1 |
|---|---|---|---|---|---|
| §7.7 merge without double counting | Roster recomputation in one definer (≈2N HMACs) | Same, done app-side in the linkage module inside one DB transaction (§4.8) | Same in LINKAGE (CPU risk on Free, S-B4) | Set union on pseudonym | Set union; Sybil re-issue breaks exactness (S-C4) |
| §7.7 preserve credit, redirects, log w/o identity | Counters untouched; redirects; ids-only audit | Same | Same | Same | Same |
| §7.9 count only q/c/u; threshold versions | Yes; pointwise-≤ rule (owner to confirm) | Same | Same | Same | Same + per-pseudonym first-version datum (M-C2) |
| §7.10 verified level, name/level/date only, revocation | Server-computed; three-column view | Same; frozen-at-share (NQ-A15 proposal) | Signed attestation; receipts are bearer (S-B2) | Server-computed | Blind level token; transferable (S-C4) |
| §7.12 survey separate, threshold, no metadata, before sharing | Completion flag + shuffle-flush; reveal live (X3) | Same + reveal after close (NEW-2) + blind-token upgrade | Batched; reveal live | Blind token; reveal live | Blind token |
| §7.13 in-app + email for all 8 events | Compute-on-read; content-free digests | Same, one generic template, daily (X7) | Same | Same | Targeted email partly unmet (S-C5) |
| §7.16 level counts only above thresholds | Gate; NQ-A7 options | Frozen snapshots, hidden from sharing open (NEW-1) | Gate; DF1–DF4 | Gate | Gate |
| §6.4 default nobody; optional audited process | Authorship impossible; forward escrow | Same | Same | Default broken for key holders (F-C1) | Strongest default; escrow corner |

### 3.3 Failure modes: severity and detectability

| Design | Worst plausible failure | Silent? | Detected by |
|---|---|---|---|
| A | KEK + session + body in one DB log line after a debugging toggle (S-A2, F9) | Yes | Only by reading logs; A's setting self-check catches the toggle, not past exposure |
| A+ | A future migration grants `cc_web` SELECT on a base table (P-A1) | No | CI catalogue assertion fails on the migration PR; daily production self-check |
| B-full | "Temporary" consolidation of Workers or a second binding (P-B2, F-1) | Partly | Binding-matrix test, if the matrix file itself is protected |
| C-H1 | Nothing fails; the capability to recover all authorship simply exists (F-C1) | Yes, by design | Nothing; only a schema rule "no author column" would catch it |
| C1 | Level-token transfer, Sybil re-issue (S-C4) | Yes | Not detectable by design |

The ranking principle I apply: a failure that a **CI test turns red** is far less dangerous for a solo developer than
one that only a careful human audit finds. A+ is built so that almost every lock is a catalogue fact Postgres can be
asked about.

### 3.4 Testability of §9

All five can run the §9 UI/API/export/log/identifier tests. The difference is the **structural** layer. B-full proves
"no store can join" by config parsing; A+ proves "the runtime credential cannot read the joinable data" by Postgres
catalogue queries (`has_table_privilege`, `pg_proc.proconfig`, `relforcerowsecurity`, `pg_roles.rolbypassrls`). Both
are deterministic and cheap in CI. A+ also imports C's dump-diff test (T-C1) and the red team's missing tests (§7).

### 3.5 Build complexity and maintenance

- **A/A+**: one database, one migration stream, one deployable app, PL/pgSQL definers. The novel parts are the
  catalogue test suite and the linkage module. Everything is core Postgres plus TypeScript.
- **B-full**: eight migration streams, a queue, receipts, RPC contracts, retries, debugging with logs off (B §9
  "the biggest day-to-day cost"). Red team: "complexity is where privacy bugs hide".
- **C1**: client key management, recovery codes, PRF browser gaps (C §8.3 "conflicting" Safari data), signed-request
  auth: custom security code on the riskiest UX path.

### 3.6 Platform and cost

A+ fits the stack judge's PROPOSAL without extra services (one Postgres, one host cron or app-triggered job). B-full
pushes toward Cloudflare Workers Paid (USD 5 minimum) or 8 Neon projects with cold starts (B §8.3, Unverified
latency). C needs nothing paid but needs Node ≥ 24 for blindrsa-ts [J-11] (an input to Q3). D1 cannot host A or A+
(§12 known issue: no schemas or RLS).

### 3.7 Future-proofing (§10–§11)

A+ keeps the five §6.1 domains in separate schemas with **no cross-domain FKs** and **separate login roles per code
path**, so a production split into separate databases or services (B's topology) is a deployment change plus
service wrappers, not a data migration (§4.12). Its `pid` and tags are opaque `bytea`, so C's client-held pseudonym
could replace the server source for a future "strong anonymity mode" (C §8.4) **without** C-H1's author column,
because A+ never keys content rows by pseudonym. The §6.4 escrow remains forward-only and visible.

### 3.8 What A+ takes from the runners-up, and what it rejects

| From | Taken into A+ | Rejected, and why |
|---|---|---|
| B | Principles P1/P3 (shared with A); "no read method receives a viewer's tags" (S-B1 fix, as a function-contract test); binding-matrix idea as a **role/secret matrix** test; daily batched credit as an optional mode; content-free digest; "every unit must declare its logging" | Physical topology for the prototype (cost, CPU, solo operability); bearer receipts |
| C | Blind-token survey as a ready upgrade (§4.9); T-C1 dump-diff test; day-coarsening and no-IP rules; honest JS-delivery limitation; opaque `bytea` pseudonym interface | `author_pseudonym` on rows (F-C1, S-C1); C1 for the prototype (§7.13, §7.7, §7.10 regressions); the unqualified "merge needs a linkable pseudonym" claim (S-C3) |
| Red team | S-A1…S-A4, M-A1…M-A3, X1–X7, X11, X12 fixes | none |

---

## 4. Recommended mechanism "A+" (PROPOSAL), concrete specification

Everything in §4 is a **PROPOSAL** for the Q9 ADR. Values the spec leaves open (bucket sizes, N, cadences, copy
text) are **not** chosen here; they are marked with the open question that owns them. Schema sketches are
illustrative, not code.

### 4.1 Pillars (A's P1–P5, amended)

| Pillar | Rule | Change from A |
|---|---|---|
| P1 no author data | No content row (question, comment, survey response, report note) stores an author, pseudonym, tag, session, IP or UA | unchanged; reinforced by rejecting C-H1 |
| P2 locked per-student state | Counters keyed by `pid`; no runtime role can SELECT them | unchanged |
| P3 per-item tags | Upvote/follow/unclear/report de-duplication by per-item keyed tags | unchanged (A = B) |
| P4 keys outside SQL | `K_c` stored only wrapped; **unwrapped and used only in the app's linkage module**; no key, KEK or unwrapped `K_c` ever appears as a SQL parameter, setting or log field | **new** (S-A2) |
| P5 narrow, role-split API | Locked data reached only through `SECURITY DEFINER` functions; **no runtime role has SELECT on any base table in an anonymous-content or identity schema**; credit/tag-bearing functions callable only by the linkage module's own login role | **new** (S-A1, B's restricted roles) |
| P6 snapshot-only outputs | Level distribution, survey results and presentation counts are frozen snapshots, never live reads | **new** (S-A3, X2, X3, X5) |

### 4.2 Stores (one Postgres database, one schema set per §6.1 domain)

| §6.1 domain | Schema(s) | Holds | Readable by a runtime role? |
|---|---|---|---|
| (catalogue, not a §6.1 domain) | `catalog` | institution config, courses, assignments, cards, card versions (§7.3–§7.6) | `cc_web`: SELECT with RLS (staff writes are not anonymous) |
| 3 identity and enrolment | `identity` | users (no activity timestamps), enrolments incl. `dropped` and tombstones (X12), staff permissions, notification preferences | **No base-table SELECT**; read via `api.*` read functions |
| 3 (auth library) | `auth_private` | the auth library's session/account/verification tables (Q4) | only `cc_auth` (§4.3, §6 control C-14) |
| 3 (sessions) | `identity_private` | session token hashes for definer-side resolution (if the auth library's table is not reused) | none |
| 1 anonymous content | `content` | questions, comments, answers, redirects, merge events, snapshot tables for presentation mode | **No base-table SELECT**; read via `api.read_*` |
| 1 (tags) | `content_tags` | upvote, follow, unclear, report tags | none |
| 2 private counters | `participation`, `keys` | counters, threshold versions, policies, course state, level notices, pending credit (Mode B only); wrapped keys | none (`keys` only via `cc_link`) |
| 4 shared results | `shared` | `results(course_id, user_id, verified_level, threshold_version_id, shared_on date, finalized_on date)` | via `api.instructor_shared` only |
| 5 exit survey | `survey`, `survey_private` | instances, buffer, responses; completions | none |
| cross-cutting | `audit`, `notify`, `ratelimit`, `snapshots`, `api`, `jobs` | ids-only moderation events; email outbox (deleted after send); HMAC-keyed buckets; frozen aggregates; functions | none (functions only) |

**Rules.** No cross-domain foreign keys except into `catalog` (A §2.2), with the single intended exception
`shared.results.user_id` (§7.10 requires the name). Nothing is created in `public`. If the database is Supabase, the
Data API is disabled ("none of the auto-generated REST endpoints respond, regardless of grants or RLS" [J-10]) and
default grants are revoked, because existing projects grant `anon`/`authenticated`/`service_role` table privileges in
`public` by default [J-10].

### 4.3 Roles and code paths

| DB role | Login | Used by | May do | May not |
|---|---|---|---|---|
| `cc_owner` | no | migrations only (via `cc_migrate`) | own every schema/table; FORCE RLS on locked tables | run at runtime |
| `cc_fn_board`, `cc_fn_merge`, `cc_fn_particip`, `cc_fn_survey_in`, `cc_fn_survey_out`, `cc_fn_notify`, `cc_fn_read`, `cc_fn_session` | no | own the definer functions, one owner per function group (A §2.1) | only the table rights their group needs | anything else; `cc_fn_survey_out` has no SELECT on `survey_private` |
| `cc_web` | yes | every ordinary route (cards, board reading, staff moderation that needs no tags) | SELECT on `catalog`; EXECUTE on the read and staff whitelist | SELECT on any base table outside `catalog`; EXECUTE on any credit- or tag-bearing function |
| **`cc_link`** | yes | **only the linkage module** (one server-only file group, its own pool and secret) | EXECUTE on ask, comment, upvote, follow, unclear, report, my-state, my-participation, share, merge, notification compute, and `keys.get_wrapped` | anything else |
| `cc_auth` | yes | the auth library and sign-in callback only | its own `auth_private` tables; `api.create_session` | `content`, `participation`, `survey`, `keys` |
| `cc_jobs` | yes | scheduled jobs (snapshots, digests, wash, shredding, survey flush) | EXECUTE on `jobs.*` only | everything else |
| `cc_migrate` | yes (CI only) | migrations | member of `cc_owner` | runtime use; never in the app's env |
| platform admin (e.g. Supabase `postgres`) | yes | the operator | bypasses RLS (per A [V12]; superusers and `BYPASSRLS` roles always bypass RLS [J-3]) | n/a: documented limitation |

This matches the stack judge's "separate LOGIN role and secret per domain" proposal (stack-hosting §8 item 1). Each
role gets `rolbypassrls = false`, no membership in `pg_read_all_data`, and role-level settings that pin
`log_statement = none` and `log_min_duration_statement = -1` where the platform lets roles set them (both settings
need superuser or the `SET` privilege to change [J-5]).

**Why `cc_link`.** If `cc_web` could call `api.upvote(session, q, tag)` directly, a SQL injection anywhere in an
ordinary route could forge tags (vote stuffing) once tags are computed outside SQL. Granting the tag-bearing
functions only to a role whose credential lives in one small, parameterised-only module confines that risk. It is
B's "restricted service roles" idea applied inside one process. It does **not** protect against full app-server
compromise (one process holds every credential, like B's mapping b3); that is an S-tier limitation (§5).

### 4.4 Keys and the linkage module

| Key | Generation | Storage | Used where | Rotation / destruction |
|---|---|---|---|---|
| KEK | 32 random bytes, generated offline by the owner | host secret store, production only; separate KEK per environment (A F8) | linkage module, at unwrap time only | rotate by re-wrapping all `K_c`; production: move to a KMS (A's K4) |
| `K_c` per course (+ `key_version`) | 32 random bytes from the runtime CSPRNG, at course creation (RFC 2104: key ≥ hash length L, random) | `keys.course_keys(course_id, key_version, wrapped bytea, created_on date, destroyed_on date)`, AEAD-wrapped (AES-256-GCM) under KEK | linkage module only, in memory, per request | crypto-shred at seal (§4.14) |
| Sub-keys | HKDF-SHA-256 from `K_c` with fixed labels `pid`, `up`, `follow`, `unclear`, `report`, `seen` (B §2.1) | never stored | linkage module | die with `K_c` |
| `K_rl` | global, random, wrapped like `K_c` | `keys.global_keys` | rate-limit subject `HMAC(K_rl, user_id ‖ action)` | rotate freely (buckets are short-lived) |

**Derivations** (fixed-width inputs, 16-byte UUIDs): `pid = HMAC(K_pid, user_id)`;
`up_tag = HMAC(K_up, user_id ‖ canonical_question_id)`; `follow_tag = HMAC(K_follow, user_id ‖ question_id)`;
`unclear_tag = HMAC(K_unclear, user_id ‖ answer_id)`; `report_tag = HMAC(K_report, user_id ‖ content_id)`. Never an
unkeyed hash (§12 known issue).

**Why app-side and not pgcrypto/Vault.** pgcrypto's own documentation says "all the data and passwords move between
`pgcrypto` and client applications in clear text" and "If you cannot [trust the DB administrator], then better do
crypto inside client application" [J-7]. Supabase Vault keeps its root key outside the database, but "anyone that has
access to the [decrypted_secrets] view has access to decrypted secrets" and the Management API returns the root key
[J-12], and it is Supabase-only. App-side HMAC keeps the master key out of every DB log path (S-A2) and is portable.
Vault (A's K2) stays an owner option if the Q3 ADR fixes Supabase long-term.

**Linkage module contract (illustrative).**

```
// server-only; imported only by route handlers that need credit or tags; lint rule forbids other imports
linkage.ask(session, course, tagKind, assignmentId, title, body):
    user := auth.verify(session)                       // auth library, no DB write (refresh disabled, C-14)
    K    := unwrap(cc_link: keys.get_wrapped(course))  // cached per request only
    return cc_link: api.ask_question(session_hash, course, tagKind, assignmentId, title, body,
                                     pid = HMAC(K_pid, user), rl = HMAC(K_rl, user‖'ask'))
    // definer: resolve session_hash → user (enrolled? active?), rate limit by rl, INSERT question (no author),
    //          Mode S: UPDATE counters SET questions+1 WHERE pid = $pid AND course = $c  (row must exist)
linkage.upvote(session, q):   tag := HMAC(K_up, user ‖ canonical(q)) → api.upvote(..., tag, pid, rl)
linkage.myUpvoteState(session, ids[]):  the app computes the viewer's tags; the definer returns the
    full tag set for those ids and the APP tests membership (B's S-B1 fix applied: no read function
    accepts one viewer's tag list as input)
```

The definer re-resolves the session and checks enrolment, so a caller cannot act for another student, and rejects a
`pid` that has no pre-created counter row for that course (counters are pre-created at enrolment, A §3 item 1).

### 4.5 Function whitelist (the "narrowly scoped internal API", §6.2)

All functions: `SECURITY DEFINER`, `SET search_path = ''` (or trusted schemas then `pg_temp` last, as the
PostgreSQL docs recommend [J-4]), schema-qualified names, `REVOKE ALL … FROM PUBLIC` and selective GRANT **in the
creating transaction** (EXECUTE is granted to PUBLIC by default for new functions [J-4]), no dynamic SQL, generic
parameter-free error messages, minimum return data, `ON CONFLICT DO NOTHING` instead of unique-violation errors.

| Group | Functions (all take a session reference first) | Caller role | Returns |
|---|---|---|---|
| Board writes (credited) | `ask_question`, `post_comment`, `upvote` | `cc_link` | new id / new total; never pid or tag |
| Board writes (tags, not credited, §7.9) | `follow`, `mark_unclear`, `report` | `cc_link` | ok |
| My state | `item_tag_sets(ids[])` (returns tag sets for the app to test), `my_participation(course)` | `cc_link` | tag sets for those items only; own counts, level, current + original thresholds (§7.10) |
| Sharing | `share_level`, `revoke_share`, `instructor_shared`, `finalize_shared` | `cc_link` (share/revoke), `cc_web` (instructor list, finalize) | name, level, date shared only (§7.10) |
| Enrolment hook | `precreate_counter(course, pid)`, `tombstone_enrolment` | `cc_link` (called by roster sync, Q5) | ok |
| Reads | `read_board(course, filter, sort, page)`, `read_question(id)`, `read_search(course, q)`, `me()`, `course_roster_for_staff(course)` | `cc_web` | explicit column lists; hidden/removed excluded per role (§7.14) |
| Staff moderation (no tags) | `answer`, `pin`, `recategorize`, `hide`, `delete`, `resolve`, `reopen`, `select_for_presentation`, `moderation_queue` | `cc_web` | ok; queue shows item, reason codes, notes, counts, never tags (§7.7, §7.8) |
| Merge | `merge_fetch(A, B)`, `merge_commit(A, B, new_up_tags, new_follow_tags)` | `cc_link`, same transaction | §4.8 |
| Thresholds / grading | `publish_thresholds`, `publish_grading_scheme` | `cc_web` | version id; rejects disadvantaging changes (§7.9, §7.11) |
| Survey | `submit_survey`, `has_completed`, `survey_results` | `cc_web` (no linkage key needed) | ok / boolean / gated results after close (§4.10) |
| Analytics | `course_analytics(course)` | `cc_web` | latest frozen snapshot only (§4.11) |
| Notifications | `notification_inputs(course)` (followed-item updates since a day bucket, merge events, broadcasts) | `cc_link` | data the app filters by the viewer's tags in memory (§4.9) |
| Session | `create_session` | `cc_auth` | token |
| Jobs | `jobs.snapshot_*`, `jobs.digest_*`, `jobs.wash`, `jobs.survey_flush`, `jobs.seal_course`, `jobs.privacy_selfcheck` | `cc_jobs` | counts only |

Any new function needs an ADR note and an entry in the whitelist test (§7 T-08).

### 4.6 What is never stored

- No author, pid, tag, session, IP or user agent on questions, comments, answers-by-students, survey responses or
  report notes (P1). No "OP" marker, no "my posts" list (NQ-A2).
- No timestamps on counters, tags, completions, survey responses or pending credit.
- No activity timestamps in `identity` (no last-seen, last-login); no sliding session expiry (§4.7).
- No unwrapped key, KEK, or derived sub-key in any table, setting, parameter or log.
- No sequential/serial ids or sequences in anonymous schemas; no per-course "#14" numbering; UUIDv4 only.
- No question id, title or text in any email, outbox row or notification URL.
- No per-viewer tag list sent into any read function (S-B1).
- No email outbox row after it is sent (M-A1).
- No live (per-request) level distribution, survey result or presentation counter (P6).

### 4.7 Timestamp policy

| Data | Stored precision | Who can read | Basis |
|---|---|---|---|
| `content.questions.created_at`, `comments.created_at`, `last_activity_at` | coarsened bucket; bucket size is **NQ-A8** (options: 15 min, 1 h, 1 day) | read functions only (no `xmin` reachable) | content time anchors every timing attack |
| "Most recent" sort (§7.14) | bucket, ties broken by a random per-row key | n/a | avoids exact order |
| UI display of post time | no finer than the stored bucket (copy is the owner's) | everyone | NQ-A8 |
| Counters, tags, pending credit, completions, survey responses | **none** | locked | §7.10 "dates" not shared; §7.12 "no unnecessary metadata" |
| `identity.users`, `enrolments` | no activity timestamps; roster/sign-in upserts are **no-op when unchanged** (S-A1 fix 1) | read functions | prevents "last login xid" |
| Auth library sessions | **refresh disabled** (Better Auth exposes `disableSessionRefresh: true`; by default it slides expiry every `updateAge` [J-13]); the library's `ipAddress`/`userAgent` fields left empty or the table kept readable only by `cc_auth` (whether the fields can be suppressed is **Unverified**) | `cc_auth` only | session `createdAt`/`updatedAt` would otherwise be a login/activity clock |
| `shared.results.shared_on`, `finalized_on` | date | instructor (shared_on only) | §7.10 "date shared" |
| `audit.moderation_events.occurred_on` | date (finer only if Q14 requires it) | staff via function | §7.7, §7.17 |
| `notify.email_outbox.not_before` | digest date; row deleted after send | none | email time ≠ action time |
| `ratelimit.buckets.bucket_start` | window start; deleted after window | none | Q20 |
| `snapshots.*.taken_on` | date | staff via function | §4.11 |
| Postgres `track_commit_timestamp` | **off** (default off, server-start only, per A [V5]); asserted by T-06 | n/a | otherwise `xmin` becomes a commit time |
| Ids | UUIDv4 only: v7's first 48 bits are a millisecond Unix timestamp, and RFC 9562 says UUIDs "MUST NOT be used as security capabilities" and v4 "SHOULD be utilized" for security uses [J-9] | n/a | §9 predictable identifiers |
| `xmin` hygiene | nightly `jobs.wash`: one transaction rewrites live rows of `participation.counters` and `content_tags.*` (and, if the spike shows it helps, `content.*`) so they share one `xmin`; effect on dead tuples, `CLUSTER` and WAL is **Unverified** | n/a | narrows the operator-level Mode S channel (A §4.1) |

### 4.8 Merge algorithm (§7.7; §10 "Duplicate merging preserves counts correctly")

```
linkage.merge(session, A, B):                    // A merged INTO B; one DB transaction as cc_link
  BEGIN
  f := api.merge_fetch(session_hash, A, B)
       // definer: caller is instructor or TA with moderation permission in this course (§5);
       // A, B same course, both canonical (not already merged), A ≠ B; locks both rows FOR UPDATE;
       // returns upA, upB, folA, folB (tag sets), roster = ever-enrolled student ids incl. dropped
       //          and tombstoned (X12, M-B4); never names
  K := unwrap(course key)
  newUp := {}; newFol := {}
  for u in f.roster:                               // ≈ 4N HMACs in app memory; nothing logged
     if HMAC(K_up, u‖A) ∈ f.upA:      newUp  += HMAC(K_up, u‖B)
     if HMAC(K_follow, u‖A) ∈ f.folA: newFol += HMAC(K_follow, u‖B)
  orphans := f.upA − {HMAC(K_up,u‖A) : u ∈ roster}  // expected empty because of tombstones
  api.merge_commit(session_hash, A, B, newUp, newFol, orphans)
       // definer, same transaction:
       //  INSERT upvote(B, t) ON CONFLICT DO NOTHING for t in newUp;   carry orphans over unchanged
       //  DELETE upvote(A); same for follows
       //  UPDATE comments SET question_id = B WHERE question_id = A        (§7.7 preserve comments)
       //  answers on A: move to B (proposal; NQ-A6) — unclear tags are per-answer, so they stay valid
       //  INSERT question_redirects(A → B); compress chains (new_id = A → B)
       //  A.status = merged, A.merged_into = B
       //  B.upvote_total = count(upvote(B))                                 (no double counting)
       //  INSERT content.merge_events(id, course, A, B, occurred_on = current_date)
       //  INSERT audit.moderation_events(course, 'merge', {A,B}, actor_ref per NQ-A11, occurred_on)
       //  counters: NOT TOUCHED                                             (§7.7 preserve credit)
  COMMIT
```

- A student who upvoted both A and B ends with one tag on B; any later upvote of A (redirected) or B hits the same tag.
- Whether that student keeps two "upvotes given" credits is **NQ-A6 / PNQ-B2 / NQ-C6** (proposal: keep both, since
  §7.7 says "preserve").
- Upvote `orphans` exist only if a roster row was deleted (Q17 R3); tombstones keep merges exact until seal.
- The merge writes no counter row and no identity row, so it creates no timing link to any student (A §3 item 3).
- Cost is ≈ 4N app-side HMACs per merge (N = ever-enrolled students); timing is **Unverified** and is part of the
  pre-ADR spike (§7 T-31).

### 4.9 Notification policy (§7.13; recipients and essential set are open)

| §7.13 event | Recipient (proposal; spec silent where marked) | In-app | Email |
|---|---|---|---|
| Answer posted | **followers** of the question (NQ-A1/PNQ-B7 open). **No auto-follow on asking** by default: an auto-follow tag is the asker's tag, so any `K_c` holder could recover every question's author by roster test, which breaks P1 (NQ-A13) | compute-on-read | generic daily digest |
| Followed question updated | followers | compute-on-read | generic daily digest |
| Question merged | followers of A (re-keyed to B in the merge) | derived on read from `merge_events` + follow tag | generic daily digest |
| Participation level reached | the student | compute-on-read vs `level_notice.last_acknowledged_level` (written at viewing time, not action time) | nightly batch, **no level in the body**, or in-app only (Q13, M-A3) |
| Assignment card changed, Course card changed (§7.6 "Affected students are notified") | all enrolled | ordinary rows | broadcast |
| Survey available, Sharing window open | all enrolled | ordinary rows | broadcast |

**Compute-on-read.** The linkage module asks `notification_inputs` for followed-item updates since the viewer's seen
bucket, computes the viewer's follow tags for those items, and keeps the matches in memory for the response only.
No per-user notification row ever holds a question id.

**Seen marker (M-A2 fix).** Stored in a locked table keyed by `HMAC(K_seen, user_id)` at **day** precision, or kept
client-side only; never a `cc_web`-readable per-user timestamp. Owner choice; the client-side option loses
cross-device state.

**Email (provider is Q6).**
1. One **generic template** for every content-related notice; its wording is owner copy (not invented here) and
   must name no question, event type or text (X7; NEW-7). Whether the course code appears is an owner decision (A §3
   item 7 notes it reveals enrolment to the provider).
2. **Fixed-time daily digest**: one `jobs.digest` transaction per day roster-tests follow tags for items updated
   that day and enqueues content-free outbox rows; the outbox row is **deleted after send** (M-A1).
3. Links go to a generic `/notifications` page, never `/q/<id>`.
4. Provider open/click tracking off (per-provider facts **Unverified**; belongs to Q6).
5. Users manage nonessential notifications (§7.13); which are essential is **Q13**.

### 4.10 Survey separation (§7.12; §10 "anonymous and technically separate")

| Step | Mechanism |
|---|---|
| Separate stores | `survey` (instances, buffer, responses) and `survey_private` (completions) in their own schemas; no runtime role reads either; the results function's owner (`cc_fn_survey_out`) has no SELECT on `survey_private` |
| Submit | `api.submit_survey(session, instance, a1, a2, a3)`: checks enrolment and that the instance is open; inserts `completions(instance, user)` (no time) and `buffer(instance, a1, a2, a3)` (no identity, no time); earns no credit, never touches `participation` (§7.12) |
| Shuffle-flush | when the buffer holds ≥ k rows and at close, one `jobs.survey_flush` transaction moves rows to `responses` in random order; k defaults to the reveal threshold (Q16) |
| Reveal (NEW-2) | **only after the survey closes**, all at once, and only if `count ≥ reveal_min_n` (configurable per §7.12; default is Q16); texts in random order; counts and texts are never refreshed while the survey is open (X3) |
| Ordering vs sharing | the UI presents the survey before sharing (§7.12) and survey availability never depends on sharing; because results appear only after close, a new survey text can no longer be seen arriving beside a new named share (X3) |
| Metadata | none stored; the client renders the thank-you from the POST response (no GET of a new id, X4) |
| Duplicates | completion flag prevents a second submission; whether duplicate prevention is wanted is **NQ-A14 / PNQ-B9** |
| Upgrade (graft from C) | blind-token survey (RFC 9474 blind RSA via `@cloudflare/blindrsa-ts` 0.4.6, Apache-2.0, `node >=24` [J-11]): identity side records only "issued", survey side stores a spent-token hash; removes even the operator-level completion↔buffer `xmin` link; needs a client-side delay before submission (M-C5). Adopt if PQ-P1 says the operator is out of the trust boundary, or if a UW review asks for it |

### 4.11 Aggregate suppression and snapshot outputs (§7.16, §7.8; N is Q16)

| Output | Source | Rule (PROPOSAL) |
|---|---|---|
| Content totals (§7.16: questions, comments, upvotes, unanswered, Course vs assignment, % resolved) | `snapshots.content_totals`, written by `cc_jobs` on the same cadence as levels | frozen snapshot, never live (removes the "Total upvotes ticks up while one student taps a phone" channel, A §3 item 11) |
| Level distribution (§7.16 "shown only when aggregation thresholds are met") | `snapshots.levels(course, taken_on, no_record, contributor, sustained)`, computed from counters by `cc_jobs` | (1) cadence fixed by the owner: weekly-with-lag, or **one end-of-term snapshot only** (NEW-1); never on demand; (2) whole distribution suppressed unless enrolment ≥ N **and** every non-empty level ≥ N (cell-level suppression is not enough, because No Record = enrolled − the others); (3) **hidden from the moment the sharing window opens** (Q18) and never shown beside shared results (A's NQ-A7 option (a)); (4) after sharing is final, nothing newer than the last pre-window snapshot is shown |
| Shared results | `shared.results` via `instructor_shared` | name · verified level · date shared only (§7.10) |
| Survey aggregates | `survey_results` | after close only, ≥ `reveal_min_n` (§4.10) |
| Presentation mode (§7.8) | `content.presentation_snapshot` written when staff select a question | upvote total, answer and status as of selection; no live increments (X5; NQ-A18); never counts, reports, hidden comments or moderator notes (§7.8 exclusions) |

Rejected for the prototype: differential-privacy noise (A's NQ-A7 (c), B's DF4: principled but hard to explain to
this audience). The owner may still drop the level distribution entirely, which needs confirmation because §7.16 lists
it (A's option (d)).

### 4.12 Crediting modes and the production evolution path

| Mode | Mechanism | Who can still link a counter change to a post | UX | Status |
|---|---|---|---|---|
| **S, synchronous** | credit in the posting transaction | operator/physical-copy holder: content row and counter row share `xmin` until the student acts again or the nightly wash runs (A §4.1) | instant counts | **prototype default (PROPOSAL)** |
| **B, daily batch** (B's idea, no extra services) | posting transaction inserts content plus `participation.pending(id, course, kind, sealed_pid = AEAD(K_c, pid))`; one `jobs.apply_credit` transaction per course per day unseals (via the linkage module), increments counters in random order, deletes pending rows | `K_c` holder only, and only until the daily batch (then only dead tuples/WAL); per-type deltas visible only within one day (S-B3 analogue) | counts lag up to a day; needs owner copy (PNQ-B1) | upgrade switch; same tables otherwise |
| D, client token | A's Mode D with the S-A4 fix (token bound to `hash(token ‖ session_token_hash)`, redeemed or discarded on sign-out) | closes the logical `xmin` link | device-bound; tokens lost with browser storage | not recommended (bearer-token and shared-device issues, NEW-5) |

All modes keep the same schema, so switching is a function change. **Production evolution** (each step an ADR,
none decided):
1. KEK → cloud KMS with separated duties (A's K4).
2. Mode S → Mode B if the owner wants less operator exposure (PQ-P1).
3. Survey → blind-token survey (§4.10).
4. Schemas → separate databases or services (B's topology) if a UW security review requires physically separate
   stores; mechanical because there are no cross-domain FKs and each code path already has its own role and secret.
5. An institution-configurable "strong anonymity mode" could replace the `pid`/tag source with C1's client-held
   pseudonym, still **without** any pseudonym on content rows (C §8.4, corrected per S-C1/F-C1).
6. §6.4 exceptional process only if institutional policy requires it: forward-only escrow (A §3 item 14) with k-of-n
   offline key shares, external write-once audit log, published explanation (§11), notification rules (§6.4).

### 4.13 Integrity forks the owner must decide before the Q9 ADR

A+ (like A and B) stores no author link, so the following are **consequences, not choices made here**:

| Fork | A+ default consequence | What the alternative costs | Open question |
|---|---|---|---|
| Hide/delete and earned credit | credit for hidden or deleted content stands; bounded by rate limits (Q20) and moderation | an encrypted per-item credit reference (`AEAD(K_c, pid)`) resolvable by a definer: re-introduces authorship recoverable by key holders (weakens P1); any revocation must be a human action, never automatic (§3) | NQ-A5, PNQ-B11, NQ-C10 |
| Self-upvotes | cannot be blocked | an author tag per question (weakens P1) | NQ-A4 |
| Upvote withdrawal | not offered (§7.7 lists "upvote" only) | tag delete + counter semantics | NQ-A3, PNQ-B2 |
| Edit/delete own post, "my questions" | not possible | a client-held edit capability (bearer) or a stored link | NQ-A2 |
| Repeat anonymous abuser | moderation and rate limits only, which matches §6.4's preference | "sanction without reveal" escrow handle (weakens P1) | NQ-A12, PNQ-B8 |
| Shared level frozen or live until finalised | frozen at share time; student may revoke and re-share (proposal) | live recomputation | NQ-A15 |
| Threshold "disadvantage" reading | new version must be pointwise ≤ the previous one once participation starts | other readings | §7.9 reading, PNQ-B5, NQ-C7 |

### 4.14 End-of-term options (Q17 retention, Q18 trigger; options only)

| Option | Action at seal (after sharing is final, Q18) | What remains | Caveats |
|---|---|---|---|
| R0 keep | nothing | everything; the latent operator capability for votes/follows/reports persists | — |
| **R1 crypto-shred** (PROPOSAL for discussion) | `jobs.seal_course`: delete the wrapped `K_c` rows; delete `content_tags.*` keeping plain totals; delete counters, level notices, pending credit, completions, seen markers, rate-limit rows; drop tombstones | authorless content, totals, shared results (name, level, date, as grading needs), anonymous survey responses, ids-only audit | effective only after every copy of the wrapped key **and** the KEK history expires: Supabase Free has no automatic backups [J-6], but vendor-internal copies/WAL are **Unverified**; paid tiers keep daily backups (per A [V19]); state this in the limitations (X11) |
| R2 R1 + content deletion after a set period | also delete content | minimal | Q17 policy |
| R3 mid-term account deletion | tombstone the enrolment (keep the id for merges until seal), delete identity attributes | merges stay exact (X12) | full deletion before seal loses merge exactness for that student's tags |

Shredding must never rely on rotating the KEK alone, because old wrapped rows in backups stay decryptable under the
old KEK if that KEK is retained anywhere.

### 4.15 Build estimate (unmeasured planning guess)

| Work item | Sessions |
|---|---|
| A's privacy core (A §9: schemas, roles, catalogue suite, sessions, board, merge, participation, survey, notifications, log tests, threat-model write-up) | 13–17 |
| Read path through definer functions instead of ORM table reads (S-A1) | +1–2 |
| Linkage module, `cc_link` role, wrapped keys in app, key rotation runbook (S-A2) | +1–2 |
| Snapshot jobs, survey reveal-after-close, presentation snapshots (S-A3, X2, X3, X5) | +1 |
| Extra negative tests from the red team (§7 T-21…T-36) and the canary error sink (X1) | +1–2 |
| Pre-ADR spikes (§7 T-21, T-24, T-31, T-33: system columns, auth-session fields, merge timing, pooler logging) | +1 |
| **Total** | **≈18–25** (vs A ≈13–17, B-full ≈29–39; both also unmeasured) |

---

## 5. Threat-model document: outline and the "limitations of anonymity" list (§6.2, §11)

The threat model and the limitations of anonymity are a deliverable (§6.2, §11). Its **format and location are Q8**
(open). §6.3 says the Q9 ADR and the threat model must exist "before any content or participation code is written".
Proposed outline (PROPOSAL):

| # | Section | Content | Feeds from |
|---|---|---|---|
| 1 | Status and scope | version, date, owner approval, link to the Q9 ADR; prototype vs production differences | §1, §14 |
| 2 | System overview | the five §6.1 domains, schemas, roles, code paths, key flow, data-flow diagram (§4.2–§4.4 here) | §6.1 |
| 3 | Assets | identity, anonymous content, linkage facts (pids, tags, counters, completions), levels, shared results, survey text, keys, logs, backups | §6.1, §7 |
| 4 | Trust boundaries and assumptions | whether the operator is inside the boundary (PQ-P1); vendor list with regions and log retention (Q3, Q4, Q6) | §12 |
| 5 | Actors and capabilities | REQUIRED vs stronger-than-required table (§3.1 here) | §5, §6.2, §9 |
| 6 | Threats and mitigations per actor and per channel | each with a control id (§6 here) | red team, A §4, B §4, C §4 |
| 7 | Side channels | system columns and physical order, timing (content buckets vs sign-in logs), email timing, network/IP, classroom observation, small classes, stylometry, differencing of aggregates, survey-then-share | A §4.1, red team X1–X12 |
| 8 | Residual risks | what is not mitigated and why (cost, solo operator, web-delivered code) | red team §4.1 |
| 9 | **Limitations of anonymity** | the list below, in plain language; the user-facing explanation is derived from it (copy is the owner's) | §6.2, §11, §8 "explicit anonymity explanations" |
| 10 | Vendor log inventory | one *captured* real log entry per platform (host, DB, auth, email) with its field list and retention (stack-hosting §9 proposal) | §3, §6.2 |
| 11 | Key management and incident response | KEK custody, rotation, leak response (rotate `K_c`, re-tag by roster), app-compromise response, shredding | §4.4, §4.14 |
| 12 | Deanonymization stance | default nobody (§6.4); the exceptional process only if policy requires, with all six §6.4 conditions | §6.4, §11 |
| 13 | Controls ↔ tests traceability | every control → negative test id (§7 here) → §9/§10 item | §9, §10 |
| 14 | Change control | any change to roles, grants, definers, logging, error/analytics SDKs, notification templates or timestamp precision needs an ADR note and a threat-model update | §14, §15 item 6 |
| 15 | Open questions | the §8 list here, kept in sync with CONTRIBUTING §13 | §13 |

### 5.1 Limitations of anonymity the document must contain

Content, not copy (the owner words it; nothing here is user-facing text). Items marked (P) apply to the prototype's
proposed platform choices and change with Q3/Q4/Q6.

1. **The server knows who is posting at the moment of posting**, in order to credit the private counter. It does not
   store who wrote a question or comment.
2. **The operator and the hosting, database, authentication and email vendors are trusted** (unless PQ-P1 decides
   otherwise). Someone who controls the deployment could change the software to record future activity. Nobody can
   protect a web app against the party that ships its code.
3. **With full database access plus the application's keys**, someone could reconstruct who upvoted, followed,
   reported or marked unclear which items, each student's counts, and (in synchronous crediting) each student's most
   recent credited action. Instructors, TAs and administrators cannot do this through the app.
4. **Legal process** can compel whatever exists at the time, including logs within their retention.
5. **Destroying the course key at end of term** (if R1 is adopted) makes these records permanently unlinkable only
   after backup and history copies expire (X11).
6. **Network and timing metadata** (IP address, time) is recorded by the host, auth and email providers; someone
   holding those logs could correlate activity statistically. (P) Retention on the proposed stack: Vercel Hobby
   runtime logs 1 hour [J-8]; Supabase Free API and database logs 1 day, auth audit logs 1 hour [J-6]; auth and email
   providers per Q4/Q6.
7. **Writing can identify the writer**: self-identifying details, writing style, being observed typing in class,
   and very small classes cannot be engineered away.
8. **Post times are shown approximately** (NQ-A8); posting right after an in-person conversation can still give
   someone away.
9. **Survey written responses** appear only after the survey closes and only above the minimum count (Q16, NEW-2);
   in a small class they may still be recognisable.
10. **Level aggregates** appear only as periodic snapshots above a minimum count and are hidden once sharing opens
    (NEW-1), so that non-sharers' levels cannot be inferred; the residual risk in very small classes remains.
11. **Sharing reveals exactly name, verified level and date shared** (the verbatim §7.10 text applies).
12. **Emails never contain question text or say which question they concern**; the email provider learns that a
    notification was sent and on which day.
13. **Moderators cannot see who posted** content; as a consequence, credit already earned for hidden content stands
    and self-upvotes cannot be blocked (pending NQ-A5, NQ-A4).
14. **Presentation mode** shows questions to the room; people near a student can see that student's screen.
15. **Deanonymization**: by default nobody can deanonymize (§6.4). If an institution ever enables the exceptional
    process, it applies only to content posted after a published notice.
16. **No impersonation** of students exists (Q7); if a support procedure is ever approved, it excludes privacy
    surfaces by construction (X6).
17. **No third-party error-reporting or analytics tool** runs on pages that receive anonymous content (if NEW-4 is
    answered that way); any later change is announced through this document.
18. **Grouping is not stored**: the system cannot tell that two posts came from the same anonymous student; it can
    tell that the same student did not upvote one question twice. (This contrasts with C's limitation 1 and should be
    stated because students may assume either.)

---

## 6. Must-have controls (PROPOSAL; each maps to tests in §7)

| Id | Control | Closes | Tests |
|---|---|---|---|
| C-01 | No author/pid/tag/session/IP/UA column on any anonymous table; column **allow-list** per anonymous table (not a name regex, P-A1) | P1, F-C1, S-C1 | T-02 |
| C-02 | No runtime role has SELECT on any base table outside `catalog`; reads only through definer functions with explicit column lists | S-A1 | T-01, T-21 |
| C-03 | Two locks on locked tables: no grants **and** ENABLE + FORCE RLS with policies only for `cc_fn_*` (no policy = default deny [J-3]) | A F1 | T-05, T-12 |
| C-04 | Definer hygiene: `search_path` pinned, owner `cc_fn_*`, no PUBLIC EXECUTE (revoked in the creating transaction [J-4]), `ALTER DEFAULT PRIVILEGES` revoke, exact EXECUTE whitelist per role | A F2–F4, P-A3 | T-04, T-08 |
| C-05 | `rolbypassrls = false`, no `pg_read_all_data` membership, tables owned by `cc_owner` (not the platform admin) | A F5, F7 | T-06 |
| C-06 | Keys only app-side: wrapped `K_c` readable only via `cc_link`; KEK only in the production host secret store, one per environment; no key material in SQL parameters, settings or logs | S-A2, A F8 | T-17, T-20 |
| C-07 | Credit- and tag-bearing functions callable only by `cc_link`; the linkage module is the only importer of that credential (lint rule) | SQLi tag forgery | T-08, T-22 |
| C-08 | No read function accepts a viewer's tag list; the app tests membership | S-B1 | T-23 |
| C-09 | Identity upserts are no-ops when unchanged; no activity timestamps in identity; the auth library's session refresh disabled and its session table readable only by `cc_auth` | S-A1 (1), M-B1 analogue, [J-13] | T-21, T-24 |
| C-10 | Logging invariants: `log_statement = none`, `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0` (defaults per [J-5]); `track_commit_timestamp = off`; ORM/driver query logger off in production; bind parameters only (never interpolated literals, P-A2) | A F9, P-A2 | T-07, T-17, T-33 |
| C-11 | App logger with a field allow-list; never log request bodies; no identity context on any event that can carry content | §3, §6.2 | T-17 |
| C-12 | No third-party error-reporting, analytics or session-replay SDK on routes that receive anonymous content unless NEW-4 approves a configuration (Sentry's Next.js SDK collects server-side request bodies and IP by default, and `setUser()` data "is always sent" [J-14]); if approved, `dataCollection` set explicitly and the canary test passes | X1, P-A4 | T-25 |
| C-13 | UUIDv4 only; no sequences/serials/identity columns in anonymous schemas; no ids in query strings; no post-redirect GET of a just-created id | §9 ids, X4 | T-18 |
| C-14 | Supabase (if chosen): Data API disabled, nothing in `public`, default grants revoked [J-10]; Neon (if chosen): app roles created by SQL only (A F7) | A F6, F7 | T-30 |
| C-15 | Timestamp policy §4.7; counters pre-created at enrolment in random order; nightly wash | A §2.8, §4.1 | T-02, T-06, T-32 |
| C-16 | Snapshot-only level distribution, hidden from sharing open; survey reveal after close; presentation snapshots | S-A3, X2, X3, X5 | T-14, T-26, T-27 |
| C-17 | One generic email template, daily digest, outbox rows deleted after send, links to `/notifications` only, tracking off | X7, M-A1, M-A3 | T-28 |
| C-18 | No auto-follow on asking unless the owner accepts the P1 weakening | NQ-A13 | T-29 |
| C-19 | Enrolment tombstones until seal; merges carry orphans over unchanged | X12, M-B4 | T-11 |
| C-20 | No impersonation path; if Q7 ever allows one, impersonated sessions get no `my_*` or linkage calls | X6 | T-34 |
| C-21 | Environment hygiene: never restore production into dev/preview; previews use seeded data; dumps per domain (stack-hosting §8 item 4) | A F13 | runbook + T-20 |
| C-22 | Change control: any change to C-01…C-21 needs an ADR note and a threat-model update; the catalogue suite runs on every migration in CI and daily in production (`jobs.privacy_selfcheck`) | A F14 | CI (all catalogue tests) |

---

## 7. Negative tests that prove it (§9; §10 "at least one automated test" per criterion)

**Fixtures.** Canary student `CANARY_NAME_7f3a` / `canary7f3a@…` posts `CANARY_TEXT_91bd` (A §7); every log, export,
DOM and response check asserts that no single artefact holds an identity canary and the content canary together.
Seeded courses include a tiny class (below N) and a class where all but one student share.

### 7.1 Catalogue and configuration (CI on every migration + daily production self-check)

| Id | Test | §9 channel / §10 item |
|---|---|---|
| T-01 | Role-privilege matrix: `has_table_privilege` for every runtime role × every table equals a checked-in matrix; no runtime role has SELECT on any base table outside `catalog` (and `cc_auth` only on `auth_private`) | ordinary queries; "moderate without accessing identities" |
| T-02 | Column allow-list per anonymous table; no FK from anonymous schemas to `identity.users`; only allow-listed timestamp columns, all bucketed types | predictable ids; "ask, comment and upvote anonymously" |
| T-03 | No view depends on both an identity-bearing and an anonymous schema (exact catalogue query **Unverified**, A Appendix B) | DB views (§6.2) |
| T-04 | Every `SECURITY DEFINER` function: `search_path` in `proconfig`, owner `cc_fn_*`, no PUBLIC EXECUTE | API |
| T-05 | Locked tables: `relrowsecurity` and `relforcerowsecurity` true; policies only `TO cc_fn_*` | ordinary queries |
| T-06 | `rolbypassrls = false` and no `pg_read_all_data` for `cc_*`; table owners `cc_owner`; `track_commit_timestamp = off` | ordinary queries |
| T-07 | `log_statement = none`, `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0` on the live project | logs |
| T-08 | EXECUTE set per role equals the §4.5 whitelist; every function's return columns match an allow-list | API |

### 7.2 Functions, API, UI, exports

| Id | Test | §9 channel / §10 item |
|---|---|---|
| T-09 | As instructor, TA (every permission combination) and admin: call every route and function generated from the router and the whitelist; no response contains a student id, name, email, pid or tag next to content | UI/API; "moderate without accessing identities" |
| T-10 | Forged or absent session → generic error; student A cannot read B's counts, level, upvote/follow state | API |
| T-11 | Upvote twice → total +1, counter +1; merge property test (random sets, total(B) = \|A ∪ B\|, counters unchanged, comments moved, redirect works, audit row ids-only); tombstoned voter still de-duplicated | "Duplicate merging preserves counts correctly" |
| T-12 | Simulated stray `GRANT SELECT` to `cc_web` on a locked table → 0 rows (FORCE RLS) | ordinary queries |
| T-13 | Posting transaction writes no row in any table a runtime role can read via a function that returns identity (tool: `pg_stat_xact_user_tables`, **Unverified**) | ordinary queries |
| T-14 | Browser E2E: staff pages, moderation queue, presentation mode, search never render the canary name beside canary text; presentation shows only §7.8 "Display" items; its upvote total does not change after a new upvote until re-selected | UI; "Presentation mode reveals no private data" |
| T-15 | Hidden, removed and moderator-only content never appears in student search or filters (§7.14) | UI |
| T-16 | Shared-results export has exactly name, verified level, date shared (+ Q12 format fields); no other export exists; content export (if any) has no identity | exports; "Instructors receive no underlying participation activity" |

### 7.3 Logs and identifiers

| Id | Test | §9 channel |
|---|---|---|
| T-17 | Run the whole suite with app stdout, local Postgres log, ORM/driver logs and a local error sink captured; forced errors inside every definer; assert (a) no record holds an identity canary + content canary, (b) no record holds KEK or `K_c` bytes (hex/base64 scan), (c) no session token next to body text | logs |
| T-18 | Every exposed id parses as UUID version 4; no id appears in a query string; after `POST` the client does not `GET` the new id (X4) | predictable identifiers |
| T-19 | For every enrolled user, `sha256(user_id)`, `md5(user_id)` and an empty-key HMAC match no stored pid or tag (§12 known issue) | predictable identifiers |
| T-20 | Dump-replay: with a dump and no KEK, a roster-holding attacker matches no pid or tag; covers outbox, follows, reports, rate-limit buckets, snapshots, seen markers (M-A1). Dump-diff (C's T-C1): no byte string ≥ 8 bytes appears in both the identity schemas and the anonymous schemas except allow-listed course ids | dumps (stronger tier), predictable ids |

### 7.4 Red-team additions

| Id | Test | Closes |
|---|---|---|
| T-21 | (a) `cc_web` gets "permission denied" selecting `xmin`/`ctid` from any content or identity base table; (b) read functions return no system column; (c) a repeat sign-in and a repeat roster sync leave `identity.*` row `xmin` unchanged. The attack in S-A1 is first **demonstrated** on A-as-written, then shown to fail | S-A1 |
| T-22 | Lint: only the linkage module imports the `cc_link` credential; with `cc_web`, calling any tag- or credit-bearing function fails | SQLi tag forgery |
| T-23 | Contract: no read function has a tag-list (`bytea[]`) parameter; `item_tag_sets` returns per-item sets only | S-B1 |
| T-24 | Auth sessions: after N authenticated requests the session row is byte-identical (no refresh); `cc_web` cannot read `auth_private`; IP/UA columns empty if suppressible (**Unverified**) | [J-13] |
| T-25 | Error-SDK canary: if any error tool is approved (NEW-4), a forced error on each content route reaches a local sink without body, cookies, IP or user context | X1 |
| T-26 | Aggregates: two analytics calls in one period return the identical snapshot; level distribution suppressed when enrolment < N or any non-empty level < N; hidden once the sharing window opens; one-non-sharer and all-non-sharers-same-level scenarios reveal nothing | S-A3, X2, §7.16, §10 "Students alone decide" |
| T-27 | Survey: response rows have no metadata columns; submission does not change counters; results empty while open, revealed only after close and ≥ `reveal_min_n`; response order is not completion order (statistical); second submission rejected (if NQ-A14 says so) | §7.12, X3; "exit survey is anonymous and technically separate" |
| T-28 | Email sink: every content-related email uses the single template; no question id, title, text or level; outbox empty after the digest job | X7, M-A1, M-A3 |
| T-29 | Asking a question creates no follow tag (unless the owner enables auto-follow) | NQ-A13 |
| T-30 | Platform: Supabase `/rest/v1/` does not respond (Data API off); or Neon: `cc_*` roles are not members of `neon_superuser` | A F6, F7 |
| T-31 | Spike: merge HMAC timing at realistic roster sizes on the chosen host (feasibility, not privacy) | §7.7 |
| T-32 | Mode S: a test **demonstrates** content/counter `xmin` equality (documents limitation 3); after `jobs.wash`, live counter rows share one `xmin`; under Mode B, counter `xmin` ≠ content `xmin` after the batch | A §4.1 |
| T-33 | Run T-17 through the production driver and pooler mode (e.g. transaction pooling with prepared statements off), proving parameters are never interpolated into logged literals | P-A2 |
| T-34 | No route switches the acting user; admin sessions cannot call any `my_*` or linkage function | X6, Q7 |
| T-35 | Threshold versioning: a disadvantaging change after participation starts is rejected; the original version stays readable and is shown to students | §7.9; "Exactly three levels are supported" (level enum test included) |
| T-36 | Sharing: level is server-computed (client-supplied level ignored); verbatim §7.10 text shown before confirmation; revoke works until finalisation and fails after; instructor sees exactly three fields | §7.10; "Students alone decide whether to share" |

**What tests cannot prove** (state in the threat model): that the deployed code is the reviewed code, that vendor
logs hold nothing beyond their documented fields, and that the operator does not misuse the keys.

---

## 8. Open questions this recommendation depends on

None is answered here. "ADR" = must be answered before the Q9 ADR can be approved; "build" = may be answered later,
before the dependent feature is built (§13 rule).

### 8.1 Existing CONTRIBUTING §13 questions

| Q | How A+ depends on it | When |
|---|---|---|
| Q1 | If admin scope grows to raw DB or console access, the admin becomes the "operator" actor | build |
| Q2 | Which privacy-touching features are in the first milestone (survey, sharing, email) | ADR scope |
| Q3 | A+ needs real Postgres with roles, RLS and definers (rules out D1, §12); host secret store for the KEK; Node version if the blind-token survey is ever adopted (`node >=24`, [J-11]) | ADR |
| Q4 | Auth library session fields and refresh (C-09, PQ-P13); stand-in IdP log exposure | ADR |
| Q5 | Roster sync must call the linkage module to pre-create counters and write tombstones | build |
| Q6 | Email provider: tracking off, retention, body storage | build (§7.13) |
| Q7 | Any impersonation must exclude privacy surfaces (C-20) | ADR (recommend: none) |
| Q8 | Format/location of the threat-model document (§5 outline) | ADR |
| **Q9** | This report is one input; it does not close Q9 | ADR |
| Q12 | Export/apply triggers finalisation of shares (§7.10) | build |
| Q13 | Which notifications are essential; whether "level reached" is emailed at all | build |
| Q14 | Audited events and retention; whether the moderation log records the staff actor | build |
| Q16 | N for level suppression and survey reveal; flush size k | build (values), ADR (rule shape) |
| Q17 | R0–R3 retention / crypto-shredding | build (before first term ends) |
| Q18 | Sharing window open/close and the seal trigger (hides level aggregates; triggers shredding) | build |
| Q20 | Rate-limit values (they also bound credit farming while hide/delete keeps credit) | build |

### 8.2 PROPOSED NEW open questions (consolidated)

| Id | Question | Cross-references | When |
|---|---|---|---|
| **PQ-P1** | Is the platform operator (owner) inside the trust boundary for the prototype? For production? | NQ-A9, PNQ-B13, NQ-C2, NEW-3 | ADR |
| PQ-P2 | Does hiding or deleting content remove its participation credit? (A+ cannot without weakening P1) | NQ-A5, PNQ-B11, NQ-C10, red team X10 | ADR |
| PQ-P3 | Self-upvotes allowed? Upvote withdrawal? After a merge, does a double upvoter keep two "upvotes given"? | NQ-A3, NQ-A4, NQ-A6, PNQ-B2, NQ-C6 | ADR |
| PQ-P4 | Who receives "Answer posted" and "Question merged"? Does asking auto-follow (weakens P1 for key holders)? | NQ-A1, NQ-A13, PNQ-B7 | ADR |
| PQ-P5 | Level-distribution cadence (fixed weekly with lag, or end-of-term only) and the differencing rule | NQ-A7, PNQ-B10, NQ-C9, NEW-1, Q16, Q18 | ADR |
| PQ-P6 | Survey results only after close? Duplicate prevention wanted? | NEW-2, NQ-A14, PNQ-B9 | ADR |
| PQ-P7 | Stored and displayed precision of post times | NQ-A8, PNQ-B6 | ADR |
| PQ-P8 | Crediting mode: synchronous (S) or daily batch (B) with lagged counts and explanatory copy | NQ-A10, PNQ-B1, NEW-5 | ADR |
| PQ-P9 | May any third-party error-reporting or analytics tool run on routes that receive anonymous content, and with which settings? | NEW-4, NQ-S0-2 (stack judge) | ADR |
| PQ-P10 | One generic email template for all content notices? Course code in emails? Level in the "level reached" email? | NEW-7, M-A3, Q6, Q13 | build |
| PQ-P11 | Presentation mode and analytics: snapshot (proposed) or live? | NQ-A18, X5 | build |
| PQ-P12 | Notification "seen" marker: server-side at day precision under a keyed HMAC, or client-only? | M-A2, M-B1 | build |
| PQ-P13 | May the auth library store IP address, user agent and created/updated times on sessions; must session refresh be disabled? (Better Auth stores `ipAddress`/`userAgent` and slides expiry by default [J-13]) | new; Q4 | ADR |
| PQ-P14 | Does staff identity next to content (e.g. "hidden by TA X") count as "identity-bearing" under §3? | NQ-A11 | build |
| PQ-P15 | Can one person be TA and student in the same course? | NQ-A17 | build |
| PQ-P16 | Is a shared level frozen at share time or live until finalisation? | NQ-A15, NQ-C4 | build |
| PQ-P17 | May students see, edit or delete their own anonymous posts? | NQ-A2 | ADR (it changes P1) |
| PQ-P18 | How are repeat anonymous abusers handled (moderation only, or a sanction-without-reveal handle)? | NQ-A12, PNQ-B8 | ADR |
| PQ-P19 | Are database backups and dumps "exports" under §3 / §6.2 (per-domain backups with separate keys)? | stack judge PQ-4 | build |
| PQ-P20 | Reading of "changes that would disadvantage them" and when participation "begins" (§7.9) | PNQ-B5, NQ-C7 | ADR |
| PQ-P21 | Who may hold the KEK, and may AI agents or tools ever access production secrets or logs? | stack judge PQ-8 | ADR |
| PQ-P22 | Accept the UX constraint that a new post is shown from the POST response, not a GET of its id? | NEW-6, X4 | build |
| PQ-P23 | Does production require Canadian data residency? (affects where stores can live, not the mechanism) | PNQ-B12 | production |

---

## 9. What evidence would change this recommendation

| Evidence | Would move toward | Why |
|---|---|---|
| Owner answers PQ-P1 "the operator and vendors must not be able to link" (or a UW privacy/security review demands physically separate stores or institution-held keys) | **B topology** (production-grade: separate DBs/services, KMS with separated duties) plus Mode B crediting and the blind-token survey; prototype may stay A+ only if the split is scheduled | K8 would carry ≈⅓ of the weight, the break-even in §2.4 |
| Owner or institution wants "even the server cannot link" *and* accepts in-app-only or uniform-digest email, bounded double counting and token transfer | C1 as an institution "strong anonymity mode", still with no pseudonym on content rows | C1's regressions become accepted trade-offs (NQ-C1, NQ-C3, NQ-C5) |
| Spike T-21 shows a runtime role can still reach system columns through the read path, or that Postgres exposes base-table `xmin` through functions/views in some way | A+ stays, but reads must move to snapshot tables written by jobs (one shared `xmin`) or to B-style separate stores | S-A1 must hold for the REQUIRED tier |
| The chosen auth library cannot run with session refresh disabled and IP/UA suppressed, and its tables cannot be confined to `cc_auth` | a different auth library or a thin session layer of our own (Q4) | an activity clock readable by ordinary code breaks §6.2 |
| Q3 lands on a platform without Postgres roles/RLS/definers (e.g. D1) | B (separate stores per domain) or C-style cryptographic separation | A+ depends on Postgres catalogue enforcement (§12 known issue) |
| Merge timing spike (T-31) shows roster recomputation is too slow at realistic N on the chosen host | batch merges in a job, or a per-course linkable pseudonym on tag rows (weaker, needs owner approval) | §7.7 must still work |
| Owner answers PQ-P2/PQ-P17/PQ-P18 with "yes" (credit revocation, edit own post, sanction authors) | A+ with an encrypted per-item author reference (`AEAD(K_c, pid)`), documented as a P1 weakening | the no-author property is what those features remove |
| Measured build time for the A+ privacy core runs far beyond ≈18–25 sessions | simplify toward A as written plus only the REQUIRED-tier fixes (S-A1, S-A3, X1–X4) | K5 |
| A vendor changes defaults (e.g. Supabase grants, log fields, Better Auth schema) | re-run the catalogue and log tests; no design change unless a lock can no longer be asserted | C-22 change control |

---

## 10. Verification log

All pages below were fetched by this judge with WebFetch; checked date recorded as **2026-10-11** per the task
brief (fetches were run in the session dated 2026-10-12).

### 10.1 Facts re-verified by this judge **[J-n]**

| Ref | Fact (as stated on the page) | URL (checked 2026-10-11) |
|---|---|---|
| J-1 | PG 18.6: by default view access to base relations uses the **view owner's** permissions and RLS policies; with `security_invoker = true` the invoking user's; the page says nothing about system columns | https://www.postgresql.org/docs/current/sql-createview.html |
| J-2 | PG 18.6: `xmin` = "The identity (transaction ID) of the inserting transaction for this row version"; each update creates a new row version; `ctid` = physical location; "Every table has several system columns"; nothing on views or on who may select them | https://www.postgresql.org/docs/current/ddl-system-columns.html |
| J-3 | RLS with no policy → "default-deny"; owners bypass unless `FORCE ROW LEVEL SECURITY`; "Superusers and roles with the BYPASSRLS attribute always bypass"; RI checks bypass RLS ("covert channel" warning) | https://www.postgresql.org/docs/current/ddl-rowsecurity.html |
| J-4 | `SECURITY DEFINER`: set `search_path` to exclude untrusted-writable schemas, `pg_temp` last; EXECUTE granted to PUBLIC by default, revoke and grant "within a single transaction"; LEAKPROOF superuser-only | https://www.postgresql.org/docs/current/sql-createfunction.html |
| J-5 | Defaults: `log_min_error_statement` ERROR, `log_parameter_max_length_on_error` 0, `log_parameter_max_length` −1 (full), `log_statement` none, `log_min_duration_statement` −1; changing them needs superuser or `SET` privilege | https://www.postgresql.org/docs/current/runtime-config-logging.html |
| J-6 | Supabase Free: $0/month, 500 MB DB, 2 active projects, paused after 1 week of inactivity, no automatic backups, no PITR, API & DB logs 1 day, auth audit logs 1 hour; Pro from $25/month | https://supabase.com/pricing |
| J-7 | pgcrypto: `hmac(data bytea, key bytea, type text)`; `gen_random_bytes` max 1024 bytes; data and passwords move in clear text between pgcrypto and clients ("better do crypto inside client application" if the DBA cannot be trusted); not side-channel resistant | https://www.postgresql.org/docs/current/pgcrypto.html |
| J-8 | Vercel runtime logs: method, path, time, status, host, user agent, search params, region; "logs from your browser" filter matches IP + UA; retention Hobby 1 hour, Pro 1 day, Observability Plus 30 days; available on all plans (no off switch documented) | https://vercel.com/docs/logs/runtime |
| J-9 | RFC 9562 (Standards Track, May 2024): v7 first 48 bits = Unix ms timestamp; v4 122 random bits; "SHOULD NOT assume that UUIDs are hard to guess", "MUST NOT be used as security capabilities", v4 "SHOULD be utilized" for security uses | https://www.rfc-editor.org/rfc/rfc9562.html |
| J-10 | Supabase: "With the Data API disabled, none of the auto-generated REST endpoints respond, regardless of grants or RLS"; existing projects grant `anon`/`authenticated`/`service_role` table privileges in `public` by default; the default is changing to opt-in (no date on this page; the 2026-10-30 date comes from A [V22], not re-fetched) | https://supabase.com/docs/guides/api/hardening-data-api |
| J-11 | `@cloudflare/blindrsa-ts` 0.4.6, Apache-2.0, dependency `sjcl` 1.0.9, `engines.node` ">=24" | https://registry.npmjs.org/@cloudflare/blindrsa-ts/latest |
| J-12 | Supabase Vault: key "never stored in the database alongside the encrypted data"; dumps show only encrypted data; restore-to-new-project and branching copy the key; Management API returns the root key; "anyone that has access to the view has access to decrypted secrets"; page silent on plan availability | https://supabase.com/docs/guides/database/vault |
| J-13 | Better Auth sessions: default expiry 7 days; expiry slides when `updateAge` has passed; `disableSessionRefresh: true` disables refresh; session fields include `ipAddress`, `userAgent`, `createdAt`, `updatedAt` | https://www.better-auth.com/docs/concepts/session-management |
| J-14 | Sentry Next.js SDK: server-side request bodies collected by default; IP sent by default; cookies sent (sensitive values filtered); `setUser()` data "always sent"; controlled by `dataCollection` | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ |
| — | Better Auth database concepts page: did **not** render the session field list (inconclusive; J-13 used instead) | https://www.better-auth.com/docs/concepts/database |

### 10.2 Facts relied on from the input notes (not re-fetched by me)

Cloudflare Workers/D1/Queues limits and prices (B [F1]–[F19], re-checked by the red team §5); Workers Paid USD 5
minimum (B [F2]); Neon roles and pricing (A [V15], [V21]); Supabase roles and `postgres` `bypassrls` (A [V12]);
Supabase Data API change dates (A [V22]); `track_commit_timestamp` default off (A [V5], B [F19]); RFC statuses for
blind signatures and Privacy Pass (C verification log); stack cost ≈USD 1.17/month and Vercel Hobby/DPA conditions
(stack-hosting §1, §22). None of these is decision-critical beyond what the red team re-checked.

### 10.3 Still **Unverified** (do not rely on without checking)

- Whether any route to base-table system columns exists through definer functions or views (spike T-21).
- Whether Better Auth can suppress `ipAddress`/`userAgent` on sessions (T-24).
- `pg_stat_xact_user_tables` as the tool for T-13; the exact catalogue query for T-03.
- Effect of `UPDATE … SET col = col` wash, `CLUSTER` and VACUUM on dead tuples and `xmin` (T-32); logical-dump row order.
- Merge HMAC timing at realistic N (T-31); every build-session estimate in this report.
- Whether the chosen driver/pooler ever interpolates parameters into literals (T-33).
- Vendor-internal backup/WAL retention after crypto-shredding; email providers' tracking defaults (Q6).
- Whether Supabase Vault is available on the Free plan (J-12 silent).


