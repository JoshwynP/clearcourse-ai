# Branch O2: Other §13 open questions that block milestone 1

Research and planning notes only. Not a decision. CONTRIBUTING.md is the source of truth; every
recommendation below is a **proposal for the owner**. Checked date for all web sources: 2026-10-11.

Covers: Q15, Q16, Q20, Q8, Q14, Q17, Q18, Q13, Q1, Q7, Q19, Q10, Q11, Q12, and a candidate Q2
milestone-1 feature set. Out of scope (other branches): Q3, Q4, Q5, Q6, Q9.

## Contents

1. Question(s) and what they block
2. Options considered
3. Evidence
4. Privacy implications
5. Recommendation (proposal)
6. Candidate milestone-1 feature set (Q2)
7. Dependencies and proposed new open questions
8. Verification log

<!-- sections appended below -->

## Layout note

There are many questions in this branch, so each one gets its own block below with the required
sub-headings: what it blocks, options, evidence, privacy implications, recommendation (proposal),
dependencies. A summary table, the Q2 candidate feature set, the consolidated list of proposed new
open questions and the verification log come at the end.

---

## Q15. Accessibility conformance target

### Question and what it blocks (§13 Q15)

- §13 Q15: "Accessibility conformance target (e.g. WCAG 2.2 AA)." Blocks §8.
- Accessibility is required `[src p.1, p.16]` (§8), and notifications must be "accessible" (§7.13).
  §15 item 5 says a change is done only when it meets §8, so **every UI story in milestone 1 is
  blocked** until a target exists to test against.
- **Blocks milestone 1: yes.** It is cheap to decide and expensive to retrofit.

### Options considered

| Option | What it means | Legal floor (Ontario)? | Cost to a solo builder | Notes |
|---|---|---|---|---|
| A. WCAG 2.0 AA (minus 1.2.4, 1.2.5) | The literal AODA/IASR web rule | Meets it | Lowest | Already 17+ years old; W3C encourages using the latest version |
| B. WCAG 2.1 AA | 2.0 + 17 SC (reflow, contrast of non-text, etc.) | Meets it (2.1 is a superset of 2.0) | Low | Still has 4.1.1 Parsing to report against |
| C. **WCAG 2.2 AA** | 2.1 + 6 new A/AA SC; 4.1.1 removed | Meets it (2.2 conforms to 2.1 and 2.0) | Low–medium; the new SC are mostly target size, focus not obscured, dragging alternatives, consistent help, redundant entry, accessible authentication | ISO/IEC 40500:2025 = WCAG 2.2 (Oct 2023) |
| D. 2.2 AA plus selected AAA (e.g. 2.4.13 Focus Appearance) | Stricter | Meets it | Medium | Nice for "credible" design (§8) but not needed as a target |

### Evidence (all checked 2026-10-11)

- Ontario: "As of January 1, 2021, the AODA requires you to make all public websites accessible if
  you are either a designated public sector organization, or a business or non-profit organization
  with 50 or more employees." Websites "must meet the WCAG 2.0 Level AA success criteria, except for
  1.2.4 (live captions) [and] 1.2.5 (pre-recorded audio descriptions)". Applies to sites and content
  published after January 1, 2012. The obligation sits with "the organization that controls the
  website". https://www.ontario.ca/page/how-make-websites-accessible
- Ontario: designated public sector organizations "are defined by Ontario Regulation 191/11";
  examples include "colleges and universities". Educational organizations must also provide
  materials in accessible formats.
  https://www.ontario.ca/page/accessibility-rules-public-sector-organizations
- O. Reg. 191/11 itself (e-Laws) did not render via WebFetch, so section 14 text and the current
  consolidation date are **Unverified** from the primary regulation; the two ontario.ca guidance
  pages above are the sources used. https://www.ontario.ca/laws/regulation/110191
- UW Policy 58 (Accessibility), section 7: the University "will meet Web Content Accessibility
  Guidelines (WCAG) 2.0 Level AA for all Public Websites"; Appendix A defines Public Websites to
  include "any newly developed website that is accessible to all University students". Established
  2017-12-21, revised 2020-02-28 (titles only).
  https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policies/policy-58-accessibility
- UW accessibility, accessible-content, AODA and digital-accessibility pages name no WCAG version
  beyond linking to WCAG 2.0.
  https://uwaterloo.ca/accessibility/ ,
  https://uwaterloo.ca/accessibility/guides-and-resources/accessible-content ,
  https://uwaterloo.ca/accessibility/guides-and-resources/aoda-legislation ,
  https://uwaterloo.ca/digital-accessibility/
  Whether UW IST has a separate procurement or vendor rule requiring a newer version is
  **Unverified** (not found on these pages).
- W3C: WCAG 2.2 "was published on 5 October 2023, and an update was published on 12 December 2024";
  "W3C encourages you to use the latest version of WCAG"; "content that conforms to WCAG 2.2 also
  conforms to WCAG 2.1 and WCAG 2.0"; "ISO/IEC 40500:2025 is exactly the same as the October 2023
  version of WCAG 2.2"; WCAG 3 is still a draft.
  https://www.w3.org/WAI/standards-guidelines/wcag/
- W3C TR: 2.2 is a W3C Recommendation, backwards compatible with 2.1; 4.1.1 Parsing is "Obsolete
  and removed"; new SC: 2.4.11 (AA), 2.4.12 (AAA), 2.4.13 (AAA), 2.5.7 (AA), 2.5.8 (AA), 3.2.6 (A),
  3.3.7 (A), 3.3.8 (AA), 3.3.9 (AAA). https://www.w3.org/TR/WCAG22/

### Privacy implications (§6)

- Mostly neutral. Two touch points: (1) 3.3.8 Accessible Authentication (Minimum) affects whatever
  sign-in is chosen in Q4: institutional SSO or a password manager-friendly stand-in passes; a
  CAPTCHA or puzzle on sign-in would need an alternative. (2) Accessibility tooling (e.g. session
  replay "accessibility overlays" or third-party widgets) must not be added, because they would ship
  page content plus user identity to a third party (§6.2 last bullet).
- Screen-reader announcements for anonymous posting must state the anonymity explanation (§8
  "explicit anonymity explanations") so non-visual users get the same promise.

### Recommendation (proposal for the owner)

Adopt **WCAG 2.2 Level AA** as the target for all milestone-1 UI, and state in the ADR that this
satisfies the legal floor of WCAG 2.0 AA in Ontario's rules and UW Policy 58. Because Policy 58
names 2.0 AA, keep testing 4.1.1-style markup validity too (cheap with automated linting), so a UW
review against 2.0/2.1 would also pass. Verification approach to propose: automated axe-core checks
in the test suite (§9) plus a manual keyboard/screen-reader checklist per page; automated tools
alone do not prove conformance. (The axe-core tool choice is a suggestion; its current version and
licence are **Unverified** here and belong to the stack branch.)

### Dependencies

- Q4 (sign-in method) interacts with SC 3.3.8.
- Proposed new open question **NQ-15a**: does UW (IST or the Accessibility office) require a newer
  WCAG version, a VPAT/ACR, or an accessibility review for software used by students, beyond Policy
  58's WCAG 2.0 AA? Needed before any UW pilot, not before a public prototype.

---

## Q16. Default aggregation threshold N (level counts and survey reveal)

### Question and what it blocks (§13 Q16)

- §13 Q16: "Default aggregation threshold (minimum N) for level counts and survey reveal." Blocks
  §7.12 and §7.16.
- §7.16: "Number of students in each private level, **shown only when aggregation thresholds are
  met**". §7.12: "A configurable minimum-response threshold applies before written responses are
  revealed in small classes"; "The instructor sees only aggregate counts and anonymous text".
- **Blocks milestone 1: only if** analytics (§7.16) or the exit survey (§7.12) are in milestone 1.
  The board, cards and private counters can ship without it. But the *rule shape* (not the number)
  affects the data model, so it should be settled before participation code is written.

### The differencing problem (why a single N is not enough)

The instructor legitimately sees two things about the same set of students:

1. An aggregate: how many students are at each level (§7.16).
2. A named list: student name, verified level, date shared, for students who chose to share
   (§7.10).

They also know the roster (§5: instructors manage their courses). Subtracting (2) from (1) gives
the level distribution of the **students who did not share**. Worked example (illustrative only):

| Level | Aggregate shown | Named shares | Residual (non-sharers) |
|---|---|---|---|
| Sustained Contributor | 12 | 12 | 0 |
| Contributor | 20 | 19 | **1** |
| No Record | 8 | 8 | 0 |

If exactly one student on the roster did not share, the instructor now knows that student's level.
That defeats "Students alone decide whether to share their level" (§10) and §7.10. The same happens
with many non-sharers if they all sit in one level (homogeneity). Rounding does not fully fix this
because the roster total is known. The aggregate can also be captured before sharing opens (a
screenshot) and subtracted later, so suppression has to consider *every* time the aggregate was
visible, not just the final view.

The US Department of Education's PTAC FAQ describes this failure mode: "simple suppression of small
subgroups may not be sufficient ... since the suppressed numbers can often be easily calculated by
subtracting the reported subgroups' totals from the all-student totals", and notes that
complementary suppression may be needed. It also says teachers are "presumed to have inside
knowledge", which matches an instructor who knows the roster.

Survey-specific linkage risks (§7.12): the survey is presented **before** sharing. If survey
responses carry or display a timestamp or arrival order, and the share record carries a "date
shared", a student who completes the survey and then shares in the same sitting could be linked to
their written answers. A live response counter has the same problem (the count ticks up right after
a known student finishes). Writing style in free text is a residual risk that no threshold removes;
it belongs in the threat model (§6.2, Q8).

### Options considered

| Option | Applies to | How it works | Strengths | Weaknesses |
|---|---|---|---|---|
| A. Fixed minimum cell size N per displayed cell | Level counts | Hide any level count < N; also hide a second cell (complementary suppression) so the hidden one can't be recovered from the roster total | Standard practice; simple to explain | Ignores the shared-list differencing on its own; zero cells are also disclosive (0 at No Record tells you everyone participated) |
| B. Minimum class or response size before anything is shown | Both | Show nothing if enrolment (or survey responses) < N | Very simple; matches the UW SCP precedent for very small classes | Coarse; still vulnerable to differencing in larger classes |
| C. **Residual check against shares** | Level counts | Before showing level counts, require at least N non-sharers and a residual distribution that is not single-valued; otherwise suppress | Directly addresses the attack in this product | The system must compute residuals (it can, server-side); the rule needs careful wording and tests |
| D. Release timing: show once, only after the sharing window closes | Both | No live level counts; one frozen release per course after sharing becomes final (§7.10) and the survey closes | Removes screenshot/time-series differencing and live survey-counter linkage | Instructors lose in-term level counts (other §7.16 aggregates, which are not per-student, can stay live) |
| E. Banding / rounding | Level counts | Report ranges ("10–19") or percentages rounded to bands | Keeps some in-term signal | Partly reversible with known totals (PTAC: "if any unblurred ... totals are published ... it may be possible to calculate the values of sensitive cells") |
| F. Perturbation / differential-privacy noise | Level counts | Add calibrated noise | Strong formal guarantee | PTAC: "often considered inappropriate for public reporting ... reduces the transparency and credibility"; hard to explain; at odds with §8 "credible" and a solo build |

Survey reveal options (§7.12 says the threshold is configurable; these concern the default and the
guard rails around it):

| Option | Description |
|---|---|
| S1. Reveal written responses when response count ≥ N | Literal reading of §7.12 |
| S2. S1 + reveal only after the survey window closes, as one batch, in random order, with no timestamps | Removes timing linkage to "date shared" |
| S3. S2 + an institution-level floor (admin sets a minimum; instructors can raise it but not lower it) | Prevents an instructor configuring N=1. **Not in the spec**; listed as a new open question |

### Evidence (all checked 2026-10-11)

- Treasury Board of Canada Secretariat, Privacy Implementation Notice 2020-03 (effective
  2020-10-06): "there is no minimum cell size that is appropriate for all data releases"; "A minimum
  cell size of 10 is often cited as a best practice for public data releases of data that is less
  sensitive"; "a minimum cell size of 20 is cited for more sensitive data"; "the minimum cell size
  should never be less than three"; totals "may need to be rounded, so that it is not possible to
  recover suppressed cells"; recommends case-by-case risk assessment.
  https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information-privacy-notices/2020-03-protecting-privacy-releasing-information-about-small-number-individuals.html
- Ontario IPC, *De-identification Guidelines for Structured Data* (June 2016): calls the "cell size
  of five" rule a "general loosely defined technique" and recommends a risk-based approach. Its
  threshold table maps low / medium / high invasion of privacy to re-identification risk thresholds
  0.1 / 0.075 / 0.05, with "cell size equivalent" 10 / 15 / 20 "for illustrative purposes only". It
  also warns about attribute disclosure for groups.
  https://www.ipc.on.ca/sites/default/files/legacy/2016/08/Deidentification-Guidelines-for-Structured-Data.pdf
  (The landing page https://www.ipc.on.ca/en/resources-and-decisions/de-identification-guidelines-structured-data
  returned HTTP 403 to WebFetch; the PDF text was extracted locally with pdftotext.)
- US Dept of Education PTAC, *FAQs: Disclosure Avoidance* (Oct 2012): "Many statisticians consider
  a cell size of 3 to be the absolute minimum needed to prevent disclosure, though larger minimums
  (e.g., 5 or 10) may be used"; state minimums "range from 5 to 30 students, with a majority of
  States using 10"; the subtraction warning quoted above; teachers presumed to have inside
  knowledge. This is US/FERPA context, used here only as evidence of practice.
  https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf
- UW Teaching Assessment Processes (local precedent for course surveys): since Winter 2024 SCP
  surveys run in "very small ones (5 or fewer students)" but "To maintain student anonymity in very
  small classes, these survey results will not be released to instructors"; "Plans are underway to
  identify a threshold, such as minimum number of responses received".
  https://uwaterloo.ca/teaching-assessment-processes/resources-instructors

### Privacy implications (§6)

- This is a §6 issue, not a UI detail. §6.2 forbids giving instructors a usable mapping, and
  differencing turns two individually harmless views into a mapping from a named non-sharer to a
  level. It must be in the threat model (Q8) and covered by §9 negative tests (e.g. "with one
  non-sharer, no instructor-visible endpoint returns level counts that differ from the shared
  list").
- Survey records should not store submission time or order beyond what is needed to enforce one
  response per student. That enforcement itself touches Q9 (knowing a student already answered
  without linking them to the text). Flag to the Q9 branch.
- Suppression must run server-side. Sending raw counts to the browser and hiding them in the UI
  would violate §6 ("not merely a hidden name in the interface", `[src p.3]`).

### Recommendation (proposal for the owner)

1. **Rule shape (proposal):** release level counts to instructors only **once, after the sharing
   window has closed and shares are final** (Option D), and only if the residual check passes
   (Option C: at least N non-sharers, not all in one level), with complementary suppression of
   cells below N (Option A). Other §7.16 aggregates (totals, unanswered count, % resolved) are not
   per-student levels and could stay live.
2. **Survey (proposal):** Option S2. Reveal written responses in one batch after the survey window
   closes, in random order, with no timestamps, and only when responses ≥ N. Show aggregate counts
   (§7.12) on the same timing.
3. **Placeholder default N = 10** for both, **labelled as a placeholder for owner approval**. It is
   the figure TBS calls "often cited" for less sensitive data and the majority US-state minimum, and
   the IPC illustrative equivalent for a low invasion of privacy. Refuse any value below 3 (TBS,
   PTAC). UW's SCP practice (no release for classes of 5 or fewer) is a lower local precedent the
   owner may prefer. **The number is not decided here.**
4. If analytics and the survey are deferred past milestone 1 (see Q2 below), record only the rule
   shape in the ADR, so the data model keeps share records and survey records free of fields the
   rule would later need to hide.

### Dependencies

- Q18 (sharing-window timing) defines when "after the window closes" is.
- Q9 (privacy mechanism) for one response per student on the survey without linkage.
- Q8 (threat model) must record the differencing analysis and the writing-style limitation.
- Proposed new open questions: **NQ-16a** may instructors lower the survey threshold, or is there an
  institution-level floor? **NQ-16b** is N the same for level counts and survey reveal?
  **NQ-16c** are in-term level counts wanted at all, given the differencing risk?

---

## Q20. Rate-limit values and moderation-queue workflow

### Question and what it blocks (§13 Q20)

- §13 Q20: "Exact rate-limit values and moderation-queue workflow." Blocks §7.7.
- §7.7 requires "rate limiting · duplicate warnings · safe content reporting · a moderation queue";
  students can "report spam or inappropriate content"; instructors and authorized TAs can "hide or
  delete content" and "resolve or reopen". §6.4: "Prefer content moderation and rate controls that
  **do not reveal identity**." §7.9: reports do not count toward participation. §7.8 and §7.14:
  reports, hidden comments and moderator-only notes never appear in presentation mode or search.
- **Blocks milestone 1: yes, if the board is in milestone 1** (a public, sign-in-able board without
  rate limits or a way to remove abuse is not safe to open). The *values* can be placeholders the
  owner approves; the *workflow* must exist.

### Options considered: rate limiting

| Option | Key used | Strengths | Weaknesses / privacy notes |
|---|---|---|---|
| R1. Per-user, per-course, per-action fixed window | (user, course, action) | Simple; fair; matches OWASP "limit ... how often a single API client/user can execute a single operation" | The limiter store is identity-bearing. It must hold no content id or text, and expire quickly |
| R2. Per-IP only | IP address | No user state | Campus NAT/eduroam would make many students share one IP (**Unverified** for UW; plausible), so it punishes groups; IPs are identity-bearing too |
| R3. **R1 for authenticated writes + R2 for unauthenticated endpoints (sign-in, etc.)** | Both | Covers abuse before and after sign-in | Two mechanisms to test |
| R4. Platform/WAF rate limiting from the host | Host-defined | Nothing to operate | Vendor-specific (belongs to Q3 branch); host request logs pair IP/user with path and time, which is a §6.2 log concern (see privacy notes) |

Placeholder values (**all numbers are placeholders for owner approval, not requirements**; OWASP
gives no numbers and says limits "should be fine tuned based on the business needs"):

| Action | Placeholder limit | Rationale for the placeholder |
|---|---|---|
| Ask a question | 5 per student per course per hour | Generous for honest use, stops floods |
| Post a comment | 20 per student per course per hour | Discussion bursts are normal |
| Upvote | No rate limit needed beyond one vote per student per question (already required: "without double-counting a student", §7.7) | Idempotent by design |
| Report content | 10 per student per course per hour | Stops report-bombing |
| Sign-in attempts (if a non-SSO stand-in is chosen in Q4) | Per Q4 branch | Out of scope here |

### Options considered: moderation workflow

Proposed states (a sketch for discussion; the spec names the actions, not the states):

```
Content visibility (question or comment)
  visible --hide--> hidden --unhide?--> visible        ("unhide" is NOT in the spec: NQ-20a)
  visible|hidden --delete--> deleted (tombstone)      ("restore" is NOT in the spec: NQ-20a)

Report (one queue item per piece of content, many reports roll up into it)
  open --moderator acts--> actioned (content hidden or deleted)
  open --moderator dismisses--> dismissed
  dismissed|actioned --new report after a content edit?--> open   (NQ-20b)

Question status (separate axis, from §7.7 "resolve or reopen")
  unresolved <--> resolved
```

| Option | Description | Notes |
|---|---|---|
| M1. **Manual queue only** | Reports go to a per-course queue for instructors and TAs with moderation permission; nothing changes until a human acts | Closest to the spec; no automated judgment |
| M2. Manual queue + auto-hide after K reports | Content is hidden pending review once K distinct students report it | Faster against spam, but it is an invented rule, open to brigading, and K reports need distinct-reporter counting (a Q9 problem) |
| M3. Manual queue + pre-moderation of first posts | New content waits for approval | Slows the board; not in the spec |
| Delete semantics D1: soft delete (tombstone, text purged after a period) | Supports "redirect old links" (§7.7, for merges) and audit | Retention ties to Q17 |
| Delete semantics D2: hard delete | Simple | Breaks links; the audit record still needs to say something happened |

### Evidence (checked 2026-10-11)

- OWASP API Security Top 10 2023, API4 Unrestricted Resource Consumption: "Implement a limit on how
  often a client can interact with the API within a defined timeframe (rate limiting)"; "Rate
  limiting should be fine tuned based on the business needs"; "Limit/throttle how many times or how
  often a single API client/user can execute a single operation"; enforce maximum payload sizes;
  "Configure spending limits for all service providers/API integrations". No numeric limits given.
  https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption
  (owasp.org/API-Security/... redirects there.)
- The spec itself (§7.7, §6.4) is the only source for the moderation actions. No external source was
  used for the state machine; it is a design sketch.

### Privacy implications (§6)

- **Reporter identity.** A report is an action by a student about anonymous content. Storing
  `reporter_user_id` next to `content_id` creates an identity-to-content link (who objected to
  what). Proposal: store reports in the content domain with no reporter identity; enforce "one report
  per student per item" with the same mechanism Q9 picks for upvotes. The queue shows count and
  reason category only.
- **Author identity.** The queue, the moderation log and moderator notes must never show the author
  (§6.2, §7.7 "log the moderation action without exposing identities").
- **Rate-limit store.** It is keyed by identity, so it must not store content ids, content text or
  timestamps of individual posts beyond the window, and its errors must not log the request body.
  (§6.2: identity and content text never in the same log.)
- **Timing correlation.** Host request logs (IP, session, path, time) plus a precise `created_at`
  on a question could link a post to a person. Proposal for the Q9/Q3 branches: show coarse times
  to instructors, and keep request logs short-lived with no request bodies.
- **Deletion and credit.** If deleting a post should reduce the author's counter, the system needs
  a path from content back to the counter. That is a Q9 design input, and the spec only says credit
  is preserved on **merge** (§7.7). See NQ-20c.
- Automated duplicate *suggestions* are search help only and must never deny credit (§3, §7.7).

### Recommendation (proposal for the owner)

- Rate limiting: **R3** (per-user/per-course/per-action for writes, plus per-IP on unauthenticated
  endpoints), with the placeholder values above shown in an admin-visible config so they can be
  changed without code (§4 spirit of configurability; not itself a spec requirement). Keep payload
  size limits on question and comment text (OWASP); the length is also a placeholder.
- Moderation: **M1 manual queue** with the state sketch above, **soft delete (D1)**, and reports
  stored without reporter identity. Do not build auto-hide (M2) or unhide/restore until the owner
  says so (NQ-20a).

### Dependencies

- Q9 for distinct-reporter counting and for whether deletion touches counters.
- Q14 for which moderation events are audited; Q17 for how long tombstones and reports are kept.
- Proposed new open questions: **NQ-20a** can hidden content be un-hidden, and can deleted content
  be restored (and by whom)? **NQ-20b** what happens to open reports when content is merged (§7.7)
  or edited? **NQ-20c** does hiding or deleting a post remove the author's participation credit
  for it? (Only merges are covered by the spec.) **NQ-20d** can an author edit or delete their own
  anonymous post? (Not in the student list in §7.7.) **NQ-20e** does "without exposing identities"
  in §7.7 cover the *moderator's* identity in the log as well as the author's?

---

## Q8. Threat-model document: format and location

### Question and what it blocks (§13 Q8)

- §13 Q8: "Format and location of the threat-model document." Blocks §6.
- §6.2: "The threat model and the limitations of anonymity must be documented. This is a
  deliverable." §11 lists it as a deliverable. §6.3: the Q9 mechanism "must be written up in an ADR
  and in the threat model **before any content or participation code is written**."
- **Blocks milestone 1: yes.** If the board or counters are in milestone 1, a first version of the
  threat model has to exist first. Choosing the format is a five-minute decision.

### Options considered

| Option | Format | Location | Strengths | Weaknesses |
|---|---|---|---|---|
| T1. **Markdown in the repo** | Markdown, text or Mermaid data-flow diagram, threat tables | `docs/threat-model/` (new folder; proposal) | Versioned with the code; Claude can read and update it in the same PR; matches §14 docs-in-repo conventions | Diagrams are less rich than a GUI tool |
| T2. Tool file in the repo | OWASP Threat Dragon JSON or similar | Same | Diagram editor | Another tool to learn; harder to diff; tool status **Unverified** here |
| T3. Document outside the repo (wiki, Google Doc) | Any | External | Easy to share | Drifts from code; not reviewed in PRs; conflicts with "docs in repo" convention (§14) |
| T4. T1 plus a short public "limitations of anonymity" page in the app | Markdown source + rendered page | Repo + app | Supports §8 "explicit anonymity explanations"; needed anyway if deanonymization is ever enabled (§6.4, §11) | Public wording is copy text, which the owner must approve (no invented copy) |

Method options inside the document: **STRIDE** for security (OWASP calls it "mature and popular")
and **LINDDUN** for privacy (Linking, Identifying, Non-repudiation, Detecting, Data Disclosure,
Unawareness, Non-compliance; free; KU Leuven DistriNet). LINDDUN's "Linking" and "Identifying"
categories map directly onto §6.2's join and differencing concerns.

### Evidence (checked 2026-10-11)

- OWASP Threat Modeling Cheat Sheet: four questions ("What are we working on?", "What can go
  wrong?", "What are we going to do about it?", "Did we do a good enough job?"); DFDs are "arguably
  the most common approach"; show "trust boundaries, data flows, data stores, processes, and the
  external entities"; a threat model "should be maintained, updated and refined alongside the
  system"; save diagrams "in a form the team can update". It does not explicitly say "store in the
  repository". https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
- LINDDUN: "a recognized privacy threat modeling framework, developed by privacy experts at KU
  Leuven"; variants GO (lightweight cards), PRO (systematic, DFD-based), MAESTRO ("coming soon");
  "Free privacy threat modeling approach". https://linddun.org/

### Privacy implications (§6)

- The threat model is where the residual risks this branch found must be written down honestly:
  differencing between level counts and shares (Q16), survey timing and writing style (Q16),
  timing correlation between request logs and post times (Q20), reporter identity (Q20), and what an
  operator with database-owner rights can still do (see Q14 evidence on PostgreSQL owners).
- It must not itself contain real identities or content samples.

### Recommendation (proposal for the owner)

**T1 + T4**: a Markdown threat model at `docs/threat-model/README.md` (path is a proposal), using
the OWASP four questions as headings, a data-flow diagram of the five §6.1 domains with trust
boundaries, STRIDE tables per component and LINDDUN (GO-style) for privacy. Each Q9 ADR links to
it. A separate plain-language "limitations of anonymity" page, drafted for the owner to approve
word for word, becomes the in-app explanation. Update it in the same PR as any change touching §6.

### Dependencies

- Q9 (mechanism), Q3 (hosting, which sets trust boundaries and who can read logs).
- Proposed new open question **NQ-8a**: must the "limitations of anonymity" be visible to users in
  the app, or is the repo document enough? (§6.2 says "documented"; §8 asks for "explicit anonymity
  explanations"; the spec does not say they are the same document.)

---

## Q14. Audited events and audit-log retention

### Question and what it blocks (§13 Q14)

- §13 Q14: "Full list of audited events, and audit-log retention." Blocks §7.17.
- §7.17: audit logging is a required system `[src p.1]`; known audited events are moderation
  actions "logged without identities" `[src p.11]` and deanonymization events, which use
  "immutable" logs `[src p.4]`. §11 lists audit logging as a deliverable.
- **Blocks milestone 1: partly.** Whatever features ship need their events defined. Retention can be
  deferred with a placeholder if no real student data is collected (see Q17).

### Candidate event list (drawn only from the spec; the owner decides which are audited)

| # | Candidate event | Spec basis | In the spec as "audited"? |
|---|---|---|---|
| E1 | Moderation actions: hide, delete, merge, recategorize, pin, resolve/reopen, select for presentation, answer | §7.7 ("log the moderation action without exposing identities"), §7.17 | **Yes** (merge explicitly; "moderation actions" generally) |
| E2 | Deanonymization request, approvals, execution | §6.4 ("immutable audit logging") | **Yes**, only if the capability exists (default: it does not) |
| E3 | Card publish, supersede, archive, and published-rule changes (what, why, effective date, applies to work underway) | §7.6 | No; the spec requires version history, which may be enough |
| E4 | Participation-threshold publication and any later change | §7.9 (changes that disadvantage students are blocked; original version preserved) | No |
| E5 | Grading-scheme publication | §7.11 ("published before students participate") | No |
| E6 | TA permission grant or revoke | §5 | No |
| E7 | Institutional configuration changes (names, links, policy language, branding, LMS) | §4, §7.15 | No |
| E8 | Share, revoke, and instructor export/apply of shared results | §7.10 (revocation allowed "until the instructor exports or applies"; app must explain "when sharing becomes final") | No, but the system must record export/apply to enforce finality |
| E9 | Impersonation/support sessions | §5, `[src p.2]` ("tightly controlled, audited support procedure") | **Yes**, if Q7 allows impersonation at all |
| E10 | Sign-in success/failure, authorization failures | Not in the spec; OWASP Logging Cheat Sheet recommends them | No: proposal only, owner decides |

### Options considered: append-only storage

| Option | How | Strength of "immutable" | Cost/ops for a solo builder |
|---|---|---|---|
| L1. Postgres audit table, app role has INSERT + SELECT only; a trigger rejects UPDATE/DELETE | DB privileges | Good against the app and instructors; **not** against the table owner or a superuser (PostgreSQL: the owner's right to modify "cannot be granted or revoked") | Free; same DB |
| L2. L1 + hash chain (each row stores a hash of the previous row) | App code | Tamper-*evident*: edits are detectable, not prevented | Small code; needs a verify job and test |
| L3. L2 + periodic export of the chain head (or the rows) to locked object storage | Cloudflare R2 bucket locks or S3 Object Lock | R2 locks can be removed by the account holder; S3 compliance mode cannot be removed even by root | R2 cost **Unverified** here (stack branch); S3 adds an AWS account to operate |
| L4. Separate managed logging service | Vendor | Varies | Vendor and cost **Unverified**; another place identity could leak |

### Evidence (checked 2026-10-11)

- PostgreSQL 18 docs (current; "PostgreSQL 18.6 Documentation"): "The right to modify or destroy an
  object is inherent in being the object's owner, and cannot be granted or revoked in itself";
  privileges INSERT, UPDATE, DELETE, TRUNCATE are granted separately.
  https://www.postgresql.org/docs/current/ddl-priv.html
- Cloudflare R2 bucket locks "prevent the deletion and overwriting of objects in an R2 bucket for a
  specified period — or indefinitely"; rules apply by prefix; rules can be deleted from the
  dashboard, Wrangler or API. No pricing on the page. https://developers.cloudflare.com/r2/buckets/bucket-locks/
- AWS S3 Object Lock: WORM; "In compliance mode, a protected object version can't be overwritten or
  deleted by any user, including the root user"; governance mode can be bypassed with
  `s3:BypassGovernanceRetention`. https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- OWASP Logging Cheat Sheet: log "Authentication successes and failures", "Authorization (access
  control) failures", administrative actions and "Data import and export"; session ids, tokens and
  "Sensitive personal data" should be removed, masked or pseudonymized; "Build in tamper detection";
  logs "must not be destroyed before the duration of the required data retention period, and must
  not be kept beyond this time". https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

### Privacy implications (§6)

- The audit log is itself a §6.2 surface: no entry may hold identity and anonymous-content text
  together. Proposal: audit entries reference content by opaque id and action only, never text, and
  never the author.
- E8 (shares) is identity-bearing by design (domain 4). Keep it in a separate audit stream from E1
  (content moderation) so no single log pairs a named student with content ids.
- E10 sign-in events pair identity with time; combined with content timestamps they are a timing
  side channel (see Q20). Keep them short-lived and coarse if adopted.

### Recommendation (proposal for the owner)

- Events: audit **E1 and E2** (spec-required), plus **E3–E8** as proposals the owner approves or
  rejects; E9 only if Q7 says yes; E10 only with a short retention.
- Storage: **L1 + L2** for milestone 1 (free, no extra service), with L3 as the upgrade path before
  any deanonymization capability is ever enabled, because §6.4 says "immutable".
- Retention: **placeholder only**; ties to Q17. Do not pick a number here.

### Dependencies

- Q7 (E9), Q17 (retention), Q9 (how moderation of merged content credits counters without
  identities), NQ-20e (moderator identity in the log).
- Proposed new open question **NQ-14a**: does UW have a records-retention schedule that applies to
  audit logs of a teaching tool? (Not researched in this branch; **Unverified**.)

---

## Q17. Data retention and deletion (end of term, account removal)

### Question and what it blocks (§13 Q17)

- §13 Q17: "Data retention and deletion policy (end of term, account removal)." Blocks the data
  model.
- Related spec text: §7.5 "ClearCourse AI stores only the requirements and links" (no student
  files); §7.12 "No unnecessary metadata is collected"; §7.6 card versions visible to students "at
  each point in time are preserved"; §7.9 "The originally published threshold version is
  preserved"; §7.10 revocation until export/apply.
- **Blocks milestone 1: partly.** A public prototype collects real sign-in data from real people, so
  it needs *some* stated retention, even a short placeholder. The full UW policy can wait for a UW
  pilot.

### Options considered

| Option | Description | Strengths | Weaknesses |
|---|---|---|---|
| D1. Keep everything indefinitely | No deletion jobs | Simplest | Conflicts with data-minimisation guidance (OWASP: logs "must not be kept beyond" the retention period; UW: "Collect/record only information you need"); grows the breach impact |
| D2. **Per-domain schedule tied to course lifecycle** | Each §6.1 domain gets its own trigger and period (sketch below) | Matches the domain separation; easy to test | Needs the owner to approve every period |
| D3. Institution-configurable schedule | D2 with periods set by the institutional admin | Fits §4's "institution-specific ... administrator-configurable" spirit; lets UW plug in its own schedules (WatClass) | More UI; retention is not listed in §4, so this is a proposal |
| D4. Prototype-only wipe | All prototype data deleted on a published date or when the prototype ends | Honest and simple for milestone 1 | Notice wording is copy text the owner must approve |

Illustrative per-domain sketch for D2/D3 (**every trigger and period is a placeholder for owner
approval**):

| §6.1 domain | Trigger | Placeholder action |
|---|---|---|
| 1 Anonymous content | Course archived + P1 | Purge text; keep aggregate counts only |
| 2 Private counters | Sharing final + P2 | Delete |
| 3 Identity and enrolment | Account removal, or no active course for P3 | Delete or deactivate |
| 4 Shared results | Instructor export/apply + P4 (grade-appeal period?) | Delete |
| 5 Survey responses | Results released + P5 | Delete text; keep aggregate counts |
| Audit (Q14) | Per Q14 | Per Q14 |
| Backups (host-managed) | Host's backup retention | Deleted data persists in backups until they expire; vendor period **Unverified** (stack branch) |

### Evidence (checked 2026-10-11)

- UW Privacy: UW handles information "in compliance with the Freedom of Information and Protection
  of Privacy Act (FIPPA)"; records management "is governed by Policy 46 - Information Management".
  https://uwaterloo.ca/privacy/
- UW Privacy, Online Educational Technologies guideline: "Determine whether an Information Risk
  Assessment is required. Complete this step before proceeding any further!"; "It is best to choose
  a tool that does not require students to identify themselves"; "Notify students about the online
  educational technology"; "Allow students to opt out; offer other ways to participate"; follow
  "WatClass, the University Records Classification and Retention Schedules".
  https://uwaterloo.ca/privacy/guidelines/online-educational-technologies
- UW Privacy, record keeping: "Regularly dispose of records that have only short-term, immediate or
  no value", except records tied to "a FIPPA access request or an ongoing legal action"; "Collect/
  record only information you need". No retention periods given.
  https://uwaterloo.ca/privacy/policies-guidelines/record-keeping
- FIPPA Regulation 460 (retention of personal information after use): the e-Laws page did not render
  via WebFetch. Any "minimum retention after use" rule is therefore **Unverified** here.
  https://www.ontario.ca/laws/regulation/900460
- OWASP Logging Cheat Sheet on retention (quoted under Q14).

### Privacy implications (§6)

- **Deletion versus unlinkability.** "Delete my posts when I remove my account" needs a path from a
  person to their anonymous content, which is exactly what §6.2 forbids ordinary queries to have.
  Options for the Q9 branch: (a) anonymous content stays after account removal (it is not linked
  to them); (b) a student can delete a post only while signed in, through the same narrowly scoped
  mechanism that credits counters; (c) per-student content keys destroyed on removal (crypto-
  shredding, as explored in the privacy-C branch). This choice must be made with Q9.
- Purging content text at end of course shrinks what a later breach or a later deanonymization
  process could reveal.
- Backups and host logs must be listed in the threat model as places where deleted data lingers.

### Recommendation (proposal for the owner)

- Milestone 1 (public prototype): **D4**, plus the D2 data-model hooks (lifecycle timestamps per
  domain, deletion jobs tested). The prototype notice wording is for the owner to write or approve.
- Before any UW pilot: **D3**, with UW's Privacy office supplying periods (WatClass, Information
  Risk Assessment). Ask UW (fippa@uwaterloo.ca is the contact the guideline gives) rather than
  guess.

### Dependencies

- Q9 (deletion versus unlinkability), Q14 (audit retention), Q18 (when "sharing final" happens), Q3
  (backup retention of the chosen host).
- Proposed new open questions: **NQ-17a** on account removal, does a student's anonymous content
  stay, get deleted, or does the student choose? **NQ-17b** does ClearCourse need a UW Information
  Risk Assessment before a UW pilot, and who requests it?

---

## Q18. Sharing-window timing and who triggers "end of course"

### Question and what it blocks (§13 Q18)

- §13 Q18: "When does the sharing window open and close, and who triggers 'end of course'?" Blocks
  §7.10 and §7.12.
- §7.10: "At the end of the course a student may share only their verified level"; revocation is
  allowed "until the instructor exports or applies the result"; the app "must clearly explain when
  sharing becomes final". §7.12: the survey is presented **before** sharing. §7.13 notifications
  "End-of-course survey available" and "Sharing window open". §7.11: the grading scheme is
  published before students participate.
- **Blocks milestone 1: only if sharing or the survey is in milestone 1.**

### Options considered

| Option | Who opens/closes | Strengths | Weaknesses |
|---|---|---|---|
| W1. Instructor opens and closes manually | Instructor | Flexible; no integration needed | Easy to forget; opening early could pressure students; students can't plan |
| W2. **Dates fixed when the participation policy is published** | Instructor sets them up front, alongside thresholds and grading scheme (§7.9, §7.11) | Students see the dates from day one (fits §7.10 "clearly explain"); predictable for Q16 batch release | Dates may need to move; a change rule is needed (cf. §7.9 "changes that would disadvantage them are blocked") |
| W3. Derived from course end date supplied by provisioning | System, from LMS/LTI data | No manual work | Depends on Q5; course end-date availability from LEARN is **Unverified** |
| W4. Institution-wide term windows | Institutional admin | Consistent across courses | Ignores non-standard courses |

Finality sub-options (all consistent with §7.10's "until the instructor exports or applies"):

| Sub-option | Rule |
|---|---|
| F1. Per-share finality | Each share becomes final when the instructor next exports/applies; later shares stay revocable until the next export |
| F2. Export/apply allowed only after the window closes | All shares become final together; supports Q16 one-time release |

### Evidence

- Spec only (§7.10, §7.11, §7.12, §7.13). No external source needed; whether LEARN/LTI exposes
  course end dates is for the Q5 branch (**Unverified** here).

### Privacy implications (§6)

- A single, known close time lets Q16's residual check and batch survey release run once, which
  removes the time-series differencing risk. F1 (rolling finality) produces several exports over
  time, each a new snapshot to subtract from.
- The order "survey then share" (§7.12) plus a share timestamp is a linkage risk (Q16). The share
  record should hold the **date** only (§7.10 says "date shared"), not a time.

### Recommendation (proposal for the owner)

**W2 with F2**: the instructor sets survey-open, sharing-open and sharing-close dates when
publishing the participation policy, defaulting from the course end date if provisioning supplies
one (W3), and shown to students from the start. Export/apply is available after close, at which
point shares become final. Changes to the dates follow a rule the owner approves (NQ-18a).

### Dependencies

- Q5 (course dates from provisioning), Q16 (release timing), Q13 (notifications for window open).
- Proposed new open questions: **NQ-18a** may the instructor move the sharing dates after
  publication, and in which direction? **NQ-18b** is the survey a required step before sharing, or
  only shown first and skippable? (§7.12 says "presented before"; it is also "available even if the
  student does not share".) **NQ-18c** can a student share before the end of the course?
