# Research

Raw research and source material. **Everything here is advisory.** It becomes a requirement only
after the owner approves it and it is written into [CONTRIBUTING.md](../../CONTRIBUTING.md).

| File | What it is |
|---|---|
| `source-prompt.pdf` | The original product prompt (pages 1–19 are the spec) followed by an AI chat about architecture and hosting (pages 20–31). |
| `source-prompt.txt` | Machine-extracted text of the PDF, for searching. The PDF wins if the two differ. |
| `privacy-architecture.md` | Branch 1 (Q9, §6): three privacy mechanisms (database-enforced, separated services, cryptographic), red-team findings, threat models, and the recommended "A+" mechanism. Informs ADR 0003. |
| `stack-and-hosting.md` | Branch 2 (Q3): framework and data access, four end-to-end hosting options with current pricing, a critique of the PDF's pages 24–31, and the recommended stack and fallback. Informs ADRs 0001 and 0002. |
| `prototype-auth-and-provisioning.md` | Branch 3 (Q4, Q5): sign-in without UW's cooperation, auth libraries, session design, identity linking, and provisioning from join links to LTI 1.3. Informs ADR 0004. |
| `blocking-open-questions.md` | Branch 4: the other §13 questions that block milestone 1 (Q6 email, Q13, Q15, Q16, Q20, Q8, Q14, Q17, Q18, Q1, Q7, Q19, Q10–Q12) and the candidate milestone-1 feature set (Q2). |
| `design-system-and-accessibility.md` | Branch 5 (§8, Q15): component and styling options, branding tokens with contrast guardrails, the accessibility process and the milestone-1 screen inventory. |
| `testing-strategy.md` | Branch 6 (§9, §10): test layers and tools, the mandatory negative privacy tests, and a map from each §10 acceptance criterion to named tests. |
| `_working/` | Raw, unreviewed agent notes from the 2026-10-11/12 planning session, kept for traceability (designs, critiques, fact-checks, judges, the decision brief). `_working/HANDOFF.md` describes them. The curated files above supersede them. Remove this folder or keep it as an archive once the owner has reviewed the plan. |

When you add research, put each item in this folder with a descriptive name and add a row above.
