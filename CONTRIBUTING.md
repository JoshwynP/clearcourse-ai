# ClearCourse AI — Contributing Guide and Source of Truth

> **This document is authoritative.** Every implementation in this repository must trace back to a
> requirement written here. If something is not written here, it is not a requirement — it is an
> open question. Do not invent, assume, or "fill in" scope. Ask, then record the answer here.

**Status:** A fictional-data static experience prototype exists (ADR 0005). No authenticated application code exists yet; its tech stack is **not yet decided**
(see §12).
**Primary source:** [`docs/research/source-prompt.pdf`](docs/research/source-prompt.pdf) (pages 1–19 are
the product specification). Extracted text: [`docs/research/source-prompt.txt`](docs/research/source-prompt.txt).
Citations below look like `[src p.N]` and refer to that PDF's page numbers.

---

## Contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Purpose and meaning](#2-purpose-and-meaning)
3. [Hard prohibitions (never build)](#3-hard-prohibitions-never-build)
4. [Institutional context](#4-institutional-context)
5. [Roles and authorization](#5-roles-and-authorization)
6. [Privacy architecture](#6-privacy-architecture)
7. [Functional requirements](#7-functional-requirements)
8. [Design requirements](#8-design-requirements)
9. [Testing requirements](#9-testing-requirements)
10. [Production acceptance criteria](#10-production-acceptance-criteria)
11. [Deliverables](#11-deliverables)
12. [Architecture and stack (undecided)](#12-architecture-and-stack-undecided)
13. [Open questions](#13-open-questions)
14. [Working conventions](#14-working-conventions)
15. [Definition of done](#15-definition-of-done)
16. [Changelog of this document](#16-changelog-of-this-document)

---

## 1. How to use this document

**Precedence order.** If sources conflict, follow them in this order:

1. Explicit, dated decisions recorded in this document or in [`docs/decisions/`](docs/decisions/)
2. The product specification, `docs/research/source-prompt.pdf` pages 1–19
3. Other research in `docs/research/` (advisory unless it has been promoted into this document)
4. Everything else, including model knowledge (never authoritative for scope)

**Three kinds of statement.** Content in this file is one of:

- **Requirement**: carries a `[src p.N]` citation or a decision reference. Must be implemented exactly.
- **Advisory**: labelled *Advisory*. A suggestion from research; it does not bind until it is decided.
- **Open question**: listed in §13. Nothing that depends on it may be built until it is resolved.

**Changing this document.** Scope changes require (a) the owner's explicit approval, (b) an update
here, (c) an entry in §16, and, for architectural choices, (d) an ADR in `docs/decisions/`.

---

## 2. Purpose and meaning

ClearCourse AI is a **learning-transparency platform for higher education** `[src p.1]`. It helps
instructors state clearly, per course and per assignment, how generative AI may and may not be used.
It also gives students a safe, anonymous place to ask about those rules. Students who take part can
earn private, non-gamified participation recognition that **they alone** decide whether to share.

It combines `[src p.1]`:

- Course AI Cards
- Assignment AI Cards
- An anonymous, upvotable question board
- Optional process-transparency bonuses
- A classroom presentation mode
- Privacy-preserving participation verification

**First milestone (owner decision, 2026-10-12):** an interactive public-preview prototype with fictional course and assignment cards, a course/assignment question board, and an instructor editing preview. It is not a real student service and does not collect or persist user data. See ADR 0005 and `BUILD-NOW.md`.

**Guiding principles drawn from the spec:**

- **Transparency, not policing.** The product explains rules and rewards reflection on the learning
  process. It never judges students automatically (§3).
- **Anonymity is architectural.** It must hold at the data layer, not just in the UI `[src p.3]`.
- **Equal treatment.** Using AI gives no advantage. The transparency bonus is available equally to
  students who use AI and students who do not `[src p.6, p.7]`.
- **Official policy stays official.** The app links to institutional policy and must not present its
  own summaries as authoritative replacements `[src p.2]`.
- **Calm and credible.** No gamification, surveillance motifs or attention-maximizing patterns `[src p.18]`.

---

## 3. Hard prohibitions (never build)

These apply to every feature, now and in future. A change that introduces any of them must be rejected.

| Prohibited | Source |
|---|---|
| AI detection | `[src p.1]` |
| Automated misconduct prediction | `[src p.1]` |
| Sentiment analysis | `[src p.1, p.13]` |
| Automated quality scoring | `[src p.1, p.13]` |
| Student-risk profiles / risk scores | `[src p.1, p.18]` |
| A generative model setting policy in the card-builder | `[src p.9]` |
| Automated semantic judgment used to grade or evaluate participation | `[src p.11]` |
| Automatically denying participation credit (e.g. via duplicate detection) | `[src p.11]` |
| Accepting assignment submissions or storing student files/reflections | `[src p.7, p.8]` |
| Automatically determining final course grades | `[src p.15]` |
| Student behavioral timelines; identity-linked discussion analytics | `[src p.18]` |
| Instructor access to individual activity breakdowns | `[src p.14, p.18]` |
| Leaderboards, streaks, competitive badges, robots/AI-aesthetic, surveillance motifs | `[src p.18]` |
| A third "general" question tag | `[src p.5]` |
| Silent or default-enabled deanonymization | `[src p.4]` |
| Impersonation without a tightly controlled, audited support procedure | `[src p.2]` |
| Identity data and anonymous content text in the same log, analytics event, error report, DB view, export or admin dashboard | `[src p.3]` |

---

## 4. Institutional context

- Initial deployment target: **University of Waterloo** `[src p.1]`.
- Must be able to link to **LEARN** (UW's LMS, Brightspace-based), **Policy 71**, and the
  **Guidelines for the Assessment of Penalties** `[src p.1]`.
- **Everything institution-specific must be administrator-configurable**: names, links, policy
  language, branding and LMS configuration. Later institutions must be supportable without code
  changes `[src p.1]`.
- Default policy links `[src p.1]`:
  - Policy 71: <https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policy-71>
  - Guidelines for the Assessment of Penalties:
    <https://uwaterloo.ca/secretariat/policies-procedures-guidelines/guidelines/guidelines-assessment-penalties>
- Policy or legal summaries must never be presented as authoritative replacements for the linked
  official policies `[src p.2]`.

---

## 5. Roles and authorization

**Roles** `[src p.2]`: Student · Instructor · Teaching assistant (TA) · Institutional administrator.

Authorization is **strict, role-based and course-based** `[src p.2]`:

| Role | May | Must not |
|---|---|---|
| Student | Access only courses they are enrolled in | Access other courses |
| Instructor | Manage only courses they teach; assign TA permissions | Access identity↔anonymous-content mappings `[src p.3]` |
| TA | Exercise the specific permissions an instructor assigns (e.g. moderation, card editing) | Access identity↔anonymous-content mappings `[src p.3]` |
| Institutional admin | Manage institutional configuration | Routinely connect anonymous content with student identities `[src p.2]` |

- Impersonation is not implemented unless there is a tightly controlled, audited support
  procedure `[src p.2]`. (Whether one is wanted at all is an open question, Q7.)

**Pilot sign-in (owner, 2026-10-12; [ADR 0008](docs/decisions/0008-stand-in-sign-in-and-course-codes.md)):**
A person chooses Professor or Student before signing in, then enters a name. Professor is the
Instructor role. The same name and role returns to the same courses. There is no teaching-assistant
role and no administrator role in this pilot. Administration is not being built; its full scope
remains Q1. A professor creates a course and shares a join code. A student opens that course with
the code. This is not University of Waterloo sign-in, LTI, or CSV import.

---

## 6. Privacy architecture

This is the most important section. A mistake here violates the product's core promise.

### 6.1 Separation of data domains `[src p.3]`

These five domains must be technically separated:

1. Anonymous discussion content (questions, comments, upvotes)
2. Private per-student participation counters
3. Student identity and enrollment
4. Instructor-visible shared participation results
5. Anonymous exit-survey responses

### 6.2 Rules `[src p.3]`

- Instructors and TAs must **never** receive access to mappings between students and their
  anonymous questions, comments or upvotes.
- A qualifying action may update the student's private counter, but **ordinary application queries
  must not be able to join the action content back to the student's identity**.
- Required techniques: privacy-preserving event processing, separated tables or schemas, restricted
  service roles, opaque identifiers, and narrowly scoped internal APIs.
- **The threat model and the limitations of anonymity must be documented.** The pilot document is
  [docs/privacy/threat-model.md](docs/privacy/threat-model.md).
- Identity-bearing information and anonymous-content text must not appear together in any
  application log, analytics event, error report, database view, export or administrator dashboard.

### 6.3 Necessary tension (design carefully)

Some requirements require the system to know, *somewhere*, that an action belongs to a student.
For example, upvotes must be combined "without double-counting a student" `[src p.11]`, and
counters must credit the right student `[src p.3]`. The design has to satisfy these without giving
ordinary queries, instructors, TAs or admins a usable mapping.

**Pilot decision (owner, 2026-10-12; [ADR 0009](docs/decisions/0009-anonymous-content-separation.md)):**
Questions are always anonymous. Identity and content stay in separate stores. A vote stores only
`HMAC-SHA256(vote key, question id)`. The vote key stays in the identity store. Replies are labeled
by role, never by name. Participation counters are not in this pilot. Nobody can deanonymize
through the application. The local file stand-in can still be read by someone with the computer;
production must use separate database roles before real students use it.

### 6.4 Abuse handling and deanonymization `[src p.4]`

- Prefer content moderation and rate controls that **do not reveal identity**.
- **Default: nobody can deanonymize.** That includes instructors, TAs and ordinary admins.
- A deanonymization capability may exist only if institutional policy requires it. It is then an
  institution-configurable exceptional process requiring **all** of the following:
  explicit institutional approval · multiple authorized approvers · a documented reason ·
  immutable audit logging · notification rules · a published explanation visible to users.

---

## 7. Functional requirements

### 7.1 Core course structure `[src p.4]`

Each course has exactly: **one** Course AI Card · **one** AI Card per assignment · **one** anonymous
question board.

### 7.2 Question categorization `[src p.4–5]`

- Exactly two tag types: **Course** and **Specific Assignment**. There is **no** third "general" tag.
- The unfiltered board shows all course and assignment questions.
- Filters: All questions · Course questions · one selectable assignment.

### 7.3 Course AI Card `[src p.5–6]`

Fields:

- What counts as generative AI
- Whether generative AI is generally permitted
- Uses generally allowed
- Uses generally prohibited
- General disclosure requirements
- General transparency-of-process expectations
- How suspected inappropriate use is addressed
- Configurable institutional-policy warning
- Policy 71 link
- Guidelines for the Assessment of Penalties link
- Additional resources
- Last updated date
- Version history
- Published status
- Opening statement (optional)

Rules:

- If AI is generally **prohibited**, the card may include language explaining that drafts or version
  history may be requested if concerns arise.
- If AI is **permitted**, the instructor **must** specify permitted uses, prohibited uses and
  disclosure expectations.
- The opening statement is optional. The instructor may write it, edit it, or leave it blank. A
  blank opening statement is left blank.
- Suggested wording the instructor may use, edit, or omit:
  > "Permission to use generative AI does not mean students are expected or required to use it. Any
  > transparency bonus rewards reflection and evidence of the learning process equally whether or
  > not AI was used."

### 7.4 Assignment AI Cards `[src p.6–7]`

Fields:

- Assignment title
- Assignment identifier
- Due date
- Learning being assessed
- Is AI permitted?
- When AI is allowed
- When AI is not allowed
- When disclosure is required
- When disclosure is not required
- When process evidence is requested
- When process evidence is not requested
- Optional transparency bonus percentage
- Requirements for receiving the transparency bonus
- Resources
- Other optional information
- LEARN submission link
- Policy links
- States: **draft, published, archived, superseded**
- Version history
- Published date
- Last updated date
- Opening statement (optional)

Rules:

- The opening statement follows the same rule as the course card (§7.3): it is optional, the
  instructor may write, edit, or omit it, and a blank statement is left blank. The suggested wording
  in §7.3 may be used on an assignment card as well.
- **Assignment rules override the Course AI Card where they differ. The differences must be shown
  visibly.**
- No submissions are accepted. Students are directed to the configured LEARN submission URL.

### 7.5 Transparency-of-process bonus `[src p.7–8]`

- Always optional, and available equally to students who use AI and students who do not.
- The instructor configures the percentage and the evidence requested.
- Recommended evidence:
  - **If AI was used:** selected prompts and responses copied into a document, *or* a PDF of the
    relevant AI conversation; permission to blur or black out personal, unrelated or private text;
    draft or version history where applicable; a process reflection of about 100 words covering the
    student's actual process, use of AI, evaluation of responses, decisions, verification and how
    they responded to feeling stuck.
  - **If AI was not used:** planning notes; evidence of feedback or revision; draft or version
    history; a process reflection of about 100 words covering process, challenges, writer's block or
    difficulty beginning, resources used and important revisions.
  - **If AI is not permitted:** drafts or version history; a brief process reflection explaining how
    the student completed the work and navigated difficulty.
- All files and reflections are submitted through LEARN. **ClearCourse AI stores only the
  requirements and links.**

### 7.6 Instructor card-builder `[src p.8–10]`

There are two paths: a **guided wizard** and a **manual editor**.

Wizard questions:

1. What learning is being assessed?
2. Which work must students perform independently?
3. Could AI assist without replacing that learning?
4. Is AI permitted?
5. At which stages?
6. What is prohibited?
7. What must be disclosed?
8. What process evidence could support reflection?
9. Is a transparency bonus offered?
10. What is its value?
11. What resources should students receive?
12. What happens if inappropriate use is suspected?

For each question the wizard provides: a short explanation · "Why this matters" · curated supporting
resources · **the transparent decision rule behind any recommendation**.

- The recommended card is generated by **explicit fixed rules**. Never use a generative model to set
  policy. (The actual rule set has to be authored; see Q10.)
- Instructors may: edit every field · reject recommendations · add custom language · skip the
  wizard · preview the student view · save drafts · publish · duplicate cards · archive or supersede
  cards.

**Versioning:**

- Every published card is versioned. The rules visible to students **at each point in time** are
  preserved.
- If a published rule changes, the instructor must specify: what changed · why it changed ·
  effective date · whether the change applies to work already underway.
- Affected students are notified.

### 7.7 Anonymous question board `[src p.10–11]`

**Students can:** ask an anonymous question · comment anonymously · upvote a question · mark an
answer "Still unclear" · report spam or inappropriate content · follow a question.

**Instructors and authorized TAs can:** answer · pin · merge duplicates · recategorize between
Course and a specific assignment · hide or delete content · resolve or reopen · select a question
for presentation mode.

**When duplicates are merged:**

- Preserve all comments where reasonable
- Combine upvote totals **without double-counting a student**
- Preserve qualifying private participation credit
- Redirect old links to the merged question
- Log the moderation action **without exposing identities**

**Also required:** rate limiting · duplicate warnings · safe content reporting · a moderation queue.
Optional duplicate *suggestions* are search assistance only. They never deny participation
automatically.

### 7.8 Classroom presentation mode `[src p.11–12]`

| Display | Exclude |
|---|---|
| Anonymous question | Identities |
| Upvote total | Private participation counts |
| Answer | Student activity breakdowns |
| Relevant card section | Moderator-only notes |
| Clarification or policy-change status | Reports |
| Discussed-in-class status | Hidden comments |

### 7.9 Private participation counter `[src p.12–13]`

- Count **only** questions asked, comments posted and upvotes given.
- Do **not** count views, reports, follows, card opens, time spent or survey responses.
- There are **exactly three** levels: **No Record · Contributor · Sustained Contributor**.
- Recommended default thresholds:
  - **Contributor:** at least 1 question or comment **and** at least 1 upvote
  - **Sustained Contributor:** at least 2 questions or comments **and** at least 3 upvotes
  - **No Record:** Contributor threshold not met
- Instructors can configure the numeric thresholds **before** they publish the participation
  policy.
- Once students begin participating, threshold changes that would disadvantage them are blocked.
  The originally published threshold version is preserved.
- A level is never determined by AI, quality scoring, sentiment analysis, instructor ratings or
  upvotes *received*.

### 7.10 Student-controlled sharing `[src p.14]`

- Students privately see their question count, comment count, upvote count, current level, and the
  published course thresholds.
- At the end of the course a student may share **only their verified level**.
- Before sharing, show this text (verbatim):
  > "Your instructor will receive your name and participation level. Your instructor will not
  > receive your questions, comments, upvotes, dates, or activity breakdown."
- The instructor receives only: **student name · verified level · date shared**.
- Students can revoke a share until the instructor exports or applies the result. The app must
  clearly explain when sharing becomes final.

### 7.11 Instructor grading settings `[src p.15]`

- **Pass/fail:** the instructor chooses Contributor or Sustained Contributor as the passing
  threshold.
- **Ranked:** the instructor assigns a published bonus or participation value to each level.
- Recommended defaults are provided (their values are not yet specified; see Q11).
- The scheme must be **published before students participate**.
- The app never determines the final course grade automatically. It provides an authorized grade
  result or an export compatible with institutional requirements (format: Q12).

### 7.12 End-of-course survey `[src p.15–16]`

This survey is presented **before** participation-level sharing. It has three anonymous questions
(verbatim):

1. "What should the next version of this course do differently to support transparency and your
   learning process?"
2. "What, if anything, remained confusing even after questions were answered?"
3. "When did you feel best supported through this platform, and what was helpful?"

Requirements:

- Anonymous, and technically separated from identity and participation records
- Available even if the student does not share their level
- The instructor sees only aggregate counts and anonymous text
- A configurable minimum-response threshold applies before written responses are revealed in small
  classes
- No unnecessary metadata is collected
- Completing the survey earns **no** participation credit

### 7.13 Notifications `[src p.16]`

Accessible **in-app and email** notifications for:

- Answer posted
- Followed question updated
- Assignment card changed
- Course card changed
- Question merged
- Participation level reached
- End-of-course survey available
- Sharing window open

Users can manage nonessential notifications. (Which notifications count as essential is Q13.)

### 7.14 Search and filtering `[src p.17]`

- Search within the current course.
- Filters/sorts: all questions · course questions · specific assignment questions · unanswered ·
  answered · pinned · resolved · most upvoted · most recent.
- Results must never expose hidden, removed, moderator-only or identity-linked information.

### 7.15 Administration `[src p.17]`

The source text here is **incomplete**. It reads only: "Allow institutional administrators to
update website". The full admin scope is Q1. What is known from elsewhere in the spec: admins
configure institutional names, links, policy language, branding and LMS configuration `[src p.1]`,
and the exceptional deanonymization configuration if policy requires it `[src p.4]`.

### 7.16 Analytics `[src p.17–18]`

Only privacy-preserving course aggregates:

- Total questions
- Total comments
- Total upvotes
- Unanswered-question count
- Questions by Course versus assignment
- Percentage of questions resolved
- Number of students in each private level, **shown only when aggregation thresholds are met**
- Exit-survey aggregate results

Analytics must never include behavioral timelines, risk scores, identity-linked discussion
analytics or individual activity breakdowns.

### 7.17 Audit logging `[src p.1, p.4, p.11]`

Audit logging is a required system `[src p.1]`. Known audited events: moderation actions, logged
without identities `[src p.11]`, and deanonymization events, which use immutable logs `[src p.4]`.
The full list of audited events is Q14.

---

## 8. Design requirements `[src p.18–19]`

- Very minimal, simple, calm and credible academic design. Take inspiration from the LEARN /
  Brightspace / UW flow.
- Use: compact information cards · plain language · strong hierarchy · university-appropriate
  typography · neutral colours with configurable institutional branding · progressive disclosure ·
  clear status labels · explicit anonymity explanations · non-gamified private participation levels.
- Avoid: AI-generated aesthetics · robots · surveillance motifs · leaderboards · streaks ·
  competitive badges · attention-maximizing patterns.
- **Prototype visual direction (owner decision, 2026-10-12):** use a familiar chat-style layout,
  flat borders, compact spacing and plain text labels. Colours are the University of Waterloo
  palette: black, white, grey, and gold. Each page starts with a black banner containing the
  University of Waterloo wordmark and the name ClearCourse, which links to the home page, then the
  four-level gold colour bar used on University of Waterloo websites. Gold is used for bars and
  highlights; text on white or grey stays black. Avoid glossy cards and decorative colour. WhatsApp
  is an inspiration for familiarity, not a source of copied branding or assets.
- Accessibility is required `[src p.1, p.16]`. The conformance target (e.g. WCAG 2.x AA) is Q15.

---

## 9. Testing requirements `[src p.1, p.18]`

- An automated test suite is a deliverable.
- **Explicit negative tests are mandatory.** They must prove that instructors and TAs **cannot**
  retrieve the authors of anonymous content through the **UI, API, exports, logs or predictable
  identifiers**.
- Every acceptance criterion in §10 should have at least one automated test that demonstrates it.

---

## 10. Production acceptance criteria `[src p.19]`

The completed application must demonstrate that:

- [ ] Institutional users can sign in securely
- [ ] Courses and roles can be provisioned through supported integrations
- [ ] Instructors can create, edit, preview, publish and version course and assignment cards
- [ ] Students can clearly distinguish course rules from assignment overrides
- [ ] Questions use only Course or Specific Assignment categorization
- [ ] Students can ask, comment and upvote anonymously
- [ ] Instructors and TAs can moderate without accessing identities
- [ ] Duplicate merging preserves counts correctly
- [ ] Presentation mode reveals no private data
- [ ] Participation uses only question, comment and upvote counts
- [ ] Exactly three levels are supported
- [ ] Students alone decide whether to share their level
- [ ] Instructors receive no underlying participation activity
- [ ] The exit survey is anonymous and technically separate
- [ ] No AI detection or automated student judgment exists

---

## 11. Deliverables `[src p.1]`

The complete application, database, authentication, authorization, moderation, audit logging,
automated tests, deployment documentation and administrative configuration. In addition:

- The threat model and the limitations of anonymity `[src p.3]`
- A published explanation visible to users, if deanonymization is ever enabled `[src p.4]`

---

## 12. Architecture and stack

**Decided for the local application (owner, 2026-10-12; [ADR 0007](docs/decisions/0007-local-app-foundation.md)):**

- Language: TypeScript.
- Framework: Next.js 16.4.0 App Router, Node.js runtime only. The app is in `web/` so the fictional
  preview in `public/` can stay deployable ([ADR 0006](docs/decisions/0006-static-preview-hosting.md)).
- No `proxy.ts`, no `middleware.ts`, no Cache Components, and no third-party error reporting or
  analytics in this foundation.
- Interface: plain CSS custom properties matching §8. A component library is not initialized.
- Database: PostgreSQL is the intended store when persistence starts, because §6 needs separate
  schemas, restricted roles, and row-level security. It is not installed yet. The access library
  and migrations stay proposed in [ADR 0001](docs/decisions/0001-application-stack.md).
- Pilot sign-in ([ADR 0008](docs/decisions/0008-stand-in-sign-in-and-course-codes.md)): practice
  sign-in and course join codes run on the local Next.js server. Records stay in gitignored files
  on that machine. The app is not deployed over the static preview.

**Still open under Q3:** production hosting of the database-backed app
([ADR 0002](docs/decisions/0002-hosting-and-infrastructure.md)), the database access library, and
the UI component library.

The rest of this section records advice from the AI chat on pages 20–31 of the source. That advice
is not a requirement unless an approved ADR says so.

*Advisory* (from `[src p.24–31]`):

- **Frontend:** Next.js (React) with Tailwind CSS.
- **Backend:** Node.js + TypeScript (Express or NestJS), or Python (FastAPI).
- **Database:** PostgreSQL, chosen for schema separation, row-level security and RBAC. Suggested
  schemas: Identity · Content (posts linked to course ID, never author ID) · Participation (opaque
  counters, updated via events) · Audit (immutable).
- **AuthN:** institutional SSO via SAML or OAuth 2.0 / OIDC (for UW: Microsoft Entra ID / WatIAM),
  with no custom password system. Sessions use secure HTTP-only cookies.
- **AuthZ:** RBAC middleware on every API request that checks role and course enrollment, plus
  per-course TA permission checks.
- **Hosting options discussed:** Vercel + Supabase (free-tier prototype) · Railway · Render ·
  Cloudflare Pages/Workers/D1 · AWS (most operational work).

**Known issues with the advisory (recorded so they are not adopted blindly):**

- Cloudflare D1 is SQLite-based. It does not offer the Postgres schemas or row-level security that
  the same advice relies on for privacy separation. Choosing D1 would need a different separation
  design.
- The chat suggests linking participation counters with a "one-way hashed identifier". A plain or
  unkeyed hash of a known user ID can be reversed by hashing every enrolled user and comparing.
  That scheme is not used. The pilot uses the HMAC vote token in ADR 0009.
- Pricing and free-tier figures in the chat are unverified and may be out of date. Check current
  vendor pricing before deciding.
- A hosted SSO integration with UW requires the institution's cooperation. The pilot uses the
  local stand-in in ADR 0008.

---

## 13. Open questions

Nothing that depends on an open question may be built until the question is answered and the answer
is recorded here (move it into the relevant section and note it in §16).

| # | Question | Blocks |
|---|---|---|
| Q1 | What is the full scope of "Administration"? The source text is truncated `[src p.17]`. Not built in this pilot (§5). | §7.15 |
| Q3 | Production hosting of the database-backed app, the database access library, and the UI component library. The local app and its stand-in hosting are decided in §12 and ADRs 0007 and 0008. | Hosting, the first persisted schema, and the component library |
| Q6 | Email delivery provider for notifications. | §7.13 |
| Q7 | Is any impersonation/support procedure wanted, or none at all? | §5 |
| Q10 | The fixed decision rules the card-builder wizard uses to generate recommendations, and its curated resources. | §7.6 |
| Q11 | Recommended default values for ranked grading. | §7.11 |
| Q12 | Grade export format required by UW (e.g. LEARN gradebook CSV). | §7.11 |
| Q13 | Which notifications are "essential" (cannot be disabled)? | §7.13 |
| Q14 | Full list of audited events, and audit-log retention. | §7.17 |
| Q15 | Accessibility conformance target (e.g. WCAG 2.2 AA). | §8 |
| Q16 | Default aggregation threshold (minimum N) for level counts and survey reveal. | §7.12, §7.16 |
| Q17 | Data retention and deletion policy (end of term, account removal). | Data model |
| Q18 | When does the sharing window open and close, and who triggers "end of course"? | §7.10, §7.12 |
| Q19 | Should content support languages other than English (i18n)? | UI |
| Q20 | Exact rate-limit values and moderation-queue workflow. | §7.7 |

---

## 14. Working conventions

These are process rules for this repo. They are not product requirements.

- **Branching:** `main` is always in a working state. Do work on short-lived branches named
  `feat/…`, `fix/…`, `docs/…` or `chore/…`.
- **Commits:** use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
  Reference the section or question number when relevant, e.g. `feat(board): merge duplicates (§7.7)`.
- **Decisions:** architectural or scope decisions get an ADR in `docs/decisions/` using
  [`0000-template.md`](docs/decisions/0000-template.md), numbered sequentially.
- **Research:** raw research goes in `docs/research/`. It becomes binding only when promoted into
  this document.
- **Secrets:** never commit secrets. Use `.env.local` (gitignored) and keep `.env.example` up to date.
- **Traceability:** every feature PR or commit states which requirement(s) it implements.

---

## 15. Definition of done

A change is done only when **all** of the following are true:

1. It implements a requirement cited in this document and nothing beyond it.
2. It violates none of §3 (prohibitions) or §6 (privacy).
3. It has automated tests, including negative/privacy tests where identity or anonymous content is
   involved.
4. All tests, type checks and lint pass locally.
5. It meets the design and accessibility requirements (§8).
6. This document, the README and ADRs are updated if behaviour, scope or architecture changed.
7. Any new uncertainty discovered is added to §13 rather than resolved by assumption.

---

## 16. Changelog of this document

| Date | Change |
|---|---|
| 2026-10-11 | Initial version created from `docs/research/source-prompt.pdf` (pages 1–19 as spec, 20–31 as advisory). Stack undecided. |
| 2026-10-12 | Owner chose an immediate fictional-data public prototype as the first milestone (Q2); ADR 0005 permits a static experience demo while Q3 remains open for the real application. |
| 2026-10-12 | Owner clarified the prototype visual direction: simpler chat layout, neutral palette and one green accent (§8). |
| 2026-10-12 | Owner updated that visual direction to the University of Waterloo black, white, grey, and gold palette, with the University wordmark, gold colour bar, and a home page reached from the ClearCourse name (§8). |
| 2026-10-12 | Static preview files moved to `public/` for isolated deployment; ADR 0006 records the preview-only hosting choice. The production Q3 remains open. |
| 2026-10-12 | Owner accepted the local application foundation in ADR 0007: TypeScript, Next.js 16.4.0, Node.js runtime, plain CSS, and PostgreSQL as the future database. Hosting, the data-access library, and the UI component library stay open under Q3. |
| 2026-10-12 | Owner chose a local practice sign-in (Q4), professor-created courses shared by join code (Q5), Professor or Student chosen before sign-in, and no administrator role in this pilot. Questions are always anonymous (Q9). The threat model is `docs/privacy/threat-model.md` (Q8). ADRs 0008 and 0009. Production hosting of the database-backed app stays open under Q3. |
| 2026-10-12 | Owner made the card opening statement optional for course and assignment cards. A blank statement stays blank. The suggested wording may be used, edited, or omitted (§7.3, §7.4). |
