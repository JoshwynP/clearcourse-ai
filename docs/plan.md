# ClearCourse AI build plan

> **Advisory plan.** Date: 2026-10-12. Status: **Proposed**, waiting for the owner's approval.
> Not binding until the owner approves it and the approved parts are promoted into
> [CONTRIBUTING.md](../CONTRIBUTING.md) (§1). If this plan and CONTRIBUTING.md disagree,
> CONTRIBUTING.md wins.
> Informs: Q2 (primary); every other §13 question and the proposed PQ-01 to PQ-70.

## Contents

1. [Status and how to use this plan](#1-status-and-how-to-use-this-plan)
2. [Recommended approach in brief](#2-recommended-approach-in-brief)
3. [Assumptions](#3-assumptions)
4. [Milestones](#4-milestones)
5. [Build order: session plan](#5-build-order-session-plan)
6. [Running cost per phase](#6-running-cost-per-phase)
7. [Risks register](#7-risks-register)
8. [Definition of done for the prototype](#8-definition-of-done-for-the-prototype)
9. [Decisions needed from the owner](#9-decisions-needed-from-the-owner)
10. [Register of proposed new open questions](#10-register-of-proposed-new-open-questions)
11. [Kickoff prompt for implementation session 1](#11-kickoff-prompt-for-implementation-session-1)
12. [Session prompt template](#12-session-prompt-template)

## 1. Status and how to use this plan

**What this is.** The full proposed build plan for ClearCourse AI, from the first throwaway spikes
to production. It is written so the owner can approve it and then build with Claude one session at
a time. Every recommendation here is a **Proposal**. Nothing is decided, and no open question is
closed by this document.

**Precedence.** This plan is research in the sense of §1 ("advisory unless it has been promoted").
The order is:

1. CONTRIBUTING.md and accepted ADRs in [`docs/decisions/`](decisions/)
2. The product specification (`docs/research/source-prompt.pdf`, pages 1–19)
3. This plan and the research files it cites
4. Everything else

If a session finds a conflict between this plan and CONTRIBUTING.md, CONTRIBUTING.md wins and the
session reports the conflict to the owner (CLAUDE.md "Anti-hallucination rules").

**How decisions move out of this plan.** Nothing in this plan binds until the owner approves it.
When the owner approves a decision:

| Kind of decision | Where it goes | Who writes it | Changelog |
|---|---|---|---|
| Answer to an existing question (Q1–Q20) | Moved from §13 into the relevant CONTRIBUTING section | The session that records it, after the owner says so | One line in §16 |
| Proposed new question (PQ-nn) accepted as a question | Added to §13 as the next free Q number, with the PQ-nn ID in brackets for traceability | Same | One line in §16 |
| Answer to a PQ-nn | Written into the relevant CONTRIBUTING section (the question never needs to sit in §13 first if the owner answers it at once) | Same | One line in §16 |
| Architectural choice (stack, hosting, privacy mechanism, sign-in, provisioning) | The ADR's status changes from Proposed to Accepted, with "Approved by" filled in and the pinned versions recorded | Same | One line in §16, plus §12 updated |
| Milestone scope (Q2) and this plan as a whole | §13 Q2 answered with the approved milestone list; this file's status line changed to "Approved (date)" | Same | One line in §16 |

Until a decision is recorded that way, a session treats it as open and stops when its work depends
on it (§13: "Nothing that depends on an open question may be built until the question is
answered").

**What this plan does not do.** It does not add requirements, defaults, thresholds or copy text.
Where copy is needed it says "owner-approved copy (to be written)". Where a value is needed (for
example the aggregation threshold N or rate limits), it names the question that owns the value and,
where the research proposed one, labels it a **placeholder**. Facts not confirmed on an official
page keep their **Unverified** label. External facts were checked on 2026-10-11 by the research
notes; this plan did not re-fetch them.

**How to read the session plan.** Section 5 lists about 58 sessions. Each row names the
requirement it implements (§ refs), what it needs (ADRs, answered questions), what it produces and
which tests must exist before it is done. Session counts and costs are **unmeasured estimates**.

**Sources this plan is built from.**

| Topic | Research file | ADR |
|---|---|---|
| Stack and hosting (Q3) | [research/stack-and-hosting.md](research/stack-and-hosting.md) | [ADR 0001](decisions/0001-application-stack.md), [ADR 0002](decisions/0002-hosting-and-infrastructure.md) |
| Privacy mechanism (Q9) | [research/privacy-architecture.md](research/privacy-architecture.md) | [ADR 0003](decisions/0003-privacy-mechanism.md) |
| Prototype sign-in and provisioning (Q4, Q5) | [research/prototype-auth-and-provisioning.md](research/prototype-auth-and-provisioning.md) | [ADR 0004](decisions/0004-prototype-authentication.md) |
| Other blocking questions (Q1, Q2, Q6, Q7, Q8, Q10–Q20) | [research/blocking-open-questions.md](research/blocking-open-questions.md) | — |
| Design system and accessibility (§8, Q15) | [research/design-system-and-accessibility.md](research/design-system-and-accessibility.md) | (UI layer inside ADR 0001) |
| Testing strategy (§9, §10) | [research/testing-strategy.md](research/testing-strategy.md) | — |

## 2. Recommended approach in brief

All rows are **Proposals** for the owner. The ADRs hold the detail and the conditions for
acceptance.

| Area | Proposal | Key condition or trade-off |
|---|---|---|
| **Stack (Q3)** [ADR 0001](decisions/0001-application-stack.md) | "Stack R": TypeScript; **Next.js 16.x App Router, Node.js runtime only**, no Edge, **no `proxy.ts`**; server-only domain modules (`server/domains/<domain>/`, `import 'server-only'`, lint rule against cross-domain imports); Route Handlers for privacy-relevant operations; **Drizzle ORM** with **one pool + LOGIN role + secret per privacy domain**; hand-written SQL for roles, grants, RLS and SECURITY DEFINER functions; migrations only from CI, never `push`; **Zod 4** at every boundary; Kysely as fallback | Pin a Next.js release with the 2026-10-14 security update; frequent critical advisories (Next.js, Better Auth) mean pinning, Dependabot and patching within days. Pin one Node.js line: 22.13+, 24.x or 26+ (fact-check) |
| **Hosting (Q3)** [ADR 0002](decisions/0002-hosting-and-infrastructure.md) | **Vercel Hobby `yul1`** + **Supabase Free `ca-central-1` as plain Postgres** (Data API off, default grants revoked, no Supabase Auth, `supabase-js` or Vault); synthetic-data previews on the second free project. **Fallback, same code:** container on **Cloud Run `northamerica-northeast1`** | **Gate:** Hobby is "restricted to non-commercial personal use only", no DPA (PQ-03, PQ-02). Supabase Free pauses after a week idle and has **no backups**: nightly per-domain encrypted dumps, weekly synthetic check (counts as activity: **Unverified**) |
| **Privacy (Q9)** [ADR 0003](decisions/0003-privacy-mechanism.md) | **"A+"**: one Postgres, a schema per §6.1 domain plus `catalog`; no author data on content; counters keyed by `pid = HMAC(K_pid, user)`; per-item tags for upvote, follow, unclear, report; keys only in a server-only **linkage module** with its own `cc_link` role; no runtime SELECT on anonymous or identity base tables; definer-function whitelist; snapshot-only outputs; per-course `K_c` wrapped under a KEK; merge by roster recomputation; **Mode S** crediting (daily batch as an upgrade); UUIDv4 only | Operator and vendors inside the trust boundary unless PQ-10 says otherwise. Forks PQ-19 to PQ-24, PQ-30, PQ-33 before acceptance. Privacy core ≈ 18–25 sessions (unmeasured) |
| **Threat model (Q8)** | Markdown at `docs/threat-model/README.md` (path a proposal): OWASP four questions, data-flow diagram with trust boundaries, STRIDE, LINDDUN, limitations of anonymity; plus an in-app limitations page with owner-approved wording (PQ-52). Written in M0, before any content or participation code (§6.3) | — |
| **Sign-in (Q4)** [ADR 0004](decisions/0004-prototype-authentication.md) | **Better Auth** (≥ v1.7.7) with database sessions in `auth_private` (only `cc_auth`); `__Host-` cookie; hashed tokens and codes; refresh off; IP/UA not stored if possible (PQ-48); no implicit linking; no admin plugin. **6-digit email code** (not magic links, which Safe Links can use up) for admin-configured domains (`uwaterloo.ca` proposed, PQ-45); the field accepts paste and autofill (WCAG 3.3.8). Link on (issuer, subject), never email. Microsoft sign-in only after a consent spike and the owner's yes (PQ-44) | Email codes prove mailbox control, not role, and are not a NIST-approved authenticator: prototype only (§10, PQ-47) |
| **Provisioning (Q5)** [research](research/prototype-auth-and-provisioning.md) | Prototype: vetted instructors create courses (PQ-46); students join by hashed, expiring, revocable link or code; TAs by single-use invite with no permissions until assigned; no roster import before a UW review. Production: **LTI 1.3** with just-in-time provisioning, Deep Linking, AGS, optional NRPS, on `jose`. Data model keyed by (issuer, sub) from day one | LEARN needs a UW sponsor, an Information Risk Assessment ("typically takes 2–4 weeks") and registration (PQ-02, PQ-50). Q5 gets its own ADR later |
| **Email (Q6)** | **SES `ca-central-1`** behind a mailer port in the identity domain, AWS **Paid** plan (Free-plan accounts close after 6 months), production access early, tracking off, à la carte $0.10 per 1,000 (cancel the default Essentials plan). Resend Free (100/day) for dev only | Sign-in depends on email (PQ-42) |
| **Notifications (Q13)** | Content-free, type-free emails linking only to `/notifications`; activity only in daily digests; outbox rows deleted after send; in-app computed on read. Essential set **N3** (card changes, "Sharing window open" in-app) | Copy is owner-approved (to be written) |
| **Design system (§8)** [research](research/design-system-and-accessibility.md) | **shadcn/ui + Tailwind CSS v4 on React Aria**, **Base UI** fallback after a spike (D-08). Own three-layer tokens; calm, compact, academic; no gradients or sparkle icons; server-side contrast guardrail for brand colours (PQ-61); open-licence self-hosted fonts; no UW or D2L logos, fonts or BrightspaceUI; GOV.UK and USWDS as pattern sources only | Changing the base later is costly; new shadcn projects default to Base UI, so pass the React Aria base explicitly (fact-check) |
| **Accessibility (Q15)** | **WCAG 2.2 AA** (AAA 2.4.13 and 1.4.6 as stretch for presentation mode); axe in Playwright plus a manual keyboard, screen-reader, zoom, reflow and forced-colours checklist; axe is never presented as conformance | Test 4.1.1 Parsing too if a WCAG 2.0 policy applies (PQ-51) |
| **Testing (§9)** [research](research/testing-strategy.md) | **Vitest 5** + **fast-check** against **real Postgres** (not PGlite); SQL catalogue assertions; **Playwright + axe**; a **canary co-occurrence scanner** over UI, RSC payloads, API, exports, logs and traces; a generated deny-by-default **role × endpoint matrix**; **dependency-cruiser** gate; weekly **StrykerJS** on privacy modules; every §10 criterion mapped to tests; within GitHub Actions Free | Stryker on Vitest 5 is **Unverified**; ESLint 10 lacks `eslint-plugin-jsx-a11y` support (D-09) |
| **Other questions** [research](research/blocking-open-questions.md) | Q1 minimal admin (A2) + `institution` table; Q7 no impersonation (I0); Q14 audit E1, E2 required, E3–E8 proposed, insert-only table + hash chain; Q16 release once after sharing closes with a residual check, **placeholder N = 10**, refuse below 3; Q17 prototype wipe notice (D4) + hooks (D2), UW retention before a pilot (D3); Q18 dates set at policy publication (W2 + F2); Q19 English, externalised strings; Q20 HMAC-keyed per-user, per-course, per-action limits with **placeholder values**, manual queue, soft delete; Q10–Q12 deferred to M2 | Each answer is needed before the dependent feature |
| **Milestones (Q2)** | The owner's goal plus a candidate feature set: **M1a** cards, then **M1b** the anonymous board after ADR 0003 and the threat model (§6.3); M2 rest of §7; M3 pilot; M4 production (section 4) | PQ-08 asks about the split and merge |

## 3. Assumptions

None of these is a requirement. Each is either stated by the spec, stated by the owner (and not
yet recorded in CONTRIBUTING), or a planning assumption that the owner can replace.

**From the spec (requirements).**

- Users and roles: Student, Instructor, Teaching assistant, Institutional administrator, with
  strict role- and course-based authorization (§5).
- First institution: the University of Waterloo, linking to LEARN, Policy 71 and the Guidelines for
  the Assessment of Penalties; everything institution-specific is admin-configurable (§4).
- The five privacy domains of §6.1 must be technically separated, and the threat model and the
  limitations of anonymity are deliverables (§6.2, §11).
- The full deliverable list is §11; production acceptance is §10.

**Stated by the owner** (in the research brief of 2026-10-11; not yet in CONTRIBUTING. Proposal:
record them under Q2 and in §16 before relying on them, §1):

- The first build is a **public prototype** that people can sign in to and use, and that looks
  polished and credible (§8).
- Running cost **under $5/month** on free tiers and managed services. The currency, tax and
  failure style are open (PQ-04).
- No corner painted for §6 (privacy) or §10–§11 (production criteria and deliverables).
- Mainstream, well-documented tools that a solo builder can use with Claude.
- The project is built with Claude one session at a time; the owner reviews and approves.

**Prototype-scale assumption** (shared by the research notes; a planning assumption, not a
requirement; the owner gave no user counts, PQ-05): about 5 pilot courses, 500 registered users,
100 daily active users, bursts of 100 concurrent users, 30,000 page views a month, 2,000 emails a
month and a database under 250 MB. One 1,000-student course is the stress case.

**Planning assumptions** (each can be overturned by an owner answer):

| Assumption | Changes if |
|---|---|
| Prototype users are demo courses and invited testers, not real UW courses | PQ-01 says real UW courses: PQ-02 (UW review) must come first, and M3-style controls move earlier |
| The operator (the owner) is inside the trust boundary for the prototype | PQ-10 says no: B topology (separate services) and the Cloud Run fallback; more sessions |
| Vercel Hobby is eligible (non-commercial, no DPA needed) | PQ-03 or PQ-02 fails: Cloud Run fallback (H4-CA), or Vercel Pro if the budget allows |
| Live push updates are not needed; periodic refresh is acceptable | PQ-17 says live: a push channel, which costs more and is outside the free tiers at stress scale |
| No third-party error reporting or analytics | PQ-12 allows one: a configured SDK plus a canary test (T-25) |
| English only, strings externalised | Q19 adds a language: translation work and PQ-57 |
| A session is one focused Claude Code working session of a few hours under the hourly API budget | Real sessions turn out shorter or longer: re-estimate after M0 |
| GitHub repository is private on GitHub Free | PQ-68 says public: CI minutes free, code exposed |

**Currency.** CAD figures use the Bank of Canada indicative rate of 1.4271 CAD per USD for
2026-10-09 (checked 2026-10-11). All prices are before tax.

## 4. Milestones

Milestones are a **Proposal** for Q2. Session counts and costs are unmeasured estimates. "Gate to
start" lists what must be answered or accepted before the milestone's first session. A feature
inside a milestone may have its own, later gate (section 5).

**Overview.**

| Milestone | Goal | Gate to start (summary) | Est. sessions | Running cost (USD/month) |
|---|---|---|---|---|
| **M0** Decisions and foundations | No product features; validate the ADRs with spikes and lay a safe foundation | Owner has reviewed the Proposed ADRs and this plan; spike preconditions answered | 8 (range 6–8) | ≈ 0–1.17 |
| **M1a** Prototype: cards | Public, sign-in-able, polished product without anonymous content | M0 done; ADRs 0001, 0002, 0004 accepted; Q1, Q15, PQ-01, PQ-02 (if real users), PQ-46 answered | 9 (7–9) | ≈ 1.12–1.17 |
| **M1b** Prototype: anonymous board | The core promise, built privacy-first | ADR 0003 **accepted** and threat model v1 approved (§6.3); integrity forks answered | 12 (9–12) | ≈ 1.12–1.17 |
| **M2** Full course lifecycle | Everything else in §7 | Q10, Q11, Q12, Q13, Q16, Q18 and Tier-3 PQs answered | 12 (10–13) | ≈ 1.2 |
| **M3** Pilot readiness | Safe for a real UW course | UW engagement (sponsor, review) | 5 (4–6) | ≈ 27; ≈ 47 with Vercel Pro |
| **M4** Production | All §10 acceptance criteria demonstrated | LEARN registration approved by UW | 12 (10–14) | ≈ 52–62 lean; ≈ 152–162 with PITR |
| **Total** | | | **58** (46–62) | |

### M0 Decisions and foundations

- **Goal.** No product features. Settle the Tier-1 decisions (section 9), test the Proposed ADRs
  with spikes, then lay the foundation every later session relies on.
- **Contents** (rows M0-01 to M0-08): throwaway spikes **outside the repository** (platform,
  privacy, auth, email, fallback host, UI base, tooling; the Vercel Hobby question is an owner
  action); threat model v1 (§6.2, §11, Q8); repository scaffold, only after ADR 0001 and 0002 are
  accepted (CLAUDE.md); database foundation (§6.1, §6.2); test tooling and deployment pipeline
  (§9, §11); design-system foundation (§8).
- **Gate to start.** The owner has reviewed ADRs 0001–0004 and this plan, and has answered the
  spike preconditions: PQ-15 (synthetic data only), PQ-16 (AI agent access to accounts and
  secrets), PQ-68 (repository visibility), PQ-42 (AWS Paid account, before M0-03) and, for S1
  only, PQ-44.
- **Exit criteria.** Spike results in `docs/research/spike-results.md`; ADRs 0001, 0002 and 0004
  accepted (or revised and accepted); ADR 0003 accepted or its remaining forks listed; threat model
  v1 approved; CI green on the empty schema with catalogue assertions, dependency rules and the
  canary scanner; a deployed placeholder page with sign-in disabled; deployment documentation v1
  and the restore runbook drafted.
- **Estimated sessions.** 8 (range 6–8; unmeasured).
- **Estimated running cost.** ≈ USD 0 until the domain and SES are set up, then ≈ 1.12–1.17
  (≈ CAD 1.60–1.67).

### M1a Prototype: cards

- **Goal.** A public, sign-in-able, polished product that holds no anonymous content.
- **Features.**
  - Sign-in by email code, sign-out, sessions (§10 "sign in securely", §11; Q4; ADR 0004).
  - Courses, enrolment and roles, including TA permission assignment (§5, §10 provisioning; Q5).
  - Institution configuration: names, policy links, policy warning, branding (§4, §7.15 minimal; Q1).
  - Course AI Card (§7.1, §7.3) and Assignment AI Cards (§7.4) through the **manual editor**
    (§7.6), with preview, drafts, publish, duplicate, archive and supersede, version history and
    change records (§7.6 "Versioning").
  - Visible overrides between Course and Assignment cards (§7.4, §10).
  - Transparency-bonus fields: requirements and links only, no uploads (§7.4, §7.5, §3).
  - Audit for shipped events (§7.17; Q14).
  - Prototype data notice (Q17), accessibility and about pages (§8, PQ-64), deployment
    documentation (§11).
- **Gate to start.** M0 exit criteria met; ADRs 0001, 0002, 0004 accepted; answered: Q1 (minimal
  admin), Q15 (WCAG target), Q19 (English, externalised strings), Q14 (events for shipped
  features), Q17 (prototype notice), PQ-01, PQ-02 (if PQ-01 says real users), PQ-06, PQ-07,
  PQ-46, PQ-49. Per-feature gates (PQ-29, PQ-39, PQ-61, PQ-62, PQ-63, PQ-67) are in section 5.
- **Exit criteria.** Every M1a feature cites its § and nothing beyond it (§15.1); §10 criteria
  1–4 have passing tests for what exists (criterion 2 only for manual provisioning); the role ×
  endpoint matrix and canary scanner pass; axe passes and the manual checklist is done for every
  M1a screen; deployed on the public domain; the cost alert is set.
- **Estimated sessions.** 9 (range 7–9).
- **Estimated running cost.** ≈ USD 1.12–1.17 (≈ CAD 1.60–1.67).

### M1b Prototype: anonymous board

- **Goal.** The core promise, built privacy-first.
- **Features.**
  - Board: ask, comment, upvote, follow, "Still unclear", report, with exactly two tags and the
    three filters (§7.2, §7.7, §10).
  - Moderation: answer, pin, recategorize, hide, delete, resolve or reopen, moderation queue, rate
    limits, duplicate warnings (§7.7; Q20).
  - Merge duplicates (§7.7, §10 "Duplicate merging preserves counts correctly"), if PQ-08 keeps it
    in milestone 1.
  - Presentation mode (§7.8).
  - Search and sorts (§7.14).
  - Private participation counter, the three levels and published thresholds, student view only
    (§7.9, §7.10 first bullet).
  - In-app notifications, a §7.13 subset (only if Q13's in-app part and PQ-21, PQ-39, PQ-43 are
    answered; otherwise this moves to M2).
  - The full negative privacy suite (§9).
- **Gate to start.** ADR 0003 **accepted** and threat model v1 approved by the owner (§6.3: "before
  any content or participation code is written"); answered: PQ-10, PQ-11, PQ-13, PQ-19 to PQ-24,
  PQ-30, PQ-33 (ADR 0003 conditions), Q20 (workflow and placeholder limits), PQ-08. Per-feature
  gates (PQ-17, PQ-25 to PQ-28, PQ-35, PQ-43, PQ-54) are in section 5.
- **Exit criteria.** §10 criteria 5–11 and 15 have passing automated tests; the whole negative
  suite (section 8) is green in CI; the limitations-of-anonymity page is live with owner-approved
  wording (if PQ-52 says in-app); the prototype definition of done (section 8) is met.
- **Estimated sessions.** 12 (range 9–12).
- **Estimated running cost.** ≈ USD 1.12–1.17 (≈ CAD 1.60–1.67). A large course polling the board
  can exceed Vercel Hobby's limits (risk K-02).

### M2 Full course lifecycle

- **Goal.** Everything else in §7, so a course can run from start to end of term.
- **Features.**
  - Card-builder wizard with fixed-rule recommendations, "Why this matters", curated resources and
    the visible decision rule (§7.6; Q10). Never a generative model setting policy (§3).
  - Change notifications to affected students (§7.6; PQ-39).
  - Email notifications as content-free digests and the notification settings page (§7.13; Q6,
    Q13).
  - Participation-policy publication with survey and sharing dates (§7.9, §7.11; Q18).
  - Student-controlled sharing, revocation and finality (§7.10).
  - Grading settings, pass/fail and ranked (§7.11; Q11), and the authorized grade result or export
    (§7.11; Q12, PQ-37).
  - End-of-course survey with verbatim questions, presented before sharing, revealed after close
    above the threshold (§7.12; Q16, Q18).
  - Analytics with snapshots and suppression (§7.16; Q16, PQ-31).
  - Audit completion (§7.17; Q14) and retention jobs (Q17).
- **Gate to start.** M1b done; answered: Q10, Q11, Q12, Q13, Q16, Q18, PQ-31, PQ-32, PQ-34, PQ-36,
  PQ-37, PQ-38, PQ-40, PQ-41, PQ-58. Each feature needs only its own questions (section 5).
- **Exit criteria.** §10 criteria 12–14 have passing tests; every §7 subsection has at least one
  shipped, tested feature or a recorded owner decision to defer it; the threat model is updated for
  sharing, survey and email.
- **Estimated sessions.** 12 (range 10–13).
- **Estimated running cost.** ≈ USD 1.2 (≈ CAD 1.71); SES grows with digests (Estimate).

### M3 Pilot readiness

- **Goal.** Safe for one real UW course.
- **Contents.** UW sponsor and Information Risk Assessment (PQ-02); Supabase Pro (backups, no
  pausing) and a restore drill; Vercel Pro or a move to Cloud Run if required (PQ-03, PQ-02);
  threat model published and the user-facing limitations page live; a security review checklist;
  an external accessibility review if the owner funds one (PQ-51, PQ-64); retention set with UW
  (Q17 option D3, PQ-53); "Sign in with Microsoft" if UW allows (PQ-44).
- **Gate to start.** UW engagement: a sponsor and agreement on the review (PQ-02); PQ-05 (pilot
  scale) answered.
- **Exit criteria.** The review's conditions are met and recorded; the restore drill has passed on
  the paid tier; the owner signs off the pilot.
- **Estimated sessions.** 5 (range 4–6).
- **Estimated running cost.** ≈ USD 27 (Supabase Pro), ≈ 47 with Vercel Pro (≈ CAD 38.5 / 67).

### M4 Production

- **Goal.** Every §10 acceptance criterion demonstrated by an automated test.
- **Contents.** LTI 1.3 launch with just-in-time provisioning, Deep Linking, AGS and optional NRPS
  (§10 "provisioned through supported integrations"; Q5, PQ-50); full administration (§7.15, Q1);
  multi-institution configuration (§4); production hosting and residency (PQ-09); optional B
  topology and KMS (PQ-10, PQ-13); the §6.4 exceptional process **only if institutional policy
  requires it**; the full §10 acceptance suite.
- **Gate to start.** LEARN registration approved by UW; Q5's ADR accepted; PQ-09 and PQ-50
  answered.
- **Exit criteria.** All fifteen §10 checkboxes have passing tests; §11 deliverables complete;
  production hosting accepted by UW's review.
- **Estimated sessions.** 12 (range 10–14).
- **Estimated running cost.** ≈ USD 52–62 lean, ≈ 152–162 with point-in-time recovery
  (≈ CAD 74–88 / 217–231); institution-hosted is unknown.

## 5. Build order: session plan

About **58 sessions** (unmeasured). Each session is one focused Claude Code working session that
ends with a pull request on a short-lived branch (§14) and the §15 definition of done. Sessions run
in order unless a row says otherwise. A session whose dependency is unanswered **stops and asks**;
it never picks an answer (§13, CLAUDE.md).

**Rules for every row.**

- **No content or participation code before ADR 0003 is accepted and threat model v1 exists**
  (§6.3). In practice: nothing that writes or reads anonymous content, tags, counters, levels,
  shared results or survey data before M1b-01.
- **Privacy tests first.** Where a row touches identity or anonymous content, the negative tests
  listed are written (and fail) before the feature code, then pass with it (§9, §15.3).
- **Test names.** `T-nn` are the privacy tests in
  [research/privacy-architecture.md](research/privacy-architecture.md) section 6.14 and its
  testing companion; dotted names (`auth.*`, `card.*`, `neg.*`, `prop.*`) are the §10 test map in
  [research/testing-strategy.md](research/testing-strategy.md). "Canary scan" means the
  co-occurrence scanner runs over the session's new pages, responses, exports and captured logs.
- **Every UI row** also needs axe in Playwright for each new screen and state, keyboard-flow tests,
  and the manual checklist before its milestone closes (Q15).
- **Screen IDs** (S1–S24) are the candidate milestone-1 screen inventory in
  [research/design-system-and-accessibility.md](research/design-system-and-accessibility.md).

### M0 Decisions and foundations (8 sessions)

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M0-01** | Platform spikes, in a throwaway folder **outside the repo**: spike 1 (Next.js on Vercel `yul1` + Supabase `ca-central-1` through Supavisor), spike 3 (capture one real Vercel runtime-log entry and one Supabase `postgres_logs` entry), spike 4 (CI migrations through the IPv4 session pooler; read Supabase's Postgres major version) | §6.2, §9, §12 | ADR 0001, ADR 0002; stack research section 6.7 | `docs/research/spike-results.md` (first sections); proposed ADR 0001/0002 updates for the owner | Each spike's pass/fail measure (section 11) | PQ-15, PQ-16, PQ-68 |
| **M0-02** | Privacy spikes on the same scratch deployment: T-21 (`xmin`/`ctid` through tables, views, functions), T-33 (driver and pooler never put parameters in logged literals), T-31 (merge HMAC timing at realistic roster size), S2/T-24 (Better Auth session row unchanged across requests with refresh off; IP/UA empty if possible; tables confined to `cc_auth`; cookie attributes) | §6.2, §6.3, §7.7, §10 | ADR 0003, ADR 0004 | spike-results.md (privacy and auth sections); proposed ADR 0003/0004 updates | Spike measures | PQ-48 (informs) |
| **M0-03** | Email, fallback and tooling spikes: spike 5 + S3 (SES `ca-central-1` on the AWS Paid plan, production access requested, content-free code email to a UW mailbox, Safe Links behaviour noted); spike 2 (same image on Cloud Run `northamerica-northeast1`, cold start, routing priced); spike 7 (`shadcn init` with the React Aria base, every needed component present); Stryker on Vitest 5; CI minutes measured; optional S1 (Entra consent) | §7.13, §8, §9, §10 | ADR 0002, ADR 0004; design research | spike-results.md (complete); recommendation for decision D-08 (UI base) and D-09 (lint stack) | Spike measures | PQ-42; PQ-44 (S1 only) |
| **M0-04** | Threat model v1 and ADR revisions: `docs/threat-model/README.md` with the 15-section outline, the vendor log inventory from spike 3, the limitations-of-anonymity list; a draft in-app limitations text for the owner; ADR texts revised from the spike results (still Proposed) | §6.2, §6.3, §11 | Spike results; privacy research section 7 | Threat model v1 (owner approves); revised ADRs; owner then accepts ADRs 0001, 0002, 0004 (and 0003 when its forks are answered) | — (docs only) | Q8, PQ-10, PQ-11, PQ-52 |
| **M0-05** | Repository scaffold (only after ADR 0001 and 0002 are accepted): pinned Next.js 16.x and Node line, TypeScript strict, lint and format per D-09, Vitest, Playwright + @axe-core/playwright, dependency-cruiser rules, GitHub Actions jobs `check`, `db-api`, `e2e` with a Postgres service at Supabase's major version, `output: standalone` container build, Dependabot, `.env.example`; CLAUDE.md "Stack" and "Commands", README status, CONTRIBUTING §12 and §16 updated with the owner's approval | §11, §12, §14, §15 | ADR 0001, ADR 0002 (accepted) | Scaffolded repo; green CI | CI green; a deliberately forbidden cross-domain import fails the dependency rule; axe runs on a placeholder page | PQ-12, PQ-18, PQ-68 |
| **M0-06** | Database foundation: schemas per §6.1 plus `catalog` and cross-cutting schemas; roles `cc_owner`, `cc_fn_*`, `cc_web`, `cc_link`, `cc_auth`, `cc_jobs`, `cc_migrate`; Supabase hardening (Data API off, default grants revoked, nothing in `public`); CI-only migration pipeline into a protected environment; logging settings; `institution` table in `catalog`; linkage-module skeleton (KEK load, `K_c` wrap and unwrap, HKDF derivations; no SQL use yet). If ADR 0003 is not yet accepted, build only `catalog`, `identity`, `auth_private`, `audit` and the pipeline, and leave the rest for M1b-01 | §6.1, §6.2, §11 | ADR 0001, ADR 0002; ADR 0003 store and role layout | Migrations; catalogue suite; linkage skeleton | T-01 to T-08, T-30 against the empty schema; key material never logged (T-17 subset); unkeyed-hash vectors (T-19 unit form) | ADR 0003 status; PQ-13, PQ-16 |
| **M0-07** | Test tooling and deployment pipeline: canary seeding helper and co-occurrence scanner (L6) as the last CI step; role × endpoint matrix generator with `authz.policy-complete`; Vercel project in `yul1` (or Cloud Run), per-environment variables, previews on the synthetic project; nightly per-domain encrypted dumps; weekly synthetic check; budget alerts; deployment documentation v1 and restore runbook draft | §9, §11 | ADR 0002 | CI with scanner; deployed placeholder; docs | Scanner self-test (planted canary pair is detected); a route without a policy fails `authz.policy-complete`; `/rest/v1/` answers nothing (T-30) | PQ-14, PQ-15, PQ-70 |
| **M0-08** | Design-system foundation: shadcn with the chosen base (D-08), three-layer tokens, calm palette, typography with self-hosted open-licence fonts, layout shell (skip link, header, course navigation, breadcrumbs), core components from the spike list, error / not-found / no-access pages (S24), externalised strings (Q19 L1), server-side contrast guardrail | §4, §8 | ADR 0001 item 8; design research | Component library and shell | Guardrail unit tests; axe on every shell state; keyboard-flow tests; error pages leak no data (§6.2) | Q15, Q19, PQ-07, PQ-59, PQ-61, PQ-64 (dark mode) |

### M1a Prototype: cards (9 sessions)

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M1a-01** | Auth core: Better Auth in `auth_private` through `cc_auth`; email OTP with hashed codes and tokens; refresh off; cookie attributes; UUIDs; implicit linking and admin plugin off; mailer port with SES adapter and a Resend dev adapter; domain allow-list from institution config; send and verify limits | §5, §6.2, §10, §11 | ADR 0004 (accepted), ADR 0002 | Sign-in back end | `auth.session-cookie-flags`; T-24; impersonation route returns 404; non-allow-listed domain rejected on send and verify; `auth.forged-session-generic-error`; canary scan of auth logs and errors | PQ-42, PQ-45, PQ-47, PQ-48; Q20 (sign-in limits, placeholders) |
| **M1a-02** | Sign-in UI and session lifecycle: S1 with one code field that accepts paste and autofill (`autocomplete="one-time-code"`, WCAG 3.3.8), error summary; sign-out; session lifetime per PQ-47; S2 "My courses" with empty state; "Sign in with Microsoft" only if S1 passed and PQ-44 allows | §8, §10 | ADR 0004 | Sign-in screens | `auth.sign-in-happy-path` (E2E per role); `auth.no-session-fixation`; `auth.sign-out-invalidates`; axe and keyboard | PQ-44, PQ-47, PQ-63 |
| **M1a-03** | Audit log foundation: L1 insert-only table with a trigger rejecting UPDATE and DELETE, L2 hash chain and a verify job; event types for the approved list; ids only; date precision | §7.17, §11 | Q14 answer | Audit module | UPDATE/DELETE rejected; tampering detected by the verify job; `neg.log.audit-identity-free` | Q14, Q17 (retention placeholder) |
| **M1a-04** | Institution configuration and admin bootstrap: §4 configurables (names, links with the Policy 71 and Guidelines defaults, policy language, policy warning, branding, LMS configuration placeholder) in the `institution` table; admin bootstrap per PQ-46; S22 branding with the contrast guardrail; E7 audit | §4, §7.15 | Q1 answer (A2) | Admin settings | Only admins reach the routes (matrix); guardrail tests; E7 rows; axe | Q1, PQ-46, PQ-55, PQ-61 |
| **M1a-05** | Courses, enrolment and roles: vetted instructors create courses; join link or code (hashed, expiring, revocable, rotatable, rate-limited); TA single-use invite with no permissions until assigned; TA permission assignment; member view with names, roles and statuses only; (issuer, sub) data model incl. empty `lti_*` tables | §5, §10 | Q5 prototype approach; prototype-auth research 6.4–6.5 | Course and membership module | `provision.role-change-takes-effect`; `provision.no-cross-course-leak`; `authz.matrix` for every TA permission combination; T-18 (UUIDv4); join token stored only as a hash | Q5, PQ-06, PQ-29, PQ-46, PQ-49, PQ-67 |
| **M1a-06** | Course AI Card through the manual editor: every §7.3 field; conditional required fields when AI is permitted; the verbatim default principle; policy links from institution config; configurable warning; drafts; preview as student (S4, S10, S11) | §7.1, §7.3, §7.6 | Design foundation | Course card editor and view | `card.verbatim-defaults`; `card.permitted-requires-fields`; preview equals the student view; axe | Q15, PQ-63 |
| **M1a-07** | Assignment AI Cards: every §7.4 field; configurable opening statement with the verbatim default; states; LEARN submission link; transparency-bonus requirements and links only (§7.5); override comparison (S5, S6) | §7.4, §7.5, §3, §10 | Course card module | Assignment cards | `card.override-visible`; `card.states`; no upload route or file column exists (§3); manual check that differences are not shown by colour alone | PQ-62, PQ-63 |
| **M1a-08** | Publish and versioning: publish; rules visible at each point in time preserved; change record (what, why, effective date, applies to work underway) in S12; version history S7; duplicate, archive, supersede; E3 audit. The "students are notified" part is only recorded here | §7.6, §7.17, §10 | Audit module | Versioning | `card.versioning`; `card.create-edit-preview-publish` (E2E); E3 rows | Q14 (E3), PQ-39 (recorded for later) |
| **M1a-09** | M1a release: prototype data notice (owner-approved copy) and lifecycle hooks (Q17 D4 + D2); accessibility statement and about pages if wanted; manual accessibility checklist for every M1a screen; deployment docs and a restore drill; public domain live | §8, §11, §15 | All M1a rows | Public prototype (cards) | §10 criteria 1–4 tests green (2 for manual provisioning only); full canary scan; checklist recorded | PQ-01, PQ-07, PQ-64, Q17 |

### M1b Prototype: anonymous board (12 sessions)

**Hard gate before M1b-01:** ADR 0003 status is Accepted, threat model v1 is approved, and the ADR
0003 conditions (PQ-10, PQ-19 to PQ-24, PQ-30, PQ-33, the four spikes) are met (§6.3).

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M1b-01** | Privacy core write path: `content`, `content_tags`, `participation`, `keys` schemas and `cc_fn_*` definer owners (if not built in M0-06); linkage module live: `K_c` per course at creation and back-filled for existing courses, counters pre-created at enrolment in random order (and back-filled), `ask_question` and `post_comment` with Mode S credit | §6.1–§6.3, §7.7, §7.9 | ADR 0003 (accepted); threat model v1 | Write path through `cc_link` | **Written first:** T-01 to T-08 updated for the new tables, T-02 (column allow-list), T-12 (stray grant returns 0 rows), T-13, T-19, T-21 on real tables, T-22 (only the linkage module imports `cc_link`), T-32 (demonstrates the Mode S `xmin` limitation) | PQ-19, PQ-22, PQ-24, PQ-30 |
| **M1b-02** | Board read path and asking: `read_board` and `read_question` through definers; exactly two tags; filters All, Course, one assignment; S13 and S14 with the anonymity notice (owner-approved copy); new item shown from the POST response; duplicate warnings as search assistance only, never denying credit | §3, §7.2, §7.7, §8 | M1b-01 | Board pages | `tags.two-only`; T-09 (board routes); T-14 (staff pages never show canary name beside canary text); T-18 (no GET of a new id); canary scan; axe | PQ-24, PQ-28, PQ-63 |
| **M1b-03** | Interactions: comments; upvote with tag de-duplication; follow; "Still unclear"; report stored without reporter identity; `item_tag_sets` with membership tested in the app (S15) | §7.7, §7.9 | M1b-02 | Question detail | T-11 (upvote twice → total +1, counter +1); T-23; T-29 (no auto-follow on asking); `prop.counter.only-qualifying` (follows, reports and "Still unclear" earn nothing); report rows identity-free | PQ-20, PQ-21, PQ-22, PQ-25 |
| **M1b-04** | Rate limits and abuse controls: buckets keyed by `HMAC(K_rl, user‖action)`; per-IP limits on unauthenticated endpoints; payload size limits; admin-visible configuration holding the **placeholder** values; generic errors | §6.4, §7.7 | Q20 answer | Rate-limit module | Limits enforced per action; bucket rows hold no user id or IP (T-20 coverage); canary scan of limit errors | Q20, PQ-11, PQ-23 |
| **M1b-05** | Moderation: answer, pin, recategorize between Course and an assignment, hide, delete (soft), resolve, reopen; moderation queue S16; TA permissions enforced; E1 audit with ids only | §5, §7.7, §7.17, §10 | Audit module; M1b-03 | Moderation | `neg.api.moderation-identity-free`; `neg.api.report-queue-identity-free`; `authz.matrix` for every TA permission combination; `tags.recategorize`; T-15; E1 rows ids-only | Q20 (workflow), PQ-26, PQ-27, PQ-67 |
| **M1b-06** | Merge duplicates (only if PQ-08 keeps it in milestone 1): `merge_fetch` and `merge_commit` in the linkage module; redirect old links; comments moved; answers and open reports per PQ-25; ids-only audit; two-step S17 | §7.7, §10 | ADR 0003 merge algorithm | Merge flow | T-11 property tests (`prop.merge.union`, `prop.merge.credit-preserved`, `prop.merge.comments-preserved`, `prop.merge.redirect`); tombstoned voter still de-duplicated; T-31 re-measured on the host | PQ-08, PQ-20, PQ-25 |
| **M1b-07** | Search and sorts within the current course: all, course, specific assignment, unanswered, answered, pinned, resolved, most upvoted, most recent (bucketed times) | §7.14 | M1b-05 | Search | T-15; `search.no-hidden`; canary scan of results | PQ-24 |
| **M1b-08** | Presentation mode: staff select a question; snapshot of upvote total, answer and status; only the §7.8 "Display" items; large type; keyboard next and previous (S18) | §7.8, §10 | M1b-05 | Presentation view | `present.exclusions`; T-14 (total unchanged after a new upvote until re-selected); scanner over presentation DOM and network; axe | PQ-17, PQ-35, PQ-64 (projector check) |
| **M1b-09** | Private participation: `my_participation`; exactly three levels; threshold publication with versioning and the disadvantage guard; S19 with question, comment and upvote counts, level and published thresholds; no staff route to any counter | §7.9, §7.10 (first bullet), §10 | ADR 0003 | Student participation view | `prop.level.three-levels`; `level.enum-closed`; `prop.level.no-received-upvotes`; T-10; T-35; matrix proves no staff counter route | PQ-30, PQ-33 |
| **M1b-10** | In-app notifications (a §7.13 subset): compute-on-read for followed items; seen marker per PQ-43; card-change notices to enrolled students; notifications centre (in-app part of S21). **If its questions are unanswered, this row moves to M2** | §7.6, §7.13 | ADR 0003 notification policy | In-app notifications | No per-user row holds a question id (T-20 coverage); T-29; canary scan; live-region announcement tested | Q13 (in-app), PQ-21, PQ-39, PQ-43 |
| **M1b-11** | Negative-suite hardening: whole-suite log capture (T-17); T-33 through the production driver and pooler; T-20 dump replay and dump diff; T-25 (only if PQ-12 allows a tool); T-34; `jobs.wash` and T-32 after wash; daily `jobs.privacy_selfcheck` in production; "break it" tests for each SQL safeguard; first Stryker run; CI artefact retention shortened | §9, §10, §15 | All M1b rows | Hardened suite | The listed tests; every safeguard's "break it" test fails when the safeguard is removed | PQ-65, PQ-66, PQ-69, PQ-70 |
| **M1b-12** | Prototype release: limitations page live (owner-approved copy) if PQ-52 says in-app; threat model v1.1 with real log fields; manual accessibility checklist for every M1b screen; deployment docs and restore drill; prototype definition of done (section 8); audit of §13 dependencies for every shipped feature | §6.2, §8, §11, §15 | All M1 rows | Public prototype (board) | §10 criteria 1, 3–11 and 15 green (2 for manual provisioning); full canary scan | PQ-52, PQ-54, Q17 |

### M2 Full course lifecycle (12 sessions)

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M2-01** | Email notifications: outbox; one generic, content-free template (owner-approved copy); fixed-time daily digest (Vercel cron limits are **Unverified**; fallback a GitHub Actions schedule calling an authenticated endpoint); outbox rows deleted after send; links only to `/notifications`; tracking off; settings page where users manage nonessential notifications | §6.2, §7.13 | ADR 0002 (email), ADR 0003 (notification policy) | Email channel and settings (S21) | T-28 (single template, no question id, title, text or level; outbox empty after the job); essential toggles locked; axe | Q6, Q13, PQ-38, PQ-40, PQ-41, PQ-42 |
| **M2-02** | Remaining notification types: card change to affected students (§7.6), question merged, participation level reached, end-of-course survey available, sharing window open, per the recipient rules | §7.6, §7.13 | M2-01 | All eight §7.13 types wired | Recipient sets per PQ-21 and PQ-39; level-reached email states no level unless PQ-40 allows; canary scan | PQ-21, PQ-38, PQ-39, PQ-40 |
| **M2-03** | Wizard engine: owner-supplied rule table and curated resources stored as data; deterministic evaluation; each recommendation carries its visible decision rule | §3, §7.6 | Q10 answer | Rule engine | Every rule-table row gives its expected recommendation; `prohibited.absent` (no generative-model SDK in the dependency tree or code path) | Q10, PQ-58 |
| **M2-04** | Wizard UI: the 12 questions (S9) with short explanation, "Why this matters", resources and decision rule; reject, edit, add custom language, skip, save draft, hand-off to the manual editor | §7.6, §8 | M2-03 | Wizard | E2E through all 12 questions; skip path; axe | Q10, PQ-63 |
| **M2-05** | Participation policy publication: thresholds (from M1b-09), grading scheme reference, survey-open, sharing-open and sharing-close dates; shown to students from the start; date-change rule | §7.9, §7.10, §7.11, §7.12 | Q18 answer (W2 + F2 proposal) | Policy publication | Scheme and thresholds must be published before participation; date-change rule per PQ-34 | Q18, PQ-33, PQ-34 |
| **M2-06** | Student-controlled sharing: `share_level`, `revoke_share`; the verbatim §7.10 text before confirmation; clear explanation of when sharing becomes final; S20; `shared.results` holds name, verified level, threshold version and date shared | §7.10, §10 | ADR 0003 | Sharing | T-36; `share.student-alone`; `share.revoke-until-final`; `share.only-level`; `neg.timing.share-output` | PQ-34, PQ-37, PQ-49 |
| **M2-07** | Grading settings: pass/fail (instructor picks Contributor or Sustained Contributor) and ranked (published value per level); published before students participate; never a final grade | §3, §7.11 | Q11 answer | Grading settings | Scheme locked after participation starts; no route computes a final grade | Q11 |
| **M2-08** | Result and export: `finalize_shared`; the authorized grade result or an export with exactly the §7.10 fields plus the Q12 format fields; E8 audit; finality enforced | §7.10, §7.11, §10 | Q12 answer | Export | T-16; `neg.export.columns`; revoke fails after export or apply | Q12, PQ-37 |
| **M2-09** | End-of-course survey: `survey` and `survey_private`; the three verbatim questions; completion flag without time; buffer flushed in random order; presented before sharing, available without sharing, no credit | §6.1, §7.12, §10 | ADR 0003 survey separation | Survey | `survey.separate-store`; `schema.survey-separate`; submission does not change counters; response rows have no metadata columns (T-27 part) | Q16, Q18, PQ-32 |
| **M2-10** | Survey results and analytics: survey text revealed only after close and above the threshold, in random order; course aggregates (§7.16) as frozen snapshots; level distribution per the agreed rule shape with suppression and hidden once sharing opens | §7.12, §7.16 | Q16 answer | Analytics pages (plain tables) | T-26; T-27 (rest); `neg.analytics.suppression`; `survey.instructor-aggregate-only` | Q16, PQ-31, PQ-35, PQ-36 |
| **M2-11** | Audit completion and retention: approved E3–E8 events complete; retention jobs with placeholder periods; end-of-term seal option if chosen (R1 crypto-shred); account removal with enrolment tombstones | §7.17, Q17 | Q14, Q17 answers | Lifecycle jobs | Seal job removes exactly the listed rows; merges stay exact with tombstones (T-11); E3–E8 rows ids-only | Q14, Q17, PQ-54 |
| **M2-12** | M2 release: §10 criteria 12–14 green; threat model updated for sharing, survey and email; manual accessibility checklist on M2 screens; deployment docs; Mode B switch only if the owner chose it under PQ-30 | §9, §10, §11, §15 | All M2 rows | Full-lifecycle prototype | All §10 tests that exist so far green; canary scan | PQ-30 (if changed) |

### M3 Pilot readiness (5 sessions)

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M3-01** | Paid tiers: Supabase Pro in `ca-central-1` (daily backups, no pausing); Vercel Pro or the Cloud Run move if required; restore drill on the paid tier; budget alerts updated | §11 | ADR 0002 evolution path | Pilot hosting | Restore drill passes; catalogue suite and self-check green on the new project | PQ-02, PQ-03, PQ-04, PQ-05 |
| **M3-02** | Review package for UW: published threat model, data inventory per domain, vendor list with regions and log retention, limitations page final, inputs for the Information Risk Assessment | §6.2, §11 | Threat model | Review package | — (docs) | PQ-02, PQ-09, PQ-11, PQ-14 |
| **M3-03** | Security review checklist (proposal): dependency audit, secrets and KEK custody, key rotation runbook, incident response, KMS for the KEK if the review asks | §6, §11 | ADR 0003 key management | Checklist and runbooks | Key rotation re-wraps every `K_c` and the suite stays green | PQ-16, PQ-69 |
| **M3-04** | Accessibility review and fixes: external audit and JAWS testing if funded; projector check for presentation mode; VPAT/ACR if UW requires one | §8 | Q15 | Review results and fixes | Regression tests for every fixed issue | PQ-51, PQ-60, PQ-64 |
| **M3-05** | Retention with UW (Q17 option D3) and "Sign in with Microsoft" if UW allows | §10, Q17 | UW answers | Retention config; Entra sign-in | Retention jobs per the agreed periods; tenant pinning, `iss`/`tid` validation, guests rejected | Q17, PQ-44, PQ-53 |

### M4 Production (12 sessions)

| ID | Goal | § refs | Inputs | Outputs | Tests required | Depends on |
|---|---|---|---|---|---|---|
| **M4-01** | LTI 1.3 core on `jose`: login initiation with single-use hashed `state` and `nonce`; launch validation with every Security Framework check; tool JWKS with `kid` and overlapping rotation; saLTIre | §10 | Q5 ADR (accepted) | LTI core | Bad signature, wrong `aud`, replayed nonce, unknown deployment, missing `sub` all rejected | Q5, PQ-50 |
| **M4-02** | Just-in-time provisioning and role mapping: person (iss, sub), course binding (deployment, context_id), membership source `lti_launch`; Moodle in Docker | §5, §10 | M4-01 | Provisioning | `provision.import-creates-roles`; `provision.idempotent-reimport`; TA sub-role gets no permissions; Learner + Instructor in one context blocked | PQ-29, PQ-50 |
| **M4-03** | Deep Linking for board and card links | §10 | M4-02 | Deep links | Round trip on Moodle | PQ-50 |
| **M4-04** | AGS: an instructor-clicked "apply to LEARN gradebook" posting only the published value per shared level | §7.10, §7.11 | M2-08 | Grade passback | No comment field sent; revoke fails after apply | PQ-37, Q12 |
| **M4-05** | NRPS (optional): drops and TA discovery only | §5 | M4-02 | Roster sync | Re-sync is a no-op when unchanged (no `xmin` change, T-21 (c)) | PQ-50 |
| **M4-06** | Registration: Dynamic Registration and a manual admin form; staging and production domains; new-window launch | §4, §10 | M4-01 | Registration | Browser launch tests (Safari, Firefox, Chrome) | PQ-50 |
| **M4-07** | Full administration as Q1 defines it | §7.15 | Q1 answer | Admin features | Matrix: admins cannot reach any `my_*` or linkage function (T-34) | Q1, PQ-55 |
| **M4-08** | Multi-institution configuration: per-institution settings and keys | §4 | Q1 | Institution switch | Per-institution isolation tests | Q1 |
| **M4-09** | Production hosting and residency: chosen host and region, KEK in a KMS, platform-log retention, backup and point-in-time-recovery choice | §6.2, §11 | ADR 0002 evolution path | Production environment | Catalogue suite, self-check and restore drill on production | PQ-09, PQ-11, PQ-14 |
| **M4-10** | Optional separated topology (B): participation, linkage and survey in separate deployments with their own secrets, only if PQ-10, PQ-13 or a UW review requires it (may be zero sessions) | §6.1, §6.2 | New ADR | Split deployments | Each deployment holds only its own secret | PQ-10, PQ-13 |
| **M4-11** | Production sign-in: what PQ-47 requires (UW SSO through Entra or SAML, or LTI-only access), staff MFA or passkeys if required | §10 | New or revised ADR | Production auth | `auth.*` suite on the production path; Keycloak container as the CI identity provider | PQ-44, PQ-47 |
| **M4-12** | Full §10 acceptance suite and production definition of done; final deployment documentation | §9, §10, §11, §15 | All rows | Production release | All fifteen §10 criteria green | All Prod-tier questions |

The §6.4 exceptional deanonymization process is **not** in this plan. It is built only if
institutional policy requires it, through its own ADR, with all six §6.4 conditions.

## 6. Running cost per phase

USD per month, before tax; CAD at 1.4271 (Bank of Canada, 2026-10-09, checked 2026-10-11). Usage
beyond the prototype-scale assumption (section 3) is unknown (PQ-05), so later phases are ranges
with named triggers. Figures come from the stack judge and
[research/stack-and-hosting.md](research/stack-and-hosting.md) section 6.6; this plan did not
re-check prices.

| Phase | Line items | USD/month | CAD/month | What triggers the step up |
|---|---|---|---|---|
| **M0 before accounts** | Nothing billable (spikes on free tiers) | ≈ 0 | ≈ 0 | Buying the domain; SES production use |
| **M0 end, M1a, M1b (Stack R)** | Vercel Hobby $0 · Supabase Free $0 · SES ~2,000 messages × $0.10/1,000 = $0.20 · domain $0.92–0.97 (Porkbun `.com` $11.08 or `.ca` $11.61 a year; Porkbun does not name the currency) · GitHub Free $0 | **≈ 1.12–1.17** | **≈ 1.60–1.67** | — |
| Same, on the fallback (H4-CA) | Cloud Run free tier $0 · Supabase Free $0 · SES $0.20 · domain $0.97 · registry and secrets cents (rates **Unverified**) · Firebase Hosting or load balancer: **Unverified** | ≈ 1.2 + routing (**Unverified**) | ≈ 1.7 + routing | PQ-03 or PQ-02 rules out Vercel Hobby |
| **M2** | As above; SES grows with digests (Estimate) | ≈ 1.2 | ≈ 1.71 | Email volume above the assumption |
| **M3 pilot, minimum** | Supabase Pro "from $25/month" incl. $10 compute credits · Vercel Hobby if still eligible · SES ≤ $1 · domain ~$1 | **≈ 27** | ≈ 38.5 | A UW sponsor and review, real student volume, or any need for backups, no pausing or a DPA (PQ-01, PQ-02) |
| **M3 pilot, with Vercel Pro** | + Vercel Pro "$20 per user / month" (one seat) | **≈ 47** | ≈ 67 | Hobby ineligible (PQ-03) or a DPA required (PQ-02) |
| M3 pilot via Cloud Run | Supabase Pro $25 + Cloud Run (`min-instances = 1` rate **Unverified**) + routing (**Unverified**) + SES + domain | ≈ 27 + Unverified lines | ≈ 38.5 + … | Same, choosing Cloud Run over Vercel Pro |
| **M4 production, lean** | Vercel Pro $20 + Supabase Pro $25 + compute upgrade to Small "~$15" (net ≈ $5 after the credit, Estimate) + SES + domain | **≈ 52–62** | ≈ 74–88 | LEARN registration approved; production load |
| M4 production, with point-in-time recovery | + PITR "$100 per month per 7 days retention" (needs at least Small compute) | **≈ 152–162** | ≈ 217–231 | The owner or UW requires PITR |
| M4 production, institution-hosted | UW infrastructure and support | **Unverified** | — | PQ-09 or a UW review requires it |
| Stress case: one 1,000-student course polling live | Outside every free tier | ≥ pilot tier | ≥ pilot tier | PQ-17 requires live updates |

**Not yet priced** (each is **Unverified** until a session checks the official page): a cloud KMS
for the KEK (M3/M4), object storage for encrypted dumps (PQ-14), an external accessibility audit or
JAWS licence (PQ-64), an external security review (PQ-69).

**Budget test.** If the owner's "$5" is CAD including tax, USD headroom is about 3.1
(CAD 5 ÷ 1.13 ÷ 1.4271), assuming 13% HST applies (whether it applies to these vendors is
**Unverified**). Stack R fits either way (PQ-04).

**Failure style at a free-tier limit** (PQ-04): a Vercel Hobby cap means an outage of up to 30 days,
not a bill; Supabase Free pauses after a week idle; GitHub Actions Free is blocked, not billed,
without a payment method. Cloud Run (fallback only) can bill: use a spend cap if eligible, else the
billing-disable pattern, plus `max-instances`.

**Sources** (all checked 2026-10-11, via the research notes):
<https://vercel.com/docs/plans/hobby> (Hobby terms and the Pro price as quoted by the stack
research); <https://supabase.com/pricing>;
<https://supabase.com/docs/guides/platform/compute-and-disk>;
<https://supabase.com/docs/guides/platform/backups>; <https://aws.amazon.com/ses/pricing/>;
<https://porkbun.com/tld/ca>; <https://porkbun.com/tld/com>;
<https://docs.github.com/en/billing/concepts/product-billing/github-actions> (GitHub Actions
minutes and the blocked-not-billed behaviour).

## 7. Risks register

Likelihood and impact are judgements (H high, M medium, L low). Mitigations are **Proposals**.

### 7.1 Platform and hosting

| ID | Risk | L / I | Mitigation | Owner decision |
|---|---|---|---|---|
| K-01 | Vercel Hobby judged commercial, or a DPA is required | M / H | Answer before ADR 0002; ask Vercel support in writing; keep the container build green so Cloud Run is a deploy, not a rewrite | PQ-03, PQ-02 |
| K-02 | Vercel Hobby cap hit (Active CPU 4 h, 1M invocations) → up to 30-day lockout mid-term | M / H | No auto-refresh on student devices; cached aggregates with ETags; weekly usage review; spike 1 measures CPU per request | PQ-17, PQ-04 |
| K-03 | Supabase Free pauses after a week idle (between terms, before a demo) | M / M | Weekly synthetic sign-in check (ask Supabase whether it counts as activity); restore runbook; Supabase Pro for the pilot | — |
| K-04 | No backups on Supabase Free; operator error or a bad migration loses data | M / H | Nightly per-domain encrypted dumps; documented restore drill (§11); migrations only from CI | PQ-14 |
| K-05 | Supabase default grants or the Data API expose tables | L / H | Data API off; default privileges revoked; T-30 checks `/rest/v1/`; catalogue assertions. Per the privacy-A note, the platform default changes on 2026-10-30 (not re-checked) | — |
| K-06 | Identity and content co-occur in platform logs (path, query, user agent, IP) | M / H | POST bodies only; opaque ids; field allow-list logger; no `proxy.ts`; inspect a captured log entry (spike 3); document IP + time correlation as a limitation | PQ-11 |
| K-07 | Email sign-in breaks: SES sandbox, AWS Free-plan closure, daily caps, junk folder or link scanners | M / H | AWS Paid plan; production access requested early; budget alert; Resend fallback adapter behind the same port; S3 deliverability spike | PQ-42 |
| K-08 | Critical advisories in Next.js or Better Auth | H / H | Pin versions; Dependabot; patch within days; minimal plugins; upgrade runbook | — |
| K-09 | CI cannot reach Supabase (IPv6-only direct connection) | Unknown / M | IPv4 session pooler for migrations; spike 4 | — |
| K-10 | CI Postgres major version differs from Supabase's (false-green RLS tests) | M / M | Read the version at scaffold time; pin the CI image | — |
| K-11 | Preview deployments touch real data | L / H | Previews only on the synthetic-data project; per-environment variables | PQ-15 |
| K-12 | Cloud Run fallback routing cost or cold starts make it unattractive | M / M | Price Firebase Hosting and a load balancer before needing them (spike 2) | — |
| K-13 | A UW review imposes hosting or residency conditions nobody knows yet | M / H | Portability: container build, plain Postgres, no vendor auth, no Data API, no Vault | PQ-02, PQ-09 |

### 7.2 Privacy and correctness

| ID | Risk | L / I | Mitigation | Owner decision |
|---|---|---|---|---|
| K-14 | Privacy drift: a later migration adds a grant, column, view or definer that reopens a join | M / H | Change control C-22; catalogue suite on every migration and daily in production; "break it" tests per safeguard | — |
| K-15 | Mode S residual link: content and counter rows share `xmin` until the next action or the nightly wash | Known / M | Documented limitation; nightly wash; Mode B as a no-migration upgrade | PQ-30, PQ-10 |
| K-16 | Merge too slow at realistic roster sizes | L–M / M | T-31 spike; job-based merge fallback | — |
| K-17 | Better Auth cannot disable refresh, suppress IP/UA or stay confined to `cc_auth` | M / M | Spike S2; fallback to a thin session layer of our own | PQ-48 |
| K-18 | A third-party SDK sends request bodies, IP or user context (Sentry collects them by default) | L / H | None unless PQ-12 allows one; then explicit `dataCollection` and T-25 | PQ-12 |
| K-19 | Small classes: aggregates, survey text or writing style identify students | H (inherent) / M | Suppression with N; reveal only after close; limitations page | Q16, PQ-36, PQ-52 |
| K-20 | Automated accessibility checks pass while real assistive-technology users fail | M / M | Manual checklist per milestone; never claim conformance from axe; external review before production | PQ-51, PQ-64 |
| K-21 | Trademark or implied affiliation (D2L, UW marks) | L / M | No UW or D2L logos, fonts or BrightspaceUI; a "not an official UW service" statement if the owner wants it | PQ-07, PQ-59 |

### 7.3 Project and process

| ID | Risk | L / I | Mitigation | Owner decision |
|---|---|---|---|---|
| K-22 | Scope creep or hallucinated scope | M / H | Every session cites its §; §15.1 check; stop and ask on any unanswered question; no PQ treated as answered | — |
| K-23 | Owner decisions lag and block sessions | M / M | Decisions ordered by tier (section 9); a blocked session stops and asks; docs-only work can continue | All tiers |
| K-24 | CI minutes exhausted on a private repo | M / L | Concurrency groups; path filters; nightly runs drop to weekly; blocked, not billed, without a payment method | PQ-68 |
| K-25 | CI artefacts with (synthetic) canaries kept for GitHub's 90-day default | M / L | Shorten retention per artefact | PQ-70 |
| K-26 | Mutation testing not ready on Vitest 5 | M / L | Spike in M0-03; the hand-written "break it" set covers the SQL side anyway | PQ-69 |
| K-27 | Estimates are wrong (sessions are unmeasured) | H / M | Re-estimate after M0 from measured spike and scaffold sessions; keep the milestone order, not the dates | — |

### 7.4 Operational lessons from the planning sessions

| ID | Risk | L / I | Mitigation | Owner decision |
|---|---|---|---|---|
| K-28 | The **hourly API budget cap** stops a session mid-task | H / M | Small sessions with one goal; commit consistent states often; at most **2 concurrent agents**; read large files selectively (search, then read by offset); do not re-fetch pages already verified | — |
| K-29 | The API proxy serves **Opus only**, so every subagent costs as much as the main session | H / M | Use subagents only for narrow, independent tasks; prefer direct tool calls for small lookups; at most 2 at once | — |
| K-30 | The API proxy **drops very long responses** | H / M | Create files as a short skeleton, then add one section per edit (under about 250 lines); never write a whole document or large file in one call; split large changes into several commits | — |
| K-31 | The owner's computer **sleeps** during long or overnight runs and the session dies | M / M | Keep the machine awake and on power for long runs; design each session to end in a committed, resumable state; record progress in the PR description so the next session can pick up | — |

## 8. Definition of done for the prototype

**Proposal.** The prototype (M1a + M1b) is done when every item below holds. Each item maps to the
§15 definition of done and, where one applies, to a §10 acceptance criterion. §10 is the bar for
production; the prototype shows the criteria its features cover, with tests that will carry over.

### 8.1 Checklist

| # | Item | Evidence | §15 | §10 |
|---|---|---|---|---|
| 1 | M1a and M1b are deployed on the public domain and people can sign in | Deployed URL; E2E sign-in per role | 1 | Sign in securely (prototype method; production meaning is PQ-47) |
| 2 | Every shipped feature cites its § and nothing beyond it; nothing depends on an unanswered question | Traceability table in the release PR; §13 audit (M1b-12) | 1, 7 | — |
| 3 | No §3 prohibition is present (no AI detection, scoring, sentiment, risk profiles, uploads, leaderboards, streaks, third tag, impersonation) | `prohibited.absent`; code review checklist; no upload route or file column | 2 | No AI detection or automated student judgment |
| 4 | The negative privacy suite passes in CI (section 8.2) | CI run on the release commit | 2, 3 | Ask, comment and upvote anonymously; moderate without accessing identities |
| 5 | Cards: create, edit, preview, publish, version; overrides visible | `card.*` tests; manual check that differences are not colour-only | 3 | Create, edit, preview, publish and version cards; distinguish course rules from overrides |
| 6 | Exactly two question tags | `tags.two-only`, `tags.recategorize` | 3 | Only Course or Specific Assignment |
| 7 | Merge preserves counts (if PQ-08 keeps merge in milestone 1) | `prop.merge.*`, T-11 | 3 | Duplicate merging preserves counts correctly |
| 8 | Presentation mode shows only the §7.8 "Display" items | `present.exclusions`, T-14 | 3 | Presentation mode reveals no private data |
| 9 | Participation counts only questions, comments and upvotes; exactly three levels | `prop.counter.only-qualifying`, `prop.level.*`, `level.enum-closed`, T-35 | 3 | Participation uses only the three counts; exactly three levels |
| 10 | Courses and roles provisioned manually and by join link or code; TA permissions enforced | `provision.*` (manual), `authz.matrix` | 3 | Provisioned through supported integrations (only partly: LTI is M4) |
| 11 | WCAG 2.2 AA automated checks pass and the manual checklist is done for every M1 screen (if Q15 = WCAG 2.2 AA) | axe report; signed checklist per screen | 5 | Supports "clearly distinguish" |
| 12 | The threat model and the limitations of anonymity are published; the in-app page is live if PQ-52 says so | `docs/threat-model/README.md` approved; page deployed with owner-approved copy | 6 | — (§6.2, §11 deliverable) |
| 13 | Deployment documentation and the restore runbook exist, and a restore drill has passed | Docs in the repo; drill record | 6 | — (§11 deliverable) |
| 14 | CONTRIBUTING, README, CLAUDE.md and ADRs reflect what was built | Docs diff in the release PR | 6 | — |
| 15 | Running cost under the owner's target, with alerts set | Billing pages; alert configuration | — | — (owner constraint, PQ-04) |
| 16 | All tests, type checks and lint pass | CI | 4 | — |
| 17 | New uncertainties found during the build are in §13 (or this plan's register), not resolved by assumption | §13 diff | 7 | — |

§10 criteria that the prototype does **not** show yet, by design: "Students alone decide whether to
share their level", "Instructors receive no underlying participation activity" and "The exit survey
is anonymous and technically separate" (all M2); full "supported integrations" (LTI, M4). The
domain-4 and domain-5 schemas exist from M0-06 or M1b-01 so these arrive without a data migration.

### 8.2 The negative privacy suite (§9)

§9 requires tests proving that instructors and TAs cannot retrieve the authors of anonymous
content through the UI, API, exports, logs or predictable identifiers. Whether the suite must also
cover institutional admins and the operator is PQ-65; the proposal is to include admins, since the
matrix covers every role anyway.

| §9 channel | Tests (proposal) |
|---|---|
| Database (ordinary queries) | Catalogue assertions T-01 to T-08 on every migration and daily in production; T-12 (stray grant returns 0 rows); T-13; T-21 (system columns) |
| API | Role × endpoint matrix generated from the route list, deny by default (`authz.matrix`, `authz.policy-complete`); T-09 for instructor, every TA permission combination and admin; T-10; T-22; T-23; T-34 |
| UI | Canary scans of staff pages, moderation queue, presentation mode and search (T-14, T-15, `neg.ui.*`) |
| Exports | Exports downloaded through the UI and scanned (T-16, `neg.export.*`); in the prototype, only exports that exist are tested |
| Logs | Whole-suite capture of app stdout, Postgres log, ORM and driver logs and a local error sink (T-17), also through the production driver and pooler (T-33); vendor log fields from spike 3 in the threat model |
| Predictable identifiers | UUIDv4 only, no ids in query strings, no GET of a just-created id (T-18); no unkeyed-hash match (T-19); dump replay without the KEK and dump diff (T-20) |
| Merge and counters | Property tests (`prop.merge.*`, `prop.counter.*`, T-11) |

**What tests cannot prove** (stated in the threat model): that the deployed code is the reviewed
code, that vendor logs hold only their documented fields, and that the operator does not misuse the
keys.

## 9. Decisions needed from the owner

Every "Recommendation" is a **Proposal**. The owner may accept, change or reject it. Tiers say
when an answer is needed: **Tier 0** before implementation session 1; **Tier 1** before M0 ends
(ADR acceptance); **Tier 2** before the M1a or M1b feature that needs it; **Tier 3** before M2;
**Tier 4** before the pilot or production.

### 9.1 Tier 0 and Tier 1

| ID | Tier | Decision | Recommendation (Proposal) | Trade-off | Blocks |
|---|---|---|---|---|---|
| D-01 | 0 | Spike preconditions: synthetic data only in previews and spikes (PQ-15); what AI coding agents may access (PQ-16); private or public repository (PQ-68) | Synthetic data only; agents get scratch credentials for spikes and never production data, secrets or logs; private repository | A private repo has 2,000 free CI minutes; a public one has free minutes but exposes the code | M0-01 to M0-03 |
| D-02 | 1 | Milestone scope and split (Q2, PQ-08); prototype users (PQ-01) | Accept the M1a/M1b split in section 4; merge in M1b if the ADR 0003 merge spike passes; demo courses and invited testers only until a UW review | Real UW courses bring the UW review (PQ-02) before launch | Section 4 order; M1a gate |
| D-03 | 1 | Commercial status and Vercel Hobby eligibility (PQ-03); budget currency, tax and failure style (PQ-04) | Ask Vercel in writing; keep the Cloud Run fallback ready; the owner states the currency, tax and preferred failure style (Stack R's free tiers fail as hard stops: caps, pauses, blocked CI) | Hard stops can mean an outage mid-term; automatic billing means surprise costs | ADR 0002 |
| D-04 | 1 | ADR 0001 stack, incl. `proxy.ts` (PQ-18) | Accept Stack R after spikes 1, 4 and 7; no `proxy.ts` | Fewer Next.js conveniences; hand-written security SQL | M0-05 onward |
| D-05 | 1 | ADR 0002 hosting, incl. prototype residency (PQ-09) | Vercel Hobby `yul1` + Supabase Free `ca-central-1`; Cloud Run fallback | Vercel platform metadata is US-primary; free tiers pause or cap | M0-05 onward |
| D-06 | 1 | Operator trust boundary (PQ-10); platform-enforced secret isolation (PQ-13) | Operator inside the boundary for the prototype, documented as a limitation; separate roles in one deployment | A "no" moves to separate services (B topology), more sessions and the Cloud Run path | ADR 0003, ADR 0002 |
| D-07 | 1 | ADR 0003 privacy mechanism, incl. integrity forks PQ-19 to PQ-24, PQ-30, PQ-33 and the aggregate rule shape (PQ-31) | Accept A+; take the A+ default consequence for each fork (credit stands on hidden content, no self-upvote block or withdrawal, followers only and no auto-follow, no own-post editing, moderation and rate limits only for abusers, coarse post times, Mode S, "pointwise not lower" reading) | Each "yes" to an alternative weakens the no-author property P1 | M1b (all) |
| D-08 | 1 | UI primitive base: React Aria vs Base UI | Decide after spike 7: React Aria if every needed component exists in the `aria-*` style, else Base UI | Changing later is costly (`style` is fixed at init; no documented migration to or from React Aria) | M0-08 |
| D-09 | 1 | Lint stack and Node.js line | Pin one Node.js line in CI, locally and on the host, inside the tool engines intersection (22.13+ on 22, any 24.x, or 26+), checked against the host's supported versions at scaffold time (**Unverified**); ESLint 10 with Biome's a11y group, or ESLint 9 with `eslint-plugin-jsx-a11y` | ESLint 10 lacks jsx-a11y support today; ESLint 9 is older | M0-05 |
| D-10 | 1 | Threat model format and location (Q8); in-app limitations page (PQ-52) | Markdown at `docs/threat-model/README.md`; an in-app page with owner-approved wording | The in-app page needs owner copy before M1b ships | M0-04, M1b-12 |
| D-11 | 1 | ADR 0004 sign-in: UW tenant testing (PQ-44), allowed domains (PQ-45), "sign in securely" (PQ-47), session metadata and refresh (PQ-48) | Accept email codes with Better Auth; `uwaterloo.ca` only; library default lifetime until PQ-47 is answered; refresh off; IP/UA not stored if possible; Microsoft sign-in only after S1 and the owner's yes | Email codes are not a production authenticator | M1a-01, M1a-02 |
| D-12 | 1 | Provisioning approach (Q5) and who may be an instructor or admin (PQ-46) | Manual courses by vetted instructors; join link or code; TA invites; no roster import before a UW review; the owner's identity in a deploy-time admin allow-list (option A in the auth research) | Join codes are weak proof of enrolment | M1a-04, M1a-05 |
| D-13 | 1 | Email provider (Q6) and the AWS Paid account (PQ-42) | SES `ca-central-1` on the Paid plan; Resend Free for dev only | An AWS account to operate; Resend's 100/day cap rules it out for production sign-in | M0-03, M1a-01 |
| D-14 | 1 | Accessibility target (Q15) | WCAG 2.2 AA; AAA 2.4.13 and 1.4.6 as stretch goals for presentation mode | Some extra work over 2.1 AA (for example 3.3.8 for the code field) | Every UI row |
| D-15 | 1 | Third-party error reporting or analytics (PQ-12); IP and request metadata as identity-bearing (PQ-11) | No tool in the prototype; the logging rules in this plan assume IP is identity-bearing (the safer reading, interpretation); platform log retention documented in the threat model | Debugging relies on our own allow-listed logs | ADR 0001, ADR 0003 |
| D-16 | 1 | UW privacy review before real users (PQ-02) | Yes before any real UW student signs in; owner identifies a sponsor when ready | Delays real-course use by at least the review time ("typically takes 2–4 weeks") | ADR 0002 gate; M3 |
| D-17 | 1 | Domain, name and branding (PQ-07); closeness to LEARN (PQ-59) | Check the name for conflicts; `.ca` if eligible else `.com`; no UW or D2L marks; LMS-like layout without copying | A "not an official UW service" statement needs owner copy | M0-07, M0-08 |
| D-18 | 1 | Scope of the negative suite (PQ-65) and canary strictness (PQ-66) | Owner decides; the generated matrix can cover admins at little extra cost (inference); the strictness rule defines every scan's pass or fail | A stricter rule may flag more artefacts to triage | M0-07, M1b-11 |

### 9.2 Tier 2, Tier 3 and Tier 4

| ID | Tier | Decision | Recommendation (Proposal) | Trade-off | Blocks |
|---|---|---|---|---|---|
| D-19 | 2 | Administration scope for the prototype (Q1); the missing spec text (PQ-55) | Minimal admin settings (A2) and the `institution` table; the owner writes or recovers the text | Further admin powers wait for Q1 | M1a-04 |
| D-20 | 2 | Impersonation (Q7); synthetic "view as student" preview (PQ-56) | None (I0); preview optional | Support cases are handled without seeing as a user | M1a-06 (preview scope) |
| D-21 | 2 | Languages (Q19) | English only; strings externalised from day one (L1) | One indirection per string | M0-08 |
| D-22 | 2 | Audited events and storage (Q14) | E1 and E2 (spec-required); approve or reject E3–E8; insert-only table plus hash chain; retention a placeholder | The table owner can still alter rows; tamper-evident only | M1a-03 |
| D-23 | 2 | Prototype retention (Q17); content on account removal (PQ-54) | "Prototype data may be wiped" notice (D4) with owner copy, plus lifecycle hooks (D2); tombstone enrolments until seal | Full deletion before seal breaks merge exactness | M1a-09, M1b-12 |
| D-24 | 2 | Rate limits and moderation workflow (Q20); repeat abusers (PQ-23); un-hide and restore (PQ-26) | Per-user, per-course, per-action limits with placeholder values in admin-visible config; manual queue; soft delete; no reporter identity; no un-hide until the owner says so | Placeholders need tuning in use | M1a-01, M1b-04, M1b-05 |
| D-25 | 2 | Backups and dumps as exports (PQ-14) | Until answered, handle dumps with export-level care: per-domain, each with its own key, in owner-controlled storage (ADR 0002); the owner sets location and retention | Storage may cost (**Unverified**) | M0-07 |
| D-26 | 2 | Live updates and availability (PQ-17); presentation snapshots (PQ-35) | Periodic or manual refresh, no auto-refresh on student devices (K-02); presentation and analytics as snapshots (privacy research) | Less "live" feel in class | M1b-08 |
| D-27 | 2 | Board semantics: merge details (PQ-25), staff identity in moderation logs (PQ-27), POST-response rendering (PQ-28), TA who is also a student (PQ-29) | Per ADR 0003 defaults; staff ids, not names, in the log; POST-response rendering; block TA + student in one course | Each needs a short owner answer | M1a-05, M1b-02 to M1b-06 |
| D-28 | 2 | In-app notifications: which events count (PQ-39); seen marker (PQ-43); Q13 in-app part | N3 for in-app; day-precision keyed seen marker | If unanswered, M1b-10 moves to M2 | M1b-10 |
| D-29 | 2 | Source of the student name (PQ-49); account carry-over to production (PQ-06) | Owner decides; name options are self-entered, a directory claim or LTI; carry-over options are explicit linking or a fresh start (auth research section 6.4) | A fresh start loses prototype history; carry-over needs an audited link step | M1a-05 |
| D-30 | 2 | Brand guardrail strictness (PQ-61); card field mapping for overrides (PQ-62); who writes UI copy (PQ-63); dark mode and accessibility statement (PQ-64 first part) | Block saving a failing colour and offer an adjusted value (design research); owner approves the field mapping and all copy; dark mode and the statement page are the owner's call | Owner copy is on the critical path | M0-08, M1a-04 to M1a-09 |
| D-31 | 2 | TA permission list (PQ-67); negative suite on previews and artefact retention (PQ-70) | Owner lists the permissions; run the suite on previews with synthetic data; shorten artefact retention | More CI minutes | M1a-05, M1b-11 |
| D-32 | 3 | Wizard rules and resources (Q10); shipping without recommendations (PQ-58) | Owner supplies the rule table and resource list; manual editor until then | Wizard waits for the owner's table | M2-03, M2-04 |
| D-33 | 3 | Ranked defaults (Q11); export format (Q12); meaning of "applies the result" (PQ-37) | Owner supplies values and the LEARN format; in-app apply first, AGS in M4 | — | M2-07, M2-08, M4-04 |
| D-34 | 3 | Essential notifications (Q13); email per type (PQ-38); email copy (PQ-40); digests (PQ-41) | N3; activity types as digest only; one generic template | Less informative emails | M2-01, M2-02 |
| D-35 | 3 | Aggregation threshold N and rule shape (Q16); in-term level counts (PQ-31); one N or two (PQ-36) | Placeholder N = 10, refuse below 3; release level counts once after sharing closes; present both rule shapes for the owner | A single end-of-term release gives instructors less in-term information | M2-10 |
| D-36 | 3 | Sharing window (Q18); frozen or live shared level, date changes (PQ-34) | Dates set at policy publication (W2 + F2); frozen at share time with revoke and re-share | — | M2-05, M2-06 |
| D-37 | 3 | Survey details (PQ-32) | Results only after close (privacy research); the completion flag can block a second submission if the owner wants that; whether the survey is a required step is the owner's call | — | M2-09, M2-10 |
| D-38 | 4 | UW review (PQ-02, if not already); pilot scale (PQ-05) | Owner decides when to approach UW; the review "typically takes 2–4 weeks" | — | M3 |
| D-39 | 4 | Production residency (PQ-09); LTI details (PQ-50) | Decide with UW's review | — | M4 |
| D-40 | 4 | Newer WCAG or VPAT (PQ-51); records retention for audit logs (PQ-53); O. Reg. 191/11 duties (PQ-60); external reviews and thresholds (PQ-69); audit and JAWS budget (PQ-64 second part) | Ask UW; the owner decides whether to fund external accessibility and security reviews | Cost not yet priced | M3, M4 |

## 10. Register of proposed new open questions

These are **proposals to add to CONTRIBUTING §13**, not requirements. None is answered here. The
owner accepts, merges or drops each one; accepted ones get the next free Q number with the PQ ID in
brackets and a §16 line (section 1). "When" is the latest point an answer is needed: **ADR nnnn**
(before that ADR is accepted), or **M0 / M1a / M1b / M2 / Pilot / Prod / Later** (before that work
starts). Full wording and raw-note IDs are in the research files.

| ID | Question (short form) | When |
|---|---|---|
| PQ-01 | Real UW courses and students in the public prototype, or demo courses and invited testers only? | M1a |
| PQ-02 | Is a UW privacy review, a signed DPA or other approval needed before real UW users sign in? Who is the UW sponsor? | M1a (if PQ-01 = real) |
| PQ-03 | Is anyone paid to build or run the project, or is commercialisation intended? (Vercel Hobby eligibility) | ADR 0002 |
| PQ-04 | Is "<$5/month" USD or CAD, incl. tax? At a free-tier limit, hard stop or automatic billing, and what ceiling? | ADR 0002 |
| PQ-05 | Expected pilot scale: courses, students, largest course? | Pilot |
| PQ-06 | Do prototype accounts and data carry over into production? | M1a |
| PQ-07 | Domain and name (`.ca` or `.com`, conflicts); use of UW's name or marks; a "not an official UW service" statement? | M1a |
| PQ-08 | Is the M1a/M1b split acceptable, and must merge be in milestone 1? | M1a |
| PQ-09 | Must processing and stored data stay in Canada or on institution-hosted infrastructure, and which data? | ADR 0002 (prototype), Prod |
| PQ-10 | Is the platform operator inside the trust boundary (prototype; production)? | ADR 0003 |
| PQ-11 | Are IP addresses and request metadata identity-bearing; what platform-log retention is acceptable? | ADR 0003 |
| PQ-12 | May any third-party error-reporting or analytics tool run, and with which settings? | ADR 0001 |
| PQ-13 | Must per-domain secret isolation be platform-enforced (separate deployments) in the prototype? | ADR 0003 |
| PQ-14 | Are backups and dumps "exports"? Where, under which keys, for how long? | M1a |
| PQ-15 | Must preview and staging environments use only synthetic data? | M0 |
| PQ-16 | Who may hold the KEK; may AI coding agents or tools ever access production data, secrets or logs? | M0 |
| PQ-17 | Must presentation mode and voting update live, or is periodic refresh acceptable? What availability is "credible"? | M1b |
| PQ-18 | Is Next.js `proxy.ts` acceptable, or must all application code run in the chosen region? | ADR 0001 |
| PQ-19 | Does hiding or deleting content remove the credit it earned? | ADR 0003 |
| PQ-20 | Self-upvotes allowed? Upvote withdrawal? Two "upvotes given" after a merge? | ADR 0003 |
| PQ-21 | Who receives "Answer posted" and "Question merged"? Does asking auto-follow? | ADR 0003 |
| PQ-22 | May students see, edit or delete their own anonymous posts? | ADR 0003 |
| PQ-23 | Repeat anonymous abusers: moderation and rate limits only, or a "sanction without reveal" handle? | ADR 0003 |
| PQ-24 | What precision is stored and shown for post times? | ADR 0003 |
| PQ-25 | On merge: answers, "Still unclear" marks and open reports on the merged-away question; when is keeping a comment "not reasonable"; "Still unclear" semantics and visibility? | M1b |
| PQ-26 | Can hidden content be un-hidden and deleted content restored, and by whom? | M1b |
| PQ-27 | Is staff identity next to content (e.g. in the moderation log) identity-bearing under §3? | M1b |
| PQ-28 | Is showing a new item from the POST response (not a GET of its id) acceptable? | M1b |
| PQ-29 | Can one person be a TA and a student in the same course? | M1a |
| PQ-30 | Crediting mode: synchronous or daily batch? | ADR 0003 |
| PQ-31 | Are in-term level counts wanted; on what cadence; which differencing rule? | M2 (rule shape: ADR 0003) |
| PQ-32 | Survey results only after close? Duplicate-submission prevention? Survey required before sharing or skippable? Which survey metadata is necessary? | M2 |
| PQ-33 | How is "threshold changes that would disadvantage them" read, and when does participation "begin" (§7.9)? | ADR 0003 |
| PQ-34 | Shared level frozen at share time or live? Sharing before course end? May sharing dates move after publication? | M2 |
| PQ-35 | Presentation mode and analytics: snapshots or live totals? | M1b |
| PQ-36 | Same N for level counts and survey reveal? May instructors lower it; is there an institution floor? | M2 |
| PQ-37 | Does "applies the result" (§7.10) mean an in-app action, a LEARN grade push, or both? | M2 |
| PQ-38 | Must all eight §7.13 types have email? Defaults per type and channel; "essential" per channel? | M2 (in-app: M1b) |
| PQ-39 | Which events count as "followed question updated"; which card edits trigger "card changed"; who are "affected students"? | M1a |
| PQ-40 | One generic email template? May emails name the institution or course? Is the level stated in "level reached"? | M2 |
| PQ-41 | Digest design, cadence and send time; hold digests until at least k recipients? | M2 |
| PQ-42 | AWS Paid account for SES? A UW-sanctioned sending path? CASL? Provider log retention? A fallback provider? | M1a (sign-in email) |
| PQ-43 | Notification "seen" marker: server-side at day precision under a keyed HMAC, or client-only? | M1b |
| PQ-44 | May we test and use sign-in against UW's Entra tenant without asking UW first? | ADR 0004 |
| PQ-45 | Which email domains count as institutional; may alumni and retirees sign in? | ADR 0004 |
| PQ-46 | Who may become an Instructor or admin in the prototype, and how verified? Is a join code proof of enrolment? Roster uploads before a UW review? | M1a |
| PQ-47 | What does "sign in securely" (§10) require: lifetime, idle timeout, MFA or passkeys for staff? | ADR 0004 |
| PQ-48 | May the auth library store IP, user agent and created/updated times; must session refresh be disabled? | ADR 0004 |
| PQ-49 | Authoritative source of the "student name" shared under §7.10; any profile data beyond sign-in? | M1a |
| PQ-50 | LTI details for production (role mapping, TA defaults, launch window, course definition, NRPS, grade identifiers, certification) | Prod |
| PQ-51 | Does UW require a newer WCAG version, a VPAT/ACR or a review beyond Policy 58? | Pilot |
| PQ-52 | Must the limitations of anonymity be visible in the app, or is the repo document enough? | M0 |
| PQ-53 | Does a UW records-retention schedule apply to the audit logs? | Pilot |
| PQ-54 | On account removal, does a student's anonymous content stay, go, or does the student choose? | M1b |
| PQ-55 | Can the missing Administration text of the spec be recovered, or will the owner write it? | M1a |
| PQ-56 | Is a synthetic whole-course "view as student" preview wanted? | M1a |
| PQ-57 | Who translates and approves verbatim spec texts if a second language is added? | Later |
| PQ-58 | May the wizard ship without recommendations before the rule table (Q10) exists? | M2 |
| PQ-59 | How close may the design be to LEARN/Brightspace without implying D2L affiliation? | M0 |
| PQ-60 | Is UW a designated public sector organization under O. Reg. 191/11, and do the IASR educational duties apply? | Pilot |
| PQ-61 | May admins save a brand colour that fails the contrast checks? | M1a |
| PQ-62 | Which Course AI Card fields map to which Assignment AI Card fields for the override comparison (§7.4)? | M1a |
| PQ-63 | Who writes and approves UI copy? | M1a |
| PQ-64 | Dark mode? Accessibility statement in milestone 1? Budget for JAWS, an external audit, testing with disabled users? Projector checks? | M1a / Pilot |
| PQ-65 | Must the negative tests also cover institutional admins and the operator? | M0 |
| PQ-66 | Canary scanner strictness: any identity canary next to any content canary, or only a student next to their own content? | M0 |
| PQ-67 | What is the exact list of assignable TA permissions? | M1a |
| PQ-68 | Private or public GitHub repository? | M0 |
| PQ-69 | External security, privacy or accessibility review before production? Any coverage or mutation-score threshold? | Pilot / M0 |
| PQ-70 | Run the negative suite against deployed previews? CI artefact retention? A read-only production catalogue self-check, and with which credentials? | M1a |

## 11. Kickoff prompt for implementation session 1

Implementation session 1 is **M0-01** (platform spikes). The same prompt runs M0-02 and M0-03 by
changing the group in the first line. Copy everything inside the block.

```text
You are running ClearCourse AI implementation session M0-01: spike group A (platform).
Spike groups: A = M0-01, B = M0-02, C = M0-03. Run only group A in this session.

READ FIRST, in this order:
1. P:/code/clearcourse-ai/CLAUDE.md and P:/code/clearcourse-ai/CONTRIBUTING.md (source of truth).
2. P:/code/clearcourse-ai/docs/plan.md: sections 1, 4 (M0), 5 (row M0-01), 7, 9 (D-01 to D-18), 11.
3. The Proposed ADRs: docs/decisions/0001-application-stack.md, 0002-hosting-and-infrastructure.md,
   0003-privacy-mechanism.md, 0004-prototype-authentication.md.
4. docs/research/stack-and-hosting.md section 6.7 (spikes) and section 7 (privacy rules).
   Read large files selectively: search first, then read only the sections you need.

PRECONDITIONS. Check each one. If any is missing, STOP and ask the owner; do not work around it.
- The owner has reviewed this plan and the four Proposed ADRs.
- The owner has answered (or explicitly deferred in writing) the Tier-1 decisions in plan section 9.
  For this group the following MUST be answered: PQ-15 (synthetic data only), PQ-16 (what an AI
  agent may access), PQ-68 (repository visibility).
- The owner has created and handed over, for spikes only: a Vercel Hobby account on a personal
  GitHub account; a Supabase Free project in ca-central-1 for spikes (synthetic data only, to be
  deleted or reset after M0); a scratch GitHub repository for the CI spike. Credentials go in a
  local .env file inside the scratch folder, never in the ClearCourse AI repository.

WHERE TO WORK.
- All spike code lives in a throwaway folder OUTSIDE the repository (for example
  P:/code/_clearcourse-spikes/). Do not scaffold or add code to P:/code/clearcourse-ai: CLAUDE.md
  forbids scaffolding until ADR 0001 is accepted.
- The only file you write in the repository is docs/research/spike-results.md.

SPIKES IN GROUP A (each about a day or less; record measured values, not impressions):
1. Vercel + Supabase measurement. A Next.js 16.x page (Node.js runtime, functions pinned to yul1,
   no proxy.ts) that runs one per-domain query through the Supavisor transaction pooler with its
   own LOGIN role, prepare: false.
   PASS if: Active CPU per request, cold latency and warm latency are recorded; set_config(..., true)
   inside a transaction plus an RLS policy using nullif(current_setting(..., true), '') behaves as
   expected through the pooler, including the empty-setting case. The stack judge's example level
   of concern is above 15 ms average Active CPU at the assumed load; report the number either way.
3. Log capture. One real Vercel runtime-log entry and one Supabase postgres_logs entry produced by
   the spike page.
   PASS if: every field of each entry is listed with the platform's stated retention. Replace IP
   addresses, account ids and tokens with placeholders; keep the field names.
4. CI connectivity and version. From a GitHub-hosted runner in the scratch repository, apply a
   migration to the spike project through the IPv4 session pooler with a custom owner role.
   PASS if: the migration applies, and Supabase's Postgres major version is read and recorded so
   the CI image can be pinned to it. Record CI minutes used.

SPIKES IN LATER GROUPS (for reference; do not run now):
- Group B (M0-02): T-21 system columns (xmin, ctid) unreachable by runtime roles through tables,
  views and the read functions, and repeat upserts leave identity row xmin unchanged; T-33 the
  production driver and pooler never interpolate parameters into logged literals; T-31 merge HMAC
  timing at realistic roster sizes is acceptable; S2/T-24 Better Auth session row byte-identical
  across requests with refresh off, IP/UA empty if possible, tables confined to cc_auth, cookie
  attributes as in ADR 0004.
- Group C (M0-03): spike 5 + S3 SES ca-central-1 on the AWS Paid plan, production access granted,
  plan is a la carte, a content-free code email reaches a UW Microsoft 365 inbox promptly (note
  Safe Links behaviour); spike 2 the same image on Cloud Run northamerica-northeast1, cold start
  measured, Firebase Hosting and a load balancer priced, spend-cap eligibility confirmed or refuted;
  spike 7 shadcn init with the React Aria base (pass it explicitly; new projects default to Base UI)
  and every component in the design research's spike list exists, else Base UI; Stryker runs on
  Vitest 5 or not; optional S1 Entra consent only if the owner answered PQ-44 yes.
- Spike 6 (Vercel Hobby eligibility, PQ-03) is the owner's written question to Vercel support.

OUTPUT: docs/research/spike-results.md
- Start with the research status block: "Advisory research", the date, "Not binding until the owner
  approves it and it is promoted into CONTRIBUTING.md (§1)", and the questions it informs.
- One section per spike: what was run, environment and versions, measured results, PASS or FAIL
  against the measure above, evidence (links to official docs with "(checked YYYY-MM-DD)"), and
  anything still Unverified.
- A section "Proposed ADR updates": exact text changes you propose for ADR 0001 and 0002, for the
  owner to apply. Do not change any ADR's status and do not edit the ADR files.
- A section "New uncertainties": each as a proposed open question numbered after PQ-70.
- A section "Owner actions": what the owner must do next.

HARD RULES.
- Do not close, answer or assume any open question (Q1-Q20, PQ-01 to PQ-70). Report evidence; the
  owner decides.
- Do not invent requirements, defaults, thresholds, copy text or facts. Label anything not checked
  on an official page as Unverified.
- Synthetic data only. No real personal data, no secrets and no raw tokens in any file you write.
- Do not change CONTRIBUTING.md, CLAUDE.md, README.md or any ADR.

BUDGET AND WORKING RULES (the owner's API budget is capped per hour).
- At most 2 concurrent agents. Use subagents only for narrow, independent tasks.
- Write incrementally: create spike-results.md as a short skeleton, then add one section per edit,
  each under about 250 lines. Never write a whole document in one call (the API proxy drops very
  long responses).
- Do not re-fetch web pages the research already verified unless a fact is missing or contradicted.
- Keep a short progress note at the end of spike-results.md so the next session can resume if this
  one stops (budget cap or the computer sleeping).

END OF SESSION. Report honestly: which spikes passed, failed or were not run, and why; what the
owner must decide or do next. Do not commit unless the owner asks.
```

## 12. Session prompt template

For every session after M0-03. Replace the angle-bracket fields with the values from the session's
row in section 5.

```text
You are running ClearCourse AI implementation session <ID>: <goal from plan section 5>.

READ FIRST:
1. P:/code/clearcourse-ai/CLAUDE.md and CONTRIBUTING.md, especially <§ refs from the row>, §3
   (prohibitions), §6 (privacy), §13 (open questions) and §15 (definition of done).
2. docs/plan.md: row <ID> in section 5, the milestone section in 4, and section 8 if this session
   touches identity, content, participation, sharing or survey data.
3. The ADRs named in the row's Inputs column: <ADR list>. Use only Accepted ADRs as binding.
4. The research sections the row cites. Read large files selectively (search, then read by offset).
5. The previous session's PR description or progress note, if any.

CHECK BEFORE ANY CODE (stop and ask the owner if any check fails):
- Every question in the row's "Depends on" column (<list>) is answered and recorded in
  CONTRIBUTING.md. An answer that exists only in chat or in this plan does not count.
- The row's gate is met (for M1b and later: ADR 0003 Accepted and the threat model approved, §6.3).
- The task stays inside the cited sections. Anything not written there is an open question: add it
  to the PR as a proposed question; do not build it.

HOW TO WORK:
- Branch feat/..., fix/..., docs/... or chore/... (§14); Conventional Commits citing the section,
  e.g. feat(board): merge duplicates (§7.7).
- Privacy tests first: write the row's "Tests required" (negative tests included) so they fail,
  then make them pass. Run the canary scanner over every new page, response, export and log.
- Every new route gets an authorization policy and appears in the role x endpoint matrix.
- Every new UI screen and state gets axe in Playwright and keyboard-flow tests; add it to the
  manual accessibility checklist for the milestone.
- Never log, trace, export or display identity together with anonymous content, including in error
  messages and test output. UUIDv4 only for anonymous content.
- Use the versioned docs of each pinned library; do not rely on memory for APIs or prices. Label
  anything you could not verify as Unverified.
- Copy text: use the verbatim CONTRIBUTING text where it exists; otherwise leave a clearly marked
  placeholder for owner-approved copy.

BUDGET AND WORKING RULES:
- At most 2 concurrent agents; subagents only for narrow, independent tasks.
- Write files incrementally (skeleton first, then one section or module per edit, each under about
  250 lines). Never write a whole large file in one call.
- Keep the branch in a consistent, resumable state; record progress in the PR description.

DONE WHEN (CONTRIBUTING §15):
1. It implements the cited requirement and nothing beyond it.
2. It violates nothing in §3 or §6.
3. It has automated tests, including the negative and privacy tests in the row.
4. Type checks, lint and all tests pass locally and in CI.
5. It meets §8 and the accessibility target.
6. CONTRIBUTING, README, CLAUDE.md and ADRs are updated if behaviour, scope or architecture
   changed (only with the owner's approval for CONTRIBUTING).
7. Every new uncertainty is listed for §13 rather than resolved by assumption.

REPORT: what was done, which tests were added and pass, anything skipped or failing (say so
plainly), new proposed questions, and the next session's preconditions.
```
