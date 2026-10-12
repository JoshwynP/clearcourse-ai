# Research branch D1: Design system and accessibility approach (§8, Q15)

> **Status:** DRAFT v1, 2026-10-11. Research and planning only. **Nothing here is a requirement.**
> Requirements live in `P:/code/clearcourse-ai/CONTRIBUTING.md` and are cited as §N.N. Every
> recommendation is a **PROPOSAL** for the owner to approve through an ADR (CONTRIBUTING §1, §12,
> §14). If this note conflicts with CONTRIBUTING.md, CONTRIBUTING.md wins.
>
> **Evidence rule:** every fact carries an official URL and "(checked 2026-10-11)" and is collected
> in the Verification log (§8). Anything not confirmed on a current official page is marked
> **Unverified**. Conclusions drawn from verified facts are marked **(inference)**.

**Summary (PROPOSAL):** shadcn/ui source + Tailwind CSS v4 on **React Aria** primitives (Base UI
fallback, decided by a short spike because the choice is irreversible after init). Use our own
three-layer CSS-custom-property tokens, with admin brand colours passed through a server-side
WCAG contrast guardrail. Use open-licence, self-hosted fonts (Source Serif 4 + IBM Plex Sans, or
Atkinson Hyperlegible Next); no UW or D2L fonts, logos or components. Borrow GOV.UK patterns for
tags, question pages and error summaries. Propose **WCAG 2.2 AA** for Q15. Run axe via Playwright
in CI, plus a manual NVDA/VoiceOver/zoom/forced-colours checklist, and be honest that automation
catches only part of the problems. The 13 proposed new open questions are in section 6.2 of this note.

---

## 1. Question(s) and what they block

**Primary open question: Q15** (§13): "Accessibility conformance target (e.g. WCAG 2.2 AA)". It
blocks §8. Because §15 item 5 makes "meets the design and accessibility requirements (§8)" part of
the definition of done for **every** change, Q15 in practice blocks sign-off on every UI change, not
just a design phase **(inference)**.

**Related requirements this branch relies on (all from CONTRIBUTING):**

| Requirement | Section | What the design system must support |
|---|---|---|
| "Very minimal, simple, calm and credible academic design"; LEARN / Brightspace / UW flow as inspiration | §8 | Visual language and information architecture |
| Compact information cards, plain language, strong hierarchy, university-appropriate typography | §8 | Card component, type scale, content style guide |
| Neutral colours with **configurable institutional branding** | §8, §4 | Runtime theming via tokens, set by admins |
| Everything institution-specific admin-configurable, "without code changes" | §4 | Branding cannot be compiled into CSS only |
| Progressive disclosure; clear status labels; explicit anonymity explanations | §8 | Disclosure, status-badge and notice components |
| Card states draft / published / archived / superseded | §7.4 | Status labels that do not rely on colour |
| "Assignment rules override the Course AI Card where they differ. The differences must be shown visibly." | §7.4, §10 | An override/diff pattern |
| Guided wizard and manual editor; preview student view | §7.6 | Accessible multi-step form |
| Presentation mode content rules | §7.8 | Large, projector-legible layout that renders only permitted fields |
| Exactly three non-gamified levels: No Record · Contributor · Sustained Contributor | §7.9, §8 | Neutral level display, no badges/streaks |
| Verbatim pre-share text | §7.10 | Confirmation dialog that shows the text exactly |
| "Accessible in-app and email notifications" | §7.13 | Live regions, notification centre |
| Avoid AI-generated aesthetics, robots, surveillance motifs, leaderboards, streaks, competitive badges, attention-maximizing patterns | §8, §3 | Negative design constraints |
| Accessibility required | §8 `[src p.1, p.16]` | Process + tooling |

**Other open questions this branch touches but must not close:** Q1 (admin scope, which bounds
the branding editor, §7.15), Q2 (milestone-1 feature list, which bounds the screen inventory),
Q3 (stack; a component library choice presumes React), Q13 (essential notifications), Q19 (i18n,
which affects font choice, text expansion and RTL readiness).

**What this branch does NOT decide:** the conformance target itself (Q15 is the owner's), any copy
text (only placeholders; real copy must come from the spec or the owner), the stack (Q3).

## 2. Options considered

### 2.1 Component foundation (assumes a React stack; Q3 is open. If Q3 picks a non-React stack, only
the BrightspaceUI row and the pattern sources in 2.2 still apply)

All versions below are from the npm registry `latest` tag (checked 2026-10-11). Publish dates are
**inferred** from npm's internal timestamp and are marked as such in §8.

| Option | What it is | Licence | Status (checked 2026-10-11) | Accessibility claim (official wording) | Branding at runtime (§4) | Look-risk for §8 "AI-generated aesthetics" | Verdict |
|---|---|---|---|---|---|---|---|
| **shadcn/ui + Tailwind CSS** | Copy-in component source + CLI, "not a component library"; primitives now Base UI (default since July 2026), Radix or React Aria | MIT (shadcn), MIT (Tailwind 4.3.3) | Very active; 125.4k stars; changelog entries every month to Sept 2026 | Inherits from the chosen primitive library (see rows below) | Native: semantic CSS variables (`--primary`, `--background`, …) in OKLCH, mapped via Tailwind `@theme inline` | **High** if left at defaults (neutral base, `--radius: 0.625rem`, stock spacing). Mitigated because we own every file | **Recommended foundation (proposal)**, with mandatory customisation (§5.3) |
| Base UI (`@base-ui/react` 1.9.0) | Unstyled primitives from the MUI org; shadcn's default foundation | MIT | Active; 1.9.0 published ~2026-10-09 (inferred) | Accessibility page exists; homepage makes no specific claim (**Unverified** detail) | Unstyled; any CSS | None by itself | Acceptable primitive under shadcn |
| Radix Primitives (`radix-ui`) | Unstyled primitives, maintained by WorkOS | MIT | Releases 2026-06-06, 06-30, 07-06, 07-20; 128 open issues | "follow the WAI-ARIA authoring practices guidelines"; "basic keyboard support"; "tested in a wide selection of modern browsers and commonly used assistive technologies" (no AT named) | Unstyled; any CSS | None by itself | Acceptable primitive under shadcn; not the default any more |
| **React Aria Components** (Adobe) | Unstyled hooks + components, 50+ components | Apache-2.0 | 1.22.1 published ~2026-10-09 (inferred); 517 open issues across the monorepo | "extensively tested using many popular screen readers and devices" (AT not named); APG semantics; touch screen-reader support; "translations in over 30 languages", RTL | Unstyled; data-attribute states; Tailwind plugin | None by itself | **Strongest primitive on stated a11y + i18n (Q19).** Recommended primitive choice *inside* shadcn (proposal), see §5.1 |
| Headless UI (Tailwind Labs) | Unstyled components; 16 components (no toast, no tooltip, no date picker) | MIT | React 2.2.10 published ~2026-04-07 (inferred); Vue docs point to v1 | "fully accessible" (no testing detail) | Unstyled | None | Too small a component set for the wizard/editor/board (inference). Not recommended |
| Radix Themes 3.3.0 | Pre-styled Radix | MIT | 3.3.0 published ~2026-01-31 (inferred) | Steps 11–12 "Accessible text"; no guarantee once tokens are overridden | Fixed set of 26 named accent scales; brand colours by overriding step 9 in CSS or pasting generated CSS | Medium: recognisable Radix look | Runtime admin branding is awkward (generated CSS, not one token). Not recommended |
| Mantine 9.7.2 | Full styled library + hooks | MIT | Very active; published ~2026-10-11 (inferred) | (not checked in depth) | `primaryColor` must be a key of a 10-shade palette; `autoContrast` exists | Medium: recognisable Mantine look | Good DX; **credible alternative** if the owner prefers a batteries-included kit. Not Tailwind-based (CSS modules/PostCSS) |
| MUI Material UI 9.5.0 | "implements Google's Material Design" (MD2) | MIT core (MUI X Pro/Premium are commercial: **Unverified**, not on the page fetched) | Very active | Accessibility page exists (not checked) | Theme object; Emotion (optional peer) or Pigment CSS | **High**: Material Design reads as "Google app", not "calm academic" (inference) | Not recommended for §8 |
| **BrightspaceUI/core** 3.331.1 (D2L) | Lit web components "for building Brightspace applications" | Apache-2.0 | Very active (9,575 commits; semantic-release) | "accessible"; runs aXe tests | Brightspace's own theme | **Trademark/affiliation risk** (see §3.4) | **Do not use as UI kit (proposal).** Study as a pattern reference only |

### 2.2 Pattern and content sources (not component kits)

| Source | Licence | Use for ClearCourse | Verdict |
|---|---|---|---|
| GOV.UK Design System / GOV.UK Frontend v6.5.0 | Code MIT; documentation Crown copyright, OGL v3.0 | Plain-language question pages, error summary, tags (status labels), "one thing per page" wizard, calm visual tone | **Use as a pattern source (proposal).** Do not copy the GOV.UK crown, brand or GDS Transport typeface; re-implement patterns in our own components |
| USWDS v3.14.0 | Mostly CC0 public domain; some parts under LICENSE.md | Form, alert, step-indicator, banner patterns; Public Sans | Pattern source. Do not reuse the US government banner (inference: implies a federal site) |
| W3C WAI-ARIA APG | W3C document licence (**Unverified**: licence not checked) | Keyboard and ARIA behaviour reference for every widget | Normative reference for tests |
| LEARN / Brightspace (observed UI) | Proprietary | Information-architecture *inspiration* only (§8) | Never copy assets, icons, colours or fonts (§3.4) |

### 2.3 Accessibility conformance target options (Q15; owner decides)

| Option | Basis | Pros | Cons |
|---|---|---|---|
| A. WCAG 2.0 AA (minus 1.2.4, 1.2.5) | Ontario IASR s.14 for public websites | Matches the Ontario legal floor | Misses 2.1/2.2 criteria (reflow, target size, status messages, focus not obscured) that matter for mobile and the board |
| **B. WCAG 2.2 AA** | Current W3C Recommendation (12 Dec 2024); W3C says meeting 2.2 is "the best way to prepare for WCAG 3" | Covers A's criteria except 4.1.1 Parsing (removed in 2.2; W3C says 2.0/2.1-bound authors "may need to continue to test and report 4.1.1"); testable with axe tags `wcag2a`…`wcag22aa` | Slightly more work: 2.5.8 target size, 3.3.8 accessible authentication (relevant to the sign-in flow, Q4) |
| C. WCAG 2.2 AA + selected AAA (e.g. 2.4.13 Focus Appearance, 1.4.6 Enhanced contrast for presentation mode) | B + extras | Strong fit for projector use (§7.8) | Must be scoped per criterion, or it becomes unmeasurable |
| D. WCAG 3 | Working Draft only, Sept 2026 | n/a | Not a standard; "not expected to be a completed W3C standard for a few more years" |

**Proposal for Q15 (owner decides):** option **B, WCAG 2.2 Level AA** as the conformance target, plus
**two named AAA stretch criteria** (2.4.13 Focus Appearance; 1.4.6 Contrast Enhanced for
presentation mode only). Whether WCAG 2.2 AA also satisfies UW's own procurement or policy
requirements is **Unverified** (no UW page fetched states a WCAG level), so it is a proposed new open
question (§6).

## 3. Evidence

All facts below were checked 2026-10-11 on the URL given. Full list in §8.

### 3.1 shadcn/ui and its primitives

- shadcn/ui says "This is not a component library. It is how you build your component library." It
  "hands you the actual component code" — https://ui.shadcn.com/docs (checked 2026-10-11). MIT —
  https://github.com/shadcn-ui/ui (checked 2026-10-11).
- `components.json` schema: `style` enum has 26 values: `default`, `new-york`, and
  `radix-|base-|aria-` × eight styles (`vega, nova, maia, lyra, mira, luma, sera, rhea`). There is
  also an `rtl` boolean — https://ui.shadcn.com/schema.json (checked 2026-10-11). The changelog
  lists "July 2026 Base UI as the Default" and a component offered for "Base UI, React Aria, and
  Radix across all eight styles" — https://ui.shadcn.com/docs/changelog (checked 2026-10-11). So
  the `aria-*` styles are React Aria based **(inference)**. Whether *every* shadcn component has a
  React Aria variant is **Unverified**.
- `style`, `tailwind.baseColor` and `tailwind.cssVariables` "cannot be changed after
  initialization" — https://ui.shadcn.com/docs/components-json (checked 2026-10-11). **This makes
  the primitive choice (Radix vs Base UI vs React Aria) a day-one decision (inference).**
- Theming uses semantic CSS custom properties in OKLCH (`--background`, `--primary`,
  `--primary-foreground`, …, `--radius`), exposed to Tailwind via `@theme inline`. Default neutral
  values include `--radius: 0.625rem`, `--primary: oklch(0.205 0 0)` —
  https://ui.shadcn.com/docs/theming (checked 2026-10-11).
- Radix Primitives: MIT, "Maintained by @workos", 128 open issues —
  https://github.com/radix-ui/primitives ; releases dated 2026-06-06, 06-30, 07-06, 07-20 —
  https://www.radix-ui.com/primitives/docs/overview/releases ; a11y wording "follow the WAI-ARIA
  authoring practices", "basic keyboard support", "tested in a wide selection of modern browsers
  and commonly used assistive technologies" (no AT named) —
  https://www.radix-ui.com/primitives/docs/overview/accessibility (all checked 2026-10-11).
- React Aria: "extensively tested using many popular screen readers and devices"; APG semantics;
  "translations in over 30 languages … right-to-left layout"; "style-free" —
  https://react-aria.adobe.com/ ; Apache-2.0 — https://github.com/adobe/react-spectrum ; version
  1.22.1 — https://registry.npmjs.org/react-aria-components/latest (all checked 2026-10-11).
- Base UI `@base-ui/react` 1.9.0, MIT; "shadcn/ui uses Base UI as its unstyled foundation" —
  https://base-ui.com/react/overview/quick-start , https://registry.npmjs.org/@base-ui/react/latest
  (checked 2026-10-11).

### 3.2 Other kits

- Headless UI v2.x, 16 components listed, MIT, React 2.2.10 — https://headlessui.com/ ,
  https://registry.npmjs.org/@headlessui/react/latest (checked 2026-10-11).
- Radix Themes 3.3.0: 26 named accent scales; brand colours by "override **step 9**" or by pasting
  generated CSS; no contrast guarantee stated for overrides —
  https://www.radix-ui.com/themes/docs/theme/color (checked 2026-10-11).
- Mantine 9.7.2, MIT; `primaryColor` "must be a key of `theme.colors`", 10-shade tuples —
  https://mantine.dev/theming/colors/ , https://registry.npmjs.org/@mantine/core/latest (checked
  2026-10-11).
- MUI Material UI 9.5.0: "implements Google's Material Design … supports Material Design 2"; Emotion
  optional peer — https://mui.com/material-ui/getting-started/ ,
  https://registry.npmjs.org/@mui/material/latest (checked 2026-10-11).

### 3.3 Pattern sources

- GOV.UK Frontend code MIT; docs Crown copyright under OGL v3.0 —
  https://github.com/alphagov/govuk-frontend ; v6.5.0 released 27 Aug 2026 —
  https://design-system.service.gov.uk/ (checked 2026-10-11). Restrictions on the GOV.UK crown and
  GDS Transport typeface for non-GOV.UK services: **Unverified** (the typography page returned 404);
  we avoid them regardless.
- GOV.UK Tag: "Tags are only used to indicate a status"; "Do not make a tag interactive"; "Use
  adjectives … not verbs"; "Do not use colour alone"; sentence case; "start with the smallest number
  of statuses" — https://design-system.service.gov.uk/components/tag/ (checked 2026-10-11).
- GOV.UK question pages: "one question per question page"; back link, page heading, Continue
  button; "Start by testing your form without a progress indicator" —
  https://design-system.service.gov.uk/patterns/question-pages/ (checked 2026-10-11).
- GOV.UK error summary: top of `main`, keyboard focus moved to it, links to fields, "Error: " title
  prefix, `role="alert"` on an inner wrapper to fix a JAWS issue —
  https://design-system.service.gov.uk/components/error-summary/ (checked 2026-10-11).
- USWDS v3.14.0; "in the worldwide public domain … CC0 1.0" except parts in LICENSE.md —
  https://designsystem.digital.gov/ , https://github.com/uswds/uswds (checked 2026-10-11).

### 3.4 D2L / Brightspace

- BrightspaceUI/core: "A collection of accessible, free, open-source web components for building
  Brightspace applications"; Apache-2.0; author D2L Corporation; depends on `lit` ^3,
  `ifrau`, `@brightspace-ui/lms-context-provider` — https://github.com/BrightspaceUI/core ,
  https://registry.npmjs.org/@brightspace-ui/core/latest (checked 2026-10-11). D2L's "Daylight
  Design System" site redirects to a D2L login — https://daylight.d2l.dev/ (checked 2026-10-11).
- D2L trademark guidance: "Brightspace" and "D2L" are registered marks; "You may not use the
  trademarks in the name of your … product, service, app"; you may not use them "in a way that
  implies affiliation with, or sponsorship, endorsement or approval by D2L". The page does not
  address look-and-feel, but lists US design patents (e.g. USD733167) —
  https://www.d2l.com/legal/trademarks/ (checked 2026-10-11).
- **Assessment (inference, not legal advice):** Apache-2.0 allows code reuse, but Apache-2.0 §6
  grants no trademark rights (licence text not re-fetched: **Unverified** quote). An app built from
  Brightspace's own components, with its default theme, would look like a Brightspace tool.
  ClearCourse links *to* LEARN (§4, §7.4), so users could reasonably think it is an official D2L or
  UW product. That conflicts with D2L's affiliation rule and with §4 (other institutions must be
  supportable). It also adds a second component model (Lit web components) next to React.

### 3.5 UW brand

- UW brand guidelines apply to "University staff, faculty, partners and vendors involved in
  developing Waterloo marketing" — https://uwaterloo.ca/brand/ (checked 2026-10-11).
- UW brand typefaces: Bureau Grotesque (headlines), Le Monde Livre (body), Typ1451 (captions);
  "centrally licensed for WCMS responsive websites"; "If you need access to the brand fonts, contact
  Creative Studio". Free alternative named: **Barlow Condensed** (Google Fonts) —
  https://uwaterloo.ca/brand/how-express-our-brand/typography (checked 2026-10-11).
- Logo: "Any modification or improper use of the logo will not be permitted"; shield modifications
  need pre-authorization; seal reserved for ceremonial use; exceptions only in writing from
  University Relations — https://uwaterloo.ca/brand/how-express-our-brand/waterloo-logo (checked
  2026-10-11). Nothing found on third-party apps using the logo. **Unverified**: whether an
  unaffiliated app may use the logo at all.
- UW colours: Gold level 3 `#FED34C` (print primary) and level 4 `#EAAB00` (digital primary);
  **the only listed accessible pairing for every gold level is black `#000000`** —
  https://uwaterloo.ca/brand/how-express-our-brand/colour (checked 2026-10-11). This is a concrete
  case for automatic foreground selection (§5.4): a naive "white text on brand colour" rule would
  fail with UW gold **(inference)**.

### 3.6 Fonts (open licences)

- Barlow: "licensed under the SIL Open Font License, Version 1.1"; "54 styles in three widths" (the
  README does not name the widths) — https://github.com/jpt/barlow (checked 2026-10-11).
- Source Serif 4: OFL-1.1, variable, optical sizes — https://github.com/adobe-fonts/source-serif
  (checked 2026-10-11).
- IBM Plex (Sans, Serif, Mono, Sans Condensed): OFL — https://github.com/IBM/plex (checked
  2026-10-11).
- Atkinson Hyperlegible Next (Braille Institute, 2025): "designed to improve legibility and
  readability for individuals with low vision"; 7 weights + variable; "Free for personal use and all
  commercial applications" under the Institute's own EULA — https://www.brailleinstitute.org/freefont/
  (checked 2026-10-11). **Unverified**: whether the Google Fonts copy is under OFL (Google Fonts
  pages did not render for WebFetch).

### 3.7 Standards and law

- WCAG 2.2: "W3C Recommendation 12 December 2024"; new criteria include 2.4.11 Focus Not Obscured
  (AA), 2.5.7 Dragging Movements (AA), 2.5.8 Target Size (Minimum) (AA), 3.2.6 Consistent Help (A),
  3.3.7 Redundant Entry (A), 3.3.8 Accessible Authentication (Minimum) (AA); 4.1.1 Parsing
  "Obsolete and removed"; authors bound by 2.0/2.1 "may need to continue to test and report 4.1.1"
  — https://www.w3.org/TR/WCAG22/ (checked 2026-10-11).
- WCAG 3: Working Draft (Sept 2026); "The best way to prepare for WCAG 3 … is to meet WCAG 2.2
  success criteria now" — https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ (checked
  2026-10-11).
- Ontario: public websites must meet "WCAG 2.0 Level AA" except 1.2.4 and 1.2.5, under O. Reg.
  191/11 (AODA), for "a designated public sector organization" or organizations with 50+ employees
  — https://www.ontario.ca/page/how-make-websites-accessible (checked 2026-10-11). Whether UW counts
  as a designated public sector organization, and whether the IASR's educational-institution
  sections apply to this app: **Unverified**.
- UW accessibility pages name Policy 58 but state no WCAG level —
  https://uwaterloo.ca/accessibility/ , https://uwaterloo.ca/accessibility/guides-and-resources/aoda-legislation
  (checked 2026-10-11). Policy 58 itself was not fetched: **Unverified**.
- Contrast: 4.5:1 normal text, 3:1 large text (≥18pt or ≥14pt bold ≈ 24px / 18.5px); "should not
  be rounded (e.g., 4.499:1 would not meet the 4.5:1 threshold)" —
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (checked 2026-10-11).
- Reflow 1.4.10 (AA): 320 CSS px wide "is equivalent to a starting viewport width of 1280 CSS
  pixels wide at 400% zoom" — https://www.w3.org/WAI/WCAG22/Understanding/reflow.html (checked
  2026-10-11).
- Status messages 4.1.3 (AA): `role=status`, `role=alert`, `role=log`; failure: `role="alert"` on
  "content which is not important and time-sensitive" —
  https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html (checked 2026-10-11).
- `forced-colors`: Baseline widely available since Sept 2022; authors should "not" build a separate
  design, only "small tweaks"; `box-shadow` forced to `none` —
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors (checked 2026-10-11).

### 3.8 Testing tools and their limits

- axe-core 4.14.0, MPL-2.0; rules for "WCAG 2.0, 2.1, 2.2 on level A, AA and AAA"; Deque's claim:
  "you can find on average 57% of WCAG issues automatically"; "zero false positives (bugs
  notwithstanding)" — https://github.com/dequelabs/axe-core ,
  https://registry.npmjs.org/axe-core/latest (checked 2026-10-11). The 57% is the **vendor's own
  figure**; its method is not described on that page.
- GDS 2017 test of 10 free tools on 143 known barriers: best single tool 41%, all tools combined
  71%, 42 barriers missed by every tool; a commenter warned complex widgets were absent —
  https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/
  (checked 2026-10-11). Old, but independent.
- Playwright: `@axe-core/playwright` 4.13.0 (MPL-2.0); "automated testing cannot detect all types of
  WCAG violations"; recommends "a combination of automated testing, manual accessibility
  assessments, and inclusive user testing" — https://playwright.dev/docs/accessibility-testing ,
  https://registry.npmjs.org/@axe-core/playwright/latest (checked 2026-10-11).
- eslint-plugin-jsx-a11y 6.10.2 (MIT), last published ~2024-10-26 (inferred); peer `eslint`
  `^3 … || ^9`; ESLint is at **10.12.0**; issue #1075 "Support for ESLint v10" open since
  2026-02-09; PRs #1079/#1081 open; issue #1094 "is this project unmaintained?" closed 2026-08-14 —
  https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest , https://registry.npmjs.org/eslint/latest ,
  https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues?q=eslint+10 (checked 2026-10-11).
  **Risk:** with ESLint 10 the plugin is outside its declared peer range. Alternative: Biome's
  `a11y` group (37 rules) — https://biomejs.dev/linter/javascript/rules/ (checked 2026-10-11).
- Screen-reader usage (WebAIM survey #10, Dec 2023–Jan 2024, 1,539 responses): JAWS 40.5%, NVDA
  37.7%, VoiceOver 9.7% primary desktop; top combinations JAWS+Chrome 24.7%, NVDA+Chrome 21.3% —
  https://webaim.org/projects/screenreadersurvey10/ (checked 2026-10-11). Whether a newer survey
  exists: **Unverified**. The sample is self-selected, not UW students.

## 4. Privacy implications (§6)

A design system is mostly presentation, but several UI choices can break §6.2 ("Identity-bearing
information and anonymous-content text must not appear together in any application log,
analytics event, error report …") or weaken anonymity in practice. Each item is a **proposed
design rule** for the owner, not a requirement.

| # | Risk | Proposed rule | Cites |
|---|---|---|---|
| P1 | Third-party font or icon CDNs (e.g. hosted web-font services) receive every page view with the user's IP and the page URL, which can include a question ID | Self-host all fonts and icons from our own origin. No third-party requests from anonymous-content pages | §6.2 (inference: a URL + IP pair is a log outside our control) |
| P2 | Front-end error tools with **session replay** or DOM snapshots would capture the signed-in user's name (header) and anonymous text (board) in one report | No session replay. Error reports carry no DOM text and no user identifier on content routes. Belongs to the observability branch; flagged here because UI components emit these events | §6.2, §3 last row |
| P3 | Avatars, initials, colour-coded author chips or "You" badges on anonymous posts | Anonymous content is rendered with **no author affordance at all** for every role. A "posted by you" indicator for the author depends on how Q9 is solved; do not design it until Q9 is decided | §6.2, §6.3, Q9 |
| P4 | Presence, "typing…" indicators, read receipts, "seen by" lists | Never build them. They are attention-maximising (§8) and leak timing | §8, §3 |
| P5 | Presentation mode reusing the moderator view and hiding fields with CSS | Presentation mode gets its **own view model with an allowlist** of the six "Display" fields from §7.8. Hidden-by-CSS is not acceptable, because the data would still be in the DOM | §7.8, §10 |
| P6 | Exact timestamps on anonymous posts in small courses can help guess an author ("posted 2 min after the lecture ended") | Possible mitigation: coarse relative times ("this week"). This is a **new open question**, because the spec does not say which timestamps are shown (§6 below) | §6.1, §6.2 (inference) |
| P7 | Notification text that combines a name and anonymous content, e.g. email "Hi Alex, someone answered: <question text>" | The notification component must not take both identity and content props in one template; the copy will need owner review. Q6/Q13 cover delivery and essential-ness | §6.2, §7.13 |
| P8 | Visual-regression screenshots and axe JSON attachments in CI artefacts | Seed data only, never real users; artefacts must not mix real names and real content | §6.2, §9 |
| P9 | Admin branding editor uploads (logo images) | Strip metadata, serve from our origin; no external image URLs (an external URL logs every viewer) | §4, §6.2 (inference) |
| P10 | "Follow a question" and "Still unclear" are per-student state about a specific question | The UI can be designed, but **where that state lives is a Q9 matter**. Flag to the privacy branch; the design system must not assume an implementation | §7.7, Q9 |

**Anonymity explanations (§8 "explicit anonymity explanations")** are a privacy *communication*
duty. They must not over-promise. §6.2 requires the "limitations of anonymity" to be documented
(Q8). So the in-context explanation should link to that threat-model summary and not make claims
of its own. Exact copy is **not written here** (it must not be invented; it needs the owner, and it
depends on Q8, Q9 and whether deanonymization is ever enabled per §6.4).

## 5. Recommendation (PROPOSAL, for the owner to approve via ADR)

### 5.1 Foundation

1. **shadcn/ui (copy-in source) + Tailwind CSS v4**, with all colours, radii, spacing and type set
   by our own design tokens (CSS custom properties). It fits the owner's "well-documented,
   mainstream" constraint. It costs nothing to run (no hosted service; MIT). It also matches the
   advisory stack (§12) without depending on it: if Q3 picks a different React framework, the
   components still work (shadcn lists Next.js, Vite, React Router, Astro, TanStack Start).
2. **Primitive base: React Aria (`aria-*` style) as first choice, Base UI (`base-*`, shadcn's
   default) as fallback.** The reasons for React Aria are that it is the only option that publicly
   claims screen-reader testing across devices, built-in translations and RTL (relevant if Q19 says
   yes), and touch screen-reader support. **Gate:** because `style` "cannot be changed after
   initialization", do a short spike *before* the ADR. Confirm that every component needed by the milestone-1
   screens (Appendix B in section 7 of this note) exists in the `aria-*` variant. If any is missing, use `base-*`. This decision is the
   owner's.
3. **Not chosen (proposal):** MUI (Material look conflicts with §8 calm/academic, inference);
   Radix Themes (fixed palette makes admin branding awkward, §4); Headless UI (too few components);
   BrightspaceUI/core (affiliation/trademark risk, §3.4; second component model). **Mantine** is
   the credible alternative if the owner prefers a pre-styled kit over owning component source.
4. **Patterns from GOV.UK / USWDS, not their code or brand.** Use their published research on tags,
   question pages, error summaries and plain language. Implement it in our own components.

### 5.2 What must be customised so it does not look "AI-generated" (§8)

§8 says to avoid "AI-generated aesthetics". It does not define them. The list below is the
**author's judgement (inference)** of what makes a stock shadcn/Tailwind app recognisable. The owner
should treat it as a proposal and review it visually.

| Stock tell (inference) | Proposed change |
|---|---|
| Neutral/zinc grey scale with near-black `--primary` and `--radius: 0.625rem` on everything | Own neutral ramp, slightly warm or cool, tuned for paper-like calm. One brand accent from admin config. Smaller radii (e.g. 2–4px) on cards and inputs. Square tags |
| Default system/Geist/Inter-style sans for everything | A serif + sans pairing (§5.5) for an academic voice. Real typographic scale with tight headings |
| Purple-to-blue gradients, glassmorphism, glowing borders, sparkle/"magic" icons, robot or brain motifs | None. No gradients, no sparkle icons (§8 forbids robots and AI aesthetics). Flat surfaces, 1px borders |
| Big hero sections, centred marketing copy, oversized empty cards | Dense, left-aligned, LMS-like layout. Content first. Compact cards (§8) |
| Drop shadows on every card, hover lift animations | Border-defined cards, no lift. Motion only for state changes, and none under `prefers-reduced-motion` |
| Emoji in headings and toasts, exclamation-mark microcopy | Plain-language, sentence-case copy (GOV.UK tag guidance uses sentence case) |
| Stock lucide icon on every label | Icons only where they help recognition, always with a text label |
| Dashboard "stat tiles" with big numbers and trend arrows | Avoid for participation (§7.9, §8 non-gamified). Analytics (§7.16) as plain tables with thresholds |

### 5.3 Token architecture

Three layers, all CSS custom properties:

1. **Reference tokens** (fixed in code): neutral ramp, spacing scale, type scale, radii, focus
   ring width, motion durations. Not admin-editable.
2. **Brand tokens** (admin-configurable, §4): at most `brand.accent`, an optional
   `brand.accentAlt`, logo, institution name. Stored as data and validated server-side. Injected as
   a small `<style>` block on `:root` at render time, so there is no rebuild and "no code changes"
   (§4).
3. **Semantic tokens** (what components use): `--surface`, `--text`, `--text-muted`, `--border`,
   `--accent`, `--on-accent`, `--focus-ring`, `--status-*`, `--override-*`, mapped to shadcn's names
   (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--ring` …) so stock
   components keep working.

Components never read brand tokens directly. They only read semantic tokens. So a bad brand
colour can only reach the UI through the guardrail in 5.4.

### 5.4 Contrast guardrails for admin branding (§4, §8, WCAG 1.4.3 / 1.4.11)

Proposed server-side validation when an admin saves a brand colour (pseudocode, illustrative):

```text
on save(brand.accent):
  parse colour (hex / oklch) -> sRGB
  L = relative luminance per WCAG definition
  onAccent = whichever of {near-black, white} gives the higher contrast ratio with accent
  require contrast(onAccent, accent) >= 4.5           # text on filled buttons (1.4.3)
  require contrast(accent, surface) >= 3.0            # accent as border/icon/focus on page (1.4.11)
  accentText = accent if contrast(accent, surface) >= 4.5
               else darken accent in OKLCH lightness until >= 4.5   # for links/headings
  require contrast(focusRing, surface) >= 3.0 and focus ring is not the only cue
  # no rounding: 4.499 fails (WCAG Understanding 1.4.3)
  if any check fails: block save, show which pairing failed, offer the auto-adjusted value
  store: accent, onAccent, accentText (derived), and the computed ratios for the audit trail
```

**UW worked example (inference from the verified palette):** UW gold `#FED34C` lists only black as
its accessible pairing. The guardrail would pick a dark `onAccent` for filled buttons, and derive
a darker `accentText` for links on white, rather than putting gold text on white. Ratios are not
quoted here because they were not computed with a verified tool. The implementation should
unit-test against known pairs.

Whether admin brand changes are audited is part of **Q14**. Whether admins may override a failed
check is **not decided**. The proposal is "no override", but it is the owner's call (see section 6 of this
note).

### 5.5 Typography (§8 "university-appropriate typography")

- **Do not** use UW's brand fonts (Bureau Grotesque, Le Monde Livre, Typ1451). They are "centrally
  licensed for WCMS responsive websites", and access goes through UW Creative Studio. **Do not**
  use UW logos, shield, seal or wordmark without written permission (§3.5). Whether an
  unaffiliated prototype may even show "University of Waterloo" in its chrome is a proposed new
  open question.
- **Proposed default pairing (open licences, self-hosted, P1):**
  - Headings: **Source Serif 4** (OFL-1.1, variable, optical sizes). It reads as academic, not
    startup.
  - Body and UI: **IBM Plex Sans** (OFL), or **Atkinson Hyperlegible Next** if the owner prioritises
    low-vision legibility (Braille Institute EULA; OFL status **Unverified**). Check the EULA before
    adopting it.
  - Optional UW-flavoured display face: **Barlow Condensed** (OFL-1.1). It is UW's own named free
    alternative, so a UW theme could use it for short headings without using proprietary fonts.
- **Make the font family a brand token** (a choice from a fixed, pre-vetted list of self-hosted
  families, not free-text URLs, P1/P9). Other institutions can then pick a face without code
  changes (§4).
- Minimum body size, line length and the scale are design decisions for the ADR, not
  requirements. Proposed starting point: 16px body minimum, about 70 characters per line, and 1.5
  line height. WCAG 1.4.12 Text Spacing is the testable constraint.
- **Language coverage** depends on Q19. IBM Plex has separate script packages; Atkinson Next lists
  "over 150 languages" (per Braille Institute).

### 5.6 Information architecture inspired by LEARN / Brightspace / UW (§8), without copying

This proposal borrows familiar LMS **structure** (generic conventions). It does not use Brightspace
assets, icons, colours, fonts, names, or layouts traced from screenshots (§3.4).

- **Global header:** institution name/logo (brand token), product name "ClearCourse AI", course
  switcher, notifications, account menu. Below it, a **course navbar** with: Course home · Course
  AI Card · Assignments · Questions · (instructor/TA) Moderation · Settings. The tabs shown depend
  on role (§5).
- **Breadcrumbs** on every page below course home, e.g. `My courses › ECE 100 › Assignments ›
  Lab 3 › AI Card`. Use `nav aria-label="Breadcrumb"` with `aria-current="page"` (APG pattern).
- **Course home:** compact cards (§8) for the Course AI Card summary, upcoming assignments with
  their AI-permitted status, recently answered questions, and (students only) a private
  participation panel. Each card has one heading, one short summary and one link. No hero section.
- **Assignment AI Card page:** the configurable opening statement (§7.4), then rule sections in the
  §7.4 field order. Long sections use progressive disclosure (APG Disclosure). The LEARN submission
  link is the primary action (§7.4).
- **"LEARN" wording** comes from admin config (§4). It is not hard-coded, and is never presented as
  a D2L mark.

### 5.7 Component patterns for specific requirements

**Status labels (§7.4 draft / published / archived / superseded; §8 "clear status labels").**
Non-interactive tag, sentence case, adjective wording (GOV.UK). It is never colour-only: each tag
has the word, a distinct border or fill style, and in forced-colours mode a `CanvasText` border.
Superseded cards also show a text link to the newer version, because the tag alone does not say
what replaced it. Labels use the four §7.4 state names. Any extra explanatory text needs owner
copy.

**Course vs assignment overrides (§7.4 "differences must be shown visibly"; §10).** Proposed
"rule comparison" pattern:
- On the Assignment AI Card, each field that differs from the Course AI Card gets an inline marker
  (text plus icon, not colour alone). Its disclosure shows the course value next to the assignment
  value.
- A summary box at the top lists the overridden fields, with in-page links.
- Fields that inherit say so in muted text, so students do not have to guess.
- Screen-reader text states the relationship explicitly.
- All marker wording is a **placeholder**; final copy needs the owner.
- Mapping Course AI Card fields (§7.3) to Assignment AI Card fields (§7.4) is not one-to-one (the
  field lists differ). Which pairs count as "the same rule" for comparison is a **proposed new open
  question**.

**Explicit anonymity explanation at every point of posting (§8).** A reusable `AnonymityNotice`
component sits **inside** each composer (ask, comment, upvote, "Still unclear", report). It is tied
to the submit button with `aria-describedby`, so screen-reader users hear it before posting. It is
not a dismissible toast and not hidden behind an info icon. It links to the published limitations
of anonymity (§6.2, Q8). Copy is **TBD by owner**; nothing is invented here.

**Non-gamified participation levels (§7.9, §8, §7.10).** Show the three level names as plain text,
the student's own counts, and the published thresholds in a simple table. No progress rings, no
"N more to next level" nudges, no celebratory animation, no medal or badge imagery, no comparison
with classmates. The "Participation level reached" notification (§7.13) is a neutral status
message. The share flow shows the §7.10 verbatim text exactly, in an alert-dialog confirmation
with explicit share and cancel buttons. Initial focus goes to Cancel (the behaviour Radix documents
for AlertDialog; the safer default).

**Presentation mode (§7.8).** A separate route and view model (P5) with large type. Proposed
starting point, to validate on real projectors: body text of at least about 32px at 1080p, and
contrast aimed at **7:1 (WCAG 1.4.6, AAA)**, because projectors wash out contrast (inference). No
hover-only controls. Keyboard shortcuts for next/previous, with visible buttons as well. A
high-contrast light theme by default. Fields: only the §7.8 "Display" column.

**Progressive disclosure (§8).** Use APG Disclosure (button with `aria-expanded`) or native
`<details>`. Never hide **required policy information** (e.g. the Policy 71 links, §4) by default.
Never collapse the verbatim principle (§7.3) or the opening statement (§7.4).

**Wizard (§7.6).** Follow the GOV.UK question-page pattern: one question per page, back link,
question as `<h1>`/`<legend>`, a Continue button, an error summary with focus management, and an
"Error: " title prefix. Each question shows the short explanation, "Why this matters", resources
and the **decision rule behind any recommendation** (§7.6) as visible text, not tooltips. Drafts
save at every step, and a review page comes before preview. Add a progress indicator only if
testing shows it helps (GOV.UK). The decision rules themselves are **Q10**.

**Notifications (§7.13 "accessible in-app").** The in-app notification centre is a list page with
headings. The header link text carries the new-item count (e.g. "Notifications, 3 new").
Transient confirmations use one persistent polite live region (`role="status"`). `role="alert"` is
only for urgent errors, since overuse is a WCAG 4.1.3 failure. No auto-dismissing toasts for
anything the user must act on. Which notifications are essential is **Q13**.

### 5.8 Accessibility process (proposal)

1. **Target:** WCAG 2.2 AA (Q15, owner decides; see 2.3). Keep 4.1.1 Parsing in reports if UW or
   Ontario reporting still references WCAG 2.0 (W3C note in §3.7).
2. **Automated, every PR (CI):**
   - `@axe-core/playwright` on every milestone-1 screen, in every state (dialogs open, errors
     shown, disclosure expanded), with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`.
     Violations fail the build. Allow known issues only by "fingerprint" (Playwright guidance).
   - Lint: eslint-plugin-jsx-a11y **only if** ESLint is pinned to 9, or once its ESLint 10 support
     lands. Otherwise use Biome's `a11y` group. Decide in the tooling ADR.
   - Unit tests for the contrast guardrail (5.4) and for presentation-mode field allowlisting (P5).
   - Keyboard-flow Playwright tests (Tab order, Escape closes dialogs, focus returns to trigger).
3. **Manual, per milestone (checklist in Appendix C):** keyboard-only; NVDA + Chrome and NVDA +
   Firefox on Windows; VoiceOver + Safari on macOS and iOS; 200% text zoom and 400% / 320px
   reflow; Windows contrast themes (forced colours); reduced motion; projector check for
   presentation mode. JAWS is the most-used screen reader in WebAIM #10 but is paid. Testing JAWS
   is a cost decision for the owner.
4. **Honest limits:** automated tools find only part of the problems. Deque's own figure is "on
   average 57%" (vendor claim). GDS found the best single free tool caught 41% and all ten combined
   71% (2017). Passing axe is **not** WCAG conformance. Claim conformance only after the manual
   checklist passes. An accessibility statement page is proposed for milestone 1. Its existence and
   wording are owner decisions.
5. **Ownership:** a solo developer cannot do an independent audit. An external audit or testing
   with disabled users before production (§10) is a cost/scope decision (new open question).

## 6. Dependencies and proposed new open questions

### 6.1 Dependencies on existing open questions (§13)

| Q | How this branch depends on it |
|---|---|
| Q1 Admin scope | Bounds the branding editor (which tokens admins can set, logo upload, font choice). Branding itself is known from §4/§7.15 |
| Q2 Milestone-1 features | The screen inventory in Appendix B is a **candidate** list. The owner's milestone-1 scope decides it |
| Q3 Stack | shadcn/ui, React Aria and Base UI all presume React. A non-React stack would leave only the pattern sources and tokens |
| Q4 Prototype auth | WCAG 3.3.8 Accessible Authentication applies to whatever sign-in is chosen; the sign-in screen design waits on Q4 |
| Q8 Threat-model document | The anonymity notices link to it; their copy cannot be finalised before it exists |
| Q9 Unjoinable mechanism | Decides whether "posted by you", "following" and "Still unclear" states can be shown, and how (P3, P10) |
| Q10 Wizard rules | The wizard UI shows the decision rule text; the content is Q10 |
| Q13 Essential notifications | Notification settings UI (which toggles are locked) |
| Q14 Audited events | Whether branding/theme changes are audited |
| Q15 Conformance target | This note proposes WCAG 2.2 AA + two AAA stretch criteria; the owner decides |
| Q16 Aggregation threshold | Analytics and survey screens must show a "not enough responses yet" state; the threshold value is Q16 |
| Q19 i18n | Font language coverage, React Aria translations, RTL (`rtl` flag in shadcn) |

### 6.2 Proposed NEW open questions (for the owner; none is answered here)

| # (proposed) | Question | Why it matters | Blocks |
|---|---|---|---|
| PQ-D1-1 | May the prototype use UW's name, logo or colours at all, and has anyone asked UW Brand (uwaterloo.ca/brand/contact-us) for permission? Should the prototype instead ship with a neutral "Demo University" theme? | UW logo rules forbid modification and route exceptions through University Relations in writing (§3.5). Public use of the logo could imply endorsement | Default theme, public prototype |
| PQ-D1-2 | Must the app avoid looking like an official D2L/Brightspace product, and how close may the IA be? | D2L forbids marks in product names and implied affiliation (§3.4) | IA, visual design |
| PQ-D1-3 | Does UW (Policy 58, procurement or IST guidance) require a specific WCAG version/level or an accessibility statement (VPAT/ACR) for third-party apps? | No UW page fetched states a level; Ontario law states WCAG 2.0 AA for public websites | Q15 sign-off |
| PQ-D1-4 | Is UW a "designated public sector organization" under O. Reg. 191/11, and do the IASR educational-institution duties apply to a tool like this? | Decides the legal floor vs a voluntary target | Q15 |
| PQ-D1-5 | Which timestamps (if any) are shown on anonymous questions, comments and answers, and at what precision? | Exact times can help identify authors in small courses (P6) | Board UI, §6 threat model |
| PQ-D1-6 | May admins save a brand colour that fails the contrast checks, or is the guardrail absolute? | §4 says branding is configurable; §8 requires accessibility | Branding editor |
| PQ-D1-7 | Which Course AI Card fields correspond to which Assignment AI Card fields for the "differences shown visibly" comparison? | §7.3 and §7.4 field lists differ, so the comparison needs an explicit mapping | Override display, §10 criterion |
| PQ-D1-8 | Who writes and approves UI copy: the anonymity explanations, the status-label help text, the override markers and empty states? | CLAUDE.md forbids inventing copy; most of this text is not in the spec | All screens |
| PQ-D1-9 | Is dark mode wanted? | Not in the spec. It doubles the contrast-validation surface for admin branding | Tokens |
| PQ-D1-10 | Budget for accessibility verification: JAWS licence, external audit, testing with disabled users before production? | Manual testing beyond NVDA/VoiceOver costs money; owner target is <$5/month running cost | §10 readiness |
| PQ-D1-11 | Is an accessibility statement page (with feedback contact) wanted in milestone 1? | Common practice for public services (inference); the spec is silent | Screen inventory |
| PQ-D1-12 | Which primitive base, React Aria or Base UI? Decide after a short spike, because shadcn's `style` cannot be changed after init | Irreversible day-one choice | Scaffolding (after Q3) |
| PQ-D1-13 | Should projector legibility of presentation mode be checked on real UW classroom projectors, and who can arrange that? | The ≥32px / 7:1 starting values are inferences, not measurements | §7.8 polish |

## 7. Appendices: token sketch, milestone-1 screen inventory, accessibility checklist

### Appendix A. Token sketch (illustrative only; values are placeholders to tune and verify)

```css
/* Layer 1: reference tokens (in code, not admin-editable) */
:root {
  /* Neutral ramp: placeholder OKLCH values, to be tuned; every text pairing must be re-verified */
  --ref-neutral-0:   oklch(0.995 0.003 90);   /* page */
  --ref-neutral-50:  oklch(0.975 0.004 90);   /* subtle surface */
  --ref-neutral-200: oklch(0.90  0.006 90);   /* borders */
  --ref-neutral-600: oklch(0.48  0.010 90);   /* muted text: verify >= 4.5:1 on page */
  --ref-neutral-900: oklch(0.22  0.010 90);   /* body text */

  --ref-radius-sm: 2px;  --ref-radius-md: 4px;          /* deliberately not 0.625rem */
  --ref-space-1: 0.25rem; --ref-space-2: 0.5rem; --ref-space-3: 0.75rem;
  --ref-space-4: 1rem;    --ref-space-6: 1.5rem; --ref-space-8: 2rem;

  --ref-font-serif: "Source Serif 4", Georgia, serif;   /* self-hosted (P1) */
  --ref-font-sans:  "IBM Plex Sans", system-ui, sans-serif;
  --ref-text-base: 1rem; --ref-leading: 1.5; --ref-measure: 70ch;

  --ref-focus-width: 3px;
  --ref-motion-fast: 120ms;
}
@media (prefers-reduced-motion: reduce) { :root { --ref-motion-fast: 0ms; } }

/* Layer 2: brand tokens. Injected per institution at render time from validated config (§4).
   Only these may come from admin data; every value has passed the 5.4 guardrail. */
:root {
  --brand-accent:      /* admin value, e.g. a UW gold */ oklch(0.86 0.15 85);
  --brand-on-accent:   /* derived: higher-contrast of near-black/white */ oklch(0.15 0 0);
  --brand-accent-text: /* derived: accent darkened until >= 4.5:1 on page */ oklch(0.45 0.10 75);
  --brand-font-heading: var(--ref-font-serif);   /* chosen from a vetted list, not a URL */
}

/* Layer 3: semantic tokens. Components read only these; mapped onto shadcn names */
:root {
  --background: var(--ref-neutral-0);
  --foreground: var(--ref-neutral-900);
  --muted-foreground: var(--ref-neutral-600);
  --border: var(--ref-neutral-200);
  --card: var(--ref-neutral-0);
  --primary: var(--brand-accent);
  --primary-foreground: var(--brand-on-accent);
  --link: var(--brand-accent-text);
  --ring: var(--foreground);                 /* focus ring not tied to brand, so it is always visible */
  --radius: var(--ref-radius-md);

  /* Status (§7.4): each status also has text and a border style; colour is never the only cue */
  --status-draft-bg: var(--ref-neutral-50);   --status-draft-border: dashed;
  --status-published-bg: /* tbd green tint */ var(--ref-neutral-50); --status-published-border: solid;
  --status-archived-bg: var(--ref-neutral-50);  --status-archived-border: dotted;
  --status-superseded-bg: var(--ref-neutral-50); --status-superseded-border: double;

  /* Override marker (§7.4): rendered with a text label and an icon, never colour alone */
  --override-rule-bg: /* tbd tint */ var(--ref-neutral-50);
  --override-rule-edge: var(--foreground);
}

/* Presentation mode (§7.8): its own scale and contrast target */
[data-mode="presentation"] {
  --ref-text-base: 2rem;      /* placeholder; validate on real projectors (PQ-D1-13) */
  --muted-foreground: var(--ref-neutral-900);   /* aim for 7:1 (WCAG 1.4.6) */
}

/* Forced colours: small tweaks only (MDN guidance) */
@media (forced-colors: active) {
  .tag, .card, .override-marker { border: 1px solid CanvasText; }
  :focus-visible { outline: var(--ref-focus-width) solid Highlight; }
}
```

Tailwind v4 picks these up through `@theme inline { --color-background: var(--background); … }`,
as in the shadcn theming docs (§3.1).

Proposed brand-config record (illustrative schema, admin-owned, §4):

```text
institution_theme {
  institution_id      opaque id
  display_name        text            -- e.g. "University of Waterloo" (subject to PQ-D1-1)
  lms_display_name    text            -- e.g. "LEARN" (§4)
  logo_asset_id       nullable        -- uploaded, metadata stripped, self-served (P9)
  accent              colour          -- admin input
  on_accent           colour          -- derived, stored
  accent_text         colour          -- derived, stored
  contrast_report     json            -- computed ratios at save time
  heading_font        enum            -- from vetted self-hosted list
  updated_by, updated_at              -- audit scope is Q14
}
```

No student identity or anonymous content lives here, so this table sits outside the five §6.1
privacy domains **(inference)**.

### Appendix B. Milestone-1 screen inventory (CANDIDATE; the actual scope is Q2)

The owner's constraint is "a public prototype that people can actually sign in to and use", which
looks "polished and credible" (§8). The list below covers the screens a user would meet in the
core loop. Each row is in scope **only if** the owner includes the feature in milestone 1 (Q2).

| # | Screen | Role(s) | Spec | Key components / a11y notes | Blocked by |
|---|---|---|---|---|---|
| S1 | Sign-in | All | §10 "sign in securely" | WCAG 3.3.8 (no cognitive test); error summary | Q4 |
| S2 | My courses | All | §5 | Compact course cards; empty state | Q5 (how courses appear) |
| S3 | Course home | All | §7.1, §8 | Course navbar, breadcrumbs, compact cards; student private participation panel | Q2 |
| S4 | Course AI Card (student view) | Student, TA, Instructor | §7.3 | Verbatim principle (§7.3) always visible; status tag; Policy 71 + Guidelines links (§4); version history link; "Last updated" | — |
| S5 | Assignment list | All | §7.1, §7.4 | Table or list with status tags and "AI permitted?" as text | — |
| S6 | Assignment AI Card (student view) | All | §7.4, §10 | Configurable opening statement; **override comparison** (5.7); LEARN submission link | PQ-D1-7 |
| S7 | Card version history | All | §7.6 | List of versions with what/why/effective date/applies-to-work-underway | — |
| S8 | Card builder: choose wizard or manual | Instructor (TA if permitted) | §7.6 | Two clear options; skip wizard | — |
| S9 | Wizard question page (×12) | Instructor | §7.6 | One question per page; "Why this matters"; decision rule shown; save draft | Q10 |
| S10 | Manual card editor | Instructor | §7.6, §7.3, §7.4 | Grouped fieldsets; conditional required fields when AI permitted (§7.3); error summary | — |
| S11 | Preview as student | Instructor | §7.6 | Clear "Preview" banner (text, not colour only); same view as S4/S6 | — |
| S12 | Publish / change-notice dialog | Instructor | §7.6 | Fields: what changed, why, effective date, applies to work underway | — |
| S13 | Question board | All | §7.2, §7.7, §7.14 | Filters (All / Course / one assignment); search; sort; anonymous question list; no author affordance (P3) | Q9 |
| S14 | Ask a question | Student | §7.7 | Tag choice limited to Course or Specific Assignment (§7.2); **AnonymityNotice**; duplicate warning | Q8, Q20 |
| S15 | Question detail | All | §7.7 | Answer, comments, upvote, "Still unclear", follow, report; AnonymityNotice in comment composer | Q9 |
| S16 | Moderation queue | Instructor, TA (if permitted) | §7.7 | Reports list; hide/delete; merge flow; no identities anywhere | Q20 |
| S17 | Merge duplicates flow | Instructor, TA | §7.7 | Two-step confirm; shows combined totals without identities | Q9 |
| S18 | Presentation mode | Instructor, TA | §7.8 | Allowlisted fields only (P5); large type; keyboard next/prev | PQ-D1-13 |
| S19 | My participation (private) | Student | §7.9, §7.10 | Counts, level, thresholds table; non-gamified | — |
| S20 | Share level confirmation | Student | §7.10 | Verbatim §7.10 text; explain when sharing becomes final; revoke | Q18 |
| S21 | Notifications centre + settings | All | §7.13 | List page; live region for new items; essential toggles locked | Q13, Q6 |
| S22 | Institution branding (admin) | Admin | §4, §7.15 | Colour input with live contrast report (5.4); logo upload; font from vetted list | Q1, PQ-D1-6 |
| S23 | Accessibility statement / "About anonymity" pages | Public | §6.2, §8 | Static content pages | Q8, PQ-D1-11 |
| S24 | Error, not-found and no-access pages | All | §5 | Plain language; no data leak in error text (§6.2) | — |

Likely **not** milestone-1 candidates unless the owner says otherwise: end-of-course survey (§7.12),
grading settings and export (§7.11, Q11, Q12), analytics (§7.16, Q16), audit log viewer (§7.17,
Q14), the deanonymization configuration (§6.4). This is a sequencing guess, not a scope decision.

Shared components the screens above need (for the PQ-D1-12 spike): Button, Link, Breadcrumbs,
Tabs/Navbar, Card, Tag, Disclosure/Accordion, Dialog, AlertDialog, Form field + label + description
+ error, Text area, Radio group, Checkbox, Select/Combobox (assignment filter), Search field, Date
picker (due date, effective date), Table, Toast/live region, Menu (account), Popover (course
switcher), Skip link, Visually-hidden text, Pagination.

### Appendix C. Accessibility checklist (proposal; assumes Q15 = WCAG 2.2 AA)

Criterion numbers refer to WCAG 2.2. Only 1.4.3, 1.4.10, 4.1.3 and the nine 2.2 additions were
verified this session (§3.7). All other criterion numbers and levels in this checklist come from
memory and are **Unverified**. Re-check them against https://www.w3.org/TR/WCAG22/ when the ADR is
written.

**C1. Automated (CI, every PR)**
- [ ] `@axe-core/playwright` scan of every screen in Appendix B, in each state (empty, filled,
      error, dialog open, disclosure open, presentation mode), tags `wcag2a wcag2aa wcag21a
      wcag21aa wcag22aa`; zero violations, or a documented fingerprint allowlist
- [ ] Review axe "incomplete" results manually (axe marks uncertain items as incomplete)
- [ ] Static a11y lint (jsx-a11y on ESLint 9, or Biome `a11y`) with no warnings
- [ ] Contrast guardrail unit tests (no rounding; 4.499 fails)
- [ ] Presentation-mode allowlist test: the DOM contains none of the §7.8 "Exclude" data
- [ ] Keyboard flow tests: Tab order, Escape, focus return, skip link
- [ ] Verbatim-text tests: §7.3 principle, §7.4 default statement and §7.10 share text render
      exactly as in CONTRIBUTING

**C2. Keyboard-only (manual, every milestone)**
- [ ] Every action is reachable and operable without a mouse; no keyboard traps (2.1.1, 2.1.2)
- [ ] Focus always visible and not hidden by sticky headers or banners (2.4.7, 2.4.11)
- [ ] Logical focus order; dialogs trap focus and return it on close
- [ ] Skip link to main content (2.4.1)
- [ ] Upvote and report reachable without dragging or hover (2.5.7)

**C3. Screen readers (manual)**
- [ ] NVDA + Chrome and NVDA + Firefox (Windows): ask, comment, upvote, report, follow; wizard;
      share level; notifications
- [ ] VoiceOver + Safari (macOS) and VoiceOver (iOS): the same core flows
- [ ] JAWS: only if the owner funds it (PQ-D1-10)
- [ ] The anonymity explanation is announced before the submit button in every composer (§8)
- [ ] Status tags and override markers are announced as text, not as colour
- [ ] Status messages announced without moving focus (4.1.3): "Question posted", "Saved as draft"
- [ ] Page titles unique and descriptive; "Error: " prefix on failed submits (2.4.2)
- [ ] Headings form an outline; landmarks present (1.3.1)

**C4. Zoom, reflow, spacing**
- [ ] 200% browser text zoom without loss (1.4.4)
- [ ] 320 CSS px width / 400% zoom: no two-dimensional scrolling except data tables (1.4.10)
- [ ] Text-spacing override bookmarklet does not break layout (1.4.12)
- [ ] Targets at least 24×24 CSS px or spaced (2.5.8)

**C5. Colour, contrast, modes**
- [ ] Text 4.5:1, large text 3:1 (1.4.3); UI components and focus 3:1 (1.4.11) for **every
      shipped theme**, including each saved admin brand
- [ ] Nothing conveyed by colour alone (1.4.1): statuses, overrides, errors, levels
- [ ] Windows contrast themes (forced colours): borders, focus and tags still visible
- [ ] `prefers-reduced-motion`: no non-essential motion (2.3.3 is AAA; proposed anyway)
- [ ] Presentation mode on a real projector at the back of a room (PQ-D1-13)

**C6. Forms and wizard**
- [ ] Every field has a visible label and programmatic name (1.3.1, 3.3.2, 4.1.2)
- [ ] Errors identified in text, linked from an error summary that receives focus (3.3.1, 3.3.3)
- [ ] No re-entry of information already given in the same flow (3.3.7)
- [ ] Draft saved at each wizard step; no session timeout loses work without warning (2.2.1)
- [ ] Help placed consistently on every page (3.2.6)

**C7. Content (§8 plain language)**
- [ ] Sentence case; short sentences; terms defined on first use (AI Card, override, level)
- [ ] Links make sense out of context (2.4.4)
- [ ] `lang` set; language changes marked if Q19 adds languages (3.1.1, 3.1.2)

**C8. Honest reporting**
- [ ] Release notes say "axe clean + manual checklist passed on <date> with <AT/browser versions>",
      never "fully accessible"
- [ ] Known issues listed in the accessibility statement (if PQ-D1-11 = yes)

## 8. Verification log

"Inferred date" means a publish date derived from the npm registry's internal timestamp, not from
a labelled field.

| Claim | URL | Checked | Status |
|---|---|---|---|
| shadcn/ui is copy-in source, "not a component library" | https://ui.shadcn.com/docs | 2026-10-11 | Verified |
| shadcn/ui is MIT; 125.4k stars | https://github.com/shadcn-ui/ui | 2026-10-11 | Verified |
| shadcn `style` enum includes `radix-*`, `base-*`, `aria-*` × 8 styles; `rtl` flag exists | https://ui.shadcn.com/schema.json | 2026-10-11 | Verified |
| `aria-*` styles are React Aria based | https://ui.shadcn.com/docs/changelog | 2026-10-11 | Inference from changelog wording |
| Every shadcn component exists in an `aria-*` variant | — | 2026-10-11 | **Unverified** |
| Base UI became shadcn's default (July 2026) | https://ui.shadcn.com/docs/changelog | 2026-10-11 | Verified (entry title only) |
| `style`, `baseColor`, `cssVariables` cannot be changed after init | https://ui.shadcn.com/docs/components-json | 2026-10-11 | Verified |
| shadcn theming: OKLCH CSS variables, `@theme inline`, default `--radius: 0.625rem` | https://ui.shadcn.com/docs/theming | 2026-10-11 | Verified |
| shadcn supports Next.js, Vite, React Router, Astro, TanStack Start, Laravel | https://ui.shadcn.com/docs/installation | 2026-10-11 | Verified |
| Tailwind CSS 4.3.3, MIT (inferred date 2026-07-16) | https://registry.npmjs.org/tailwindcss/latest | 2026-10-11 | Verified (date inferred) |
| Radix Primitives MIT, maintained by WorkOS, 128 open issues | https://github.com/radix-ui/primitives | 2026-10-11 | Verified |
| Radix releases 2026-06-06 … 2026-07-20 | https://www.radix-ui.com/primitives/docs/overview/releases | 2026-10-11 | Verified |
| Radix a11y wording (APG, "basic keyboard support", AT not named) | https://www.radix-ui.com/primitives/docs/overview/accessibility | 2026-10-11 | Verified |
| Radix AlertDialog moves focus to Cancel | https://www.radix-ui.com/primitives/docs/overview/accessibility | 2026-10-11 | Verified |
| React Aria: screen-reader testing claim, 30+ languages, RTL, unstyled | https://react-aria.adobe.com/ | 2026-10-11 | Verified (vendor claim) |
| React Spectrum monorepo Apache-2.0, 517 open issues | https://github.com/adobe/react-spectrum | 2026-10-11 | Verified |
| react-aria-components 1.22.1, Apache-2.0 (inferred date 2026-10-09) | https://registry.npmjs.org/react-aria-components/latest | 2026-10-11 | Verified (date inferred) |
| @base-ui/react 1.9.0, MIT (inferred 2026-10-09) | https://registry.npmjs.org/@base-ui/react/latest | 2026-10-11 | Verified (date inferred) |
| Base UI maintained under the MUI GitHub org | https://base-ui.com/react/overview/quick-start | 2026-10-11 | Inference from repo URL |
| Headless UI v2.x, 16 components; @headlessui/react 2.2.10 MIT (inferred 2026-04-07) | https://headlessui.com/ ; https://registry.npmjs.org/@headlessui/react/latest | 2026-10-11 | Verified (date inferred) |
| Radix Themes 3.3.0 MIT (inferred 2026-01-31); 26 accent scales; override step 9 | https://registry.npmjs.org/@radix-ui/themes/latest ; https://www.radix-ui.com/themes/docs/theme/color | 2026-10-11 | Verified |
| Mantine 9.7.2 MIT; primaryColor must be a theme key | https://registry.npmjs.org/@mantine/core/latest ; https://mantine.dev/theming/colors/ | 2026-10-11 | Verified |
| Mantine `autoContrast` behaviour in detail | https://mantine.dev/theming/colors/ | 2026-10-11 | **Unverified** (defined on another page) |
| MUI Material UI 9.5.0 MIT, implements Material Design 2 | https://registry.npmjs.org/@mui/material/latest ; https://mui.com/material-ui/getting-started/ | 2026-10-11 | Verified |
| MUI X Pro/Premium are commercial | — | 2026-10-11 | **Unverified** |
| @brightspace-ui/core 3.331.1, Apache-2.0, "for building Brightspace applications", depends on lit | https://registry.npmjs.org/@brightspace-ui/core/latest ; https://github.com/BrightspaceUI/core | 2026-10-11 | Verified |
| Daylight Design System is login-gated | https://daylight.d2l.dev/ | 2026-10-11 | Verified (302 to login) |
| D2L marks may not be used in product names or to imply affiliation | https://www.d2l.com/legal/trademarks/ | 2026-10-11 | Verified |
| Apache-2.0 grants no trademark rights | https://www.apache.org/licenses/LICENSE-2.0 | — | **Unverified** (not fetched) |
| GOV.UK Frontend code MIT; docs OGL v3.0; v6.5.0 on 27 Aug 2026 | https://github.com/alphagov/govuk-frontend ; https://design-system.service.gov.uk/ | 2026-10-11 | Verified |
| GOV.UK crown / GDS Transport restricted to GOV.UK | https://design-system.service.gov.uk/styles/typography/ | 2026-10-11 | **Unverified** (404) |
| GOV.UK Tag guidance (status only, non-interactive, adjectives, not colour alone, sentence case) | https://design-system.service.gov.uk/components/tag/ | 2026-10-11 | Verified |
| GOV.UK question pages: one thing per page, Continue, progress indicator only if research shows | https://design-system.service.gov.uk/patterns/question-pages/ | 2026-10-11 | Verified |
| GOV.UK error summary: focus, links, "Error: " prefix, inner role=alert (JAWS) | https://design-system.service.gov.uk/components/error-summary/ | 2026-10-11 | Verified |
| USWDS v3.14.0; CC0 public domain except LICENSE.md parts | https://designsystem.digital.gov/ ; https://github.com/uswds/uswds | 2026-10-11 | Verified |
| UW brand guidelines apply to staff, faculty, partners, vendors | https://uwaterloo.ca/brand/ | 2026-10-11 | Verified |
| UW brand fonts are licensed; Barlow Condensed is the free alternative | https://uwaterloo.ca/brand/how-express-our-brand/typography | 2026-10-11 | Verified |
| UW logo modification not permitted; exceptions in writing | https://uwaterloo.ca/brand/how-express-our-brand/waterloo-logo | 2026-10-11 | Verified |
| Whether third-party apps may use the UW logo | — | 2026-10-11 | **Unverified** |
| UW gold levels pair accessibly only with black | https://uwaterloo.ca/brand/how-express-our-brand/colour | 2026-10-11 | Verified |
| Barlow is OFL-1.1 | https://github.com/jpt/barlow | 2026-10-11 | Verified |
| Source Serif 4 is OFL-1.1, variable, optical sizes | https://github.com/adobe-fonts/source-serif | 2026-10-11 | Verified |
| IBM Plex is OFL | https://github.com/IBM/plex | 2026-10-11 | Verified |
| Atkinson Hyperlegible Next: low-vision design, 7 weights, Braille Institute EULA | https://www.brailleinstitute.org/freefont/ | 2026-10-11 | Verified |
| Atkinson Hyperlegible Next is OFL on Google Fonts | https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next/license | 2026-10-11 | **Unverified** (page did not render) |
| WCAG 2.2 is a W3C Recommendation (12 Dec 2024); new SC list and levels; 4.1.1 removed | https://www.w3.org/TR/WCAG22/ | 2026-10-11 | Verified |
| WCAG 3 is a Working Draft (Sept 2026); meet 2.2 now | https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ | 2026-10-11 | Verified |
| Ontario: WCAG 2.0 AA (except 1.2.4, 1.2.5) under O. Reg. 191/11 | https://www.ontario.ca/page/how-make-websites-accessible | 2026-10-11 | Verified |
| UW is a designated public sector organization under the AODA | — | 2026-10-11 | **Unverified** |
| UW states a WCAG level for apps | https://uwaterloo.ca/accessibility/ ; https://uwaterloo.ca/accessibility/guides-and-resources/aoda-legislation | 2026-10-11 | **Unverified** (not stated on pages fetched; Policy 58 not fetched) |
| 1.4.3 thresholds; no rounding | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | 2026-10-11 | Verified |
| 1.4.10 Reflow: 320 CSS px = 1280 px at 400% | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 2026-10-11 | Verified |
| 4.1.3 Status Messages roles; alert overuse is a failure | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | 2026-10-11 | Verified |
| 1.4.11 (3:1 non-text), 1.4.6 (7:1, AAA), 1.4.12, 2.3.3 and other SC numbers in Appendix C | https://www.w3.org/TR/WCAG22/ | 2026-10-11 | **Unverified** (from memory) |
| forced-colors Baseline since Sept 2022; tweaks only; box-shadow forced to none | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors | 2026-10-11 | Verified |
| axe-core 4.14.0 MPL-2.0; WCAG 2.0–2.2 A/AA/AAA rules | https://registry.npmjs.org/axe-core/latest ; https://github.com/dequelabs/axe-core | 2026-10-11 | Verified |
| axe finds "on average 57% of WCAG issues" | https://github.com/dequelabs/axe-core | 2026-10-11 | Verified as a **vendor claim** (method not shown) |
| GDS 2017: best tool 41%, all combined 71% of 143 barriers | https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/ | 2026-10-11 | Verified (2017 data) |
| Playwright: automated tests "cannot detect all types of WCAG violations"; AxeBuilder; fingerprints | https://playwright.dev/docs/accessibility-testing | 2026-10-11 | Verified |
| @axe-core/playwright 4.13.0, MPL-2.0 (inferred 2026-08-11) | https://registry.npmjs.org/@axe-core/playwright/latest | 2026-10-11 | Verified (date inferred) |
| eslint-plugin-jsx-a11y 6.10.2, peer ESLint ≤9, last published ~2024-10-26 | https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest | 2026-10-11 | Verified (date inferred) |
| ESLint latest is 10.12.0 | https://registry.npmjs.org/eslint/latest | 2026-10-11 | Verified |
| jsx-a11y ESLint 10 issue #1075 open; PRs open | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues?q=eslint+10 | 2026-10-11 | Verified |
| Biome has a 37-rule `a11y` group | https://biomejs.dev/linter/javascript/rules/ | 2026-10-11 | Verified |
| WebAIM #10: JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7% | https://webaim.org/projects/screenreadersurvey10/ | 2026-10-11 | Verified (2024 data; newer survey Unverified) |
| Stock shadcn defaults are "the recognisable look of AI-generated apps" | — | 2026-10-11 | **Unverified** (brief's premise; author judgement only) |
| Projector legibility values (≥32px, 7:1) | — | 2026-10-11 | **Unverified** (inference; to be measured) |
