# Design system and accessibility (§8, Q15)

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: **Q15** (primary) and the §8 design requirements; also Q1, Q2, Q3, Q4, Q8, Q9, Q10, Q13,
> Q14, Q16, Q19; PQ-07, PQ-17, PQ-22, PQ-24, PQ-35, PQ-51, PQ-52, PQ-59 to PQ-64.
> Related: [ADR 0001](../decisions/0001-application-stack.md) (the UI layer is part of the
> application stack), [privacy architecture](privacy-architecture.md),
> [prototype sign-in](prototype-auth-and-provisioning.md).

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

§8 asks for a "very minimal, simple, calm and credible academic design" inspired by the LEARN /
Brightspace / UW flow, and says "Accessibility is required"; the target is Q15. §15 item 5 puts §8
in the definition of done for every change, so Q15 in practice blocks sign-off on all UI work
(interpretation). Everything below is a **Proposal**; no open question is closed.

- **Foundation:** shadcn/ui copy-in source + Tailwind CSS v4 on **React Aria Components**, with
  **Base UI** as the fallback primitive base, chosen after a short spike. shadcn's `style` can't
  change after init; changing the primitive base later is costly; a migration path is documented
  only from Radix to Base UI, none to or from React Aria; new projects default to Base UI, so React
  Aria needs `--base aria`. The spike result is a plan decision, recorded in
  [ADR 0001](../decisions/0001-application-stack.md).
- **Look:** heavily customised: our own three-layer tokens, calm neutral palette, small radii,
  serif + sans type, LMS-like density. No gradients, sparkle icons or robots (§8, §3).
- **Branding:** a few admin-set brand tokens (§4), each passed through a server-side WCAG contrast
  guardrail. UW gold is the test case: UW lists black as its only accessible pairing.
- **Assets:** open-licence, self-hosted fonts. **No UW or D2L logos, fonts or BrightspaceUI
  components.** GOV.UK and USWDS are pattern and content sources only.
- **Q15:** **WCAG 2.2 AA**, with AAA 2.4.13 and 1.4.6 as stretch goals for presentation mode.
- **Process:** axe through Playwright in CI on every screen and state, plus a manual keyboard,
  NVDA, VoiceOver, zoom, reflow and forced-colours checklist. **Passing axe is never presented as
  conformance.**

## 2. Questions covered and what they block

**Primary: Q15** "Accessibility conformance target (e.g. WCAG 2.2 AA)", which blocks §8 (§13).

| Requirement (CONTRIBUTING) | § | What the design system needs |
|---|---|---|
| Calm, credible academic design; LEARN / Brightspace / UW flow as inspiration | §8 | Visual language and IA |
| Compact cards, plain language, strong hierarchy, university-appropriate typography | §8 | Card, type scale, content style |
| Neutral colours with configurable branding; institution-specific items configurable "without code changes" | §8, §4 | Runtime theming from admin data |
| Progressive disclosure, clear status labels, explicit anonymity explanations, non-gamified levels | §8 | Disclosure, tag and notice components |
| States draft, published, archived, superseded | §7.4 | Status labels not reliant on colour |
| Assignment overrides of the Course AI Card "must be shown visibly" | §7.4, §10 | Override comparison |
| Presentation mode Display / Exclude table | §7.8 | Projector view with only permitted fields |
| Verbatim pre-share text; "Accessible in-app and email notifications" | §7.10, §7.13 | Confirmation dialog; live regions |
| Avoid AI-generated aesthetics, robots, surveillance motifs, leaderboards, streaks, competitive badges, attention-maximizing patterns | §8, §3 | Negative design constraints |

**Touched, not closed:** Q1 (branding editor scope), Q2 (screen inventory), Q3 (all options
presume React), Q4 (3.3.8 on sign-in), Q8 (anonymity notices link to the limitations), Q9 ("posted
by you", "following" and "Still unclear" states), Q10 (wizard rule text), Q13 (locked toggles), Q14
(branding audit), Q16 ("not enough responses yet" states), Q19 (fonts, translations, RTL).
**Not decided here:** the target itself, any copy text (PQ-63) and the stack (ADR 0001).

## 3. Options considered

### 3.1 Component foundation (assumes React; ADR 0001 proposes Next.js)

If Q3 picks a non-React stack, only the tokens and the pattern sources survive. Versions are npm
`latest` [V6].

| Option | What it is | Licence | Maintenance | Runtime admin branding (§4) | Stock-look risk (§8) | Verdict (proposal) |
|---|---|---|---|---|---|---|
| **shadcn/ui + Tailwind v4** | Copy-in source + CLI on Base UI (default), Radix or React Aria | MIT, MIT | Very active (~125k stars) | CSS variables in OKLCH | **High** at defaults; we own every file | **Foundation**, heavily customised |
| **React Aria Components** | Adobe's unstyled components (50+) | Apache-2.0 | 1.22.1, active | Unstyled | None | **First-choice primitives** |
| **Base UI** | Unstyled primitives (`mui/base-ui`) | MIT | 1.9.0, active | Unstyled | None | **Fallback primitives** |
| Radix Primitives | Unstyled primitives (WorkOS) | MIT | Active, 128 open issues | Unstyled | None | Acceptable; no longer default |
| Headless UI | 16 unstyled components | MIT | 2.2.10 | Unstyled | None | Too few components. No |
| Radix Themes | Pre-styled Radix | MIT | 3.3.0 | 26 fixed scales; "step 9" overrides | Medium | Awkward branding. No |
| Mantine | Full styled kit | MIT | 9.7.2, very active | 10-shade palette key | Medium | **Credible alternative** for a pre-styled kit |
| MUI Material UI | Material Design | MIT core (MUI X: **Unverified** [V11]) | 9.5.0, very active | Theme object | **High** (reads as a Google app) | No |
| BrightspaceUI/core | D2L's Lit components "for building Brightspace applications" | Apache-2.0 | Very active | Brightspace theme | Looks like Brightspace | **No** (affiliation risk, 4.3). Pattern reference only |

### 3.2 Pattern and content sources (not component kits)

| Source | Licence | Use | Verdict (proposal) |
|---|---|---|---|
| GOV.UK Design System (Frontend 6.5.1 [V14]) | Code MIT; docs OGL v3.0 | Tags, question pages, error summary, plain language | Patterns only; no crown, brand or GDS Transport |
| USWDS | CC0 with exceptions | Form, alert, step-indicator patterns | Patterns only; no US government banner |
| W3C WAI-ARIA APG | **Unverified** [V16] | Keyboard and ARIA behaviour per widget | Reference for tests |
| LEARN / Brightspace (observed UI) | Proprietary | IA inspiration (§8) | Never copy assets, icons, colours, fonts or traced layouts |

### 3.3 Conformance target options (Q15)

| Option | Pros | Cons |
|---|---|---|
| A. WCAG 2.0 AA (minus 1.2.4, 1.2.5), the Ontario and Policy 58 floor | Matches the floor found | Misses reflow, target size, status messages, focus not obscured |
| **B. WCAG 2.2 AA** (Recommendation 5 Oct 2023, current version 12 Dec 2024) | Implies 2.0 and 2.1 conformance; testable with axe; W3C's advice for WCAG 3 readiness | A little more work (2.5.8, 3.3.8); 4.1.1 is removed but 2.0-based policies may still want it reported |
| C. B + named AAA criteria | Good for projectors (§7.8) | Must be scoped per criterion |
| D. WCAG 3 | — | Working Draft, not a standard |

## 4. Evidence

All facts were checked on 2026-10-11; URLs and status are in section 10 ([Vn]).

### 4.1 shadcn/ui and its primitives

- shadcn/ui "is not a component library"; it "hands you the actual component code" (MIT). Theming
  uses OKLCH CSS variables mapped through Tailwind `@theme inline`; default `--radius: 0.625rem`
  [V1].
- `style` has `radix-`, `base-` and `aria-` variants of eight styles, plus an `rtl` flag. `style`
  "cannot be changed after initialization" [V2].
- Base UI has been the default since July 2026; Radix "is not being deprecated". A progressive
  Radix-to-Base UI migration is documented, using an AI coding-agent skill [V3], which touches
  PQ-16 (interpretation). React Aria needs `--base aria`; "Existing projects stay on their current
  base"; no migration to or from React Aria is documented [V4]. Full component coverage in
  `aria-*` is **Unverified** [V5].
- React Aria claims screen-reader testing "using many popular screen readers and devices",
  translations "in over 30 languages" and RTL (vendor claims) [V7]. Radix promises "basic keyboard
  support" and names no assistive technology; its AlertDialog focuses Cancel [V8]. Base UI's
  accessibility detail was not checked [V9].
- Radix Themes brands by overriding "step 9"; Mantine's `primaryColor` must be a palette key; MUI
  "implements Google's Material Design"; Headless UI lists 16 components [V10].

### 4.2 Pattern sources

- GOV.UK tags: "only used to indicate a status", "Do not make a tag interactive", adjectives not
  verbs, "Do not use colour alone". Question pages: "one question per page", a "Continue" button, a
  progress indicator only "If research shows it's helpful". Error summary: focus moves to it,
  errors link to fields, "Error: " title prefix, `role="alert"` on an inner element [V12].
- Services outside service.gov.uk should "use an alternative typeface" to GDS Transport; crown
  rules **Unverified** [V13]. USWDS is CC0 with exceptions; GSA keeps its trademarks [V15].

### 4.3 D2L, UW brand and fonts

- BrightspaceUI/core is Apache-2.0, built "for building Brightspace applications" [V17]. D2L: marks
  may not appear in a product, app or domain name, or "imply affiliation"; there is no explicit
  permission for "works with Brightspace"-style use [V18]. Apache-2.0 s. 6 grants no trademark
  rights [V19].
- **Assessment (interpretation, not legal advice):** an app built from Brightspace's components
  and theme would look like a Brightspace tool. ClearCourse AI links *to* LEARN (§4, §7.4), so users
  could take it for an official D2L or UW product. That conflicts with D2L's rule and with §4
  (other institutions). It would also add a second component model (Lit). See PQ-59.
- UW brand rules bind "staff, faculty, partners and vendors"; UW fonts are "centrally licensed for
  WCMS responsive websites"; Barlow Condensed is UW's listed alternative [V20]. The logo may not be
  modified; exceptions come in writing "for official business"; third-party use is **Unverified**
  [V21]. Every UW gold lists only black as an accessible pairing [V22], so "white text on the brand
  colour" fails with UW gold (interpretation).
- Barlow, Source Serif 4 and IBM Plex are OFL 1.1 [V23]. Atkinson Hyperlegible Next targets
  low-vision legibility and is OFL 1.1 in the Google Fonts repo; self-host that copy so there is
  one licence [V24].

### 4.4 Standards and law

- WCAG 2.2: Recommendation since 5 Oct 2023 (current version 12 Dec 2024); new AA criteria
  include 2.4.11, 2.5.7, 2.5.8 and 3.3.8; 4.1.1 removed; 2.2 conformance implies 2.0 and 2.1
  [V25, V26]. WCAG 3 is a Working Draft; W3C says to meet 2.2 now [V27].
- Ontario requires WCAG 2.0 AA on **public** websites of designated public sector organizations
  and 50+ employee organizations, not intranets or extranets; the duty falls on the organization
  that controls the site [V28]. Colleges and universities are designated [V29]. Policy 58 s. 7
  commits UW to WCAG 2.0 AA "for all Public Websites" [V30]; UW's accessibility pages name no
  version [V31]. Whether any of this binds a tool UW doesn't control is open (PQ-60, PQ-51). Not
  legal advice.
- Contrast: 4.5:1 text, 3:1 large text, no rounding ("4.499:1 would not meet") [V32]. Reflow: 320
  CSS px [V33]. Status messages: `role=status` / `alert` / `log`; `alert` overuse is a listed
  failure [V34]. 3.3.8: the user must be able "to at least paste the code", autofill not blocked,
  split one-digit boxes fail (F109) [V35]. Forced colours: small tweaks only; `box-shadow` becomes
  `none`, so focus rings need `outline` [V36].

### 4.5 Testing tools and their limits

- axe-core (MPL-2.0) claims "on average 57% of WCAG issues" (vendor claim, no method) and returns
  "incomplete" items for manual review [V37]. GDS 2017: all free tools together found 71% of 143
  known barriers; the best single tool 37% on errors and warnings [V38]. Playwright: automation
  "cannot detect all types of WCAG violations" [V39].
- axe tags aren't cumulative and there's no `wcag22a`, so use `wcag2a, wcag2aa, wcag21a, wcag21aa,
  wcag22aa` [V40]. Which axe-core `@axe-core/playwright` bundles is **Unverified** [V41].
- eslint-plugin-jsx-a11y 6.10.2 supports ESLint up to 9 only; ESLint is at 10.12.0 [V42]. Biome has
  a 37-rule `a11y` group [V43].
- WebAIM #10 (self-selected): JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7% as primary desktop readers
  [V44].

## 5. Comparison

Qualitative, no weights proposed; ratings are the author's reading of section 4 (interpretation).

| Criterion | shadcn + React Aria | shadcn + Base UI | shadcn + Radix | Mantine | BrightspaceUI |
|---|---|---|---|---|---|
| We own the source (full re-styling) | Yes | Yes | Yes | No | No |
| Stated AT testing | Strongest (vendor) | Not checked | None named | Not checked | aXe tests |
| Translations / RTL (Q19) | 30+ languages, RTL (vendor) | Not checked | Not checked | Not checked | Not checked |
| Branding from one token (§4) | Easy | Easy | Easy | Needs a palette | Brightspace theme |
| Affiliation risk (PQ-59) | None | None | None | None | **High** |
| shadcn default path | No (`--base aria`) | **Yes** | Supported | — | — |
| Later change of base | None documented | Documented from Radix | Documented to Base UI | — | — |
| Milestone-1 coverage | **Unverified** (spike) | Widest in shadcn (interpretation) | Wide | Wide | Brightspace-shaped |

The shadcn variants share styling and tokens; they differ in the primitives that carry keyboard
and screen-reader behaviour. React Aria has the strongest stated accessibility and i18n; Base UI
is the lower-risk tooling path. So the choice is a spike, not a desk decision.

## 6. Recommendation (proposal) with trade-offs

Every item here is a **Proposal** for the owner.

### 6.1 Foundation and the primitive-base spike

1. **shadcn/ui + Tailwind CSS v4**, with every colour, radius, spacing and type value from our own
   tokens (6.4). Mainstream, documented, free to run, and not tied to Next.js.
2. **React Aria (`aria-*`) first, Base UI (`base-*`) as fallback**, for React Aria's stated
   screen-reader, translation and RTL support.
3. **Spike first**, in a throwaway folder outside the repo: init with `--base aria`, confirm every
   shared component in 6.10 exists, and try one sample screen with NVDA and VoiceOver. If anything
   is missing, use `base-*`. Record the result in the plan and ADR 0001. Scaffold and CI scripts
   must pass `--base aria` explicitly if React Aria wins.
4. **Not proposed:** MUI, Radix Themes, Headless UI, BrightspaceUI/core (3.1). Mantine stays the
   alternative for a pre-styled kit.

### 6.2 Avoiding "AI-generated aesthetics" (§8)

§8 doesn't define the term. This list is the author's judgement of stock shadcn/Tailwind tells
(interpretation); the owner should review the result visually.

| Stock tell | Proposed change |
|---|---|
| Zinc greys, near-black primary, 0.625rem radius everywhere | Own calm neutral ramp; one admin brand accent; 2–4 px radii; square tags |
| One default sans for everything | Serif + sans pairing (6.5); real type scale |
| Gradients, glassmorphism, glows, sparkle or "magic" icons, robot or brain motifs | None; flat surfaces, 1 px borders (§8, §3) |
| Hero sections, centred marketing copy, big empty cards | Dense, left-aligned, LMS-like, content first; compact cards |
| Shadows and hover-lift on every card | Bordered cards; motion only for state changes, none under reduced motion |
| Emoji, exclamation-mark microcopy, an icon on every label | Plain sentence-case copy; icons only with text labels |
| "Stat tiles" with trend arrows | None for participation; analytics (M2) as plain tables |

Surveillance motifs also rule out presence dots, "typing…", read receipts and "seen by" lists.

### 6.3 Information architecture inspired by LEARN, Brightspace and UW, without copying

It borrows generic LMS **structure**, not D2L assets, icons, colours, fonts, names or traced
layouts. How close it may be is **PQ-59**.

- **Header:** institution name and logo (brand tokens, PQ-07), "ClearCourse AI", course switcher,
  notifications, account menu.
- **Course navbar** (role-dependent, §5): Course home · Course AI Card · Assignments · Questions ·
  Moderation (staff) · Settings. Questions and Moderation arrive with the board (M1b).
- **Breadcrumbs** below course home (`nav aria-label="Breadcrumb"`, `aria-current="page"`).
- **Course home:** compact cards, each with one heading, a short summary and one link: Course AI
  Card summary, upcoming assignments with AI-permitted status, and in M1b recent answers and the
  student's private participation panel. No hero section.
- **Assignment AI Card:** the configurable opening statement (§7.4), rule sections in §7.4 order,
  the override comparison (6.6), and the LEARN submission link as the primary action.
- **"LEARN"** is admin-configured text (§4), never a hard-coded or D2L mark. Whether to say the app
  is not an official UW service is **PQ-07**; wording is owner-approved copy (to be written).

### 6.4 Branding token model and contrast guardrail (§4, §8)

**Three layers of CSS custom properties:**

1. **Reference tokens** (code only): neutral ramp, spacing, type scale, radii, focus width, motion.
2. **Brand tokens** (admin data, §4): an accent, an optional second accent, logo, institution
   name, LMS display name, a heading font from a vetted list. Validated on the server and injected
   as a small `:root` style block at render time, so no rebuild ("without code changes", §4).
3. **Semantic tokens** (what components read), mapped onto shadcn's names (`--background`,
   `--primary`, `--primary-foreground`, `--ring` …) so the copied components keep working.

Components read only semantic tokens, so a brand colour reaches the UI only through the
guardrail. The focus ring is not tied to the brand, so it stays visible whatever an admin picks.

**Guardrail on save** (illustrative; WCAG 1.4.3 and 1.4.11, ratios unrounded [V32]):

```text
onAccent   = whichever of {near-black, white} contrasts more with accent
require contrast(onAccent, accent) >= 4.5     # text on filled buttons
require contrast(accent, surface)  >= 3.0     # borders, icons, indicators
accentText = accent if contrast(accent, surface) >= 4.5
             else accent darkened in OKLCH lightness until >= 4.5   # links, headings
on failure: block the save, name the failing pair, offer the adjusted value
store accent, onAccent, accentText and the computed ratios
```

- **UW example (interpretation):** for UW gold `#FED34C` the guardrail picks dark button text and a
  darker link colour, never gold text on white. No ratios are quoted, because none were computed
  with a verified tool; unit tests should use known pairs.
- **Open:** may admins save a failing colour (**PQ-61**; the proposal is no override)? Are
  branding changes audited (Q14; event E7 in
  [blocking open questions](blocking-open-questions.md))? Is dark mode wanted, which would double
  the checks (**PQ-64**)? May the default theme use UW's name, colours or logo (**PQ-07**)? A neutral
  demo theme sidesteps PQ-07 for public demos.
- **Record:** the admin-owned theme (institution id, display name, LMS name, logo asset, accent and
  derived colours, contrast report, heading font, updated by/at) holds no identity or anonymous
  content. It sits with the institution configuration, which the
  [privacy architecture](privacy-architecture.md) proposal places in the `catalog` schema. Its
  exact scope is Q1.

### 6.5 Typography (§8 "university-appropriate typography")

- **No UW brand fonts, logos, shield, seal or wordmark** without written permission (PQ-07) [V20,
  V21].
- **Proposed pairing (OFL 1.1, self-hosted):** **Source Serif 4** for headings; **IBM Plex Sans**
  for body and UI, or **Atkinson Hyperlegible Next** if low-vision legibility comes first. An
  optional UW theme could use **Barlow Condensed** for short headings (only if PQ-07 allows a UW
  theme).
- **The heading font is a brand token** chosen from a vetted, self-hosted list, never a URL (P1,
  P9 in section 7).
- **Starting values (not requirements):** 16 px minimum body text, about 70 characters per line,
  line height 1.5. WCAG 1.4.12 is the testable constraint.
- **Languages** depend on Q19 (Plex ships separate script packages; Atkinson's "over 150
  languages" is **Unverified**).

### 6.6 Component patterns

All visible wording is a placeholder; final text is owner-approved copy (to be written), and who
writes and approves it is **PQ-63**. Verbatim spec texts (§7.3, §7.4, §7.10) are copied exactly.

**Status labels (§7.4, §8).** A non-interactive tag with the state word (GOV.UK pattern), only the
four §7.4 names, sentence case. Each state also gets its own border style and a `CanvasText`
border in forced colours, so it never depends on colour. A superseded card also links to the
newer version. Help text for states needs owner copy.

**Progressive disclosure (§8).** APG Disclosure (`aria-expanded`) or native `<details>`. Never
collapse required policy information: the Policy 71 and Guidelines links (§4), the §7.3 verbatim
principle, the §7.4 opening statement. Good candidates: long rule sections, version history, the
course value inside an override marker.

**Anonymity explanation at every point of posting (§8).** One `AnonymityNotice` component inside
every composer: ask, comment, upvote, "Still unclear", report (§7.7). It is tied to the submit
control with `aria-describedby`, so screen readers announce it before posting. It is not a
dismissible toast or an info icon. It links to the limitations of anonymity (§6.2, Q8; outline in
[privacy architecture §7.2](privacy-architecture.md#72-limitations-of-anonymity-content-not-copy));
whether those must also be in the app is **PQ-52**. It must not over-promise, so its copy waits
for Q8 and Q9 and must stay true if §6.4 deanonymization is ever enabled.

**Non-gamified participation levels (§7.9, §7.10, §8).** Plain text: the level name, the student's
own counts (questions, comments, upvotes given) and the published thresholds in a table. No
progress rings, "N more to go" nudges, celebrations, medals, streaks or peer comparison. "Level
reached" (§7.13) is a neutral status message. The share flow (M2) shows the §7.10 verbatim text in
an alert dialog with explicit share and cancel buttons and initial focus on Cancel, and explains
when sharing becomes final (timing is Q18).

**Presentation-mode legibility (§7.8).** Its own route and view model that receives **only** the
§7.8 Display fields; hiding fields with CSS is not acceptable (P5). Starting values to test on
real projectors: about 32 px body text at 1080p, text contrast aimed at **7:1 (1.4.6, AAA stretch)**
because projectors wash out contrast (interpretation), focus aimed at **2.4.13 (AAA stretch)**.
High-contrast light theme; brand colour only as an accent; no hover-only controls; keyboard
next/previous plus visible buttons. Live or refreshed counts is **PQ-17**; snapshots or live
totals is **PQ-35** (the privacy proposal is frozen snapshots). Testing on UW classroom projectors
is part of **PQ-64**.

**Visible course-vs-assignment overrides (§7.4, §10).** On the Assignment AI Card:

- each field that differs from the Course AI Card gets an inline marker (text plus icon), whose
  disclosure shows the course value beside the assignment value;
- a summary box at the top lists the overridden fields with in-page links;
- fields that don't differ say so in muted text;
- screen-reader text states the relationship.

The §7.3 and §7.4 field lists aren't one-to-one (e.g. "Uses generally allowed" vs "When AI is
allowed"), so which pairs are "the same rule" is **PQ-62**. The pattern can be built before the
mapping is known; the mapping can't.

**Notifications (§7.13).** A list page with headings; the header link carries the count (e.g.
"Notifications, 3 new"). One persistent polite live region (`role="status"`) for confirmations;
`role="alert"` only for urgent errors [V34]. No auto-dismissing toasts for anything that needs
action. Essential types are Q13. Templates never take identity and anonymous content together (P7).

**Time display on anonymous content.** Show no finer precision than the stored bucket, whose size
is **PQ-24** ([privacy architecture §6.6](privacy-architecture.md#66-timestamp-policy)).

**Wizard (§7.6; proposed for M2 in the [plan](../plan.md)).** GOV.UK question pages: one
question per page, back link, question as `<h1>`/`<legend>`, Continue, a focused error summary,
"Error: " title prefix. "Why this matters", resources and the decision rule (§7.6) are visible
text, not tooltips. The rules are Q10.

### 6.7 Accessibility process

1. **Target (Q15, the owner decides): WCAG 2.2 AA** for all UI. It meets the 2.0 AA floor in
   Ontario's rules and Policy 58 (2.2 implies 2.0); keep reporting 4.1.1 if a 2.0-based review asks
   for it. Whether the floor binds this tool is uncertain both ways (PQ-60); whether UW needs more
   (newer version, VPAT/ACR, review) is PQ-51. **AAA stretch goals, presentation mode only:** 2.4.13
   and 1.4.6, never claimed as part of AA.
2. **Sign-in (Q4, ADR 0004):** the 6-digit email code goes into **one** field that accepts a full
   paste and allows autofill (`autocomplete="one-time-code"` is the usual way, interpretation).
   Split one-digit boxes that break paste fail 3.3.8 (F109) [V35]. See
   [prototype sign-in](prototype-auth-and-provisioning.md).
3. **Automated, every pull request:**
   - `@axe-core/playwright` on every milestone-1 screen in every state (empty, filled, error,
     dialog open, disclosure open, presentation mode), tags `wcag2a, wcag2aa, wcag21a, wcag21aa,
     wcag22aa`. Violations fail the build; known issues allowed only by fingerprint with a
     tracking note. "Incomplete" results are reviewed by hand.
   - Lint: **either** ESLint 9 + eslint-plugin-jsx-a11y **or** ESLint 10 + Biome's `a11y` rules
     (jsx-a11y doesn't support ESLint 10). The axe gate is unaffected.
   - Unit tests: the guardrail (unrounded; 4.499 fails) and the presentation-mode allowlist.
   - Playwright keyboard tests: Tab order, Escape, focus return, skip link.
   - Verbatim tests: §7.3, §7.4 and §7.10 texts render exactly as in CONTRIBUTING.
4. **Manual, per milestone (6.8):** keyboard only; NVDA with Chrome and Firefox; VoiceOver on macOS
   Safari and iOS; 200% zoom and 320 px reflow; Windows contrast themes; reduced motion; a projector
   check. JAWS leads WebAIM #10 but is paid, so it is a budget question (PQ-64).
5. **Honest limits.** Axe's own "57%" is a vendor claim; GDS found 71% with all free tools
   combined; Playwright says automation can't catch everything [V37–V39]. So passing axe is
   **never** presented as conformance. Conformance is claimed only after the manual checklist
   passes, recorded as "axe clean + manual checklist passed on <date> with <AT and browser
   versions>"; never "fully accessible".
6. **Independence.** A solo developer can't audit their own work. An external audit, testing with
   disabled users and an accessibility statement page are budget and scope questions (PQ-64,
   PQ-69).

### 6.8 Manual checklist (proposal; assumes WCAG 2.2 AA)

Criteria marked † are **Unverified** numbers; re-check them against the WCAG 2.2 text before
adoption. The rest were verified [V26].

| Area | Check | WCAG 2.2 |
|---|---|---|
| Keyboard | Everything operable without a mouse; no traps; logical order; dialogs return focus | 2.1.1†, 2.1.2†, 2.4.3† |
| Keyboard | Focus visible and not hidden by sticky bars; skip link | 2.4.7, 2.4.11, 2.4.1† |
| Keyboard | Upvote and report work without dragging or hover | 2.5.7 |
| Screen readers | NVDA and VoiceOver: sign-in, card pages, ask, comment, upvote, report, follow, notifications | — |
| Screen readers | Anonymity notice announced before submit in every composer | §8 |
| Screen readers | Tags and override markers announced as text; headings and landmarks form an outline | 1.3.1 |
| Screen readers | Status messages announced without moving focus | 4.1.3 |
| Screen readers | Unique page titles; "Error: " prefix after a failed submit | 2.4.2† |
| Zoom and reflow | 200% text zoom; 320 CSS px without two-way scrolling (tables excepted); text-spacing override | 1.4.4†, 1.4.10, 1.4.12 |
| Zoom and reflow | Targets at least 24 × 24 CSS px or spaced | 2.5.8 |
| Colour | 4.5:1 text, 3:1 large text, 3:1 components and focus, for every theme and saved brand | 1.4.3, 1.4.11 |
| Colour | Nothing by colour alone (statuses, overrides, errors, levels) | 1.4.1† |
| Colour | Forced colours keep borders, focus and tags; reduced motion respected (AAA, proposed anyway) | 2.3.3 |
| Colour | Presentation mode read from the back of a room on a real projector | 1.4.6 (stretch) |
| Forms | Visible labels and names; errors in text, linked from a focused summary | 1.3.1, 3.3.1†, 3.3.2†, 4.1.2† |
| Forms | No re-entry in one flow; consistent help; no silent timeout loss | 3.3.7, 3.2.6, 2.2.1† |
| Forms | Sign-in code: single field, paste and autofill work | 3.3.8 |
| Content | Sentence case, short sentences, terms defined; links make sense alone; `lang` set | 2.4.4†, 3.1.1† |

### 6.9 Token sketch (illustrative; every value is a placeholder, no pairing verified)

```css
/* Layer 1: reference tokens (code only) */
:root {
  --ref-neutral-0:   oklch(0.995 0.003 90);  /* page */
  --ref-neutral-50:  oklch(0.975 0.004 90);  /* subtle surface */
  --ref-neutral-200: oklch(0.90  0.006 90);  /* borders */
  --ref-neutral-600: oklch(0.48  0.010 90);  /* muted text: must reach 4.5:1 */
  --ref-neutral-900: oklch(0.22  0.010 90);  /* body text */
  --ref-radius-md: 4px;                      /* deliberately not 0.625rem */
  --ref-font-serif: "Source Serif 4", Georgia, serif;   /* self-hosted */
  --ref-font-sans:  "IBM Plex Sans", system-ui, sans-serif;
  --ref-text-base: 1rem; --ref-leading: 1.5; --ref-measure: 70ch;
  --ref-focus-width: 3px; --ref-motion-fast: 120ms;
}
@media (prefers-reduced-motion: reduce) { :root { --ref-motion-fast: 0ms; } }

/* Layer 2: brand tokens, injected per institution after the guardrail (6.4) */
:root {
  --brand-accent:      oklch(0.86 0.15 85);  /* admin value (example: a gold) */
  --brand-on-accent:   oklch(0.15 0 0);      /* derived */
  --brand-accent-text: oklch(0.45 0.10 75);  /* derived: darkened for links */
  --brand-font-heading: var(--ref-font-serif);
}

/* Layer 3: semantic tokens on shadcn names; components read only these */
:root {
  --background: var(--ref-neutral-0);  --foreground: var(--ref-neutral-900);
  --muted-foreground: var(--ref-neutral-600);  --border: var(--ref-neutral-200);
  --primary: var(--brand-accent);  --primary-foreground: var(--brand-on-accent);
  --link: var(--brand-accent-text);
  --ring: var(--foreground);           /* not tied to the brand */
  --radius: var(--ref-radius-md);
  --status-draft-border: dashed;    --status-published-border: solid;    /* plus the word */
  --status-archived-border: dotted; --status-superseded-border: double;
}

[data-mode="presentation"] {           /* §7.8; validate on projectors */
  --ref-text-base: 2rem;
  --muted-foreground: var(--ref-neutral-900);  /* aim for 7:1 */
}

@media (forced-colors: active) {       /* small tweaks only; outline, not box-shadow */
  .tag, .card, .override-marker { border: 1px solid CanvasText; }
  :focus-visible { outline: var(--ref-focus-width) solid Highlight; }
}
```

Tailwind v4 reads these through `@theme inline { --color-background: var(--background); … }` [V1].

### 6.10 Milestone-1 screen inventory (candidate; scope is Q2 and PQ-08)

The [plan](../plan.md) proposes splitting milestone 1 into **M1a** (cards, no anonymous content)
and **M1b** (the board, which starts only after ADR 0003 is accepted and the threat model exists,
§6.3). A row is in scope only if the owner includes its feature. Rows marked "(Q5)" come from the
provisioning proposal in [prototype sign-in](prototype-auth-and-provisioning.md), not from the
design research; "(Q17)" marks the proposed prototype-data notice.

| # | Screen | Role | Spec | Key design and accessibility notes | Phase | Blocked by |
|---|---|---|---|---|---|---|
| S1 | Sign-in (email code) | All | §10 | One code field, paste and autofill (3.3.8); error summary | M1a | Q4 |
| S2 | My courses | All | §5 | Compact course cards; empty state | M1a | Q5 |
| S2a | Create course (Q5) | Vetted instructor | §5 | Short form; error summary | M1a | PQ-46 |
| S2b | Join by link or code (Q5) | Student | §5 | One field; plain errors | M1a | Q5, PQ-46 |
| S2c | People and TA permissions (Q5) | Instructor | §5 | Table; checkbox group | M1a | PQ-29, PQ-67 |
| S3 | Course home | All | §7.1, §8 | Navbar, breadcrumbs, compact cards | M1a (board cards M1b) | Q2 |
| S4 | Course AI Card | All | §7.3 | Verbatim principle always visible; status tag; Policy 71 and Guidelines links | M1a | — |
| S5 | Assignment list | All | §7.4 | Status tags; "AI permitted?" as text | M1a | — |
| S6 | Assignment AI Card | All | §7.4, §10 | Opening statement; override comparison; LEARN link | M1a | PQ-62 |
| S7 | Version history | All | §7.6 | What, why, effective date, applies to work underway | M1a | — |
| S10 | Manual card editor | Instructor (TA if permitted) | §7.3–§7.6 | Grouped fieldsets; required-when-permitted fields; bonus fields (§7.5); error summary | M1a | — |
| S11 | Preview as student | Instructor | §7.6 | "Preview" banner in text | M1a | — |
| S12 | Publish and change record | Instructor | §7.6 | What changed, why, effective date | M1a | PQ-39 |
| S22 | Institution branding | Admin | §4, §7.15 | Colour input with live contrast report; logo; vetted fonts | M1a | Q1, PQ-61 |
| S23 | About anonymity; accessibility statement | Public | §6.2, §8 | Static pages | M1a if wanted | Q8, PQ-52, PQ-64 |
| S24 | Error, not-found, no-access | All | §5, §6.2 | Plain language; no data in error text | M1a | — |
| S25 | Prototype notice (Q17) | All | — | Text notice; owner-approved copy (to be written) | M1a | Q17 |
| S13 | Question board | All | §7.2, §7.7, §7.14 | Filters, search, sort; no author affordance | M1b | Q9 |
| S14 | Ask a question | Student | §7.2, §7.7 | Course or assignment tag only; AnonymityNotice; duplicate warning | M1b | Q8, Q20 |
| S15 | Question detail | All | §7.7 | Answer, comments, upvote, "Still unclear", follow, report; notices in composers | M1b | PQ-22, PQ-24 |
| S16 | Moderation queue | Instructor, permitted TA | §7.7 | Reports; hide and delete; no identities | M1b | Q20, PQ-26, PQ-27 |
| S17 | Merge duplicates | Instructor, permitted TA | §7.7 | Two-step confirmation; totals without identities | M1b if PQ-08 | PQ-25 |
| S18 | Presentation mode | Instructor, permitted TA | §7.8 | Allowlisted fields; large type; keyboard next/previous | M1b | PQ-17, PQ-35 |
| S19 | My participation | Student | §7.9, §7.10 | Counts, level, thresholds table; non-gamified | M1b | PQ-30 |
| S21 | Notification centre (in-app) | All | §7.13 | List page; live region; locked essential toggles | M1b | Q13, PQ-43 |

**Later (M2 in the plan):** S8/S9 wizard (Q10), S20 share confirmation (Q18), email notification
settings (Q6), survey (§7.12), grading and export (§7.11), analytics (§7.16), audit viewer (§7.17).

**Shared components for the spike:** Button, Link, Breadcrumbs, Tabs, Card, Tag, Disclosure,
Dialog, AlertDialog, form field (label, description, error), Text area, Radio group, Checkbox,
Select/Combobox, Search field, Date picker, Table, live region/Toast, Menu, Popover, Skip link,
visually hidden text, Pagination.

### 6.11 Trade-offs

| Choice | Gain | Cost |
|---|---|---|
| Own the component source | Full control of the look; nothing to run | We maintain every copied file and pull upstream fixes by hand |
| React Aria over Base UI | Strongest stated AT, translation and RTL support | Not the default; coverage Unverified; no documented way out |
| Base UI over React Aria | Default path, widest coverage | Accessibility detail unchecked; no translations or RTL claimed |
| Heavy customisation | Calm, distinctive look (§8) | Design time in M0; every token change needs a contrast re-check |
| No-override guardrail (if PQ-61 says so) | Admins can't break contrast | Some brand colours become accent-only |
| WCAG 2.2 AA, manual checks | Honest claims; covers mobile and sign-in criteria | Solo-developer time; JAWS and audits cost money (PQ-64) |
| No UW or D2L assets | No trademark or affiliation risk; other institutions (§4) | Less "official" feel; a UW theme needs permission (PQ-07) |

## 7. Privacy implications (§6)

A design system is mostly presentation, but UI choices can break §6.2 ("Identity-bearing
information and anonymous-content text must not appear together in any application log,
analytics event, error report …") or weaken anonymity in practice. Each row is a **proposed design
rule**, not a requirement.

| # | Risk | Proposed rule | Cites |
|---|---|---|---|
| P1 | Third-party font or icon CDNs see each page view with the user's IP and URL (which can hold a question id) | Self-host all fonts and icons; no third-party requests from content pages | §6.2 (interpretation); PQ-11 |
| P2 | Front-end error tools with session replay or DOM snapshots capture the signed-in name and anonymous text together | No session replay; error reports carry no DOM text and no user id on content routes | §6.2, §3; PQ-12 |
| P3 | Avatars, initials, colour-coded author chips or "You" badges on posts | No author affordance on anonymous content for any role. A "posted by you" view depends on PQ-22 | §6.2, §6.3, Q9 |
| P4 | Presence, "typing…", read receipts, "seen by" lists | Never build them: attention-maximising (§8) and they leak timing | §8, §3 |
| P5 | Presentation mode reusing the moderator view and hiding fields with CSS | Own view model with an allowlist of the §7.8 Display fields; excluded data never reaches the page | §7.8, §10 |
| P6 | Exact post times in small courses help guess authors | Show no finer than the stored bucket (PQ-24) | §6.1, §6.2 |
| P7 | Notifications combining a name and anonymous content | Templates can't take both; the notification proposal keeps emails content-free ([blocking open questions](blocking-open-questions.md)); copy needs the owner | §6.2, §7.13 |
| P8 | Screenshots and axe JSON in CI artefacts | Seed data only, never real users; GitHub keeps artefacts and logs 90 days by default, so shorten retention (PQ-70) | §6.2, §9 |
| P9 | Logo uploads and external image URLs | Strip metadata, serve from our origin; no external URLs (they log every viewer) | §4, §6.2 (interpretation) |
| P10 | "Follow" and "Still unclear" are per-student state about a question | The UI must not assume where it lives; the privacy proposal keeps it as per-item tags ([ADR 0003](../decisions/0003-privacy-mechanism.md)) | §7.7, Q9 |

**Anonymity explanations are a privacy communication duty.** They must not over-promise. §6.2
requires the limitations of anonymity to be documented (Q8), so the in-context notice links to that
summary and makes no claims of its own. Its copy isn't written here; it depends on Q8, Q9 and
whether deanonymization is ever enabled (§6.4).

## 8. Risks

| Risk | Likelihood (interpretation) | Mitigation (proposal) |
|---|---|---|
| React Aria lacks a needed shadcn component, found after scaffolding | Medium | Spike first (6.1); Base UI fallback |
| Stock shadcn look survives and reads as "AI-generated" | Medium | Token-level customisation (6.2) and an owner visual review |
| Focus rings vanish in forced colours (`box-shadow`) | High in stock styles | Use `outline`; forced-colours check in 6.8 |
| Admin brand colour fails contrast | High for light brands such as UW gold | Server-side guardrail; PQ-61 |
| The UI implies UW or D2L affiliation | Medium | No UW or D2L assets; configurable "LEARN" text; PQ-07, PQ-59 |
| Axe passing is read as conformance | Medium | Honest-reporting rule (6.7); manual checklist |
| jsx-a11y stalls on ESLint 10 | Already true | ESLint 9 + jsx-a11y, or ESLint 10 + Biome |
| Sign-in code input breaks paste (3.3.8) | Medium with stock OTP widgets | Single field; paste and autofill test |
| Presentation mode unreadable on real projectors | Unknown | Large type and 7:1 aim; projector test (PQ-64) |
| Copy over-promises anonymity | Medium | Notices link to the limitations; owner-approved copy only (PQ-63) |
| No independent accessibility check before production | High for a solo build | External audit or user testing as a budget decision (PQ-64, PQ-69) |

## 9. Open questions

None is answered here.

### 9.1 Existing questions (CONTRIBUTING §13)

| Q | What this file proposes or needs |
|---|---|
| **Q15** | Proposal: WCAG 2.2 AA, AAA 2.4.13 and 1.4.6 as stretch goals for presentation mode; process in 6.7 |
| Q1 | Bounds the branding editor (S22) |
| Q2 | Decides the screen inventory (6.10); the plan proposes the M1a/M1b split (PQ-08) |
| Q3 | All component options presume React (ADR 0001) |
| Q4 | 3.3.8 constrains the sign-in code field (ADR 0004) |
| Q8, Q9 | Anonymity notice copy and "posted by you" / follow / "Still unclear" states wait on them |
| Q10, Q13, Q14, Q16, Q18, Q19 | Wizard rule text; locked notification toggles; branding audit; "not enough responses" states; when sharing becomes final; fonts, translations, RTL |

### 9.2 Proposed questions (canonical PQ IDs; raw-note IDs in brackets)

| ID | Question | When |
|---|---|---|
| **PQ-59** | How close may the information architecture and visual design be to LEARN/Brightspace without implying D2L affiliation? (Includes how to describe LTI compatibility.) [PQ-D1-2] | M0 |
| **PQ-60** | Is UW a designated public sector organization under O. Reg. 191/11, and do the IASR educational-institution duties apply? (Ontario lists colleges and universities as designated [V29]; whether duties attach to a tool UW doesn't control stays open.) [PQ-D1-4] | Pilot |
| **PQ-61** | May admins save a brand colour that fails the contrast checks, or is the guardrail absolute? [PQ-D1-6] | M1a |
| **PQ-62** | Which Course AI Card fields map to which Assignment AI Card fields for the "differences shown visibly" comparison (§7.4)? [PQ-D1-7] | M1a |
| **PQ-63** | Who writes and approves UI copy (anonymity explanations, override markers, status help text, empty states)? [PQ-D1-8] | M1a |
| **PQ-64** | Is dark mode wanted? Is an accessibility statement page wanted in milestone 1? Is there budget for a JAWS licence, an external audit and testing with disabled users before production? Can presentation mode be checked on real UW classroom projectors? [PQ-D1-9, -10, -11, -13] | M1a / Pilot |
| **PQ-07** | Domain and name: `.ca` (CIRA presence rules) or `.com`; has "ClearCourse AI" been checked for conflicts; may the app use UW's name or marks, and should it say it is not an official UW service? [PQ-J16, PQ-D1-1] | M1a |
| **PQ-24** | What precision is stored and shown for post times (e.g. 15 min, 1 h, 1 day)? [PQ-P7, PQ-A1-6, PQ-A2-7, PQ-D1-5] | ADR 0003 |
| **PQ-51** | Does UW require a newer WCAG version, a VPAT/ACR, or an accessibility review beyond Policy 58? [NQ-15a, PQ-D1-3] | Pilot |

**Also referenced (short form of the canonical wording):** PQ-08 (is the M1a/M1b split
acceptable; must merge be in milestone 1?); PQ-11 (are IP addresses identity-bearing?); PQ-12
(may third-party error reporting or analytics run, especially on anonymous-content routes?); PQ-16
(who may hold the KEK; may AI coding agents ever access production data?); PQ-17 (must
presentation mode and voting update live?); PQ-22 (may students see, edit or delete their own
anonymous posts?); PQ-35 (presentation mode and analytics: snapshots or live totals?); PQ-52 (must
the limitations of anonymity be visible in the app?); PQ-69 (is an external security, privacy or
accessibility review wanted before production?); PQ-70 (CI artefact retention and preview
testing).

**Plan decision, not an open question:** React Aria or Base UI as the primitive base, after the
spike in 6.1 [PQ-D1-12].

## 10. Sources and verification log

Sources: the D1 research note and the final fact-check (D1 rows), both in the owner's scratch
workspace, not in this repo. All checks were made on 2026-10-11. "Verified" means seen on the
official page; "Corrected" means the fact-check changed the note's claim; "vendor claim" means the
vendor's own statement, not independently tested. Section 4 cites rows as [Vn].

| # | Claim | URL | Checked | Status |
|---|---|---|---|---|
| V1 | shadcn/ui is copy-in source, "not a component library"; MIT; theming via OKLCH variables and `@theme inline`, default `--radius: 0.625rem` | https://ui.shadcn.com/docs ; https://github.com/shadcn-ui/ui ; https://ui.shadcn.com/docs/theming | 2026-10-11 | Verified |
| V2 | `style` enum has `radix-`, `base-`, `aria-` × 8 styles and an `rtl` flag; `style`, `tailwind.baseColor`, `tailwind.cssVariables` "cannot be changed after initialization" | https://ui.shadcn.com/schema.json ; https://ui.shadcn.com/docs/components-json | 2026-10-11 | Verified |
| V3 | Base UI default since July 2026; Radix not deprecated; progressive Radix-to-Base UI migration via an agent skill | https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default | 2026-10-11 | Verified. Corrected: the base is costly to change, not impossible |
| V4 | React Aria via `--base aria`; existing projects stay on their base; no migration to or from React Aria documented | https://ui.shadcn.com/docs/changelog/2026-07-react-aria | 2026-10-11 | Verified |
| V5 | Every needed shadcn component exists in an `aria-*` variant | (same as V4) | 2026-10-11 | **Unverified** (spike) |
| V6 | Versions and licences: shadcn CLI 4.21.4 MIT; tailwindcss 4.3.3 MIT; react-aria-components 1.22.1 Apache-2.0; @base-ui/react 1.9.0 MIT; @headlessui/react 2.2.10 MIT; @radix-ui/themes 3.3.0 MIT; @mantine/core 9.7.2 MIT; @mui/material 9.5.0 MIT; @brightspace-ui/core 3.331.1 Apache-2.0 | https://registry.npmjs.org/ (`<package>/latest`) | 2026-10-11 | Verified |
| V7 | React Aria: "extensively tested using many popular screen readers and devices", 30+ languages, RTL; monorepo Apache-2.0, about 518 open issues | https://react-aria.adobe.com/ ; https://github.com/adobe/react-spectrum | 2026-10-11 | Verified (vendor claim) |
| V8 | Radix: APG, "basic keyboard support", AT not named; AlertDialog focuses Cancel; MIT, 128 open issues | https://www.radix-ui.com/primitives/docs/overview/accessibility ; https://github.com/radix-ui/primitives | 2026-10-11 | Verified |
| V9 | Base UI repo `mui/base-ui`, MIT, active | https://github.com/mui/base-ui | 2026-10-11 | Verified. Its accessibility detail: **Unverified** |
| V10 | Headless UI 16 components; Radix Themes "step 9" overrides; Mantine `primaryColor` palette key; MUI "implements Google's Material Design" | https://headlessui.com/ ; https://www.radix-ui.com/themes/docs/theme/color ; https://mantine.dev/theming/colors/ ; https://mui.com/material-ui/getting-started/ | 2026-10-11 | Verified |
| V11 | MUI X Pro/Premium are commercial | — | — | **Unverified** |
| V12 | GOV.UK tag, question-page and error-summary guidance (as quoted in 4.3) | https://design-system.service.gov.uk/components/tag/ ; https://design-system.service.gov.uk/patterns/question-pages/ ; https://design-system.service.gov.uk/components/error-summary/ | 2026-10-11 | Verified |
| V13 | GOV.UK typeface rule for other domains; crown rules | https://design-system.service.gov.uk/styles/typeface/ | 2026-10-11 | Typeface verified; crown **Unverified** |
| V14 | GOV.UK Frontend MIT, latest 6.5.1 (2026-09-14) | https://registry.npmjs.org/govuk-frontend ; https://github.com/alphagov/govuk-frontend | 2026-10-11 | Corrected (note said 6.5.0) |
| V15 | USWDS 3.14.0; CC0 with LICENSE.md exceptions; GSA keeps trademarks | https://github.com/uswds/uswds/blob/develop/LICENSE.md | 2026-10-11 | Verified |
| V16 | WAI-ARIA APG document licence | — | — | **Unverified** |
| V17 | BrightspaceUI/core: web components "for building Brightspace applications", Apache-2.0, Lit | https://github.com/BrightspaceUI/core | 2026-10-11 | Verified |
| V18 | D2L marks not in product, app or domain names; no implied affiliation; no explicit referential-use permission | https://www.d2l.com/legal/trademarks/ | 2026-10-11 | Verified |
| V19 | Apache-2.0 s. 6 grants no trademark rights | https://www.apache.org/licenses/LICENSE-2.0 | 2026-10-11 | Verified |
| V20 | UW brand guidelines apply to staff, faculty, partners and vendors; brand fonts centrally licensed; Barlow Condensed listed as alternative | https://uwaterloo.ca/brand/ ; https://uwaterloo.ca/brand/how-express-our-brand/typography | 2026-10-11 | Verified |
| V21 | UW logo: no modification; exceptions in writing "for official business"; third-party use | https://uwaterloo.ca/brand/how-express-our-brand/waterloo-logo | 2026-10-11 | Rules verified; third-party use **Unverified** |
| V22 | Every UW gold level lists only black as an accessible pairing | https://uwaterloo.ca/brand/how-express-our-brand/colour | 2026-10-11 | Verified |
| V23 | Barlow, Source Serif 4, IBM Plex under OFL 1.1 | https://github.com/jpt/barlow ; https://github.com/adobe-fonts/source-serif ; https://github.com/IBM/plex | 2026-10-11 | Verified |
| V24 | Atkinson Hyperlegible Next: low-vision legibility; OFL 1.1 in the Google Fonts repo | https://www.brailleinstitute.org/freefont/ ; https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext | 2026-10-11 | Verified. "Over 150 languages": **Unverified** |
| V25 | WCAG 2.2 Recommendation 5 Oct 2023, current version 12 Dec 2024; 4.1.1 removed; 2.2 conformance implies 2.1 and 2.0 | https://www.w3.org/TR/WCAG22/ ; https://www.w3.org/WAI/standards-guidelines/wcag/ | 2026-10-11 | Corrected (note gave 12 Dec 2024 only) |
| V26 | SC numbers and levels 1.3.1, 1.4.3, 1.4.6, 1.4.10, 1.4.11, 1.4.12, 2.3.3, 2.4.7, 2.4.11–2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8, 4.1.3 | https://www.w3.org/TR/WCAG22/ | 2026-10-11 | Verified. Others in 6.8 (†): **Unverified** |
| V27 | WCAG 3 is a Working Draft; meet 2.2 now | https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ | 2026-10-11 | Verified |
| V28 | Ontario: public websites WCAG 2.0 AA (except 1.2.4, 1.2.5); not intranets or extranets; duty on the controlling organization | https://www.ontario.ca/page/how-make-websites-accessible | 2026-10-11 | Verified (scope added by fact-check) |
| V29 | Colleges and universities are designated public sector organizations (O. Reg. 191/11) | https://www.ontario.ca/page/accessibility-rules-public-sector-organizations | 2026-10-11 | Verified. Whether duties attach to this tool: open (PQ-60) |
| V30 | UW Policy 58 s. 7: WCAG 2.0 AA "for all Public Websites" | https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policies/policy-58-accessibility | 2026-10-11 | Verified (fact-check) |
| V31 | UW accessibility pages name no WCAG version | https://uwaterloo.ca/accessibility/ ; https://uwaterloo.ca/digital-accessibility/ | 2026-10-11 | Verified |
| V32 | 1.4.3 thresholds; ratios not rounded (4.499 fails) | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | 2026-10-11 | Verified |
| V33 | 1.4.10: 320 CSS px = 1280 px at 400% | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 2026-10-11 | Verified |
| V34 | 4.1.3 roles; `role=alert` overuse listed as a failure (no ID yet) | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | 2026-10-11 | Verified (nuance) |
| V35 | 3.3.8: paste must work, autofill not blocked; split six-box input is failure F109 | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | 2026-10-11 | Verified |
| V36 | `forced-colors` Baseline since Sept 2022; small tweaks only; `box-shadow` forced to `none` | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors | 2026-10-11 | Verified |
| V37 | axe-core 4.14.0 MPL-2.0; "on average 57% of WCAG issues"; "incomplete" results | https://github.com/dequelabs/axe-core | 2026-10-11 | Verified (vendor claim) |
| V38 | GDS 2017: all tools 71% of 143 barriers; best single 41% only counting manual prompts, 37% on errors and warnings | https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/ | 2026-10-11 | Corrected (nuance) |
| V39 | Playwright: automation "cannot detect all types of WCAG violations"; fingerprints | https://playwright.dev/docs/accessibility-testing | 2026-10-11 | Verified |
| V40 | axe tags not cumulative; no `wcag22a` tag | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | 2026-10-11 | Verified |
| V41 | `@axe-core/playwright` 4.13.0 MPL-2.0; bundled axe-core version | https://registry.npmjs.org/@axe-core/playwright/latest | 2026-10-11 | Version verified; bundled version **Unverified** |
| V42 | jsx-a11y 6.10.2 peer ESLint up to 9; ESLint 10.12.0; issue #1075 open | https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest ; https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075 | 2026-10-11 | Verified |
| V43 | Biome `a11y` group: 37 rules | https://biomejs.dev/linter/javascript/rules/ | 2026-10-11 | Verified |
| V44 | WebAIM #10: JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7% (self-selected); newer survey | https://webaim.org/projects/screenreadersurvey10/ | 2026-10-11 | Verified; newer survey **Unverified** |
