# Privacy red-team critique of Q9 designs A, B, C

Checked date: 2026-10-11. Role: adversarial privacy red-teamer. Research and planning only.
Source of truth: P:/code/clearcourse-ai/CONTRIBUTING.md (cited as §N.N). Everything below that is not
a § citation is a finding, a proposal for the owner, or a PROPOSED NEW open question. Nothing here
closes Q9 or any other open question.

Designs reviewed:
- A: P:/code/_clearcourse-scratch/research/privacy-A-db-enforced.md
- B: P:/code/_clearcourse-scratch/research/privacy-B-separated-services.md
- C: P:/code/_clearcourse-scratch/research/privacy-C-cryptographic.md

Survivability scale: strong (survives every in-scope actor of §6.2/§9; limitations honestly documented) /
adequate (in-scope actors handled; fixable gaps) / weak (an in-scope actor or common mistake breaks it) /
broken (a required property is not met as designed).

## 0. Scope reminder (what the spec requires vs what is stronger)

- **Required** (§6.2, §9, §3): ordinary application queries, instructors, TAs, institutional admins,
  logs, exports, DB views, admin dashboards and predictable identifiers must not yield a
  student-to-anonymous-content mapping. §9 requires negative tests at UI, API, export, log and
  identifier level. §10 adds "Students alone decide whether to share" and "Instructors receive no
  underlying participation activity", so **learning a non-sharer's level is a breach too**.
- **Stronger than required**: the operator (owner with DB console and deploy access), vendors,
  dump/backup holders, app-server compromise, legal compulsion. A design may fail here, but every
  failure must appear in the documented "limitations of anonymity" (§6.2, §11).
- I treat "ordinary application query" strictly: **anything the web app's normal DB credential (or
  normal service credential) can SELECT, including Postgres system columns**, because a future
  developer (or Claude) can write that query without touching a privileged path.

## 1. Design A (database-enforced, single Postgres)

Overall: the most complete and most honest of the three. It already finds the Mode S `xmin` channel,
the differencing attack (NQ-A7), the self-upvote and hide/delete forks, and documents the operator as
inside the trust boundary. My attacks below are the ones it misses or under-rates.

**Survivability: adequate** (would be strong after fixes S-A1 to S-A4; none needs a redesign).

### 1.1 Fatal

None found. Question/comment authorship is genuinely not stored (P1), and every in-scope actor is
blocked from the per-item tags and counters by two independent locks (grants plus FORCE RLS).

### 1.2 Serious

- **S-A1. `xmin` on `cc_web`-readable tables is an ordinary-query clock that defeats timestamp
  coarsening (§6.2 "ordinary application queries").** A restricts the `xmin` attack to counters, which
  `cc_web` cannot read. But `xmin` is selectable on *every* table `cc_web` can SELECT (A's own [V4]).
  Transaction ids are a global, monotonic sequence, so `content.questions.xmin`,
  `content.comments.xmin` and `content.questions.xmin` after an upvote (the `upvote_total` UPDATE
  writes a new row version) give an **exact global order** of content events, regardless of the
  5-15 minute coarsening of `created_at` (NQ-A8). Any `cc_web`-readable identity-bearing row whose
  write correlates with activity then joins by "nearest xid". Concrete candidates that A does not
  forbid: (a) the OIDC callback upserting `identity.users` (display name/email refresh) on every
  sign-in: `INSERT … ON CONFLICT DO UPDATE` writes a new tuple even when values are unchanged, so
  `users.xmin` becomes "last login xid"; (b) LTI/CSV roster sync touching `identity.enrollments`
  (Q5); (c) notification-preference saves; (d) `shared.results` rows. On a low-traffic prototype the
  xid immediately before a question is very often that student's login. Sketch of the ordinary query
  (illustrative): `SELECT u.display_name, q.id FROM identity.users u JOIN content.questions q ON
  q.xmin::text::bigint - u.xmin::text::bigint BETWEEN 1 AND 3`. A's test #13 only checks writes
  *inside* the posting transaction, so it would not catch this.
  Fix: (1) identity upserts must be no-op when unchanged (`… DO UPDATE … WHERE (users.*) IS DISTINCT
  FROM (excluded.*)`) and a test asserts `users.xmin` is unchanged after a repeat sign-in; (2) deny
  `cc_web` direct SELECT on `content.*` base tables and expose them only through definer-owned views
  or functions (system columns are not reachable through a view), then add a catalog test that
  `cc_web` has no SELECT on any base table in `content`/`identity`; (3) run the nightly "wash" over
  `content.*` too, not just tag tables. Item (2) is the real fix; (1) and (3) are hygiene.
  (The exact visibility rules for system columns through tables and views are **Unverified** against
  the official page, see §5; a test must demonstrate both the attack and the fix before the ADR.)
- **S-A2. Variant K3 sends the KEK as a bind parameter on every privileged call.** That puts the
  master unwrap key into the same parameter list as the session token and the question body. Any
  parameter-logging path then logs **identity-capable token + content text + master key in one
  record**: `log_statement`/`log_min_duration_statement` turned on while debugging (A's F9), an
  `auto_explain` with parameter logging, `pgaudit` with parameter logging (offered on Supabase,
  **Unverified** whether enabled by default), a driver or pooler that interpolates parameters into
  literal SQL (see pitfall P-A2), or the host's DB-proxy logs. A's own pgcrypto caveat [V7] ("data
  and passwords move … in clear text") applies. Fix: do not pass the KEK per call. Options for the
  owner: K2 (Vault) on Supabase; or a `cc_jobs`-style unwrap at connection start into a
  transaction-local setting (fragile under transaction pooling); or keep the HMAC computation in the
  app server (key never enters SQL) and pass only the derived pid/tag into the definer. The last
  option moves the key out of the DB entirely and is the most portable.
- **S-A3. Level-distribution time series leaks per-action information long before sharing opens
  (§7.16, §10).** NQ-A7 option (a) hides the distribution once the sharing window opens, but an
  instructor who snapshots `api.course_analytics` daily during term can difference consecutive
  snapshots against the content timeline. Example: the gate requires every non-empty level ≥ N; once
  Contributor = 12 and No Record = 30, a jump to 13/29 the hour after one new question appears says
  "that asker had ≥1 upvote and no earlier post". At sharing time, the named Contributors narrow the
  candidate set to a few people. Fix (owner decision, extends NQ-A7): show level counts only as a
  single end-of-term snapshot after sharing is final, or only at a fixed coarse cadence with lag
  (weekly, computed from a frozen copy), never on demand. Add a test that two calls to the analytics
  function within a period return the same snapshot.
- **S-A4. Mode D credit tokens are bearer tokens and can credit the wrong student (§7.9 "credits
  the right student").** The token sits in `localStorage` and `api.redeem_credit(session, token)`
  credits whoever's session redeems it. On a shared lab or library computer the next student who
  signs in on that browser profile redeems the previous student's pending credit. Fix: bind redemption
  to the issuing session (store `hash(token ‖ session_token_hash)` rather than `hash(token)`; reject
  if the session differs), redeem or discard on sign-out, and test the shared-device case. This keeps
  `pending_credit` identity-free.

### 1.3 Minor

- **M-A1. The email outbox leaks follow linkage to a logical-dump holder without the KEK.** A says a
  dump without the KEK reveals no mapping. But `notify.email_outbox(user_id, template_key, course_id,
  not_before)` rows written by the merge transaction ("Question merged" to A's followers) or by the
  follow digest say "user X follows something that merged/updated on day D". If one question merged
  or updated that day, the dump links X to it. Fix: delete outbox rows once sent, use one generic
  template key for all content-related notices, and add follows to the dump-replay test (#20).
- **M-A2. Compute-on-read "seen marker" storage is unspecified.** Item 7 compares
  `last_activity_at` with "my seen marker" but never says where the marker lives. If it is a
  `cc_web`-readable per-user timestamp, it is an activity timestamp (it moves when the student
  browses right after posting), which A's own §2.8 rule forbids. Put it in a locked schema.
- **M-A3. "Level reached" email date.** The nightly batch still tells the email provider, the
  operator, and anyone with the outbox, the **day** each named student crossed a threshold.
  Combined with coarsened content dates in a quiet course this narrows authorship to that day's
  posts. A already proposes dropping the level from the body; also consider weekly batching or
  in-app only (Q13).
- **M-A4. `ctid` and `upvote_total` on presentation mode.** Covered as NQ-A18 (snapshots). Fine.

### 1.4 Unmet or partly met requirements

- §6.2 "ordinary application queries must not be able to join": partly met until S-A1 is fixed.
- §10 "Students alone decide whether to share": partly met until S-A3 extends NQ-A7.
- §7.9 integrity in Mode D: unmet until S-A4 is fixed (Mode S is fine).
- §7.12 / §7.10 sequencing attack (see cross-cutting X3): not addressed.
- Everything else on the 16-item checklist is handled concretely or correctly raised as an open
  question (NQ-A1 to A18). I agree with A's reading that hide/delete credit (item 16) is a real fork
  that must be decided before the Q9 ADR.

### 1.5 Vendor-fact errors

None found in the facts I re-checked (§5 below). Two cautions: (a) A treats Postgres logging defaults
as the deployed defaults; the actual values on the chosen vendor are **Unverified** and must be read
from the live project, which A's test #7 does; (b) the claim that K3 keeps the KEK away from the DB
vendor is weaker than stated because the KEK transits the DB connection on every call (S-A2).

### 1.6 Implementation pitfalls that would silently break anonymity

- **P-A1. ORM convenience.** A developer grants `cc_web` SELECT on `content.questions` "to make
  Prisma/Drizzle introspection work" (A's F15) and later adds a "last active" column for a UX
  feature. Catalog test #2's column-name regex would not catch a column named `updated_by_hint` or
  `client_ref`; prefer an allow-list of columns per anonymous table.
- **P-A2. Pooler-mode drivers.** Under transaction pooling (Supavisor or Neon pooled endpoints) some
  drivers disable server-side prepared statements, and a few fall back to client-side literal
  interpolation. Then `log_min_error_statement = ERROR` logs the failing statement **with literals**
  (session token and body text), defeating `log_parameter_max_length_on_error = 0`. Whether the
  chosen driver does this is **Unverified**; test #17 must run through the same driver and pooler
  mode as production.
- **P-A3. Re-creating a definer in a migration** without repeating `REVOKE … FROM PUBLIC`. Covered by
  catalog test #4; keep it in CI on every migration (A's F14).
- **P-A4. Error SDK breadcrumbs.** Sentry-style SDKs attach the last N HTTP breadcrumbs plus the
  authenticated user to every exception, so a later unrelated error carries "user X" plus the POST
  body of their question. A's F16 bans session replay but must also ban request-body breadcrumbs.

### 1.7 Missing tests

- Repeat sign-in does not change `identity.users.xmin` or any `cc_web`-readable identity row (S-A1).
- `cc_web` cannot select `xmin`/`ctid` from any anonymous-content relation (after S-A1 fix (2)).
- No KEK or key material appears in any captured DB/app log during the full suite (S-A2).
- Analytics snapshot stability and the end-of-term-only rule (S-A3).
- Mode D: a token issued to session A cannot be redeemed by session B (S-A4).
- Dump-replay test #20 extended to the outbox, follows, reports and rate-limit buckets (M-A1).
- Survey reveal ordering vs share timing (cross-cutting X3).

### 1.8 What would fix it

S-A1 (views or functions instead of base-table SELECT; no-op identity upserts), S-A2 (keep the key out
of SQL parameters, ideally compute HMACs app-side), S-A3 (end-of-term or fixed-cadence level
snapshots), S-A4 (session-bound credit tokens). With those, A is **strong** for every in-scope actor,
and its operator/vendor limitations are already honestly documented. It does not paint production
into a corner: no cross-domain FKs, portable Postgres, forward-only escrow for §6.4.

## 2. Design B (separated stores/services)

Overall: the same core data choices as A (no author column, per-item keyed tags, keyed per-course
counter pseudonym), placed in ~8 databases and 8-9 Workers with a delayed, batched credit queue. The
separation genuinely removes the "ordinary query" join class (S-A1 cannot happen across D1 bindings).
Its weaknesses are a single all-seeing Gateway, service-runtime linkability that the design claims not
to have, bearer receipts, batching that does not hide action type, and Free-plan CPU feasibility.
B's vendor facts that I re-checked are correct.

**Survivability: adequate** for in-scope actors (stronger than A on ordinary queries; weaker on
operability). Weak if deployed as mapping b3 (one process holding every credential), which B itself
labels weak.

### 2.1 Fatal

None for in-scope actors.

### 2.2 Serious

- **S-B1. The Board service sees a per-student tag set in one call, so per-item unlinkability fails at
  the service layer.** For "you upvoted this" (item 2) and for the in-app inbox (item 7a) the Gateway
  asks LINKAGE for the viewer's tags for N visible questions and then asks BOARD "which of these tags
  exist". BOARD therefore receives, in a single request, N tags that all belong to one (unnamed)
  student, and learns which of them are present. B's claim that "DB-Board cannot even tell that the
  same student upvoted Q1 and Q2" holds for the *database*, not for the *service* that reads it. One
  debug log line, a BOARD compromise (B rates "Compromised BOARD only" as "privacy holds"), or a
  Cloudflare log with RPC arguments rebuilds a pseudonymous profile per page view, and page views
  cluster right after sign-in. That profile is the "identity-linked discussion analytics" §3 forbids,
  waiting for one timing match. Fix: BOARD returns the full tag set for the N visible questions (at most
  roster-size × 32 bytes each) and the **Gateway** tests membership locally; BOARD never receives a
  viewer's tags. Same for follow tags in the inbox. Add an RPC contract test: no BOARD read method
  accepts tags as input.
- **S-B2. Receipts are bearer tokens (§7.9 "credit the right student", §7.10 "verified").** F-8 has
  the browser retry `POST /credit {receipt}`. The receipt carries `event_id, course_id, action, exp`
  and is credited to whichever session submits it. Students can trade or sell receipts within a course
  (X posts, hands Y the receipt, Y gets the credit), and a shared lab browser leaks pending receipts to
  the next user. The verified level shared with the instructor can then be one the named student did
  not earn. Fix: the Gateway wraps the receipt with a MAC over `(receipt, cpid)` under a Gateway key
  before it ever reaches the browser, and the consumer rejects a cpid mismatch; this adds no identity
  to any store. Test: a receipt issued in session A and submitted in session B is rejected.
- **S-B3. Batching hides time but not action type, so per-cpid deltas link a cpid to specific content
  for anyone with DB-Board + DB-Participation history.** The flush rule is "≥ k_batch events from ≥ 2
  distinct cpids". A batch that contains one question and five upvotes produces per-cpid deltas such
  as `cpid1: questions+1`, `cpid2: upvotes+5`; DB-Board's buckets show exactly one new question in the
  window. D1 Time Travel (always on, any minute in 7 or 30 days, verified §5) lets the holder of both
  DBs diff every batch. Over a term this builds a **cpid → authored-questions** profile without
  `K_root`; stylometry or one self-identifying post then names it, and every other post by that cpid
  follows. B rates the both-dumps attacker "Beyond (mostly holds)", which overstates it. Fix (owner
  decision, extends PNQ-B1): require ≥ k events **of each action type** from ≥ k distinct cpids per
  flush, or apply credits once per course per day in a single transaction, and document the residual.
  This is beyond the required scope, but B's documented limitation must be corrected.
- **S-B4. Free-plan CPU feasibility is under-scoped, which threatens the cost target.** B spikes only
  the merge (≈2N HMACs). The email sweep is roster × updated-questions HMACs (500 × 40 = 20,000 per
  sweep), the inbox and "you upvoted" paths run tens of HMACs per page view, and level-email
  resolution is another roster scan. Workers Free allows 10 ms CPU per invocation (B's [F3]). Likely
  outcome: Workers Paid at $5/month, which B honestly says meets but does not beat "<$5/month".
  **Unverified** until spike S-B2 includes the sweep. Not a privacy break, but a feasibility one: an
  owner forced off Free mid-term may "temporarily" merge Workers, which collapses the separation.
- **S-B5. Level-histogram and survey sequencing attacks.** B does raise both the shares-differencing
  attack (DF1-DF4) and the time-series channel (PNQ-B10, "refresh at most daily"). Daily refresh is
  still enough to attribute a level change to a single day's content in a quiet course; see S-A3 and
  cross-cutting X2/X3.

### 2.3 Minor

- **M-B1. `notif_seen.last_seen_bucket` and `survey_eligibility.submitted` are activity timestamps in
  DB-Identity** (the first moves whenever a student opens the inbox, often right after posting; the
  second flips at submission). With D1 Time Travel the flip minute is recoverable. Both-DB holder
  only, but it contradicts "DB-Identity: not stored: anything from DB-Board". Coarsen to a day or move
  `notif_seen` to the client.
- **M-B2. Queue messages carry the exact send time.** Cloudflare's consumer `Message` has `readonly
  timestamp: Date`, "A timestamp when the message was sent" (verified §5). The random `delaySeconds`
  therefore hides time only if the PARTICIPATION consumer never logs or stores `message.timestamp`.
  Add a lint rule and a test that the consumer ignores it.
- **M-B3. `participation_started` is set synchronously by the Gateway on the first action** (item 6).
  It records the exact moment of the course's first post. One bit, but in a small course it is that
  student's first action. Harmless if the flag is set at policy publication instead (PNQ-B5).
- **M-B4. "Tags matching no roster member are carried over unchanged" on merge.** Correct for deleted
  accounts, but if `listEverEnrolledStudentIds` ever omits a user who later re-enrols, that user can
  upvote B again and be double-counted. Keep a tombstone per removed user until the course is sealed.
- **M-B5. Workers observability is on by default for new Workers** (verified §5). B already plans a CI
  check per `wrangler` config; note also that Cloudflare says Observability pricing changes on
  2026-12-01 (verified §5), which is a cost item for the Paid fallback.

### 2.4 Unmet or partly met requirements

- §7.9 / §7.10 integrity: partly met until S-B2 is fixed.
- §3 "identity-linked discussion analytics": at risk at the BOARD service layer until S-B1 is fixed.
- §10 "Students alone decide whether to share": partly met (S-B5 / X2).
- §7.13 email: met with content-free digests; "Answer posted" recipient correctly left open (PNQ-B7).
- Checklist items 3, 5, 6, 10, 13, 14, 15, 16 are handled concretely; item 16 correctly raised as
  PNQ-B11.

### 2.5 Vendor-fact errors

None found. Re-checked: D1 10 databases on Free / 50,000 on Paid, 500 MB / 10 GB, Time Travel 7 / 30
days; Workers Logs on by default for new Workers; Queues on Free with 10,000 ops/day and fixed 24 h
retention, 3 ops per message (§5). One omission: the 2026-12-01 Observability pricing change.

### 2.6 Implementation pitfalls that would silently break anonymity

- **P-B1. A new Worker inherits observability** (default on) and logs RPC arguments or `console.log`
  output; covered by B's F-3 test only if the CI check enumerates *all* configs, including ones added
  later. Make the check "every Worker must explicitly set observability", not "these N Workers".
- **P-B2. "Temporary" consolidation.** Under CPU or deadline pressure (S-B4), merging LINKAGE into the
  Gateway or giving one Worker two D1 bindings removes the main guarantee. B's binding-matrix test
  catches this only if the matrix file itself is protected (CODEOWNERS-style review; for a solo owner,
  an ADR requirement).
- **P-B3. Error reporting on the Gateway.** If an error SDK is added later, its defaults may capture
  request bodies and IP (verified for Sentry's Next.js SDK, §5); the Gateway is the one place where
  that is a full identity + content join.
- **P-B4. Restoring one D1 database** (F-11) also silently rolls back `processed_events`, so replayed
  receipts within expiry would credit twice; B notes credit loss but not double credit.

### 2.7 Missing tests

- RPC contract: no BOARD method accepts viewer tags (S-B1).
- Receipt bound to the issuing cpid (S-B2).
- Batch composition: every flush satisfies the per-action-type rule; snapshot-diff test extended to
  action types (S-B3). B's existing snapshot-diff test only checks "single-cpid change attributable to
  A's post time".
- Consumer never reads `message.timestamp` (M-B2).
- CPU budget test for the email sweep at realistic roster sizes (S-B4).

### 2.8 What would fix it

S-B1 (membership test in the Gateway), S-B2 (cpid-bound receipts), S-B3 (per-type batch rule or daily
apply), and an honest re-run of spike S-B2 including the sweep. With these, B is **strong** against
in-scope actors and somewhat stronger than A against a single-DB dump holder. It does not paint
production into a corner (portable RPC contracts, no schema lock-in beyond D1's SQLite dialect), but
its operational cost for a solo developer (B's own estimate ≈29-39 sessions vs A's ≈13-17) is the
real risk: complexity is where privacy bugs hide.

## 3. Design C (cryptographic / user-held)

Overall: C itself recommends *not* adopting C1 for the prototype and instead proposes hybrid H1
(server HMAC pseudonym now, client blind-signed pseudonym later) plus blind-token survey. I therefore
attack both C1 and H1. C's crypto facts are accurate and its honesty about JS delivery, token
transfer and Sybil re-issuance is good. But its data model **reintroduces an author reference on every
content row**, which A and B deliberately avoid, and two of its comparative claims are wrong.

**Survivability: weak** as written (C1 and H1). The weakness is in the data model, not the crypto, and
is fixable by adopting A/B's per-item tags (then C contributes only the survey token, which is good).

### 3.1 Fatal

- **F-C1. H1 makes all past authorship silently recoverable by whoever holds `K_c`, which defeats
  §6.4 "Default: nobody can deanonymize" in practice.** H1 keeps C1's schema: `questions.author_pseudonym`,
  `comments.author_pseudonym`, `reports.reporter_pseudonym`, all keyed by `P = HMAC(K_c, user_id)`.
  The server needs `K_c` online for every request, so the operator (or anyone with app secrets + a DB
  dump, or a legal order) recomputes `P` for the roster and reads **every question and comment's
  author** retroactively, with no approval, audit or notice. In A and B, authorship is never stored, so
  the same actor gets only upvote/follow/report sets. C §4 even states the comparison backwards:
  "Under A/B a dump that includes `K_c` … links everything"; under A/B it links votes but **not**
  authorship, while under H1 it links authorship too. C §8.4 adds that under H1 "`K_c` can sit under
  k-of-n custody", but a key used on every request cannot be held k-of-n offline. Net effect: the
  recommended path is a silent, unaudited deanonymization capability for the operator, which is the
  "easy to misuse" outcome of checklist item 14. (For in-scope actors who never hold `K_c` it is not a
  break, which is why this is fatal to H1 *as a recommendation*, not to C1's crypto.)
  Fix: drop `author_pseudonym` from content rows entirely (A/B pillar P1). Credit at post time with no
  stored author reference; keep per-item tags for upvotes/follows/reports/unclear.

### 3.2 Serious

- **S-C1. Per-course pseudonymous profiles in the content store (§3 "individual activity
  breakdowns", "identity-linked discussion analytics").** Under C1 and H1, any query that can read the
  Board store can `GROUP BY author_pseudonym` across questions, comments, upvotes, follows, reports and
  unclear marks. C mitigates only with "staff APIs never expose pseudonym-grouped data" and an optional
  `authorship` side table. One identification (a self-identifying post, classroom observation, the
  share-timing link below, stylometry over the grouped posts) exposes everything that student did.
  C §4 concedes that grouping makes stylometry easier. A/B prove per-item tags meet §7.7 without it.
- **S-C2. Level-token issuance followed by sharing links the pseudonym to the name.** At sharing time
  the student's browser asks Participation for a level token (authenticated by `s_c`, and
  `level_token_issued` flips for that `P_c`) and then shares on the identity origin. Students will do
  these back-to-back. Request logs on both origins (same IP, seconds apart), or a store holder who can
  see which `P_c` at level L got a token on the day a named level-L share appeared, can match them; with
  one token request per level per day the match is exact. Unlike A/B, where a share reveals only the
  level, here the match exposes the student's **entire** authored history (S-C1). C proposes "issue
  tokens automatically for everyone on window open" (not possible with blind signing: the client must
  send the blinded message, so issuance still happens per visit) and "the client waits at least one
  day", which means a student who clicks Share and never returns is never shared. That conflicts with
  §7.10/§10 "Students alone decide" in the other direction (their decision silently not executed), and
  with Q18 deadlines.
- **S-C3. The "key structural finding for Q9" is overstated.** C concludes "exact merge
  de-duplication requires a per-course linkable pseudonym". That is true only if no server party holds a
  linking key. A and B both achieve exact merges with per-item unlinkable tags by roster recomputation
  inside a privileged definer or LINKAGE service. If this sentence goes into the Q9 ADR unqualified, it
  would wrongly push the owner toward pseudonym-on-row designs. Correct wording (proposal): "exact
  merge de-duplication requires either a per-course linkable pseudonym, or a server-held key that can
  re-derive per-item tags from the roster".
- **S-C4. Integrity regressions are real and unbounded by design** (C admits them): level-token
  transfer (NQ-C5), Sybil pseudonyms through claimed device loss (NQ-C3) giving double upvotes (§7.7)
  and double level tokens, and permanent credit loss on device loss. For a graded feature (§7.11) each
  is a reason not to use C1 for the prototype; I agree with C's own verdict.
- **S-C5. §7.13 email is partly unmet under C1.** Options N1 (in-app only) and N2 (uniform digest to
  everyone) do not deliver "Answer posted" / "Followed question updated" / "Level reached" by email to
  the specific student. C correctly raises NQ-C1; the owner must accept the trade-off explicitly.

### 3.3 Minor

- **M-C1. Precise timestamps remain on Board rows** (`questions.created_at`, `comments.created_at`,
  `reports.created_at`, `moderation_log.at`), and counters are incremented in the same transaction as
  the content insert. C recommends day-coarsening elsewhere but not in its own schema.
- **M-C2. `threshold_version_at_first_participation` per pseudonym** is a coarse "when did this student
  start" datum. Unnecessary if the rule is "never raise thresholds after participation starts" (as A/B
  propose); C raises NQ-C7 instead.
- **M-C3. `moderation_log.counts_before_after`** reveals how many students upvoted both duplicates. C
  flags it; agree it is minor except in tiny classes.
- **M-C4. Library runtime requirement.** `@cloudflare/blindrsa-ts` 0.4.6 declares `"node": ">=24"`
  (verified §5), which C does not mention; check the chosen host's Node runtime before adopting the
  survey-token proposal.
- **M-C5. Survey token timing.** The blind token removes stored linkage, but the client may "submit
  immediately", so issuance (identity origin) and submission (survey origin) are seconds apart from
  the same IP in host logs. Same residual as A/B's completion flag; add client-side delay or submit on a
  later visit, and see X3 for the survey-then-share sequencing attack.

### 3.4 Unmet or partly met requirements

- §6.4 default "nobody can deanonymize": unmet in practice under H1 (F-C1) for the operator; met under
  C1 for stored data.
- §3 profiles / activity breakdowns: at risk (S-C1).
- §7.13 targeted email: partly unmet under C1 (S-C5).
- §7.7 "without double-counting a student": not guaranteed under C1 re-issuance (S-C4).
- §7.10 verified level: not guaranteed under C1 token transfer (S-C4).

### 3.5 Vendor-fact errors

- None in the crypto/standards facts I re-checked (blindrsa-ts 0.4.6, Apache-2.0, `sjcl` 1.0.9
  dependency: correct, §5). Omission: the Node ≥ 24 engine requirement (M-C4).
- Comparative-claim errors (not vendor facts but decision-relevant): the A/B dump comparison and the
  k-of-n custody claim in F-C1, and the merge "structural finding" in S-C3.

### 3.6 Implementation pitfalls

- **P-C1.** Building H1 "pseudonym-keyed everything" because it is the easy path, then later adding a
  staff "related posts by this author" feature for moderation convenience: one query exposes profiles.
- **P-C2.** Serving the board origin and identity origin from one host project with one log stream:
  the log holder sees both, which removes C's main gain (C §4 admits this).
- **P-C3.** Using the deterministic RFC 9474 variant for pseudonyms (C lists this; keep the test).
- **P-C4.** Storing the wrapped `s_c` backup per `user_id` (option 2.4b) and later adding a
  "help me recover" support tool that unwraps it: an impersonation path (Q7) that also deanonymizes.

### 3.7 Missing tests

- Under H1: no content table has any author/reporter column (would fail today by design; F-C1).
- Share-timing test: in a seeded course, the gap between level-token issuance and share is never
  observable at better than the documented granularity in any stored field.
- Staff-route test that no response groups content by pseudonym (C's T-N1 checks "no pseudonym", not
  "no grouping": a staff route returning "3 other posts in this thread by the same author" would pass).

### 3.8 What would fix it

Replace C's pseudonym-on-row model with A/B's no-author-column, per-item-tag model (fixes F-C1, S-C1,
most of S-C2). Keep from C: the blind-token exit survey (with client delay), two cookie-separated
origins, the structural "no shared byte string across dumps" test (T-C1), and the honest JS-delivery
limitation. Re-word S-C3. With those changes, "C" collapses into "A or B plus a stronger survey", which
is the right outcome for the prototype; C1 as a future "strong anonymity mode" (C §9) would still need
the S-C1/S-C2 redesign.

## 4. Cross-cutting attacks (hit every design)

| # | Attack | Actor | A | B | C | Proposed fix (owner decision where marked) |
|---|---|---|---|---|---|---|
| X1 | **Error-reporting SDK defaults.** Sentry's Next.js SDK, by default, "collects the bodies of incoming requests on the server side", sends the client IP, and attaches cookies (sensitive values masked); anything set with `Sentry.setUser()` "is always sent" (verified §5). One error on `POST /questions` with `setUser` anywhere in the app = identity + question text in one error report, which §3 and §6.2 forbid outright. | Log holder, error vendor, operator (in scope: "error report") | Says "scrub bodies" (F16) but does not name the default | Defers the decision | Says "strips bodies" | Ban request-body capture and `setUser` on every route that receives anonymous content; set `dataCollection` explicitly; canary test that sends a forced error from each content route to a local error sink and asserts no identity + content co-occurrence. Applies to any vendor chosen. |
| X2 | **Level-histogram time series.** Repeated reads of the §7.16 level distribution during term, diffed against the content timeline, attribute threshold crossings to specific posts; the named shares list later narrows the candidates. Also leaks non-sharers' levels after sharing (the known differencing attack). | Instructor/TA (in scope) | Misses pre-window (S-A3) | Raises it, daily refresh (PNQ-B10) | Only post-share differencing | Owner decision (NEW-1): level distribution as one end-of-term snapshot after sharing is final, or fixed-cadence frozen snapshots with lag; never on demand. |
| X3 | **Survey-then-share sequencing.** §7.12 presents the survey "before participation-level sharing". A student who submits the survey and then shares in one sitting produces a new survey response and a new named share on the same date. If written responses are revealed live once the minimum N is met, an instructor watching the results sees a new text appear beside a new named share and, in a small class, links them. | Instructor (in scope) | Shuffle-flush at k, but reveal is live | Batches ≥ k, reveal live | Token + batched writes, reveal live | Owner decision (NEW-2): reveal survey text and counts only after the survey closes, in one batch, and never refresh results while the survey is open. |
| X4 | **Post-redirect-get leaks the author to host logs.** After `POST` creates a question, the usual redirect to `GET /…/q/<new_id>` writes "IP X fetched the brand-new question id" into host request logs (Vercel runtime logs record path and search params, A [V18]); auth-provider logs map IP X to a named sign-in. | Operator, host and auth vendors, log holder | Not mentioned | Not mentioned | Two origins do not help (same host logs) | Render the new question from the POST response (no GET of the new id immediately after posting) or accept and document; keep content ids out of query strings; keep host log retention at the minimum. |
| X5 | **Live counters in class.** `upvote_total`, new-question arrival and "Still unclear" counts updating live on a projected screen while one student is visibly tapping a phone (§7.8). | Other students, instructor | NQ-A18 | Mentioned | Mentioned | Presentation mode shows a snapshot taken when the question is selected; no live increments (owner decision, extends NQ-A18). |
| X6 | **Impersonation tools (Q7).** Every design's "my state" functions are session-bound. Any support impersonation (or "log in as student" debug route) lets the impersonator read that student's counts, upvote/follow state and level, i.e. a per-student deanonymization of votes. | Operator, admin | Flags it (Q7) | Not mentioned | Recovery-tool variant (P-C4) | If Q7 ever allows impersonation, privacy surfaces must be excluded by construction and audited; test that impersonated sessions get no `my_*` responses. |
| X7 | **Notification template granularity.** Even content-free emails leak if the template differs per event ("Question merged" vs "Answer posted"): a merge on day D plus the audit log's merge date tells the email provider plus operator who followed the merged question. | Email vendor + operator | Uses template keys | Generic text | Generic text | One generic template for all content-related notices; batch per day; disable open/click tracking (provider facts **Unverified**, belong to Q6). |
| X8 | **IP and timing correlation with sign-in logs.** Content time (even coarsened), counter changes, email sends and host request logs all carry time; the auth provider maps IP to name. | Operator, vendors, legal compulsion | Documented limitation | Documented | Documented; OHTTP needs a non-colluding relay | Not fixable in a <$5/month prototype. Must be in the "limitations of anonymity" (§6.2, §11). |
| X9 | **Stylometry / self-identification / small classes.** Not engineerable. | Everyone | Documented | Documented | Documented (and worsened by grouping, S-C1) | Document; per-item tags (A/B) at least avoid handing the attacker a ready-made grouping. |
| X10 | **Hide/delete and credit (checklist 16) and self-upvotes.** With no author link (A, B), credit for hidden spam cannot be revoked and self-upvotes cannot be blocked; adding a link weakens P1. | Integrity | NQ-A4/A5 | PNQ-B11 | NQ-C10 | Owner decision before the Q9 ADR (already raised by all three). |
| X11 | **Backups and history outlive crypto-shredding.** Supabase daily backups, Neon history, D1 Time Travel (7/30 days, always on) keep keys and tags restorable after shredding. | Operator, vendor, legal compulsion | Documented | Documented | Documented (H1) | State shredding as "effective after the backup window" in the limitations text. |
| X12 | **Mid-term account deletion (Q17) breaks merge de-dup** for A/B (tags can no longer be recomputed) and loses the pseudonym in C. | Integrity | Keep dropped enrolments | Keep dropped enrolments | Not addressed | Keep enrolment tombstones until the course is sealed (Q17). |

### 4.1 Actors no design can protect against (must become documented limitations, §6.2, §11)

- The **active** operator or anyone with deploy rights: can ship code that logs author + content going
  forward (all three), or JS that exfiltrates `s_c` (C1).
- The **host vendor** (runs the code, holds secrets) and, for Supabase Vault, the DB vendor (holds the
  root key, A [V13]).
- **Network/timing correlation** across host, auth and email logs within their retention (X4, X8).
- **Legal compulsion** of whatever exists at the time: A/B can hand over vote/follow/report sets with the
  key; H1 can hand over authorship (F-C1); all can hand over logs.
- **Stylometry, self-identification, classroom observation, very small classes** (X5, X9).

### 4.2 Where the three designs agree and are right

No author column on content (A, B); keyed, never unkeyed, pseudonyms (all, §12 known issue); UUIDv4
only, never v7 (all); content-free email with generic links and digest timing (all); counters
untouched by merges (all; the "two upvotes given after merge" semantics is correctly an open
question); threshold versions immutable and only lowerable after participation starts (all; owner
must confirm the reading of "disadvantage", §7.9); verified level computed server-side (A, B; C1 only
via blind token, with the transfer caveat).

## 5. Vendor/standard facts re-checked by the red team

All fetched with WebFetch, checked 2026-10-11.

| Fact | Result | URL |
|---|---|---|
| Workers Logs default | "All newly created Workers will come with the observability setting enabled by default." Invocation logs carry "Request, Response, and related metadata"; whether headers/bodies are captured is not stated. `invocation_logs = false`, `head_sampling_rate` 0-1. Free 200,000 logs/day, 3-day retention; Paid 7 days. Observability pricing changes from 2026-12-01. Confirms B [F8] | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ (checked 2026-10-11) |
| Queues `Message.timestamp` | `readonly timestamp: Date;` "A timestamp when the message was sent." `delaySeconds` 0-86400 on send | https://developers.cloudflare.com/queues/configuration/javascript-apis/ (checked 2026-10-11) |
| Queues on Free | Available; Free 10,000 operations/day, retention "24 hours (non-configurable)"; Paid 1,000,000 ops/month + $0.40/million, 4 days default up to 14; 3 operations per message. Confirms B [F2] | https://developers.cloudflare.com/queues/platform/pricing/ (checked 2026-10-11) |
| D1 limits | Free 10 databases, 500 MB, Time Travel 7 days; Paid 50,000 databases, 10 GB, 30 days. Confirms B [F1]/[F7] | https://developers.cloudflare.com/d1/platform/limits/ (checked 2026-10-11) |
| Postgres `xmin`/`ctid` | `xmin` = "the identity (transaction ID) of the inserting transaction for this row version"; every update creates a new row version. The page does **not** state who may select system columns or whether views expose them, so my S-A1 claims "any role with SELECT on the base table can read `xmin`" and "a view does not expose base-table `xmin`" are **Unverified** here (standard behaviour per model knowledge) and must be demonstrated by a test before the ADR | https://www.postgresql.org/docs/current/ddl-system-columns.html (checked 2026-10-11) |
| `@cloudflare/blindrsa-ts` | 0.4.6, Apache-2.0, single runtime dependency `sjcl` 1.0.9, `"node": ">=24"`, published with SLSA provenance. Confirms C §8.2, adds the Node requirement | https://registry.npmjs.org/@cloudflare/blindrsa-ts/latest (checked 2026-10-11) |
| Sentry Next.js data collection | Server-side incoming request bodies collected by default; IP sent by default; cookies collected (sensitive values `[Filtered]`); `setUser()` data "always sent"; console logs become breadcrumbs. Controlled through `dataCollection` | https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/ (checked 2026-10-11) |

Not re-checked by me (relied on the designs' own citations; **Unverified** by the red team): Supabase
Vault, roles, Data API change on 2026-10-30, pricing; Neon roles and pricing; Vercel runtime-log
retention; RFC statuses in C's verification log; WebAuthn PRF compatibility. I found no internal
contradictions among the three notes on these.

## 6. Proposed new open questions

None of these is answered here. Several overlap with the designs' own NQ lists; I give the closest
existing ID.

| ID | Question | Why it matters | Related |
|---|---|---|---|
| NEW-1 | When and how often may instructors see the level distribution (§7.16): continuously, at a fixed cadence, or once after sharing is final? | Time-series differencing (X2), §10 "Students alone decide" | NQ-A7, PNQ-B10, NQ-C9, Q16, Q18 |
| NEW-2 | May exit-survey results (counts and text) be shown while the survey is still open, or only after it closes? | Survey-then-share sequencing (X3) | Q16, Q18, NQ-A14, PNQ-B9 |
| NEW-3 | Is the operator inside the trust boundary for the prototype and for production? | Decides whether B's or C's extra machinery buys anything | NQ-A9, PNQ-B13, NQ-C2 |
| NEW-4 | Which third-party error-reporting / analytics tools, if any, may run on routes that receive anonymous content, and with which data-collection settings? | X1 is a §3 violation by default | A F16, Q3 |
| NEW-5 | Must credit tokens or receipts (if a deferred-credit design is chosen) be bound to the issuing session? Is credit transfer between students a grading-integrity concern the owner wants engineered out? | S-A4, S-B2, S-C4 | §7.9, §7.10, §7.11 |
| NEW-6 | Should a student's first view of their own new question avoid a GET of its id (X4), accepting a small UX constraint? | Host-log authorship link | Q3, Q8 |
| NEW-7 | Is a single generic email template acceptable for all content-related notifications (X7)? | Email provider + audit log linkage | Q6, Q13 |

## 7. Ranking summary (proposal for the owner, not a decision)

| Design | Survivability | Biggest fix needed |
|---|---|---|
| A (DB-enforced) | adequate (strong after fixes) | Stop `cc_web` reading `xmin` on base tables and no-op identity upserts (S-A1); keep the KEK out of SQL parameters (S-A2); end-of-term level snapshots (S-A3) |
| B (separated services) | adequate (strong after fixes) | Gateway-side tag membership (S-B1); cpid-bound receipts (S-B2); per-type batching (S-B3); CPU spike incl. email sweep (S-B4) |
| C (cryptographic) as recommended (H1) | weak | Remove author pseudonyms from content rows (F-C1, S-C1); fix the merge and dump comparison claims (S-C3) |

Red-team proposal: A's data model and catalog-test discipline, B's "no BOARD method takes viewer
tags" and binding-matrix ideas where they apply, C's blind-token survey and two-origin cookie split,
plus the cross-cutting fixes X1-X4. That combination meets every in-scope §6.2/§9 requirement I could
attack, and leaves the operator/vendor limitations in §4.1 to be documented, not engineered.
