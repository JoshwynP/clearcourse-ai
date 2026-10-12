# Other open questions that block the first milestone

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: **Q6, Q13, Q15, Q16, Q20, Q8, Q14, Q17, Q18, Q1, Q7, Q19, Q10, Q11, Q12** and the
> milestone-1 part of **Q2**; also Q4 and Q9 (dependencies). New questions use the PQ-nn IDs listed
> in section 9.
> No ADR is proposed in this file. Related proposed ADRs:
> [ADR 0003](../decisions/0003-privacy-mechanism.md) (privacy mechanism, Q9) and
> [ADR 0004](../decisions/0004-prototype-authentication.md) (prototype sign-in, Q4).

## Contents

1. [Summary and recommendation](#1-summary-and-recommendation)
2. [Questions covered and what they block](#2-questions-covered-and-what-they-block)
3. [Options considered](#3-options-considered)
4. [Evidence](#4-evidence)
5. [Comparison](#5-comparison)
6. [Recommendation (proposal) with trade-offs](#6-recommendation-proposal-with-trade-offs)
7. [Privacy implications (§6)](#7-privacy-implications-6)
8. [Risks](#8-risks)
9. [Open questions](#9-open-questions)
10. [Sources and verification log](#10-sources-and-verification-log)

## 1. Summary and recommendation

This file covers the §13 questions that are not handled by the stack, privacy and sign-in research,
but that still decide what the first milestone can contain. Everything below is a **Proposal** for
the owner. No open question is closed. §13 says nothing that depends on an open question may be
built until it is answered, so each question below says what it blocks and when an answer is
needed.

**Main findings.**

- **Email is on the milestone-1 critical path only because of sign-in.** ADR 0004 proposes 6-digit
  email codes. Free tiers with 100/day caps (Resend, Mailgun, MailerSend) can lock a class out at
  the start of a lecture. Notification email can wait for M2.
- **Every email provider stores something identity-bearing**, and UW's own mail systems store the
  subject for up to 90 days. So notification emails must be content-free, type-free and sent on a
  fixed schedule, or they recreate the identity-plus-content link that §6.2 forbids in our own
  systems.
- **One aggregation number is not enough (Q16).** An instructor who sees level counts and the named
  shares can subtract one from the other. The rule *shape* must be fixed before participation code
  is written; the number N can wait.
- **Most other questions have a cheap, reversible proposal** that unblocks milestone 1 without
  inventing scope: minimal admin settings, no impersonation, English with externalised strings, a
  manual card editor instead of the wizard, a prototype data notice.

**Proposals at a glance.**

| Q | Proposal (owner approval needed) | Blocks milestone 1? |
|---|---|---|
| Q6 | **Amazon SES `ca-central-1`** behind a provider-neutral mailer port, on an **AWS Paid account plan**; production access requested early; tracking off; à la carte pricing. Resend Free for dev/demo only | **Yes, M1a** (sign-in codes). Notification email: M2 |
| Q13 | **N3:** card-change notices and "Sharing window open" essential **in-app**; every email type user-manageable | M1b (in-app subset); email part M2 |
| Notification privacy | All eight §7.13 types in-app, computed on read; emails content-free and type-free, linking only to `/notifications`; activity-linked types by email only as fixed-time daily digests; outbox rows deleted after send | M1b (in-app); M2 (email) |
| Q15 | **WCAG 2.2 AA** for all UI; axe in Playwright plus a manual keyboard and screen-reader checklist per page | **Yes, M1a** (every UI story, §15 item 5) |
| Q16 | Level counts released **once, after the sharing window closes**, if a residual check passes; survey text in one batch after close. **Placeholder N = 10**, never below 3. Shown beside the privacy judge's snapshot rule; PQ-31 decides | Rule shape before ADR 0003 is accepted; N before M2 |
| Q20 | Rate limits **R3** with **placeholder values only**; moderation **M1** manual queue, soft delete, no reporter identity stored | **Yes, M1b** (board) |
| Q8 | Markdown at `docs/threat-model/README.md` (path is a proposal) with DFD, STRIDE, LINDDUN and the limitations of anonymity; plus an in-app limitations page | **Yes, M0** (before content code, §6.3) |
| Q14 | Audit E1 and E2 (spec-required); E3–E8 proposed; storage L1 + L2; retention a placeholder | Partly, M1a (events for shipped features) |
| Q17 | Prototype: "prototype data may be wiped" notice (D4) plus lifecycle hooks (D2); before a UW pilot, periods set with UW's privacy office (D3); crypto-shred as an option | Partly, M1a |
| Q18 | **W2 + F2**: dates set when the participation policy is published; export/apply only after close | M2 |
| Q1 | **A2** minimal admin settings and an `institution` table from day one | Partly, M1a |
| Q7 | **I0** no impersonation; optional synthetic "view as role" preview | No, if the owner confirms "none" |
| Q19 | **L1**: English only, UI strings externalised from day one | Structure only, M0/M1a |
| Q10–Q12 | Defer the wizard, ranked grading and export format to M2 | No |
| Q2 | Milestone 1 split into **M1a** (cards, no anonymous content) and **M1b** (anonymous board), section 6.8 | Roadmap (Tier 1 decision) |

## 2. Questions covered and what they block

| Q | §13 text (short) | Blocks (§13) | Blocks milestone 1? | Answer needed |
|---|---|---|---|---|
| Q6 | Email delivery provider for notifications | §7.13 | Yes, if sign-in uses email codes (ADR 0004). §10 "Institutional users can sign in securely" then depends on email | M1a (sign-in); M2 (notifications) |
| Q13 | Which notifications are "essential" | §7.13 | Only if notifications ship in M1 | M1b (in-app); M2 (email) |
| Q15 | Accessibility conformance target | §8 | Yes. §15 item 5 makes §8 part of "done" for every UI change | M1a |
| Q16 | Default aggregation threshold N | §7.12, §7.16 | Only if sharing, survey or level analytics ship. The rule shape affects the data model | Rule shape: ADR 0003; N: M2 |
| Q20 | Rate-limit values and moderation workflow | §7.7 | Yes, if the board ships. A public board without limits or a queue is not safe to open | M1b |
| Q8 | Threat-model format and location | §6 | Yes. §6.3: the threat model must exist "before any content or participation code is written" | M0 |
| Q14 | Audited events and retention | §7.17 | Partly: events for the features that ship | M1a |
| Q17 | Retention and deletion | Data model | Partly: a public prototype holds real sign-in data | M1a |
| Q18 | Sharing window; who triggers "end of course" | §7.10, §7.12 | Only if sharing or the survey ship | M2 |
| Q1 | Scope of "Administration" | §7.15 | Partly: every card shows configurable policy links (§7.3) | M1a |
| Q7 | Impersonation or none | §5 | No, if the answer is "none" | M1a (confirm) |
| Q19 | Languages other than English | UI | No for translation; yes for one structural choice | M0 |
| Q10 | Wizard rules and curated resources | §7.6 | No, if M1 ships the manual editor only | M2 |
| Q11 | Ranked-grading defaults | §7.11 | No, if M1 has no grading settings | M2 |
| Q12 | Grade export format | §7.11 | No, if M1 has no export. The finality event (§7.10) must exist before sharing ships | M2 |
| Q2 | First build goal and milestone-1 features | Roadmap | Yes (it defines milestone 1) | Tier 1 |

Dependencies outside this file: Q4 sign-in (ADR 0004) makes email critical; Q9 privacy mechanism
(ADR 0003) decides who can receive activity-linked notifications and how reports are de-duplicated;
Q3 hosting (ADRs 0001 and 0002) sets which logs exist and for how long.

## 3. Options considered

### 3.1 Q6: email providers (USD; checked 2026-10-11)

| Provider | Free tier | Cheapest paid | Data location | Bodies and logs kept | Verdict (proposal) |
|---|---|---|---|---|---|
| **Amazon SES** | No SES allowance; AWS credits for new customers | À la carte **$0.10 / 1,000** (Essentials $0.16) | **`ca-central-1`** (also `ca-west-1`, no SMTP) | No body store documented (**Unverified**); tracking off unless configured | **Proposed** |
| Resend | **3,000/month, 100/day** | Pro $20/month | US | 30 days; bodies kept unless a $50/month add-on (inference) | Dev/demo fallback |
| Cloudflare Email Sending (**Beta**) | None on Workers Free | Workers Paid ($5 minimum) incl. 3,000, then $0.35 / 1,000 | **Unverified** | Preview keeps bodies and attachments ~7 days, on by default | Only if hosting were on Workers Paid; not for sign-in |
| Postmark | 100/month | Basic $15/month | US | Content 45 days | Not proposed |
| Mailgun | 100/day, 1-day logs | Basic $15/month | US or EU | 1-day logs | Fallback at most; cap breaks sign-in |
| SendGrid | 60-day trial only | From $19.95/month | US | Activity 3 days | Not proposed |
| MailerSend | 500/month; approval and card | Hobby $7/month | EU | Activity 1 day | Not proposed |
| Brevo | **Unverified** (pages did not render) | **Unverified** | **Unverified** | **Unverified** | Not assessed |
| UW sending path | n/a | n/a | UW tenant | UW's logs | Ask UW for production (PQ-42) |

### 3.2 Notification channel designs

IDs CH0–CH4 are local to this file (N0–N4 in the raw O1 note), so they don't clash with the Q13
options.

| ID | Design | What third parties learn | Verdict |
|---|---|---|---|
| CH0 | Rich per-event email (question text, `/q/<id>` link, typed subject) | Identity plus content or content id, exact time | Reject (interpretation of §3/§6.2) |
| CH1 | Content-free email at action time | Identity, type if named, **exact time of the action** | Course-wide broadcasts only |
| CH2 | Content-free, type-free **personal digest** at a fixed time | Identity plus "some update in window W" | Viable; leaks recipient sets in small classes |
| CH3 | **Course digest** to every opted-in member, updates or not | Enrolment and opt-in only | Strongest privacy, least useful; partial §7.13 fit |
| CH4 | Activity-linked types in-app only | Nothing about activity | Deviates from §7.13's email list; needs PQ-38 |

### 3.3 Q13: essential notifications

| Option | Essential (cannot be disabled) | Notes |
|---|---|---|
| N1 | None | Would let a student turn off §7.6 "Affected students are notified" |
| N2 | Course card changed, Assignment card changed (§7.6), Sharing window open (§7.10), any deanonymization notice if that ever exists (§6.4) | Essential = what a student needs to know their obligations or rights |
| **N3** | The N2 set, essential **in-app only**; every email user-manageable | Fits §8 "avoid attention-maximizing patterns" |
| N4 | Instructor chooses per course | Not in the spec |

Variants for card-change notices: essential for any edit, only for published rule changes, or only
when the instructor marks "applies to work already underway" (§7.6); see PQ-39. Sign-in code emails
are authentication messages, not §7.13 notifications, so preferences don't apply to them
(classification proposal).

### 3.4 Q15: accessibility target

| Option | Meets Ontario's WCAG 2.0 AA floor? | Notes |
|---|---|---|
| WCAG 2.0 AA (minus 1.2.4, 1.2.5) | Yes | Lowest cost; W3C encourages the latest version |
| WCAG 2.1 AA | Yes | Still includes 4.1.1 Parsing |
| **WCAG 2.2 AA** | Yes (2.2 conformance implies 2.1 and 2.0; 2.0-based policies may still expect 4.1.1 testing) | Adds target size, focus not obscured, dragging alternatives, consistent help, redundant entry, accessible authentication |
| 2.2 AA plus selected AAA | Yes | AAA as stretch goals only (2.4.13, 1.4.6 for presentation mode) |

### 3.5 Q16: aggregation threshold and the differencing problem

**Why one N is not enough.** The instructor sees the level counts (§7.16), the named shares (name,
verified level, date shared; §7.10) and the roster (§5). Subtracting shares from counts gives the
levels of the students who did **not** share (illustrative):

| Level | Count shown | Named shares | Residual (non-sharers) |
|---|---|---|---|
| Sustained Contributor | 12 | 12 | 0 |
| Contributor | 20 | 19 | **1** |
| No Record | 8 | 8 | 0 |

With one non-sharer, the instructor learns that student's level, which defeats §7.10 and the §10
criterion "Students alone decide whether to share their level". Many non-sharers in one level leak
the same way. Rounding doesn't help when the roster total is known, and a count seen before sharing
opens (a screenshot) can be subtracted later. The survey has a timing variant: it is presented
before sharing (§7.12), so a visible arrival time, order or live counter can link a student's text
to their share. Writing style is a residual risk no threshold removes.

| Option | How it works | Weakness |
|---|---|---|
| A. Minimum cell size N + complementary suppression | Hide counts < N and one more cell | Ignores share differencing on its own; zero cells also disclose |
| B. Minimum class or response size | Show nothing below N | Coarse; larger classes still differenced |
| C. Residual check against shares | At least N non-sharers, not all in one level, else suppress | Needs careful wording and tests |
| D. Release timing | One frozen release after sharing is final | No in-term level counts |
| E. Banding or rounding | Ranges such as "10–19" | Partly reversible with known totals |
| F. Noise (differential privacy) | Calibrated noise | Hard to explain; at odds with §8 "credible" |

Survey options: **S1** reveal text when responses ≥ N (literal §7.12); **S2** S1 plus one batch after
close, random order, no timestamps; **S3** S2 plus an institution floor instructors can raise but
not lower (not in the spec; PQ-36).

**Two rule shapes to reconcile** (both proposals; the owner chooses):

| | O2 shape (this file) | Privacy judge snapshot rule ([privacy-architecture.md](privacy-architecture.md) §6.10) |
|---|---|---|
| When level counts appear | **Once, after the sharing window closes and shares are final** (D) | Frozen snapshots on an owner-set cadence (weekly with lag, or one end-of-term snapshot); never on demand |
| Suppression | Residual check plus complementary suppression (C + A) | Whole distribution hidden unless enrolment ≥ N **and** every non-empty level ≥ N |
| Relation to sharing | Released after sharing is final | **Hidden from the moment sharing opens**; nothing newer than the last pre-window snapshot afterwards |
| Content totals (§7.16) | Could stay live (not per-student) | Frozen snapshots, never live |

If PQ-31 says "no in-term level counts", both reduce to one end-of-term rule; what remains is
whether the release comes before sharing opens (judge) or after it closes (O2), and the content
totals difference.

### 3.6 Q20: rate limits and moderation

| Option | Key | Notes |
|---|---|---|
| R1 | (user, course, action), fixed window | Matches OWASP's per-user, per-operation advice; the store is identity-bearing |
| R2 | IP only | Campus NAT may group many students (**Unverified**); IPs are identity-bearing (PQ-11) |
| **R3** | R1 for signed-in writes + R2 for unauthenticated endpoints | Covers abuse before and after sign-in |
| R4 | Host or WAF limits | Vendor-specific; host logs pair IP with path and time |

**Placeholder values, not requirements** (OWASP gives no numbers): ask 5, comment 20, report 10 per
student per course per hour; upvotes need no limit beyond one per student per question (§7.7 "without
double-counting a student"); a placeholder text length; sign-in limits belong to ADR 0004.

```
Content:  visible --hide--> hidden ; visible|hidden --delete--> deleted (tombstone)
          ("unhide" and "restore" are not in the spec: PQ-26)
Report:   open --act--> actioned ; open --dismiss--> dismissed  (many reports roll up per item)
Question: unresolved <--> resolved   (§7.7 "resolve or reopen")
```

| Option | Description | Notes |
|---|---|---|
| **M1** | Manual per-course queue for staff with moderation permission | Closest to the spec; no automated judgment (§3) |
| M2 | M1 + auto-hide after K distinct reports | Invented rule; brigading; distinct-reporter counting is a Q9 problem |
| M3 | M1 + pre-moderation of first posts | Not in the spec |
| Soft / hard delete | Tombstone (text purged later, Q17) vs row removal | Soft delete keeps "redirect old links" (§7.7) and audit working |

### 3.7 Q8 threat-model format, Q14 audit, Q17 retention, Q18 sharing window

| Q | Option | Description | Notes |
|---|---|---|---|
| Q8 | T1 | Markdown in the repo, `docs/threat-model/` (proposal) | Versioned and reviewed with the code (§14) |
| Q8 | T2 | Tool file in the repo (e.g. Threat Dragon JSON) | Harder to diff; tool status **Unverified** |
| Q8 | T3 | Outside the repo | Drifts from the code |
| Q8 | **T4** | T1 plus a plain-language in-app "limitations of anonymity" page | Supports §8 "explicit anonymity explanations"; owner-approved copy (to be written) |
| Q14 | L1 | Audit table: app role INSERT + SELECT only; trigger rejects UPDATE/DELETE | Not proof against the table owner or a superuser |
| Q14 | L2 | L1 + hash chain | Tamper-evident, not tamper-proof |
| Q14 | L3 | L2 + chain head exported to locked object storage | S3 Object Lock compliance mode resists root; R2 locks are removable with a config-edit token |
| Q14 | L4 | Managed logging service | Another place identity could leak; **Unverified** cost |
| Q17 | D1 | Keep everything | Against minimisation guidance |
| Q17 | D2 | Per-domain schedule tied to the course lifecycle (every trigger and period a placeholder) | Matches the §6.1 split; testable |
| Q17 | D3 | D2 with periods set by the institutional admin | Lets UW plug in its schedules |
| Q17 | D4 | Prototype wipe on a published date | Honest; notice is owner-approved copy (to be written) |
| Q17 | Shred | Crypto-shred at course seal (option R1 in [privacy-architecture.md](privacy-architecture.md)) | Effective only once backup copies of the wrapped key and KEK history expire |
| Q18 | W1 | Instructor opens and closes by hand | Easy to forget; early opening could pressure students |
| Q18 | **W2** | Dates fixed when the participation policy is published (§7.9, §7.11) | Visible from day one; one known close time for Q16 |
| Q18 | W3 | Derived from a provisioned course end date | Depends on Q5; LEARN end dates **Unverified** |
| Q18 | W4 | Institution-wide term windows | Ignores non-standard courses |
| Q18 | F1 / **F2** | Finality per export (F1) or export/apply only after close, all shares final together (F2) | Both fit §7.10 "until the instructor exports or applies" |

Q14 candidate events (drawn from the spec; the owner decides):

| ID | Event | Basis | Spec says audited? |
|---|---|---|---|
| E1 | Moderation: hide, delete, merge, recategorize, pin, resolve/reopen, select for presentation, answer | §7.7, §7.17 | **Yes** |
| E2 | Deanonymization request, approvals, execution | §6.4 | **Yes**, only if the capability exists |
| E3 | Card publish, supersede, archive, published-rule changes | §7.6 | No |
| E4 | Participation-threshold publication and changes | §7.9 | No |
| E5 | Grading-scheme publication | §7.11 | No |
| E6 | TA permission and role changes | §5 | No |
| E7 | Institutional configuration changes | §4, §7.15 | No |
| E8 | Share, revoke, export/apply | §7.10 | No, but finality must be recorded |
| E9 | Impersonation sessions | §5 | Yes, if Q7 allows any |
| E10 | Sign-in and authorization failures | OWASP only | No |

### 3.8 Q1, Q7, Q19, Q10–Q12

| Q | Option | Description | Notes |
|---|---|---|---|
| Q1 | A1 | Config file or seed data | Not "without code changes" (§4) |
| Q1 | **A2** | Minimal admin settings page for one institution (§4 items); LMS config empty until Q5 | Needs an admin role and its authorization tests |
| Q1 | A3 | A2 + user and role management | Overlaps Q5; "make instructor" could be abused (PQ-46) |
| Q1 | A4 | Full multi-institution admin | Beyond a prototype |
| Q7 | **I0** | No impersonation | Lowest risk |
| Q7 | I1 | Synthetic "view as role" preview | Low risk; cards already have "preview the student view" (§7.6) |
| Q7 | I2 / I3 | Read-only or full impersonation of a real user | A student's private views are a deanonymization path |
| Q19 | L0 | English, strings inline | Retrofitting is "much more difficult" (W3C) |
| Q19 | **L1** | English, strings in one catalogue, `lang` set, locale-aware formatting | Verbatim spec strings in one reviewable place |
| Q19 | L2 / L3 | Per-institution overrides / `lang` per instructor card field | L3 supports WCAG 3.1.2 |
| Q19 | L4 | Bilingual from day one | No requirement; translations need approval (PQ-57) |
| Q10 | **Defer**; manual editor only | §7.6 offers "two paths" and "skip the wizard" | The owner authors the rule table later; a recommendation-free wizard is PQ-58 |
| Q11 | **Defer** ranked mode | Pass/fail is a complete §7.11 mode | Ranked without defaults would be incomplete |
| Q12 | **Defer** the file; define "apply" first | An in-app "apply" gives §7.10 its finality event (PQ-37) | Generic CSV with only §7.10's fields, or LEARN's format (**Unverified**) |

## 4. Evidence

All facts checked 2026-10-11; URLs are in section 10. The fact-check passes refuted none of the
underlying claims but added several corrections, which are applied here.

**Email (Q6) and the receiving side.** Provider facts are in section 3.1. Corrections and extra
facts from the fact-check:

- SES: accounts with no metered SES activity since 1 June 2025 **start on the Essentials plan from
  21 July 2026**; cancelling a defaulted plan returns to à la carte at once. SES uses
  **opportunistic TLS by default** (it can require TLS). Sandbox: verified recipients only, 200 per
  24 hours, 1 per second; production requests get "an initial response ... within 24 hours".
  Initial production quota and outbound body retention: **Unverified**.
- AWS: credits are $100 at sign-up plus up to $100 earned. **A Free-plan account closes after
  6 months** or when credits run out, unless upgraded, and offers only "select AWS services".
  Whether SES production access works on it is **Unverified**.
- Cloudflare's Email preview also stores **attachments**.
- UW gives Microsoft 365 mailboxes to employees, students, alumni and retirees; whether UW licenses
  Defender for Office 365 (Safe Links) is **Unverified**. Microsoft 365 uses implicit
  authentication; "Delivery to Microsoft isn't guaranteed". Outlook.com enforces SPF/DKIM/DMARC
  above 5,000 per day (since 5 May 2025); tenant coverage is not stated. Exchange message trace and
  Safe Links records are in section 7.1.
- Gmail (only if users forward mail): bulk senders need SPF, DKIM and DMARC (`p=none` allowed);
  one-click unsubscribe excludes transactional messages; DKIM keys at least 1024 bits.

**Standards and law.** DMARC is now RFC 9989 (May 2026). RFC 8058 one-click unsubscribe uses POST
and needs DKIM over both headers; scanner safety holds only if our GET handler changes nothing.
CASL s. 6(6)(d) removes only the consent requirement for factual account messages; the s. 6(2) form
rules still apply, and s. 11(1) gives 10 business days to honour an unsubscribe. Reading ClearCourse
notifications as non-commercial is an interpretation, not legal advice (PQ-42).

**Accessibility (Q15).**

- Ontario's WCAG 2.0 AA rule (minus 1.2.4, 1.2.5) covers **public websites** of designated public
  sector organizations and 50+ employee organizations; intranets and extranets are excluded (except
  the Government of Ontario); the duty falls on the organization that **controls** the site.
  Colleges and universities are designated. O. Reg. 191/11's own text did not render (**Unverified**).
- UW Policy 58 s. 7: WCAG 2.0 AA "for all Public Websites"; Appendix A extends this to "any newly
  developed website that is accessible to all University students"; educational material may be
  provided in accessible formats on request instead. UW's accessibility pages name no WCAG version.
- Interpretation, not legal advice: an individual's sign-in-gated prototype may not be bound; if UW
  controls or contracts it later, the duty may attach (PQ-60). 2.2 AA meets every floor found.
- WCAG 2.2 became a Recommendation on **5 October 2023** (current version 12 December 2024); 4.1.1
  is removed, but 2.0/2.1-based policies "may need to continue to test and report 4.1.1".
- SC 3.3.8: the 6-digit sign-in code field must accept pasting the whole code and allow autofill; a
  split six-box input that takes one digit on paste is failure F109.
- axe-core 4.14.0 (MPL-2.0) has `wcag22aa` but no `wcag22a`, and tags are not cumulative: use
  `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`.

**Small cells (Q16).** None binds ClearCourse. The **Ontario IPC** guideline is the closest fit
(written for FIPPA institutions; UW is one): risk thresholds 0.1 / 0.075 / 0.05 with cell-size
equivalents **10 / 15 / 20 "for illustrative purposes only"**, and the "cell size of five" called
loosely defined. **TBS** PIN 2020-03 (federal institutions only): 10 "often cited", 20 for sensitive
data, never below 3. **PTAC** (US/FERPA, Oct 2012, updated May 2013): 3 the absolute minimum;
subtraction defeats simple suppression; teachers "presumed to have inside knowledge". **UW course
surveys** are not released for classes of 5 or fewer students (a class-size rule).

**Security and logging (Q8, Q14, Q20).** OWASP API4:2023 asks for per-user, per-operation limits
"fine tuned based on the business needs" and gives no numbers. The OWASP Logging Cheat Sheet asks
for tamper detection and says logs "must not be kept beyond" their retention period. In PostgreSQL
an owner's right to modify "cannot be granted or revoked" and is inherited by members of the owner
role, so app roles must not be members of it. S3 Object Lock compliance mode can be escaped only by
deleting the AWS account. The OWASP Threat Modeling Cheat Sheet gives the four questions, DFDs,
STRIDE and LINDDUN; LINDDUN's materials licence is **Unverified**, so reference it, don't copy it.

**UW privacy and records (Q17, PQ-02).** UW works under FIPPA and Policy 46. Its educational-
technology guideline tells instructors to check whether an Information Risk Assessment is needed
first, prefer tools that don't identify students, notify students, and "Allow students to opt out;
offer other ways to participate". Its record-keeping page says to dispose of short-term records,
except those tied to a FIPPA request or legal action (so deletion may need a legal-hold override;
interpretation, PQ-53). FIPPA Regulation 460 did not render (**Unverified**).

**Languages and export (Q19, Q12).** W3C: retrofitting internationalization is "much more difficult
and time-consuming". WCAG 2.2 SC 3.1.2 Language of Parts is AA. A French-language duty for a student
tool is **Unverified**. The LEARN grade CSV format is **Unverified**; LEARN help now redirects to
IST's Confluence knowledge base.

## 5. Comparison

### 5.1 Email cost

Section 3.1 compares the providers. Only SES combines no daily cap after production access, a
Canadian region and no documented body store, at the lowest price; its cost is the most setup.

Illustrative cost (USD/month; volumes are not requirements):

| Provider | 1,000/month | 5,000/month, peak 300/day | 20,000/month |
|---|---|---|---|
| SES à la carte (Essentials) | $0.10 ($0.16) | $0.50 ($0.80) | $2.00 ($3.20) |
| Resend | $0 | $20 (Free fails both caps) | $20 |
| Cloudflare, Workers Paid already used | $0 marginal | ≈ $0.70 | ≈ $5.95 |
| Mailgun / Postmark | $0 / $15 | $15 / $15 | ≈ $33 each (overage tiers **Unverified**) |

The domain cost is in [stack-and-hosting.md](stack-and-hosting.md), whose prototype estimate uses
about USD 0.20/month for SES.

### 5.2 Cost of deciding now versus later

| Q | Cheap now | Expensive later if skipped |
|---|---|---|
| Q15 | Pick 2.2 AA; axe in CI | Retrofitting focus, target size and authentication patterns on every page |
| Q19 | One string catalogue | Touching every component; verbatim texts scattered |
| Q16 rule shape | A line in ADR 0003 | Share times or survey order stored, then needing to be hidden |
| Q8 | Markdown in the repo | §6.3 blocks all content code until it exists |
| Q1 | An `institution` table with one row | A schema change for the second institution (§4) |
| Q10–Q12 | Defer | Nothing: manual editor, pass/fail and in-app "apply" are complete paths |

## 6. Recommendation (proposal) with trade-offs

Every item here is a **Proposal** that needs the owner's approval.

### 6.1 Q6: email provider

**Amazon SES in `ca-central-1`**, transactional type, behind a provider-neutral mailer port in the
identity domain (templates rendered in our app; one adapter per provider).

- An AWS account on the **Paid account plan** (a Free-plan account closes after 6 months; credits
  still apply). Cancel the default Essentials plan to get à la carte pricing.
- Request **production access early** (M0), with a live site and privacy page.
- Tracking off: a configuration set with TLS "Require" and event destinations for Bounce,
  Complaint, Reject and DeliveryDelay only; `ses:no-track` on links; store only status, bounce type
  and time; never log full events or rendered bodies.
- DNS: a dedicated sending subdomain (interpretation), aligned SPF and DKIM, DMARC (RFC 9989)
  starting at `p=none` with reports, then tightened.
- **Resend Free** for development and demos under 100/day only; never for sign-in beyond that.
- Production: stay on SES and ask UW IST about a sanctioned sending path (PQ-42).

Trade-offs: SES is the cheapest option and the only one with a Canadian region, but has the most
setup. Because sign-in uses codes, an SES outage means nobody can sign in; a second provider would
add a processor (PQ-42). Cloudflare Email is reconsidered only if hosting moves to Workers Paid and
it leaves Beta.

**Spikes (M0, $0, outside the repo):** (1) send SES and Resend mail to a UW mailbox the owner
controls and record `compauth`, folder, delay and whether links are rewritten by Safe Links; (2)
open the SES account on the Paid plan, check the pricing plan, request production access and record
the quota; (3) inspect raw messages for pixels or rewritten links. Pass: inbox placement, delay well
under ADR 0004's code expiry, production access granted, no tracking.

### 6.2 Notification design and Q13

1. **In-app for all eight §7.13 types**, computed on read; no per-user notification row stores a
   question id ([privacy-architecture.md](privacy-architecture.md)); the "seen" marker is PQ-43.
2. **Course-wide broadcasts by email** (both card-changed types, survey available, sharing window
   open): per event is fine, because the recipients are the whole course.
3. **Activity-linked types by email only in a fixed-time daily digest** (CH2, or CH3 if the owner
   prefers; PQ-41). Never at action time. In-app only (CH4) needs PQ-38.
4. **Every email:** one constant subject, a content-free body, a generic `/notifications` link with
   no id or token, no name, title, text, id or level, a plain-text part. Wording is owner-approved
   copy (to be written; PQ-40). The sign-in code email carries no URL at all (interpretation: nothing
   for Safe Links to scan).
5. Nonessential emails get a preferences link and RFC 8058 one-click unsubscribe (token = user and
   category only). Whether CASL requires this on every message is in PQ-42.
6. **Outbox:** template keys `course_broadcast`, `activity_digest` (one key for all activity types)
   and `auth_code`; a digest slot time, never the action time; no body, subject or content id; rows
   **deleted after send**. Tests assert templates and the outbox hold no content, id or level.

**Q13: N3.** Card-change notices, "Sharing window open" and any future deanonymization notice are
essential **in-app**; every email type is user-manageable. Trade-off: a student who never signs in
may miss a rule change (N2 would close that, at the cost of mandatory email and the CASL question).
"Sharing window open" stays neutral in tone, since students alone decide whether to share (§7.10).

### 6.3 Q15: accessibility

**WCAG 2.2 AA** for all UI, recorded in ADR 0001 as meeting Ontario's floor and Policy 58. Keep
markup-validity checks for 4.1.1. AAA 2.4.13 and 1.4.6 are stretch goals for presentation mode.
axe via Playwright in CI with the full tag list, plus a manual keyboard, screen-reader, zoom and
forced-colours checklist per page; passing axe is never presented as conformance. No accessibility
overlays or third-party widgets (they would send page content and identity to a third party,
§6.2). Screen-reader users get the same anonymity explanation as sighted users (§8). Trade-off: a
little more work than 2.0 AA. PQ-51 (UW's own requirements) before a pilot.

### 6.4 Q16: aggregation rule

1. **Rule shape:** level counts released **once, after the sharing window closes and shares are
   final**, only if the residual check passes (at least N non-sharers, not all in one level), with
   complementary suppression; computed server-side.
2. **Survey (S2):** text in one batch after close, random order, no timestamps, only if responses ≥
   N; counts on the same timing.
3. **Placeholder N = 10** for both (the IPC illustrative low-risk equivalent; TBS's "often cited"
   figure). Refuse values below 3. UW's "5 or fewer students" practice is a lower precedent. **The
   number is the owner's.**
4. **Present both rule shapes** (section 3.5): this one and the privacy judge's snapshot rule used
   by the proposed ADR 0003. PQ-31 decides whether in-term counts are wanted; PQ-36 whether N is
   shared and has an institution floor.
5. With sharing, survey and level analytics in M2, ADR 0003 records only the shape now, so share
   records keep the date only (§7.10) and survey records keep no time or order.

Trade-off: the O2 shape gives no in-term level counts; the judge's shape keeps some but needs a
stricter suppression rule because pre-window snapshots can be differenced later.

### 6.5 Q20: rate limits and moderation

**R3**, with write limits keyed by `HMAC(K_rl, user‖action)` (key handling per ADR 0003) and per-IP
limits on unauthenticated endpoints. **Placeholder values only** (section 3.6), in admin-visible
configuration. The limiter store holds no content id, text or post times beyond its window, and its
errors never log bodies. **M1 manual queue**, soft delete, reports stored **without reporter
identity** (one report per student per item uses the same mechanism as upvotes); the queue shows
count and reason category only. No auto-hide, pre-moderation, unhide or restore until the owner
decides (PQ-26). Trade-off: slower against spam, but no automated judgment (§3); repeat abusers can
be slowed, not identified (PQ-23).

### 6.6 Q8, Q14, Q17

- **Q8 (T1 + T4):** `docs/threat-model/README.md` (path is a proposal) with the OWASP four questions,
  a DFD of the five §6.1 domains and trust boundaries, STRIDE per component, LINDDUN for privacy, and
  the limitations-of-anonymity list from [privacy-architecture.md](privacy-architecture.md). Updated
  in the same PR as any §6 change; no real identities or content samples. Written in M0, **before any
  content or participation code** (§6.3). The in-app page (PQ-52) uses owner-approved copy (to be written). This file
  adds: email side channels (section 7.1), share differencing and survey timing, writing style,
  reporter identity, request-log timing, and the database owner's residual power.
- **Q14:** audit **E1 and E2** (spec-required) and **E3–E8** as proposals; E9 only if Q7 allows it;
  E10 only with short retention. Entries hold opaque ids and actions, never text or authors. Shares
  (E8) go in a separate stream from moderation (E1). Storage **L1 + L2** now; **L3** before any
  deanonymization capability, because §6.4 says "immutable". Retention is a placeholder (Q17, PQ-53).
- **Q17:** prototype **D4** notice (owner-approved copy, to be written) plus **D2** hooks (lifecycle
  timestamps per domain, tested deletion jobs); **D3** with UW's privacy office before any UW pilot;
  crypto-shred at seal as an option. Deleting "my posts" on account removal needs a person-to-content
  path that §6.2 forbids ordinary queries to have, so the owner answers it together with ADR 0003
  (PQ-54). Provider logs and backups are listed as places where deleted data lingers.

### 6.7 Q18, Q1, Q7, Q19, Q10–Q12

| Q | Proposal | Trade-off | Owner input |
|---|---|---|---|
| Q18 | **W2 + F2**: survey-open, sharing-open and sharing-close dates set when the participation policy is published and shown from the start; export/apply only after close, when shares become final; share records hold the date only | Moving dates needs a rule; export waits for close | PQ-32, PQ-34, PQ-37 |
| Q1 | **A2** and an `institution` table with the §4 configurables from day one; no admin page lists users and content together | Admin role and its negative tests needed in M1a (PQ-65) | PQ-55; PQ-46 |
| Q7 | **I0**; optional I1 synthetic preview for demos; I2/I3 only under §6.4-style safeguards if a real need appears | Support works through the admin page; the operator keeps DB access (threat model) | PQ-56 |
| Q19 | **L1** now; L3 for instructor card fields; no language tag on anonymous student content (it could identify a lone francophone author) | One indirection per string | PQ-57 |
| Q10 | Wizard to M2; manual editor with preview in M1 | No guided path in M1 | Rule table and resources; PQ-58 |
| Q11 | Ranked grading to M2 | Grading waits | Ranked defaults |
| Q12 | Export format to M2; define "apply" first | No LEARN file in M1 | PQ-37; LEARN format or a generic CSV with only §7.10's fields |

### 6.8 Q2: candidate milestone-1 feature set (M1a and M1b)

The owner's stated goal for the first build is a public prototype that people can sign in to and
use, polished and credible (§8), without painting the production system (§10–§11) or the privacy
architecture (§6) into a corner. The **feature list** is still open (Q2). Below is a candidate for
the owner to accept, trim or extend. Rules applied: §13 (nothing that depends on an open question
is built until it is answered) and §6.3 (ADR and threat model before any content or participation
code).

**Proposal: split milestone 1 in two** (acceptability is PQ-08):

- **M1a, cards without anonymous content:** a usable, polished product while ADR 0003 is reviewed.
  Gate: M0 done; Q15, Q1 scope, PQ-01, PQ-02 (if real users) and PQ-46 answered.
- **M1b, the anonymous board, built privacy-first.** Gate: ADR 0003 **accepted** and threat model v1
  approved (§6.3); PQ-19 to PQ-24, PQ-30 and PQ-33 answered. Merge goes in M1b if feasible (PQ-08).

| # | Feature | § reference | Must be answered first | Proposal |
|---|---|---|---|---|
| 1 | Sign-in for real users | §10 item 1, §11 | Q3, Q4, **Q6** (code emails), Q15 (SC 3.3.8); PQ-42, PQ-44, PQ-45, PQ-47, PQ-48 | **M1a** |
| 2 | Courses, enrolment, roles incl. TA permission assignment | §5, §10 item 2 | Q5, Q1 (if admins create courses); PQ-29, PQ-46, PQ-67 | **M1a** |
| 3 | Institution configuration (names, policy links, policy warning, branding) | §4, §7.15 | Q1, Q14 (E7); PQ-61 | **M1a** (A2) |
| 4 | Course AI Card: manual editor, preview, draft/publish, version history, verbatim default principle | §7.1, §7.3, §7.6 (manual path), §10 item 3 | Q15, Q19 (L1), Q14 (E3); PQ-63 | **M1a** |
| 5 | Assignment AI Cards: visible overrides, LEARN submission link, draft/published/archived/superseded | §7.4, §10 item 4 | As 4; PQ-62 | **M1a** |
| 6 | Change records on published rule changes (what, why, effective date, applies to work underway) | §7.6 | Q14; PQ-39. The notice part needs Q13 | **M1a** (record); notice in M1b |
| 7 | Transparency-bonus fields (requirements and links only, no uploads) | §7.4, §7.5, §3 | None beyond 5 | **M1a** |
| 8 | Card-builder wizard with fixed-rule recommendations | §7.6 | **Q10**; PQ-58 | M2 |
| 9 | Anonymous board: ask, comment, upvote, "Still unclear", follow, two tags only, filters | §7.2, §7.7, §10 items 5–6 | **Q9, Q8** (§6.3), Q20, Q15; PQ-19 to PQ-24, PQ-28 | **M1b** |
| 10 | Moderation: answer, pin, recategorize, hide, delete, resolve/reopen, reports and queue, rate limits | §7.7, §10 item 7 | **Q9, Q20**, Q14 (E1), Q17 (tombstones); PQ-26, PQ-27 | **M1b** (M1 queue, placeholder limits) |
| 11 | Merge duplicates with correct counts | §7.7, §10 item 8 | **Q9**, Q20; PQ-25, PQ-08 | M1b if feasible, else M2 |
| 12 | Presentation mode | §7.8, §10 item 9 | Features 9–10; PQ-17, PQ-35 | **M1b** |
| 13 | Search and filtering within a course | §7.14 | Features 9–10 | **M1b** |
| 14 | Private participation counter and three levels (student's own view) | §7.9, §7.10 first bullet, §10 items 10–11 | **Q9**; PQ-30, PQ-33 | **M1b** |
| 15 | In-app notifications | §7.13 | **Q13**; PQ-21, PQ-39, PQ-43 | **M1b** |
| 16 | Email notifications (digests and broadcasts) | §7.13 | Q6, Q13; PQ-38, PQ-40, PQ-41 | M2 |
| 17 | Student-controlled sharing, revocation, finality | §7.10, §10 items 12–13 | **Q18**, Q16; PQ-34, PQ-37 | M2 (domain-4 tables stubbed) |
| 18 | Grading settings (pass/fail, ranked) | §7.11 | Q11, Q12 | M2 |
| 19 | End-of-course survey | §7.12, §10 item 14 | **Q16, Q18**, Q9; PQ-32 | M2 (domain-5 separation stubbed) |
| 20 | Analytics: content totals (questions, comments, upvotes, unanswered, Course vs assignment, % resolved) | §7.16 | Snapshot-versus-live rule (section 3.5); PQ-35 | Owner choice: M1b or M2 |
| 21 | Analytics: students per level; survey aggregates | §7.16 | **Q16**, Q18; PQ-31, PQ-36 | M2 |
| 22 | Audit logging for shipped features | §7.17, §11 | **Q14** | **M1a and M1b** (L1 + L2) |
| 23 | Threat model and limitations of anonymity | §6.2, §11 | **Q8**; PQ-52 | **M0** (precondition for 9 and 14) |
| 24 | Automated tests incl. negative privacy tests | §9, §11, §15 | Q3; PQ-65, PQ-66 | Every milestone |
| 25 | Deployment documentation | §11 | Q3 | **M1a** |
| 26 | Prototype data notice and lifecycle hooks | §13 (Q17) | Q17; PQ-01 | **M1a** (D4 + D2 hooks) |
| 27 | Deanonymization process | §6.4 | Institutional policy | Never by default; not in M1 |
| 28 | Impersonation | §3, §5 | Q7 | Not in M1 (I0) |

Why the split: M1b contains anonymous content and private counters, which makes Q8 and Q9 hard
prerequisites (§6.3). M1a gives the owner a working, public product meanwhile. Leaving sharing,
the survey and level analytics for M2 keeps the Q16 differencing problem out of milestone 1,
because instructors then see no per-level data at all. Real students in a public prototype bring
in UW's guidance (Information Risk Assessment, notice, opt-out), which is why PQ-01 and PQ-02 gate
M1a.

## 7. Privacy implications (§6)

### 7.1 Email side channels

§6.2 forbids identity and content text together in *our* logs, views, exports and dashboards. An
email also creates records in other people's systems; the only controls are what it says and when
it is sent (interpretation). So:

| Party | Sees | Retention | Our control |
|---|---|---|---|
| Provider | Recipient, subject, send time; often the body | Resend 30 d; Postmark 45 d; Cloudflare ~7 d; Mailgun Free 1 d; SES body storage **Unverified** | Provider choice; content-free bodies |
| UW Exchange admins | Sender, recipient, first 256 subject characters, date | Up to 90 days | Constant subject |
| UW security admins (if Defender is licensed, **Unverified**) | UPN, full clicked URL, time, IP | Not stated | Generic URLs |
| Mailbox and forwarding targets | Full message | Mailbox lifetime | Content-free bodies |

Broadcast types (both card-changed notices, survey available, sharing window open) reveal only
enrolment. Activity-linked types reveal links: "Answer posted" and "Followed question updated" tie a
recipient to the question updated at time T; "Question merged" to the merged question; and
"Participation level reached", sent at once, ties the student to the post that crossed the threshold
and can leak the private level (§6.1 domain 2).

**Timing example (interpretation).** A comment is posted at 14:03:12; the counter crosses a
threshold; an email leaves at 14:03:15. The provider and UW message trace hold (recipient, 14:03:15,
subject), and the board shows a comment from about 14:03. Anyone seeing both can link the student
to the comment, **even if the email is content-free**. Fixed-time digests remove this.

**Residual limitations for the threat model:** providers and UW mail admins learn who uses
ClearCourse (and the course, if emails name it; PQ-40) and when each person got a digest or code;
personal digests leak day-level "had an update" signals that can narrow authorship in small classes
(PQ-41); code emails reveal sign-in times that correlate with post times unless times are coarsened
(PQ-24); a provider dashboard that stores bodies would expose live codes; a compelled disclosure
yields all of this.

### 7.2 Aggregates, sharing, survey

- Differencing turns level counts plus named shares into a named non-sharer's level, a §6.2 mapping.
  Proposed §9 negative test: with one non-sharer, no instructor-visible endpoint returns level counts
  that differ from the shared list.
- Suppression runs server-side; hiding raw counts in the browser is not separation (`[src p.3]`).
- Survey records store no time or order; one-response enforcement is a Q9 matter
  ([privacy-architecture.md](privacy-architecture.md) proposes a completion flag in a separate store).
- One known close time (W2 + F2) lets the check and the release run once; rolling finality (F1)
  creates a series of exports to subtract.

### 7.3 Moderation, audit, admin, impersonation, languages

- A reporter id beside a content id links a student to content, so reports carry none. The queue,
  log and notes never show the author (§7.7); the moderator's identity is PQ-27.
- Host request logs plus precise `created_at` values can link posts to people: coarse times (PQ-24),
  short-lived logs without bodies (PQ-11).
- Audit entries hold opaque ids and actions; shares sit in a separate stream.
- The admin dashboard is one of §6.2's listed places: users and content are never listed together.
  An admin who can grant roles could enrol as an instructor; the threat model records what they
  still can't see.
- Impersonating a student is a deanonymization path, so I2/I3 fall under §6.4's "Default: nobody can
  deanonymize".
- A language tag on anonymous content could identify an author; don't store it (interpretation, by
  analogy with §7.12 "No unnecessary metadata is collected").

## 8. Risks

| Risk | Impact | Mitigation (proposal) |
|---|---|---|
| SES production access refused or slow | Codes reach only verified addresses | Request in M0; Resend Free for demos under 100/day; ADR 0004's Microsoft path if allowed (PQ-44) |
| AWS Free-plan account closes after 6 months | Sign-in email stops | Paid account plan from the start |
| Mail junked or delayed at UW past code expiry | Users can't sign in | Aligned SPF/DKIM, DMARC, URL-free code emails; measure in the M0 spike; ask UW IST (PQ-42) |
| A template change leaks content into email | Identity plus content in third-party logs | One generic template; negative template tests; a provider with no documented body store |
| Digest recipient sets narrow authorship in small classes | Partial deanonymization by provider or UW admins | Course digest or small-class hold (PQ-41); threat model |
| Level counts differenced against shares | A named non-sharer's level revealed | Rule shape in section 6.4; PQ-31; negative test |
| Placeholder rate limits wrong for real classes | Honest students blocked, or floods let through | Admin-visible configuration; owner-approved values |
| Spam or abuse with no identity to sanction | Moderator workload | Limits and manual queue; PQ-23 |
| Audit table altered by the database owner | Audit integrity | L2 detects it; L3 before any deanonymization capability |
| WCAG 2.2 AA effort underestimated | M1 slips | axe in CI from M0; manual checklist per page |
| Real UW students before a privacy review | Breach of UW guidance | PQ-01 and PQ-02 gate M1a; prototype notice (D4) |
| ADR 0003 not accepted in time | No board in M1 | The M1a/M1b split keeps a product shipping (PQ-08) |
| Gaps filled by assumption (admin scope, wizard rules, copy) | Invented scope | Every gap is a Q or PQ; copy is "owner-approved copy (to be written)" |

## 9. Open questions

Nothing here is answered. Existing §13 questions this file informs: **Q1, Q2, Q6, Q7, Q8, Q10,
Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20**; dependencies on Q3, Q4, Q5 and Q9.

Proposed new questions (PQ-nn IDs; raw-note IDs in brackets for traceability):

| ID | Question (short form) | When |
|---|---|---|
| PQ-01 | Real UW courses and students in the prototype, or demo courses and invited testers only? [NQ-2a] | M1a |
| PQ-02 | UW privacy review (IRA), DPA or other approval before real UW users? Who is the sponsor? (UW's guideline also asks for an opt-out.) [NQ-17b] | M1a (if real) |
| PQ-04 | "<$5/month" in USD or CAD; hard stop or automatic billing at a limit? | ADR 0002 |
| PQ-08 | Is the M1a/M1b split acceptable; must merge be in milestone 1? [NQ-2b, NQ-2c] | M1a |
| PQ-09 | Must data, including email metadata, stay in Canada? [NQ-O7] | ADR 0002, Prod |
| PQ-11 | Are IP addresses and request metadata identity-bearing; what log retention? | ADR 0003 |
| PQ-19 | Does hiding or deleting content remove its credit? [NQ-20c] | ADR 0003 |
| PQ-21 | Who receives "Answer posted" and "Question merged"; does asking auto-follow? | ADR 0003 |
| PQ-22 | May students see, edit or delete their own anonymous posts? [NQ-20d] | ADR 0003 |
| PQ-23 | Repeat abusers: moderation and limits only, or a "sanction without reveal" handle? | ADR 0003 |
| PQ-24 | Precision of stored and shown post times? | ADR 0003 |
| PQ-25 | On merge: answers, "Still unclear" marks, open reports? [NQ-20b] | M1b |
| PQ-26 | Can hidden content be un-hidden and deleted content restored, by whom? [NQ-20a] | M1b |
| PQ-27 | Is staff identity in the moderation log identity-bearing? [NQ-20e] | M1b |
| PQ-31 | Are in-term level counts wanted; cadence; which differencing rule? [NQ-16c] | M2 (shape: ADR 0003) |
| PQ-32 | Survey results only after close; duplicate prevention; survey required before sharing? [NQ-18b] | M2 |
| PQ-34 | Shared level frozen or live; sharing before course end; may dates move? [NQ-18a, NQ-18c] | M2 |
| PQ-35 | Presentation mode and analytics: snapshots or live totals? | M1b |
| PQ-36 | Same N for counts and survey; may instructors lower it; institution floor? [NQ-16a, NQ-16b] | M2 |
| PQ-37 | Does "applies the result" (§7.10) mean in-app, a LEARN push, or both? [NQ-12a] | M2 |
| PQ-38 | Email for all eight §7.13 types, or in-app/digest only for activity types; defaults; essential per channel? [NQ-O1, NQ-O2, NQ-O4, NQ-13b] | M2 (in-app: M1b) |
| PQ-39 | What counts as "followed question updated"; which card edits notify; who is "affected"? [NQ-O3, NQ-O5] | M1a |
| PQ-40 | One generic template; may emails name the institution or course; level in the email? [NQ-O6, NQ-13a] | M2 |
| PQ-41 | Personal or course digest; cadence and send time; hold until k recipients? [NQ-O11, NQ-O12] | M2 |
| PQ-42 | AWS Paid account acceptable; UW sending path; CASL; provider retention; fallback provider? [NQ-O8, NQ-O9, NQ-O10, NQ-O13] | M1a |
| PQ-43 | "Seen" marker server-side (day precision, keyed HMAC) or client-only? | M1b |
| PQ-46 | Who may become an Instructor or admin in the prototype, and how is it verified? | M1a |
| PQ-51 | Does UW need a newer WCAG version, a VPAT/ACR or a review beyond Policy 58? [NQ-15a] | Pilot |
| PQ-52 | Must the limitations of anonymity be visible in the app? [NQ-8a] | M0 |
| PQ-53 | Does a UW retention schedule apply to a teaching tool's audit logs? [NQ-14a] | Pilot |
| PQ-54 | On account removal, does anonymous content stay, go, or does the student choose? [NQ-17a] | M1b |
| PQ-55 | Can the spec's missing Administration text be recovered, or will the owner write it? [NQ-1a] | M1a |
| PQ-56 | Is a synthetic whole-course "view as student" preview wanted? [NQ-7a] | M1a |
| PQ-57 | Who translates and approves verbatim spec texts for a second language? [NQ-19a] | Later |
| PQ-58 | May the wizard ship without recommendations before Q10's rule table? [NQ-10a] | M2 |
| PQ-60 | Is UW a designated public sector organization under O. Reg. 191/11, and do the IASR educational-institution duties apply? (Universities are listed as designated; open: whether duties attach to a tool UW doesn't control, and whether a signed-in app is a public website.) | Pilot |
| PQ-65 | Must negative tests also cover institutional admins and the operator? | M0 |

Also cited in section 6.8 for features outside this file's scope: PQ-17, PQ-28 to PQ-30, PQ-33,
PQ-44, PQ-45, PQ-47, PQ-48, PQ-61 to PQ-63, PQ-66, PQ-67.

## 10. Sources and verification log

All pages were read on 2026-10-11. "Fact-checked" means a second, independent pass that day
confirmed the claim on the page.

| Claim | URL | Checked | Status |
|---|---|---|---|
| SES prices, Essentials default from 2026-07-21, cancel to à la carte | https://aws.amazon.com/ses/pricing/ ; https://docs.aws.amazon.com/ses/latest/dg/pricing-plans.html | 2026-10-11 | Fact-checked |
| AWS Free account plan closes after 6 months; credits | https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html | 2026-10-11 | Fact-checked |
| SES sandbox, production request, Regions, tracking | https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html ; https://docs.aws.amazon.com/general/latest/gr/ses.html ; https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html | 2026-10-11 | Fact-checked |
| SES initial production quota; production access on the Free plan | https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html | 2026-10-11 | **Unverified** |
| SES TLS default and event payloads; body retention | https://docs.aws.amazon.com/ses/latest/dg/data-protection.html ; https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html | 2026-10-11 | Verified; body retention **Unverified** |
| Resend limits, US storage, content-storage add-on, tracking | https://resend.com/pricing ; https://resend.com/docs/dashboard/domains/regions.md ; https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend.md | 2026-10-11 | Fact-checked; "bodies kept by default" is an inference |
| Cloudflare Email Beta, pricing, preview retention, Workers Paid minimum | https://developers.cloudflare.com/email-service/platform/pricing/ ; https://developers.cloudflare.com/email-service/observability/logs/index.md ; https://developers.cloudflare.com/workers/platform/pricing/ | 2026-10-11 | Fact-checked; location and DPA **Unverified** |
| Postmark, Mailgun, SendGrid, MailerSend tiers and retention | https://postmarkapp.com/pricing ; https://postmarkapp.com/eu-privacy ; https://www.mailgun.com/pricing/ ; https://www.twilio.com/en-us/products/email-api/pricing ; https://www.mailersend.com/pricing | 2026-10-11 | Fact-checked |
| Brevo terms | https://www.brevo.com/pricing/ | 2026-10-11 | **Unverified** |
| UW Microsoft 365 mailboxes; Defender licensing | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email | 2026-10-11 | Fact-checked; licensing **Unverified** |
| Microsoft 365 inbound authentication; Outlook.com enforcement | https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about ; https://substrate.office.com/ip-domain-management-snds/postmaster | 2026-10-11 | Verified; tenant coverage **Unverified** |
| Message trace; Safe Links; `UrlClickEvents` | https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac ; https://learn.microsoft.com/en-us/defender-office-365/safe-links-about ; https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-urlclickevents-table | 2026-10-11 | Fact-checked |
| Gmail sender rules | https://support.google.com/a/answer/81126 ; https://support.google.com/a/answer/14229414 | 2026-10-11 | Fact-checked |
| DMARC RFC 9989; RFC 8058 | https://datatracker.ietf.org/doc/draft-ietf-dmarc-dmarcbis/ ; https://www.rfc-editor.org/info/rfc8058 | 2026-10-11 | Fact-checked |
| CASL sections | https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html | 2026-10-11 | Fact-checked; reading is interpretation |
| AODA rule, scope, designated organizations | https://www.ontario.ca/page/how-make-websites-accessible ; https://www.ontario.ca/page/accessibility-rules-public-sector-organizations | 2026-10-11 | Fact-checked |
| O. Reg. 191/11 s. 14; FIPPA Reg. 460 | https://www.ontario.ca/laws/regulation/110191 ; https://www.ontario.ca/laws/regulation/900460 | 2026-10-11 | **Unverified** (did not render) |
| UW Policy 58; UW accessibility pages | https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policies/policy-58-accessibility ; https://uwaterloo.ca/digital-accessibility/ | 2026-10-11 | Fact-checked |
| WCAG 2.2 status, criteria, 3.3.8, 3.1.2 | https://www.w3.org/WAI/standards-guidelines/wcag/ ; https://www.w3.org/TR/WCAG22/ ; https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html ; https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html | 2026-10-11 | Fact-checked |
| axe-core tags, version and licence | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md ; https://registry.npmjs.org/axe-core/latest | 2026-10-11 | Fact-checked |
| IPC, TBS, PTAC small-cell guidance | https://www.ipc.on.ca/sites/default/files/legacy/2016/08/Deidentification-Guidelines-for-Structured-Data.pdf ; https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information-privacy-notices/2020-03-protecting-privacy-releasing-information-about-small-number-individuals.html ; https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf | 2026-10-11 | Fact-checked |
| UW course-survey small-class rule | https://uwaterloo.ca/teaching-assessment-processes/resources-instructors | 2026-10-11 | Fact-checked |
| OWASP API4:2023, Logging and Threat Modeling cheat sheets | https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption ; https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html | 2026-10-11 | Fact-checked |
| LINDDUN; materials licence | https://linddun.org/ | 2026-10-11 | Fact-checked; licence **Unverified** |
| PostgreSQL owner rights; S3 Object Lock; R2 bucket locks | https://www.postgresql.org/docs/current/ddl-priv.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html ; https://developers.cloudflare.com/r2/buckets/bucket-locks/ | 2026-10-11 | Fact-checked |
| UW privacy, educational-technology guideline, record keeping | https://uwaterloo.ca/privacy/ ; https://uwaterloo.ca/privacy/guidelines/online-educational-technologies ; https://uwaterloo.ca/privacy/policies-guidelines/record-keeping | 2026-10-11 | Fact-checked |
| W3C on internationalization | https://www.w3.org/International/questions/qa-i18n | 2026-10-11 | Fact-checked |
| LEARN grade CSV format | https://uwaterloo.ca/learn-help/instructors/grades | 2026-10-11 | Redirect fact-checked; format **Unverified** |
| French-language duty; UW campus NAT | (not researched) | — | **Unverified** |

Raw notes summarised here (outside the repo): the O1 email and notifications note, the O2 blocking
questions note, and two fact-check passes.
