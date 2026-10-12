# Privacy design candidate C — Cryptographic / user-held unlinkability ("even the server cannot link")

> Research and planning notes only. Not a requirement, not a decision. Everything labelled
> **Proposal** is a suggestion for the owner. Requirements are cited to `CONTRIBUTING.md` (§N.N).
> Checked date for all external sources: 2026-10-11. Items not verified against an official source
> are labelled **Unverified**. Q-numbers refer to CONTRIBUTING §13; new questions are labelled NQ-C*n*.

## 0. Scope and conventions

**What this family claims.** Families A and B rely on the server *declining* to join identity and
anonymous content: it holds a key or a mapping, and access control keeps ordinary queries and
staff away from it. Family C tries to make the join *impossible for the server itself*: the
linking secret lives only in the student's browser, and the server only ever sees blindly
signed tokens or pseudonyms that it cannot tie back to the sign-in that obtained them.

**What the spec actually requires.** §6.2 and §9 require protection against ordinary application
queries, instructors, TAs, admins (§5), logs, exports and predictable identifiers. They do not
require protection against the platform operator or the hosting vendors. Anything Family C adds
against those actors goes beyond the spec. It is worth paying for only if it is cheap, or if the
institution or the owner later asks for it.

**Short verdict.** I analysed four variants seriously (§1.2). Only one is buildable by a solo
developer with mainstream libraries: **C1, a blind-signed per-course pseudonym**. C1 still
conflicts with targeted e-mail notifications (§7.13), the exceptional-deanonymization option
(§6.4) and device-loss recovery. In a web app its "even the server cannot" guarantee holds only
against a *passive* operator, because the server ships the JavaScript that holds the secret (§4).
The more ambitious variants (per-action unlinkability through nullifiers or anonymous
credentials) either break exact de-duplication across merges (§7.7) or depend on IRTF drafts and
research-grade code (§8, §9).

**Proposal (for the owner):** for the prototype, do not adopt Family C as the core mechanism. Adopt
a **hybrid** instead (§1.3, H1):
- Use server-side per-course pseudonyms (Family A or B).
- Use a data model that is **pseudonym-keyed and identity-free**, so that C1 can replace the
  pseudonym source later without a schema change.
- Use **one** Family C technique where it is cheap and clearly better: blind-signed one-time
  tokens for the exit survey (§7.12).

Nothing here closes Q9; it only informs it.

## 1. Mechanism summary

### 1.1 The primitives considered (all verified, see Verification log)

| Primitive | Standard status (checked 2026-10-11) | What it gives here |
|---|---|---|
| RSA blind signatures | RFC 9474, Informational, IRTF CFRG, Oct 2023 | Server signs a message it cannot see. Signatures are publicly verifiable. "Blindness": the server cannot link the signing session to the later signature. |
| VOPRF / OPRF | RFC 9497, Informational, IRTF CFRG, Dec 2023 | Server evaluates F(k, x) without learning x. Output is deterministic per (key, input). |
| Privacy Pass | RFC 9576 (architecture, Informational), RFC 9577 (HTTP auth scheme, Proposed Standard), RFC 9578 (issuance, Proposed Standard), June 2024 | Standard packaging of blind RSA (type 0x0002, publicly verifiable) and VOPRF (type 0x0001, privately verifiable) tokens, plus double-spend checking at redemption |
| BBS signatures / anonymous credentials | draft-irtf-cfrg-bbs-signatures-12 (2026-09-28), "Active RG Document", **not an RFC**. Blind BBS and per-verifier-linkability (pseudonym) drafts are both at -03 (June 2026), also Active RG documents. | Multi-attribute credentials with selective disclosure. The pseudonyms draft provides a deterministic per-context pseudonym from a hidden secret. |
| Semaphore (v4) | Not a standards-track document. Open-source ZK protocol from PSE (Ethereum Foundation-supported). Audited (v4.0.0 by PSE). Trusted setup completed 13 July 2024. | Proof of group membership plus a **nullifier** that is deterministic per (identity, scope), giving one signal per scope |
| WebAuthn PRF extension | In the W3C WebAuthn spec. Browser support is mixed (see §8.3). | A per-credential pseudorandom function in the authenticator. It can deterministically derive a per-course secret on any device the passkey syncs to. |
| Oblivious HTTP | RFC 9458, Standards Track, Jan 2024 | Hides the client's IP from the server. Requires a relay **operated by a different entity** (non-collusion). |

### 1.2 Variants

- **C1: Blind-signed per-course pseudonym (the realistic one).**
  1. When a student enrols in course c, the browser derives a secret `s_c`.
  2. It computes a public pseudonym key `P_c = pk(s_c)`, for example an Ed25519 or ECDSA public key
     derived from `s_c`.
  3. It obtains from the Identity domain **exactly one** blind RSA signature over `P_c`, using the
     per-course-term key `K_issue[c,term]`. The request is authenticated by the SSO session, and the
     check is that the user is enrolled in c and has not yet been issued a pseudonym for c this term.
  4. Later, on a *separate*, cookie-less board origin, the browser registers `(P_c, σ)`. The board
     verifies σ and from then on authenticates the student by signatures under `s_c`.
  5. All content, upvotes and counters are keyed by `P_c`.
  6. The Identity domain knows "Alice got one signature for c". The Board knows "P_c is a valid
     member of c". Blindness (RFC 9474) means no stored value joins them.
- **C2: Per-question nullifiers (Semaphore-style).** Each upvote carries
  `n = PRF(s, question_id)` plus a membership proof. The server sees no per-student pseudonym at
  all. **This breaks merges** (§3, item 3).
- **C3: Anonymous credentials with client-held counters.**
  1. The enrolment credential is a blind BBS credential with a hidden secret.
  2. Each qualifying action earns a blind "credit token" bound to that hidden secret.
  3. At sharing time, a ZK proof shows "these k tokens and my enrolment credential share a secret"
     and discloses only name and level.
  - This is the theoretically strongest option. It needs blind BBS plus cross-credential equality
    proofs, which exist only in drafts (§8). Not buildable for this project.
- **C4: Hybrid H1.** Server-derived pseudonym now (Family A/B key `K_c`), with C1 as the planned
  upgrade path (§1.3).

### 1.3 Text diagram (C1)

```
 Browser (student)                       Identity domain (SSO session)        Board origin (no identity cookie)
 ----------------                        -----------------------------        ---------------------------------
 s_c := PRF_passkey("cc:"+course)  ──or── random s_c, wrapped & backed up (2.4)
 P_c := pk(s_c); r random
 m  := Blind(P_c, r)  ───── m ──────────►  check enrolled(c) & not issued(c,term)
                                          σ' := BlindSign(K_issue[c,term], m)
                      ◄──── σ' ──────────  record issued(user,c,term)=true   (NO m, NO σ')
 σ := Finalize(σ', r)
   ...random delay / next visit...
 (P_c, σ) ──────────────────────────────────────────────────────────────────► verify σ with pk_issue[c,term]
                                                                              store member(P_c)  (no user id)
 sign(s_c, action)  ────────────────────────────────────────────────────────► content / upvote / counter[P_c]
 level request (end of term) ───────────────────────────────────────────────► compute level(P_c) under
                                                                              threshold version; BlindSign under
                                                                              K_level[c,term,L]; mark P_c "level issued"
                    ◄───────────────────────────────────────────────────────── σ_L'
 share(name via SSO session, token_L) ─► Identity/Shared domain: verify token_L, spend-once,
                                          store {name, level L, date}  (§7.10)
```

**What breaks the anonymity even here (detailed in §4):**
- the server-shipped JavaScript;
- IP and timing correlation between the two origins;
- pseudonym-level activity profiles combined with stylometry.

## 2. Data model sketch

These sketches are illustrative only and are not code. They are written for C1, with notes for H1.
Every primary key for anonymous objects is a random 128-bit-or-larger identifier (§6.2, §9).

### 2.1 The five §6.1 domains

**Domain 3: Identity and enrolment** (Identity store; SSO-authenticated API only)
```
users(user_id uuid, name, email, institution_ref, ...)
enrolments(user_id, course_id, role, term)
pseudonym_issuance(user_id, course_id, term, issued_at_day date, reissue_count int)
     -- records THAT a blind signature was issued, never m, σ', σ or P_c
     -- issued_at_day is coarsened to a day to reduce timing correlation (Proposal)
survey_token_issuance(user_id, course_id, term, issued bool)       -- §7.12
issuer_keys(course_id, term, purpose{pseudonym|survey|level:L}, public_key, private_key_ref)
     -- private keys in a secrets store / KMS, never in DB rows (Proposal)
```

**Domain 1: Anonymous discussion content** (Board store; Board API only)
```
members(course_id, pseudonym_pk bytea, sig bytea, registered_on_day date, banned bool)
questions(question_id rand, course_id, author_pseudonym, tag{course|assignment}, assignment_id?,
          body, created_at, state, merged_into?)
comments(comment_id rand, question_id, author_pseudonym, body, created_at, state)
upvotes(question_id, voter_pseudonym, PRIMARY KEY(question_id, voter_pseudonym))
follows(question_id, pseudonym)              -- not credited (§7.9)
unclear_marks(answer_id, pseudonym)          -- not credited
reports(report_id rand, target_id, reporter_pseudonym, reason, created_at)
question_redirects(old_question_id, new_question_id)               -- §7.7 redirects
moderation_log(log_id rand, action, target_ids, actor_staff_id, at, counts_before_after)
     -- never pseudonyms or student identities (§7.7 "without exposing identities")
```
- `author_pseudonym` is never returned by any staff-facing API. The client receives `is_mine` booleans
  only after signing a challenge with `s_c`.
- **Proposal:** consider a *second* pseudonym separation. Keep `author_pseudonym` in a narrow side
  table (`authorship(content_id, pseudonym)`) that only the counter and notification code paths read,
  so that a content dump does not even reveal pseudonymous co-authorship. This is the Family A/B
  technique applied *on top of* C1.

**Domain 2: Private per-student participation counters** (Participation store)
```
counters(course_id, pseudonym, questions int, comments int, upvotes_given int,
         threshold_version_at_first_participation int, level_token_issued bool)
```
These rows are keyed by the pseudonym, not by `user_id`. Under C1 there is no server-side function
from `user_id` to `pseudonym`.

**Domain 4: Instructor-visible shared results** (Shared store)
```
shares(share_id rand, course_id, user_id, level, shared_on date, state{active|revoked|final},
       level_token_hash bytea UNIQUE)      -- spend-once, prevents re-use by another identity
finalisations(course_id, finalised_at, by_staff_id)   -- export/apply makes shares final (§7.10)
```

**Domain 5: Anonymous exit-survey responses** (Survey store)
```
survey_tokens_spent(course_id, token_hash UNIQUE)     -- double-submission prevention
survey_responses(response_id rand, course_id, q1 text, q2 text, q3 text)  -- no timestamp column,
     -- or day-coarsened only if needed (§7.12 "no unnecessary metadata")
```

### 2.2 Key material

| Key | Holder | Purpose | Shredding |
|---|---|---|---|
| `s_c` | Student browser / authenticator only | Pseudonym signing key | Never on the server in plaintext |
| `K_issue[c,term]` (RSA) | Identity domain signer | Blindly certify one pseudonym per enrolled student | Destroy after the term's registration closes (stops new Sybils, Proposal) |
| `K_level[c,term,L]` for L ∈ {No Record, Contributor, Sustained Contributor} (§7.9) | Participation domain signer | Blind level tokens | Destroy after the sharing window closes |
| `K_survey[c,term]` | Identity domain signer | One survey token per student | Destroy after the survey closes |
| Under H1: `K_c` (HMAC) | Narrow pseudonym service (Family A/B) | `P = HMAC(K_c, user_id)` | Crypto-shred at end of term (§3, item 15) |

**Why a separate RSA key per level.** RFC 9474 itself has no public metadata, and the
partially blind variant (draft-amjad-cfrg-partially-blind-rsa) is a draft, so a separate key is the
mainstream way to encode the level. Key IDs also act as metadata that partitions the anonymity set
(RFC 9576 anonymity-set discussion). That is acceptable here because the partition is the level
itself, which is exactly what the student chooses to disclose.

### 2.3 What is deliberately NOT stored

- No `user_id` in any Domain 1, 2 or 5 table, and no pseudonym in Domains 3, 4 or 5.
- No blinded message, blind signature or finalised signature in the Identity domain. Issuance is
  recorded as a boolean plus a coarsened day.
- No IP address, user agent or precise timestamp in the Board, Participation or Survey stores
  (**Proposal**; see §4 on vendor logs, which are outside application control).
- No mapping table, and no hash of `user_id` (§12 known issue: unkeyed hashes are reversible).
- No unwrapped `s_c` anywhere server-side.

### 2.4 Where `s_c` comes from (device loss and multiple devices)

| Option | Multi-device | Loss recovery | Risk |
|---|---|---|---|
| (a) **WebAuthn PRF**: `s_c = HKDF(PRF(cred, "clearcourse/v1/"+course+term))` | Yes, if the passkey syncs (iCloud Keychain / Google Password Manager; sync behaviour is **Unverified** per provider) | Lost if the passkey is lost or deleted | Browser support gaps (§8.3). A *new* passkey yields a *different* `s_c`. |
| (b) Random `s_c` in IndexedDB, plus a server-held **wrapped** copy (wrapped by a PRF-derived key and/or a student-held recovery code) | Yes, by unwrapping on each device | Possible via the recovery code | The wrapped blob is stored per `user_id`. Anyone who obtains the PRF output or recovery code (including malicious JS, §4) can unwrap it. |
| (c) Random `s_c` in IndexedDB only | No | None: the student needs a new pseudonym | Sybil and credit-loss problems (§5) |

**Proposal:** if C1 is ever built, use (b) with the wrapping key from PRF where available and a
recovery code as the fallback.

**Sybil caveat for re-issuance.** A second blind signature for the same (student, course, term)
creates a second, unlinkable pseudonym. Any re-issuance policy therefore trades exact "one upvote
per student" (§7.7) against recovery. This is NQ-C3.

## 3. Walkthrough of checklist items 1–16

Each item is checked against C1, and against C2/C3 where the result differs. The H1 behaviour is
given where it matters for the upgrade path.

### Item 1: Asking or commenting credits the right counter; ordinary queries cannot join (§6.2, §7.9)

**C1.** The browser signs `{course, action:"ask", body_hash, nonce}` with `s_c`. In one transaction
the Board inserts the question and increments `counters[P_c].questions`. The counter is credited to
the right student because only that student holds `s_c` for `P_c`.

No application query can join content to identity. The only identity-to-pseudonym association ever
made was the blind issuance, and the server stored nothing from it (§2.3). So there is no key, table
or function to join through, even for the operator's DB console. This is stronger than §6.2.

**Residual.** Content and counters *are* joinable to the pseudonym. The pseudonym's whole activity
(questions, comments, upvotes, times) is a per-person profile, though not a named one. §3 forbids
instructor access to "individual activity breakdowns", so staff APIs must never expose
pseudonym-grouped data. **Proposal:** use the `authorship` side table (§2.1) and
day-coarsened counter updates.

**C2/C3.** Per-action unlinkable tokens mean the server cannot even group by student. The counter
then lives client-side as earned blind "credit tokens", and level issuance needs C3-style proofs
(item 5). That is too complex for this project (§9).

### Item 2: At most one upvote per student per question; credits "upvotes given" (§7.7, §7.9)

**C1.** `upvotes PRIMARY KEY(question_id, voter_pseudonym)`. The guarantee holds only if each
student has exactly one pseudonym per course. That depends on the one-blind-signature-per-enrolment
rule, plus the re-issuance policy (§2.4, NQ-C3). `upvotes_given` is incremented once, on the first
successful insert.

**C2 (Semaphore).** The nullifier is deterministic per (identity, scope) (Semaphore docs: one valid
proof per scope). With `scope = question_id`, each student gets one upvote per question, and the
server cannot tell that two upvotes on different questions came from the same student. That is a
real privacy gain. It fails on merges (item 3).

### Item 3: Merging duplicates (§7.7; §10 "Duplicate merging preserves counts correctly")

**C1: works exactly.**
```
-- illustrative
INSERT INTO upvotes(question_id, voter_pseudonym)
  SELECT :target, voter_pseudonym FROM upvotes WHERE question_id = :source
  ON CONFLICT DO NOTHING;                    -- union by pseudonym = no double-counting
UPDATE comments SET question_id = :target WHERE question_id = :source;   -- preserve comments
UPDATE questions SET state='merged', merged_into=:target WHERE question_id=:source;
INSERT INTO question_redirects VALUES (:source, :target);                 -- redirect old links
INSERT INTO moderation_log(action, target_ids, actor_staff_id, at, counts_before_after)
  VALUES ('merge', ARRAY[:source,:target], :staff, now(), '{"a":5,"b":4,"merged":7}');
-- counters are NOT touched: credit was earned at action time and is preserved (§7.7)
```
- The displayed total is `COUNT(*)` on the target, which equals the union.
- Credit is never decremented. A student who upvoted both duplicates keeps 2 "upvotes given".
  That reading of "preserve qualifying private participation credit" is a proposal (NQ-C6).
- The moderation log stores counts and IDs, never pseudonyms. Even so, the counts
  `a + b − merged` reveal how many students upvoted both. That is aggregate information and
  harmless in large classes. Flag it for tiny classes.

**C2 (per-question nullifiers): cannot meet §7.7 exactly.** `n1 = PRF(s, Q1)` and `n2 = PRF(s, Q2)`
are unlinkable by design, so after a merge the server knows only that the true total lies in
`[max(a,b), a+b]`. The options all fail:
- (i) Display `a+b`: double-counts, which violates §7.7.
- (ii) Lazy client reconciliation: with `n_Q = s·H(Q)` in a prime-order group, a returning client can
  prove with a Chaum-Pedersen DLEQ proof that `n1` and `n2` share `s`, and withdraw one. Counts are
  wrong until every double-voter returns, and some never will. It also needs custom ZK code.
- (iii) Per-course nullifier scope: this turns C2 back into C1 (a stable per-course pseudonym).
- (iv) Scope the nullifier to a merge-stable "cluster ID" chosen at question creation: impossible,
  because merges are not known in advance.

**Conclusion: exact merge de-duplication requires a per-course linkable pseudonym.** That is,
upvotes by one student must be linkable to each other within a course, though not to their name. This
is the key structural finding for Q9.

### Item 4: Student privately sees own counts, level and thresholds; "Participation level reached" (§7.10, §7.13)

**C1.** The browser signs a read challenge with `s_c`. The Participation API returns
`counters[P_c]` and the level under the applicable threshold version, and the published thresholds
are public data per course.

The **in-app** "Participation level reached" notification is easy: the browser compares the level
before and after, or the Board stores a pseudonym-keyed in-app notification. **E-mail** for this
event is the hard case (item 7).

### Item 5: Verified-level sharing; instructor receives only name, level, date; revocation (§7.10, §7.11)

**C1 flow.**
1. When the sharing window opens (Q18), the browser asks Participation, authenticated by `s_c`, for a
   **blind level token**.
2. Participation computes `L = level(P_c)` server-side, so the level is system-computed ("verified").
3. Participation blind-signs a random nonce under `K_level[c,term,L]` and sets
   `level_token_issued = true` (one per pseudonym).
4. The browser unblinds the token. After a delay, it submits `(token, key_id=L)` over the
   **SSO-authenticated** session to the Shared domain.
5. The Shared domain verifies the token and spends it once (`level_token_hash UNIQUE`), then stores
   `{user_id → name, L, date}`.
6. Before submission, the browser shows the verbatim §7.10 text.

**Revocation.** Set `state = revoked` while `finalisations` is absent. Re-sharing re-activates the
same row, which is identity-bound, so no new token is needed.

**Problems to be honest about:**
- **Level changes after issuance.** If participation can continue after a token is issued, the
  student holds a stale level. Either issue tokens only after participation closes, or allow one
  re-issue at a higher level (which creates the transfer problem below). This depends on Q18 and is
  NQ-C4.
- **Transferability and collusion: a real regression compared with A/B.** A Sustained student can
  hand their unblinded token to a non-participating friend, who shares it under the friend's name.
  The giver then cannot share. The server cannot detect this, because by design it cannot link the
  token to the issuing pseudonym. Under A/B the server computes the level for the authenticated
  identity, so this fraud is impossible.
  - The cryptographic fix is C3: the token is bound to a hidden secret that is also bound to the
    identity-issued enrolment credential, proven in ZK at share time with blind BBS plus equality
    proofs. Both drafts are only at -03 (§1.1), so this is not available as mainstream tooling.
  - Grade integrity matters for §7.11, so this is a **corner for C1** unless the institution accepts
    the risk (NQ-C5).
- **Timing.** If issuance and sharing happen seconds apart, the Shared domain's `shared_on` time plus
  the Participation domain's `level_token_issued` time link `P_c` to the name. **Proposal:** issue
  tokens automatically for everyone on window open, store `shared_on` as a date only (the spec
  requires only "date shared"), and have the client wait at least one day before submitting.

### Item 6: Threshold versioning (§7.9)

This item is not crypto-specific, and C1 handles it as A/B do.
- `threshold_versions(course_id, version, contributor_qc, contributor_up, sustained_qc,
  sustained_up, published_at)`.
- Once any `counters` row exists for the course, the API rejects any new version that raises a
  threshold (would disadvantage). The previous versions are kept.
- `threshold_version_at_first_participation` is per pseudonym. The level is computed under that
  version, or under the most favourable version if the owner prefers. That choice is not specified
  and is NQ-C7.
- The numeric defaults are the §7.9 recommended defaults. Instructors can configure them before
  publishing.

### Item 7: Notifications targeting specific students, including e-mail (§7.13, §3, §6.2)

**Fundamental finding.** Suppose the server sends Alice an e-mail *at the moment* Bob answers Q,
*because* Alice authored or follows Q. Then anyone who sees both the answer time and the e-mail
send log can link Alice to Q. That includes the operator, and the e-mail vendor combined with
anyone holding the board data. No cryptography removes this: the targeted, event-timed e-mail is
the link. Family C therefore cannot deliver targeted, event-timed e-mail for "Answer posted",
"Followed question updated", "Question merged" or "Participation level reached" unless it accepts
one of three things:
- a server-side mapping, which takes the design back to A/B;
- cover traffic;
- delay that the user accepts.

| Option | Privacy vs. server | Meets §7.13 "email"? | Notes |
|---|---|---|---|
| N1. **In-app only** for per-question events. The Board stores pseudonym-keyed notifications and the browser pulls them. | Strong | Partially. The spec says "in-app and email". | Simplest option. Whether it is acceptable is NQ-C1. |
| N2. **Content-free uniform digest.** Every opted-in enrolled student gets the same daily e-mail whenever the course had *any* board activity: "There is new activity in [course]; sign in to see your notifications." The e-mail vendor sees identity, course and date, never content (§3). | Strong. The set of recipients does not depend on who authored or follows what. | Arguably yes, but weakly | Noisy. It is a mild attention pattern, so it should be checked against §8 "avoid attention-maximizing patterns". |
| N3. **Client-triggered, delayed.** On its next visit the browser sees a pending in-app notification and asks the Identity domain (over SSO) to send a content-free e-mail after a random delay of 0–24 h. | Medium. Identity learns "Alice had *some* notification" at a coarsened time. Small classes still allow correlation. | Only after the student visits, which defeats the purpose of e-mail | Weak |
| N4. **Opt-in linkage.** The student registers `(P_c → email)` with a separate notification store. | Same as Family B for that student | Yes | The student explicitly gives up C-level unlinkability. The consent text needs owner/legal wording; do not invent it. |

The broadcast notifications need no per-student linkage, because they go to everyone enrolled:
"Assignment card changed", "Course card changed", "End-of-course survey available" and "Sharing
window open". They are sent from the Identity domain.

**E-mail vendor rule (§3, §6.2), applying to all options.** E-mail bodies never contain anonymous
content text: no question titles and no excerpts. They contain only the course name and a link.
**Proposal:** link to a generic notifications page, not to `/q/<id>`. A question ID inside a link
sent to a named address would itself be an identity-content join in the vendor's logs.

### Item 8: Follow, "Still unclear", report (§7.7)

| Action | Credited? (§7.9) | Dedup needed? | C1 handling |
|---|---|---|---|
| Follow | No | Idempotent per student (spec silent) | `follows(question_id, pseudonym)`. Delivery as in item 7. |
| Still unclear | No (not in the §7.9 list) | Probably one per student per answer; spec silent (NQ-C8) | `unclear_marks(answer_id, pseudonym)` UNIQUE. A merge unions them, as for upvotes. |
| Report | No (explicitly, §7.9) | Yes, to stop report flooding (Proposal) | `reports(..., reporter_pseudonym)`. The moderation queue shows target, reason and count, never the reporter. |

All three are linkable to the pseudonym, not to identity. C2 could make them unlinkable using
per-target nullifiers, but merges would again break.

### Item 9: Rate limiting and abuse without revealing identity (§6.4, §7.7, Q20)

- **Per-pseudonym limits.** N actions per window per `P_c`. The values belong to Q20; do not
  invent them. The server sees `P_c`, so a plain counter works.
- **Pseudonymous ban.** Setting `members.banned = true` blocks `P_c` in that course without anyone
  learning who it is. Issuance is limited to one pseudonym per enrolment per term, so the ban holds
  until re-issuance (NQ-C3). This is a real "moderation that does not reveal identity" feature
  (§6.4).
- **Issuance-level limits.** One pseudonym per enrolment, plus per-identity rate limits on the
  Identity issuance endpoint.
- **Alternatives considered:**
  - *Privacy Pass per-post tokens* (RFC 9576/9578). Identity issues k tokens per student per week
    and the Board redeems one per post. This is unnecessary under C1, which can already rate-limit
    by pseudonym, but C2 would need it.
  - *The Privacy Pass rate-limited tokens draft* has **expired**
    (draft-ietf-privacypass-rate-limit-tokens-06, per the WG page).
  - *Semaphore-style "rate-limiting nullifiers"*, which reveal the secret on over-use. **Rejected:**
    this is automatic deanonymization and conflicts with §6.4, "Default: nobody can deanonymize".
- **Abuse beyond moderation** (threats, safety). By design the operator cannot identify the poster
  (item 14).

### Item 10: Exit survey anonymity and separation (§7.12)

This is the **best-fit use of Family C**, and it can be adopted under any family (Proposal):
1. When the survey opens, the Identity domain issues each enrolled student exactly one blind RSA
   token under `K_survey[c,term]` (RFC 9474, or Privacy Pass type 0x0002). It records only
   `issued=true`.
2. The browser submits `{token, answers}` to the Survey store in a request that carries no cookies.
3. The Survey store verifies the token and inserts `token_hash` into `survey_tokens_spent`, which
   is UNIQUE. This prevents duplicate submissions without any linkage.
4. No timestamp, IP address or user agent is stored (§7.12 "no unnecessary metadata").
5. Completing the survey never touches counters (§7.12).
6. Written responses are revealed only above the configurable minimum-response threshold (§7.12;
   the value is Q16).
7. **Timing mitigation.** The client may submit immediately, but the Survey store stores no time
   and batches its writes (Proposal). Host request logs remain a residual risk (§4).

Under Family A/B, a server-side "has submitted" flag per identity would itself be a small linkage:
identity plus submission time could be matched against response row order. The blind token removes
that. The cost is small: `@cloudflare/blindrsa-ts` or `@cloudflare/privacypass-ts`, one signer key
per survey, and a spent-token table.

### Item 11: Aggregates only above thresholds; differencing (§7.16, §7.12, Q16)

- Level counts per course come from `counters`, which is pseudonym-keyed. They are shown only when
  every displayed cell is ≥ N. N is Q16; do not invent it.
- **Differencing attack.** The instructor sees both the aggregate level counts and the named shares
  list. `count(level) − shared(level)` gives the levels of the non-sharers, so if only one student
  did not share, or all non-sharers fall in one level, those levels are revealed. Family C does
  **not** fix this, because it is an output-privacy problem, not a linkage problem.
  **Proposals**, for the owner to decide (NQ-C9, tied to Q16):
  - (a) Hide level aggregates once the sharing window opens.
  - (b) Show only aggregates of the non-shared remainder, where each remainder cell is ≥ N or 0.
  - (c) Bucketed or coarsened counts.
- Survey aggregates follow §7.12's minimum-response threshold. Survey and level aggregates are never
  cross-tabulated, since they live in separate domains (§6.1).

### Item 12: Logs, analytics, error reports, views, exports, dashboards, vendor logs (§3, §6.2)

- **Two origins.** One origin handles identity: SSO, enrolment, issuance, sharing and broadcast
  e-mail. The other is the Board/Participation/Survey origin, which carries no identity cookie and
  authenticates only by pseudonym signatures or tokens. Application logs on the board origin then
  contain no identity, and identity-origin logs contain no content.
- **Rules (Proposal).**
  - No request-body logging.
  - Error reporting on the board origin strips bodies.
  - Analytics are limited to §7.16 aggregates computed in the DB.
  - No DB view or admin dashboard queries both stores.
  - Exports from Domain 4 contain name, level and date only (§7.10).
- **Vendor logs remain the weak point.** The hosting platform's request logs carry the client IP and
  timestamp for *both* origins. The same browser hits `id.` and `board.` from the same IP within
  seconds. So the host vendor, the operator with log access, or anyone compelled to produce logs can
  link pseudonym to identity statistically. That holds even though no stored value links them.
  - **Mitigations:**
    - Shorten log retention where the vendor allows it (vendor specifics **Unverified** here).
    - Introduce delay or jitter between issuance and registration.
    - Use OHTTP (RFC 9458) for board requests. Its privacy goals hold only if the relay is run by a
      *different entity* from the gateway. A relay service suitable for a $5/month project is
      **Unverified**.
  - **Honest conclusion:** against the host vendor and the operator, C1 does not beat A/B by as much
    as it first appears. Its real gain is that the *database and backups* contain no linkage key.

### Item 13: Opaque, non-predictable identifiers (§6.2, §9, §12)

- Content IDs are random (≥128-bit). They are not sequential or time-ordered. **Proposal:** avoid
  UUIDv7 and ULID for anonymous content, because their embedded timestamps leak creation time.
- The pseudonym `P_c` is a public key derived from a client-held secret. It is **not computable from
  `user_id`** by anyone, including the operator. This fully resolves the §12 "hashed identifier"
  issue.
- It does not, however, hide the per-course grouping of activity (item 1).
- Under H1, `P = HMAC(K_c, user_id)` is computable only with `K_c`. That is the Family A/B guarantee.

### Item 14: Exceptional deanonymization (§6.4): corner or feature?

- **Default under C1.** Nobody can deanonymize, including the operator, through stored data. This
  satisfies "Default: nobody can deanonymize" in the strongest form.
- **If institutional policy requires the exceptional process** (§6.4: approval, multiple approvers,
  documented reason, immutable audit, notification rules, published explanation), there are four
  options:
  - **Not retroactively possible.** Content posted before enablement can never be deanonymized. This
    is arguably the *right* property, since it prevents silent retroactive deanonymization (§3
    "Silent or default-enabled deanonymization").
  - **Prospective escrow.** After enablement and published notice, issuance could require the
    client to deposit `Enc_threshold(P_c)`, encrypted to a k-of-n key held by the approvers (§6.4
    "multiple authorized approvers"). Two problems follow:
    - Blind issuance means the Identity domain cannot check that the ciphertext matches the blinded
      `P_c` without a ZK proof of correct encryption. A dishonest client can deposit garbage.
    - Threshold decryption tooling is extra crypto to build.
  - **Non-cryptographic fallback.** Log-based correlation (item 12) is *possible* in practice. That
    is exactly the kind of informal, unaudited deanonymization §6.4 forbids, and it is a misuse risk
    that the documentation must name.
  - **Switch to H1 for institutions that require it.** In that case `K_c` is held under k-of-n
    custody (Family A/B design).
- **Verdict.** Cryptographic impossibility is a **feature for the default** and a **corner if UW
  policy requires the capability**. The H1 data model avoids the corner, because the same
  pseudonym-keyed schema works whether the pseudonym is server-derived (escrowable) or client-held
  (not escrowable). The choice should be per institution and configurable (§4 "admin-configurable").
  It is NQ-C2.

### Item 15: Retention and end of term (Q17 open; options only)

- **C1.** No server-side linkage key exists, so there is nothing to crypto-shred for linkage.
  Destroy the `K_issue`, `K_level` and `K_survey` private keys when their windows close. This
  prevents late Sybil issuance or forged levels, but it does not affect privacy.
- **Pseudonymous profiles persist** until content is deleted according to Q17. Options:
  - delete `counters` after shares are final;
  - delete `members`, `upvotes`, `follows` and `reports` pseudonym columns after the term. Keep
    upvote *totals* by materialising a count column, which preserves §7.8 "Upvote total".
- **H1.** Crypto-shred `K_c` after sharing is final. Pseudonyms then become permanently unlinkable,
  even for the operator's DB console. Logs and backups taken before shredding still matter (§5).
- **Backups.** Under H1, a backup taken before shredding contains `K_c` only if `K_c` lives in the
  database. **Proposal:** keep `K_c` in a secrets store or KMS, never in DB rows.

### Item 16: Moderation hide/delete and credit (spec silent)

- The spec addresses credit only for merges ("preserve", §7.7). It also forbids "automatically
  denying participation credit" (§3).
- Whether hidden or deleted spam should keep its credit is **not specified**. C1 can do either:
  - keep credit, because counters are incremented at action time and moderation never touches them;
  - decrement credit via the pseudonym-keyed `authorship` row.
- Decrementing is a *manual* moderator action, not automatic denial, but it is still a credit
  decision made by staff. Owner decision: NQ-C10.
- Whatever is decided, the moderation UI must not reveal whether a pseudonym has other content.

## 4. Threat model per actor

The headline web-crypto caveat applies to every row below. **The server ships the JavaScript that
holds `s_c`.** An operator (or an attacker holding deploy keys or app-server access) who wants to
link can serve a modified bundle that exfiltrates `s_c`, the PRF output or the blinding factor `r`,
for targeted users or everyone. The browser offers no general mechanism to pin or audit the
top-level application code. Subresource Integrity covers sub-resources, not the page that loads
them; it is listed here as **Unverified** because it was not re-checked for this note. So the
"server cannot link" guarantee holds only against a passive, honest-at-the-time server, and against
anyone who holds data but not deploy access. That is still valuable: it covers DB dumps, backups,
the DB vendor, and legal compulsion of stored data. It does not cover a determined operator.

| Actor | Required by spec? | C1 protects? | How / residual |
|---|---|---|---|
| Other students | Yes (§6.2 implied) | Yes | They see content and totals only. Residual: self-identifying content and stylometry. |
| Instructor | Yes (§6.2, §5) | Yes | Staff APIs never return pseudonyms. Shares hold name, level and date only. Residual: differencing (item 11), small classes, classroom observation. |
| TA with moderation / card editing | Yes (§5) | Yes | As for the instructor. The moderation queue hides reporters and authors. |
| Institutional admin | Yes (§5 "routinely") | Yes | There is no admin path to Board data with identity. |
| Platform operator, passive (DB console) | No (stronger) | **Yes** | No key, table or function links `P_c` to `user_id`. Residual: correlating IP and timing in host logs. |
| Platform operator, active (deploy access) | No | **No** | Can ship exfiltrating JS. Cannot be defended against in a plain web app. |
| Hosting vendor | No | Partially | It sees request logs for both origins (IP, time). Statistical linkage is possible. |
| DB vendor / DB dump / backup holder | No (but §6.2 "ordinary queries") | **Yes**, the main real gain over A/B | A dump contains no linkage key. Under A/B a dump that includes `K_c` (or a key-custody leak) links everything. |
| Auth / SSO provider | No | Yes | It sees sign-ins only, never pseudonyms. |
| E-mail vendor | §3 applies (no identity + content) | Yes, if item 7 rules hold | Content-free bodies and generic links. |
| Log holder (app logs) | Yes (§6.2) | Yes | Origins are split and bodies are never logged. |
| App-server / secrets compromise | No | Partially | Past linkage is safe. Future linkage happens through served JS. Issuer keys allow Sybil pseudonyms and forged level tokens, so the keys must be rotated. |
| Legal compulsion | No | Partially | Stored data cannot link. Logs, and an order to modify the JS, are the residual risks (§6). |
| Collusion: instructor + operator | No | Same as operator | The instructor adds the names list and classroom knowledge. Timing attacks get easier. |
| Colluding students | Grade integrity (§7.11) | **No: regression** | Level-token transfer (item 5). Sybil through claimed device loss (NQ-C3). |

### Side channels

- **Timing correlation.** Sources are content `created_at`, counter updates, issuance day, sharing
  date and e-mail send times.
  - Coarsen stored times to a day where the spec allows it. The spec requires "date shared" only.
  - Never store issuance time more precisely than a day.
  - Add jitter between issuance and registration.
  - Residual: host logs.
- **Small classes.** With few students, the anonymity set for pseudonym issuance on a given day may
  be 1. **Proposal:** register pseudonyms in a batch at term start for everyone (pre-issued on first
  sign-in, registered after a random delay), not at the time of first post.
- **Self-identifying content and stylometry.** No design fixes these. Pseudonym grouping (C1) makes
  stylometry *easier* than unlinkable per-action designs (C2/C3), because all posts by a student are
  grouped. Document this as a limitation (§6).
- **Classroom observation in presentation mode (§7.8).** A student seen typing at the moment a
  question appears is exposed. Presentation mode shows no timestamps (Proposal). Otherwise this is a
  documented limitation.
- **Network-level linkage (IP).** See item 12. OHTTP needs a non-colluding relay (RFC 9458). Tor is
  not a reasonable requirement for students.

## 5. Failure modes

| Failure | Effect | Detection | Mitigation |
|---|---|---|---|
| Student loses passkey or device and has no recovery code | The pseudonym is lost, along with its credit and "is mine" status | Support request | Recovery code (2.4b). The re-issuance policy (NQ-C3) bounds Sybil risk. The credit-loss limitation must be documented. |
| Re-issuance abused (claims loss, keeps both pseudonyms) | Double upvotes, which violates §7.7; double credit potential | Not detectable by design | Cap at 1 re-issue per term. The server cannot tie the old pseudonym to the new one, so it cannot retire the old one or stop both from obtaining level tokens. The owner must **accept bounded double-counting or forbid re-issuance** (NQ-C3). |
| Level token transferred to another student | Wrong named level, which affects grades (§7.11) | Not detectable | C3 (drafts), or accept the risk, or use H1 |
| Issuer private key leaked | Forged pseudonyms (Sybil) or forged level tokens | Key-use audit; anomalous registration counts per course versus enrolment count | Per-course-term keys, KMS, rotation, and comparing `count(members)` against `count(enrolments)` (a cheap Sybil alarm) |
| Malicious or compromised JS bundle | Linkage of targeted users | Hard. Reproducible builds plus a published bundle hash, checked by a third party (**Unverified** feasibility) | Deploy-key hygiene and branch protection. Documented limitation. |
| PRF unsupported on a student's browser or authenticator | Cannot derive `s_c` from the passkey | Feature detection (`prf.enabled` / empty `prf` result) | Fall back to random `s_c` plus recovery code (2.4b) |
| Clock or timing leak through precise timestamps | Correlation | Schema lint test: no `timestamptz` on Board tables except `created_at` where the UX needs it | Coarsen, and add jitter to background processing |
| Merge implemented with per-question nullifiers (C2) by mistake | Over-counting | Merge property test (§7) | Use per-course pseudonyms |
| Accidental logging of signed request bodies (which include `P_c`) on the identity origin | Linkage | Log-scanning test that greps logs for pseudonym or base64 key patterns | Separate origins and separate deployments where the platform allows |
| Blind signature implementation bug (e.g. the deterministic variant used with low-entropy input) | Blindness loss | Test vectors (blindrsa-ts claims RFC test vectors match) | Use the RFC 9474-recommended **Randomized** variants for pseudonyms. Privacy Pass type 0x0002 uses the deterministic variants over high-entropy token inputs, per RFC 9578. |

## 6. Limitations of anonymity

This is a draft list for the §6.2/§11 deliverable. The wording is a proposal; the owner must approve
any user-facing text.

1. **Grouping.** Within one course and term, the system can tell that several posts or upvotes came
   from the *same* anonymous participant. It cannot tell who that participant is. Merges and the
   one-upvote rule require this (§7.7; item 3).
2. **The code you run comes from us.** The anonymity protection depends on the application code
   delivered to your browser. A malicious or compromised operator could change that code. Families
   A and B have an equivalent limitation, because there the server holds the link outright.
3. **Network metadata.** Our hosting provider records connection metadata (IP address, time) for
   all requests. Someone who holds those logs and analyses timing could statistically link activity
   to sign-ins. We minimise application logging, but we do not control vendor logs.
4. **What you write.** Content that mentions identifying details, writing style, or posting while
   observed in class (presentation mode) can reveal you. No technical measure prevents this.
5. **Small classes.** With few participants, aggregates and timing reveal more. Level aggregates are
   shown only above a threshold (Q16), and some combinations are suppressed (item 11).
6. **Device loss.** If you lose your passkey and recovery code, your anonymous participation record
   for that course may not be recoverable. Exact policy: NQ-C3.
7. **Notifications.** To protect anonymity, e-mails never include question text. Some notifications
   may be in-app only, or delivered as general digests (item 7, NQ-C1).
8. **Deanonymization.** By default, nobody, including the operator, can connect anonymous content
   to your name from stored data. If an institution ever enables an exceptional process (§6.4), it
   applies only to content posted after a published notice. Text for that notice: do not invent it.

## 7. Testability (negative tests per §9)

§9 requires tests that prove instructors and TAs cannot retrieve authors through the **UI, API,
exports, logs or predictable identifiers**. Family C adds a further class of test: **structural**
tests showing that *no stored data* can link, not just that access is denied.

**Structural (C-specific)**
- T-C1 *Blindness smoke test.* Issue pseudonyms to 50 synthetic students. Dump the Identity store
  and the Board store. Assert that no byte string (≥8 bytes) appears in both dumps, apart from
  allow-listed course IDs and public keys.
- T-C2 *No linkage oracle.* Iterate over every API route and assert that no route accepts `user_id`
  and returns a pseudonym, or the reverse. Generate the route list from the router so it cannot
  drift.
- T-C3 *Schema lint.* Assert that no column named or typed like `user_id` exists in the
  Board/Participation/Survey schemas, and no pseudonym column exists in the Identity/Shared schemas.
  Assert that timestamp columns are only the allow-listed ones.
- T-C4 *Issuance record minimality.* After issuance, `pseudonym_issuance` contains only
  `(user_id, course, term, day, count)`. Assert that no blinded message or signature is persisted
  anywhere, including the job queue and cache.

**§9 negative tests (any family, written against C1)**
- T-N1 *Instructor and TA API.* For every staff route, including moderation queue, merge, export,
  analytics and presentation mode, responses contain no pseudonym, no `is_mine`, no reporter, and no
  identity fields alongside content.
- T-N2 *Exports.* The Domain 4 export contains exactly {name, level, date shared} (§7.10). Snapshot
  the column set.
- T-N3 *Logs.* Run a scripted session (sign in, ask, comment, upvote, share). Capture all app logs
  from both origins. Assert that no log line contains content text together with a name, e-mail or
  `user_id`. Assert that board-origin logs contain no identity fields at all.
- T-N4 *Predictable identifiers.* Content IDs pass a randomness check (no monotonic order). The
  pseudonym cannot be recomputed from `user_id` with any server-side key: grep the server bundle for
  any function taking `user_id` and returning a pseudonym.
- T-N5 *E-mail.* Every e-mail template rendered in tests contains no content text and no question
  ID.

**Functional privacy properties**
- T-F1 *Merge exactness (§7.7, §10).* Property test: random upvote sets on Q1 and Q2, then merge.
  Assert total = |union|, comments are preserved, the redirect works, counters are unchanged, and the
  moderation log contains no pseudonym.
- T-F2 *One upvote per pseudonym.* Concurrent duplicate upvotes produce exactly one row and +1 credit.
- T-F3 *Survey.* Each token is spent once (a second submission fails). The response row has no
  time, IP or identity. Survey completion leaves counters unchanged (§7.12).
- T-F4 *Level token.* The level token key ID matches the computed level under the correct
  threshold version. A second token for the same pseudonym is refused. A reused token at the Shared
  domain is refused. Revocation works until finalisation and fails after it (§7.10).
- T-F5 *Threshold versioning (§7.9).* A disadvantaging change after the first counter row is
  rejected.
- T-F6 *Aggregate thresholds and differencing (§7.16, item 11).* Cells below N are suppressed. The
  chosen differencing rule (NQ-C9) holds for edge cases: 1 non-sharer, all non-sharers at the same
  level.

**What tests cannot prove.** That the served JS is honest (§4), and that vendor logs are absent.
These remain documented limitations.

## 8. Platform requirements, portability, corners (§10–11)

### 8.1 What the platform must provide

- **Two origins** (subdomains) that share no cookies: one for identity, one for the board. Any host
  that supports custom domains can do this. Separate deployments are better but optional.
- **Server-side RSA blind signing** (RSA private-key operation on a blinded value). The
  `@cloudflare/blindrsa-ts` README says it uses WebCrypto by default and can use native RSA-RAW on
  Cloudflare Workers (`supportRSARAW`). On Node or Vercel functions it runs over WebCrypto
  (**Unverified** in this note beyond the README's WebCrypto statement).
- **A secrets store or KMS** for issuer keys. Every mainstream host offers environment secrets. A
  real KMS is optional for the prototype.
- **A database** with UNIQUE constraints and transactions. **No Postgres-specific feature is
  required.** C1 works on Postgres (Family A), on separate Postgres projects (B), and on SQLite/D1.
  This is a portability *advantage*: the §12 "D1 has no RLS" known issue matters less when the
  separation is cryptographic. You still need separated stores per §6.1, and access control still
  matters for content moderation.
- **No extra paid infrastructure** for C1 itself. OHTTP would need a third-party relay
  (cost and availability **Unverified**), which is not compatible with a target below $5/month.

### 8.2 Library maturity (TypeScript / browser), checked 2026-10-11

| Library | Version (npm `latest`) | License | Notes |
|---|---|---|---|
| `@cloudflare/blindrsa-ts` | 0.4.6 | Apache-2.0 | RFC 9474 (all 4 variants) plus partially-blind draft-02. Single runtime dependency `sjcl` 1.0.9. Pre-1.0. No audit statement on the repo page. Partially-blind *verification* does not work in browsers (WebCrypto rejects the large exponents); plain RFC 9474 is unaffected. 36 stars. |
| `@cloudflare/voprf-ts` | 1.0.0 | BSD-3-Clause | RFC 9497. Optional deps on `@noble/curves`/`@noble/hashes`. Node ≥ 20. |
| `@cloudflare/privacypass-ts` | 0.9.0 | Apache-2.0 | Claims RFC 9578 compliance plus the public-metadata and batched-token drafts. Depends on voprf-ts 1.0.0 and blindrsa-ts 0.4.5. Pre-1.0. |
| `@semaphore-protocol/core` | 4.14.3 | MIT | ZK membership plus nullifiers. Audited (v4.0.0 by PSE). Trusted setup July 2024. Ethereum-oriented docs; off-chain JS use supported. Proof timings are published only as images (not verified). Requires downloading SNARK artifacts (size **Unverified**). |
| `@digitalbazaar/bbs-signatures` | 3.1.0 | BSD-3-Clause | Core BBS. Which draft revision it implements is not stated in the npm metadata. Blind BBS / pseudonym support **Unverified** (likely absent). |

**Assessment.** Blind RSA, VOPRF and Privacy Pass have mainstream-quality implementations from one
vendor (Cloudflare). They are small, typed and follow RFCs, but they are pre-1.0 and have a narrow
contributor base. Semaphore is mature for its niche, but it brings ZK circuits, artifacts and an
Ethereum-centric ecosystem, all disproportionate here. BBS with blind issuance and pseudonyms (needed
for C3) is draft-only (§1.1); I found no mainstream TS implementation of the blind or pseudonym
drafts (**Unverified**).

### 8.3 WebAuthn PRF support (needed for option 2.4a)

Two sources disagree.

- **MDN browser-compat-data** (`api/CredentialsContainer.json`, main branch):
  - `prf` in `create()`: Chrome 116, Edge (mirrors Chrome), Firefox 139 (135–138 partial, "Not
    supported on macOS"), Firefox Android 149, Safari 18 and Safari iOS (mirrors Safari).
  - `prf` in `get()`: Chrome 116, Firefox 139, **Safari false** (impl bug webkit.org/b/259934),
    Firefox Android false, Android WebView false.
- **WebKit's Safari 18.0 feature post:** "WebKit for Safari 18.0 adds support for the WebAuthn
  `prf` extension". It does not specify create vs get.

The two sources therefore **conflict on Safari `get()`**. Because PRF is useful mainly at `get()`
time, PRF-derived secrets are **not reliable across UW's likely device mix** until this is
re-verified on real devices.

Further points:
- Support also depends on the *authenticator or passkey provider*, not only on the browser (MDN:
  some authenticators do not support PRF; `create()` evaluation has narrower support).
- Windows Hello PRF support: **Unverified**.
- **Proposal:** treat PRF as an optimisation, never as the only key source. Use 2.4b
  (random secret plus wrapped backup).

### 8.4 Corners for production (§10–11)

| Risk | Does C1 corner us? | Does H1? |
|---|---|---|
| §6.4 exceptional process required by policy | **Yes.** Retroactive deanonymization is impossible, and prospective escrow is hard (item 14). | No. `K_c` can sit under k-of-n custody. |
| §7.13 targeted e-mail | **Yes**, unless N1/N2 are accepted (item 7) | No |
| §7.11 grade integrity (token transfer) | **Yes** (item 5) | No |
| Device loss and support load | Yes | No |
| LTI 1.3 provisioning (Q5), SSO (Q4) | No. These touch only the Identity domain. | No |
| Upgrade to stronger privacy later | n/a | **Possible at a term boundary**: new course offerings use client-held pseudonyms. Old data stays HMAC-keyed until shredded. No schema change, because both are opaque `pseudonym bytea`. |
| Postgres vs D1 | No | No (if Family B), small (if Family A relies on RLS) |

## 9. Build complexity for a solo developer with Claude

| Piece | C1 effort | Notes |
|---|---|---|
| Blind issuance endpoint and client blinding | Medium | Library-supported (RFC 9474). Key management per course-term. |
| Client key management (`s_c`, wrap/unwrap, recovery code UX, PRF detection) | **High** | It is security-critical and easy to get subtly wrong. It also needs polished, credible UX (§8), and recovery-code UX is notoriously hard for users. |
| Signed-request auth on the board origin (challenge/response, replay protection) | Medium | Custom auth, not a mainstream framework feature. Session tokens derived from a signature can simplify it. |
| Level tokens plus sharing | Medium | Small, but the timing and transfer caveats need documentation. |
| Survey tokens | **Low** | Recommended under any family (item 10). |
| Notifications under C constraints | Medium | N1/N2 are easy to build but need product decisions. |
| Testing (structural tests T-C1..T-C4) | Medium | High value; reusable under H1. |
| Support burden (lost keys, "my posts vanished") | **High, ongoing** | Bad for a solo operator. |
| C2 (Semaphore) | Very high | ZK artifacts, and the merge problem is unsolved. |
| C3 (BBS anonymous credentials) | Not feasible | Drafts only; no mainstream library for blind/pseudonym BBS (**Unverified**). |

**Honest overall verdict**

- **Prototype: no.** The added complexity and support load fall on the riskiest part of the system.
  The prototype's milestone is "people can sign in and use it, polished and credible", and the spec
  does not require protection against the operator or vendors.
- **Production: not as the default.** C1 is possibly worth offering as an institution-configurable
  "strong anonymity mode" for institutions that do *not* require §6.4 deanonymization, and only if:
  - the owner accepts the e-mail and transfer trade-offs (NQ-C1, NQ-C5);
  - device-mix testing confirms the PRF situation, or recovery codes are accepted.
- **C2/C3: neither** prototype nor production, at present standards maturity.
- **Worth adopting now (Proposal):**
  1. **H1 data model.** Every Board, Participation and Survey row is keyed by an opaque per-course
     `pseudonym bytea` or by random IDs, never `user_id`. A single
     `PseudonymSource` interface has two implementations: `ServerHmac(K_c)` now and
     `ClientBlindSigned` later.
  2. **Blind-token exit survey** (item 10).
  3. **Two origins with no shared cookies**, even under A/B. This cuts app-log linkage and makes a
     later C1 upgrade a drop-in.
  4. **Day-coarsened timestamps and no IP storage** in anonymous stores.
  5. **Crypto-shredding of `K_c`** at term end under H1, subject to Q17.
  6. **Structural tests T-C1..T-C4**, adapted to H1. Under H1, T-C1 still applies to the Board
     versus Identity dumps, excluding the key store.

## 10. Open questions

The existing questions this design depends on are Q4 (SSO stand-in affects issuance), Q6 (e-mail
provider), Q9 (this note informs it; it does not close it), Q13 (essential notifications, relevant
to N1/N2), Q16 (aggregate N), Q17 (retention and shredding), Q18 (sharing window, relevant to level
token timing) and Q20 (rate limits).

**Proposed new open questions** (for the owner; none are answered here):

- **NQ-C1:** Is in-app-only delivery (N1), or a content-free uniform digest (N2), acceptable for
  per-question notifications ("Answer posted", "Followed question updated", "Question merged") and
  "Participation level reached"? Or must every §7.13 event have a targeted e-mail? A targeted e-mail
  requires the server to be able to map the event to a recipient.
- **NQ-C2:** Must the system protect anonymity against the platform operator and vendors (beyond
  §6.2)? And does UW (or any target institution) require the §6.4 exceptional process? The two
  answers pull in opposite directions (item 14).
- **NQ-C3:** If a student loses their key material, may they obtain a new pseudonym mid-term?
  Doing so risks bounded double upvotes, which conflicts with exact §7.7. Is lost participation
  credit acceptable, or must recovery always be possible?
- **NQ-C4:** Can participation continue after level tokens or sharing open? This depends on Q18.
- **NQ-C5:** Is the risk of a student transferring a verified level token to another student
  acceptable for grading (§7.11)? Under C1 it is undetectable.
- **NQ-C6:** On a merge, does a student who upvoted both duplicates keep 2 "upvotes given", or
  is the count reduced to 1? "Preserve qualifying private participation credit" (§7.7) suggests
  keeping 2, but the spec does not say.
- **NQ-C7:** Is a student's level computed under the threshold version in force at their first
  participation, under the originally published version, or under the most favourable version
  (§7.9)?
- **NQ-C8:** Is "Still unclear" limited to one mark per student per answer, and is it visible to
  staff as a count?
- **NQ-C9:** Which differencing protection applies to level aggregates once named shares exist
  (item 11)?
- **NQ-C10:** Does hiding or deleting content (spam) remove its participation credit (item 16)?
- **NQ-C11:** Is it acceptable that the board authenticates on a separate origin (subdomain), which
  the UX must explain to users as part of the "explicit anonymity explanations" (§8)?

## Verification log

All entries were checked on 2026-10-11.

| Claim | Source | Status |
|---|---|---|
| RFC 9474 RSA Blind Signatures: Informational, IRTF CFRG, Oct 2023; 4 variants; Randomized RECOMMENDED; blindness and one-more-unforgeability; no public metadata | https://www.rfc-editor.org/rfc/rfc9474.html | Verified |
| RFC 9576 Privacy Pass Architecture: Informational, June 2024; deployment models; shared-model unlinkability relies on time/space separation; metadata partitions the anonymity set | https://www.rfc-editor.org/rfc/rfc9576.html | Verified |
| RFC 9578 Privacy Pass Issuance: Proposed Standard, June 2024; types 0x0001 VOPRF(P-384) private and 0x0002 Blind RSA(2048) public; deterministic variants | https://www.rfc-editor.org/rfc/rfc9578.html | Verified |
| RFC 9577 is Proposed Standard; batched-tokens draft-08 with the IESG; rate-limit-tokens draft-06 expired; key-consistency drafts expired | https://datatracker.ietf.org/wg/privacypass/documents/ | Verified |
| RFC 9497 OPRF/VOPRF/POPRF: Informational, IRTF, Dec 2023; deterministic output per key/input | https://www.rfc-editor.org/rfc/rfc9497.html | Verified |
| draft-irtf-cfrg-bbs-signatures-12 (2026-09-28): Active RG Document, intended Informational, not an RFC | https://datatracker.ietf.org/doc/draft-irtf-cfrg-bbs-signatures/ | Verified |
| Blind BBS draft-03 (2026-06-26) and per-verifier-linkability draft-03 (2026-06-29): Active RG Documents | https://datatracker.ietf.org/doc/search?name=bbs&sort=&rfcs=on&activedrafts=on&olddrafts=on | Verified |
| RFC 9458 OHTTP: Standards Track, Jan 2024; relay must not be operated by the same entity as the gateway | https://www.rfc-editor.org/rfc/rfc9458.html | Verified |
| WebAuthn PRF extension semantics (create/get, evalByCredential) | https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions | Verified (no compat data on page) |
| PRF compat: Chrome 116; Firefox 139; Safari create 18 but get false | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/CredentialsContainer.json | **Conflicting** with the WebKit post |
| "WebKit for Safari 18.0 adds support for the WebAuthn prf extension" | https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ | **Conflicting** (create/get unspecified) |
| passkeys.dev device-support page has no PRF data (updated Sep 21, 2026) | https://passkeys.dev/device-support/ | Verified (absence) |
| Windows Hello PRF support | none | **Unverified** |
| blindrsa-ts: RFC 9474 plus partially-blind draft-02; Apache-2.0; sjcl dependency; browser limitation for partially-blind verification | https://github.com/cloudflare/blindrsa-ts | Verified |
| blindrsa-ts 0.4.6, Apache-2.0, dependency sjcl 1.0.9 | https://registry.npmjs.org/@cloudflare/blindrsa-ts/latest | Verified |
| voprf-ts 1.0.0, BSD-3-Clause, Node ≥ 20 | https://registry.npmjs.org/@cloudflare/voprf-ts/latest | Verified |
| privacypass-ts 0.9.0, Apache-2.0; RFC 9578 plus drafts | https://registry.npmjs.org/@cloudflare/privacypass-ts/latest ; https://github.com/cloudflare/privacypass-ts | Verified |
| Semaphore v4: audits, trusted setup 13 Jul 2024, off-chain JS libraries | https://docs.semaphore.pse.dev/ | Verified |
| Semaphore nullifier from scope plus private key; one proof per scope | https://docs.semaphore.pse.dev/guides/proofs | Verified (exact formula **Unverified**) |
| Semaphore proof timings and artifact sizes | https://docs.semaphore.pse.dev/benchmarks | **Unverified** (published as images only) |
| @semaphore-protocol/core 4.14.3, MIT | https://registry.npmjs.org/@semaphore-protocol/core/latest | Verified |
| @digitalbazaar/bbs-signatures 3.1.0, BSD-3-Clause; draft revision not stated | https://registry.npmjs.org/@digitalbazaar/bbs-signatures/latest | Verified (revision **Unverified**) |
| Subresource Integrity does not cover the top-level document | none fetched | **Unverified** |
| Vendor log retention controls; OHTTP relay availability and cost | none fetched | **Unverified** |
| Passkey sync behaviour per provider (iCloud Keychain, Google Password Manager) | none fetched | **Unverified** |
