# ClearCourse AI: practical build plan

Updated 2026-10-12. This is the working sequence for a solo builder. The longer `docs/plan.md` remains a research-backed reference, not a list to finish before building.

## What the existing plans cover

The long plan covers the complete product: course and assignment AI cards, instructor editing, anonymous discussion, moderation, presentation mode, private participation levels, student-controlled sharing, notifications, surveys, analytics, administration, tests, and deployment. ADRs 0001–0004 propose the application stack, hosting, privacy mechanism, and authentication. They are still **proposals**. `CONTRIBUTING.md` is the product source of truth.

This document turns that scope into small, demonstrable releases. Each stage ends with a screen or behaviour you can inspect. Do one stage at a time.

## Product direction

The interface should feel like an ordinary, familiar course communication site: a home page, a course list, a conversation area, and AI guidance within reach. Use the University of Waterloo palette — black, white, grey, and gold — with a black banner, the University wordmark, the ClearCourse name linking home, and the four-level gold colour bar. Keep flat borders, compact spacing, plain system typography, and obvious text labels. Gold is for the colour bar and highlights; text on white or grey stays black. Avoid gradients, glossy cards, rounded dashboard tiles, decorative icons, and AI imagery. Do not copy WhatsApp branding or assets. The current static prototype is a design and interaction reference, not production code that must be preserved.

The completed service must follow `CONTRIBUTING.md`: exactly one Course AI Card and one card per assignment, exactly Course or Specific Assignment tags for questions, architectural anonymity, private participation based only on questions/comments/upvotes, and sharing controlled by the student. Never add AI detection, student scoring, or automatic policy generation.

## Release sequence

| Stage | Build one visible slice | Done when |
|---|---|---|
| 0. Public fictional preview | Put the current static prototype on a preview URL. Keep its prototype notice and fictional data. Get feedback from at least one instructor and a few students on the layout and language. | Someone can open it without installing anything and describe where the assignment rule and discussion live. No real course data is entered. |
| 1. App foundation | Decide Q3: accept or revise ADR 0001 and 0002. Recommended starting point to evaluate: a TypeScript web app using Next.js, server-side routes, and PostgreSQL, as the ADRs propose. Create the app skeleton, CSS tokens, basic accessibility checks, and a test command. Rebuild only the course shell and static card view first. | A fresh clone starts with one documented command; the same course/card views render through the real app framework; tests and build pass. |
| 2. Authentication and courses | Decide Q4–Q5. Implement a pilot-appropriate sign-in path and course membership. Add student, instructor, and TA role checks at every server route. Use sample courses first. | A student sees only enrolled courses; an instructor can edit only assigned courses; unauthorised requests fail in API tests. |
| 3. Card data and editing | Add course and assignment tables, validation, and a manual instructor editor. Support draft, preview, publish, archive/supersede, and version history. Show assignment overrides prominently. Keep LEARN as the submission destination; do not accept files. | An instructor can publish a card, change it with a recorded reason and effective date, and a student can see the published version and differences. Tests cover each transition. |
| 4. Small card-only pilot | Deploy the authenticated card workflow to a controlled pilot. Have instructors review the wording and students find the guidance. Fix confusing parts and accessibility defects. | A limited real course can read its cards reliably. There is still no real discussion or participation tracking. |
| 5. Privacy design gate | Decide Q8–Q9. Write the threat model and choose the separation mechanism before accepting real anonymous content. Define what logs, error reports, exports, and admins can see. Implement negative tests first. | Tests prove ordinary app routes, instructor/TA views, logs, exports, and identifiers cannot reveal a post author. Review the mechanism before stage 6. |
| 6. Discussion | Add the course board with only Course or Specific Assignment tags. Build asking, replies, upvotes, search/filter, instructor answers, reports, moderation, rate controls, and duplicate handling. Keep author identity out of content storage. | Real enrolled students can discuss; instructors can moderate and answer but cannot access author mappings. The negative privacy suite passes. |
| 7. Private participation | Count only questions, comments, and upvotes. Show each student their own counts and the three required levels. Add student-controlled sharing of the final verified level, with no activity breakdown for instructors. | Student can verify the count and share/revoke according to the published rules; instructor receives only name, level, and share date. Tests prove no underlying actions leak. |
| 8. Classroom and course operations | Add presentation mode, notifications, grading settings/export, and audit events, one feature at a time. Decide their open questions when each feature starts. | Every added feature has its own demo, acceptance test, and privacy review. |
| 9. Wider release | Add end-of-course survey, privacy-safe aggregates, administration, institutional integration, retention/deletion, monitoring, and deployment operations. Recheck policy/legal/institutional requirements before onboarding broader use. | Production acceptance criteria in `CONTRIBUTING.md` §10 pass, including security and accessibility review. |

## After the front end

The public preview in `public/` is the front-end reference: the open course shows its conversation and guidance together, and its sections appear in the sidebar only while that course is open. Finish feedback on that layout before backend work.

The local app first gained stage 2 practice sign-in, course join codes, and always-anonymous questions (ADRs 0008 and 0009). The public preview in `public/` remains fictional and has no accounts.

The next hosted practice slice is recorded in ADR 0010. The Next.js app now has
database-backed practice accounts, courses, cards, and a separate content store.
The Vercel project now uses `web/` as its root and the two Neon databases in
`web/SETUP.md`. The original static preview remains in `public/` as a design
reference. The hosted app uses practice accounts; do not enter real student
information.

The hosted practice branch now adds saved assignment drafts and publishing,
assignment-tagged discussion filters, and private participation counts with
student-controlled level sharing. Migration 003 is required in the identity
database. This remains a practice release: email and Professor status are
unverified, the participation counter is not transactionally coupled to the
content database, and the full privacy gate still blocks real student use.

## The next seven Cursor sessions

1. **Finish the look.** Review the flatter prototype on desktop and phone. Make one small visual change at a time; do not add features.
2. **Publish the fictional preview.** Follow `CURSOR-START-HERE.md` to connect Vercel to the private repo and deploy only `public/`. Verify the URL and keep the demo notice. Do not enter real student information.
3. **Close Q3 for the app.** Review ADR 0001 and 0002, update current package and hosting facts, make a short decision record, then stop research.
4. **Scaffold the real app.** Create the framework project on a new branch, with one route for the course list and one for a card, a build command, and a smoke test.
5. **Move the visual shell.** Carry over the plain visual language and responsive layout. Keep sample data and no sign-in yet.
6. **Close Q4–Q5.** Done for this pilot in ADR 0008: practice sign-in, Professor or Student chosen first, and course join codes, with denial tests.
7. **Build the first real card.** Create a course card as a draft, preview it, publish it, and read it as a student. Add assignment cards in the next session.

After each session: run the app, inspect the changed screen, run the relevant tests, commit the change, and write the next slice in one sentence. Do not ask an agent to implement all nine stages at once.

## Cursor Pro setup and spending discipline

As of 2026-10-12, Cursor lists Composer 2.5 and Grok 4.7 in its Cursor Models pool, and Claude Sonnet 5.5, Claude Opus 5.5, and others in its separate Other Models pool. Your exact included use and model picker may differ by account; check Cursor's usage dashboard before enabling extra paid usage. [Cursor models and pricing](https://cursor.com/docs/models-and-pricing)

| Work | Cursor mode and model | Effort |
|---|---|---|
| Small CSS, copy, docs, simple components | Agent with Composer 2.5 or Grok 4.7 | Low or normal. Require a screenshot or focused test. |
| Ordinary multi-file feature work | Agent with Claude Sonnet 5.5 | Medium/high only when the task needs it. One feature slice per chat. |
| Architecture or privacy decisions | Plan/Ask with Sonnet 5.5 first; optional independent Opus 5.5 review of one concrete ADR or threat model | High only for the bounded review. No open-ended exhaustive research. |
| Troubleshooting a difficult failure | Debug mode with Sonnet 5.5 and the exact error/reproduction | Increase effort only after a narrower attempt fails. |

Cursor says Sonnet 5.5's maximum effort uses substantially more tokens than its normal high-effort setting. Use Opus only for a specific hard question with a stop condition, not as a five-hour unattended researcher. [Sonnet 5.5 model page](https://cursor.com/docs/models/claude-sonnet-5-5) · [Opus 5.5 model page](https://cursor.com/docs/models/claude-opus-5-5)

Use **Agent** for bounded implementation, **Ask** for a read-only question, and **Plan** only when a stage has multiple architectural choices. Cursor's own guidance says small familiar changes can go directly to Agent. [Cursor Plan Mode](https://cursor.com/docs/agent/plan-mode) · [Cursor Agent modes](https://cursor.com/help/ai-features/agent)

Set your own usage ceiling in Cursor. After each substantial run, inspect the diff and usage. Start a fresh chat for the next slice. Keep `AGENTS.md` in the repository so Cursor sees the project constraints. [Cursor rules and AGENTS.md](https://cursor.com/docs/rules)

## Prompt to start the real app foundation

Copy this into a fresh Cursor Agent chat after Q3 is decided:

> Read AGENTS.md, CONTRIBUTING.md §§2, 3, 6, 7.1–7.4, 8, and BUILD-NOW.md stage 1. Implement only the real app foundation: framework scaffold, one sample course list, one read-only sample AI card, the plain visual style, a local run command, and a smoke test. Do not add authentication, anonymous posting, participation counters, or new research. Run the app and tests, inspect the screen, and report changed files, results, and the next smallest slice. Stop when those acceptance checks pass.

## Decisions that need the owner

- Q3: production hosting of the database-backed app, the database access library, and the UI component library. ADR 0007 accepts the local Next.js foundation. ADR 0008 keeps the signed-in app on the developer machine. ADR 0002 and the rest of ADR 0001 are still proposals.

Decide other open questions at the stage that needs them. This keeps the research proportionate to what is being built.
