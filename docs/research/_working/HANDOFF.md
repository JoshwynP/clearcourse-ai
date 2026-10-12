# Planning session handoff (work in progress)

- **Saved:** 2026-10-12, about 01:30 EDT, on branch `docs/research-and-build-plan` (local only, not pushed)
- **Status:** Research is about 80% done. Nothing in this folder has been reviewed, and nothing is binding.
  Everything here is a raw agent note or a **proposal**. [CONTRIBUTING.md](../../../CONTRIBUTING.md) is still the
  source of truth, and no open question has been closed.
- **What this folder is for:** raw material to be curated into the final deliverables. Remove it, or slim it down
  to an archive, before merging the branch.

## 1. Where things stand

| Area | Files (this folder) | State |
|---|---|---|
| Privacy, family A: one Postgres, database-enforced | `research/privacy-A-db-enforced.md` | Done |
| Privacy, family B: separated stores and services | `research/privacy-B-separated-services.md` | Done |
| Privacy, family C: cryptographic, user-held | `research/privacy-C-cryptographic.md` | Done |
| Privacy red team (attacks all three) | `critique/privacy-redteam.md` | Done. A **adequate**, B **adequate**, C **weak** |
| Privacy judge (comparison and recommendation) | `compare/privacy.md` | **Partial** (about 7 KB; interrupted) |
| Framework and data access (S0) | `research/stack-S0-framework-data-access.md` | Done |
| Hosting: Vercel + Neon, Vercel + Supabase | `research/stack-H1H2-vercel.md` | Done |
| Hosting: Cloudflare, container PaaS | `research/stack-H3H4-cloudflare-container.md` | Done |
| Stack fact-check | `factcheck/stack.md` | Done: 80 confirmed, 3 refuted, 1 outdated, 5 unverifiable; no recommendation changed |
| Stack and hosting judge | `compare/stack-hosting.md` | Done (the best single read for Q3) |
| Prototype sign-in (Q4) | `research/auth-A1-prototype-signin.md` | Done |
| Provisioning and LTI (Q5) | `research/auth-A2-provisioning-lti.md` | Done |
| Email and notifications (Q6, Q13) | `research/other-O1-email-notifications.md` | Done |
| Auth and email fact-check | `factcheck/other-1.md` | Done: 69 confirmed, 6 unverifiable, none refuted |
| Other blocking questions (Q15, Q16, Q20, Q8, Q14, Q17, Q18, Q1, Q7, Q19, Q10–Q12, Q2) | `research/other-O2-blocking-open-questions.md` | **Partial** (about 46 KB; interrupted, probably close to done) |
| Design system and accessibility (§8, Q15) | — | **Not started** |
| Testing strategy (§9, §10) | — | **Not started** |
| Fact-check of the last three branches | — | **Not started** |
| Machine-readable results (recommendations, options, claims, new questions) | `compare/structured-results.json`, `compare/structured-results-2.json` | Done |

The originals are also in `P:/code/_clearcourse-scratch/` (outside the repo). The workflow resumes from there.

## 2. Headline findings so far (unreviewed proposals)

**Stack and hosting (Q3)**, from `compare/stack-hosting.md`:

- **Stack:** Next.js 16 (App Router, Node runtime only, no `proxy.ts`), TypeScript, Drizzle ORM plus hand-written
  SQL migrations for roles, grants, RLS and SECURITY DEFINER functions, Zod 4.
- **Database:** Supabase Free in `ca-central-1`, used only as plain Postgres: Data API off, no Supabase Auth, no
  client SDK.
- **Hosting:** Vercel Hobby, functions pinned to `yul1` (Montréal).
- **Cost:** about **USD 1.17/month** (domain plus SES).
- **Fallback, same code:** a container on Google Cloud Run in Montréal with the same database.
- **The gate:** Vercel Hobby is "restricted to non-commercial personal use only" and has no DPA. The owner must
  answer whether this project qualifies, and whether a DPA is needed before real users sign in.
- **Known weak spots of Supabase Free:** it pauses after a week of inactivity and has no backups. The plan
  depends on nightly per-domain encrypted dumps and a weekly activity check.
- **The unvetted PDF advice (pp. 24–31), corrected claim by claim** (§14 of that file). Examples: AWS App Runner is
  closed to new customers; Cloudflare's $5 is a minimum charge, not a flat fee; D1 cannot host the
  database-enforced design; the "one-way hash" is reversible.

**Privacy mechanism (Q9)**, from the three designs and the red team:

- All three designs converge on these principles:
  - Content stores **no author at all**.
  - Per-student counters are keyed by `HMAC(course key, user)`.
  - Upvotes, follows and reports carry **per-item keyed tags**. Merges de-duplicate by testing roster members
    inside a locked function.
  - Course keys are held wrapped, and destroying a course key can make content permanently unlinkable (Q17).
  - Emails carry no content.
- **Family A**, one Postgres with locked roles and functions, is the cheapest to build (about 13–17 sessions,
  estimated). Its serious issues to fix:
  - The ordinary DB role can read `xmin`, which can link a sign-in to a post.
  - The master key is passed in SQL calls (variant K3).
  - The level-count view can be compared over time to work out who crossed a threshold with which post.
- **Family B** is stronger against the operator but costs about 29–39 sessions. "B-lite" sits in between.
- **Family C** is not recommended as the core mechanism. Exact merge de-duplication needs a per-course linkable
  pseudonym. Two of its ideas are worth adopting: a pseudonym-source interface for a later upgrade, and
  blind-signed one-time exit-survey tokens.
- **Design forks the spec doesn't settle.** Each of these weakens the "no author stored" property if allowed, so
  they are owner decisions:
  - Does "Answer posted" go to the asker?
  - Can students edit or delete their own posts?
  - Does deleted content lose its credit?
  - Can a repeat abuser be throttled?
  - Can students withdraw an upvote or upvote their own question?
  - What timestamp precision is stored and shown?

**Sign-in (Q4):** Better Auth with database sessions in the identity schema. A 6-digit **email code**, not a
clickable magic link, because Microsoft's link scanning can use up one-time links. Restricted to admin-configured
domains. "Sign in with Microsoft" only if a one-hour test shows UW lets ordinary users consent. Accounts are linked
on (issuer, subject), never by email.

**Provisioning (Q5):**

- **Prototype:** vetted instructors create courses manually; students join with a hashed, expiring code or link;
  TAs join by single-use invite. No roster upload before a UW privacy review.
- **Production:** LTI 1.3, which needs a UW sponsor, UW's Information Risk Assessment (IRA-PIA, which UW says
  "typically takes 2–4 weeks") and a LEARN admin to register the tool.
- **Data model:** use (issuer, sub) keys from day one so the switch needs no migration.

**Email (Q6):**

- **Provider:** Amazon SES in `ca-central-1` on an AWS **Paid** account plan, because Free-plan accounts close
  after 6 months. Resend is the dev fallback, but its free tier is capped at 100 emails a day.
- **Privacy:** emails carry no content and no type and link only to a generic notifications page. Activity
  notifications go out in scheduled digests, never at the moment of the action.

**Proposed new open questions:** about 80 so far, across all branches. Section 20 of `compare/stack-hosting.md`
already merges the stack ones (PQ-J1 to J18). The rest sit in each note's "open questions" section and in the
`new_open_questions` fields of the JSON files. They still need to be de-duplicated into one list.

## 3. What's left

1. **Finish the research:** resume the workflow (section 4). Five agents remain:
   - the privacy judge (continues from its partial file)
   - the open-questions branch (continues from its partial file)
   - design system and accessibility
   - testing
   - the last fact-check
2. **Synthesis (main session):** read the privacy judge and the integration questions. Write one canonical
   decision brief: the recommended architecture, one de-duplicated list of proposed new open questions, the
   milestones and the cost per phase.
3. **Writing and review (workflow):**
   - Final `docs/research/` files, one per branch: privacy architecture, stack and hosting, prototype auth and
     provisioning, blocking open questions (including email), design system and accessibility, testing
     strategy. Add each to `docs/research/README.md`.
   - Draft ADRs 0001–0004, status "Proposed": stack, hosting, privacy mechanism, prototype auth.
   - `docs/plan.md`: milestones, features with § references, build order, cost per phase, risks, prototype
     definition of done, prioritised decisions with recommendations and trade-offs, and the kickoff prompt for
     session 1.
   - Then an adversarial review pass: spec fidelity, privacy, consistency.
4. Commit locally on this branch (don't push). Remove or archive this `_working/` folder.

## 4. How to resume

In this Claude session (or a new one), ask Claude to resume the remaining-research workflow:

```text
Workflow({
  scriptPath: "P:\code\claude-config\projects\P--code--cc-tools\6cc62eca-1003-476e-886f-88374683d966\workflows\scripts\clearcourse-research-remaining-wf_6675f7b2-0a7.js",
  resumeFromRunId: "wf_6675f7b2-0a7"
})
```

- The three finished agents (privacy C, red team, auth/email fact-check) replay from cache. Their prompts were
  verified unchanged.
- The two interrupted agents have a "read your partial file and continue" note.
- The script's non-ASCII characters were converted to `\u{…}` escapes, because the tool rejected the file
  otherwise. Prompts are identical at runtime.
- If the cache misbehaves, the safe alternative is a fresh small workflow that reads the files on disk.

## 5. Operating lessons from this session (they set the pace)

- **Budget cap:** the Bedrock proxy allows **$30 per hour**. Seventeen parallel agents hit it in about 10
  minutes. Two concurrent agents run at about $24–25 an hour, so **keep at most 2 agents running at once**.
- **Opus only:** the `sonnet` model override is silently routed to Opus on this proxy, so there's no cheaper
  tier.
- **Long responses get dropped:** agents that tried to write a whole document in one response hung for 30–90
  minutes and then failed ("Request timed out" or "The response stopped arriving"). Instruct agents to write one
  section per tool call, run them at effort `high` rather than `xhigh`, and check transcripts for stalls longer
  than 20 minutes.
- **Resume cache:** once one agent call changes, every later call re-runs. Order changes first, or start a fresh
  workflow that reads files from disk.
- **Sleep:** the computer sleeping ends the session and stops running agents. To run overnight, Claude can ask
  the desktop app to keep the computer awake (you approve it once).
