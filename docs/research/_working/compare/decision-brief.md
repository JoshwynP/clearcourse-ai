# Decision brief (canonical synthesis for the writers)

Written by the main session on 2026-10-12. **Every writer and reviewer follows this brief.** If a raw note
disagrees with this brief, this brief wins for naming, numbering and recommendations. If CONTRIBUTING.md disagrees with
anything, CONTRIBUTING.md wins. If a fact-check refutes a number, the fact-check wins.

Everything below is a **proposal for the owner**. No open question is closed, and nothing is "decided".

## 1. Writing conventions (all deliverables)

- **Repo:** `P:/code/clearcourse-ai`, branch `docs/research-and-build-plan`. Don't run git. Don't touch
  CONTRIBUTING.md, CLAUDE.md, README.md or `docs/research/_working/`.
- **Style:** match CONTRIBUTING.md:
  - plain English, short sentences
  - sentence-case headings
  - lines wrapped at about 100 characters (tables may be longer)
  - tables for comparisons
  - no marketing tone, no emoji
- **Citations:** requirements as `§7.7` (CONTRIBUTING) or `[src p.N]` (spec PDF). External facts as a link plus
  "(checked 2026-10-11)". Anything not verified on an official page is labelled **Unverified**. Interpretations are
  labelled as such.
- **Labels:** every recommendation says **Proposal** (owner approval needed). Never write "we will" or "decided".
  Anything not in CONTRIBUTING is an open question: existing ones are cited as Q1–Q20, and new ones use the
  **PQ-nn** IDs in §4 of this brief (never invent other IDs in final docs; cite raw-note IDs only in
  parentheses if useful).
- **Verbatim spec text:** copy exactly from CONTRIBUTING (§7.3, §7.4, §7.10, §7.12 quotes). Don't invent copy text.
  Where copy is needed, write "owner-approved copy (to be written)".
- **Research files:** start with a status block:
  - *Advisory research*
  - date
  - "Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1)"
  - which open questions it informs

  Then these sections:
  1. Summary and recommendation
  2. Questions covered and what they block
  3. Options considered (table)
  4. Evidence
  5. Comparison
  6. Recommendation (proposal) with trade-offs
  7. Privacy implications (§6)
  8. Risks
  9. Open questions (existing Qn + PQ-nn)
  10. Sources and verification log (claim | URL | checked | status)

  Keep each research file readable: about 25–45 KB. Summarise the raw notes; don't paste them.
- **ADRs:** use `docs/decisions/0000-template.md` exactly. Status **Proposed**, Date **2026-10-12**,
  Relates to: §… / Q…. Under "Decision", write
  `**Proposed (not yet approved by the owner):** …` and `Approved by: (pending)`. Link to the research file.
  Aim for about 8–15 KB.
- **Writing rule (the API proxy drops very long responses):** create each file with a short skeleton, then add one
  section per tool call (Edit), each under about 250 lines. Never write a whole document in one call.

## 2. Source map (raw notes live in `P:/code/_clearcourse-scratch/`)

| Deliverable | Primary sources |
|---|---|
| `docs/research/privacy-architecture.md` + ADR 0003 | `research/privacy-A-db-enforced.md`, `research/privacy-B-separated-services.md`, `research/privacy-C-cryptographic.md`, `critique/privacy-redteam.md`, **`compare/privacy.md`** (judge; the recommendation) |
| `docs/research/stack-and-hosting.md` + ADRs 0001, 0002 | `research/stack-S0-framework-data-access.md`, `research/stack-H1H2-vercel.md`, `research/stack-H3H4-cloudflare-container.md`, `factcheck/stack.md`, **`compare/stack-hosting.md`** (judge) |
| `docs/research/prototype-auth-and-provisioning.md` + ADR 0004 | `research/auth-A1-prototype-signin.md`, `research/auth-A2-provisioning-lti.md`, `factcheck/other-1.md` |
| `docs/research/blocking-open-questions.md` | `research/other-O1-email-notifications.md` (Q6, Q13), `research/other-O2-blocking-open-questions.md` (the rest, incl. Q2 candidate), `factcheck/other-1.md`, `factcheck/other-2.md` |
| `docs/research/design-system-and-accessibility.md` | `research/design-D1-system-a11y.md`, `factcheck/other-2.md` |
| `docs/research/testing-strategy.md` | `research/testing-T1-strategy.md`, `compare/privacy.md` §6–§7 (controls and negative tests), `factcheck/other-2.md` |
| `docs/plan.md` | this brief, both judges, O2 §Q2, every final research file and ADR |

## 3. Canonical recommendations (all proposals)

| Topic | Proposal | Key condition or trade-off |
|---|---|---|
| **Q3 stack (ADR 0001)** | "Stack R": TypeScript; **Next.js 16.x App Router, Node.js runtime only**, no Edge, **no `proxy.ts`**; server-only domain modules (`server/domains/<domain>/`, `import 'server-only'`, lint rule against cross-domain imports); explicit Route Handlers for privacy-relevant operations (Server Actions only as thin wrappers that re-check auth); **Drizzle ORM** (0.45.x stable unless v1 is stable at acceptance) with **one pool + LOGIN role + secret per privacy domain**; `drizzle-kit generate` for tables plus **hand-written SQL** for roles, grants, RLS and SECURITY DEFINER functions; migrations only from CI, never `push`; **Zod 4** at every boundary; Kysely as the fallback data layer. Pin a Next.js release that includes the 2026-10-14 out-of-band security update | Next.js and Better Auth have frequent critical advisories → pin, Dependabot, patch-within-days runbook |
| **Q3 hosting (ADR 0002)** | **Vercel Hobby, functions pinned to `yul1` (Montréal)** + **Supabase Free in `ca-central-1` used only as plain Postgres** (Data API disabled, default grants revoked, no Supabase Auth, no `supabase-js`, no Vault). Previews use the second free Supabase project with synthetic data only. **Pre-agreed fallback, same code: container on Google Cloud Run `northamerica-northeast1`** with the same database (CI always builds the container) | **Gate:** Vercel Hobby is "restricted to non-commercial personal use only" and has no DPA (PQ-03, PQ-02). Supabase Free pauses after 1 week idle and has **no backups** → nightly per-domain encrypted dumps from CI and a weekly synthetic check (whether that counts as activity is Unverified) |
| Cost | Prototype ≈ **USD 1.12–1.17/month** (domain ≈ 0.92–0.97 + SES ≈ 0.20), ≈ CAD 1.60–1.67 | Pilot ≈ USD 27 (Supabase Pro), ≈ 47 if Vercel Pro is needed; production ≈ USD 52–62 lean, 152–162 with PITR; institution-hosted unknown (stack judge §17) |
| **Q9 privacy (ADR 0003)** | **"A+"** from `compare/privacy.md` §4. One Postgres, a schema per §6.1 domain plus `catalog`. Pillars P1–P6: no author data on content; locked per-student state keyed by `pid = HMAC(K_pid, user)`; per-item tags for upvote/follow/unclear/report; keys outside SQL, with HMACs computed in a server-only **linkage module** that has its own `cc_link` role; no runtime role has SELECT on any base table in anonymous or identity schemas; snapshot-only outputs. Also: per-course random `K_c` wrapped under a KEK in the host secret store; a definer-function whitelist; merge by roster recomputation; **synchronous crediting (Mode S)** in the prototype, with daily-batch mode as a no-migration upgrade; compute-on-read in-app notifications plus one generic, content-free daily email digest; level aggregates as frozen snapshots hidden once sharing opens; survey text revealed only after the survey closes; blind-token survey kept as an upgrade; crypto-shred at seal as a Q17 option; UUIDv4 only | Operator and vendors stay **inside** the trust boundary (documented limitation) unless the owner answers PQ-10 otherwise, in which case B topology for production. Integrity forks PQ-19 to PQ-23 must be answered before the ADR is accepted. Estimate ≈ 18–25 sessions for the privacy core (unmeasured) |
| **Q8 threat model** | Markdown at `docs/threat-model/README.md` (the path is a proposal): OWASP four questions, a DFD of the five domains with trust boundaries, STRIDE per component, LINDDUN for privacy, and the "limitations of anonymity" list (privacy judge §5.1). Plus a plain-language in-app limitations page whose wording the owner approves. Written in M0, **before any content or participation code** (§6.3) | — |
| **Q4 sign-in (ADR 0004)** | **Better Auth** (MIT; pin at or above the version the A1 note names) with **database sessions** in the identity domain (`auth_private` schema reached only by `cc_auth`), opaque `__Host-` cookie, `storeToken: "hashed"`, UUID IDs, **session refresh disabled** and IP/UA not stored if the library allows (PQ-48), implicit email linking off, admin/impersonation plugin off. Sign-in by **6-digit email one-time code**, not clickable magic links (Microsoft Safe Links can use them up), limited to admin-configured domains (default proposal `uwaterloo.ca`, PQ-45). Accounts linked on **(issuer, subject)** only, never by email. "Sign in with Microsoft", pinned to the UW tenant, only if a 1–2 hour consent spike succeeds **and** the owner agrees it's acceptable to test against UW's tenant (PQ-44) | Email OTP proves mailbox control, not role. NIST 800-63B-4 doesn't approve it as an authenticator, so it suits the prototype, not production "secure sign-in" (§10). Better Auth had 10 advisories in 3 months (2 Critical) |
| **Q5 provisioning** | Prototype: **vetted instructors create courses manually** (who counts as vetted is PQ-46); students self-enrol with a **hashed, expiring, revocable join link or code**; TAs join by **single-use invite** and have no permissions until the instructor assigns them; **no CSV or email roster import before a UW privacy review**. Production: **LTI 1.3** launch with just-in-time provisioning, plus Deep Linking and AGS (an instructor-clicked "apply to LEARN gradebook"); NRPS optional; implemented on `jose`, with LTI state in the identity domain, tested on saLTIre and Moodle in Docker. Data model now: person keyed by (issuer, sub); course binding (deployment, context_id); per-membership source | LTI with LEARN needs UW: a sponsor, an IRA-PIA ("typically takes 2–4 weeks") and LEARN admin registration (PQ-02, PQ-50). Q5 should get its own ADR once answered (not drafted now) |
| **Q6 email** | **Amazon SES `ca-central-1`** behind a provider-neutral mailer port inside the identity domain, on an **AWS Paid account plan** (Free-plan accounts close after 6 months). Request SES production access early; tracking off; à la carte pricing at $0.10 per 1,000 (new accounts have defaulted to the Essentials plan at $0.16 per 1,000 since 2026-07-21; cancel it). Resend Free (3,000/month, **100/day**) as the dev/demo fallback only | Email is critical infrastructure because sign-in uses codes |
| Notifications privacy | Emails are content-free and type-free and link only to a generic `/notifications` page; activity notifications only as fixed-time daily digests; outbox rows deleted after send | Q13 essential set: proposal N3 (card-change notices and "Sharing window open" essential in-app; every email type user-manageable) |
| **Q15** | **WCAG 2.2 AA** for all UI (meets Ontario's WCAG 2.0 AA floor and UW Policy 58); axe in Playwright plus a manual keyboard and screen-reader checklist per page | — |
| **Q16** | Rule shape: level counts are released to instructors **once, after the sharing window closes and shares are final**, and only if the residual check passes (at least N non-sharers, not all in one level), with complementary suppression. Survey text in one batch after close, in random order, with no timestamps, only if responses ≥ N. **Placeholder N = 10** (the owner sets it; refuse values below 3) | Reconcile with the privacy judge §4.11 (fixed-cadence frozen snapshots before sharing opens, hidden once it opens): present both, with PQ-31 asking whether in-term level counts are wanted at all |
| **Q20** | Rate limits R3: per-user, per-course, per-action limits on writes, keyed by `HMAC(K_rl, user‖action)`, plus per-IP limits on unauthenticated endpoints. **Placeholder values only**, shown in admin-visible config. Moderation: M1 manual queue; soft delete; reporter identity not stored | Placeholder numbers for owner approval |
| **Q14** | Audit E1 (moderation, ids only) and E2 (any deanonymization event) are spec-required. E3–E8 are proposed per O2's list (card publish/version changes, threshold/grading publication, sharing/revocation/export, role/TA permission changes, institutional config changes). Storage L1 + L2 as O2 defines them. Retention is a placeholder (Q17) | — |
| **Q17** | Prototype: a clear "prototype data may be wiped" notice (D4) plus lifecycle hooks (D2). Before any UW pilot, retention is set with UW's privacy office (D3). Crypto-shred (R1) offered as an option | — |
| **Q18** | W2 + F2: the instructor sets survey-open, sharing-open and sharing-close dates when publishing the participation policy; export/apply only after close, when shares become final | — |
| Q1 / Q7 / Q19 | Q1: minimal admin settings (A2) and an `institution` table holding the §4 configurables from day one. Q7: **no impersonation** (I0); optional synthetic "view as role" preview. Q19: externalise strings from day one (L1); English only for now | — |
| Q10 / Q11 / Q12 | Defer: the wizard to M2 (manual editor in M1); ranked grading and the export format to M2. The owner must supply the wizard rule table and curated resources (Q10), ranked defaults (Q11) and the LEARN export format (Q12) | — |
| **Q2 milestone 1** | The owner's stated goal (a public, sign-in-able, polished prototype) plus O2's candidate feature set, split in two. **M1a:** sign-in, courses/enrolment/roles, institution config, Course and Assignment AI Cards (manual editor, versions, visible overrides), transparency-bonus fields, audit, tests, deployment docs. **M1b:** anonymous board, moderation, presentation mode, search/filters, private participation counter and levels, in-app notifications. M1b content code starts only after ADR 0003 is accepted and the threat model exists (§6.3). Merge goes in M1b if feasible (PQ-08) | Later (M2): wizard, sharing, grading, survey, email notifications, level analytics |
| Design system (§8) | From `research/design-D1-system-a11y.md`: **shadcn/ui copy-in source + Tailwind CSS v4 on React Aria Components primitives**, with **Base UI** as the fallback primitive base (choose after a short spike: shadcn's `style` can't change after init, and switching the primitive base later is costly; a Radix→Base UI migration path exists, but none to or from React Aria; new projects default to Base UI, so React Aria needs `--base aria` explicitly; PQ-D1-12 → decision in plan). Heavily customised: our own three-layer CSS-custom-property tokens, calm palette, radii, typography and density; no gradients or sparkle icons (§8 "avoid AI-generated aesthetics"). Admin brand colours go through a server-side WCAG contrast guardrail (UW gold pairs accessibly only with black, per D1). Open-licence, self-hosted fonts. **No UW or D2L logos, fonts or BrightspaceUI components**; GOV.UK/USWDS used as pattern and content sources only. WCAG 2.2 AA, with AAA 2.4.13 and 1.4.6 as stretch goals for presentation mode. axe via Playwright in CI plus a manual NVDA/VoiceOver/zoom/forced-colours checklist; passing axe is never presented as conformance | Reflect in ADR 0001's UI layer and in `plan.md` |
| Testing (§9) | Take from `research/testing-T1-strategy.md` plus the privacy judge §6–§7 controls and tests (catalogue assertions in CI, canary scans of UI/API/exports/logs, identifier tests, merge property tests, authorization matrix) | — |

## 4. Canonical proposed new open questions (PQ-01 to PQ-58, plus PQ-59+ for design and testing)

Use these IDs in every final document. "When" says when an answer is needed: **ADR** (before the named ADR is
accepted), **M1a / M1b / M2 / Pilot / Prod** (before that work starts). Raw-note IDs are in brackets for
traceability.

### Scope, users, governance

| ID | Question | When |
|---|---|---|
| PQ-01 | Will the public prototype be used with **real UW courses and students**, or only demo courses and invited testers? [NQ-2a] | M1a |
| PQ-02 | Is a UW privacy review (Information Risk Assessment), a signed DPA or other institutional approval needed before real UW users sign in? Who is the UW sponsor? [PQ-J3, PQ-A1-7, PQ-A2-4, NQ-17b] | M1a (if PQ-01 = real) |
| PQ-03 | Is anyone paid to build or run ClearCourse AI, or is commercialisation intended? (Decides Vercel Hobby eligibility.) [PQ-J2] | ADR 0002 |
| PQ-04 | Is the "<$5/month" target USD or CAD, including tax? At a free-tier limit, is a hard stop (outage, no bill) or automatic billing (no outage) preferred, and what ceiling? [PQ-J1, PQ-J7] | ADR 0002 |
| PQ-05 | Expected pilot scale: number of courses, students, largest course? [PQ-J15] | Pilot |
| PQ-06 | Do prototype accounts and data carry over into production, or does production start fresh? [PQ-A1-4, PQ-A2-9] | M1a |
| PQ-07 | Domain and name: `.ca` (CIRA presence rules) or `.com`; has "ClearCourse AI" been checked for conflicts; may the app use UW's name or marks, and should it say it is not an official UW service? [PQ-J16, D1] | M1a |
| PQ-08 | Is the M1a/M1b split acceptable, and must duplicate merge be in milestone 1? [NQ-2b, NQ-2c] | M1a |
| PQ-09 | Must the prototype and/or production keep processing and stored data in Canada or on institution-hosted infrastructure, and which data (DB, logs, backups, email metadata)? [PQ-J4, PNQ-B12, PQ-P23, NQ-O7] | ADR 0002 (prototype), Prod |

### Trust boundary and operations

| ID | Question | When |
|---|---|---|
| PQ-10 | Is the platform operator (the owner, later UW IT) inside the trust boundary for the prototype? For production? [PQ-J5, PQ-P1, NEW-3] | ADR 0003 |
| PQ-11 | Are IP addresses and request metadata identity-bearing under §6.2, and what platform-log retention is acceptable? [PQ-J6, NQ-A16] | ADR 0003 |
| PQ-12 | May any third-party error-reporting or analytics tool run, especially on routes receiving anonymous content, and with which data-collection settings? [PQ-J13, PQ-P9, NEW-4] | ADR 0001 |
| PQ-13 | Must per-domain secret isolation be platform-enforced (separate deployments) in the prototype, or are separate DB roles in one deployment acceptable? [PQ-J14] | ADR 0003 |
| PQ-14 | Are database backups and dumps "exports" under §3/§6.2? Where may they be stored, under which keys, for how long? [PQ-J11, PQ-P19] | M1a |
| PQ-15 | Must preview and staging environments use only synthetic data? [PQ-J10] | M0 |
| PQ-16 | Who may hold the KEK, and may AI coding agents or tools ever access production data, secrets or logs (e.g. via MCP)? [PQ-J12, PQ-P21] | M0 |
| PQ-17 | Must presentation mode and voting update live (push), or is periodic refresh acceptable? What availability/latency counts as "credible" (cold starts, idle pauses)? [PQ-J8, PQ-J9] | M1b |
| PQ-18 | Is Next.js `proxy.ts` (code Vercel runs in all regions) acceptable, or must all application code run in the chosen region? [PQ-J18] | ADR 0001 |

### Board behaviour (each "yes" weakens the no-author property P1)

| ID | Question | When |
|---|---|---|
| PQ-19 | Does hiding or deleting content remove the participation credit it earned? [PQ-P2, NQ-20c] | ADR 0003 |
| PQ-20 | Are self-upvotes allowed? May students withdraw an upvote? After a merge, does a student who upvoted both keep two "upvotes given"? [PQ-P3] | ADR 0003 |
| PQ-21 | Who receives "Answer posted" and "Question merged"? Does asking a question auto-follow it? [PQ-P4] | ADR 0003 |
| PQ-22 | May students see, edit or delete their own anonymous posts? [PQ-P17, NQ-20d] | ADR 0003 |
| PQ-23 | How are repeat anonymous abusers handled: moderation and rate limits only, or a "sanction without reveal" handle? [PQ-P18] | ADR 0003 |
| PQ-24 | What precision is stored and shown for post times (e.g. 15 min, 1 h, 1 day)? [PQ-P7, PQ-A1-6, PQ-A2-7] | ADR 0003 |
| PQ-25 | On merge: what happens to answers, "Still unclear" marks and open reports on the merged-away question, and when is preserving a comment "not reasonable" (§7.7)? Is "Still unclear" one mark per student per answer, and who sees the count? [NQ-A6, PNQ-B3, PNQ-B4, NQ-20b] | M1b |
| PQ-26 | Can hidden content be un-hidden and deleted content restored, and by whom? [NQ-20a] | M1b |
| PQ-27 | Does staff identity next to content (e.g. "hidden by TA X" in the moderation log) count as identity-bearing under §3? [PQ-P14, NQ-20e] | M1b |
| PQ-28 | Is it acceptable that a newly posted item is shown from the POST response, not a GET of its id (avoids a host-log authorship link)? [PQ-P22] | M1b |
| PQ-29 | Can one person be a TA and a student in the same course? [PQ-P15] | M1a |

### Participation, sharing, survey, analytics

| ID | Question | When |
|---|---|---|
| PQ-30 | Crediting mode: synchronous (instant counts) or daily batch (counts lag up to a day, with explanatory copy)? [PQ-P8, NQ-A10, PNQ-B1] | ADR 0003 |
| PQ-31 | Are in-term level counts wanted at all? If so, on what cadence (fixed weekly with lag, or end-of-term only), and which differencing rule applies? [PQ-P5, NQ-16c, NEW-1] | M2 (rule shape: ADR 0003) |
| PQ-32 | Are survey results shown only after the survey closes? Is duplicate-submission prevention wanted? Is the survey a required step before sharing, or shown first and skippable? [PQ-P6, NQ-18b] | M2 |
| PQ-33 | How is "threshold changes that would disadvantage them" read, and when does participation "begin" (§7.9)? [PQ-P20] | ADR 0003 |
| PQ-34 | Is a shared level frozen at share time or live until finalisation? Can a student share before the end of the course? May the instructor move sharing dates after publication? [PQ-P16, NQ-18c, NQ-18a] | M2 |
| PQ-35 | Presentation mode and analytics: snapshots (proposed) or live totals? [PQ-P11] | M1b |
| PQ-36 | Is N the same for level counts and survey reveal? May instructors lower it, and is there an institution floor? [NQ-16a, NQ-16b] | M2 |
| PQ-37 | Does "applies the result" (§7.10) mean an in-app action, a LEARN grade push, or both? [NQ-12a] | M2 |

### Notifications and email

| ID | Question | When |
|---|---|---|
| PQ-38 | Must all eight §7.13 types have an email channel, or may activity-linked types be in-app only or digest-only? What is the default per type and channel, and is "essential" per channel? [NQ-O1, NQ-O2, NQ-O4, NQ-13b] | M2 (in-app: M1b) |
| PQ-39 | Which events count as "followed question updated"? Which card edits trigger "card changed", and who are the "affected students" (§7.6)? [NQ-O3, NQ-O5] | M1a |
| PQ-40 | Email copy: one generic template for all content-related notices? May emails name the institution or course code? Is the level stated in the "level reached" email? [NQ-O6, PQ-P10, NQ-13a, NEW-7] | M2 |
| PQ-41 | Digest design (personal or course-wide), cadence and send time; hold digests until at least k recipients share a window? [NQ-O11, NQ-O12] | M2 |
| PQ-42 | Is the owner willing to hold an AWS account on the Paid plan for SES? Would UW IST provide a sanctioned sending path? Does CASL apply? What provider log/body retention is acceptable? Is a fallback provider wanted? [PQ-J17, NQ-O8, NQ-O9, NQ-O10, NQ-O13] | M1a (sign-in email) |
| PQ-43 | Notification "seen" marker: server-side at day precision under a keyed HMAC, or client-only? [PQ-P12] | M1b |

### Sign-in and provisioning

| ID | Question | When |
|---|---|---|
| PQ-44 | May we test and use sign-in against UW's Entra tenant without asking UW first? (It creates a service principal in UW's directory and appears in UW's sign-in logs.) [PQ-A1-1] | ADR 0004 |
| PQ-45 | Which email domains count as institutional (uwaterloo.ca only? subdomains?), and may alumni and retirees sign in? [PQ-A1-2] | ADR 0004 |
| PQ-46 | In the prototype, who may become an Instructor or institutional admin, and how is that verified? Is a join code acceptable proof of enrolment? May instructors upload rosters before a UW review? [PQ-A1-3, PQ-A2-3] | M1a |
| PQ-47 | What does "sign in securely" (§10) require: session lifetime, idle timeout, MFA or passkeys for staff (NIST AAL1 vs AAL2)? [PQ-A1-5] | ADR 0004 |
| PQ-48 | May the auth library store IP address, user agent and created/updated times on sessions, and must session refresh be disabled? [PQ-P13] | ADR 0004 |
| PQ-49 | What is the authoritative source of the "student name" shared under §7.10 (self-entered, directory claim, LTI)? What profile data, if any, beyond sign-in needs? [PQ-A1-8, PQ-A1-9, PQ-A2-5] | M1a |
| PQ-50 | LTI details for production: role mapping, TA default permissions, iframe vs new window, what one course is in LTI terms, manual courses alongside LTI, NRPS use and fields, grade-passback identifiers, 1EdTech certification [PQ-A2-1, -2, -5, -6, -8, -10, -11, -12] | Prod |

### Other

| ID | Question | When |
|---|---|---|
| PQ-51 | Does UW require a newer WCAG version, a VPAT/ACR, or an accessibility review beyond Policy 58? [NQ-15a] | Pilot |
| PQ-52 | Must the limitations of anonymity be visible in the app, or is the repo document enough? [NQ-8a] | M0 |
| PQ-53 | Does a UW records-retention schedule apply to the audit logs of a teaching tool? [NQ-14a] | Pilot |
| PQ-54 | On account removal, does a student's anonymous content stay, go, or does the student choose? [NQ-17a] | M1b |
| PQ-55 | Can the missing text of the spec's Administration section be recovered, or will the owner write it? [NQ-1a] | M1a |
| PQ-56 | Is a synthetic whole-course "view as student" preview wanted? [NQ-7a] | M1a |
| PQ-57 | Who translates and approves verbatim spec texts if a second language is added? [NQ-19a] | Later |
| PQ-58 | May the wizard ship without recommendations before the rule table (Q10) exists? [NQ-10a] | M2 |

### Design and accessibility (from D1; mapped)

D1's PQ-D1-1 merges into **PQ-07**, PQ-D1-3 into **PQ-51**, PQ-D1-5 into **PQ-24**, and PQ-D1-12 becomes a plan
decision (React Aria vs Base UI after a spike).

| ID | Question | When |
|---|---|---|
| PQ-59 | How close may the information architecture and visual design be to LEARN/Brightspace without implying D2L affiliation? [PQ-D1-2] | M0 |
| PQ-60 | Is UW a designated public sector organization under O. Reg. 191/11, and do the IASR educational-institution duties apply? [PQ-D1-4] | Pilot |
| PQ-61 | May admins save a brand colour that fails the contrast checks, or is the guardrail absolute? [PQ-D1-6] | M1a |
| PQ-62 | Which Course AI Card fields map to which Assignment AI Card fields for the "differences shown visibly" comparison (§7.4)? [PQ-D1-7] | M1a |
| PQ-63 | Who writes and approves UI copy (anonymity explanations, override markers, status help text, empty states)? [PQ-D1-8] | M1a |
| PQ-64 | Is dark mode wanted? Is an accessibility statement page wanted in milestone 1? Is there budget for a JAWS licence, an external audit and testing with disabled users before production? Can presentation mode be checked on real UW classroom projectors? [PQ-D1-9, -10, -11, -13] | M1a / Pilot |

### Testing (from T1; mapped)

T1's PNQ-T5 merges into **PQ-25**. PNQ-T4 (which survey metadata is "necessary", e.g. a submission date) merges into
**PQ-32**. PNQ-T2's "may a student's own view show 'you asked this'" part merges into **PQ-22**.

| ID | Question | When |
|---|---|---|
| PQ-65 | Must the mandatory negative tests also cover institutional admins and the operator? (§9 names only instructors and TAs) [PNQ-T1] | M0 |
| PQ-66 | How strict is the canary scanner: any identity canary next to any content canary, or only a student next to their own content? [PNQ-T2] | M0 |
| PQ-67 | What is the exact list of TA permissions an instructor can assign? (§5 gives only examples) [PNQ-T3] | M1a |
| PQ-68 | Private or public GitHub repository? (Affects free CI minutes and runner size.) [PNQ-T6] | M0 |
| PQ-69 | Is an external security/privacy/accessibility review wanted before production? Is there any required coverage or mutation-score threshold? [PNQ-T7, PNQ-T8] | Pilot / M0 |
| PQ-70 | Should the negative suite also run against deployed previews (synthetic data)? How long are CI artefacts with canaries kept? Is a read-only post-deploy catalogue self-check against production acceptable, and with which credentials? [PNQ-T9, PNQ-T10, PNQ-T11] | M1a |

**Testing canonical (proposal):** Vitest 5 (unit, property, DB and API tests) with fast-check, against a real
Postgres (GitHub Actions service container in CI, Testcontainers locally; **not PGlite** for anything that depends
on roles). SQL catalogue assertions (pgTAP optional). Playwright + @axe-core/playwright. A canary co-occurrence
scanner over UI DOM and RSC payloads, API bodies and headers, exports, app and Postgres logs, and traces. A
deny-by-default role × endpoint matrix generated from the route list. dependency-cruiser boundary rules as the CI
gate. StrykerJS scoped to privacy modules, run weekly. Every §10 criterion maps to named tests. All of it runs
within GitHub Actions Free (2,000 private-repo minutes; blocked, not billed, without a payment method).

## 5. Plan skeleton for `docs/plan.md` (the plan writer refines it; session counts are unmeasured estimates)

**Milestones**

| Milestone | Goal | Contents (§ refs) | Gate to start | Est. sessions | Running cost (USD/month) |
|---|---|---|---|---|---|
| **M0 Decisions and foundations** | No product features. Settle the Tier-1 decisions, validate the proposed ADRs with spikes, and lay the safe foundation | Owner decisions; spikes (throwaway, outside the repo): Vercel+Supabase measurement through Supavisor, log capture per platform, CI→Supabase connectivity and Postgres version, system-column visibility (`xmin` through tables/views/functions, judge T-21), Better Auth session fields/refresh, SES production access, optional Entra consent test; threat model v1 (§6.2, §11, Q8); repo scaffold (Next.js, TypeScript, lint/format, Vitest, Playwright + axe, GitHub Actions with a Postgres service at Supabase's version, container build, Dependabot); DB foundation (schemas, roles, migration pipeline, catalogue-assertion suite, linkage-module skeleton, `institution` table); design-system foundation (tokens, typography, layout shell, core components, a11y baseline) | Owner answers Tier-1 decisions; ADRs 0001–0004 accepted after spikes | 6–8 | ≈ 0–1.2 (domain + SES once set up) |
| **M1a Prototype: cards** | A public, sign-in-able, polished product without anonymous content | Sign-in (§10), courses, enrolment and roles incl. TA permissions (§5), institution config (§4, §7.15 minimal), Course AI Card (§7.3) and Assignment AI Cards (§7.4) via manual editor with preview, drafts, publish, version history and change records (§7.6), visible overrides, transparency-bonus fields (§7.5), audit for shipped events (§7.17), prototype notice (Q17), deployment docs (§11) | M0 done; Q15, Q1 scope, PQ-01/02, PQ-46 answered | 7–9 | ≈ 1.12–1.17 |
| **M1b Prototype: anonymous board** | The core promise, built privacy-first | Board ask/comment/upvote/follow/"Still unclear"/report with two tags only and filters (§7.2, §7.7), moderation incl. queue and rate limits (§7.7, Q20), merge (§7.7, if PQ-08), presentation mode (§7.8), search and sorts (§7.14), private participation counter and three levels with published thresholds (§7.9, §7.10 private view), in-app notifications (§7.13 subset), full negative privacy suite (§9) | ADR 0003 **accepted** and threat model v1 approved (§6.3); PQ-19…PQ-24, PQ-30, PQ-33 answered | 9–12 | ≈ 1.12–1.17 |
| **M2 Full course lifecycle** | Everything else in §7 | Wizard (§7.6, Q10), change notifications to affected students (§7.6), email notifications as digests (§7.13, Q6, Q13), student-controlled sharing (§7.10, Q18), grading settings and result/export (§7.11, Q11, Q12), end-of-course survey (§7.12, Q16, Q18), analytics with snapshots and suppression (§7.16, Q16), audit completion (§7.17, Q14), retention jobs (Q17) | Q10, Q11, Q12, Q13, Q16, Q18 and PQ-31/32/34/36–41 answered | 10–13 | ≈ 1.2 (SES grows with digests) |
| **M3 Pilot readiness** | Safe for a real UW course | UW sponsor and IRA-PIA (PQ-02), Supabase Pro (backups, no pausing) and restore drill, Vercel Pro or Cloud Run move if required, threat model published and user-facing limitations page live, security review checklist, external accessibility review (PQ-51), retention set with UW (Q17), Entra SSO if UW allows | UW engagement | 4–6 | ≈ 27 (Supabase Pro), ≈ 47 with Vercel Pro |
| **M4 Production** | §10 acceptance criteria all demonstrated | LTI 1.3 launch, Deep Linking, AGS, optional NRPS (§10, Q5, PQ-50), full administration (§7.15, Q1), multi-institution configuration (§4), production hosting and residency (PQ-09), optional B topology/KMS (PQ-10), §6.4 process only if institutional policy requires it, full §10 acceptance suite | LEARN registration approved by UW | 10–14 | ≈ 52–62 lean; ≈ 152–162 with PITR; institution-hosted unknown |

**Prototype definition of done (proposal; the plan writer expands it, mapping each item to §10/§15):** M1a + M1b
shipped on the public domain; every M1 feature cites its § and nothing beyond it (§15.1); no §3 prohibition present
(§15.2); the negative privacy suite passes in CI: catalogue assertions, role × endpoint authorization matrix, canary
scans of UI pages, API responses, exports and captured logs, identifier tests, merge property tests (§9); WCAG 2.2 AA
automated checks pass and the manual checklist is done for every M1 page (Q15); the threat model and limitations of
anonymity are published (§6.2, §11); deployment documentation and restore runbook exist (§11); running cost under the
target with alerts set; no open question that an M1 feature depends on remains unanswered (§13).

**Prioritised decisions for the owner** (the plan writer turns this into a table: decision, recommendation, trade-off,
blocks):
- **Tier 1, before M0 ends:**
  1. Q2 milestone scope and split (PQ-08) and prototype users (PQ-01)
  2. Commercial status and Vercel Hobby (PQ-03) with the Cloud Run fallback; budget currency and failure style (PQ-04)
  3. ADR 0001 stack
  4. ADR 0002 hosting, incl. residency for the prototype (PQ-09)
  5. Operator trust boundary (PQ-10)
  6. ADR 0003 privacy mechanism, incl. integrity forks PQ-19 to PQ-24, PQ-30, PQ-33
  7. Q8 threat-model format and in-app visibility (PQ-52)
  8. ADR 0004 sign-in, incl. PQ-44, PQ-45, PQ-47, PQ-48
  9. Q5 provisioning approach and who may be an instructor (PQ-46)
  10. Q6 email provider and the AWS Paid account (PQ-42)
  11. Q15 WCAG 2.2 AA
  12. Error reporting/analytics (PQ-12) and IP as identity-bearing (PQ-11)
  13. UW privacy review before real users (PQ-02)
  14. Domain, name and branding (PQ-07)
- **Tier 2, before M1a/M1b features:** Q1 minimal admin; Q7 none; Q19 English with externalised strings; Q14 events
  E1–E8; Q17 prototype notice and hooks; Q20 rate-limit placeholders and moderation workflow; PQ-14, PQ-15, PQ-16,
  PQ-17, PQ-25 to PQ-29, PQ-35, PQ-39, PQ-43, PQ-49, PQ-54 to PQ-56.
- **Tier 3, before M2:** Q10, Q11, Q12, Q13, Q16, Q18, PQ-31, PQ-32, PQ-34, PQ-36 to PQ-38, PQ-40, PQ-41, PQ-58.
- **Tier 4, before pilot or production:** PQ-02 (if not already), PQ-05, PQ-09, PQ-50, PQ-51, PQ-53.

**Kickoff prompt:** the plan's last section holds a copy-paste prompt for **implementation session 1 = M0 spikes**,
which run in a throwaway folder outside the repo (no scaffolding of this repo until the ADRs are accepted, per
CLAUDE.md). It must:
- state its preconditions (the Tier-1 decisions answered and the Proposed ADRs reviewed); if any is missing, stop
  and ask
- cite the ADRs and this plan
- list the spikes, each with a pass/fail measure
- require results written to `docs/research/spike-results.md`, plus a proposed ADR update for the owner
- forbid closing any open question
- include the budget/agent rules from the session (at most 2 concurrent agents; incremental writes)

Also give a short **session prompt template** for every later session: read CLAUDE.md/CONTRIBUTING, the cited §, the
ADRs, the plan row; check §13/PQ dependencies; tests first for privacy; definition of done §15.


## 6. Late corrections from the final fact-check (`factcheck/other-2.md`) — apply in every document

1. **ADR 0004 / sign-in screen:** WCAG 2.2 SC 3.3.8 (Accessible Authentication, Minimum) means the 6-digit email code
   field must accept pasting the whole code and must not block autofill. A split six-box input that fills one digit on
   paste is the W3C failure example F109.
   https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html (checked 2026-10-11)
2. **shadcn base wording:** never say the base "can't change after init". Say: `style` can't change; changing the
   primitive base later is costly; a Radix-to-Base UI migration path is documented, none to or from React Aria. Keep
   the spike.
3. **Node version:** pin one Node line in CI, locally and on the host. Vitest 5.0.3, dependency-cruiser 18.6.0 and
   ESLint 10 need **Node 22.13+ on the 22 line, any 24.x, or ≥ 26** (not 23 or 25).
4. **Lint:** eslint-plugin-jsx-a11y 6.10.2 doesn't support ESLint 10 (peer range stops at 9). Either stay on ESLint 9
   with jsx-a11y, or use ESLint 10 plus Biome's a11y rules. The axe/Playwright gate is unaffected.
5. **Q15 legal floor:** Ontario's WCAG 2.0 AA duty covers *public* websites and falls on the organization that
   controls the site. Colleges and universities are designated public sector organizations. UW's accessibility
   pages name no WCAG version. WCAG 2.2 became a Recommendation on 5 Oct 2023 (updated 12 Dec 2024). AAA criteria are
   stretch goals only.
6. **Q16 sources:** the IPC (Ontario) de-identification guideline is the closest fit (illustrative thresholds 10/15/20).
   TBS binds federal institutions only; PTAC is US/FERPA guidance. N = 10 stays a placeholder.
7. **CI retention:** GitHub keeps workflow artifacts *and logs* for 90 days by default; shorten retention for
   canary-scanner output and traces (PQ-70). The Free artifact quota is 500 MB.
8. **pgTAP** is not in the stock `postgres:18` image, so prefer plain SQL catalogue assertions. **StrykerJS on Vitest 5
   is Unverified** (spike needed); Stryker never fails CI unless a threshold is set.
9. **Trademarks:** D2L forbids its marks in product, app or domain names and any implied affiliation. UW logo
   exceptions are given only in writing and "for official business" (PQ-07, PQ-59).
