# CLAUDE.md

Instructions for Claude working in this repository. `AGENTS.md` contains the short shared guidance
for Cursor and other coding agents; the product requirements remain in `CONTRIBUTING.md`.

## The one rule

**[CONTRIBUTING.md](CONTRIBUTING.md) is the source of truth.** Read it before doing any
implementation work. If a requirement isn't written there, it isn't a requirement. The owner cannot
afford hallucinated scope, so never fill gaps with assumptions.

## Before writing any code

1. Find the CONTRIBUTING.md section(s) the task implements (cite them like `§7.7`).
2. Check §3 (hard prohibitions) and §6 (privacy architecture). If the task would touch anything
   there, stop and ask.
3. Check §13 (open questions). If the task depends on an unanswered question, **stop and ask the
   owner**. Don't pick an answer yourself.
4. Check `docs/decisions/` for ADRs that constrain the approach.

## Anti-hallucination rules

- Never invent requirements, fields, defaults, thresholds, copy text or integrations. Quote the
  spec; where it says "verbatim", copy the text exactly.
- Never present model knowledge (library APIs, vendor pricing, UW systems, policy content) as fact
  without verifying it against current docs or the source. If you can't verify something, say so.
- Never summarize Policy 71 or other institutional policy as authoritative. Link to it instead
  (CONTRIBUTING §4).
- If research in `docs/research/` conflicts with CONTRIBUTING.md, CONTRIBUTING.md wins. Point out
  the conflict to the owner.
- If a task is ambiguous, ask. A short question costs much less than wrong code.
- Report honestly. If tests fail, a step was skipped or something is only partially done, say so
  plainly.

## Privacy is non-negotiable

ClearCourse AI's core promise is that anonymous content can't be linked to student identity by
instructors, TAs, admins, logs, exports or predictable IDs (CONTRIBUTING §6). For any code that
touches identity, content, participation or survey data:

- Keep identity and anonymous content in separate stores, accessed through separate, narrowly scoped
  code paths.
- Never log, trace, export or display identity together with anonymous content. That includes debug
  logging and error messages.
- Never use sequential or guessable IDs for anonymous content.
- Write negative tests proving the mapping can't be retrieved (CONTRIBUTING §9).

## Keeping docs in sync

- When the owner answers an open question or makes a decision, update CONTRIBUTING.md (move the
  answer from §13 into the relevant section) and add a line to §16. Write an ADR for architectural
  choices.
- When the owner adds research to `docs/research/`, don't treat it as binding until the owner
  approves promoting it into CONTRIBUTING.md.
- Keep the README's "Status" line accurate.

## Current state

- **Stage:** A static, fictional-data experience prototype exists (`index.html`, `styles.css`,
  `app.js`), authorized by ADR 0005. `docs/plan.md` and ADRs 0001–0004 remain **Proposed**
  for the real application. They are advisory until approved, and CONTRIBUTING.md wins on any conflict.
- **Stack:** Not decided (CONTRIBUTING §12, Q3). ADR 0001 proposes one. Don't scaffold a framework
  until an ADR is approved.
- **Prototype command:** `python3 -m http.server 8000`, then open `http://localhost:8000`.
  `node --check app.js` checks JavaScript syntax. Add full build/test/lint commands once the real stack exists.

## Repo map

```
CONTRIBUTING.md        Source of truth: purpose, scope, requirements, open questions
CLAUDE.md              This file
README.md              Short overview and status
docs/plan.md           Proposed phased build plan, owner decisions, session kickoff prompt
docs/research/         Research (advisory). source-prompt.pdf is the original spec
docs/decisions/        Architecture Decision Records (ADRs)
```

## Conventions

Branches: `feat/…`, `fix/…`, `docs/…`, `chore/…`. Commits: Conventional Commits, citing the
CONTRIBUTING section. Full details are in CONTRIBUTING §14 and the definition of done is in §15.
