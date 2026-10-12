# Privacy design candidate B — Physically separated stores and services with a privacy-preserving event pipeline

> Research and planning only. Not a decision. Everything below is a PROPOSAL for the owner to approve
> or reject via an ADR (CONTRIBUTING §1, §6.3, §12, Q9). Requirements are cited as §N.N of
> `P:/code/clearcourse-ai/CONTRIBUTING.md`. Vendor facts carry a URL and "(checked 2026-10-11)";
> anything not verified is labelled **Unverified**.

Status: COMPLETE draft for review (research session 2026-10-11). Spikes S-B1…S-B4 and Appendix B items are open.

**Verdict in brief (PROPOSAL for the owner, not a decision).** Family B gives a strong *structural* guarantee
against the actors the spec names (§6.2, §9): authorship is never stored anywhere, and
each database is non-identifying on its own, which makes many §9 negative tests static checks. Its costs are real:
roughly 8 databases and 8–9 services for one developer, deliberate credit/notification delays (PNQ-B1), debugging
with request logs switched off, Free-plan CPU risk (10 ms per invocation), and no protection against the operator or
host (same as every server-side design). On Cloudflare it fits the Free plan's 10-database cap for one environment;
Workers Paid is $5/month, which meets but does not beat the "<$5/month" target. Suggested use: adopt B's
*principles* (no author column, per-item keyed tags, stateless receipts, idempotent delayed crediting, content-free
email) regardless of platform; choose "B-full" only if the owner answers PNQ-B13 "yes, protect against the
operator too", otherwise consider "B-lite" (§9) or family A with these principles layered in.

## 0. Scope and conventions

- **Requirement** = text that CONTRIBUTING.md cites to the spec (`§N.N`). **Proposal** = my design choice, which
  the owner must approve. **OQ** = an existing open question in §13 (Q1–Q20). **PNQ-Bn** = a *proposed new* open
  question raised by this note (collected in §10).
- What the spec actually requires (§6.2, §9): ordinary application queries, instructors, TAs, admins, logs, exports
  and predictable identifiers must not reveal who wrote/upvoted what. Protecting against the **platform operator
  (owner)** and **vendors** goes *beyond* the requirement. This note says per actor what is and is not protected;
  anything not protected is a "limitation of anonymity" to document (§6.2, §11).
- This family (B) is the "physically separated stores + narrow internal APIs + privacy-preserving event pipeline"
  answer to Q9 (§6.3). It is also the separation design §12 says D1 would need (D1 has no Postgres schemas or RLS).
- Vendor facts carry a reference like **[F7]** pointing to Appendix A (URL, checked 2026-10-11).

## 1. Mechanism summary

**One paragraph.** Each of the five §6.1 domains lives in its **own database** (a separate D1 database, or a
separate Neon project), and each database is reachable only by **one service** that holds its credential/binding.
A public **Gateway** service is the only component that sees the signed-in user *and* the request body at the same
time; it is stateless, has request logging switched off, and never persists anything. The anonymous **Board** store
records questions and comments with **no author reference at all**. Upvotes, follows, "Still unclear" marks and
reports are stored only as **per-item keyed tags** (`HMAC(K_course, label ‖ user_id ‖ item_id)`), so each tag
de-duplicates one student on one item but tags cannot be linked across items or to a user without the key. The
per-course key lives only in a separate **Linkage (pseudonym) service**, which never sees content text. Participation
credit flows through an **asynchronous queue** with **random delay and batching**: the Board returns a signed,
stateless "receipt" for a qualifying action; the Gateway enqueues `{event_id, counter_pseudonym, action_type,
receipt}`; the **Participation** service verifies the receipt, de-duplicates on `event_id` and increments a counter
keyed by a keyed per-course pseudonym. Merging duplicates is done by a **privileged recomputation** inside the
Linkage service (roster scan of tags; no content). Shared results, the exit survey and the audit log each have their
own store and service. At end of term the per-course key can be **crypto-shredded** (option for Q17), after which
the remaining tags and counters can no longer be attributed by anyone, including the operator, once backup/history
windows expire.

**Diagram (text).** Arrows are narrow RPC calls (service bindings on Cloudflare). `[..]` = what crosses the arrow.

```
 Browser ──HTTPS(session cookie)──► GATEWAY (public Worker; stateless; invocation logs OFF)
                                     │  knows: user_id (from session), request body (transiently, in memory only)
          ┌──────────────────────────┼───────────────────────────────┬──────────────────┬─────────────────┐
          │[user_id]                 │[content, course_id, tags]     │[user_id,item ids]│[event_id, cpid, │
          ▼                          ▼                               ▼                  │ action, receipt]│
   IDENTITY svc ──► DB-Identity   BOARD svc ──► DB-Board         LINKAGE svc ──► DB-Linkage           ▼
   users, enrolments, roles,      questions, comments, answers,   holds K_root (secret); QUEUE (random delay,
   TA perms, prefs, email,        tag sets (upvote/follow/        per-course keys wrapped;  batching)
   survey-eligibility flags       unclear/report); NO author      computes tags + counter  │
          ▲                       column; signs receipts          pseudonym (cpid); roster ▼
          │[course_id → user_ids]                                 scans for merge/notify  PARTICIPATION svc
          └──────────────────────────────────── LINKAGE ◄──────────────────────────────┐   ──► DB-Participation
                                                                                        │   counters by cpid,
   SHARED-RESULTS svc ──► DB-Shared  (name-free: user_id, level, version, dates)        │   threshold versions,
        ▲ [user_id, course_id, level, P-signed attestation]  ◄── via GATEWAY            │   processed event ids
   SURVEY svc ──► DB-Survey (answers only; delayed shuffled batch inserts) ◄── QUEUE ◄─ GATEWAY [answers only]
   AUDIT svc ──► DB-Audit (append-only; moderator id + item ids, never content text)
   NOTIFY-SWEEP (cron) ── asks BOARD for updated items, LINKAGE resolves recipients → content-free email
```

Key properties (all **proposals**):

| Property | How it is achieved |
|---|---|
| No store holds identity + content | Author is never written; tags are keyed; separate databases cannot be joined by any query |
| Least privilege per service | Each DB bound/credentialed to exactly one service; RPC methods exposed only to declared callers |
| Only one component holds the key | Linkage service holds `K_root`; Board/Participation/Gateway never see raw keys |
| Timing decorrelation | Random delay + per-course batching of counter updates; coarse timestamps; digest emails |
| Exactly-once crediting without a cross-store transaction | Stateless signed receipt + idempotent consumer keyed on random `event_id` |
| Forward unlinkability at end of term | Optional crypto-shredding of per-course keys (Q17 option) |

## 2. Data model sketch

Illustrative only (no DDL files). All public/opaque ids are **UUIDv4 from a CSPRNG** (`crypto.randomUUID()` is v4
in Workers [F9]). On D1/SQLite, every content-bearing table is declared **`WITHOUT ROWID`** with the UUID as primary
key, because an ordinary SQLite table has a rowid that is "one larger than the largest ROWID in the table" [F14],
which leaks insertion order (see §4 side channels). Whether D1 accepts `WITHOUT ROWID` is **Unverified** — spike S-B1.

### 2.1 Key material (Linkage domain — not one of the five §6.1 domains; it is the "only key" holder)

```
K_root          Worker secret on the LINKAGE service only (32 random bytes). Never exported.
course_keys     (DB-Linkage)
  course_id        uuid  PK part
  key_version      int   PK part
  wrapped_key      blob  AES-GCM(K_root, K_course)   -- Web Crypto AES-GCM supported [F9]
  status           text  active | retired | shredded
  created_day      date  (coarse)
  shredded_day     date  null
Derived per-course sub-keys (HKDF from K_course, HKDF supported [F9]):
  K_tag_upvote, K_tag_follow, K_tag_unclear, K_tag_report, K_cpid
```

Derivations (proposal):

| Value | Formula | Stored where | Purpose |
|---|---|---|---|
| upvote tag | `HMAC-SHA-256(K_tag_upvote, user_id ‖ question_id)` | DB-Board | one upvote per student per question (§7.7) |
| follow tag | `HMAC(K_tag_follow, user_id ‖ question_id)` | DB-Board | follow / unfollow; notification targeting (§7.7, §7.13) |
| unclear tag | `HMAC(K_tag_unclear, user_id ‖ answer_id)` | DB-Board | de-dup "Still unclear" (§7.7; de-dup itself is PNQ-B4) |
| report tag | `HMAC(K_tag_report, user_id ‖ item_id)` | DB-Board | one report per student per item (§7.7 "safe content reporting") |
| counter pseudonym `cpid` | `HMAC(K_cpid, user_id)` (per course, via per-course key) | DB-Participation | private counter key (§6.2, §7.9) |

Why keyed and per-item: an unkeyed hash of a known user id is reversible by hashing the roster (§12 known issue).
Per-item tags mean DB-Board cannot even tell that the same (unknown) student upvoted Q1 and Q2, so there is no
pseudonymous activity profile in the content store (supports §3 "no identity-linked discussion analytics", §7.16).

### 2.2 Domain 1 — Anonymous discussion content (DB-Board; BOARD service only)

```
questions        (question_id uuid PK, course_id, tag_type 'course'|'assignment', assignment_id null,
                  title, body, status open|resolved, pinned bool, hidden bool, deleted bool,
                  merged_into uuid null, discussed_in_class bool, presentation_selected bool,
                  created_bucket  -- coarse time bucket used for "most recent" sort (granularity = PNQ-B6)
                  upvote_count int (materialised), updated_bucket)
comments         (comment_id uuid PK, question_id, body, hidden, deleted, created_bucket)
answers          (answer_id uuid PK, question_id, body, author_staff_user_id, created_at)   -- staff are not anonymous
upvotes          (question_id, voter_tag)  PK(question_id, voter_tag)
follows          (question_id, follow_tag) PK(question_id, follow_tag)
unclear_marks    (answer_id, unclear_tag)  PK(answer_id, unclear_tag)
reports          (report_id uuid PK, item_id, item_kind, reason_code, note_text?, report_tag,
                  created_bucket, queue_state)  UNIQUE(item_id, report_tag)
redirects        (old_question_id PK, new_question_id)                  -- §7.7 "redirect old links"
idempotency      (request_key_hash PK, expires_day)                     -- double-submit protection, no identity
```

Deliberately **not** stored in DB-Board: author user id; any per-student pseudonym that is stable across items;
IP address; user agent; exact second-level timestamps for student actions; session ids; email.
Answers carry the staff author (instructors/TAs are not anonymous in the spec). Whether answers/staff names are
shown to students is not specified — **not decided here**.

### 2.3 Domain 2 — Private per-student participation counters (DB-Participation; PARTICIPATION service only)

```
counters            (course_id, cpid, questions int, comments int, upvotes_given int,
                     last_ack_level text)            PK(course_id, cpid)   -- no per-event rows, no timestamps
threshold_versions  (course_id, version int, contrib_qc int, contrib_up int, sustained_qc int, sustained_up int,
                     published_day, status draft|published|superseded) PK(course_id, version)  -- immutable once published
course_participation(course_id PK, participation_started bool)   -- set when first credit is applied
processed_events    (event_id uuid PK, expires_day)  WITHOUT ROWID   -- idempotency; purged after receipt expiry
```

Deliberately **not** stored: user_id, name, email, question/comment ids, content text, per-event timestamps, event
type history. (Counts only — §7.9 counts only questions, comments, upvotes given.)

### 2.4 Domain 3 — Student identity and enrolment (DB-Identity; IDENTITY service only)

```
users            (user_id uuid PK, display_name, email, idp_subject, created_at)
enrolments       (course_id, user_id, role student|instructor|ta, status active|dropped, since_day, until_day)
ta_permissions   (course_id, user_id, can_moderate bool, can_edit_cards bool)          -- §5
notif_prefs      (user_id, course_id, kind, channel in_app|email, enabled)             -- §7.13, Q13
notif_seen       (user_id, course_id, last_seen_bucket)                                -- for compute-on-read inbox
survey_eligibility (survey_id, user_id, submitted bool)  -- only if duplicate prevention option S2 is chosen (§3 item 10)
```

Deliberately **not** stored: anything from DB-Board (no question ids), counters, levels, cpid, tags.
Note: dropped enrolments are retained so that merge recomputation can still match tags of students who later dropped
(retention itself is Q17).

### 2.5 Domain 4 — Instructor-visible shared participation results (DB-Shared; SHARED service only)

```
shares   (share_id uuid PK, course_id, user_id, level text, threshold_version int,
          shared_at date, status active|revoked|final, finalized_at null, attestation blob)
          UNIQUE(course_id, user_id) where status != 'revoked'
exports  (export_id uuid PK, course_id, exported_by_user_id, exported_at, share_ids[])   -- makes shares final (§7.10)
```

Instructor view = `shares ⋈ users.display_name` performed by the **Gateway** in memory (two RPC calls), returning only
name · level · date shared (§7.10). Not stored: counts, dates of activity, cpid, tags.

### 2.6 Domain 5 — Anonymous exit-survey responses (DB-Survey; SURVEY service only)

```
surveys    (survey_id uuid PK, course_id, open_day, close_day, min_responses_to_reveal int)  -- threshold is Q16
responses  (response_id uuid PK, survey_id, a1 text, a2 text, a3 text) WITHOUT ROWID  -- no time, no user, no cpid
staging    (staging_id uuid PK, survey_id, a1, a2, a3) WITHOUT ROWID   -- held until a batch of ≥k is released
tokens     (token_hash PK, survey_id, consumed bool) WITHOUT ROWID     -- only if option S3 is chosen
```

### 2.7 Supporting stores (not §6.1 domains)

| Store | Contents | Must never contain |
|---|---|---|
| DB-Audit (AUDIT svc) | append-only: actor_user_id (staff/admin), action, item ids, course_id, at | content text; student ids; tags |
| DB-Ops (GATEWAY) | rate-limit counters keyed `HMAC(K_rl, user_id ‖ day)`; notification-sweep cursors | content text; item ids |
| Course config (part of DB-Board or own store) | cards (§7.3–7.6), card versions, institution config | student data |

Course/assignment cards (§7.3–§7.6) are not privacy-sensitive with respect to anonymity and could live in a
"Courseware" store; the placement is not a privacy decision and is left to the stack ADR (Q3).

## 3. Walkthrough of checklist items 1–16

Common primitive used below — **the credit pipeline** (proposal):

```
1. Browser → GATEWAY: POST /courses/{c}/questions {title, body, client_request_id}
2. GATEWAY: authN (session) → IDENTITY.checkEnrolment(user_id, c, 'student')
            → rate limit (§3 item 9) → BOARD.createQuestion(c, title, body, hash(client_request_id))
3. BOARD: insert (one D1 batch / one SQL transaction) → returns {question_id,
            receipt = Ed25519_sign(K_board_sign, {event_id: uuidv4, course_id: c, action: 'question', exp: +24h})}
            BOARD does not store event_id. (Ed25519 sign/verify is supported in Workers Web Crypto [F9].)
4. GATEWAY → LINKAGE.cpid(user_id, c) → cpid
5. GATEWAY → QUEUE.send({event_id, course_id, cpid, action, receipt}, delaySeconds = random(0..D))   [F11]
6. PARTICIPATION consumer: verify receipt signature + expiry; batch per course; for each event run ONE D1 batch:
       INSERT INTO processed_events(event_id,…)   -- PK conflict ⇒ whole batch rolls back ⇒ duplicate ignored [F12]
       UPSERT counters SET questions = questions + 1 WHERE (course_id, cpid)
   ack message only after the batch commits (Queues is at-least-once [F13]; consumer is idempotent).
```

The Gateway holds the user id and the content **at the same moment, in memory**. That is unavoidable for any
server-side design where the browser sends both content and a session cookie in one request (the alternative — the
browser talking to the Board with an anonymous credential — belongs to the cryptographic family C). Family B's claim
is narrower: **no store, log, view, export or dashboard holds both, and no service other than the Gateway sees both.**

### Item 1 — Asking / commenting credits the right counter; ordinary queries cannot join (§6.2, §7.9)

- Credit: the pipeline above with `action = question | comment`. The cpid is a keyed per-course pseudonym (§2.1),
  so DB-Participation alone cannot be mapped to users (no unkeyed hash, §12).
- Unjoinable: DB-Board has **no author column**. DB-Participation has **no item ids and no per-event rows**. They are
  different databases, so no SQL query can join them (D1: each database is a separate binding; a `batch()` is called
  on one binding [F12]; cross-database joins are not described — **Unverified** whether `ATTACH` works, test it and
  treat "fails" as the expected result). The only link left is **timing** (counter changes vs content creation),
  which the random delay D and per-course batching address (item 1a below).
- **1a. Timing decorrelation (proposal, values are owner decisions):** the consumer applies a course's events only
  when either (i) ≥ k_batch events from ≥ 2 distinct cpids are pending for that course, or (ii) T_max has passed;
  events in a batch are shuffled and applied in **one transaction** (in Postgres all rows then share one `xmin`;
  in D1 the batch is one transaction [F12]). Counters carry no timestamps. Queue delay can be up to 24 h [F11]; free
  plan queue retention is a fixed 24 h [F2], so D + T_max must stay well under 24 h on Free.
- **UX cost (must be accepted by the owner):** counts and "level reached" lag by up to D + T_max. The student page
  needs an explanation that recent activity can take time to appear — **copy text not in spec; owner must supply**
  (PNQ-B1). A purely client-side "pending" indicator (kept in the browser only) can soften the delay.

### Item 2 — One upvote per student per question; credits "upvotes given" (§7.7, §7.9)

- Gateway asks LINKAGE for `voter_tag = HMAC(K_tag_upvote, user_id ‖ question_id)` and calls
  `BOARD.upvote(question_id, voter_tag)`. `PK(question_id, voter_tag)` makes a second upvote a no-op.
- BOARD returns a receipt **only if the row was new**, so "upvotes given" is credited at most once per question.
- Rendering "you upvoted this": for the ≤ N visible questions the Gateway requests N tags in one batched LINKAGE
  call and asks BOARD which tags are present (BOARD returns booleans, never tags of other students).
- Un-upvoting is **not in the spec** (§7.7 lists "upvote a question" only). Whether it exists, and whether it
  removes credit, is PNQ-B2. Not decided.

### Item 3 — Merging duplicates (§7.7)

Moderator (instructor or TA with moderation permission, §5) merges A into B:

```
GATEWAY: authZ (role + TA permission) → BOARD.prepareMerge(A, B) returns {tagsA, tagsB, followsA, followsB}
GATEWAY → LINKAGE.mergeTags(course c, A, B, tagsA, tagsB, followsA, followsB)
   LINKAGE → IDENTITY.listEverEnrolledStudentIds(c)          -- opaque ids only, includes dropped students
   for each user u: tA = HMAC(K, u‖A); tB = HMAC(K, u‖B)       -- "privileged recomputation", in memory only
       if tA ∈ tagsA and tB ∉ tagsB: newTagsForB += tB
   tags in tagsA matching no roster member: carried over unchanged (cannot double-count: their owner can no longer act)
   returns {newTagsForB, newFollowTagsForB}   -- no user ids leave LINKAGE
BOARD.commitMerge(A, B, newTags…): one transaction: insert tags into B, move comments to B, A.merged_into = B,
   redirects(A → B), upvote_count(B) = |upvotes(B)|
AUDIT.append({actor: moderator_user_id, action: 'merge', from: A, to: B, course: c, at})   -- no student ids, no text
```

| Sub-requirement (§7.7) | How |
|---|---|
| Preserve comments where reasonable | comments re-parented to B; what is "unreasonable" is not specified (PNQ-B3) |
| Combine upvotes without double-counting a student | union over recomputed per-item tags |
| Preserve qualifying private participation credit | counters are **not touched** by a merge; credit already earned stays. Whether a student who upvoted both A and B keeps 2 "upvotes given" or 1 is **not specified** (PNQ-B2) — proposal: keep 2 (no decrement), because §7.7 says "preserve" |
| Redirect old links | `redirects` table; Gateway resolves `/q/A` → `/q/B` |
| Log without exposing identities | AUDIT row holds the moderator (staff are not anonymous) and item ids, never student ids/tags/text |

Cost: one HMAC per roster member per merged item pair (500 students ⇒ ~1,000 HMACs). On Workers **Free** the CPU limit
is 10 ms per invocation [F3]; whether 1,000 Web Crypto HMACs fit is **Unverified** (spike S-B2). Workers Paid allows up
to 5 min CPU [F2].

### Item 4 — Student sees own counts, level, thresholds; "level reached" notification (§7.10, §7.13)

- View: Gateway → LINKAGE.cpid(user, c) → PARTICIPATION.myCounts(c, cpid) → `{questions, comments, upvotes_given,
  level, published thresholds}`; level is computed by PARTICIPATION from counters and the threshold version (item 6).
- In-app "Participation level reached": **compute-on-read** — when the student opens the course, PARTICIPATION
  compares the current level to `counters.last_ack_level` and reports "new level"; acknowledging updates
  `last_ack_level`. No identity-keyed notification row is created, so no store links a user to a moment of activity.
- Email channel: PARTICIPATION sets a `level_email_pending` flag on the counter row (its own DB); the notify sweep
  collects pending cpids per course, LINKAGE resolves cpid → user_id by roster scan, and the email is content-free
  (item 7). Delay = credit lag + sweep interval.

### Item 5 — Verified-level sharing, revocation until export/apply (§7.10)

```
Student clicks Share (after the verbatim §7.10 text is shown):
GATEWAY → LINKAGE.cpid → PARTICIPATION.attestLevel(c, cpid)
   returns {level, threshold_version, att = Ed25519_sign(K_part_sign, {course_id, level, threshold_version, nonce})}
GATEWAY → SHARED.share(c, user_id, level, threshold_version, att)  -- SHARED verifies att with P's public key
```

- "Verified" = computed by PARTICIPATION and signed; SHARED rejects unsigned or mismatched levels, so neither a
  Gateway bug nor a crafted request can store a self-declared level. SHARED never receives counts, dates or cpid.
- Revocation: `status active → revoked` allowed while `status != final`. Export/apply sets `final` for exactly the
  share ids included in the export (`exports` row). The UI explanation of when sharing becomes final is required by
  §7.10; its wording is not in the spec (owner copy needed). Whether a student may re-share a higher level after
  revoking or after more participation depends on Q18 (sharing window) — not decided.
- Instructor list: Gateway reads `SHARED.list(c)` and `IDENTITY.displayNames(user_ids)` and returns name · level ·
  date shared only (§7.10).

### Item 6 — Threshold versioning; no disadvantaging changes; original preserved (§7.9)

- `threshold_versions` rows are immutable once `published`. Before `participation_started` the instructor may edit
  the draft and publish (§7.9 "configure … before they publish").
- After `participation_started`, a new version is accepted only if **every** numeric threshold is ≤ the previous
  published value (proposal for "would disadvantage them"; a mixed change, lowering one and raising another, is
  rejected because it could disadvantage someone). Original versions stay stored; `shares.threshold_version` records
  which version produced a verified level.
- `participation_started` is set the moment the first qualifying action is *received* (set by Gateway → PARTICIPATION
  synchronously, carrying no cpid), not when it is credited, so the random delay cannot open a window for raising
  thresholds after students began. It reveals only "someone in course c has participated".
- Whether participation "begins" at first action or at policy publication is a reading of §7.9 — flagged as PNQ-B5.

### Item 7 — Notifications that target specific students, including email (§7.13, §3, §6.2)

Two mechanisms (proposal):

**(a) In-app = compute-on-read (no stored user↔question rows).** When a student opens their inbox, the Gateway asks
BOARD for items in course c updated since `notif_seen.last_seen_bucket` (question ids + event kinds: answered,
updated, merged), asks LINKAGE for the student's follow tags for exactly those ids, and asks BOARD which of those
tags exist. The result is shown and discarded. Course-wide notices (card changed, survey available, sharing window
open, §7.13) are not anonymity-sensitive and can be ordinary identity-side rows.

**(b) Email = periodic content-free digest.** A NOTIFY-SWEEP cron Worker (5 cron triggers on Free [F3]) runs every
S hours (S = owner decision): BOARD lists `{question_id, follow_tags}` updated since the last sweep; LINKAGE roster-
scans to find recipients (in memory) and returns **only user ids**; the email service sends one message per user:
"There are updates in <course> on ClearCourse AI. Sign in to view." with a link to `/notifications` (no question id,
no title, no text).

| Notification (§7.13) | Recipient (spec) | How targeted | Correlation risk |
|---|---|---|---|
| Answer posted | **not specified** (author? followers? everyone?) — open, PNQ-B7 | followers via follow tags; author only if author auto-follows | If authors auto-follow, the first follow tag on a question is the author's ⇒ key holder can identify authors by roster scan. Proposal: no auto-follow unless owner accepts that weakening |
| Followed question updated | followers | follow tags | digest time ≠ event time |
| Question merged | not specified (followers/upvoters of A?) — PNQ-B7 | follow tags of A (re-keyed to B at merge) | as above |
| Participation level reached | that student | in-app compute-on-read; email via cpid → roster scan | email time ≈ credit-batch time, not action time |

Email provider sees: recipient address, send time, generic text. It never sees content text or which question
(§3 row "identity data and anonymous content text in the same … log"). Provider choice is Q6; the sibling note
`other-O1-email-notifications.md` proposes a provider — not re-verified here. "Nonessential" opt-outs (Q13) are
`notif_prefs` rows on the identity side.

### Item 8 — Follow, "Still unclear", report (§7.7)

| Action | Per-student de-dup needed? | Mechanism | Counts toward participation? (§7.9) |
|---|---|---|---|
| Follow | yes (follow/unfollow toggle) | follow tag per (user, question) | **No** (§7.9 excludes follows) |
| Still unclear | spec silent; needed if counts are shown (PNQ-B4) | unclear tag per (user, answer) | No (not in the counted list) |
| Report | yes, to stop one student flooding the queue | report tag per (user, item); moderators see reason + item, never the tag's owner | **No** (§7.9 excludes reports) |

Protection: tags are per-item and keyed, so DB-Board alone yields no cross-item profile; linking requires
`K_course` (LINKAGE) **and** the roster (IDENTITY). Moderators see report reasons and counts only (§7.8 excludes
reports from presentation mode). Free-text report notes could self-identify the reporter; the UI should warn
(copy is an owner decision).

### Item 9 — Rate limiting and abuse handling without revealing identity (§6.4, §7.7, Q20)

- **Where:** in the Gateway, *before* content reaches BOARD, keyed by `rl = HMAC(K_rl, user_id)` (K_rl held by the
  Gateway; unrelated to course keys). BOARD never learns who is throttled.
- **Short bursts:** Workers Rate Limiting binding — any string key, 10 s or 60 s periods, per-location and
  "eventually consistent … not … an accurate accounting system" [F10]. Free-plan availability **Unverified**.
- **Daily caps:** DB-Ops rows `(HMAC(K_rl, user_id ‖ day), action, count)`, deleted after the day.
- **Values and workflow:** Q20 (not decided). Rate limits also bound participation-credit farming.
- **Abuse by a persistent anonymous author:** moderation hides/deletes content (§7.7). Family B as specified has
  **no way to throttle "the author of post X"**, because no author link exists. Option (not recommended by default,
  owner decision, PNQ-B8): store `author_handle = AES-GCM(K_abuse, rl)` on each post, decryptable only by LINKAGE, so
  a moderator can request "throttle the author of X" without learning identity. This adds an escrowed author link
  that the operator could abuse; it weakens item 14.

### Item 10 — Exit survey anonymity and separation (§7.12)

- SURVEY has its own DB, binding and Worker, with Workers Logs invocation logging disabled (item 12). It receives
  only `{survey_id, a1, a2, a3}`; it never receives user_id, cpid, IP or user agent (§7.12 "no unnecessary metadata").
- Completing the survey triggers **no** credit message (§7.12). Survey is offered regardless of sharing (§7.12).
- Insertion: Gateway enqueues the answers with a random delay; the SURVEY consumer writes to `staging` and moves rows
  to `responses` only in shuffled batches of ≥ k, so neither insertion order nor time links a response to a session.
  Instructors see aggregates/text only once `min_responses_to_reveal` is met (§7.12; default value is Q16).

Duplicate-submission options (owner decision; spec does not require duplicate prevention — PNQ-B9):

| Option | Mechanism | Linkability | Cost |
|---|---|---|---|
| S1 none | accept duplicates; soft per-browser guard | none | trivial; ballot-stuffing possible |
| S2 eligibility flag | IDENTITY `survey_eligibility.submitted = true`; response carries no reference; batched delayed insert | only by timing; mitigated by ≥ k batches | low — **proposal** |
| S3 one-time random token | Gateway issues random token; SURVEY stores `token_hash`; issuer stores only "issued" | timing between issuance and consumption | medium |
| S4 blind-signed token | RSA blind signatures / Privacy Pass so even the Gateway cannot link | none (cryptographic) | high; belongs to family C |

### Item 11 — Aggregates only above thresholds; differencing (§7.16, Q16)

- ANALYTICS is a read-only function in the Gateway that calls each domain for **pre-aggregated** numbers:
  BOARD → totals (questions, comments, upvotes, unanswered, course-vs-assignment, % resolved); PARTICIPATION → level
  histogram; IDENTITY → enrolled-student count (No Record = enrolled − Contributor − Sustained); SURVEY → aggregates.
  No row-level data crosses.
- Suppression rule (values are Q16): a level count is shown only if every cell ≥ k_agg.
- **Differencing attack:** instructor sees `levels histogram` and the `shares` list (names + levels). Non-sharers'
  levels = histogram − shared. If exactly one student has not shared, their level is revealed. Options (no decision):

| Option | Effect | Trade-off |
|---|---|---|
| DF1 suppress the level histogram once the sharing window opens (Q18) | no differencing during sharing | analytics unavailable at end of term |
| DF2 show a cell only if (cell count − shared in that cell) is 0 or ≥ k_agg and cell ≥ k_agg | blocks the single-non-sharer case | more suppression; still leaks via repeated queries as shares arrive |
| DF3 freeze the histogram at a snapshot taken before sharing opens | sharer list and histogram refer to different times | levels can change after the snapshot |
| DF4 noisy counts (differential privacy) | formal guarantee | numbers no longer exact; unusual for this audience |

  Also: the histogram over time (refreshing daily) is a differencing channel for *activity* — "Contributor went from
  9 to 10 just after Q was posted". Proposal: refresh at most daily and only when cells ≥ k_agg. (PNQ-B10.)

### Item 12 — Logs, analytics, error reports, views, exports, dashboards (§3, §6.2), incl. vendor logs

| Surface | Risk in this design | Control (proposal) |
|---|---|---|
| Workers Logs (Cloudflare) | **On by default for new Workers**; invocation logs include the request (method, URL) and metadata, and all `console.log` output [F8] | Gateway, LINKAGE, PARTICIPATION, SURVEY, SHARED: `observability` disabled or `head_sampling_rate = 0`; at minimum `invocation_logs = false` [F8]. BOARD may log errors with item ids only. Lint rule: no `console.*` outside a vetted logger with an allow-list of fields. CI check of every `wrangler` config |
| Cross-Worker correlation in one account | All Workers' logs land in one account dashboard (one "administrator dashboard"); identity-side and content-side logs could be joined by time even if each is clean | Treat the Cloudflare dashboard as an admin dashboard under §3: identity-side Workers log nothing per request; content-side logs no user ids. Whether traces propagate a request id across service bindings is **Unverified** (spike S-B3) |
| URLs | Question ids in URLs appear in invocation logs [F8] together with the Gateway's request context | Gateway logs off (above); question ids are random UUIDv4, never names |
| Error reports (any third-party tool) | stack traces with request bodies + user | Not adopted for identity-side services; if added, body/headers scrubbed — decision deferred |
| Analytics events | product analytics would tie sessions to pages | none in milestone 1 (proposal); §7.16 aggregates are computed server-side (item 11) |
| DB views | impossible across databases; within a DB nothing to join | CI test asserts no DB has both an identity column and a content column (schema scan) |
| Exports | grade export from SHARED only (name, level, date, §7.10, format Q12) | no other export in milestone 1 |
| Admin dashboards | institutional admin (§7.15, Q1) | admin UI reads only IDENTITY/config; no content+identity screen exists |
| DB provider consoles (D1 console, Neon console) | operator can browse each DB | each DB alone is non-identifying (by design); joint browsing = operator threat (§4) |
| Auth provider logs | sign-in time + identity | long sessions so sign-in times do not coincide with posting; coarse content buckets |
| Email provider logs | address + send time + generic text | digest schedule (item 7) |

### Item 13 — Opaque, non-predictable identifiers (§6.2, §9, §12)

- **UUIDv4 only** for all ids that students, instructors or URLs can see. RFC 9562 §8: implementations "SHOULD NOT
  assume that UUIDs are hard to guess" and, if used for security, "UUIDv4 … SHOULD be utilized"; v4 has 122 random
  bits [F18]. Ids are never capabilities: every request is authorised (§5).
- **No UUIDv7** for anonymous content: its first 48 bits are a Unix millisecond timestamp [F18], which would hand
  any viewer an exact creation time to correlate with logs or counters. UUIDv7 is acceptable for staff-only records
  (audit) if wanted.
- **No serials / rowids** exposed or relied on: SQLite assigns "one larger than the largest ROWID" [F14], so
  insertion order is recoverable from content tables; use `WITHOUT ROWID` + UUID PK (D1 support **Unverified**,
  spike S-B1). Postgres: no `serial`/identity columns on content; note `xmin` (below, §4).
- **Pseudonyms are keyed** (`HMAC` with `K_course` held by LINKAGE), never `hash(user_id)` (§12 known issue).
- **Timestamps:** student-generated rows store a coarse bucket (granularity is PNQ-B6), not seconds.

### Item 14 — Exceptional deanonymization (§6.4)

- **Default: impossible for authorship.** No store records who wrote a question or comment, so nobody — instructor,
  TA, admin, or the operator using data at rest — can deanonymize authorship from the databases. Only timing/
  stylometry inference remains (§6).
- **Votes/follows/reports:** whoever holds `K_course` (LINKAGE: in practice the operator) plus the roster can
  recompute tags and learn who upvoted/followed/reported what. No in-app role can do this; there is no API for it.
  This is a documented limitation (§6).
- **If institutional policy later requires deanonymization:** Family B makes it possible **only prospectively** —
  an author escrow would have to be added (e.g. `author_escrow = Encrypt(K_escrow, user_id)` on new posts, with
  `K_escrow` split among approvers by threshold secret sharing). All §6.4 conditions (institutional approval,
  multiple approvers, documented reason, immutable audit, notification rules, published explanation) would apply,
  and content posted before enablement stays unlinkable. This is hard to misuse silently because it requires a
  schema change, a deploy and a published notice — but an operator who controls deploys could do it covertly
  (§4 operator row). Not designed further here (no requirement until policy exists).

### Item 15 — Retention / end of term (Q17 is open — options only)

| Option | What is destroyed | Result | Caveats |
|---|---|---|---|
| R0 keep everything | nothing | current behaviour continues | linkability by key holder persists indefinitely |
| R1 crypto-shred `K_course` once sharing is final (Q18) | wrapped per-course key row | tags and cpids become permanently unattributable; content and counts remain | D1 Time Travel keeps restorable history 7 days (Free) / 30 days (Paid) and is "always on" [F7]; Neon history 6 h (Free) / up to 7 days (Launch) [F15]. Shredding is complete only after that window **and** after any vendor-internal backups expire (**Unverified**). Worker secrets are part of Worker versions [F5]; whether a rollback restores an old secret value is not documented [F6] — so `K_root` is never rotated as a shredding mechanism; per-course keys are wrapped rows instead |
| R2 R1 + delete counters after export | DB-Participation rows for course | no residual counts | students lose their private view; conflicts with any appeal process (unknown) |
| R3 delete course content | DB-Board rows | nothing remains | institutional records needs unknown |

### Item 16 — Moderation hide/delete and participation credit (spec silent → open question)

- §7.7 lets staff "hide or delete content"; §7.9 and §7.7 say nothing about whether credit for hidden/deleted
  content is removed (only merges are covered). §3 forbids *automatically* denying credit via duplicate detection.
- **Consequence of Family B:** because no author link exists, **credit cannot be retroactively removed** for a
  deleted post without adding a link (e.g. the PNQ-B8 escrow handle, or a per-post `credit_ref` that PARTICIPATION
  could reverse). This is a design consequence the owner must see before choosing B. Flagged as **PNQ-B11**; not
  decided here.

## 4. Threat model

"Required" = protection the spec demands (§6.2, §9). "Beyond" = stronger than required; failures here become
documented limitations (§6.2, §11).

| Actor | Can learn | Cannot learn | Residual risk | Level |
|---|---|---|---|---|
| Other students | public board content, upvote totals, coarse post times | authors, voters, followers, reporters, others' counts | stylometry / self-identifying text; classroom observation of who is typing during presentation mode (§7.8) | Required |
| Instructor | content, totals, reports + reasons, shared names·levels·dates, aggregates ≥ k | any author/voter; any non-sharer's counts; dates of activity (§7.10) | differencing histogram vs shares (item 11); small classes; recognising writing style | Required |
| TA (moderation / card-edit) | same as instructor within granted permissions | same as instructor | same | Required |
| Institutional admin (in-app) | institutional config, users, enrolments | content↔identity (no screen, no API) | if the admin role is ever given DB/console access it becomes the operator row | Required |
| Operator/owner with **one** DB console | contents of that DB | linkage (each DB is non-identifying alone) | — | Beyond (partial) |
| Operator/owner with **account + deploy** access | everything going forward: can deploy a Gateway that logs identity+content, read `K_root`, roster-scan tags | past **authorship** (never stored) unless reconstructed by timing | full forward deanonymization; past votes/follows/reports via key + roster | **Not protected** → limitation |
| Hosting vendor (Cloudflare) | terminates TLS, runs the code, holds secrets and all D1 data | — | same power as operator; also legal compulsion against vendor | **Not protected** → limitation |
| DB vendor (Neon variant) | every project's data, history window | keys (if they stay in the app tier) | data dump of all projects + timing | Beyond (partial) |
| Auth provider (Q4) | sign-ins with timestamps | content | sign-in time vs post bucket correlation | Beyond |
| Email provider (Q6) | addresses + digest send times | content, which question | digest time vs answer time (weak with digests) | Beyond |
| Attacker with a dump of one DB | that domain only | linkage | DB-Board dump: content + tags (useless without key); DB-Participation: counts by cpid | Required (holds) |
| Attacker with dumps of **all** DBs, no key | everything except keyed links | who voted/followed (needs `K_root`) | authorship via timing only if buckets are fine-grained and batches small | Beyond (mostly holds) |
| Attacker with all DBs **and** `K_root` | votes/follows/reports by roster scan; counters ↔ users | authorship (not stored) | as left | Beyond (fails for votes) |
| Attacker with application/vendor logs | whatever was logged | nothing, if logging controls hold | misconfigured logging = full link (§5) | Required |
| Compromised Gateway (RCE or stolen deploy token) | every live request: identity + content | historical authorship | forward deanonymization until detected | Beyond (fails) |
| Compromised BOARD only | content, tags, signing key for receipts (can mint fake credit) | identities | fake participation credit (integrity, not privacy) | Required (privacy holds) |
| Compromised LINKAGE only | keys + roster ids | content text | can link tags if it also obtains DB-Board | Beyond |
| Legal compulsion (of owner or vendor) | what exists: authorship not stored; votes linkable with key | — | crypto-shredding (R1) shrinks this over time | Beyond |
| Collusion instructor + operator | operator's capabilities | — | same as operator row | **Not protected** |

### Side channels

| Channel | Where it exists in B | Mitigation (proposal) | Residual |
|---|---|---|---|
| Content time vs counter update | DB-Board time + DB-Participation changes | coarse buckets; random delay D; per-course batches ≥ k_batch; counters carry no timestamps | small/quiet courses: a batch may hold one student's events → T_max flush leaks; document |
| **History/time travel snapshots** | D1 Time Travel restores to "any minute" within 7/30 days, always on [F7]; Neon history 6 h / 7 days [F15] | batching means snapshot diffs show only batch-level changes | operator can diff snapshots: link at batch granularity — beyond-required |
| Insertion order (rowid / xmin / ctid) | SQLite rowid = max+1 [F14]; Postgres `xmin` system column readable by any role that can read the table (**Unverified** detail; standard Postgres behaviour) | `WITHOUT ROWID`+UUID PK; batched single-transaction writes (one `xmin` per batch); survey shuffled batches | order *between* batches remains |
| Postgres commit timestamps | `track_commit_timestamp` default `off`, set only at server start [F19] | keep off; Neon's setting **Unverified** | — |
| WAL / logical replication | Neon variant: vendor-side | out of operator scope | vendor limitation |
| Sign-in / request logs | auth provider, Cloudflare | long sessions; Gateway logs off | vendor sees requests (unavoidable) |
| Email send time | email provider | digest schedule | weak |
| Small classes | every aggregate | k thresholds (Q16); counts suppressed | k is an owner decision |
| Stylometry / self-identifying content | content text | UI guidance only (copy is owner's) | cannot be engineered away |
| Presentation mode / classroom observation | room | §7.8 exclusions; no live "new question by…" indicators | physical observation of a screen |
| Receipt/queue metadata | queue messages hold cpid + action (no item id) | short retention (24 h fixed on Free [F2]) | vendor sees queue contents |

## 5. Failure modes

| # | Failure | Effect | Detection | Mitigation (proposal) |
|---|---|---|---|---|
| F-1 | A second Worker is given a binding to DB-Board *and* DB-Identity (copy-paste in `wrangler` config) | one service can now join domains | CI "binding matrix" test: parse every config, assert each DB binding appears in exactly one Worker and the allowed service-binding edges match a checked-in matrix | config review checklist; deploy only from CI |
| F-2 | New service binding to LINKAGE from BOARD | BOARD could request tags for arbitrary users | same matrix test; declaring a binding is what grants call permission [F4] | LINKAGE methods also check a caller token (defence in depth) |
| F-3 | Logging re-enabled (new Worker gets observability by default [F8]) | request URLs/bodies/user ids in Workers Logs | CI asserts `observability` settings per Worker; periodic query of Workers Logs for user-id patterns | logger allow-list; no raw `console.*` |
| F-4 | Code bug writes `user_id` into a BOARD call (e.g. "author" field added for a feature) | authorship stored | schema scan test (no identity-like columns in DB-Board); API contract test (BOARD RPC types have no user fields) | typed RPC interfaces; ADR required for any new field crossing a boundary |
| F-5 | `K_root` leaked (secret printed, copied to `.dev.vars` in git) | tags/cpids linkable for all courses | secret scanning in CI | rotate `K_root` by re-wrapping per-course keys (keys unchanged, so leak of *old* root + old wrapped rows still works ⇒ also rotate per-course keys, re-tagging requires roster scan per item: expensive) |
| F-6 | Per-course key lost (row deleted by accident) | merges cannot de-dup; "you upvoted" breaks; counters orphaned | health check: every active course has an active key | Time Travel restore [F7] — which is exactly why shredding is not instant |
| F-7 | Duplicate crediting (queue redelivery) | inflated counts | `processed_events` PK conflict | idempotent consumer, ack after commit [F12][F13] |
| F-8 | Lost credit (Gateway dies between BOARD commit and queue send) | student misses a credit | client sees no "credit queued" ack; reconciliation impossible by design (no link) | browser retries `POST /credit {receipt}` within receipt expiry; receipts are single-use via `processed_events` |
| F-9 | Fake credit (malicious client replays receipts; compromised BOARD mints receipts) | integrity of levels | receipt signature + expiry + event_id de-dup | cannot detect a compromised BOARD minting valid receipts — integrity limitation |
| F-10 | Queue retention exceeded (Free: fixed 24 h [F2]) with delay + backlog | events dropped | dead-letter queue / alert | keep D + T_max ≪ 24 h on Free |
| F-11 | Backup/Time Travel restore of one DB only | DB-Participation rolled back but DB-Board not ⇒ counts lower than content; or vice versa | restore runbook requires all-DB restore to the same minute | document that counters cannot be rebuilt from content (no link) — a restore loses credit since the restore point |
| F-12 | Schema migration on one DB out of sync with services | RPC errors | contract tests per service | each service owns its migrations; versioned RPC methods |
| F-13 | Vendor dashboards (D1 console, Neon console) used for "quick debugging" with both DBs open | operator sees both side by side | none technical | operator runbook; separate Cloudflare API tokens per DB for scripts (fine-grained token scoping **Unverified**) |
| F-14 | Small batch flush (T_max) in a quiet course | timing link of one student | metric: batches flushed with < k_batch events | longer T_max (more UX lag) or accept and document |
| F-15 | Free daily request limit hit (100k/day [F3]) | outage | Cloudflare analytics | route fail mode: **fail closed** for security-critical Workers [F3] — fail open would bypass the Gateway |
| F-16 | Merge recomputation exceeds Free CPU (10 ms [F3]) | merge fails mid-way | error | two-phase merge (compute, then commit); Paid plan |

## 6. Limitations of anonymity to document (§6.2, §11)

Plain-language list for the user-facing explanation (wording is the owner's; this is content, not copy):

1. **Your writing can identify you.** Mentioning your name, situation or a recognisable style can reveal you.
2. **Small classes reduce anonymity.** Fewer participants make timing and counting inferences easier; some numbers
   are hidden below a minimum size (Q16).
3. **Who wrote a question is never stored.** Not even the system operator can look it up in the database.
4. **Upvotes, follows and reports are stored in a protected, coded form.** Instructors, TAs and administrators
   cannot decode them. The system operator, who holds the decoding key, technically could; the app provides no way
   to do this. (If crypto-shredding R1 is chosen: after the end of term the key is destroyed.)
5. **The service operator and hosting providers run the system.** Someone with full control of the hosting account
   could change the software to record future activity. This design protects against instructors, TAs, admins, logs
   and exports, not against a malicious operator or host.
6. **Participation counts update with a delay** on purpose, so that a counter change cannot be matched to a post.
7. **Sharing reveals your name and level only** (verbatim §7.10 text applies) — but if almost everyone shares, the
   level of the few who do not may be inferable from class totals (item 11).
8. **Emails never contain question text**, but your email provider sees that ClearCourse AI emailed you and when.
9. **Presentation mode** shows questions in a classroom; people around you may see what you type on your own device.

## 7. Testability (negative tests, §9)

§9 requires negative tests proving instructors and TAs **cannot** retrieve authors via UI, API, exports, logs or
predictable identifiers; §10 asks for a test per acceptance criterion. Family B makes several of these **structural**
(checkable by static analysis of configs and schemas), which is its main testing advantage.

| Level | Negative test (proposal) | Proves |
|---|---|---|
| Config | Binding-matrix test: each DB binding appears in exactly one Worker; service-binding edges ⊆ allowed matrix; LINKAGE secret present only in LINKAGE | §6.1 separation, restricted service roles (§6.2) |
| Config | Observability test: every identity-side Worker has invocation logs off / sampling 0 | §3 logs rule |
| DB schema | Schema scan: DB-Board, DB-Participation, DB-Survey have no column named/typed like user_id, email, name, cpid (Board), question_id (Participation) | no joinable column exists |
| DB | Try `ATTACH` / cross-database reference from each binding → must fail (**Unverified** D1 behaviour; expected failure) | ordinary queries cannot join |
| DB | Snapshot-diff test: post as student A in a seeded course with ≥ k_batch other students; diff DB-Participation before/after each batch; assert no single-cpid change attributable to A's post time | timing decorrelation works as configured |
| DB | Order test: insert N survey responses; assert `responses` has no rowid and returned order ≠ insertion order (statistically) | no insertion-order leak |
| API | As instructor/TA with all permissions, call every endpoint (generated from the route table) and assert no response contains any student `user_id`, name, email, cpid or tag | API cannot reveal authors |
| API | BOARD RPC type test: no method accepts or returns user ids | narrow internal API |
| API | Upvote twice → one row, one receipt, one credit; upvote A and B, merge → B total counts the student once | §7.7 de-dup |
| API | Replay a receipt → no second credit; forged receipt → rejected; level share with forged attestation → rejected | exactly-once, verified level (§7.10) |
| API | Threshold change raising any value after participation started → rejected; earlier version still readable | §7.9 |
| API | Share → revoke allowed; export → revoke rejected; instructor list shows exactly name·level·date | §7.10 |
| UI | E2E (instructor and TA sessions): moderation queue, merged question, presentation mode, analytics — DOM contains no student names/emails; presentation mode shows none of the §7.8 exclusions | UI cannot reveal authors |
| Export | Grade export contains only name, level, date shared (+ format fields from Q12); no other export endpoint exists | exports |
| Logs | Integration run with logging *forced on* in a test environment, then scan collected logs: no record contains both an identity value and any content text | logs rule (§3) |
| Logs | Email capture (test SMTP sink): no email body/subject contains question text or question ids | email channel (§3) |
| Identifiers | All ids exposed to clients parse as UUID version 4; none sortable by time; no integer ids in any response | predictable identifiers (§9) |
| Identifiers | Hashing every roster user id with SHA-256 (unkeyed) and comparing with all stored tags/cpids yields zero matches | keyed pseudonyms (§12 known issue) |
| Aggregates | Course with k_agg − 1 students in a level → cell suppressed; single-non-sharer differencing scenario → suppressed per chosen DF option | §7.16, Q16 |
| Survey | Survey submission triggers no queue credit message; DB-Survey rows hold no metadata columns | §7.12 |

Spikes that must run before an ADR (each one session): **S-B1** D1 `WITHOUT ROWID` + `ATTACH` behaviour;
**S-B2** HMAC throughput vs Free 10 ms CPU; **S-B3** whether Workers traces/logs correlate requests across service
bindings; **S-B4** end-to-end latency of 3–4 chained service-binding calls + D1 (the docs claim "zero overhead" for
bindings [F4], D1 latency itself is not measured here).

## 8. Platform requirements and portability

### 8.1 What any platform must provide

1. ≥ 7–8 independently credentialed databases (5 domains + linkage + audit + ops), no cross-DB joins by default.
2. Several deployable units with **separate secrets** and private service-to-service calls.
3. A durable queue with delayed delivery (or a cron + table that emulates it).
4. Web Crypto (HMAC-SHA-256, HKDF, AES-GCM, Ed25519) and a CSPRNG.
5. Per-unit control over request logging.

### 8.2 Mapping (a) — Cloudflare Workers + one D1 database per domain

| Need | Cloudflare feature | Verified fact |
|---|---|---|
| Separate DBs | D1, one per store (8) | Free: **10 databases per account**, 500 MB each, 5 GB per account, 50 queries per invocation; Paid: 50,000 DBs, 10 GB each [F1] |
| DB pricing | D1 | Free: 5 M rows read/day, 100 k rows written/day, 5 GB; Paid: 25 B reads/month, 50 M writes/month included [F2] |
| Separate services | 8–9 Workers | Free: 100 Workers per account; Paid: 500 [F3] |
| Private calls | Service bindings (RPC) | no public URL needed; "zero overhead"; declaring the binding grants permission to call public methods; max 32 Worker invocations per request; on Standard pricing no extra request fees [F4][F2] |
| Secrets | Worker secrets | encrypted, hidden after set, per Worker, part of Worker versions [F5]; 64 env vars/secrets per Worker on Free [F3] |
| Queue with delay | Queues | available on Free (10,000 ops/day, fixed 24 h retention); ~3 ops per message; delay up to 24 h; at-least-once [F2][F11][F13] |
| Cron | Cron Triggers | 5 per account on Free, 250 Paid [F3] |
| CPU | Workers | **Free 10 ms CPU per invocation**; Paid up to 5 min [F2][F3] |
| Requests | Workers | Free 100,000/day; over limit → error 1027, fail open or fail closed per route [F3] |
| Logs | Workers Logs | on by default; can disable invocation logs; Free 200k events/day, 3-day retention [F2][F8] |
| Backups | D1 Time Travel | always on; 7 days Free / 30 days Paid; in-place destructive restore [F7] |
| Region | D1 location hints | `wnam`, `enam`, … jurisdictions `eu`, `fedramp`, `us`; **no Canada option**; read replicas in every region unless a jurisdiction is set [F17] |

**Fit for the owner's constraints.** The 8 stores fit within Free's 10-database cap for **one** environment only; a
staging copy would need another 8 (exceeds 10) — use local `wrangler dev` D1 for development, or Paid. Free's 10 ms
CPU per invocation is the main risk (merge roster scan, inbox compute-on-read, Ed25519 signing in hot paths) — spike
S-B2. Workers Paid is **$5/month minimum** [F2], which is *at*, not under, the owner's "<$5/month" target.
Cost estimate for a prototype (**proposal; usage unknown — no user counts given**): $0 on Free if CPU fits; $5 on Paid.

### 8.3 Mapping (b) — Separate Postgres projects (Neon) behind separate server code paths

| Need | Neon feature | Verified fact |
|---|---|---|
| Separate DBs | one Neon **project** per store (8) | Free: 100 projects; 1 GB storage/project (20 GB account); 100 CU-hours/project/month; scale-to-zero after 5 min (cannot disable on Free) [F15] |
| History | point-in-time history | Free: 6 h (1 GB limit); Launch: up to 7 days [F15] |
| Price | Free $0; Launch pay-as-you-go (e.g. $0.106/CU-hour, $0.35/GB-month) [F15] | |
| Region | AWS US/EU/AP/SA regions; **no Canada**; region cannot be changed after creation [F16] | |
| Commit timestamps | Postgres default `track_commit_timestamp = off` (PG 18 docs) [F19]; Neon's value **Unverified** | |

App tier options for (b):

| Option | Separation strength | Notes |
|---|---|---|
| b1 Workers per service + Hyperdrive per project | strong (separate secrets, separate deploys) | Hyperdrive available on Free with 100k queries/day [F2]; per-account Hyperdrive config limits **Unverified** |
| b2 Separate serverless projects per service on another host (e.g. Vercel) | strong | project/env-var limits **Unverified** here; see sibling `stack-H1H2-vercel.md` |
| b3 One app process, separate modules, each reading only its own connection string | **weak**: one process holds all credentials; an RCE or a careless import gets all | still prevents SQL joins (separate projects), so it satisfies "ordinary queries cannot join"; does not satisfy "restricted service roles" as strongly |

Neon-specific cautions: 8 projects that each scale to zero means a request touching 3–4 stores may hit several
cold computes (cold-start latency **Unverified** — spike). Postgres extensions such as `postgres_fdw`/`dblink` would
re-enable cross-database joins if installed — CI must assert they are absent (Neon support for them **Unverified**).
Within each project, Postgres roles/RLS (family A) can be layered on as defence in depth.

### 8.4 Does it paint production into a corner? (§10–§11)

- **Portable core:** the RPC contracts (BOARD, LINKAGE, PARTICIPATION, SHARED, SURVEY, IDENTITY) and the key scheme
  are platform-neutral. They map to containers + private network + KMS + SQS-style queue on any cloud, or to UW
  infrastructure.
- **Lock-in points:** service bindings, Queues, Workers secrets, D1's SQLite dialect. Mapping (b) avoids the SQL
  dialect lock-in (Postgres everywhere). A D1 → Postgres move is a per-store port (8 small schemas), not a redesign.
- **Data residency:** neither D1 nor Neon offers a Canadian location [F16][F17]. Whether UW requires Canadian
  residency for production is not in the spec — **PNQ-B12** (likely shared with other branches). If yes, both
  mappings are prototype-only and production moves stores — family B's per-store design makes that move mechanical
  but larger (8 migrations instead of 1).
- **Production SSO/LTI (§10, Q4, Q5):** live in IDENTITY; nothing in B constrains them.
- **Deanonymization (§6.4):** B leaves room for a prospective, audited escrow (item 14) without restructuring.
- **Risk of the opposite corner:** the strong no-author-link property means features that need authorship later
  (edit/delete own post, "my questions" list, credit removal on delete, author throttling) each require an explicit
  escrow/link decision. None is in the spec today; each would be an ADR.

## 9. Build complexity and maintenance risk

Rough estimate (**proposal; model judgement, not measured**), counting one "session" as a focused Claude Code
session that ends with passing tests:

| Work package | Sessions |
|---|---|
| Spikes S-B1…S-B4 (D1 rowid/ATTACH, CPU, log correlation, latency) | 3–4 |
| Monorepo layout for 8–9 Workers, shared typed RPC contracts, per-Worker configs, binding-matrix CI test | 3–4 |
| IDENTITY + Gateway session/authZ (excl. SSO choice, Q4) | 3–4 |
| LINKAGE (key wrap, HKDF sub-keys, tag/cpid APIs, roster scan) | 2–3 |
| BOARD (questions, comments, answers, tags, receipts, moderation, merge, redirects) | 5–7 |
| Credit pipeline (queue, delay, batching, idempotent consumer, retry receipts) | 3–4 |
| PARTICIPATION (counters, thresholds/versioning, attestation) + SHARED (share/revoke/export) | 3–4 |
| SURVEY (staging/batches, eligibility option) | 2 |
| Notifications (compute-on-read inbox, sweep, content-free email) | 2–3 |
| Negative-test suite (§7 table) + log/email sinks | 3–4 |
| **Total for the privacy-relevant core** | **≈ 29–39 sessions** |

Compare: a single-database design with schemas/RLS (family A) avoids the queue, receipts, RPC contracts and
multi-DB migrations; my unmeasured guess is that it needs roughly half of the integration work above.

**Maintenance risks (candid):**

- **Distributed-system bugs** (partial failure, retries, ordering) for one person to debug — with request logging
  deliberately *off* on the services where bugs matter most. Debugging without logs is the biggest day-to-day cost.
- **Eight migrations streams** and eight backups/restore points that must be kept consistent (F-11).
- **Eventual consistency in UX:** counts and "level reached" lag; staff will report "credit missing" bugs that are
  actually the delay.
- **Configuration drift** is the main privacy risk (F-1…F-3); the CI binding-matrix and observability tests are
  mandatory, not optional.
- **Platform-specific knowledge:** service bindings, Queues and D1 are well documented [F4][F11][F12] but less
  mainstream than Postgres; the Neon mapping (b) is more mainstream at the SQL layer but adds cold-start and
  connection concerns.
- **"B-lite" fallback (proposal):** merge PARTICIPATION + LINKAGE into one "Vault" Worker and IDENTITY + SHARED +
  NOTIFY into the Gateway, keeping BOARD and SURVEY separate. Five domain DBs remain separate, Workers drop to 4,
  sessions drop by ~25 % (guess). The cost: the Vault holds both the key and the counters, and the Gateway holds
  identity *and* shared results in one credential set — still compliant with §6.1 (stores separate) but weaker on
  "restricted service roles".

## 10. Open questions it depends on, and proposed new ones

**Existing §13 questions this design depends on:**

| Q | Why it matters to B |
|---|---|
| Q3 | platform (a) vs (b) vs another; B-full vs B-lite |
| Q4 | where the identity session originates; auth-provider log exposure |
| Q6 | email provider for content-free digests |
| Q8 | where this threat model lives |
| Q9 | this note is one candidate answer |
| Q13 | which notifications are essential (digest opt-out) |
| Q14 | what the audit store records and keeps |
| Q16 | k for aggregates and survey reveal; also proposed k_batch for crediting |
| Q17 | crypto-shredding options R0–R3 |
| Q18 | when sharing becomes final ⇒ when shredding could run; differencing option DF1/DF3 |
| Q20 | rate-limit values; whether author-throttling (PNQ-B8) is wanted |

**Proposed new open questions (for the owner; none decided here):**

| # | Question |
|---|---|
| PNQ-B1 | Is a deliberate delay in participation counts and "level reached" acceptable, how long (D, T_max), and what explanatory copy should students see? |
| PNQ-B2 | Can a student remove an upvote? If so, does it remove "upvotes given" credit? After a merge, does a student who upvoted both questions keep two upvote credits or one? |
| PNQ-B3 | When merging, are answers on the merged-away question kept, and when is preserving a comment "not reasonable" (§7.7)? |
| PNQ-B4 | Is "Still unclear" one mark per student per answer, and who sees the count? |
| PNQ-B5 | When does "participation begins" happen for threshold locking (§7.9): first qualifying action, or publication of the participation policy? |
| PNQ-B6 | What timestamp precision may the board show for posts ("most recent" sort, displayed dates)? Coarser is more private. |
| PNQ-B7 | Who receives "Answer posted" and "Question merged" (author, followers, upvoters, all students)? Does an author auto-follow their own question (weakens authorship protection against the key holder)? |
| PNQ-B8 | Should moderators be able to throttle "the author of this post" without learning identity (requires an escrowed author handle)? |
| PNQ-B9 | Must the exit survey prevent duplicate submissions, and which option (S1–S4) is acceptable? |
| PNQ-B10 | How often may level-count aggregates refresh, and which differencing protection (DF1–DF4) applies once sharing opens? |
| PNQ-B11 | Does hiding or deleting content remove the participation credit it earned? (In family B this needs a link that does not otherwise exist.) |
| PNQ-B12 | Does production require Canadian data residency? (Neither D1 nor Neon offers a Canadian location.) |
| PNQ-B13 | Is protection against the platform operator (owner) and hosting vendors a goal, or only the spec's required actors? This decides whether B's extra complexity buys anything the owner values. |

## Appendix A. Verified facts (URL, checked date)

All fetched with WebFetch on 2026-10-11; the summary states what the page said on that date.

| Ref | Fact relied on | URL |
|---|---|---|
| F1 | D1: Free 10 DBs/account, 500 MB/DB, 5 GB/account, Time Travel 7 days, 50 queries/invocation; Paid 50,000 DBs, 10 GB/DB, 1 TB/account, 30 days, 1,000 queries; ~5,000 bindings per Worker script | https://developers.cloudflare.com/d1/platform/limits/ (checked 2026-10-11) |
| F2 | Workers Paid minimum $5/month; Free 100k req/day, 10 ms CPU; service bindings no extra request fees on Standard; Workers Logs Free 200k events/day, 3 days; D1 Free 5 M reads/day, 100k writes/day, 5 GB; Queues on Free 10,000 ops/day, fixed 24 h retention, ~3 ops/message; Durable Objects Free SQLite-only; Hyperdrive Free 100k queries/day; KV Free 1,000 writes/day | https://developers.cloudflare.com/workers/platform/pricing/ (checked 2026-10-11) |
| F3 | Workers Free: 100 Workers/account, 50 subrequests, 10 ms CPU, 5 Cron Triggers, 64 env vars+secrets per Worker; 100k req/day → error 1027, fail open/closed per route | https://developers.cloudflare.com/workers/platform/limits/ (checked 2026-10-11) |
| F4 | Service bindings: call without a public URL; RPC recommended; "zero overhead"; max 32 Worker invocations per request; declaring a binding grants permission to call public methods; Access context not propagated | https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/ (checked 2026-10-11) |
| F5 | Secrets: encrypted, hidden after set, per Worker; `secret put` creates and deploys a new version; Secrets Store (beta) for account-level secrets | https://developers.cloudflare.com/workers/configuration/secrets/ (checked 2026-10-11) |
| F6 | Rollbacks: resources not changed; 100 most recent versions; page does not say what happens to secrets | https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/ (checked 2026-10-11) |
| F7 | D1 Time Travel: "always on", any minute within 30 days (Paid) / 7 days (Free), restore destructive in place, no clone yet | https://developers.cloudflare.com/d1/reference/time-travel/ (checked 2026-10-11) |
| F8 | Workers Logs: on by default for new Workers; invocation logs include request method/URL + metadata, console output; `invocation_logs = false`; `head_sampling_rate` 0–1 | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ (checked 2026-10-11) |
| F9 | Web Crypto in Workers: HMAC, SHA-256, AES-GCM, HKDF, Ed25519; `randomUUID()` returns version 4 | https://developers.cloudflare.com/workers/runtime-apis/web-crypto/ (checked 2026-10-11) |
| F10 | Rate Limiting binding: any string key; period 10 or 60 s; per-location; eventually consistent; plan availability and price not stated | https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ (checked 2026-10-11) |
| F11 | Queues: `delaySeconds`, max delay 24 h; batch size ≤ 100, timeout ≤ 60 s; retries default 3 | https://developers.cloudflare.com/queues/configuration/batching-retries/ (checked 2026-10-11) |
| F12 | D1 `batch()`: "Batched statements are SQL transactions"; failure rolls back the whole sequence; auto-commit otherwise | https://developers.cloudflare.com/d1/worker-api/d1-database/ (checked 2026-10-11) |
| F13 | Queues at-least-once; duplicates possible; use a unique id as idempotency key | https://developers.cloudflare.com/queues/reference/delivery-guarantees/ (checked 2026-10-11) |
| F14 | SQLite rowid: new rowid usually one larger than the largest; `WITHOUT ROWID` tables are the exception | https://www.sqlite.org/autoinc.html (checked 2026-10-11) |
| F15 | Neon Free: 100 projects, 1 GB/project, 20 GB total, 100 CU-hours/project, scale-to-zero 5 min (always on), history 6 h; Launch: history up to 7 days, $0.106/CU-hour, $0.35/GB-month | https://neon.com/pricing (checked 2026-10-11) |
| F16 | Neon regions: 8 AWS regions (US, EU, AP, SA), Azure deprecated, no Canada; region cannot be changed | https://neon.com/docs/introduction/regions (checked 2026-10-11) |
| F17 | D1 data location: hints wnam/enam/weur/eeur/apac/oc; jurisdictions eu/fedramp/us; no Canada; replicas in every region unless jurisdiction set | https://developers.cloudflare.com/d1/configuration/data-location/ (checked 2026-10-11) |
| F18 | RFC 9562 §8: don't assume UUIDs are hard to guess; use UUIDv4 for security contexts; §5.4 122 random bits; §5.7 UUIDv7 48-bit Unix ms timestamp | https://www.rfc-editor.org/rfc/rfc9562.html (checked 2026-10-11) |
| F19 | PostgreSQL 18 docs: `track_commit_timestamp` default `off`, set at server start | https://www.postgresql.org/docs/current/runtime-config-replication.html (checked 2026-10-11) |

## Appendix B. Unverified items (do not rely on without checking)

- D1 support for `WITHOUT ROWID` tables and behaviour of `ATTACH` (spike S-B1).
- Whether ~1,000 Web Crypto HMACs or an Ed25519 signature fit within the Free 10 ms CPU limit (spike S-B2).
- Whether Workers traces/logs propagate a shared request id across service bindings (spike S-B3).
- Whether a Worker rollback restores a previous secret value (F6 is silent).
- Whether service-binding calls count against the Free plan's 100k requests/day (F2 states the Standard-pricing rule only).
- Rate Limiting binding availability on the Free plan (F10 silent).
- Cloudflare/Neon vendor-internal backup retention beyond Time Travel/history windows (affects crypto-shredding).
- Neon: `track_commit_timestamp` setting; availability of `postgres_fdw`/`dblink`; cold-start latency; multiple
  databases/roles per project (pricing page silent).
- Cloudflare API-token scoping fine enough to restrict scripts to one D1 database.
- Postgres `xmin` visibility to ordinary roles and its preservation through VACUUM/freeze (standard behaviour per
  model knowledge; not fetched).
- Vercel project/env-var limits (mapping b2) — see sibling note `stack-H1H2-vercel.md`.
- Session-count estimates in §9 are model judgement.
