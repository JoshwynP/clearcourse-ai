# Prototype authentication and provisioning (Q4, Q5)

> **Advisory research.** Date: 2026-10-12.
> Not binding until the owner approves it and it is promoted into CONTRIBUTING.md (§1).
> Informs: **Q4** and **Q5** (primary); Q1, Q2, Q3, Q6, Q7, Q8, Q9, Q12, Q14, Q15, Q17, Q18,
> Q20; PQ-01, PQ-02, PQ-05, PQ-06, PQ-10, PQ-11, PQ-24, PQ-29, PQ-37, PQ-42, PQ-44 to PQ-50,
> PQ-67.
> Proposed ADR: [ADR 0004](../decisions/0004-prototype-authentication.md) (prototype
> authentication and identity linking, Q4). Q5 should get its own ADR once the owner answers it;
> none is drafted yet.

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

Q4 asks how people sign in to the prototype. Q5 asks how courses and roles are provisioned
`[src p.19]`. Both block milestone 1: nobody can use a course until they can sign in and hold a
role in it (§5, §10). Everything below is a **Proposal** for the owner. No open question is
closed.

**Main finding.** Almost everything that would *prove* a UW role or enrolment needs UW's
cooperation, as §12 already warns ("A hosted SSO integration with UW requires the institution's
cooperation"). The research shows where the line falls:

| Realistic now, without UW | Needs UW's cooperation |
|---|---|
| Email one-time codes, limited to admin-configured institutional domains | Real UW SSO (a UW-registered Entra app or AD FS relying party) |
| Passkeys added after a first sign-in | Any proof of *role* (instructor, TA, student) from UW systems |
| Manual course creation by vetted instructors | LTI 1.3 registration in LEARN (needs a Brightspace admin) |
| Student join links or codes; single-use TA invites | NRPS rosters, AGS grade passback, Deep Linking inside LEARN |
| Building and testing LTI against saLTIre and Moodle in Docker | A UW sponsor, an IRA-PIA and EdTech governance review |
| "Sign in with Microsoft" against UW's tenant, **only if** a consent spike passes **and** the owner accepts testing against UW's tenant (PQ-44) | Roster import (CSV or typed emails), until a UW privacy review covers it |

**Proposal for Q4 (ADR 0004; detail in section 6.1–6.4).** **Better Auth** with database
sessions confined to the identity domain, refresh off and minimal session metadata (PQ-48); sign-in
by a **6-digit email one-time code**, not a magic link, for admin-configured domains (default
proposal `uwaterloo.ca`, PQ-45); accounts linked on **(issuer, subject)** only, never by email;
"Sign in with Microsoft" pinned to the UW tenant only if a 1–2 hour consent spike succeeds and the
owner allows testing against UW's tenant (PQ-44).

**Proposal for Q5 (section 6.5–6.6; its own ADR later).** Prototype: vetted instructors create
courses (PQ-46); students self-enrol by hashed, expiring, revocable join link or code; TAs join
by single-use invite with no permissions until assigned; no roster import before a UW privacy
review. Production: LTI 1.3 just-in-time provisioning plus Deep Linking and AGS, NRPS optional,
built on `jose`. The data model supports both from day one.

**Main trade-offs.**

- An email code proves control of a mailbox, not role or status: UW gives mailboxes to alumni
  and retirees too. NIST SP 800-63B-4 does not treat email as an approved authenticator, so it
  suits the prototype, not what §10 "sign in securely" should mean in production
  (interpretation).
- Better Auth had 10 security advisories between 26 June and 30 September 2026, 2 of them
  Critical. Pinning and patching within days are a standing cost.
- LTI with LEARN needs a UW sponsor, an IRA-PIA ("typically takes 2–4 weeks") and LEARN admin
  registration (PQ-02, PQ-50). Production provisioning can stall there however good the code is.

## 2. Questions covered and what they block

| Question (§13) | Blocks | How this file relates |
|---|---|---|
| **Q4** Authentication for the prototype | Sign-in | Primary: methods, library, sessions, identity linking, role bootstrapping |
| **Q5** Course/role provisioning `[src p.19]` | Provisioning | Primary: prototype provisioning, the LTI path, the data model |
| Q1 Admin scope | §7.15 | Allowed email domains and LTI registrations must be admin settings, since §4 makes "LMS configuration" configurable (interpretation) |
| Q2 First milestone | Roadmap | Whether a "dark" LTI spike belongs in milestone 1 |
| Q3 Stack | All code | Better Auth and `jose` assume TypeScript (ADR 0001) |
| Q6 Email provider | §7.13 | Email codes make email critical infrastructure (ADR 0002: Amazon SES) |
| Q7 Impersonation | §5 | Better Auth's admin plugin includes impersonation; it stays off |
| Q8, Q9 Threat model, unlinkability | §6 | Sign-in, join and LMS timing are anonymity limits; ADR 0003 decides what crosses the identity boundary |
| Q12 Grade export | §7.11 | AGS and the Brightspace CSV are the two result routes |
| Q14, Q17 Audit, retention | §7.17, data model | Sign-in, role-grant and link events; retention of sessions, codes and links |
| Q15 Accessibility | §8 | WCAG 2.2 SC 3.3.8 constrains code entry |
| Q18 End of course | §7.10 | Core LTI claims carry no course end date |
| Q20 Rate limits | §7.7 | Code sending, code entry and join redemption need limits |

**Requirements relied on:** §10 "Institutional users can sign in securely" and "Courses and roles
can be provisioned through supported integrations" `[src p.19]`; §11 authentication and
authorization as deliverables `[src p.1]`; §5 strict role- and course-based authorization, TA
permissions assigned by instructors, no impersonation without an audited procedure `[src p.2]`;
§6.1–§6.2 identity and enrolment as a separate domain, never logged or shown with anonymous
content `[src p.3]`; §4 institution-specific settings including "LMS configuration" are
admin-configurable `[src p.1]`; §7.10 the instructor receives only "student name · verified
level · date shared" `[src p.14]`. §12's SSO and cookie advice is *Advisory* only.

**Not requirements** (open or proposed here): which integration counts as "supported"; whether
NRPS, AGS or Deep Linking are used; LTI role mapping; TA defaults; CSV import; whether a join code
counts as "enrolled"; which email domains are institutional; session lifetimes.

## 3. Options considered

### 3.1 Sign-in methods

| # | Method | Proves UW affiliation? | Needs UW? | Verdict (Proposal) |
|---|---|---|---|---|
| M1 | **Entra ID multi-tenant OIDC** ("Sign in with Microsoft"), pinned to the UW tenant | Tenant membership (`tid`), not role | **Maybe**: UW's consent setting is not public | Conditional on spike S1 and PQ-44; never the only method |
| M2 | **Email one-time code**, admin-configured domains | Mailbox control only (alumni and retirees too) | No | **Baseline method** |
| M3 | Email magic link | Same as M2 | No | No: scanners may use up a single-use GET link (inference) |
| M4 | Passkeys (WebAuthn Level 3) | No | No | Later, added after a first sign-in |
| M5 | Google or GitHub OAuth | No | No | No: a third party learns who uses the app, nothing is proven |
| M6 | Self-hosted IdP (Keycloak) | No | No | Not hosted (cost likely over target, **Unverified**); yes as a local/CI test IdP |
| M7 | Real UW SSO (UW registers the app) | Yes | **Yes** | The pilot/production path |

### 3.2 Auth libraries and managed services (checked 2026-10-11)

| Option | Status and price | Verdict (Proposal) |
|---|---|---|
| **Better Auth** (TypeScript library) | v1.7.7 "Latest", MIT. Microsoft, email OTP, passkey and SSO (OIDC, SAML 2.0) plugins. DB sessions by default. 10 advisories 26 Jun–30 Sep 2026 (2 Critical) | **Proposed**: identity stays in our Postgres |
| Auth.js | "Now part of Better Auth" (22 Sep 2025); "security patches and urgent issues" only | No |
| Lucia | "Deprecated in March 2025" | No |
| Clerk | Hobby 50,000 MRU, branding not removable; Pro $25/month ($20 annual) with 1 SSO connection, then $75/month each | No; vendor-held identity; SSO above budget |
| Supabase Auth | Free 50,000 MAU; pauses after 1 week idle; no SAML on Free; Pro from $25/month; default SMTP 2/hour | No: ADR 0002 uses Supabase as plain Postgres without Supabase Auth |
| WorkOS AuthKit | Free to 1M MAU; SSO $125 per connection (period **Unverified**); custom domain $99/month | No |
| Auth0 | Free 25,000 MAU, 1 enterprise connection, 1 custom domain (card check) | Fallback only |
| Firebase / Identity Platform | Spark 50K MAU; SAML/OIDC 50 MAU free; further per-MAU price **Unverified** | No |

### 3.3 Prototype provisioning (no UW cooperation)

| # | Method | Proof of enrolment (§5) | Personal data the instructor enters | Verdict (Proposal) |
|---|---|---|---|---|
| P1 | **Manual course creation** by a vetted instructor | n/a | Course title and code | **Yes**, needed by every option |
| P2 | **Join code** (short, typed) | Weak | None | Yes, in-class variant of P3; rate-limited (Q20) |
| P3 | **Join link** (≥128-bit token, stored hashed, expiring, revocable) | Weak to moderate (forwardable) | None | **Yes (recommended)** |
| P4 | Per-student email invites | Strong | Every student's email | **No** for the prototype |
| P5 | CSV roster import | Strongest without integration | Bulk class personal data | **No** before a UW privacy review |
| P6 | Affiliation gate on P2/P3 | UW affiliation, not enrolment | None | Optional per course, if Q4 provides it |
| P7 | **TA invite** (single use, expiring, instructor-delivered) | Strong for that link | None | **Yes**; no permissions until assigned |
| P8 | Instructor approval queue | Moderate | None typed | Optional; names and statuses only, never join times |

### 3.4 Production integration paths (§10 "supported integrations")

| # | Path | Provisions | Verdict (Proposal) |
|---|---|---|---|
| L1 | **LTI 1.3 core launch, just-in-time** | Person (iss, sub), course (deployment, context.id), membership and role per launch | **Yes (core)** |
| L2 | + **NRPS 2.0** | Membership list with status | Optional: drops and TA discovery, minimal fields |
| L3 | + **AGS 2.0** | Line item and scores for students who shared, on instructor click | **Yes** (§7.11, Q12) |
| L4 | + **Deep Linking 2.0** | Board and card links inside LEARN | **Yes** |
| L5 | **Dynamic Registration 1.0** | Registration exchange; admin still activates | Offer it, plus a manual admin form (§4) |
| L6–L8 | Valence REST API; SIS/OneRoster; Entra groups | Rosters | No: not portable (§4), too much data, or speculative |

### 3.5 Building and testing the LTI tool side

| Option | Facts (checked 2026-10-11) | Verdict (Proposal) |
|---|---|---|
| **Own code on `jose`** | 6.2.12, MIT, zero dependencies, actively maintained | **Recommended**: LTI state stays in Postgres |
| `ltijs` | v7.0.0 (2026-09-09) "full, from-scratch TypeScript rewrite"; MongoDB-only backends; Node 24+ | Not now: a second identity-bearing store |
| Hosted LTI-as-a-service | Pricing and data terms **Unverified**; another processor for launch claims | No |
| **saLTIre** | Free Test Platform (LTI 1.3, line items, Dynamic Registration); Deep Linking shown for its Test Tool only; NRPS not stated | First launch-spike target, synthetic users only |
| **Moodle in Docker** | GPL-3.0, maintained; full LTI Advantage platform with pending-then-activate registration | Full-LMS integration test |
| 1EdTech certification | Included in 1EdTech membership (fee **Unverified**) | Only if wanted (PQ-50) |

## 4. Evidence

All facts were checked on 2026-10-11 and re-checked by an adversarial fact-check the same day;
its corrections are applied. URLs are in section 10.

### 4.1 Entra ID and the consent problem (M1)

- **UW's tenant is public:** `uwaterloo.ca` is tenant `723a5a87-f39a-4a22-9247-3fc240c01396`
  (region NA), federated to UW's AD FS. A multi-tenant app could send UW users to UW's own login
  page.
- **Consent:** by default "all users are allowed to consent" to permissions that don't need admin
  consent; Microsoft recommends user consent only for verified publishers. The Microsoft-managed
  policy, default for **new** tenants, does not except the basic sign-in scopes. **UW's actual
  setting is Unverified**: no public UW page states it. UW IST has an "M365 Admin request" route
  for at least one third-party app, but that app asks for mailbox permissions.
- **Publisher verification is out of reach for a solo owner (inference):** it needs a verified
  Microsoft AI Cloud Partner Program account, which requires a legally registered business.
  Risk-based step-up consent affects only apps asking for more than basic sign-in.
- **In UW's directory:** consent creates "a *service principal*"; sign-in log entries "can't be
  changed or deleted".
- **Claims:** `oid` "uniquely identifies the user across applications"; `sub` is pairwise per app;
  `email` must never be used "for authorization". A later UW-registered app would see the same
  `(tid, oid)`. Better Auth's Microsoft provider keys on `oid`; tenant pinning and its scopes are
  **Unverified** (spikes S1, S2).

### 4.2 Email codes versus magic links (M2, M3)

- **UW mailboxes:** "Outlook email accounts are provided to employees, students, alumni,
  retirees", so an `@uwaterloo.ca` address is not proof of current status.
- **Link scanners:** Safe Links scans URLs "prior to message delivery" and detonates
  no-reputation URLs "in the background"; Defender's `UrlClickEvents` keeps the full clicked URL
  with user and IP. Whether UW licenses Defender for Office 365 is **Unverified**.
- **Better Auth magic link:** 300 seconds; consumed "on the first attempt"; verified by `GET`;
  stored `plain` by default. That a scanner's GET would use it up is a **plausible inference, not
  documented** (spike S3).
- **Better Auth email OTP:** 6 digits, 300 seconds, 3 attempts, stored `plain` by default
  (`hashed` available); auto sign-up unless `disableSignUp`. A `before` hook can reject sign-up by
  domain. Match the normalised domain exactly: `endsWith("uwaterloo.ca")` would accept
  `eviluwaterloo.ca` (inference).
- **NIST SP 800-63B-4 (fact-check corrected):** "Email **SHALL NOT** be used for out-of-band
  authentication", and codes "sent to validate email addresses" are "not authentication
  processes". Session limits are **SHOULD**, not SHALL: reauthentication no more than 30 days at
  AAL1 (idle timeout optional); 24 hours and 1 hour idle at AAL2.
- **WCAG 2.2 SC 3.3.8 (AA):** manual transcription of a code "is not compliant"; paste and autofill
  must work; split one-digit boxes that break paste fail.
- **Volume:** Resend Free caps at **100 a day**; the SES sandbox allows 200 per 24 hours to
  verified recipients only, so SES production access is needed early (ADR 0002).

### 4.3 Passkeys, Google, GitHub, Keycloak (M4–M6)

- WebAuthn Level 3 became a W3C Recommendation on 25 August 2026. Better Auth's passkey plugin adds
  a passkey to a signed-in user by default. Passkeys are phishing-resistant but prove no
  affiliation.
- Google's `hd` is "Provided only if the user belongs to a Google Cloud organization", and the
  `email` domain can't be relied on. GitHub's emails API claims nothing about organisations.
- Keycloak's HA sizing guide gives 1,250 MB per pod; a hosted single node's cost is
  **Unverified**.

### 4.4 Library status and sessions

- **Better Auth:** MIT, about 30.3k stars, v1.7.7 "Latest" (fixes a Critical magic-link
  takeover). Advisories, as corrected by the fact-check: 10 between 26 Jun and 30 Sep 2026
  (2 Critical, in core `better-auth` and in `@better-auth/scim`; 7 High, 3 of them in
  `@better-auth/sso`; 1 Low), plus 9 more on 31 May 2026 including a Critical SSRF in
  `@better-auth/sso`.
- **Better Auth accounts:** implicit linking by verified email is **on by default**
  (`disableImplicitLinking: true` turns it off). The admin plugin includes impersonation. The SSO
  plugin keys OIDC accounts on `sub` and offers a `resolveUser` hook.
- **Better Auth sessions:** in the database by default, 7-day expiry sliding by `updateAge`
  (1 day), so a regularly used session can live indefinitely; `disableSessionRefresh: true`
  stops this. A cookie cache delays revocation. Rows hold `ipAddress`, `userAgent`, `createdAt`,
  `updatedAt`; leaving IP and UA empty is **Unverified** (PQ-48). Cookies are `httpOnly` and
  `secure` in production; default `SameSite`, prefix and token hashing at rest are
  **Unverified**.
- **Auth.js** joined Better Auth on 22 Sep 2025 ("we strongly recommend new projects to start with
  Better Auth"). **Lucia** was deprecated in March 2025.
- **OWASP Session Management Cheat Sheet:** `Secure` and `HttpOnly` are "mandatory"; `SameSite`
  `Strict` or `Lax`; the `__Host-` prefix; expiry "must be enforced server-side"; logout must
  invalidate the session server-side; the session ID "must be meaningless". The source chat's
  "HTTP-only cookies storing JWTs" `[src p.26]` cannot be revoked server-side without extra state
  (inference).

### 4.5 Identity standards

- **OIDC Core §5.7:** "the only guaranteed unique identifier for a given End-User is the
  combination of the iss Claim and the sub Claim"; email and username "MUST NOT be used as unique
  identifiers".
- **LTI 1.3:** `sub` "MUST be a stable locally unique to the `iss`" and is "the only required user
  claim"; anonymous launches omit it. Tools "MUST NOT use any other attribute other than the
  unique identifier" to identify a user between systems.

### 4.6 LTI 1.3 and LTI Advantage

- **Core** (IMS Final, 2019): `context` is optional; `context.id` is unique per
  `deployment_id`, which is immutable within the issuer. The TA sub-role is
  `…/membership/Instructor#TeachingAssistant`; also sending the principal role is only "best
  practice".
- **Security Framework 1.0:** every launch is a third-party-initiated login (GET or POST); the
  tool checks signature, exact `iss`, `aud`/`azp`, RS256, `exp` and a single-use `nonce`. `kid`
  MUST be in key sets but not in every JWT header (fact-check nuance).
- **NRPS 2.0:** only `user_id` and `roles` are required; "LTI does not pass user information in its
  default configuration".
- **AGS 2.0:** a platform "MAY ignore scores that are not `FullyGraded`" and "has the final say"
  on final scores; `comment` is seen by students and instructors.
- **Deep Linking 2.0** `custom` parameters reach later launches. **Dynamic Registration 1.0** is
  "Candidate Final"; a new registration "is not activated yet" until an admin activates it.
- **Cookies:** Safari and Firefox restrict third-party cookies by default; UW advises "Open as
  External Resource" for Piazza.

### 4.7 D2L Brightspace

- Supports LTI 1.3 core, AGS, NRPS and Deep Linking, but "D2L does not yet support all aspects of
  the standard" (fact-check addition).
- Registration needs the org-level "Manage LTI Tools" permission. After Dynamic Registration the
  resulting **registration** is disabled by default. A domain can be in only one enabled
  registration, and redirect URLs must match exactly ("Wildcarding is not supported"), so staging
  and production need two domains (interpretation).
- Deployment flags control names, email, OrgDefinedId and username; `PreProvisioning` sends the
  classlist "including users not known to tool"; `SendInstitutionRole` is a registration
  property.
- **Conflicting:** the API reference says the deployment `Anonymous` setting was removed and "is
  always considered to be false" from LMS 20.26.2; a KB article still mentions it. Design assumes
  Brightspace always identifies the user.
- UW's LEARN-to-IMS role mapping (e.g. TAs) is **Unverified**. Content Reports show per-user
  visits; whether LTI links are tracked is **Unverified**. The grade-import CSV needs
  "OrgDefinedID, Username, or both".

### 4.8 UW governance for LEARN integration

- The LEARN team works with the Privacy Officer and Information Security Officer "to review
  third-party tools prior to integration with LEARN". Most tools get "USERID …, Role …, username
  …, email"; names are not in the standard set.
- The IRA-PIA "typically takes 2–4 weeks"; FIPPA, amended by Bill 194 from 1 July 2025, needs an
  assessment "before collecting personal information". A UW Information Steward owns it (our
  reading).
- LEO "assist[s] investigation of intake requests", "particularly requests for integration with
  the LMS", and recommends to EdTech Advisory and Steering; it does not decide (fact-check
  nuance). Principles include "Be sustainable" and "Be scalable, with strong potential for broad
  campus use"; the CIO approves contracts.
- Instructor guidance: check whether an IRA is required, "Complete this step before proceeding any
  further!"; "It is best to choose a tool that does not require students to identify themselves";
  without permission instructors "are not authorized to release student information to anyone
  except the student to whom it pertains" (July 2017 page). Reading this as ruling out prototype
  roster uploads is our interpretation, not legal advice.

## 5. Comparison

Against the owner's relayed constraints (a public prototype people can sign in to; under
$5/month; no corner painted for production, especially §6; mainstream tools for a solo builder).
Ratings are qualitative judgements.

| Criterion | M1 Entra (pinned) | M2 Email code | M3 Magic link | M4 Passkeys | M5 Google/GitHub |
|---|---|---|---|---|---|
| Works without UW | Unknown until S1 | Yes | Yes | After first sign-in | Yes |
| Proves affiliation / role | Tenant / no | Mailbox / no | Mailbox / no | No / no | No / no |
| Running cost | $0 | Cents (email) | Cents | $0 | $0 |
| Phishing resistance | UW's own login page | Low | Low | High | Varies |
| Production continuity | Good (`tid`, `oid`) | Explicit link or fresh start (PQ-06) | Same as M2 | Neutral | Poor |
| Who else learns sign-in timing | Microsoft, UW admins | Email provider, UW mail logs | Same, plus scanners | Nobody | Google or GitHub |
| Main failure mode | Consent blocked or app disabled by UW | Send caps, junk folder | Link used up (inference) | Lost device | Proves nothing |

**Provisioning** (see also the table in section 1): without UW, a course can be created (P1), a
TA added (P7) and the LTI code exercised (saLTIre, Moodle), but enrolment cannot be proven (P3
and P2 prove only possession of a link; P6 adds affiliation), drops are removed by hand, and
results leave only as a CSV (Q12; identifier PQ-49). With UW, L1–L4 supply roles, drops,
grade passback and links inside LEARN.

**Cost.** Better Auth, `jose`, saLTIre and Moodle are $0; the Entra registration is $0 (Azure
free-account terms **Unverified**); email codes cost about $0.10 per 1,000 on SES, inside the
email line of the estimate in [stack-and-hosting.md](stack-and-hosting.md) section 6.6. Managed
vendors' production SSO prices ($25–$125+ per month) break the $5 target. 1EdTech membership and
UW staff time are **Unverified**.

## 6. Recommendation (proposal) with trade-offs

Everything here is a **Proposal**. Numbers named as defaults are the library's documented
defaults, not new requirements.

### 6.1 Library and configuration (Q4, ADR 0004)

- **Better Auth**, pinned at or above v1.7.7; advisory alerts; patch within days.
- **Plugins on:** email OTP; the Microsoft provider only if section 6.2 step 3 applies; passkeys
  later. **Off:** email/password, magic link, admin (impersonation, Q7), OAuth proxy, SCIM,
  organisation, and SSO until production SSO is scoped.
- **Placement:** all auth tables in `auth_private`, reached only by `cc_auth` (ADR 0003).
- **Sessions:** database sessions, cookie cache off; opaque session ID in a cookie with
  `HttpOnly`, `Secure`, the `__Host-` prefix and `SameSite=Lax`, set explicitly (OWASP). `Lax`
  because sign-in callbacks are cross-site navigations (interpretation).
- **Hygiene:** `disableSessionRefresh: true`; IP and user agent not stored if possible (PQ-48);
  lifetime set by the owner (PQ-47; the library default is 7 days, inside NIST's AAL1
  recommendation). Codes stored hashed (`storeOTP: "hashed"`), and tokens hashed
  (`storeToken: "hashed"`) wherever the library offers it.
- **Linking:** `disableImplicitLinking: true`; no trusted providers. Random UUID IDs.
- **Tests:** the impersonation route returns 404; a session row is unchanged across requests;
  non-allow-listed domains are rejected; no identity field appears in content-route logs or error
  payloads (§9).

### 6.2 Sign-in methods

1. **Spike S1 first**, only if the owner answers PQ-44 with a yes (section 6.7).
2. **Always: a 6-digit email code**, typed or pasted into one `autocomplete="one-time-code"`
   field. Only addresses whose normalised domain exactly matches the **admin-configured
   allow-list** (default proposal `uwaterloo.ca`; PQ-45), checked on both send and verify.
   Content-free email (owner-approved copy (to be written)), tracking off, rate limits per Q20.
3. **"Sign in with Microsoft"** only if S1 passes and PQ-44 allows it: tenant-pinned authority,
   `iss`/`tid` validated, guests rejected, scopes `openid profile email` only. If S1 fails, ask
   UW IST instead of shipping it.
4. **Later:** optional passkeys for returning users, added while signed in.
5. **Local/CI only:** a Keycloak container as a fake OIDC/SAML IdP for the production code path.

**Trade-off:** email codes are a prototype method. What §10 "sign in securely" means for
production is PQ-47, and the expected production answer is UW SSO (M7) or LTI (L1).

### 6.3 Role bootstrapping (options; the owner decides under PQ-46)

An email domain cannot separate staff from students (role-specific UW subdomains are
**Unverified**).

| Role | Options | Notes |
|---|---|---|
| Institutional admin | A: the owner's identity in a deploy-time allow-list. B: a grant run by the owner from CI | A *prototype* admin, not a UW one; record it in the threat model (Q8, PQ-10) |
| Instructor | A: vetted allow-list (request, manual check, grant). B: clearly unofficial sandbox courses. C: invite-only pilot | Section 6.5 assumes A; real authority later comes from LTI |
| TA | Single-use invite (P7) | No permissions until assigned (§5); list is PQ-67 |
| Student | Join link or code now; roster only after a UW review; LTI in production | Join codes are weak proof (PQ-46) |

Role grants are candidate audited events (Q14). Whether one person can be TA and student in one
course is PQ-29.

### 6.4 Identity linking and the data model

Illustrative sketch, not code; names are placeholders; all in the identity domain.

```
identity.person             id = random UUID; display name; status
auth link                   Better Auth "account" rows, plus LTI rows in the same shape:
                            (person_id, provider_id, issuer, subject), UNIQUE (provider_id, subject)
                              'email-otp'          subject = normalised email (WEAK)
                              'entra:<tenant id>'  subject = oid; issuer fixed by tid
                              'lti:<platform iss>' subject = LTI sub
identity.course             same row whether created manually or by LTI
identity.course_lti_context (course_id, deployment, context_id), UNIQUE (deployment, context_id)
identity.course_membership  (course_id, person_id, role, status, source)
                              source: manual | join_link | join_code | invite | lti_launch | lti_nrps
identity.ta_permission      (course_id, person_id, permission); never set from LMS claims
identity.join_link / ta_invite / lti_registration / lti_deployment / lti_oidc_state
                            tokens and state stored only as hashes; lti_* empty until production
```

Rules: never link by email; link only explicitly, with both identities proven in one session,
and audit it (Q14); Entra keyed on `oid` with `tid` fixed, so a later UW-registered app maps to
the same person (with the SSO plugin, through `resolveUser`, inference); LTI keyed on
`(iss, sub)`, with `client_id` and `deployment_id` stored as launch attributes (reconcile in the
Q5 ADR); a launch without `sub` creates nobody; email-code accounts move to SSO or LTI by explicit
link or a fresh start (PQ-06); no activity timestamps on identity rows (ADR 0003), with the
library's created/updated columns covered by PQ-48 and PQ-24.

### 6.5 Prototype provisioning (Q5; context for ADR 0004)

1. Vetted instructors create courses manually (P1; vetting is PQ-46).
2. Students self-enrol through a **join link** (P3) or a short **join code** (P2): hashed,
   expiring, revocable, rotatable, with rate-limited redemption (Q20). Optional per-course
   affiliation gate (P6).
3. TAs join by **single-use, expiring invite** (P7) delivered by the instructor, redeemed while
   signed in, confirmed by the instructor, with **no permissions until assigned** (interpretation
   of §5).
4. **No CSV import or email roster invites** before a UW privacy review (PQ-46, PQ-02).
5. The instructor's member view shows names, roles and statuses only: no join times, activity or
   counts (section 7.2).
6. The section 6.4 data model from day one, `lti_*` tables included.
7. A dark LTI spike against saLTIre and Moodle, if Q2 puts it in milestone 1.

### 6.6 Production provisioning (§10 "supported integrations")

- **L1 launch with just-in-time provisioning:** upsert person (iss, sub), course binding
  (deployment, context.id) and membership (`lti_launch`). No `context` or no `sub` provisions
  nothing.
- **L4 Deep Linking** for board and card links; custom parameters target an Assignment Card.
- **L3 AGS:** an instructor-clicked "apply to LEARN gradebook" that posts only the published value
  for each shared level (§7.11), `FullyGraded`, no `comment`. Whether this click is the "applies
  the result" moment of §7.10 is PQ-37. CSV export remains the fallback (Q12).
- **L2 NRPS**, optional: drops and TA discovery only; `user_id`, roles and status for non-launchers
  (PQ-50).
- **Registration:** Dynamic Registration plus a manual admin form (§4). A first-party session in
  a new window after launch; iframe embedding later (PQ-50). Two domains for staging and
  production.
- **On `jose`:** a login endpoint with single-use, hashed `state` and `nonce`; a launch endpoint
  that makes every Security Framework check (section 4.6) plus deployment, version and message
  type; a tool JWKS with `kid` and overlapping rotation. Negative tests: bad signature, wrong
  `aud`, replayed nonce, unknown deployment, missing `sub`.

**Role mapping (UW's actual mapping is Unverified):**

| LTI context role(s) | ClearCourse role |
|---|---|
| `membership#Instructor` without the TA sub-role | Instructor |
| `membership/Instructor#TeachingAssistant` | TA with no permissions until assigned (sub-role wins) |
| `membership#Learner` | Student |
| ContentDeveloper, Mentor, context Administrator, non-core, empty | No access until the owner decides (PQ-50) |
| Learner and Instructor in one context | Blocked; admin asked (PQ-29, PQ-50) |
| System or institution Administrator | Never grants ClearCourse institutional admin (Q1) |

### 6.7 Spikes (scratch only, outside the repo)

| Spike | Checks | Pass |
|---|---|---|
| S1 Entra consent (gated on PQ-44) | Consent screen, publisher display, returned claims, Duo; revoke afterwards | An ordinary UW user signs in with no admin action |
| S2 Better Auth | Tenant pinning, linking, refresh off, IP/UA empty, cookie attributes, token at rest, `cc_auth` confinement | Section 6.1 holds, or gaps are written up |
| S3 Code deliverability to UW Microsoft 365 | Inbox or junk, rewriting, delay, scanner fetches | Codes arrive in the inbox within minutes |
| S4 saLTIre launch on `jose` | Every Security Framework check plus negatives | All pass |
| S5 Moodle in Docker | Dynamic Registration, Deep Linking, NRPS, AGS | Each round-trips |
| S6 Browsers | New-window vs iframe launch in Safari, Firefox, Chrome | New window works everywhere |
| S7 D2L developer instance | Whether independent developers may register LTI tools | Answer recorded |

Contacting UW (for example LEARN help) about an integration request needs the owner's approval.

### 6.8 What would change the recommendation

- S1 passes and PQ-44 allows it: Microsoft becomes the primary button; codes stay as fallback.
- S2 shows Better Auth cannot meet ADR 0003's session hygiene: a thin session layer of our own or
  another library.
- A UW sponsor appears: LTI moves to the pilot, and roster import may become possible under an
  IRA-PIA.
- PQ-01 says real UW students: the PQ-02 review comes first.
- ADR 0001 drops TypeScript: Better Auth and `jose` must be replaced.

## 7. Privacy implications (§6)

No option touches anonymous content directly. They differ in who else holds identity and sign-in
timing, how weak the identifier is, and how much personal data enters the identity domain. An
in-app library keeps the identity domain in our own database (§6.1); a hosted vendor would split
it across two systems and complicate the threat model (interpretation).

### 7.1 What each party learns

| Party | Learns | §6 note |
|---|---|---|
| Microsoft and UW tenant admins (M1) | Who signed in and when; the consent record; a service principal in UW's directory; immutable logs | **Timing side channel (inference)**: with precise post times and few users, sign-in logs could narrow down a poster |
| Email provider (M2) | Recipient, send time, the code | Same channel; tracking off; content-free mail |
| UW mail system | Message trace (sender, recipient, start of subject); with Defender, clicked URLs with user and IP | Generic subjects; codes, not links |
| Google or GitHub (M5) | That the person uses the app | Unneeded disclosure |
| LEARN (L1–L4) | Who launched and when; perhaps visit counts (**Unverified** for LTI links) | Outside our control; a documented limitation |
| Our identity domain | Person, auth links, sessions, roles, memberships | Separated per §6.1 item 3 and ADR 0003 |

**What each provisioning method stores.** Join links, codes, TA invites and LTI launches create
records only for people who chose to arrive. Email invites (P4), CSV rosters (P5) and full NRPS
pulls (L2) create records for people who never used ClearCourse, which is a further reason to
avoid them or restrict them to minimal fields.

### 7.2 Boundary rules and side channels for the threat model (§6.2, Q8)

- Content and participation code never receive the user ID, auth subject (`oid`, email, `sub`),
  session token or email; the auth layer passes a narrow decision ("may act as a Student of course
  C"). What crosses for crediting is ADR 0003's linkage module.
- `sub` and `oid` are identity data: never a content or participation key, and never hashed
  without a key (the §12 known issue applies).
- **Logging:** no cookie, user ID or email on content routes; a redacting logger on the auth
  library; auth errors in a separate channel; raw `id_token`s and claims never logged; launch
  errors scrubbed before any error report.
- **Join and launch timing:** "joined 10:02" plus "first question 10:03" deanonymizes in small
  classes. Never show join or launch times to staff or admins; never log membership and content
  events in one stream; coarse membership dates at most (PQ-24). IP addresses are PQ-11.
- **Member lists** may be shown to instructors (§5) but never with counts, timestamps or content
  (§3, §6.2).
- **AGS `comment`** is visible to students and instructors: never sent. Scores carry only the
  published level value (§7.10).
- **Account linking** joins two identities: explicit, dual-proof, audited without content.
- **Names:** UW's advice that it is "best to choose a tool that does not require students to
  identify themselves" is in tension with §7.10, which needs a name when a student chooses to
  share. Where that name comes from (self-entered, Entra claim, LTI) is PQ-49.

### 7.3 LTI privacy settings to request from UW (Proposal)

| Brightspace setting | Proposed | Reason |
|---|---|---|
| First and last name | On | §7.10 "student name"; not in UW's standard data set (PQ-49) |
| Email | Only if Q6/Q13 need it | §7.13 |
| OrgDefinedId, Username | Off unless Q12 needs a LEARN CSV | AGS does not need them |
| `SendInstitutionRole` (registration) | Off unless needed | Minimisation; never grants institutional admin |
| `PreProvisioning` | Off | Avoids records for non-users |
| Open as External Resource | On | First-party session; avoids cookie failures |

## 8. Risks

| Risk | Likelihood / impact | Mitigation (Proposal) |
|---|---|---|
| UW never integrates a solo-run tool (governance criteria, CIO contract approval, IRA-PIA owned by UW) | Unknown / high | Look for a UW sponsor early (PQ-02); the privacy ADRs and threat model feed an IRA-PIA |
| Better Auth advisories keep landing | High / high | Pin, alerts, Dependabot, patch within days, minimal plugins, negative auth tests |
| Email codes are weak proof (alumni, retirees, reassignable email) | Certain / medium | Prototype only; instructor vetting; production on SSO or LTI (PQ-45, PQ-47) |
| Send caps or junk folders block sign-in | Medium / high | SES production access early; SPF/DKIM/DMARC; spike S3; Resend as dev fallback (PQ-42) |
| UW objects to, or blocks, the Entra app | Medium / medium | Ask first (PQ-44); never the only method |
| Join links leak | High / low–medium | Expiry, rotation, revocation, limits, optional gate; owner decides acceptability (PQ-46) |
| A TA invite reaches the wrong person | Low / high | Single use, short expiry, instructor confirmation, no permissions until assigned |
| Our LTI code has a security flaw | Medium / high | The spec's MUST list, conformance runs, negative tests, security review, certification if wanted (PQ-50) |
| Sign-in, join or launch timing deanonymizes a poster | Medium / high | Section 7.2; coarse times (PQ-24); documented limitation (Q8) |
| Prototype accounts cannot move to production cleanly | Medium / medium | (issuer, subject) model from day one; explicit link or fresh start (PQ-06) |
| Better Auth cannot meet ADR 0003's session hygiene | Unknown / medium | Spike S2; a thin session layer as fallback |

## 9. Open questions

Existing questions informed (none closed): **Q4**, **Q5**; Q1 (admin UI for domains and LTI
registrations), Q2 (dark LTI spike), Q3, Q6, Q7, Q8, Q9, Q12, Q14, Q15, Q17, Q18, Q20 (as in
section 2).

Proposed new questions use the canonical IDs (raw-note IDs in brackets):

| ID | Question | When |
|---|---|---|
| PQ-01 | Will the prototype be used with real UW courses and students, or only demo courses and invited testers? | M1a |
| PQ-02 | Is a UW privacy review, a signed DPA or other approval needed before real UW users sign in? Who is the UW sponsor? [PQ-A1-7, PQ-A2-4] | M1a (if PQ-01 = real) |
| PQ-05 | Expected pilot scale (sizes code volume and send caps) | Pilot |
| PQ-06 | Do prototype accounts and data carry over into production? [PQ-A1-4, PQ-A2-9] | M1a |
| PQ-10 | Is the operator (the owner as prototype admin, later UW IT) inside the trust boundary? | ADR 0003 |
| PQ-11 | Are IP addresses and request metadata identity-bearing? | ADR 0003 |
| PQ-24 | What precision is stored and shown for post times (and membership dates)? [PQ-A1-6, PQ-A2-7] | ADR 0003 |
| PQ-29 | Can one person be a TA and a student in the same course? | M1a |
| PQ-37 | Does "applies the result" (§7.10) mean an in-app action, a LEARN grade push, or both? | M2 |
| PQ-42 | AWS Paid-plan account for SES; a UW sending path; a fallback provider | M1a |
| PQ-44 | May we test and use sign-in against UW's Entra tenant without asking UW first? [PQ-A1-1] | ADR 0004 |
| PQ-45 | Which email domains count as institutional, and may alumni and retirees sign in? [PQ-A1-2] | ADR 0004 |
| PQ-46 | Who may become an Instructor or admin in the prototype, and how is it verified? Is a join code proof of enrolment? May instructors upload rosters before a UW review? [PQ-A1-3, PQ-A2-3] | M1a |
| PQ-47 | What does "sign in securely" (§10) require: lifetime, idle timeout, MFA or passkeys for staff? [PQ-A1-5] | ADR 0004 |
| PQ-48 | May the auth library store IP, user agent and created/updated times on sessions; must refresh be disabled? | ADR 0004 |
| PQ-49 | What is the authoritative source of the shared "student name", and what profile data is needed? [PQ-A1-8, PQ-A1-9, PQ-A2-5] | M1a |
| PQ-50 | LTI production details: role mapping, TA defaults, iframe vs window, what a course is in LTI terms, manual courses alongside LTI, NRPS fields, passback identifiers, certification [PQ-A2-1, -2, -5, -6, -8, -10, -11, -12] | Prod |
| PQ-67 | What is the exact list of TA permissions an instructor can assign? | M1a |

## 10. Sources and verification log

"Verified" means stated on the official page and confirmed by the fact-check; "corrected" means
the fact-check refined the claim and the corrected version is used above.

| Claim | URL | Checked | Status |
|---|---|---|---|
| UW tenant ID and AD FS federation | https://login.microsoftonline.com/uwaterloo.ca/v2.0/.well-known/openid-configuration ; https://login.microsoftonline.com/getuserrealm.srf?login=someone@uwaterloo.ca&xml=1 | 2026-10-11 | Verified |
| Consent defaults; managed policy | https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent ; https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-app-consent-policies | 2026-10-11 | Verified |
| UW tenant consent setting | none public (see https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44816171143/Gnome+Online+Accounts) | 2026-10-11 | **Unverified** |
| Publisher verification; Partner Center business check | https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview ; https://learn.microsoft.com/en-us/partner-center/enroll/understand-the-verification-process | 2026-10-11 | Verified, corrected (solo-owner implication is inference) |
| Service principal on consent; `iss`/`tid` checks | https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant | 2026-10-11 | Verified (tenant-pinned authority **Unverified**) |
| `oid`, `sub`, `email` claim rules | https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference | 2026-10-11 | Verified |
| Sign-in logs immutable | https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins | 2026-10-11 | Verified (timing channel is inference) |
| App registration needs an Azure subscription | https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app | 2026-10-11 | Verified (card requirement **Unverified**) |
| Better Auth Microsoft provider keys on `oid` | https://www.better-auth.com/docs/authentication/microsoft | 2026-10-11 | Verified (tenant pinning, scopes **Unverified**) |
| UW mailboxes for alumni and retirees | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email | 2026-10-11 | Verified |
| Safe Links; `UrlClickEvents`; message trace | https://learn.microsoft.com/en-us/defender-office-365/safe-links-about ; https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-urlclickevents-table ; https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac | 2026-10-11 | Verified (UW licensing **Unverified**) |
| Scanner pre-fetch uses up a magic link | none | 2026-10-11 | **Unverified** (inference; spike S3) |
| Better Auth magic link, email OTP, hooks | https://www.better-auth.com/docs/plugins/magic-link ; https://www.better-auth.com/docs/plugins/email-otp ; https://www.better-auth.com/docs/concepts/hooks | 2026-10-11 | Verified, corrected (single use depends on storage) |
| NIST 800-63B-4 email and session rules | https://pages.nist.gov/800-63-4/sp800-63b.html | 2026-10-11 | Verified, corrected (timeouts are SHOULD) |
| WCAG 2.2 SC 3.3.8 | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | 2026-10-11 | Verified |
| Resend Free limits; SES pricing and sandbox | https://resend.com/pricing ; https://aws.amazon.com/ses/pricing/ ; https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html | 2026-10-11 | Verified |
| WebAuthn Level 3; Better Auth passkey plugin | https://www.w3.org/TR/webauthn-3/ ; https://www.better-auth.com/docs/plugins/passkey | 2026-10-11 | Verified |
| Google `hd`; GitHub emails API | https://developers.google.com/identity/openid-connect/openid-connect ; https://docs.github.com/en/rest/users/emails | 2026-10-11 | Verified |
| Keycloak sizing | https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing | 2026-10-11 | Verified (hosted cost **Unverified**) |
| UW GitHub uses Entra SAML with Duo | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/45093290829/Using+GitHub+at+the+University+of+Waterloo | 2026-10-11 | **Unverified** (search excerpt) |
| Better Auth releases, licence, advisories | https://github.com/better-auth/better-auth/releases ; https://github.com/better-auth/better-auth ; https://github.com/better-auth/better-auth/security/advisories | 2026-10-11 | Verified, corrected (Critical in SCIM, not SSO; 9 more on 31 May) |
| Better Auth sessions, cookies, accounts, admin, SSO | https://www.better-auth.com/docs/concepts/session-management ; https://www.better-auth.com/docs/concepts/cookies ; https://www.better-auth.com/docs/concepts/users-accounts ; https://www.better-auth.com/docs/plugins/admin ; https://www.better-auth.com/docs/plugins/sso | 2026-10-11 | Verified (IP/UA suppression, `SameSite`, prefix, token at rest **Unverified**) |
| Auth.js joins Better Auth; Lucia deprecated | https://authjs.dev/ ; https://www.better-auth.com/blog/authjs-joins-better-auth ; https://lucia-auth.com/ | 2026-10-11 | Verified |
| Clerk, Supabase, WorkOS, Auth0, Firebase pricing | https://clerk.com/pricing ; https://supabase.com/pricing ; https://supabase.com/docs/guides/auth/auth-smtp ; https://workos.com/pricing ; https://auth0.com/pricing ; https://firebase.google.com/pricing | 2026-10-11 | Verified (WorkOS SSO period, Firebase per-MAU **Unverified**) |
| OWASP session guidance | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | 2026-10-11 | Verified |
| OIDC Core §5.7 | https://openid.net/specs/openid-connect-core-1_0.html | 2026-10-11 | Verified |
| LTI 1.3 Core; Security Framework | https://www.imsglobal.org/spec/lti/v1p3/ ; https://www.imsglobal.org/spec/security/v1p0/ | 2026-10-11 | Verified, corrected (`kid` in key sets; principal role is best practice) |
| NRPS, AGS, Deep Linking, Dynamic Registration | https://www.imsglobal.org/spec/lti-nrps/v2p0 ; https://www.imsglobal.org/spec/lti-ags/v2p0 ; https://www.imsglobal.org/spec/lti-dl/v2p0 ; https://www.imsglobal.org/spec/lti-dr/v1p0 | 2026-10-11 | Verified |
| Third-party cookie defaults | https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies | 2026-10-11 | Verified |
| Brightspace support, registration, roles, reports, CSV | https://community.d2l.com/brightspace/kb/articles/23660-lti-advantage-v1-3 ; https://community.d2l.com/brightspace/kb/articles/23662-tool-registration-deployment-and-links ; https://community.d2l.com/brightspace/kb/articles/23663-org-units-and-role-mapping ; https://community.d2l.com/brightspace/kb/articles/23391-leveraging-tool-level-reporting-in-brightspace-to-access-course-level-data ; https://community.d2l.com/brightspace/kb/articles/3537-import-grades-and-grade-items (text via `community.d2l.com/api/v2/articles/<id>`) | 2026-10-11 | Verified, corrected (partial-support caveat; DR registration disabled). UW role mapping and LTI-link tracking **Unverified** |
| Deployment flags; `Anonymous` always false | https://docs.valence.desire2learn.com/res/ltiadvantage.html | 2026-10-11 | Verified; **Conflicting** with KB 23662 |
| LEARN tool review and data set; Piazza setup | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44088164615/LEARN+Privacy+information+and+other+tools ; https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/43073961985/Integrating+Piazza+with+a+LEARN+course | 2026-10-11 | Verified |
| IRA-PIA; EdTech governance; supported tools | https://uwaterloo.ca/privacy/information-risk-assessment ; https://uwaterloo.ca/educational-technology-hub/governance ; https://uwaterloo.ca/educational-technology-hub/catalogs/centrally-supported-tools | 2026-10-11 | Verified, corrected (LEO assists, does not decide). Public intake form **Unverified** |
| UW instructor guidance | https://uwaterloo.ca/privacy/guidelines/online-educational-technologies ; https://uwaterloo.ca/information-systems-technology/about/policies-standards-and-guidelines/teaching-learning/cloud-based-educational-technologies | 2026-10-11 | Verified (second page dated July 2017) |
| `jose`; `ltijs` | https://registry.npmjs.org/jose/latest ; https://api.github.com/repos/panva/jose ; https://api.github.com/repos/Cvmcosta/ltijs/releases?per_page=5 | 2026-10-11 | Verified (ltijs Postgres adapter **Unverified**) |
| saLTIre; Moodle; 1EdTech certification | https://saltire.lti.app/ ; https://api.github.com/repos/moodlehq/moodle-docker ; https://docs.moodle.org/en/External_tool ; https://www.1edtech.org/certification/get-certified | 2026-10-11 | Verified, corrected (saLTIre Deep Linking shown for its Test Tool). NRPS on saLTIre and membership fee **Unverified** |
| Whether a D2L developer instance allows LTI registration | none | 2026-10-11 | **Unverified** (spike S7) |
