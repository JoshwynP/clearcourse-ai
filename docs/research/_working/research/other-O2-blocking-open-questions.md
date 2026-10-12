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

---

## Q13. Which notifications are "essential" (brief)

### Question and what it blocks (§13 Q13)

- §13 Q13: "Which notifications are 'essential' (cannot be disabled)?" Blocks §7.13.
- §7.13 lists eight notification types, "accessible in-app and email", and says "Users can manage
  nonessential notifications". §7.6: "Affected students are notified" when a published rule changes.
  §6.4 lists "notification rules" as part of any deanonymization process.
- Email delivery itself is Q6 (other branch).
- **Blocks milestone 1: only if notifications are in milestone 1.** In-app notifications could ship
  first; email depends on Q6.

### Options considered

| Option | Essential (cannot be disabled) | Everything else | Notes |
|---|---|---|---|
| N1. Nothing essential | None | All user-managed | Contradicts the spec's wording, which implies some notifications are essential; and §7.6 "Affected students are notified" would be defeated if a student turned card-change notices off |
| N2. **Rule- and rights-affecting only** | Assignment card changed, Course card changed (§7.6 rule changes); Sharing window open (§7.10 finality); any deanonymization notice (§6.4) if that capability ever exists | Answer posted, Followed question updated, Question merged, Participation level reached, End-of-course survey available | Essential = information a student needs to know their obligations or rights |
| N3. N2 but "essential" applies to the **in-app** channel only; email for every type stays user-manageable | Same set, in-app | All email | Reduces inbox pressure; fits §8 "avoid attention-maximizing patterns" |
| N4. Instructor chooses per course | Configurable | Configurable | More UI; not in the spec |

### Evidence (checked 2026-10-11)

- Canada's Anti-Spam Legislation (S.C. 2010, c. 23), "current to 2026-09-21": a message is a
  commercial electronic message if "it is reasonable to conclude that it has as its purpose, or one
  of its purposes, to encourage participation in a commercial activity" (s. 1(2)); s. 6(6) removes
  the consent requirement (but not the s. 6(2) form requirements) for a message that "solely"
  "provides notification of factual information about" an "ongoing subscription, membership,
  account ... or similar relationship" (s. 6(6)(d)).
  https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html
  Reading: ClearCourse's notifications are factual course/account messages with no commercial
  purpose, so CASL is probably not the constraint; this is **an interpretation, not legal advice**,
  and should be confirmed if the product is ever offered commercially to other institutions (§4).
  (The CRTC CASL FAQ page returned HTTP 403 to WebFetch.)

### Privacy implications (§6)

- Notification payloads are a §6.2 surface. An email that says "Your question 'How do I cite
  ChatGPT in A2?' was answered" places identity (the recipient's address) next to anonymous content
  text and the fact of authorship, in a third-party mail system (Q6 provider) and in the recipient's
  inbox. **Proposal:** emails about a student's own or followed questions carry no content text and
  no question title, only a link ("A question you follow has an update").
- "Answer posted" to the asker, and "Followed question updated", require the system to know which
  student asked or follows which question, i.e. an identity-to-content link. This is a Q9 design
  input (follow lists are identity-bearing; they belong to neither domain 1 nor domain 3 cleanly).
  Follows are not counted toward participation (§7.9), but they are still a mapping instructors must
  not see (§6.2).
- "Participation level reached" must not be sent at a moment or in a form an instructor could
  observe (e.g. no instructor-visible delivery log).
- Email provider logs pair address with subject line: keep subject lines generic.

### Recommendation (proposal for the owner)

**N3**: treat course-card and assignment-card change notices, "Sharing window open" and (if it ever
exists) any deanonymization notice as essential **in-app**; let users manage every email type. All
email bodies and subjects carry no anonymous content text. Defer email entirely if Q6 is not decided
for milestone 1. The exact wording of every notification is copy text for the owner to approve.

### Dependencies

- Q6 (email provider), Q9 (follow and "my question" mappings), Q18 (when "Sharing window open"
  fires).
- Proposed new open questions: **NQ-13a** may notification emails include question titles or text,
  or only a link? **NQ-13b** are "essential" notifications essential on both channels or only one?

---

## Q1. Scope of "Administration" for a prototype

### Question and what it blocks (§13 Q1)

- §13 Q1: "What is the full scope of 'Administration'? The source text is truncated `[src p.17]`."
  Blocks §7.15. The spec text reads only "Allow institutional administrators to update website"
  (confirmed in `source-prompt.txt`, line 54).
- Known admin duties from elsewhere: configure "names, links, policy language, branding and LMS
  configuration" (§4, `[src p.1]`); the exceptional deanonymization configuration only if policy
  requires it (§6.4, §7.15); must not "routinely connect anonymous content with student identities"
  (§5). §11 lists "administrative configuration" as a deliverable.
- **Blocks milestone 1: partly.** Branding and policy links appear on every card (§7.3 Policy 71
  link, Guidelines link, "Configurable institutional-policy warning"), so *some* configuration
  source is needed. A full admin UI is not.

### Options considered

| Option | Milestone-1 admin scope | Strengths | Weaknesses |
|---|---|---|---|
| A1. Config file / seed data only | Institution name, policy links, policy-warning text, branding colours set in a reviewed file; no admin UI | Fastest; no admin role to secure yet | Not "administrator-configurable" in the UI sense; a code deploy per change (acceptable for a prototype, not for §4 "without code changes" in production) |
| A2. **Minimal admin settings page** | One institution; edit the §4 items (names, links, policy language, branding); LMS configuration left empty until Q5 | Proves the §4 model early; low risk; keeps the data model multi-institution ready | An admin role and its authorization tests are needed now |
| A3. A2 + user/role management (assign instructor role, create courses) | Adds provisioning screens | Lets the owner run a public prototype without LTI | Overlaps Q5; a manual "make instructor" step could be abused; must be audited (Q14 E6/E7) |
| A4. Full multi-institution admin | Tenants, per-institution SSO, LMS | Production-shaped | Far beyond a prototype; Q1 is unanswered |

### Evidence

- Spec only (§4, §5, §6.4, §7.15, §11; `source-prompt.txt` line 54). No external source needed.

### Privacy implications (§6)

- The admin dashboard is one of the six places §6.2 says must never show identity next to content
  text. An admin page that lists users must not also list or search content, and vice versa.
- Admins are a role that must be in the §9 negative tests too (§5: no routine connection of content
  to identities), not only instructors and TAs.
- An admin able to grant roles (A3) could enrol themselves as a student or instructor in a course.
  The threat model (Q8) should record what an admin-turned-instructor can still not see.

### Recommendation (proposal for the owner)

**A2 for milestone 1**, with an `institution` table that holds the §4 configurables from day one
(even with a single row), so later institutions need no schema change. Whether A3's role management
is also needed depends on Q5 (provisioning branch). Do not invent further admin powers until Q1 is
answered.

### Dependencies

- Q5 (provisioning), Q14 (audit of configuration changes), Q7 (support procedure), Q19 (policy
  language per locale).
- Proposed new open question **NQ-1a**: can the owner recover the missing text of the spec's
  "Administration" section from the original author, or should the owner write it?

---

## Q7. Impersonation or support procedure

### Question and what it blocks (§13 Q7)

- §13 Q7: "Is any impersonation/support procedure wanted, or none at all?" Blocks §5.
- §5 and §3: impersonation is prohibited "without a tightly controlled, audited support procedure"
  `[src p.2]`.
- **Blocks milestone 1: no, if the answer for milestone 1 is "none".** The other options add a
  capability that could defeat §6 and must not ship without design.

### Options considered

| Option | What a support person can do | Privacy risk | Effort |
|---|---|---|---|
| I0. **None** | Nothing as another user; support uses the admin page and the database console | Lowest | None |
| I1. "View as role" preview (no real user) | See a synthetic student or instructor view of a course | Low: no real identity is assumed. Instructors already have "preview the student view" for cards (§7.6) | Low |
| I2. Read-only impersonation of a real user, with consent and audit | See exactly what that user sees | **High**: viewing a student's private counter page and "my questions" (if Q9 has such a view) reveals what is anonymous to everyone else | Medium–high |
| I3. Full impersonation with approval workflow | Act as the user | Highest: can post "anonymously" as someone, or share their level | High |

### Evidence

- Spec only (§3, §5, §6.4). No external source was needed to state the options. The pattern that a
  deanonymization process needs multiple approvers, a reason, immutable audit and notification
  (§6.4) is a reasonable template for any future I2/I3 design; that is an analogy, not a
  requirement.

### Privacy implications (§6)

- Impersonating a student is a deanonymization path: anything the student can see about their own
  activity, the impersonator sees. I2/I3 therefore fall under §6.4's "Default: nobody can
  deanonymize".
- Even I0 leaves operator access to the database. The threat model must say what an operator with
  database credentials can and cannot learn, which is mainly a Q9 matter.

### Recommendation (proposal for the owner)

**I0 (none)** for milestone 1 and as the default, optionally with **I1** (synthetic "view as role"
previews) if the owner wants it for demos. Revisit I2/I3 only if a real support need appears, and
then design it under §6.4's safeguards.

### Dependencies

- Q9, Q14 (E9), Q1.
- Proposed new open question **NQ-7a**: is a synthetic "view as student" preview of a whole course
  (beyond the card preview in §7.6) wanted?

---

## Q19. Internationalisation (i18n)

### Question and what it blocks (§13 Q19)

- §13 Q19: "Should content support languages other than English (i18n)?" Blocks UI.
- Related: §4 "policy language" is administrator-configurable and "Later institutions must be
  supportable without code changes" `[src p.1]`. Several texts are **verbatim** in the spec (§7.3
  default principle, §7.4 default statement, §7.10 pre-share text, §7.12 survey questions); a
  translation of verbatim text would itself be new copy needing approval.
- Two different things hide in this question: (a) **UI strings** (buttons, labels, notices) and
  (b) **user content** (cards written by instructors, questions by students).
- **Blocks milestone 1: no for translations; yes for one cheap structural choice** (whether UI
  strings are externalised from the first commit).

### Options considered

| Option | Day-one work | Later cost to add a language | Notes |
|---|---|---|---|
| L0. English only, strings inline in components | None | High: every component touched; verbatim texts scattered | W3C: retrofitting is "much more difficult and time-consuming" |
| L1. **English only, but UI strings externalised in one message catalogue; `lang="en"` on pages; locale-aware date/number formatting** | Small: a message-key lookup instead of literals; one catalogue file | Low: add a catalogue per locale | Also puts every verbatim spec string in one reviewable place, which helps §15 "quote the spec" checks |
| L2. L1 + per-institution overrides of UI strings | Medium | Low | Supports §4 configurability of "policy language"; overlaps Q1 |
| L3. L1 + a language field on instructor-authored cards and per-field `lang` attributes | Small extra | n/a | Supports WCAG 3.1.2 if an instructor writes a card or part of one in another language |
| L4. Full bilingual UI (e.g. English and French) from day one | High | n/a | No requirement; translation of verbatim texts needs owner approval |

### Evidence (checked 2026-10-11)

- W3C Internationalization Activity, "Localization vs. Internationalization": internationalization
  is "the design and development of a product ... that enables easy localization"; adapting a
  product later is "much more difficult and time-consuming than designing a deliverable with the
  intent of presenting it globally"; it should not be "an afterthought that can often involve awkward
  and expensive re-engineering". (No last-updated date shown.)
  https://www.w3.org/International/questions/qa-i18n
- WCAG 2.2 SC 3.1.2 Language of Parts (Level AA): "The human language of each passage or phrase in
  the content can be programmatically determined", with exceptions for proper names, technical
  terms and similar. So if Q15 adopts 2.2 AA, any non-English passage an instructor writes must be
  marked, which is an i18n-adjacent requirement regardless of Q19.
  https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html
- Whether Ontario's French Language Services Act or any UW policy requires French for a student-
  facing tool: **Unverified** (not researched; no source fetched).
- Choice of i18n library (e.g. a framework's built-in routing or a message-format library) belongs
  to the Q3 stack branch; none is verified here.

### Privacy implications (§6)

- Minor. Per-user locale preference is identity-domain data (domain 3). A language tag on an
  anonymous question (if L3 is extended to student content) is low-cardinality metadata that, in a
  class with one francophone student, could identify the author. **Proposal:** do not store or
  display a language tag on anonymous student content; §7.12 also says "No unnecessary metadata".

### Recommendation (proposal for the owner)

**L1 now** (externalise UI strings, set `lang`, use locale-aware formatting), **L3** for instructor
card fields if Q15 adopts WCAG 2.2 AA, and treat translations (L4) as out of scope until the owner
answers Q19. The cost of L1 is roughly one indirection per string and a single catalogue file; it is
the cheap half of the work.

### Dependencies

- Q3 (library), Q15 (3.1.2), Q1/§4 (institution overrides of policy language).
- Proposed new open question **NQ-19a**: if a second language is added, who translates and approves
  the spec's verbatim texts (§7.3, §7.4, §7.10, §7.12)?

---

## Q10, Q11, Q12. Wizard rules, ranked-grading defaults, grade export format: can they wait?

### Questions and what they block (§13 Q10–Q12)

| Q | Text (§13) | Blocks | Needed for milestone 1? |
|---|---|---|---|
| Q10 | "The fixed decision rules the card-builder wizard uses to generate recommendations, and its curated resources." | §7.6 wizard path | **No**, if milestone 1 ships the **manual editor** path only. §7.6 offers "two paths" and lets instructors "skip the wizard", so the manual editor is a complete path on its own |
| Q11 | "Recommended default values for ranked grading." | §7.11 ranked mode | **No**, if milestone 1 has no grading settings, or offers **pass/fail only** (pass/fail needs no numeric default: the instructor picks Contributor or Sustained Contributor, §7.11) |
| Q12 | "Grade export format required by UW (e.g. LEARN gradebook CSV)." | §7.11 export | **No**, if milestone 1 has no export. But note §7.10: revocation is allowed "until the instructor exports or applies", so the **finality event** must exist before sharing ships, even if the file format does not |

### Options considered

| Q | Option | Notes |
|---|---|---|
| Q10 | W-a. Defer the wizard; ship manual editor (proposal) | Satisfies §7.6 manual path; no invented rules |
| Q10 | W-b. Owner authors a rule table (question → answer → recommended field text) as a reviewed document, then it is encoded | The only route consistent with "explicit fixed rules" and "transparent decision rule behind any recommendation" (§7.6) and §3 (no generative model setting policy) |
| Q10 | W-c. Ship wizard questions (the twelve in §7.6) as a guided form that fills fields **without** recommendations | Partial; still needs "short explanation" and "Why this matters" copy per question, which the owner must write |
| Q11 | G-a. Defer ranked mode | Pass/fail alone is a §7.11 mode |
| Q11 | G-b. Ship ranked mode with **no** prefilled values (instructor must enter them) | §7.11 says "Recommended defaults are provided", so this is incomplete, not wrong, until Q11 is answered |
| Q12 | E-a. "Apply" as an in-app action only (records finality, no file) | Gives §7.10 its finality trigger without a format decision |
| Q12 | E-b. Generic CSV (name, level, date shared) | Matches exactly the three fields §7.10 allows instructors to receive; still a format choice the owner must approve |
| Q12 | E-c. LEARN/Brightspace grade-import CSV | Needs the official format; **Unverified** here (see evidence) |

### Evidence (checked 2026-10-11)

- Spec only for scope (§3, §7.6, §7.10, §7.11).
- LEARN grade import format: the UW LEARN help pages moved to IST's knowledge base on Atlassian
  Confluence (https://uwaterloo.ca/learn-help/instructors/grades now redirects to
  https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/261226669/Teaching+Learning+and+Research ;
  LEARN help: https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/284530130/LEARN+help ).
  No grade-import page was found in the fetched content, and a guessed D2L community URL returned
  404. **The Brightspace grade CSV format is Unverified**; the owner (or the Q5 branch, if LTI
  Assignment and Grade Services is in scope) should get it from LEARNhelp (learnhelp@uwaterloo.ca is
  the contact the page gives).

### Privacy implications (§6)

- Q12: any export is in §6.2's list ("export"). It may contain only name, verified level and date
  shared (§7.10), and must be produced from domain 4 alone, never by joining domains 2 or 1. A §9
  negative test should parse the export and assert no other columns.
- Q12/Q18: each export is a snapshot an instructor can subtract from a later one (Q16). F2 (export
  only after the window closes) limits this.
- Q10: wizard answers are instructor data, not student data; low privacy risk. The §3 prohibition
  on a generative model setting policy is the main constraint.
- Q11: none.

### What the owner needs to provide (proposal)

- **Q10:** a rule table and the curated resource list, written or approved by the owner. Until then,
  ship the manual editor.
- **Q11:** a value per level for ranked mode (or confirmation that ranked mode waits).
- **Q12:** confirmation of whether milestone 1 needs any export; if yes, the LEARN format from
  LEARNhelp, or approval of a generic CSV with exactly the §7.10 fields.

### Proposed new open questions

- **NQ-12a**: does "applies the result" (§7.10) mean an in-app action, a grade pushed to LEARN, or
  both? It is the trigger that makes shares final.
- **NQ-10a**: may the wizard ship without recommendations (questions and explanations only) before
  the rule table exists?

---

## Q2. Candidate milestone-1 feature set (proposal, not a decision)

### Question and what it blocks (§13 Q2)

- §13 Q2: "Goal of the first build: a public prototype or the full production system? Which features
  are in the first milestone?" Blocks the roadmap.
- The owner has stated the goal: a public prototype people can sign in to and use, looking polished
  and credible (§8), not painting the production system (§10–§11) or the privacy architecture (§6)
  into a corner. The **feature list** is still open; below is a candidate for the owner to accept,
  trim or extend.
- Rule applied: §13 says nothing that depends on an open question may be built until it is answered.
  So each feature lists the questions that must be answered first. §6.3 adds that Q9 must be in an
  ADR and the threat model **before any content or participation code is written**.

### Candidate features

Column "Proposal" is this branch's suggestion: **In** (milestone 1), **Later**, or **Stub** (data
model hooks only, no UI).

| # | Feature | CONTRIBUTING ref | Blocked by (must be answered first) | Proposal |
|---|---|---|---|---|
| F1 | Sign-in for real users | §10 item 1, §11 | Q3, Q4 | **In** |
| F2 | Courses, enrolment, roles (incl. TA permission assignment) | §5, §10 item 2 | Q5; Q1 if admins create courses | **In** (simplest provisioning Q5 allows) |
| F3 | Institution configuration (names, policy links, policy warning, branding) | §4, §7.15 | Q1 (scope), Q14 (audit of changes) | **In** as A2 (see Q1) |
| F4 | Course AI Card: manual editor, preview, draft/publish, versioning, verbatim default principle | §7.1, §7.3, §7.6 (manual path), §10 item 3 | Q15, Q19 (L1 structure), Q14 (E3) | **In** |
| F5 | Assignment AI Cards with visible overrides, LEARN link, states draft/published/archived/superseded | §7.4, §10 item 4 | Same as F4 | **In** |
| F6 | Change records on published rule changes (what, why, effective date, applies to work underway) | §7.6 versioning | Q14; Q13 for the "students are notified" part | **In** (record); notice depends on F15 |
| F7 | Transparency-bonus fields on cards (requirements and links only, no uploads) | §7.4, §7.5, §3 | None beyond F5 | **In** |
| F8 | Card-builder wizard with fixed-rule recommendations | §7.6 | **Q10** | **Later** |
| F9 | Anonymous board: ask, comment, upvote, "Still unclear", follow, two tags only, filters | §7.2, §7.7, §10 items 5–6 | **Q9, Q8** (§6.3), Q20, Q15 | **In**, only after the Q9 ADR and threat model exist |
| F10 | Moderation: answer, pin, recategorize, hide, delete, resolve/reopen, report + queue, rate limits | §7.7, §10 item 7 | **Q9**, **Q20**, Q14 (E1), Q17 (tombstones) | **In** (M1 manual queue, placeholder limits) |
| F11 | Merge duplicates with correct counts | §7.7, §10 item 8 | **Q9** (no double-counting, credit preserved), Q20 (reports on merge, NQ-20b) | **Later** or **In** if the Q9 design makes it straightforward; it is a §10 production criterion either way |
| F12 | Presentation mode | §7.8, §10 item 9 | Depends on F9/F10 | **In** (small, high demo value) |
| F13 | Search and filtering within a course | §7.14 | Depends on F9/F10 | **In** (basic filters and sorts) |
| F14 | Private participation counter and three levels (student view only) | §7.9, §7.10 first bullet, §10 items 10–11 | **Q9** | **In** (private view) |
| F15 | In-app notifications | §7.13 | Q13 | **In** for card-change notices if Q13 answered; otherwise **Later** |
| F16 | Email notifications | §7.13 | Q6, Q13, NQ-13a | **Later** |
| F17 | Student-controlled sharing, revocation, finality | §7.10, §10 items 12–13 | **Q18**, NQ-12a, Q16 (if level counts are shown) | **Later** (Stub: domain-4 tables) |
| F18 | Grading settings (pass/fail, ranked) | §7.11 | Q11 (ranked), Q12 | **Later** |
| F19 | End-of-course survey | §7.12, §10 item 14 | **Q16**, **Q18**, Q9 (one response per student) | **Later** (Stub: domain-5 separation) |
| F20 | Analytics: course aggregates (totals, unanswered, % resolved, Course vs assignment) | §7.16 | None of the level-count rules; Q16 only for level counts | **In** without level counts |
| F21 | Analytics: students per level; survey aggregates | §7.16 | **Q16**, Q18 | **Later** |
| F22 | Audit logging for shipped features | §7.17, §11 | **Q14** | **In** (L1+L2, see Q14) |
| F23 | Threat model and limitations of anonymity | §6.2, §11 | **Q8** | **In** (precondition for F9, F14) |
| F24 | Automated tests incl. negative privacy tests | §9, §11, §15 | Q3 (tooling) | **In** for every shipped feature |
| F25 | Deployment documentation | §11 | Q3 | **In** |
| F26 | Retention: prototype wipe notice and lifecycle hooks | §13 Q17 | **Q17**, NQ-2a | **In** (D4 + hooks) |
| F27 | Deanonymization process | §6.4 | Institutional policy | **Never by default**; not in milestone 1 |
| F28 | Impersonation | §3, §5 | Q7 | **Not in milestone 1** (I0) |

### Privacy implications (§6)

- The proposed milestone 1 contains anonymous content (F9) and private counters (F14). That is
  deliberate: the owner asked that the prototype not paint §6 into a corner, and the only way to test
  the privacy architecture is to build it. The cost is that **Q8 and Q9 become hard prerequisites
  for the first content code** (§6.3). A smaller, safer alternative is a milestone 1a of F1–F7,
  F20-without-content, F22–F26 (cards only, no anonymous content), followed by a 1b that adds
  F9–F14 once the Q9 ADR exists.
- Leaving sharing (F17) and the survey (F19) for later avoids Q16's differencing problem in
  milestone 1, because instructors then see no per-level data at all.
- Real students posting real questions in a public prototype brings in the UW guidance (Information
  Risk Assessment, notify students, allow opt-out; see Q17 evidence). Whether the public prototype
  uses real UW courses is NQ-2a.

### Recommendation (proposal for the owner)

Adopt the **In** rows above as the candidate milestone 1, split into **1a (cards, sign-in, admin
config, audit, tests)** and **1b (board, moderation, presentation, search, private counter)**, so
that a polished, usable product exists even while Q9 is being designed. Answer the questions marked
in bold in the "Blocked by" column before the matching code starts.

### Proposed new open questions

- **NQ-2a**: will the public prototype be used with real UW courses and students, or only with demo
  courses and invited testers? (Changes Q17, NQ-17b and whether a UW Information Risk Assessment is
  needed first.)
- **NQ-2b**: is merge (F11) required in milestone 1, given it is a §10 criterion but depends heavily
  on Q9?
- **NQ-2c**: is a split into milestone 1a and 1b acceptable?

---

## Summary: does each question block milestone 1?

All "Proposal" entries are suggestions for the owner, not decisions.

| Q | Blocks milestone 1? | Proposal | Owner input needed |
|---|---|---|---|
| Q15 | **Yes** (every UI story, §15 item 5) | WCAG 2.2 AA | Approve target |
| Q16 | Only if sharing, survey or level-count analytics ship (proposal: they don't) | Rule shape: release once after window closes + residual check + complementary suppression; placeholder N = 10 | Approve rule shape now; N later |
| Q20 | **Yes**, if the board ships | R3 rate limits (placeholder numbers), M1 manual queue, soft delete, reporter identity not stored | Approve workflow and placeholder numbers; NQ-20a–e |
| Q8 | **Yes** (precondition for content code, §6.3) | Markdown in `docs/threat-model/` + owner-approved user-facing limitations page | Approve format/location |
| Q14 | **Partly** (events for shipped features) | Audit E1, E2; E3–E8 for approval; L1+L2 storage | Approve event list; retention later |
| Q17 | **Partly** (real people's data) | D4 prototype wipe + D2 lifecycle hooks; D3 before UW pilot | Approve prototype policy and wording; NQ-17a |
| Q18 | Only if sharing/survey ship | W2 + F2 (dates set at policy publication; export only after close) | Later |
| Q13 | Only if notifications ship | N3; no content text in email | Approve essential set |
| Q1 | **Partly** (§4 config needed by cards) | A2 minimal admin settings, `institution` table | Approve; NQ-1a |
| Q7 | No, if "none" | I0 (none), optional I1 previews | Confirm "none" |
| Q19 | No for translation; yes for string externalisation | L1 (+L3 if WCAG 2.2 AA) | Confirm English-only for now |
| Q10 | No (manual editor path) | Defer wizard | Rule table later |
| Q11 | No (pass/fail only or no grading) | Defer ranked mode | Values later |
| Q12 | No (no export); but finality trigger needed before sharing | Defer; define "apply" (NQ-12a) | LEARN format later |
| Q2 | — | Candidate set above, split 1a/1b | Accept, trim or extend |

---

## Consolidated proposed new open questions

None of these is a requirement; each is proposed for the owner to add to §13 or dismiss.

| ID | Question | Arose from |
|---|---|---|
| NQ-15a | Does UW require a newer WCAG version, a VPAT/ACR, or an accessibility review beyond Policy 58's WCAG 2.0 AA? | Q15 |
| NQ-16a | May instructors lower the survey threshold, or is there an institution-level floor? | Q16 |
| NQ-16b | Is N the same for level counts and survey reveal? | Q16 |
| NQ-16c | Are in-term level counts wanted at all, given the differencing risk? | Q16 |
| NQ-20a | Can hidden content be un-hidden, and deleted content restored, and by whom? | Q20 |
| NQ-20b | What happens to open reports when content is merged or edited? | Q20 |
| NQ-20c | Does hiding or deleting a post remove the author's participation credit? | Q20 |
| NQ-20d | Can an author edit or delete their own anonymous post? | Q20 |
| NQ-20e | Does "without exposing identities" (§7.7) cover the moderator's identity in the log? | Q20 |
| NQ-8a | Must the limitations of anonymity be visible in the app, or is the repo document enough? | Q8 |
| NQ-14a | Does a UW records-retention schedule apply to audit logs of a teaching tool? | Q14 |
| NQ-17a | On account removal, does a student's anonymous content stay, go, or does the student choose? | Q17 |
| NQ-17b | Is a UW Information Risk Assessment needed before a UW pilot, and who requests it? | Q17 |
| NQ-18a | May the instructor move sharing dates after publication, and in which direction? | Q18 |
| NQ-18b | Is the survey a required step before sharing, or shown first and skippable? | Q18 |
| NQ-18c | Can a student share before the end of the course? | Q18 |
| NQ-13a | May notification emails include question titles or text, or only a link? | Q13 |
| NQ-13b | Are essential notifications essential on both channels or one? | Q13 |
| NQ-1a | Can the missing text of the spec's Administration section be recovered, or will the owner write it? | Q1 |
| NQ-7a | Is a synthetic whole-course "view as student" preview wanted? | Q7 |
| NQ-19a | Who translates and approves verbatim spec texts if a second language is added? | Q19 |
| NQ-10a | May the wizard ship without recommendations before the rule table exists? | Q10 |
| NQ-12a | Does "applies the result" (§7.10) mean an in-app action, a LEARN grade push, or both? | Q12 |
| NQ-2a | Will the public prototype use real UW courses and students, or demo courses and invited testers? | Q2 |
| NQ-2b | Is duplicate merge required in milestone 1? | Q2 |
| NQ-2c | Is a milestone 1a / 1b split acceptable? | Q2 |

Items to hand to other branches: Q9 (one survey response per student without linkage; one report
per student per item; follow lists; deletion vs unlinkability; whether deletion touches counters);
Q3 (request-log retention and bodies; backup retention; axe-core and i18n library status); Q4
(SC 3.3.8 accessible authentication); Q5 (course end dates from LEARN; LTI grade services); Q6
(generic email subjects).

---

## Verification log

Status key: **Verified** = quoted from the fetched page on the checked date; **Unverified** = could not
be confirmed from an official source; **Interpretation** = a reading of a verified source, not a fact
stated by it; **Placeholder** = a number proposed here for owner approval, not sourced.

| # | Claim | URL | Checked | Status |
|---|---|---|---|---|
| 1 | AODA requires designated public sector orgs and businesses/non-profits with 50+ employees to make public websites accessible (since 2021-01-01) to WCAG 2.0 AA, except 1.2.4 and 1.2.5 | https://www.ontario.ca/page/how-make-websites-accessible | 2026-10-11 | Verified |
| 2 | Colleges and universities are designated public sector organizations under O. Reg. 191/11 | https://www.ontario.ca/page/accessibility-rules-public-sector-organizations | 2026-10-11 | Verified |
| 3 | Text of O. Reg. 191/11 s. 14 and its current consolidation date | https://www.ontario.ca/laws/regulation/110191 | 2026-10-11 | Unverified (page did not render) |
| 4 | UW Policy 58 s. 7: UW will meet WCAG 2.0 AA for all Public Websites, including newly developed sites accessible to all students | https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policies/policy-58-accessibility | 2026-10-11 | Verified |
| 5 | UW accessibility pages name no WCAG version beyond 2.0 | https://uwaterloo.ca/accessibility/ ; https://uwaterloo.ca/digital-accessibility/ | 2026-10-11 | Verified (for the pages fetched) |
| 6 | A UW IST procurement or vendor rule requiring a newer WCAG version | (none found) | 2026-10-11 | Unverified |
| 7 | WCAG 2.2 published 2023-10-05, updated 2024-12-12; W3C encourages the latest version; 2.2 conformance implies 2.1 and 2.0; ISO/IEC 40500:2025 = WCAG 2.2 | https://www.w3.org/WAI/standards-guidelines/wcag/ | 2026-10-11 | Verified |
| 8 | WCAG 2.2 removes 4.1.1 Parsing; new SC 2.4.11, 2.5.7, 2.5.8, 3.3.8 (AA) and 3.2.6, 3.3.7 (A) | https://www.w3.org/TR/WCAG22/ | 2026-10-11 | Verified |
| 9 | WCAG 2.2 SC 3.1.2 Language of Parts is Level AA | https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html | 2026-10-11 | Verified |
| 10 | TBS PIN 2020-03: no universal minimum cell size; 10 often cited for less sensitive data, 20 for more sensitive; never less than 3; totals may need rounding | https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information-privacy-notices/2020-03-protecting-privacy-releasing-information-about-small-number-individuals.html | 2026-10-11 | Verified |
| 11 | Ontario IPC De-identification Guidelines (2016): risk thresholds 0.1/0.075/0.05 roughly equal to cell sizes 10/15/20, illustrative only; cell-size-of-five called loosely defined | https://www.ipc.on.ca/sites/default/files/legacy/2016/08/Deidentification-Guidelines-for-Structured-Data.pdf | 2026-10-11 | Verified (PDF; landing page returned 403) |
| 12 | US ED PTAC: 3 as the absolute minimum; state minimums 5 to 30, majority 10; subtraction attack; complementary suppression; teachers presumed to have inside knowledge | https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf | 2026-10-11 | Verified |
| 13 | UW SCP surveys: results not released to instructors for classes of 5 or fewer; a response threshold is being planned | https://uwaterloo.ca/teaching-assessment-processes/resources-instructors | 2026-10-11 | Verified |
| 14 | Differencing between level counts and the shared list reveals non-sharers' levels | (analysis in this file, Q16) | 2026-10-11 | Interpretation (supported by #12) |
| 15 | Default N = 10 | (proposal in Q16) | 2026-10-11 | Placeholder |
| 16 | OWASP API4:2023: rate-limit per client and operation, tune to business needs, no numbers given, payload-size limits | https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption | 2026-10-11 | Verified |
| 17 | Rate-limit numbers in Q20 | (proposal in Q20) | 2026-10-11 | Placeholder |
| 18 | Many UW students share one public IP through campus NAT | (none) | 2026-10-11 | Unverified |
| 19 | OWASP Threat Modeling Cheat Sheet: four questions; DFDs most common; maintain the model alongside the system | https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html | 2026-10-11 | Verified |
| 20 | LINDDUN is a free privacy threat-modelling framework from KU Leuven (GO, PRO; MAESTRO "coming soon") | https://linddun.org/ | 2026-10-11 | Verified |
| 21 | OWASP Threat Dragon current status | (not fetched) | 2026-10-11 | Unverified |
| 22 | PostgreSQL 18 docs: an owner's right to modify or destroy an object cannot be granted or revoked; INSERT, UPDATE, DELETE granted separately | https://www.postgresql.org/docs/current/ddl-priv.html | 2026-10-11 | Verified |
| 23 | Cloudflare R2 bucket locks prevent deletion or overwrite for a period; lock rules can be deleted by the account | https://developers.cloudflare.com/r2/buckets/bucket-locks/ | 2026-10-11 | Verified |
| 24 | R2 pricing | (not fetched; stack branch) | 2026-10-11 | Unverified |
| 25 | S3 Object Lock compliance mode cannot be bypassed even by root; governance mode can be bypassed with a permission | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html | 2026-10-11 | Verified |
| 26 | OWASP Logging Cheat Sheet: log authn/authz events, admin actions, data import/export; remove or mask sensitive data; tamper detection; logs kept no shorter and no longer than retention | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | 2026-10-11 | Verified |
| 27 | UW handles information under FIPPA; records management under Policy 46 | https://uwaterloo.ca/privacy/ | 2026-10-11 | Verified |
| 28 | UW online ed-tech guideline: determine whether an Information Risk Assessment is required first; prefer tools not requiring identification; notify; allow opt-out; follow WatClass | https://uwaterloo.ca/privacy/guidelines/online-educational-technologies | 2026-10-11 | Verified |
| 29 | UW record keeping: dispose of short-term records; collect only what you need; no periods given | https://uwaterloo.ca/privacy/policies-guidelines/record-keeping | 2026-10-11 | Verified |
| 30 | FIPPA Reg. 460 minimum retention after use | https://www.ontario.ca/laws/regulation/900460 | 2026-10-11 | Unverified (page did not render) |
| 31 | Host backup retention periods | (stack branch) | 2026-10-11 | Unverified |
| 32 | CASL s. 1(2) CEM definition (purpose to encourage participation in a commercial activity) and s. 6(6)(d) factual-information exception; Act current to 2026-09-21 | https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html | 2026-10-11 | Verified |
| 33 | ClearCourse notifications are not commercial electronic messages | (reading of #32) | 2026-10-11 | Interpretation, not legal advice |
| 34 | CRTC CASL FAQ | https://crtc.gc.ca/eng/com500/faq500.htm | 2026-10-11 | Unverified (HTTP 403) |
| 35 | W3C: internationalization enables easy localization; retrofitting is much more difficult and time-consuming | https://www.w3.org/International/questions/qa-i18n | 2026-10-11 | Verified (no page date shown) |
| 36 | Ontario French Language Services Act or a UW policy requires French for this tool | (not researched) | 2026-10-11 | Unverified |
| 37 | UW LEARN help for instructors redirects to IST's Confluence knowledge base | https://uwaterloo.ca/learn-help/instructors/grades redirects to https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/261226669/Teaching+Learning+and+Research | 2026-10-11 | Verified (302 observed) |
| 38 | Brightspace/LEARN grade-import CSV format | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/284530130/LEARN+help ; https://community.d2l.com/brightspace/kb/articles/3293-import-grades (404) | 2026-10-11 | Unverified |
| 39 | LEARN can supply course end dates via LTI or provisioning | (Q5 branch) | 2026-10-11 | Unverified |
| 40 | axe-core current version and licence; i18n library choice | (stack branch) | 2026-10-11 | Unverified |
| 41 | The spec's Administration text is only "Allow institutional administrators to update website" | P:/code/clearcourse-ai/docs/research/source-prompt.txt line 54 | 2026-10-11 | Verified (local source) |

_End of branch O2 notes. All recommendations are proposals for the owner; no open question is closed
by this document._
