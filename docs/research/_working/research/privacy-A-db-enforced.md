# Privacy mechanism candidate A — one PostgreSQL database, separation enforced by the database itself

> **Research note (advisory, not a decision).** This note addresses CONTRIBUTING §6.3 / Q9. Anything
> marked **Proposal** needs the owner's approval and an ADR (§1, §6.3, §14). Anything marked **OQ** is
> an open question: an existing §13 item (Q*n*) or a proposed new one (NQ-A*n*, listed in §10).
> Vendor and standards facts are tagged **[Vn]**. Each tag points to Appendix A, which gives the URL
> and "(checked 2026-10-11)". Anything I could not verify is labelled **Unverified** and collected in
> Appendix B.
>
> Author role: privacy/security architect for "Family A". Other families (event pipelines, separate
> stores, client-side crypto, blind tokens and so on) are being designed independently. This note is
> the strongest practical version of Family A, and it states the family's weaknesses plainly.

---

## 0. Scope: what the spec requires and what this note adds

**Required protection** (§6.2, §9, §3). Ordinary application queries, instructors, TAs and
institutional admins must not be able to map students to their anonymous questions, comments or
upvotes. Identity and anonymous-content text must never appear together in a log, analytics event,
error report, DB view, export or admin dashboard. Predictable identifiers must not reveal authors.
§9 requires negative tests that prove this at the UI, API, export, log and identifier levels.

**Stronger than required.** This covers protection against the platform operator (the owner, who
has a DB console and deploy access), the hosting/DB/auth/email vendors, and anyone holding raw
database files or WAL. Family A cannot fully protect against these actors. §4 and §6 say exactly
where it falls short. Those gaps become the "limitations of anonymity" that must be documented
(§6.2, §11).

---

## 1. Mechanism summary

**One paragraph.** All five §6.1 domains live in one PostgreSQL database, each in its own schema.
**Questions and comments carry no author column at all**, not even a pseudonymous one. Once a
posting transaction commits, the logical data holds no record of who wrote what. Per-student state
lives in locked schemas that the web application's database role (`cc_web`) cannot read. That state
is the private counters (domain 2), plus the per-item de-duplication facts: "this student already
upvoted / follows / reported / marked unclear this item". Counters are keyed by a **keyed
pseudonym** `pid = HMAC(K_c, "pid" ‖ user_id)`. De-duplication facts are stored as **per-item keyed
tags** such as `HMAC(K_c, "up" ‖ user_id ‖ question_id)`. These tags cannot be linked across items
or back to a student without the per-course key `K_c`. `K_c` is stored only in wrapped (encrypted)
form. Unwrapping it needs a key the database does not store: the Supabase Vault root key, or an
app-held key-encryption key (KEK). Only `SECURITY DEFINER` functions owned by separate NOLOGIN
roles touch the locked data. They are the "narrowly scoped internal API" of §6.2. The web role can
call only a whitelist of them, and it passes a **session secret** rather than a bare user id, so
the function resolves who the caller is inside the database. Crediting is either synchronous, in
the posting transaction (Mode S, the simple baseline), or deferred through a one-time credit token
the client redeems later (Mode D, which closes the transaction-ID side channel described in §4).
The database's own catalog makes the guarantees testable: grants, RLS policies, function owners,
`search_path`, settings, and the absence of author columns and cross-domain views can all be
checked by automated tests (§9).

**Pillars, referred to later as P1–P5:**

- **P1, no author data.** Content rows (questions, comments, survey responses) store no author,
  pseudonym, tag or session.
- **P2, locked per-student state.** Counters are keyed by the keyed pseudonym `pid` and stored in
  schemas `cc_web` cannot read.
- **P3, per-item tags.** De-duplication uses per-item keyed tags, which are unlinkable across items
  without the key.
- **P4, wrapped keys.** `K_c` is stored wrapped. The unwrap key is not in the database.
- **P5, definer-only, session-bound API.** The locked data is reached only through `SECURITY
  DEFINER` functions, and the caller is identified by a session secret, not a user id.

On top of the pillars come hygiene rules: timestamp coarsening, UUIDv4 identifiers, logging
configuration invariants, and the Mode S / Mode D choice.

**Diagram (text).**

```
 Browser ──HTTPS──▶ App server (Next.js or similar)
                     • knows session + request body IN MEMORY only, never logs both
                     • DB login cc_web (all ordinary routes), cc_auth (OIDC callback only),
                       cc_jobs (scheduled jobs); KEK in host secret store (Variant W)
                     │  parameterised calls only:  SELECT api.ask_question($1,$2,$3,$4)
                     ▼
 ┌─────────────────────────────── PostgreSQL (single database) ───────────────────────────────┐
 │  readable by cc_web (RLS-scoped)        │  LOCKED: no grants to cc_web; RLS default-deny    │
 │  ─────────────────────────────────      │  ───────────────────────────────────────────     │
 │  catalog.*   courses, assignments,      │  identity_private.sessions  (token hashes)        │
 │              cards, institution config  │  keys.course_keys           (wrapped K_c)         │
 │  identity.*  users, enrollments, staff  │  participation.counters     (pid → q/c/u counts)  │
 │              permissions (no activity   │  participation.level_notice (pid → last level)    │
 │              timestamps)                │  content_tags.upvote/follow/unclear/report        │
 │  content.*   questions, comments,       │  survey_private.completions (who completed)       │
 │              answers (NO author column),│  survey.buffer / survey.responses (no identity)   │
 │              redirects, upvote_total    │  ratelimit.buckets          (HMAC subject)        │
 │  shared.v_instructor (name, level,      │  notify.email_outbox        (content-free)        │
 │              date shared)               │                                                    │
 │  audit.moderation_events (IDs, no text) │                                                    │
 │                                         │                                                    │
 │  api.*  SECURITY DEFINER functions, each owned by a NOLOGIN role with only the table rights │
 │         it needs, `SET search_path = ''`, EXECUTE revoked from PUBLIC, granted to cc_web     │
 │                                                                                              │
 │  api.ask_question(session, course, tag, body):                                              │
 │     user := resolve(session)     K_c := unwrap(course)     INSERT content.questions(no author)│
 │     Mode S: UPDATE participation.counters SET questions+1 WHERE pid = HMAC(K_c,'pid'‖user)  │
 │     Mode D: INSERT participation.pending_credit(token_hash, course, kind); RETURN token     │
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
   Platform admin role (Supabase `postgres` / Neon `neondb_owner`) = the OPERATOR: bypasses RLS,
   can read everything. Out of the required scope; documented as a limitation.
```

---

## 2. Data model sketch

### 2.1 Roles (**Proposal**)

| Role | Login? | Purpose | Gets |
|---|---|---|---|
| `cc_owner` | NOLOGIN | Owns all schemas and tables | Ownership only. Not used at runtime. RLS is `FORCE`d on locked tables so ownership alone does not bypass RLS (see [V2]) |
| `cc_fn_board` | NOLOGIN | Owns board functions (ask, comment, upvote, follow, unclear, report) | INSERT on content tables; SELECT/INSERT on `content_tags.*`; SELECT on `keys.*` and `identity.enrollments`; UPDATE on `participation.counters` (Mode S) or INSERT on `pending_credit` (Mode D); `ratelimit.*` |
| `cc_fn_merge` | NOLOGIN | Owns `api.merge_questions` | The board rights plus roster SELECT. No counter rights: merges never touch counters (§3 item 3) |
| `cc_fn_particip` | NOLOGIN | Owns `my_participation`, `share_level`, `revoke_share`, threshold publishing | `participation.*`, `keys.*`, INSERT/DELETE on `shared.results` |
| `cc_fn_survey` | NOLOGIN | Owns survey submit and results functions | `survey.*`, `survey_private.*` |
| `cc_fn_notify` | NOLOGIN | Owns compute-on-read notification functions and the digest builder | `content_tags.follow` SELECT, `notify.*`, roster |
| `cc_fn_session` | NOLOGIN | Owns `resolve_session`, `create_session` | `identity_private.sessions` |
| `cc_web` | LOGIN | Every ordinary request | SELECT on `catalog.*`, `identity.*` (RLS), `content.*` (RLS), `shared.v_instructor` (RLS); EXECUTE on the `api.*` whitelist. **Nothing else** |
| `cc_auth` | LOGIN | Used only by the sign-in callback route | EXECUTE `api.create_session` only |
| `cc_jobs` | LOGIN | Scheduled jobs: digests, nightly level notices, survey flush, washing, end-of-term seal | EXECUTE on `jobs.*` definer functions only |
| `cc_migrate` | LOGIN (CI only) | Migrations | Member of `cc_owner`. Credentials only in CI secrets |
| Platform admin | LOGIN | Vendor-provided superuser-like role | **Bypasses RLS.** On Supabase `postgres` has `bypassrls` and is the default owner [V12]. On Neon, roles created in the Console are members of `neon_superuser` (BYPASSRLS, `pg_read_all_data`) [V15]. This is the operator |

Why there are separate function-owner roles: if one function has a bug, the damage is limited to
the tables that function's owner can reach. This is the "restricted service roles" technique of
§6.2.

### 2.2 Domains → schemas (§6.1)

| §6.1 domain | Schema(s) | Tables (sketch) | `cc_web` can read? |
|---|---|---|---|
| (not a §6.1 domain: course catalogue) | `catalog` | institution_config, courses, assignments, course_cards, assignment_cards, card_versions | Yes (RLS: enrolled/teaching) |
| 3. Student identity and enrollment | `identity`, `identity_private` | users, enrollments (incl. dropped, see §3 item 3), staff_permissions; `identity_private.sessions` | `identity`: yes, RLS-scoped. `identity_private`: **no** |
| 1. Anonymous discussion content | `content`, `content_tags` | questions, comments, answers, question_redirects, merge_events; `content_tags.upvote / follow / unclear / report` | `content`: yes (RLS: course + visibility). `content_tags`: **no** |
| 2. Private per-student counters | `participation`, `keys` | counters, threshold_versions, policies, course_state, level_notice, pending_credit (Mode D); `keys.course_keys` | **No** (only through `api.my_participation`) |
| 4. Instructor-visible shared results | `shared` | results; view `v_instructor` (name, level, date shared) | View only (RLS: instructor of that course) |
| 5. Anonymous exit-survey responses | `survey`, `survey_private` | instances, buffer, responses; `survey_private.completions` | **No** (only through gated results functions) |
| Cross-cutting | `audit`, `notify`, `ratelimit`, `api`, `jobs` | moderation_events; email_outbox; buckets; functions only | `audit`: through a function only. Others: no |

**Design rule (Proposal): no cross-domain foreign keys** except into `catalog` (course and
assignment ids). In particular, nothing in `content*`, `participation`, `survey*` or `shared`
references `identity.users`, with one exception: `shared.results.user_id`. Domain 4 is identity by
design, because §7.10 says the instructor receives the name. Keeping cross-domain FKs out means the
schemas can later be split into separate databases (§8).

### 2.3 Table sketches (illustrative only, not code)

```
catalog.courses          (id uuid v4 PK, institution_id, code, title, term, ...)
identity.users           (id uuid v4 PK, external_subject text UNIQUE, display_name, email)
                         -- NO last_seen_at, NO last_login_at, NO activity timestamps
identity.enrollments     (course_id, user_id, role {student,instructor,ta}, status {active,dropped})
identity_private.sessions(token_hash bytea PK, user_id, expires_at)   -- no last_seen, no IP, no UA

content.questions        (id uuid v4 PK, course_id, tag_kind {course,assignment}, assignment_id NULL,
                          title, body, status {open,resolved,merged,hidden,deleted}, pinned bool,
                          upvote_total int, created_at timestamptz /*coarsened, NQ-A8*/,
                          last_activity_at timestamptz /*coarsened*/, merged_into uuid NULL)
                          -- NO author_id, NO pid, NO tag, NO session id, NO IP
content.comments         (id uuid v4, question_id, body, status, created_at /*coarsened*/)   -- no author
content.answers          (id uuid v4, question_id, body, staff_author_id? /*NQ-A11*/, created_at)
content.question_redirects (old_id PK, new_id)
content.merge_events     (id uuid v4, course_id, from_id, into_id, occurred_on date)

content_tags.upvote      (question_id, tag bytea, PRIMARY KEY (question_id, tag))   -- no time, no id
content_tags.follow      (question_id, tag bytea, PRIMARY KEY (question_id, tag))
content_tags.unclear     (answer_id,   tag bytea, PRIMARY KEY (answer_id, tag))
content_tags.report      (id uuid v4, content_kind, content_id, reason_code, note text NULL,
                          tag bytea, reported_on date, UNIQUE (content_id, tag))

keys.course_keys         (course_id, key_version, wrapped bytea /*Variant W*/ | vault_secret_id /*Variant V*/,
                          created_on date, destroyed_on date NULL)

participation.counters   (course_id, pid bytea, questions int, comments int, upvotes int,
                          PRIMARY KEY (course_id, pid))  WITH (fillfactor = 50)   -- NO timestamps
participation.policies   (course_id PK, published_threshold_version_id, published_on date)
participation.threshold_versions (id uuid v4, course_id, version_no,
                          contributor_min_qc, contributor_min_up, sustained_min_qc, sustained_min_up,
                          published_on date)   -- immutable once published (trigger blocks UPDATE/DELETE)
participation.course_state (course_id PK, participation_started bool)
participation.level_notice (course_id, pid, last_acknowledged_level, last_emailed_level)
participation.pending_credit (token_hash bytea PK, course_id, kind {q,c,u}, expires_on date)   -- Mode D only

shared.results           (course_id, user_id, verified_level, threshold_version_id, shared_on date,
                          finalized_on date NULL, PRIMARY KEY (course_id, user_id))

survey.instances         (id uuid v4, course_id, opens_on, closes_on, reveal_min_n /*Q16*/)
survey.buffer            (id uuid v4, instance_id, a1 text, a2 text, a3 text)      -- transient
survey.responses         (id uuid v4, instance_id, a1 text, a2 text, a3 text)      -- NO time, NO identity
survey_private.completions (instance_id, user_id, PRIMARY KEY (instance_id, user_id))  -- no time

notify.email_outbox      (id uuid v4, user_id, template_key, course_id, not_before date)  -- content-free
ratelimit.buckets        (subject bytea, action, bucket_start timestamptz, n int,
                          PRIMARY KEY (subject, action, bucket_start))
audit.moderation_events  (id uuid v4, course_id, action, subject_ids uuid[], actor_ref NULL /*NQ-A11*/,
                          occurred_on date)   -- IDs only, never text, never student identity
```

### 2.4 Key derivations (**Proposal**)

- `K_c`: 32 random bytes per course, from `gen_random_bytes(32)`. pgcrypto returns at most 1024
  bytes per call [V7]. RFC 2104 recommends a random key of at least the hash output length L,
  which is 32 bytes for SHA-256 [V10].
- All derivations use HMAC-SHA-256 via pgcrypto `hmac(data bytea, key bytea, 'sha256')` [V7].
  Inputs are fixed-width (a 1-byte label code followed by 16-byte UUIDs) so they cannot be read
  ambiguously:
  - `pid = HMAC(K_c, 0x01 ‖ user_id)`
  - `upvote tag = HMAC(K_c, 0x02 ‖ user_id ‖ canonical_question_id)`
  - `follow tag = HMAC(K_c, 0x03 ‖ user_id ‖ question_id)`
  - `unclear tag = HMAC(K_c, 0x04 ‖ user_id ‖ answer_id)`
  - `report tag = HMAC(K_c, 0x05 ‖ user_id ‖ content_id)`
  - `rate-limit subject = HMAC(K_rl, 0x06 ‖ user_id)`, where `K_rl` is a separate global wrapped key
- **Never** use an unkeyed hash of the user id. CONTRIBUTING §12 records why: anyone with the
  roster could reverse it.

### 2.5 Key custody options (where `K_c` lives)

| Option | Mechanism | DB dump alone | App-server secrets alone | Operator | Portability |
|---|---|---|---|---|---|
| K1: plain locked table | `keys.course_keys(raw)`, readable only by the definer roles | **Reveals K_c**, so every tag and pid is recomputable. Equivalent to an unkeyed hash for this attacker | Can't read the table; can call functions as an oracle | Full | Any Postgres |
| K2: **Supabase Vault** | Vault encrypts secrets with authenticated encryption (AEAD, based on libsodium) under a per-project root key "never stored in the database alongside the encrypted data" [V13] | Ciphertext only [V13] | Oracle only | Full (can obtain the root key through the Management API [V13]) | Supabase only |
| K3: **KEK-wrapped (portable)** | `wrapped = pgp_sym_encrypt(K_c, KEK)`. The KEK is in the host's secret store and passed as a bind parameter on each privileged call; the definer unwraps it | Ciphertext only | Has the KEK but cannot SELECT the wrapped keys; oracle only | Full (holds both) | Any Postgres with pgcrypto |
| K4: KEK in a cloud KMS (production) | Same as K3, but the app fetches the KEK from a KMS at start-up | Ciphertext only | Same as K3 | Full, unless KMS policy separates duties | Production upgrade of K3 |

pgcrypto caveats [V7]: "all the data and passwords move between pgcrypto and client applications
in clear text", so the connection must use TLS and you must trust the DB administrator. The
implementation "does not resist side-channel attacks". The exact PGP function names are
**Unverified** in this session; the page confirms PGP functions exist and recommends them over raw
`encrypt()`. The pgcrypto page also mentions a 2026 CVE fix (CVE-2026-14663) [V7], so keep
Postgres minor versions current.

**Recommendation (Proposal): K3 for portability**, or K2 if the stack ADR (Q3) picks Supabase. Do
not use pgsodium: it is "pending deprecation" and Supabase "does not recommend" it. Vault is "not
affected by this deprecation" [V14].

### 2.6 Option comparisons the brief asked for

**(i) Keyed pseudonym `HMAC(K_c, user_id)` vs (ii) random pseudonym in a locked linkage table**

| | (i) keyed pid (recommended) | (ii) random pid in `linkage(user_id, course_id, pid)` |
|---|---|---|
| Logical DB dump without the KEK | Counters are unlinkable to users | The linkage table is in the dump, so counters link to named users (every student's private counts are exposed) unless the table is encrypted too |
| Operator | Recomputes pids from the roster | Reads the table |
| Secret management | Needs `K_c` custody (§2.5) | None for pid (but tags still need a key) |
| Crypto-shredding (Q17) | Destroy `K_c`: pids, tags and every derivation die together | Delete linkage rows; the tag key must be destroyed separately |
| Rotation | Recompute for the roster: an O(N) job, the same loop as a merge | Trivial |
| Blast radius of a key leak | All past and future data for that course | Linkage: current mapping. Tags are safe if their key is separate |
| Satisfies §12 known issue (no unkeyed hash) | Yes, if the KEK stays secret | Yes (random) |

**(iii) Per-item tags vs one per-course pseudonym on rows**

| | Per-course pid on rows: `upvotes(question_id, pid)` | **Per-item tags** `HMAC(K_c, label ‖ user ‖ item)` (recommended) |
|---|---|---|
| Merge de-duplication | Set union: `INSERT … SELECT … ON CONFLICT DO NOTHING` | The definer enumerates the course roster (≈2N HMACs per merge, ms to s for N ≤ a few thousand; **Unverified** timing) |
| Cross-item profiling without the key | **Yes.** One pid links all of a student's upvotes and follows, and joins straight to the counters | No: tags differ per item |
| Counters re-derivable from content-side data | Yes (count rows per pid) | No |
| With the key (operator) | Full profile | Full profile (test every roster member against every item) |
| Error-log exposure on unique violations (DETAIL shows key values) | pid appears in DB logs | Only an unlinkable tag; and we use `ON CONFLICT DO NOTHING`, so the error never fires |

**Synchronous (Mode S) vs deferred (Mode D) crediting**

| | Mode S: same transaction (baseline for the prototype) | Mode D: client-held one-time credit token |
|---|---|---|
| Mechanism | The definer inserts the content row and increments `counters[pid]` in one transaction | The definer inserts content plus `pending_credit(token_hash, course, kind)` (no identity) and returns a 128-bit random token. The browser keeps it (localStorage) and redeems it after a random delay (Proposal: a randomised wait, e.g. on the next page load after ≥ several minutes) through `api.redeem_credit(session, token)`, which deletes the pending row and increments the counter |
| Integrity ("verified", §7.10) | Strong: a credit happens if and only if content is inserted | Strong: tokens are single-use, course-bound, and only created by content insertion |
| Transaction-ID side channel (§4) | **The content row and the counter row share `xmin`**. Anyone who can read both (operator, vendor, physical backup) attributes each student's most recent credited action to their pid | Closed for logical readers. The dead `pending_credit` tuple (xmin = content transaction, xmax = redeem transaction) survives only until VACUUM, plus WAL |
| UX | Counts update immediately | Counts update later. A token is lost if the browser storage is cleared, and stays on the device until the student returns there. Expiry at term end (Q17/Q18) |
| Complexity | Low | Medium: client storage, retry, a pending-credit banner, expiry job |
| Recommendation | **Prototype default (Proposal)** | Upgrade path. The data model is identical, so this is a function and client change only. Owner decision **NQ-A10** |

### 2.7 The narrowly scoped internal API (§6.2): function whitelist

All functions are `SECURITY DEFINER`, created with `SET search_path = ''` (pg_catalog is still
searched implicitly; every name is schema-qualified), and have `REVOKE ALL … FROM PUBLIC` in the
same transaction that creates them. PostgreSQL grants EXECUTE on new functions to PUBLIC by
default, and the docs say to revoke it inside the creating transaction [V1][V8]. Owners also run
`ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` [V8]. Functions raise only
generic, parameter-free messages, never use dynamic SQL, and return the minimum data needed.

| Function (all take `p_session` first) | Returns | Notes |
|---|---|---|
| `api.ask_question(course, tag_kind, assignment_id, title, body)` | new question id | Credits `questions` (Mode S) or returns a credit token (Mode D) |
| `api.post_comment(question_id, body)` | comment id | Credits `comments` |
| `api.upvote(question_id)` | new total | Inserts the tag `ON CONFLICT DO NOTHING`; credits `upvotes` only if inserted |
| `api.my_upvote_state(question_ids[])` / `api.my_follow_state(question_ids[])` | booleans | Only for the caller's own session |
| `api.follow(question_id, on bool)`, `api.mark_unclear(answer_id)`, `api.report(content_id, reason, note)` | ok | Tags only; never credited (§7.9) |
| `api.my_participation(course)` | counts, level, current and original thresholds | Student only (§7.10) |
| `api.share_level(course)` / `api.revoke_share(course)` | ok | §7.10 |
| `api.instructor_shared(course)` / `api.finalize_shared(course)` | name, level, date shared | Instructor only (§7.10); finalisation blocks revocation |
| `api.publish_thresholds(course, …)` | version id | Blocks disadvantaging changes (§7.9) |
| `api.merge_questions(from_id, into_id)` | ok | Staff with moderation permission (§7.7) |
| `api.submit_survey(instance, a1, a2, a3)` / `api.survey_results(instance)` | ok / gated texts and counts | §7.12 |
| `api.course_analytics(course)` | aggregates with threshold gating | §7.16 |
| `api.my_notifications(course)` | computed on read | §7.13 |
| `api.create_session(verified_subject)` | session token | **Granted only to `cc_auth`** |

**Session binding (Proposal).** Functions take the raw session token. The function hashes it and
looks it up in `identity_private.sessions` to find the user. `cc_web` has no SELECT on that table,
so an attacker with only the `cc_web` credential (for example through SQL injection in a content
route) cannot enumerate users or impersonate them through the oracles. They can act only for
sessions they already hold. A full compromise of the app server still gets `cc_auth` and can mint
sessions (§4).

### 2.8 Timestamp hygiene (**Proposal**)

| Data | Precision stored | Readable by `cc_web` | Rationale |
|---|---|---|---|
| `content.questions.created_at`, `comments.created_at`, `last_activity_at` | Coarsened, e.g. truncated to 5–15 min (value is NQ-A8). The "most recent" sort (§7.14) breaks ties by a random key | Yes | Content time is the anchor for every timing attack, so it must not line up precisely with identity-side events |
| `participation.counters` | **No timestamps at all** | No | Brief requirement and §7.10 ("dates" are not shared) |
| `content_tags.*` | No timestamps | No | |
| `identity.users` / `identity.enrollments` | No activity timestamps (no last_seen, last_login) | Yes | These rows are readable by ordinary queries. An activity timestamp would let an ordinary query join a student to content created at the same moment |
| `identity_private.sessions.expires_at` | Fixed at login, no sliding update on each request | No | Login time correlates with posting, so it is kept out of ordinary reach |
| `shared.results.shared_on` | Date only | Instructor view | §7.10 says "date shared" |
| `survey.*` | None | No | §7.12 "no unnecessary metadata" |
| `notify.email_outbox.not_before` | Date (digest slot) | No | Email send time must not reveal the time of the action |
| Postgres `track_commit_timestamp` | Keep **off** (the default is `off` and it can only be set at server start [V5]). Supabase exposes it as a CLI-only setting [V16]; whether Neon allows changing it is **Unverified** | n/a | With it on, `pg_xact_commit_timestamp(xmin)` would give an exact commit time to anyone who can read `xmin` |
| UUIDs | v4 only (`gen_random_uuid()`, 122 random bits). Never v7 | | v7 embeds a 48-bit Unix-millisecond timestamp, and `uuid_extract_timestamp()` recovers it [V3][V9] |

### 2.9 Deliberately NOT stored

- No author, pid, tag, session, IP or user agent on questions, comments or survey responses.
- No "asker" marker, no "OP" badge data, no per-student list of the student's own posts (NQ-A2).
- No timestamps on counters, tags, completions or survey responses.
- No per-request activity history for any user.
- No sequential or serial ids, and no per-course "#14"-style numbering, in anonymous domains
  (CLAUDE.md: "Never use sequential or guessable IDs for anonymous content").
- No raw (unwrapped) course keys at rest, and no KEK in the database.
- No email body containing content text, question titles or question ids.

---

## 3. Walkthrough of every checklist item

### Item 1: Asking or commenting credits the right student; ordinary queries cannot join (§6.2, §7.9)

- `api.ask_question(session, …)` runs as `cc_fn_board`. It (a) resolves the session to a
  `user_id`, (b) checks the student is actively enrolled in the course (§5), (c) checks the rate
  limit (item 9), (d) unwraps `K_c`, (e) inserts the question with **no author column**, and
  (f) in Mode S runs `UPDATE participation.counters SET questions = questions + 1 WHERE course_id
  = c AND pid = HMAC(K_c, 0x01 ‖ user_id)`. In Mode D it instead inserts `pending_credit` and
  returns a token. Comments work the same way (`comments + 1`).
- **Why ordinary queries cannot join.** `cc_web` has no privilege on `participation.*`, `keys.*`
  or `content_tags.*`. Even if a GRANT were added by mistake, RLS on those tables has policies only
  for the owning function role (two independent locks; see §5). No column in `content.*` refers to
  a user or pid, so there is nothing to join on. Function return values never include pid, tag or
  counts for anyone except the caller.
- **The posting transaction writes no row in any `cc_web`-readable identity-bearing table.** This
  rule prevents the join channels in §4, for example a `last_activity_at` update on
  `identity.users` or a notification row keyed by `user_id`. It is enforced by a test (§7).
- Counters are **pre-created with zeros at enrollment** (Proposal), in random order, then
  `CLUSTER`ed on `(course_id, pid)`. The table's row count therefore reveals enrollment, not
  participation, and its physical order carries no insertion-order information (§4, dump
  attacker).
- Residual: the app server knows author and body in memory during the request. This is unavoidable
  for any server-side design. It must never log them together (item 12).

### Item 2: Upvoting; at most one per student per question; credits "upvotes given" (§7.7, §7.9)

- `api.upvote(session, q)` resolves `q` to its canonical id by following redirects. It computes
  `t = HMAC(K_c, 0x02 ‖ user ‖ canonical_q)` and runs `INSERT INTO content_tags.upvote VALUES
  (canonical_q, t) ON CONFLICT DO NOTHING`. Only if a row was inserted does it increment
  `content.questions.upvote_total` and credit `counters.upvotes` (Mode S) or return a credit token
  (Mode D). The primary key `(question_id, tag)` makes "at most one per student" a database
  invariant, and `ON CONFLICT DO NOTHING` means duplicates never produce an error log with key
  values in it.
- The "already upvoted" UI state comes from `api.my_upvote_state(session, ids[])`. `cc_web`
  cannot SELECT the tags.
- **OQs.** Can a student withdraw an upvote, and if so does "upvotes given" decrease (NQ-A3)? Can a
  student upvote their own question (NQ-A4)? With no author link stored, Family A **cannot block
  self-upvotes** unless an author tag is added, which weakens the design (see item 16).

### Item 3: Merging duplicates (§7.7; §10 "Duplicate merging preserves counts correctly")

`api.merge_questions(session, A, B)` runs as `cc_fn_merge`, in one transaction, after checking the
caller has moderation permission for the course (§5):

1. **Upvotes, with no student counted twice.** For each student `S` in the course roster
   (`identity.enrollments`, including `status = dropped`, so a dropped student's upvote still
   counts): if `HMAC(K_c, 0x02‖S‖A)` is in `upvote(A)`, insert `HMAC(K_c, 0x02‖S‖B)` into
   `upvote(B)` with `ON CONFLICT DO NOTHING`. Then delete `upvote(A)` and set `B.upvote_total =
   count(upvote(B))`. A student who upvoted both A and B now has exactly one tag on B. Any later
   attempt to upvote B, or A (which redirects to B), hits the same tag and is rejected. The roster
   is the only practical way to de-duplicate per-item tags; it costs about 2N HMACs.
2. **Comments preserved.** `UPDATE content.comments SET question_id = B WHERE question_id = A`.
   The fate of answers and "Still unclear" marks on A is not specified (NQ-A6). Proposal: move
   answers too. Unclear tags are per-answer, so moving the answer keeps them valid.
3. **Participation credit preserved.** The merge **does not touch counters**. Credit already
   earned for asking A, commenting on A, or upvoting A stays. This is my reading of "Preserve
   qualifying private participation credit". The upvote total on B is de-duplicated, but a student
   who upvoted both A and B keeps 2 "upvotes given". Whether that is intended is **NQ-A6**. A
   design benefit: because merges never write to counters, a merge creates no timing link to any
   student.
4. **Old links redirect.** Insert `question_redirects(A → B)` and compress chains (`UPDATE … SET
   new_id = B WHERE new_id = A`). Set `A.status = merged, merged_into = B`. The route `/…/q/A`
   returns a permanent redirect.
5. **Follows.** Re-key follow tags from A to B the same way, by iterating the roster (union, no
   duplicates). Students who followed A get a "Question merged" notice (item 7).
6. **Moderation log without identities.** Insert `audit.moderation_events(course_id, 'merge',
   {A,B}, actor_ref, occurred_on date)`. The entry holds ids only, no text and no student identity.
   Whether the staff actor is recorded is NQ-A11.

**Open edge case.** What happens to an upvote tag from a student whose enrollment row has been
deleted (account deletion, Q17)? Their tag on A cannot be recomputed, so it would be lost in a
merge. Proposal: keep enrollment rows with `status = dropped` until the course is sealed
(item 15).

### Item 4: The student privately sees counts, level and thresholds; "Participation level reached" (§7.10, §7.13)

- `api.my_participation(session, course)` returns `{questions, comments, upvotes, level,
  current_thresholds, original_thresholds}`. Level is computed in the function from the counters
  and the published threshold version (item 6). It is only ever the caller's own record: there is
  no function that takes another student's id. Impersonation (Q7) would break this guarantee, so
  any support procedure must exclude privacy surfaces.
- **Level reached, in-app:** computed when the page is read. Compare the current level with
  `level_notice.last_acknowledged_level`, which updates when the student dismisses the notice.
  That write happens at viewing time, not action time. No notification row is created at action
  time.
- **Level reached, email:** a nightly `jobs.level_digest()` compares levels with
  `last_emailed_level` and enqueues **content-free** emails in **one transaction per night**. This
  removes the per-action timing link (resolution: one day). What the email says is owner copy;
  whether the notification is essential is Q13. Proposal: do not include the level in the email
  body, so the email provider does not learn it.

### Item 5: Verified-level sharing and revocation (§7.10, §7.11, §10)

- `api.share_level(session, course)`: the definer computes the level from the counters (so the
  client supplies no level, which makes it "verified"). It inserts `shared.results(course_id,
  user_id, verified_level, threshold_version_id, shared_on = current_date)`. The UI shows the §7.10
  verbatim text before the student confirms.
- The instructor reads `shared.v_instructor` (`display_name, verified_level, shared_on`) or calls
  `api.instructor_shared`. The view exposes exactly the three §7.10 fields: no counts, no content.
- **Revocation:** `api.revoke_share` deletes the row only if `finalized_on IS NULL`.
  `api.finalize_shared` runs when the instructor exports or applies results (export format Q12).
  It stamps `finalized_on` only on the rows it includes, so shares made later are not silently
  finalised. When sharing becomes final, and who opens or closes the window, is Q18.
- The share transaction only *reads* counters, so it writes no counter row and creates no `xmin`
  link.
- **NQ-A15.** If counters change after a student shares (the window may open before activity
  stops), is the shared level frozen at share time or recomputed until finalisation? Proposal:
  frozen, and the student may revoke and re-share.

### Item 6: Threshold versioning (§7.9)

- `threshold_versions` rows are immutable once published: a trigger blocks UPDATE and DELETE.
  `policies.published_threshold_version_id` points at the version in force. The original version
  is kept and shown to students as "originally published".
- `api.publish_thresholds(…)`: if `course_state.participation_started` is false, any values are
  allowed (§7.9: configurable before publication). Once it is true, the new version must be
  **pointwise ≤** the previous published version (no threshold may rise). That is my reading of
  "changes that would disadvantage them are blocked", and the owner should confirm it. Because
  versions can then only move in the students' favour, a level computed under the latest version
  is never worse than under the original.
- `participation_started` is a course-level boolean set by the first credited action. It holds no
  identity.
- The grading scheme (§7.11, published before participation) uses the same immutable-version
  pattern.

### Item 7: Notifications that target specific students (§7.13), including email (§3, §6.2)

| Notification | Recipient (spec) | Family A mechanism |
|---|---|---|
| Answer posted | **Not specified** (NQ-A1) | Options: (a) **followers only** (recommended Proposal). Delivery uses follow tags; no author link is needed. (b) The asker specifically: this needs a stored per-question asker tag, which anyone holding `K_c` can resolve by testing the roster. That weakens pillar P1 (no author data). (c) Askers auto-follow at ask time (NQ-A13). Follow tags look the same for askers and others, which gives deniability, but in Mode S the follow tag shares `xmin` with the question row |
| Followed question updated | Followers | **Computed on read** in-app: for questions with `last_activity_at` after my "seen" marker, test my follow tag (O(#questions) HMACs, fine at course scale). **Email digest**: `jobs.follow_digest()` iterates roster × questions updated since the last digest and tests the tags. No per-user notification row ever stores a question id |
| Question merged | Not specified; Proposal: followers of the merged-away question | During the merge, roster iteration finds A's followers and enqueues content-free emails. In-app, the notice is derived on read from `content.merge_events` plus my follow tag |
| Participation level reached | The student | Item 4 (computed on read; nightly email batch) |
| Course card changed, Assignment card changed, Survey available, Sharing window open | All enrolled (course-wide) | Broadcast. No anonymous-content linkage involved |

**Email channel (provider is Q6).** The provider receives only the recipient address, the course
code (Proposal; this is identity plus enrolment, so the owner should accept it), and a generic
template, for example "There is an update in COURSE. Sign in to view." **No question title, text
or id.** Links go to a generic `/notifications` page, never `/q/<id>`, so the URL does not reveal
which question. Emails go out in **fixed-time digests** (Proposal: daily), so send time does not
reveal action time. The provider's open and click tracking must be disabled. Whether each candidate
provider allows that is **Unverified** and belongs to Q6 research. Users manage nonessential
notifications (Q13).

### Item 8: Follow, "Still unclear", report (§7.7, §7.9)

| Action | Per-student de-dup? | Way back to the student? | Family A storage |
|---|---|---|---|
| Follow | Yes (a toggle) | Yes, for delivery | `content_tags.follow(question_id, HMAC(K_c,0x03‖user‖q))`. Delivery resolves tags by roster test inside `cc_fn_notify` (item 7). No stored user reference |
| Still unclear | Proposal: one per student per answer (spec silent) | No | `content_tags.unclear(answer_id, tag)`. Staff see counts only. Who else sees the count is unspecified (folded into NQ-A6) |
| Report | Proposal: one per student per item | No (abuse: item 9) | `content_tags.report(content_id, reason_code, note, tag, reported_on date)`. The moderation queue shows item, reasons, notes and count, **never** the tag. Reports earn no credit (§7.9) |

All three are locked from `cc_web` and reached only through functions. None is credited (§7.9
excludes reports and follows).

### Item 9: Rate limiting and abuse without revealing identity (§6.4, §7.7, Q20)

- Inside every write function: `ratelimit.buckets(subject = HMAC(K_rl, user), action,
  bucket_start = date_trunc(window), n)`. If `n` exceeds the limit, the function returns a generic
  "slow down". **The limit values are Q20.** Old buckets are deleted by `cc_jobs`. Staff never see
  rate-limit data. Residual: in Mode S the bucket row shares `xmin` with the content row
  (operator-level, see §4). The rows are short-lived.
- Edge or IP limits for unauthenticated routes belong to the host/WAF (other researchers' scope).
- **Abuse escalation.** In Family A's strong form, nobody can identify or sanction the author of a
  hidden post, because no link exists. Options for the owner (NQ-A12):
  (a) content moderation and rate limits only, which matches §6.4's preference;
  (b) **"sanction without reveal"**: store an encrypted per-item author reference
  (`AEAD(K_c, pid)`) so a definer can apply a cooldown to "the author of item X" without showing
  anyone who it is. This re-introduces an author link resolvable by key holders (weakens P1);
  (c) the §6.4 exceptional process (item 14).
  Recommendation: (a) for the prototype.

### Item 10: Exit survey anonymity and separation (§7.12, §10)

- `api.submit_survey(session, instance, a1, a2, a3)` runs as `cc_fn_survey`. It checks enrolment
  and that the survey is open, then inserts `survey_private.completions(instance, user)`, whose
  primary key prevents a second submission (Proposal; whether duplicate prevention is wanted is
  NQ-A14). It inserts the answers into `survey.buffer` with no identity, no time and no session.
  **Shuffle-flush (Proposal):** when the buffer holds ≥ k rows (and at close), one transaction
  moves them to `survey.responses` in random order and deletes them from the buffer. After the
  flush, response rows share one `xmin` and their order does not map to the completions. This
  matches §7.12's minimum-response threshold, since text is withheld below N anyway.
- **The two tables are never both readable by one ordinary role.** `cc_web` reads neither. It calls
  `api.has_completed(session, instance)` and `api.survey_results(session, instance)`. The latter
  returns the response count and the three texts **only if count ≥ `reveal_min_n`** (configurable
  per §7.12; default Q16), in random order. This matters because the system columns `xmin` (the
  inserting transaction's id) and `ctid` (physical location) are readable by any role with SELECT
  on a table [V4]. If one role could read both `completions` and `responses`, it could pair the
  k-th completion with the k-th response by `ctid` order or by shared `xmin`. That would be an
  ordinary-query join.
- Not linked to participation: the survey functions do not touch `participation.*` and earn no
  credit (§7.12, §7.9). "Available even if the student does not share": there is no dependency on
  `shared.results`.
- **"Do not collect unnecessary metadata"**: no timestamps, IP, user agent, time-to-complete,
  section or device. The host request log still records the POST (path, time, UA [V18]); see
  item 12.
- Stronger alternative (cross-reference to another family): Privacy Pass-style blind tokens (RFC
  9576 architecture; RFC 9578 issuance; RFC 9577 HTTP authentication) give unlinkability between
  issuance and redemption, even against the server [V11]. They are heavier to build. Family A does
  not need them to meet the requirement.

### Item 11: Aggregates only above thresholds; differencing (§7.16, §7.12, Q16)

- `api.course_analytics(session, course)`, staff only, returns the §7.16 content totals (from
  `content.*`) and the **level distribution** (from `participation.counters`), "shown only when
  aggregation thresholds are met". Proposal for the rule (N is Q16): suppress the distribution if
  any level's count is between 1 and N−1, or if enrolment is below N.
- **Differencing attack (proposed NQ-A7).** The instructor sees aggregate level counts *and* the
  shared list (name and level). Subtracting gives the level histogram of the **non-sharers**. If
  that histogram has one non-empty level, which is common (for example, every non-sharer is "No
  Record"), **every non-sharer's level is revealed**. That breaks §7.10 and §10 ("Students alone
  decide whether to share"). Snapshots from different times can also be differenced. Options
  (owner decision):
  (a) **hide the level distribution from the moment the sharing window opens** (Q18), and never
  show it alongside shared results (Proposal, the simplest);
  (b) show it only if the non-sharer histogram has ≥ 2 levels with ≥ N each (complex, and still
  leaks the distribution);
  (c) calibrated noise (differential privacy): principled, but complex and hard to explain to
  users;
  (d) drop the level distribution entirely. The spec lists analytics "such as" these, so this needs
  owner confirmation.
- Watching totals change live (e.g. "Total upvotes" ticking up while a student taps a phone in
  class) is an observation side channel (§4). Proposal: analytics and presentation mode show
  snapshots, not live counters (NQ-A18).

### Item 12: Logs, analytics, error reports, views, exports and dashboards (§3, §6.2)

| Surface | Rule (Proposal) | Mechanism / evidence |
|---|---|---|
| DB views | No view references both an identity-bearing schema and an anonymous-content schema | Catalog test over view dependencies (§7). On Supabase, views run with the owner's rights by default (`postgres` has `bypassrls`), so use `security_invoker = true` on PG15+ [V12] |
| DB server logs | Defaults: failing statements are logged (`log_min_error_statement = ERROR`); bind parameters are **not** included on error (`log_parameter_max_length_on_error = 0`); `log_statement = none`. **But** if `log_statement` or `log_min_duration_statement` is turned on, bind parameters are logged in full (`log_parameter_max_length = -1`) [V6] | Always use bind parameters, never interpolated literals. Keep `log_statement = none` and `log_min_duration_statement = -1`, and test both (§7). On Supabase the `postgres` role can change these via supautils [V16], so this is a configuration invariant, not a guarantee. Functions never put parameters in `RAISE` messages. `ON CONFLICT DO NOTHING` avoids "Key (…)=(…) already exists" DETAIL lines |
| App logs / error reports | Never log request bodies. Never attach user context to an event that carries content text. Error reporting must scrub bodies and headers | Logger allow-list; canary-string tests (§7). Session-replay or analytics SDKs that capture page text alongside a user id are **prohibited** on board pages |
| Host request logs | Vercel runtime logs record method, request path, **search params**, user agent, time and status. Retention: **1 hour on Hobby**, 1 day on Pro [V18] | No identity in URLs (no user ids in paths or query strings). IP and UA here, combined with auth-provider sign-in logs, allow operator/vendor correlation (§4) |
| DB vendor logs / dashboards | Supabase API Gateway logs are filterable by "API Gateway JWT subjects" and pathname [V17]. Retention: 1 day (Free), 7 days (Pro); auth audit logs 1 hour (Free) [V19] | **Disable the Supabase Data API**: after that, "none of the auto-generated REST endpoints respond" [V20]. The gateway then never sees per-user calls; the app reaches Postgres directly as `cc_web`, so the DB sees one role for all users. Whether gateway logs capture request bodies is **Unverified**; avoiding the Data API makes it moot |
| Auth provider | Sees identity, sign-in time and IP. Never content | Q4 |
| Email provider | Identity plus a generic template (item 7) | Q6 |
| Exports | Shared results: name, level, date only. Content: no identity, no tags. Survey: gated texts, random order | Export tests (§7) |
| Admin dashboards | No per-user activity timestamps. No page shows identity lists and anonymous-content text together | NQ-A11: does *staff* identity next to content text (e.g. "hidden by TA Alice") count as "identity-bearing" under §3? |

### Item 13: Opaque, non-predictable identifiers (§6.2, §9, §12)

- Every primary key in `content*`, `participation`, `survey*`, `audit` and `notify` is a UUIDv4
  from `gen_random_uuid()` (122 random bits [V9]; listed in PG18 [V3]). No serial or identity
  columns, and no sequences in those schemas (a shared sequence leaks global order across tables).
- **Not UUIDv7.** It embeds a millisecond Unix timestamp in its first 48 bits [V9], and Postgres 18
  provides `uuid_extract_timestamp()` for v1 and v7 [V3]. RFC 9562 also says UUIDs "MUST NOT be
  used as security capabilities" and that v4 "SHOULD be utilized" for any security-related use
  [V9]. Authorization is therefore always checked and never relies on ids being hard to guess.
- Pseudonyms and tags are HMACs under secret wrapped keys, so they cannot be computed from known
  user ids without the KEK (K2/K3/K4). With K1 (raw key in the DB), a dump attacker *can* compute
  them, which is the §12 known issue again. That is why K1 is rejected.

### Item 14: Exceptional deanonymization (§6.4)

- **Default: impossible for question and comment authorship.** The data does not exist; only side
  channels remain (§4). Instructors, TAs and admins have no function that reveals other students'
  tags, pids or counters.
- **Latent capability for upvotes, follows and reports:** whoever holds the DB contents **and** the
  KEK (the operator, or an operator under legal compulsion) can test every roster member against
  every tag. This is not a feature, but it exists. It must be disclosed (§6), and it disappears
  after crypto-shredding (item 15).
- **If institutional policy ever requires deanonymization** (§6.4 checklist), Family A can add a
  **forward-only escrow**. New content rows get `author_escrow = public_key_encrypt(PK_inst,
  user_id ‖ item_id)`, which is randomised and so not linkable without the private key. The private
  key is split k-of-n among named approvers and held offline, which enforces "multiple authorized
  approvers" cryptographically. Approvals, reason and outcome go in an append-only audit trail. In
  production that trail should be an external write-once store, because Postgres cannot make a log
  immutable against its own operator. Escrow covers only content created *after* the published
  explanation and user notification. It cannot be used retroactively, and it cannot be enabled
  silently, because enabling it is a visible schema and UI change. Whether to use pgcrypto's
  public-key functions or app-side encryption is **Unverified** in this session. **Not to be
  built** unless the institution requires it (§6.4).

### Item 15: Retention and end of term (Q17), options only

| Option | Action when the course is sealed (trigger: Q18) | Effect | Caveats |
|---|---|---|---|
| R0 Keep everything | Nothing | The latent capability (item 14) persists | None |
| R1 **Crypto-shred** (for discussion) | After sharing is final: delete the wrapped `K_c` (or the Vault secret); delete `content_tags.*`, keeping plain totals; delete counters, `level_notice`, `pending_credit` and `survey_private.completions` | Tags and pids become permanently unlinkable. Remaining: content (no authors), totals, shared results (identity plus level, for grades), anonymous survey responses | **Backups keep the key until they expire.** Supabase: Pro daily backups kept 7 days, Free has none [V19]. Neon: history 6 h on Free, up to 7 days on Launch [V21]. Vault secrets restored from a backup are decryptable, because the project root key does not change [V13] |
| R2 R1 plus content deletion | Also delete content after a set period | Minimal data kept | Q17 policy decision |
| R3 Mid-term account deletion | Delete the user. Their pid and tags become unreachable | Their counters orphan; upvote totals keep their tag rows; merges can no longer re-key their tags | Q17 |

### Item 16: Moderation hide/delete and participation credit (spec silent → NQ-A5)

- The spec says only that merges preserve "qualifying" credit (§7.7). Hide and delete are not
  addressed.
- **Consequence specific to Family A:** with no author link stored, **credit cannot be revoked for
  a specific hidden or deleted item**. Hide and delete leave credit unchanged, so credit for spam
  would stand: a student could post two junk questions toward Sustained Contributor, limited only
  by rate limits and moderation.
- If the owner decides moderation should revoke credit, Family A must add an encrypted per-item
  credit reference (`AEAD(K_c, pid)` on the row, resolvable only by a definer such as
  `api.moderate_uncredit`). That re-introduces authorship recoverable by key holders, weakening
  pillar P1. This is a real fork in the design and should be decided **before** the Q9 ADR.
- §3 forbids "Automatically denying participation credit". Any revocation would have to be a
  deliberate human moderation action, never automatic.

---

## 4. Threat model

### 4.1 A side channel specific to this family: system columns, physical order and WAL

The family's central weakness is that Postgres records *when* and *in which transaction* every row
version was written:

- `xmin` is "the identity (transaction ID) of the inserting transaction for this row version", and
  every UPDATE creates a new row version [V4]. In **Mode S**, the new content row (or upvote tag)
  and the updated `counters[pid]` row carry **the same `xmin`**. Anyone who can SELECT both tables
  can therefore attribute each student's **most recent** credited action to their pid, until the
  student acts again or the row is rewritten. `cc_web` cannot read counters, so this is *not* an
  ordinary-query join. It is available to the operator, the DB vendor, and anyone with a
  **physical** copy (disk snapshot, physical backup).
- System columns are readable by **any role with SELECT** on the table [V4]. That is why §3 item 10
  forbids one role from reading both survey tables, and §3 item 1 forbids the posting transaction
  from writing any `cc_web`-readable identity row.
- `track_commit_timestamp` would turn `xmin` into an exact commit time. It is `off` by default and
  can only be changed at server start [V5]. Keep it off and test it (§7).
- **Physical order.** A logical dump is expected to emit rows roughly in physical order (expected
  behaviour, **Unverified** here). Rows written together therefore line up across tables.
  Mitigations: pre-create counters in random order; `CLUSTER` the counters and tag tables on their
  pseudorandom keys periodically; set `fillfactor = 50` on counters so increments stay on the same
  page as HOT updates. That last one is standard Postgres behaviour for updates that do not change
  indexed columns, but it is **Unverified** in this session and should be tested.
- **WAL and backups** record the full sequence of changes in commit order. This cannot be
  mitigated inside Postgres. Retention: Supabase Pro daily backups 7 days, optional PITR [V19];
  Neon history 6 h on Free, up to 7 days on Launch [V21].
- **Mode D** closes the *logical* `xmin` link, because the counter is written in a later, unrelated
  transaction. Only dead tuples (until VACUUM) and WAL remain. An optional nightly "wash" job,
  `UPDATE … SET col = col` over the tag tables in one transaction, gives every live row a common
  `xmin` and further shortens the window in Mode S. Whether `CLUSTER` alone resets `xmin` is
  **Unverified**.

### 4.2 Per-actor analysis

| Actor | Access | Can learn | Cannot learn | Residual risk |
|---|---|---|---|---|
| Other students | Student UI/API in their courses | Anonymous content, totals, their own state | Authors, voters, followers, reporters, others' counts (no function exposes them) | Self-identifying text, stylometry, small classes, classroom observation ("I just saw her type that"). Document (§6) |
| Instructor | Staff UI/API, shared results, analytics, presentation mode, exports | Content, totals, shared name/level/date, gated aggregates and survey texts | Any mapping; individual counts (§3, §7.10) | **Differencing** of aggregates vs shared list (NQ-A7); live totals during class (NQ-A18); small-class survey text (gated by N, Q16); writing style |
| TA with moderation / card editing | As assigned (§5) | Reports (reason/note/count, no reporter), hidden content, moderation log (ids) | Reporter or author identity; tags | Same as instructor. If a TA is also a student in the same course, roles conflict (NQ-A17) |
| Institutional admin (in-app) | Institution config; possibly user management (Q1) | Identity lists, configuration | Mappings (no function exposes them); activity times (not stored in `cc_web`-readable tables) | If admin scope (Q1) grows to include raw DB access, the admin becomes "operator" |
| **Operator** (owner: DB console, deploy, host secrets) | Platform admin role (bypasses RLS [V12][V15]), KEK, logs | **Everything stored**: unwrap `K_c`, test the roster against all tags (upvotes, follows, reports, unclear marks), read counters per named student; in Mode S, the latest action per student via `xmin`; correlate host/auth logs within retention; change code to log authors going forward | Retroactive authorship of questions/comments from logical data (not stored), except through `xmin` (Mode S), WAL and timestamp correlation; anything after crypto-shredding | **Cannot be mitigated in Family A.** The operator is inside the trust boundary. Document it (§6). Partial mitigations: shredding, Mode D, short log retention, personal discipline. A solo owner cannot have a two-person rule |
| DB vendor (Supabase / Neon) | Disk, WAL, backups, logs, internal roles | Supabase also holds the Vault root key (K2) [V13], so it equals the operator for stored data. Neon with K3 never stores the KEK; it would need to capture it in transit or in memory | As operator | Contractual/ToS trust. Physical `xmin`/WAL channel |
| Host vendor (e.g. Vercel) | Runs the code; env secrets; request logs (path, search params, UA, time; 1 h Hobby [V18]) | In principle everything the app sees (it executes the code and holds the KEK) | — | Trust. Keep identity out of URLs |
| Auth provider | Identity, sign-in time, IP (Q4) | Who signed in when | Content | Combined with host logs (same IP/UA around a POST), the operator or vendors can correlate authorship by timing |
| Email provider | Address, course code, template, send time (Q6) | That the student got *some* course notification | Content, which question (no ids or links) | Batching hides action time |
| DB **logical** dump (no KEK) | All tables' rows | Identity, enrolments, content (no authors), shared results, survey texts, completions (who completed), counters keyed by unlinkable pids, unlinkable tags | Mappings (wrapped `K_c` is useless without the KEK); `xmin` (not in a logical dump) | Physical-order alignment (mitigated by clustering); coarse timestamp correlation of content vs session expiry (sessions are locked, but they are in the dump) |
| DB **physical** backup / disk | As above plus `xmin`, dead tuples | Mode S: latest action per pid; dead-tuple history | Names behind pids (needs the KEK) | With the KEK, as operator |
| Attacker with app or vendor logs | Host/DB/auth logs | Timing and IP correlation; never content text with identity, if §3 item 12 rules hold | Mappings from stored data | Short retention (1 h Hobby host logs; 1 day Supabase Free) limits the window |
| App-server compromise (RCE, all secrets) | `cc_web`, `cc_auth`, `cc_jobs`, KEK | Mint sessions (`cc_auth`) → call the oracles for every user → recover upvote/follow/report sets and counts; log all future posts with authors | Raw tables in locked schemas; past question authorship (not stored; `cc_web` cannot read `xmin` on counters) | Severe for upvotes/follows; past authorship stays protected. Rotate keys after a compromise |
| SQL injection (as `cc_web` only) | What `cc_web` can SELECT and EXECUTE | Content, identity basics, shared results | Oracles for other users (session-bound; `sessions` unreadable), tags, counters, keys | Low for the mapping. Course-authZ bypass is possible if RLS context can be forged (§5) |
| Legal compulsion | Whatever is stored, plus the operator's KEK | Identity, counters per student, shared levels, upvote/follow/report mappings (with KEK); logs within retention | Question/comment authorship (not stored), except Mode S `xmin` and log timing; anything shredded | Document that a court can compel what exists. Shredding (R1) bounds the exposure in time |
| Collusion: instructor + operator | Union of both | Operator capabilities plus classroom context (who was in office hours, who said what) | — | As operator |
| Side channels | — | Timing (content `created_at` vs sign-in logs, email send time, presentation-mode live counts), small classes, self-identification, stylometry | — | Coarsened timestamps, digests, snapshots, N thresholds. Small classes cannot be fully fixed (§6) |

---

## 5. Failure modes

| # | Failure | What goes wrong | Detection | Mitigation |
|---|---|---|---|---|
| F1 | Over-broad grant (`GRANT SELECT ON ALL TABLES IN SCHEMA participation TO cc_web`) | Ordinary role reads counters, tags or keys | CI catalog test: `cc_web` has zero privileges on locked schemas; daily `jobs.privacy_selfcheck()` in production | **Second lock:** RLS enabled **and FORCED** on locked tables, with policies only `TO cc_fn_*`. A stray grant still yields 0 rows, because default-deny applies when no policy matches [V2] |
| F2 | Function EXECUTE left to PUBLIC | Any role (including Supabase `anon`/`authenticated` if the Data API is on) calls definers | Test: no function in `api`/`jobs` has a PUBLIC ACL entry | REVOKE in the creating transaction [V1]; `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` [V8] |
| F3 | `search_path` hijack in a definer | Attacker-created object masks a table (the temp-schema trick) [V1] | Test: every `SECURITY DEFINER` function has `search_path` set in `proconfig` | `SET search_path = ''` plus schema-qualified names (Supabase's recommendation [V12]), or `pg_temp` last [V1] |
| F4 | Definer returns too much (e.g. a debug function returns tags) | Mapping leak through a legitimate path | Code review checklist; a test lists every function's return type and diffs it against an allow-list | Whitelist in §2.7. Any new function needs an ADR note |
| F5 | Table owner = a BYPASSRLS role (Supabase `postgres` is owner by default and has `bypassrls` [V12]; Neon console roles have BYPASSRLS [V15]) | RLS silently not applied | Test: owners of app tables are `cc_owner`; `rolbypassrls = false` for every `cc_*` role | Custom NOLOGIN owner; `FORCE ROW LEVEL SECURITY`. The platform admin still bypasses: that is the operator |
| F6 | Supabase Data API exposure | Schemas reachable over REST with anon/authenticated keys. Supabase's default grants on `public` are changing: new projects since 2026-05-30, and the setting is "applied … to all existing projects" on **2026-10-30** [V22] | CI HTTP probe: `/rest/v1/` must not respond | Disable the Data API [V20]; create nothing in `public`; revoke default privileges [V20] |
| F7 | Neon: app connects with a Console-created role | That role is in `neon_superuser`: BYPASSRLS plus `pg_read_all_data` [V15] | Test: `current_user` is `cc_web`, not a member of `pg_read_all_data` | Create app roles only by SQL; SQL-created roles are not in `neon_superuser` [V15] |
| F8 | KEK leak (env var exposed, preview deployment, laptop) | Dump + KEK = all tag/pid mappings | Secret-scanning; KEK only in production env | Separate KEKs per environment; rotation procedure (re-wrap `K_c`); prefer KMS (K4) in production |
| F9 | Statement logging switched on while debugging | Bind parameters logged in full, i.e. session token plus body text in the DB log [V6] | Test and self-check: `log_statement = none`, `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0` | Role-level settings (`ALTER ROLE cc_web SET …`); a documented runbook ban |
| F10 | Error message carries values | e.g. `RAISE EXCEPTION 'user % not enrolled', v_user` next to body text in the statement | Lint/grep migrations for `RAISE … %` with identity variables | Generic messages; error codes only |
| F11 | Code bug writes an identity-side row in the posting transaction (e.g. "last active") | Ordinary-query timing join | Test: inside a posting transaction, compare per-table write counters for `cc_web`-readable identity tables. `pg_stat_xact_user_tables` is the expected tool (**Unverified** here) | Rule in §2.8; review |
| F12 | Merge bug | Double-counted totals, or lost tags (dropped students) | Property tests: random vote sets on A and B, then total(B) = \|union\| | Keep dropped enrollments until seal |
| F13 | Backup restore / "restore to new project" / branching | The copy holds linkage-equivalent data, and Vault keys are **copied** by restore-to-new-project and branching [V13]. Neon branches copy all data | Inventory of environments | Never restore production into dev/preview. If the Neon–Vercel integration auto-creates preview branches from production (**Unverified**), point previews at a seeded non-production branch |
| F14 | Migration recreates a table or function without grants/RLS, or alters ownership | Lock silently removed | The catalog invariant suite runs after every migration in CI and as the production self-check | Migrations in raw SQL; grants in the same migration |
| F15 | ORM introspection needs broad SELECT | Pressure to grant `cc_web` more | — | Use the ORM only for `catalog`/`identity`/`content`; call `api.*` via raw parameterised SQL |
| F16 | Analytics, session replay or error SDK added later | Captures page text with a user id (§3 prohibited) | Dependency review; CSP allow-list; canary test on rendered pages | Ban list in CONTRIBUTING (owner approval needed) |
| F17 | Vendor dashboards (Supabase Table Editor / Neon SQL editor) | The operator sees all schemas side by side | — | Accepted (operator). Do not share dashboard access; Supabase dashboard queries run as `postgres` and are tagged `-- source: dashboard` [V12] |
| F18 | Session table with sliding expiry or last_seen | Login and activity times correlate with posts | Schema test: no such columns | Fixed expiry; the sessions table is locked |
| F19 | Wrong course key used (code bug) | Tags fail to de-duplicate across a key rotation | Tests around rotation | Key version stored with the key; rotation job re-keys tags by roster |
| F20 | RLS context forged (`set_config` by `cc_web`) | Cross-course content visibility, i.e. an authZ bug (not a mapping leak) | Tests | The RLS context holds the session token and policies resolve it via a definer (§8) |

---

## 6. Limitations of anonymity to document for users (§6.2, §11)

These are facts to communicate. The wording is the owner's, and none of it is copy text:

1. The system never stores who wrote a question or comment, but **the server necessarily knows who
   is posting at the moment of posting** in order to credit the private counter.
2. **The platform operator, and the database, hosting and authentication vendors, are trusted.**
   Someone with full database access and the application's secrets could reconstruct who upvoted,
   followed or reported which items. In the synchronous mode they could also infer each student's
   most recent action. Instructors, TAs and administrators cannot do this through the app.
3. Upvote, follow and report records are kept in protected, keyed form until the course is closed
   and the course key is destroyed (if R1 is adopted). Until then they could be compelled by legal
   process.
4. Anonymity does not protect against **self-identifying content**, writing style, small class
   sizes, or people watching in the classroom.
5. Posting times are shown approximately (if NQ-A8 adopts coarsening). Posting right after an
   in-person conversation can still give someone away.
6. Survey written responses are hidden until at least N responses exist (Q16). In a small class
   they may still be recognisable.
7. Aggregate participation levels may be hidden once sharing opens (if NQ-A7 option (a) is
   adopted), so that non-sharers' levels cannot be inferred.
8. Emails never contain question text or say which question they are about.
9. Hosting and database logs are kept for a short time (1 hour of runtime logs on Vercel Hobby
   [V18]; 1 day of Supabase Free API/DB logs [V19]) and contain request times and IP addresses, not
   content.
10. Moderation cannot see who posted something. Credit already earned for hidden content is
    unaffected (pending NQ-A5).
11. If the institution ever enables exceptional deanonymization (§6.4), it would apply only to
    content posted after a published notice (item 14).

---

## 7. Testability: negative tests that prove it (§9, §10)

Test data uses **canaries**: a student named `CANARY_NAME_7f3a` with email `canary7f3a@…`, posting
`CANARY_TEXT_91bd`. Every check below asserts that no single artefact contains both canaries.

**Database catalog level (CI and production self-check)**
1. `cc_web` holds no table, column, sequence or function privilege on `identity_private`, `keys`,
   `participation`, `content_tags`, `survey`, `survey_private`, `ratelimit`, `notify`
   (`has_table_privilege` / `information_schema.role_table_grants`).
2. No column in `content.*`, `survey.*` or `content_tags.*` is a FK to `identity.users`, and no
   column name matches `user|author|owner|pid|session|ip|agent`.
3. No view depends on both an identity-bearing schema and an anonymous-content schema
   (`information_schema.view_table_usage` / `pg_depend`; the exact catalog query is to be written
   and checked: **Unverified** here).
4. Every `SECURITY DEFINER` function has `search_path` in `proconfig`, is owned by a `cc_fn_*`
   role, and has no PUBLIC EXECUTE; `cc_web`'s EXECUTE set equals the §2.7 whitelist exactly.
5. Locked tables have `relrowsecurity` and `relforcerowsecurity` true, with policies only for
   `cc_fn_*` roles.
6. `rolbypassrls = false` and no membership in `pg_read_all_data` for all `cc_*` login roles.
7. Settings: `track_commit_timestamp = off`, `log_statement = none`,
   `log_min_duration_statement = -1`, `log_parameter_max_length_on_error = 0`.
8. No sequences or identity columns in anonymous schemas; all uuid defaults are
   `gen_random_uuid()`.

**Function / API level**
9. As an instructor, TA or admin session: every `api.*` function, called with every parameter
   combination the role may use, returns nothing containing a canary student's id, pid or tag.
10. A forged or absent session yields a generic error. A valid session for student A cannot obtain
    B's participation or upvote state.
11. Upvote twice → total +1, counter +1. Merge property test: random sets give total(B) = |votes(A)
    ∪ votes(B)| and counters unchanged.
12. With `cc_web` credentials only, attempt `SELECT` on each locked table → permission denied. Then
    temporarily GRANT (simulating F1) → 0 rows because of FORCE RLS.
13. Posting-transaction write audit (F11): no write to any `cc_web`-readable identity table.

**UI / presentation / search**
14. End-to-end (browser): instructor, TA and admin pages, presentation mode and search results never
    render the canary name next to canary text. Presentation mode shows no counts beyond the
    §7.8 list.
15. Hidden or removed content never appears in student search (§7.14).

**Exports**
16. Shared-results export contains exactly name, level and date-shared columns (§7.10). The content
    export contains no identity; the survey export is gated and order-randomised.

**Logs**
17. Run the full suite with DB statement-error logging at defaults and app logs captured. Grep every
    captured log (app stdout, DB log in local Postgres, test error-reporter sink) for co-occurrence
    of the identity canaries and the content canary in one record → must be zero. Repeat with forced
    errors inside each definer function.

**Identifiers**
18. All exposed ids parse as UUID version 4 (`uuid_extract_version = 4` [V3]).
19. For every enrolled user, `sha256(user_id)`, `md5(user_id)` and an unkeyed `HMAC('', user_id)`
    match no stored pid or tag (the §12 known issue).
20. With a dump of the test DB and no KEK, a scripted attacker that knows the roster cannot match
    any pid or tag (a dump-replay test).

**Side channels (documented, partly testable)**
21. Mode S: a test *demonstrates* the `xmin` equality as an operator-level limitation, so the
    documentation is honest. If Mode D is adopted, a test asserts that the counter's `xmin` ≠ the
    content row's `xmin`.
22. Aggregation gating: level distribution suppressed below N; suppressed once the sharing window
    is open (if NQ-A7 (a) is adopted).

---

## 8. Platform requirements and portability

### 8.1 What Family A needs from the database

Plain PostgreSQL features: multiple roles created by SQL, GRANT/REVOKE, ALTER DEFAULT PRIVILEGES,
row-level security with FORCE, `SECURITY DEFINER` with `SET search_path`, pgcrypto (`hmac`,
`gen_random_bytes`, PGP symmetric encryption), `gen_random_uuid()`, `CLUSTER`, and a scheduler for
jobs (pg_cron or the host's cron). Exact availability of a scheduler on each vendor's free plan is
**Unverified**. A host cron calling `cc_jobs` functions works anywhere. PostgreSQL 15+ is needed for
`security_invoker` views [V12]. The current major version is 18 (docs 18.6) [V1].

### 8.2 Vendor specifics (verified unless marked)

| Topic | Supabase | Neon |
|---|---|---|
| Custom login roles by SQL | Yes: `create role … with login password …` [V12] | Yes, from any SQL client; 500 roles per branch; no plan restriction stated [V15] |
| Admin role | `postgres`, "admin privileges", **has `bypassrls`**, default owner [V12] | Console/CLI/API roles join `neon_superuser`: CREATEROLE, CREATEDB, BYPASSRLS (projects after 2023-08-15), REPLICATION, `pg_read_all_data`, `pg_write_all_data`. "you can't connect using the Postgres superuser account" [V15] |
| Implication | Owner = custom `cc_owner`; FORCE RLS; `postgres` = operator only | Create all `cc_*` roles by SQL (not in `neon_superuser`) [V15]; never give the app a Console-created role |
| Auto-exposed REST API | Data API exposes `public` through default grants to `anon`/`authenticated`/`service_role`; the default is changing to opt-in (new projects since 2026-05-30; all existing projects 2026-10-30) [V20][V22]. Can be disabled entirely [V20] | Data API is **opt-in per branch** [V23]; leave it off |
| Auth co-location | Supabase Auth runs as `supabase_auth_admin`, limited to the `auth` schema [V12]; `auth.*` tables sit in the same DB (operator-visible). Whether Auth keeps working with the Data API disabled is **Unverified** | Neon Auth (Managed Better Auth) exists as a Data API option [V23]; co-location details **Unverified** |
| Secret storage | **Vault**: AEAD (libsodium-based), root key outside the DB, dumps show only ciphertext; restore-to-new-project and branching copy the key; a manual dump/restore into a new project "cannot decrypt" [V13] | None found; use K3 (KEK-wrapped) |
| pgsodium | "pending deprecation… Supabase does not recommend" it; use Vault [V14] | n/a |
| `track_commit_timestamp` | CLI-only setting, restart required [V16]; PG default `off` [V5]; the project's actual value must be tested (**Unverified**) | **Unverified** whether it can be configured |
| Logging knobs | `log_statement`, `log_min_duration_statement`, etc. are settable by `postgres` through supautils [V16] | **Unverified** |
| Logs retention | API/DB logs 1 day Free, 7 days Pro; auth audit logs 1 hour Free [V19] | **Unverified** |
| Free tier | $0; 500 MB DB; 2 active projects; **paused after 1 week of inactivity**; no backups, no PITR [V19] | $0; 100 projects; 1 GB/project; 100 CU-hours/project; scale-to-zero after 5 min (cannot be disabled); restore window 6 h (1 GB) [V21] |
| Fits the <$5/month target? | Yes on Free (with pausing risk); Pro is "from $25/month" [V19] | Yes on Free; Launch is pay-as-you-go ($0.106/CU-hour, $0.35/GB-month) [V21] |
| Superuser-only features | LEAKPROOF can be set only by a superuser [V1]. Family A does not need it | Same |

### 8.3 Variant A′: Supabase Data API with RLS and `auth.uid()` (considered, not recommended)

In A′ the browser calls PostgREST RPCs directly with the user's JWT, and functions use
`auth.uid()` (which returns the JWT `sub`) [V24]. The upside is that the DB trusts a JWT that
PostgREST has verified, so a compromised app server could not impersonate users. The downsides:
(a) **API Gateway logs index the JWT subject and request path** [V17], which puts a per-user record
of every `rpc/ask_question` call, with its time, in vendor logs; (b) the attack surface becomes
internet-facing RLS, where any policy mistake is directly exploitable; (c) it locks the design to
Supabase. Recommendation: **server-side access only, Data API disabled.** A′ remains a possible
choice for the stack ADR (Q3).

### 8.4 Does it paint the production system into a corner (§10–11)?

- **Portable:** everything except Vault is standard PostgreSQL. K3/K4 work on any managed Postgres,
  including an institution-hosted one. The `api.*` contract is independent of the stack (any
  backend language calls functions).
- **Splittable:** there are no cross-domain FKs (§2.2), so domains can later move to separate
  databases. The definer functions would then become service calls.
- **Corners to accept consciously:**
  1. No author data means **no retroactive** credit revocation, author sanctions, "edit my post"
     (NQ-A2), self-upvote blocking (NQ-A4) or deanonymization for existing content. All of these
     can be added only forward, and each one weakens P1.
  2. Business logic in PL/pgSQL is less familiar to most developers and harder to unit-test than
     application code, but it is the mechanism that makes the database enforce the rules.
  3. A single database means the operator and DB vendor see all domains. If a UW security review
     requires physically separate stores or institution-held keys, a migration path exists (K4 +
     split), but it is real work.
  4. Mode S to Mode D needs no data migration.

---

## 9. Build complexity (solo developer with Claude) and maintenance risk

Rough estimate. "Session" means one focused Claude working session. This estimate is
**Unverified**: it is a planning guess, not a measurement.

| Work item | Sessions |
|---|---|
| Schemas, roles, default privileges, RLS skeleton, migration discipline | 1–2 |
| Catalog invariant test suite and production self-check (§7 items 1–8) | 1–2 |
| Session binding (`create_session`/`resolve_session`) integrated with the chosen auth (Q4) | 1 |
| Board definers: ask, comment, upvote, follow, unclear, report, rate limit | 2 |
| Merge with roster re-keying, redirects, moderation events, property tests | 1–2 |
| Participation: counters, thresholds and versioning, my_participation, sharing/revocation/finalise | 2 |
| Survey: completions, buffer/shuffle-flush, gated results | 1 |
| Notifications: compute-on-read, digests, content-free email outbox | 1–2 |
| Logging hygiene, canary log tests, export tests, E2E negative tests | 2 |
| Threat-model and limitations write-up (Q8) | 1 |
| **Total for the privacy core** | **≈13–17** |
| Mode D (optional) | +1–2 |
| K3 key wrapping and rotation runbook (vs K2 Vault) | +1 |

**Maintenance risk: medium.** The guarantees depend on discipline in every migration (grants, RLS,
search_path, ownership). The invariant suite turns that discipline into CI failures, which is the
main mitigation. Mainstream and well documented: everything used is core PostgreSQL. The most
fragile parts are vendor defaults (the Supabase grant change on 2026-10-30 [V22]; Neon role
membership [V15]) and the temptation to add analytics or error SDKs later (F16).

---

## 10. Open questions

### 10.1 Existing §13 questions this design depends on

Q3 (stack/hosting: Supabase K2 vs portable K3), Q4 (auth and session mechanism; session binding),
Q6 (email provider: tracking off, logs), **Q7 (impersonation would expose private surfaces;
recommend none, or exclude privacy surfaces)**, Q8 (threat-model location; §4 and §6 here feed
it), **Q9 (this note)**, Q12 (export format triggers finalisation), Q13 (which notifications are
essential), Q14 (audited events: moderation events here), Q16 (N for levels and survey; flush size
k), Q17 (retention; R0–R3), Q18 (sharing window, seal trigger), Q20 (rate-limit values, moderation
workflow).

### 10.2 Proposed new open questions (owner to decide; none are resolved here)

| ID | Question | Why it matters for Family A |
|---|---|---|
| NQ-A1 | Who receives "Answer posted": followers, the asker, or both? | The asker option needs a stored asker tag, which weakens P1 |
| NQ-A2 | May students see, edit or delete their own anonymous posts? | Needs an authorship capability (e.g. a client-held edit token) or a stored link |
| NQ-A3 | Can upvotes be withdrawn? Does "upvotes given" then decrease? | Counter semantics; credit integrity |
| NQ-A4 | May students upvote their own question? | Blocking it needs author data |
| NQ-A5 | Does hiding or deleting content affect credit already earned? | Revocation needs an encrypted author reference (fork in the design) |
| NQ-A6 | On merge: does a student who upvoted both keep 2 "upvotes given"? What happens to answers and "Still unclear" marks on the merged-away question? Who sees unclear counts? | Merge semantics (§7.7 "qualifying" credit) |
| NQ-A7 | How are level aggregates protected against differencing with shared results (hide after sharing opens / complex rule / noise / drop)? | Otherwise non-sharers' levels can be inferred (§7.10, §10) |
| NQ-A8 | What timestamp precision is stored and shown for content? | Timing correlation vs the "most recent" sort |
| NQ-A9 | Is the platform operator inside the trust boundary for the prototype? For production? | Decides whether Family A is sufficient or a stronger family is needed |
| NQ-A10 | Is delayed crediting (Mode D) acceptable UX? | Closes the `xmin` side channel |
| NQ-A11 | Does the moderation log or dashboard record or show *staff* identity next to content? Does "identity-bearing" in §3 include staff? | Moderation log design |
| NQ-A12 | How are repeat anonymous abusers handled? | Sanction-without-reveal needs an author reference |
| NQ-A13 | Does asking a question auto-follow it? | Deniability vs `xmin` linkage in Mode S |
| NQ-A14 | Must the exit survey prevent duplicate submissions? | Completion records vs no records |
| NQ-A15 | Is a shared level frozen at share time or live until finalisation? | §7.10 sharing semantics |
| NQ-A16 | Which vendor logs are acceptable, and must logs be verified not to contain request bodies (e.g. Supabase gateway)? | Logging guarantee (§6.2) |
| NQ-A17 | Can a person be both TA and student in the same course? | Role conflict could expose moderation views to a student |
| NQ-A18 | Should presentation mode and analytics show live or snapshot totals? | Classroom observation side channel |

---

## Appendix A: verified facts (all checked 2026-10-11)

| Tag | Fact (as stated on the page) | URL |
|---|---|---|
| V1 | PG 18.6 docs: SECURITY DEFINER runs with the owner's privileges; set `search_path` to exclude untrusted-writable schemas, `pg_temp` last; EXECUTE is granted to PUBLIC by default, so revoke and grant within the creating transaction; LEAKPROOF can only be set by a superuser | https://www.postgresql.org/docs/current/sql-createfunction.html (checked 2026-10-11) |
| V2 | Superusers and BYPASSRLS roles always bypass RLS; table owners bypass unless FORCE ROW LEVEL SECURITY; no policy means default-deny; referential-integrity checks bypass RLS ("covert channel" warning) | https://www.postgresql.org/docs/current/ddl-rowsecurity.html (checked 2026-10-11) |
| V3 | PG 18: `gen_random_uuid()`/`uuidv4()` give v4; `uuidv7()` gives v7 (ms Unix timestamp plus sub-ms plus random); `uuid_extract_timestamp()` works for v1/v7; `uuid_extract_version()` | https://www.postgresql.org/docs/current/functions-uuid.html (checked 2026-10-11) |
| V4 | `xmin` = "the identity (transaction ID) of the inserting transaction for this row version"; each update creates a new row version; `ctid` = physical location | https://www.postgresql.org/docs/current/ddl-system-columns.html (checked 2026-10-11) |
| V5 | `track_commit_timestamp`: "Record commit time of transactions… can only be set at server start. The default value is off" | https://www.postgresql.org/docs/current/runtime-config-replication.html (checked 2026-10-11) |
| V6 | `log_min_error_statement` default ERROR (failing statements logged); `log_parameter_max_length_on_error` default 0 (bind parameters not in error logs); `log_statement` default none; `log_parameter_max_length` default −1 (full parameters when statement logging is on); `log_min_duration_statement` default −1 | https://www.postgresql.org/docs/current/runtime-config-logging.html (checked 2026-10-11) |
| V7 | pgcrypto `hmac(data, key, type)`; `digest` algorithms incl. sha256; `gen_random_bytes` max 1024 bytes; data and keys pass in clear between client and server (use SSL, trust the DBA); not side-channel resistant; PGP functions preferred over raw `encrypt()`; mentions CVE-2026-14663 | https://www.postgresql.org/docs/current/pgcrypto.html (checked 2026-10-11) |
| V8 | Default PUBLIC privileges: EXECUTE on functions/procedures; none on tables, sequences, schemas; ALTER DEFAULT PRIVILEGES can override | https://www.postgresql.org/docs/current/ddl-priv.html (checked 2026-10-11) |
| V9 | RFC 9562 (May 2024, Standards Track, obsoletes RFC 4122): v7 = 48-bit Unix ms timestamp; v4 = 122 random bits; "SHOULD NOT assume that UUIDs are hard to guess… MUST NOT be used as security capabilities"; use v4 for security-related contexts | https://www.rfc-editor.org/rfc/rfc9562.html (checked 2026-10-11) |
| V10 | RFC 2104 (Feb 1997, Informational): HMAC; key length below L "strongly discouraged"; keys chosen at random | https://www.rfc-editor.org/rfc/rfc2104.html (checked 2026-10-11) |
| V11 | RFC 9576 Privacy Pass Architecture (June 2024, Informational); issuance RFC 9578; HTTP auth scheme RFC 9577; tokens unlinkable to their issuance | https://www.rfc-editor.org/rfc/rfc9576.html (checked 2026-10-11) |
| V12 | Supabase roles: `postgres` (admin; owner; has `bypassrls`), `anon`, `authenticated`, `service_role` (bypassrls), `supabase_auth_admin` (auth schema only), `supabase_etl_admin` (bypasses RLS); custom `create role … login password`; dashboard queries run as `postgres` with `-- source: dashboard`; views bypass RLS by default, use `security_invoker` (PG15+); definers with `search_path = ''`, never in exposed schemas | https://supabase.com/docs/guides/database/postgres/roles and https://supabase.com/docs/guides/database/postgres/row-level-security (checked 2026-10-11) |
| V13 | Supabase Vault: AEAD based on libsodium; per-project root key "never stored in the database alongside the encrypted data"; dumps show only ciphertext; restore-to-new-project and branching copy the key; manual dump/restore into a new project cannot decrypt; Management API returns the root key; `vault.decrypted_secrets` gives decrypted access to whoever can read it | https://supabase.com/docs/guides/database/vault (checked 2026-10-11) |
| V14 | pgsodium "pending deprecation"; "Supabase does not recommend the usage of pgsodium… Use Supabase Vault instead"; Vault "is not affected by this deprecation"; no dates | https://supabase.com/docs/guides/database/extensions/pgsodium (checked 2026-10-11) |
| V15 | Neon: CREATE ROLE via SQL supported; 500 roles per branch; Console/CLI/API roles join `neon_superuser` (CREATEDB, CREATEROLE, BYPASSRLS for projects after 2023-08-15, REPLICATION, `pg_read_all_data`, `pg_write_all_data`, …); SQL-created roles are not members; no true superuser | https://neon.com/docs/manage/roles (checked 2026-10-11) |
| V16 | Supabase custom config: supautils lets `postgres` set `log_statement`, `log_min_duration_statement` and others; `track_commit_timestamp` is CLI-only with restart | https://supabase.com/docs/guides/platform/custom-postgres-config (checked 2026-10-11) |
| V17 | Supabase Logs: sources include API Gateway, Postgres, Auth, PostgREST; filters include Pathname and "User: Match the user's ID in Auth actor IDs or API Gateway JWT subjects"; retention depends on plan | https://supabase.com/docs/guides/telemetry/logs (checked 2026-10-11) |
| V18 | Vercel runtime logs: request method, path, search params, user agent, time, status; retention Hobby 1 hour, Pro 1 day, Observability Plus 30 days | https://vercel.com/docs/logs/runtime (checked 2026-10-11) |
| V19 | Supabase pricing: Free $0, 500 MB, 50,000 MAU, 2 active projects, paused after 1 week inactivity, no backups/PITR, 1-day API/DB logs, 1-hour auth audit logs; Pro from $25/month, daily backups 7 days, PITR add-on, 7-day logs | https://supabase.com/pricing (checked 2026-10-11) |
| V20 | Supabase hardening: `public` objects get default grants to `anon`/`authenticated`/`service_role` on existing projects; Data API can be disabled ("none of the auto-generated REST endpoints respond"); revoke default privileges; use a dedicated schema; dashboard-created tables have RLS on by default | https://supabase.com/docs/guides/api/hardening-data-api (checked 2026-10-11) |
| V21 | Neon pricing: Free $0, 100 projects, 1 GB/project, 100 CU-hours/project, scale-to-zero after 5 min, history/restore window 6 h (1 GB); Launch pay-as-you-go $0.106/CU-hour, $0.35/GB-month, history up to 7 days | https://neon.com/pricing (checked 2026-10-11) |
| V22 | Supabase discussion #45329 "Breaking Change: Tables not exposed to Data and GraphQL API automatically" (2026-04-28): new default for new projects from 2026-05-30; applied to all existing projects on 2026-10-30; existing tables keep their grants | https://github.com/orgs/supabase/discussions/45329 (checked 2026-10-11) |
| V23 | Neon Data API: opt-in per branch; authorization entirely through Postgres GRANTs and RLS; roles `authenticated` / `anonymous`; Neon Auth or other JWT providers; free-plan availability not stated | https://neon.com/docs/data-api/get-started (checked 2026-10-11) |
| V24 | Supabase `auth.uid()` returns the requesting user's id; wrap it as `(select auth.uid())` for per-statement caching | https://supabase.com/docs/guides/database/postgres/row-level-security (checked 2026-10-11) |

## Appendix B: Unverified items (do not rely on these without checking)

- That `pg_dump`/COPY output follows physical row order; that HOT updates with `fillfactor` keep
  rows in place; whether `CLUSTER` resets `xmin`.
- `pg_stat_xact_user_tables` as the tool for the posting-transaction write test;
  `information_schema.view_table_usage` as the right view-dependency source.
- Exact pgcrypto PGP function names and public-key support (the page confirms PGP functions exist).
- Whether Supabase API Gateway logs capture request bodies; whether Supabase Auth works with the
  Data API disabled; whether Vault is available on the Free plan; custom roles through the
  Supavisor pooler; the project's actual logging values and `track_commit_timestamp`.
- Neon: whether `track_commit_timestamp` and logging settings can be configured; log retention;
  Data API on Free; whether the Vercel integration auto-branches production data into previews.
- Email providers' tracking defaults and log retention (Q6); auth providers' log contents (Q4).
- Merge HMAC cost at scale; the build-session estimate.
