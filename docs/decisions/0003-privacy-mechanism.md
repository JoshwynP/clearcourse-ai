# ADR 0003: Privacy mechanism for unlinkable content and credited participation (Q9)

- **Status:** Proposed
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §3, §5, §6.1–§6.4, §7.7, §7.9, §7.10, §7.12, §7.13, §7.16, §9, §10,
  §12 / Q9 (primary); Q8, Q13, Q16, Q17, Q18, Q20; PQ-10, PQ-19 to PQ-24, PQ-30, PQ-33

Research: [docs/research/privacy-architecture.md](../research/privacy-architecture.md).

## Context

ClearCourse AI's core promise is that anonymous content cannot be linked to student identity
(§6). §6.1 requires five technically separated domains: anonymous discussion content, private
per-student counters, identity and enrolment, instructor-visible shared results, and anonymous
exit-survey responses. §6.2 says instructors and TAs must never receive mappings between students
and their questions, comments or upvotes, and that "ordinary application queries must not be able
to join the action content back to the student's identity". It names the required techniques:
privacy-preserving event processing, separated tables or schemas, restricted service roles, opaque
identifiers and narrowly scoped internal APIs. §3 forbids identity and anonymous content text
together in any log, analytics event, error report, database view, export or admin dashboard. §9
requires negative tests at the UI, API, export, log and identifier levels.

§6.3 records the tension. Upvotes must be combined "without double-counting a student" (§7.7) and
counters must credit the right student, so the system must know, somewhere, that an action belongs
to a student. §6.3 requires the mechanism (Q9) to be written up in an ADR and in the threat model
**before any content or participation code is written**. §6.4 sets the default: nobody can
deanonymize. §10 adds "Students alone decide whether to share" and "Instructors receive no
underlying participation activity"; the research reads this (interpretation) as making the leak of a
non-sharer's level a breach too.

§12 records that the source chat's "one-way hashed identifier" is not enough: an unkeyed hash of a
known user id is reversed by hashing every enrolled user and comparing.

This ADR proposes the mechanism. It assumes the stack and hosting proposed in ADR 0001 and ADR 0002
(real PostgreSQL with roles, row-level security and definer functions; both still Proposed, Q3).
The operator (the owner, later possibly UW IT) and the vendors are treated as **inside** the trust
boundary unless the owner answers PQ-10 otherwise. Protection against them is stronger than the
spec requires, and every gap becomes a documented limitation (§6.2, §11).

## Options considered

The research file compares six options scored on eight weighted criteria (required-tier
unlinkability, requirement coverage, failure modes, §9 testability, solo build complexity, platform
and cost fit, production future-proofing, protection beyond the requirement). Weights and scores
are the judge's proposal and may be re-weighted by the owner.

1. **A, database-enforced single Postgres (as designed): 74.5/100.** A schema per §6.1 domain;
   content rows with no author column; counters keyed by a keyed pseudonym; per-item keyed tags for
   upvote, follow, unclear and report de-duplication; locked tables behind `SECURITY DEFINER`
   functions. Pros: cheap, mainstream, catalogue-testable. Cons (red team): `xmin` on
   web-readable base tables orders events globally and joins to identity rows by "nearest xid"
   (S-A1); the key-encryption key travels as a SQL bind parameter and can be logged with the session
   token and question body (S-A2); a live level distribution leaks non-sharers' levels (S-A3).
2. **A+, A with the red team's fixes and grafts from B and C: 83.5/100.** Pros: closes S-A1 to S-A4
   and the cross-cutting attacks X1 to X7, X11 and X12; almost every lock is a Postgres catalogue
   fact that a CI test checks; fits one managed Postgres and one app host. Cons: the operator and
   vendors remain trusted; build ≈18–25 sessions (unmeasured), more than A's ≈13–17.
3. **B-full, physically separated stores and services: 67.0/100.** About 8 databases, 8–9 services,
   a gateway, a linkage service and a delayed, batched credit queue. Pros: no single dump or console
   holds the linkage; SQL joins impossible by construction. Cons: ≈29–39 sessions; Cloudflare D1
   Free allows 10 databases (one environment), Workers Free allows 10 ms CPU per invocation and
   Workers Paid is a USD 5 minimum; the Board service still receives a viewer's tag set (S-B1);
   bearer receipts (S-B2); debugging with logs off; configuration drift is the main privacy risk.
4. **B-lite, B with 5 stores and 4 services: 66.5/100.** Cheaper than B-full but puts identity,
   shared results and notifications behind one gateway credential.
5. **C-H1, server pseudonym stored on content rows plus a blind-token survey: 65.0/100.** Pros:
   simple; the blind-token survey is good. Cons: **fatal as a recommendation (F-C1)**: any holder
   of the course key can recover every author retroactively, with no approval or audit, which
   defeats §6.4's default in practice; any reader can group a student's whole history (S-C1).
6. **C1, blind-signed client-held pseudonym: 53.5/100.** Pros: stored data cannot link, even for the
   operator. Cons: the server ships the JavaScript that holds the secret; targeted email (§7.13)
   partly unmet; level tokens transferable and Sybil re-issuance possible (§7.7, §7.10, §7.11);
   device-loss recovery and conflicting WebAuthn PRF support; C itself rejects it for the prototype.

A+ still leads with protection against the operator weighted three times higher (80.0 vs 69.4 for
B-full). B-full overtakes A+ only if that protection carries about a third of all weight.

## Decision

**Proposed (not yet approved by the owner):** adopt **A+** as the Q9 mechanism, as specified in
section 6 of the research file. In summary:

1. **One PostgreSQL database**, a schema per §6.1 domain plus `catalog`; no cross-domain foreign
   keys except into `catalog` and `shared.results.user_id` (§7.10 needs the name); nothing in
   `public`; on Supabase, Data API disabled and default grants revoked.
2. **No author data (P1).** No question, comment, survey response or report note stores an author,
   pseudonym, tag, session, IP or user agent.
3. **Locked per-student state (P2, P3).** Counters keyed by `pid = HMAC(K_pid, user_id)`;
   upvote, follow, "Still unclear" and report de-duplication by per-item keyed tags
   (e.g. `HMAC(K_up, user_id ‖ question_id)`); never an unkeyed hash.
4. **Keys outside SQL (P4).** A random 32-byte key `K_c` per course, AES-256-GCM-wrapped under a KEK
   held in the host secret store (one KEK per environment); sub-keys derived by HKDF. All HMACs are
   computed in a server-only **linkage module** with its own login role `cc_link`, pool and secret.
   No key ever appears as a SQL parameter, setting or log field.
5. **Narrow, role-split API (P5).** No runtime role has SELECT on any base table in an anonymous or
   identity schema; reads go through `SECURITY DEFINER` functions with explicit columns; writes go
   through a whitelist; credit- and tag-bearing functions are callable only by `cc_link`. Separate
   roles `cc_web`, `cc_link`, `cc_auth`, `cc_jobs`, `cc_migrate`, NOLOGIN owners per function group,
   `rolbypassrls = false` everywhere. No read function accepts a viewer's tag list.
6. **Snapshot-only outputs (P6).** Level distribution and content totals as frozen snapshots on an
   owner-set cadence, suppressed below N (Q16) and hidden once sharing opens; survey results revealed
   only after the survey closes; presentation mode shows a snapshot taken at selection.
7. **Merge** by roster recomputation of tags inside one transaction (no double counting; counters
   untouched; comments moved; redirects; ids-only audit); enrolment tombstones kept until seal.
8. **Synchronous crediting (Mode S)** in the prototype, with a daily-batch mode (Mode B) as a
   no-migration upgrade (PQ-30).
9. **Notifications:** in-app computed on read; email as one generic, content-free daily digest
   linking only to `/notifications`; outbox rows deleted after send; no auto-follow on asking.
10. **Hygiene:** coarsened content timestamps (bucket size PQ-24); no timestamps on counters, tags,
    completions or survey responses; no-op identity upserts; auth-session refresh disabled;
    `track_commit_timestamp` off; logging invariants; UUIDv4 only; no third-party error or
    analytics SDK on content routes unless PQ-12 approves one; no impersonation (Q7).
11. **Options kept open:** blind-token exit survey as an upgrade; crypto-shredding of `K_c` at seal
    as a Q17 option; B's separated topology, a KMS and Mode B for production if PQ-10 or a UW review
    requires them.

**Conditions before this ADR can be accepted:**

- The owner answers **PQ-10** (operator trust boundary) and the integrity forks **PQ-19** (hide or
  delete removes credit?), **PQ-20** (self-upvotes, withdrawal, double upvoter after merge),
  **PQ-21** ("Answer posted" and "Question merged" recipients; auto-follow), **PQ-22** (see, edit
  or delete own posts), **PQ-23** (repeat anonymous abusers), **PQ-24** (post-time precision),
  **PQ-30** (crediting mode) and **PQ-33** (reading of "disadvantage" and when participation
  begins, §7.9). Under A+, a "yes" to PQ-19, PQ-22 or PQ-23 needs an encrypted per-item author
  reference and is a documented weakening of P1.
- The rule shape for level aggregates is agreed (PQ-31; values stay with Q16), and the threat model
  exists in the format chosen under Q8 (§6.3).
- Four spikes pass: system columns are unreachable by runtime roles through the read path (T-21);
  the auth library's session row stays unchanged across requests and is confined to `cc_auth`
  (T-24, PQ-48); merge timing is acceptable at realistic roster sizes (T-31); the production driver
  and pooler never put parameters into logged literals (T-33).

Approved by: (pending)

## Consequences

**Enables.**

- §6.2's "ordinary application queries must not be able to join" becomes a property the database
  enforces and CI checks: role-privilege matrix, column allow-lists, definer settings, FORCE RLS,
  logging settings and the EXECUTE whitelist run on every migration and daily in production.
- §7.7 merges without double counting and with credit preserved; §7.9 counting of only questions,
  comments and upvotes; §7.10 server-computed verified level with name, level and date only;
  §7.12 a survey separated from identity and participation; §7.13 in-app and email notifications
  without content in email; §7.16 aggregates only above thresholds.
- §6.4's default "nobody can deanonymize" holds by construction for authorship, which is never
  stored. Any future exceptional process (only if institutional policy requires it) is forward-only.
- A production split into separate databases or services is mechanical, because domains share no
  foreign keys and each code path already has its own role and secret.

**Constrains.**

- Q3 must provide real Postgres with roles, RLS and definer functions; Cloudflare D1 is ruled out
  (§12). The data layer reads anonymous and identity data only through functions, not ORM table
  reads (raw parameterised SQL for `api.*`).
- Without an author link, hidden content keeps its credit, self-upvotes cannot be blocked and
  students cannot see or edit their own posts, unless the owner answers PQ-19, PQ-20 or PQ-22
  otherwise and accepts the weakening.
- Instructors see level counts and content totals only as snapshots and survey text only after the
  survey closes. Post times are shown only at the chosen bucket precision.
- Email is limited to one generic template; per-event wording is not possible.

**Privacy implications (§6).** The design meets the required tier for instructors, TAs, admins,
ordinary queries, logs, exports, views, dashboards and identifiers. It does **not** protect against
the operator, anyone with deploy rights, the host, database, auth and email vendors, an app-server
compromise or legal compulsion: with full database access and the keys, upvote, follow, report and
unclear sets and each student's counts can be reconstructed and, in Mode S, each student's latest
credited action. Network and timing metadata in vendor logs, writing style, self-identification,
classroom observation and very small classes also remain. These are listed in full in section 7.2
of the research file and must appear in the threat model and the limitations of anonymity (§6.2,
§11); whether they are also shown in the app is PQ-52, and user-facing wording is owner-approved copy
(to be written).

**Follow-up work.**

- Write the threat model (Q8) including the limitations of anonymity, before any content or
  participation code (§6.3).
- Run spikes T-21, T-24, T-31 and T-33 and record the results; revise this ADR if any fails (the
  research file, section 6.16, lists what each failure would change).
- Implement the must-have controls C-01 to C-22 and the negative tests in
  [testing-strategy.md](../research/testing-strategy.md), including canary scans of UI, API,
  exports and captured logs (§9).
- Before the first term ends: the owner chooses an end-of-term option (Q17, Q18), including whether
  to crypto-shred course keys; the R1 caveat is that shredding is effective only after every backup
  and KEK copy has expired.
- Revisit at production: KMS for the KEK, Mode B, the blind-token survey and B's separated topology,
  each through its own ADR.
- Any change to roles, grants, definer functions, logging, error or analytics SDKs, notification
  templates or timestamp precision needs an ADR note and a threat-model update (control C-22).
