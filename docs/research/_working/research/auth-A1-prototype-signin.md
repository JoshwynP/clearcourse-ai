# Branch A1: Prototype authentication (Q4) without UW's cooperation, with a path to production SSO

> **Research and planning notes only. Not a decision.** `P:/code/clearcourse-ai/CONTRIBUTING.md` is the source of
> truth. Requirements are cited as §N.N. Everything labelled **Proposal** is for the owner to approve or reject
> through an ADR (CONTRIBUTING §1, §12, §14). Vendor facts carry a URL and "(checked 2026-10-11)". Anything I
> could not verify is marked **Unverified**. Anything I reasoned out rather than read is marked **(inference)**.
> Today: 2026-10-11.

Status: COMPLETE (first pass), 2026-10-11. Second pass, same day: the workflow re-ran this branch. To save budget,
the first-pass research was **not** repeated. Only two remaining Unverified items were closed (Better Auth licence;
GitHub OAuth email semantics, §3.4 and §3.6). All other facts stand as checked earlier on 2026-10-11.

---

## 0. Summary

- **Deal-breaker check on "Sign in with Microsoft" (Entra multi-tenant OIDC).** `uwaterloo.ca` is a real Microsoft
  Entra tenant (ID `723a5a87-f39a-4a22-9247-3fc240c01396`), federated to UW's AD FS at `adfs.uwaterloo.ca`. So a
  third-party multi-tenant app *can* technically sign UW users in through UW's own login page. **Whether UW's tenant
  lets ordinary users consent to an unknown app is not published anywhere I could find.** UW IST does run an
  "M365 Admin request" process for at least one third-party app (GNOME Online Accounts). A solo developer
  realistically **cannot get Microsoft publisher verification**, because it needs a Microsoft AI Cloud Partner
  Program account backed by a legally registered business. If UW requires admin consent or verified publishers,
  this option is dead without UW's cooperation. It costs about one hour and $0 to find out (spike S1, §6.3).
- **Email one-time codes restricted to institutional domains** work with no cooperation from UW. Use a 6-digit
  code that the user types or pastes, **not a clickable magic link**. Microsoft Defender Safe Links scans URLs
  before delivery and detonates links with no reputation in the background. Better Auth's magic link is a
  single-use `GET`, so a scanner can use it up before the user clicks **(inference)**. An `@uwaterloo.ca` address
  proves that someone controls a UW mailbox. It does **not** prove role or current status: UW gives Microsoft 365
  email to alumni and retirees as well as students and employees.
- **Passkeys** (WebAuthn Level 3 became a W3C Recommendation on 25 Aug 2026) resist phishing and reduce email
  volume, but prove nothing about affiliation. Add them only after a first sign-in by another method.
- **Google/GitHub OAuth do not prove UW affiliation.** Google's `hd` claim exists only for Google Cloud
  organisations, and Google says the domain of the `email` claim can't be relied on. **Keycloak** as a hosted
  stand-in needs about 1.25 GB RAM plus a database, and still proves nothing about UW. It is useful only as a
  local/CI test IdP.
- **Library proposal: Better Auth** (v1.7.7 is "Latest"). It is mainstream and now also steward of Auth.js, which
  gets "security patches and urgent issues" only. Lucia was deprecated in March 2025. Be candid about the cost:
  Better Auth published **10 security advisories between 26 Jun and 30 Sep 2026, including 2 Critical**. Several
  were in the SSO and magic-link code. Pin the version, subscribe to advisories and keep plugins to a minimum.
- **Recommendation (Proposal):** Better Auth with database sessions in the identity schema. Email OTP restricted
  to a list of admin-configured domains is the always-available method. "Sign in with Microsoft", pinned to the
  configured UW tenant, is a second button switched on **only if spike S1 shows user consent works**. Use an
  identity-linking table keyed on `(issuer, subject)`, never on email. Bootstrap roles through an owner-held admin
  allow-list plus manual instructor vetting or clearly unofficial demo courses (options in §5.6; the owner decides).

---

## 1. Question(s) and what they block (cite §13)

| Item | Text (CONTRIBUTING) | How A1 relates |
|---|---|---|
| **Q4** | "Authentication for the prototype: real UW SSO, a generic OIDC provider, or a dev-only stand-in?" Blocks: **Sign-in** | This branch's main question. |
| Q2 | Prototype vs production; first-milestone features | The owner has said (relayed in the brief) that the first milestone is "a public prototype that people can actually sign in to and use". **This is not yet recorded in CONTRIBUTING §13/§16.** It should be recorded before anyone relies on it (CONTRIBUTING §1, "Changing this document"). |
| Q3 | Stack and hosting (§12) | Better Auth is TypeScript-only. A Python stack would need a different library. |
| Q5 | Course/role provisioning: LTI 1.3, CSV, manual… `[src p.19]` | Decides who becomes Instructor/TA/Student and how enrolment is proven. Role bootstrapping (§5.6) is a stopgap until Q5 is answered. |
| Q6 | Email delivery provider | Email OTP depends on it, and on its free-tier limits. |
| Q7 | Impersonation/support procedure | Better Auth's admin plugin includes impersonation. It must stay off (§5). |
| Q9 | Mechanism keeping content and identity unjoinable | Auth identifiers (user ID, session token, `oid`, email) must stay in the identity domain (§6.1 item 3). Q9 decides what crosses the boundary. |
| Q14 | Audited events and retention | Sign-in, role grants and account links are candidate audited events. Not decided. |
| Q15 | Accessibility target | Affects the OTP input design (WCAG 2.2 SC 3.3.8, if that target is chosen). |
| Q17 | Retention/deletion | Retention of sessions, verification codes and identity links. |

Requirements this branch relies on:

- §10: "Institutional users can sign in securely" and "Courses and roles can be provisioned through supported
  integrations" `[src p.19]`.
- §11: authentication and authorization are deliverables `[src p.1]`.
- §5: four roles; authorization is "strict, role-based and course-based"; no impersonation without an audited
  procedure `[src p.2]`.
- §6.1–6.2: five separated domains; identity-bearing information and anonymous-content text must never appear
  together in logs, analytics, error reports, views, exports or dashboards `[src p.3]`.
- §4: everything institution-specific (names, links, branding, LMS configuration) is administrator-configurable
  `[src p.1]`. **(Inference:)** this should extend to the allowed email domains and the Entra tenant ID.
- §8: polished, credible, accessible `[src p.18–19]`.
- §12 *Advisory* (not binding): "institutional SSO via SAML or OAuth 2.0 / OIDC (for UW: Microsoft Entra ID /
  WatIAM), with no custom password system. Sessions use secure HTTP-only cookies". §12 also lists the known issue
  "A hosted SSO integration with UW requires the institution's cooperation. A prototype may need a stand-in
  identity provider (Q4)."

Owner constraints (relayed in the brief, verbatim): public prototype people can sign in to; running costs under
$5/month, preferring free tiers and managed services; must not paint production into a corner, especially the
privacy architecture (§6); a solo builder using mainstream, well-documented tools.

---

## 2. Options considered

### 2.1 Sign-in methods

| # | Method | Proves UW affiliation? | Needs UW cooperation? | Running cost | Production continuity | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Entra ID multi-tenant OIDC** ("Sign in with Microsoft"), authority pinned to the UW tenant | **Yes: membership in the UW Entra tenant** (`tid`). Not role. Alumni/guest status needs checks (§3.1) | **Maybe.** Depends on UW's user-consent policy, which is not public. Spike S1 | $0 for auth **(Unverified: needs an Azure account "with an active subscription"; a free account is offered)** | **Best.** `oid` is the same for every app in a tenant, so a later UW-sanctioned Entra app sees the same `(tid, oid)` | **Conditional yes.** Ship it if S1 passes. It is not safe as the *only* method until UW agrees |
| 2a | **Email one-time code (OTP)**, allowed domains admin-configured (default `uwaterloo.ca`) | Partial: control of a UW mailbox now. Alumni and retirees also have UW mailboxes | **No** | Email provider free tier (for example Resend Free: 3,000/month, **100/day**) | Weak identifier (email is reassignable). Needs explicit linking later | **Yes, as the baseline method** |
| 2b | Email magic link (clickable) | Same as 2a | No | Same | Same | **No, unless redesigned.** Link scanners may use up single-use `GET` tokens. Use 2a, or an interstitial page with a POST button |
| 3 | Passkeys (WebAuthn L3) | **No** (no affiliation information) | No | $0 | Neutral: an extra authenticator on an existing person | **Later / optional.** Add after first sign-in. Phishing-resistant |
| 4 | Google / GitHub OAuth | **No** (`hd` only for Google Cloud organisations. GitHub's emails API makes no claim of organisational affiliation) | No | $0 | Adds unrelated issuers | **No.** Adds a third party that learns who uses the app, and proves nothing |
| 5 | Self-hosted IdP stand-in (Keycloak) | No (unless federated to Entra, which brings back option 1's consent problem) | No | About 1.25 GB RAM container plus DB. **Over the $5 target (inference; PaaS prices not checked in this branch)** | Good *test fixture* for SAML/OIDC code paths | **No for hosting. Yes as a local/CI test IdP** |
| 6 | Real UW SSO (UW registers the app, or an AD FS relying party) | Yes, with any attributes UW releases | **Yes** (by definition) | $0 | It is the production path | Out of scope for "without cooperation". Note that UW already uses "SAML single sign-on through Microsoft Entra ID with Duo MFA" for its GitHub organisation |

### 2.2 Libraries and managed services

| Option | Current status / price (checked 2026-10-11) | Fit for this project | Verdict |
|---|---|---|---|
| **Better Auth** (in-app library, TypeScript) | v1.7.7 marked "Latest" (30 Sep). Plugins: Microsoft provider (uses `oid`), email OTP, magic link, passkey (`@better-auth/passkey`), SSO (OIDC + SAML 2.0 via samlify). DB sessions by default. 10 advisories 26 Jun to 30 Sep 2026 (2 Critical) | Identity stays in *our* Postgres identity schema. Mainstream. The SSO plugin offers a production SAML path with no per-connection fee | **Proposed** (if Q3 picks TypeScript). Pin to ≥1.7.7 |
| Auth.js / NextAuth | "The Auth.js project is now part of Better Auth." Announced Sep 22 2025: "security patches and urgent issues"; "strongly recommend new projects to start with Better Auth" | Maintenance mode | Not for a new project |
| Lucia | "Lucia was deprecated in March 2025." The site is now a learning resource plus a copyable `auth_session.ts` | Would mean hand-rolling everything | No |
| Clerk | Hobby: "50,000 MRU limit per app", custom domain included, **Clerk branding not removable** (Pro only). Pro "$25/mo"; SSO from Pro ("1 SSO connection included", then $75/mo each). Data region not stated | Identity store sits at the vendor. Production SSO costs at least $25/mo | No. Possible fallback |
| Supabase Auth | Free: 50,000 MAU; "Free projects are paused after 1 week of inactivity"; SAML SSO "Not included" on Free (Pro from $25/month, 50 SSO MAU then $0.015). Default SMTP is "2 messages per hour", team addresses only | Ties identity to Supabase's `auth` schema. Pausing hurts a public prototype | No (unless the stack branch picks Supabase anyway) |
| WorkOS AuthKit | "First 1M MAUs" free; SSO "$125/ea" per connection (billing period not stated on the page: **Unverified** whether monthly); custom domain "$99/mo" | Free tier is very generous, but the production UW SSO connection is $125+ and a custom domain is $99/mo | No |
| Auth0 | Free: "Up to 25,000 monthly active users", "1 Enterprise Connection (NEW)", 1 custom domain (card verification). B2C Essentials from $35/month | The free enterprise connection could carry a UW SAML connection at $0. Lock-in, and an external identity store | Fallback only |
| Firebase Auth / Identity Platform | Spark: 50K MAUs; SAML/OIDC: 50 MAUs free, then "Google Cloud pricing" (**per-MAU price Unverified**: the Google Cloud page was truncated) | External identity store. SAML MAU charges | No |

---

## 3. Evidence (URLs + checked date)

All checked 2026-10-11 unless stated. Quotes are verbatim from the page as returned.

### 3.1 Microsoft Entra ID (option 1)

**UW's tenant (public discovery endpoints)**
- `https://login.microsoftonline.com/uwaterloo.ca/v2.0/.well-known/openid-configuration` returns issuer
  `https://login.microsoftonline.com/723a5a87-f39a-4a22-9247-3fc240c01396/v2.0` and `tenant_region_scope: "NA"`.
- `https://login.microsoftonline.com/getuserrealm.srf?login=someone@uwaterloo.ca&xml=1` returns
  `NameSpaceType: Federated` and `FederationBrandName: University of Waterloo`, with AuthURL at
  `https://adfs.uwaterloo.ca/adfs/ls/...`. So UW users would type their password at UW's own AD FS page, never at
  ClearCourse.
- UW IST KB, "Using GitHub at the University of Waterloo" (modified 2026-10-05): "Access to University-managed
  GitHub resources requires SAML single sign-on through Microsoft Entra ID with Duo MFA"
  (https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/45093290829/Using+GitHub+at+the+University+of+Waterloo,
  seen as a search excerpt). This points to the likely production SSO pattern: an Entra enterprise app with SAML
  or OIDC.

**User-consent defaults** (https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent, updated 2026-08-04)
- "By default, all users are allowed to consent to applications for permissions that don't require administrator consent."
- Microsoft recommends allowing "user consent only for applications that have been published by a verified publisher."
- Built-in option `microsoft-user-default-low`: "Allow limited user consent only for apps from verified publishers
  and apps that are registered in your tenant, and only for permissions that you classify as *low impact*."
- Admins can turn user consent off entirely and can enable the admin consent workflow.

**Microsoft-managed policy** (https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-app-consent-policies, updated 2026-08-28)
- "The setting labeled 'Let Microsoft manage your consent settings,' the Microsoft managed policy … This is also the
  default for a new tenant."
- Its rules: users can consent to "any user consentable delegated permissions EXCEPT" a list that includes
  `Files.Read.All`, `Mail.Read`, `Calendars.Read` and others. The basic sign-in scopes (`openid`, `profile`,
  `email`, `User.Read`) are **not** on the exception list.
- **Implication (inference):** a *new* tenant would let UW users consent to a sign-in-only app. UW's tenant is not
  new, and its setting is not public. **Unverified.**

**Publisher verification** (https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview, updated 2026-06-15)
- Requires "a Partner One ID for a valid Microsoft AI Cloud Partner Program account that has completed the
  verification process". The app must be registered with a work or school account. The publisher domain can't be
  `*.onmicrosoft.com`. "No charges are associated".
- "Beginning November 2020, if risk-based step-up consent is enabled, users can't consent to most newly registered
  multitenant apps that *aren't* publisher verified." This applies to apps requesting "permissions that extend
  beyond the basic sign-in and read user profile". A sign-in-only app falls outside it.

**Partner Center verification** (https://learn.microsoft.com/en-us/partner-center/enroll/understand-the-verification-process, updated 2026-07-28)
- Confirms "Your business is legally registered with an active registration at the stated address". Includes
  "Employment verification" (domain documents from a registrar) and "Business verification" (formation documents).
  "only trusted businesses can access the Partner Center environment."
- **Inference:** an individual without a registered business and a domain cannot become a verified publisher.

**UW public guidance on third-party M365 apps**
- IST KB "Gnome Online Accounts" (updated Nov 26, 2025): "Users that wish to use GOA to access their University of
  Waterloo Microsoft 365 (M365) account … must submit a request for access." "This request can be submitted as a
  M365 Admin request via the Infrastructure Services and Communications form in Jira."
  (https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44816171143/Gnome+Online+Accounts)
- GOA requests mailbox-type permissions, which need admin consent even under Microsoft's default policy. This page
  therefore **does not tell us** what happens for a sign-in-only app.
- Searches of UW's public Confluence (IST KB) for "admin consent", "admin approval", "third-party app",
  "enterprise application", "SAML", "ADFS" and "OIDC" found no general statement of UW's user-consent policy.
  **UW's tenant consent setting: Unverified.** A spike is proposed (§6.3).

**Multi-tenant mechanics** (https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant, updated 2026-06-15)
- When a user from another tenant consents, "a representation of the application called a *service principal* is
  created in the user's tenant". UW admins would therefore see the app in their directory.
- "A tenant administrator can disable the ability for regular users to consent to applications. If this capability
  is disabled, admin consent is always required".
- Multi-tenant apps "must validate that the `issuer` property in the published metadata matches the `iss` claim in
  the token, in addition to the usual check that the `iss` claim in the token contains the tenant ID (`tid`)
  claim."
- Authorities: `/common` (work, school and personal accounts) or `/organizations` (work and school only).
- **Proposal:** use the *tenant-specific* authority `https://login.microsoftonline.com/{configured-tenant-id}` so
  only UW-tenant accounts can sign in and the issuer is fixed. This is **inference**: the docs describe `/common`
  and `/organizations` for multi-tenant apps. Confirm in spike S1 that a multi-tenant registration accepts the UW
  tenant authority.

**Claims** (https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference, updated 2026-06-15)
- `oid`: "uniquely identifies the user across applications - two different applications signing in the same user
  receives the same value in the `oid` claim". It needs the `profile` scope.
- `sub`: "a pairwise identifier and is unique to an application ID".
- `email`: "isn't guaranteed to be correct and is mutable over time. Never use it for authorization or to save data
  for a user." `preferred_username`: "can't be used to make authorization decisions."
- `idp`: "identical to the value of the issuer claim unless the user account isn't in the same tenant as the
  issuer - guests, for instance."
- "If you need to share data across services, `oid` and `tid` is best as all apps get the same `oid` and `tid`
  claims for a user acting in a tenant."
- **This is the key fact for production continuity.** If production later uses a UW-registered app, the same person
  keeps the same `(tid, oid)`, while `sub` would change.

**Sign-in logs** (https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins, updated 2026-02-26)
- "Microsoft Entra logs all sign-ins into a Microsoft Entra tenant". Logs capture **Who** (user), **How** (client
  application) and **What** (resource). They are viewable by "at least a Reports Reader". "Entries in the sign-in
  logs are system generated and can't be changed or deleted." This matters for privacy (§4).

**App registration** (https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app, updated 2026-06-15)
- Prerequisite: "An Azure account that has an active subscription", with a link to "Create an account for free".
  Supported account types include "Multiple Entra ID tenants". **Unverified:** whether the free account requires a
  payment card.

**Better Auth Microsoft provider** (https://www.better-auth.com/docs/authentication/microsoft)
- "Better Auth uses the verified Microsoft Entra `oid` claim as the provider-owned account identifier". The docs say
  to "use `profile.oid` (plus `profile.tid` when correlating across tenants)". Upgrading from 1.6 needs a "one-time
  migration of existing Microsoft account rows from `sub` to `oid`."
- The example shows only `tenantId: 'common'`. The page says nothing about issuer/`tid` allow-listing, and does not
  list default scopes or say whether a Graph profile-photo call is made. **Unverified; check in spike S1.**

### 3.2 Email codes and links (option 2)

**UW mailboxes** (IST KB "Microsoft 365 email", modified Jun 23 2025, search excerpt): "Outlook email accounts are
provided to employees, students, alumni, retirees…"
(https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email).
- So an `@uwaterloo.ca` address is **not** proof of current enrolment or employment.
- A separate KB page exists about mail routed to an external address
  (https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/297799940/Issues+receiving+emails+when+routing+address+is+set+to+an+external+email).
  Some UW users read UW mail elsewhere.

**Link scanning** (https://learn.microsoft.com/en-us/defender-office-365/safe-links-about, updated 2026-05-22)
- "As long as Safe Links protection is turned on, URLs are scanned prior to message delivery".
- "URLs that don't have a valid reputation are detonated asynchronously in the background."
- Optional "Wait for URL scanning to complete before delivering the message" is described as "the recommended
  value".
- Safe Links needs Defender for Office 365. **Unverified whether UW licenses it.**
- Also noted on the same page (for Teams): sites "might require re-authentication when `SameSite=Strict` cookies
  are required" because of the intermediary redirect.

**Better Auth magic link** (https://www.better-auth.com/docs/plugins/magic-link)
- Expires in "`300` seconds (5 minutes)". Single-use: verification "consumes the token atomically on the first
  attempt". `storeToken` default "`plain`". Rate limit "`{ window: 60, max: 5 }`". Verification is
  "`GET /magic-link/verify`".
- **Inference:** a scanner's `GET` would use up the token before the user clicks.

**Better Auth email OTP** (https://www.better-auth.com/docs/plugins/email-otp)
- `otpLength` default `6`; `expiresIn` `300` seconds; `allowedAttempts` default `3`, after which "the OTP becomes
  invalid". `storeOTP` default "`plain`" (options `hashed`, `encrypted`). "If the user is not registered, they'll be
  automatically registered" unless `disableSignUp` is set. The page gives no guidance on domain restriction.

**Better Auth hooks** (https://www.better-auth.com/docs/concepts/hooks)
- A documented `before` hook rejects sign-up when `!ctx.body?.email.endsWith("@example.com")` by throwing an
  `APIError("BAD_REQUEST")`.
- Note: a plain `endsWith("uwaterloo.ca")` without the `@` would also accept `eviluwaterloo.ca`. Match the
  normalised domain exactly against the allow-list **(inference)**.

**Better Auth advisories relevant to email sign-in** (https://github.com/better-auth/better-auth/security/advisories)
- GHSA-965c-763c-88jm, **Critical**, Sep 30 2026: "OAuth state can be used as a Magic Link to sign in as another
  user". The releases page says v1.7.7 fixes a "critical Magic Link account-takeover vulnerability".
- GHSA-qq9h-g4jm-xgf3, High, Jun 26 2026: "Attacker's password keeps working after magic link or email OTP sign-in".
  This is only relevant if email/password is enabled. Proposal: never enable it.

**NIST SP 800-63B-4** (https://pages.nist.gov/800-63-4/sp800-63b.html; page timestamp 26 Aug 2025; "supersedes NIST
SP 800-63B")
- "Email **SHALL NOT** be used for out-of-band authentication". Manual-entry OTP and out-of-band methods
  "**SHALL NOT** be considered phishing-resistant".
- Confirmation codes "sent to validate email addresses" are "not authentication processes". Read honestly, email
  OTP sign-in is **not** an approved authenticator under 800-63B-4. It is an email-ownership check used as a login,
  which is acceptable for a prototype but not what §10 "sign in securely" should mean in production **(inference)**.
- Session guidance: overall timeout "**SHOULD** be no more than 30 days at AAL1". At AAL2, "no more than 24 hours"
  and inactivity "no more than 1 hour".

**Email provider example** (https://resend.com/pricing): Free "$0/mo", "3,000" emails per month, "limited to 100
emails per day", "3 domains", "30-day data retention". Pro "$20/mo" for 50,000. The provider itself is Q6. This is
cited only to size OTP volume.

**Supabase Auth default SMTP** (https://supabase.com/docs/guides/auth/auth-smtp): "2 messages per hour", delivery
refused to non-team addresses, "not meant for production use". After custom SMTP: "a low rate-limit of 30 messages
per hour is imposed" (adjustable).

**Accessibility** (https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html): SC 3.3.8 is
Level AA.
- "A service that requires _manual_ transcription of a verification code is not compliant". Paste and autofill must
  work. A six-separate-box OTP input where paste fills only the first digit is a documented failure.
- WebAuthn and email-link authentication are listed as techniques.
- Applies only if Q15 picks WCAG 2.2 AA. Q15 is open.

### 3.3 Passkeys (option 3)

- WebAuthn Level 3 is a "W3C Recommendation, 25 August 2026" (https://www.w3.org/TR/webauthn-3/). "Passkey" is
  listed as a synonym for client-side discoverable credential.
- Better Auth passkey plugin (https://www.better-auth.com/docs/plugins/passkey): "powered by SimpleWebAuthn". It is a
  separate package (`npm install @better-auth/passkey`). By default "make sure a user is authenticated and then call
  the `passkey.addPasskey` function"; passkey-first onboarding is opt-in. `userVerification` default `preferred`.
  Conditional UI (autofill) is supported.
- NIST 800-63B-4: WebAuthn is phishing-resistant "through verifier name binding". Syncable (exportable) keys are
  usable "at AAL2 or below".

### 3.4 Google / GitHub (option 4)

- Google (https://developers.google.com/identity/openid-connect/openid-connect): `hd` is "Provided only if the user
  belongs to a Google Cloud organization". "You also can't rely on the domain of the `email` claim to identify users
  of Google Workspace or Cloud organizations." Use `sub` as the identifier.
- **Unverified:** whether UW has any Google Workspace domain. UW mail is on Microsoft 365 (§3.2), so `hd=uwaterloo.ca`
  is not expected.
- GitHub (https://docs.github.com/en/rest/users/emails, checked 2026-10-11): "List email addresses for the
  authenticated user" returns `email`, `primary`, `verified` and `visibility` per address, and needs the
  `user:email` scope. The page does not say that a verified email shows membership of any organisation, and does
  not define what `verified` means. **Inference:** a verified `@uwaterloo.ca` address on a GitHub account would at
  most show that someone controlled that mailbox at some past time. That is weaker than option 2's fresh OTP.

### 3.5 Self-hosted Keycloak (option 5)

- https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing (shows "Nightly 26.8.0"):
  "The base memory usage for a Pod including caches of Realm data and 10,000 cached sessions is 1250 MB of RAM."
  Also "For each 15 password-based user logins per second, allocate 1 vCPU". These are HA multi-cluster figures; a
  single dev node can be smaller. **(Unverified for single-node minimums.)**

### 3.6 Libraries and services

- Better Auth releases (https://github.com/better-auth/better-auth/releases): v1.7.7 "Latest" (30 Sep), v1.7.6
  (24 Sep), v1.7.5 (14 Sep), v1.6.33 (14 Sep). The page shows no year; 2026 is inferred because the v1.7.7 fix
  matches the Sep 30 2026 advisory.
- Better Auth advisories (https://github.com/better-auth/better-auth/security/advisories), page 1 of 4: 10 advisories
  from 26 Jun to 30 Sep 2026. Two are Critical (magic link via OAuth state; SCIM token takeover). Several High ones
  hit `@better-auth/sso` (GHSA-mx9r-x6ww-qjw9, GHSA-8c5h-wx78-2cfg, GHSA-prpr-5gj3-qqhg).
- Better Auth repository (https://github.com/better-auth/better-auth, checked 2026-10-11): "MIT license", about
  "30.3k" stars. The licence is permissive and the adoption signal supports "mainstream" (owner constraint).
- Better Auth SSO plugin (https://www.better-auth.com/docs/plugins/sso): "supports OpenID Connect (OIDC), OAuth2
  providers, and SAML 2.0". OIDC accounts are identified "by the provider ID and the verified `sub` claim". SAML
  accounts by "provider ID and the signed `NameID`". `resolveUser` maps identities "instead of relying on email
  matching". "Replay protection is **always enabled**". The page contradicts itself on whether `InResponseTo`
  validation is on by default.
- Better Auth sessions (https://www.better-auth.com/docs/concepts/session-management): "By default, Better Auth
  already stores sessions in the database". Expires "after 7 days by default". With the cookie cache, "revoked
  sessions may remain active on other devices until the cookie cache expires (`maxAge`)". Stateless mode is enabled
  automatically if no database is passed. `revokeSession`, `revokeSessions` and `revokeOtherSessions` exist. The
  session `token` field "is also used as the session cookie". **Unverified** whether it is hashed at rest.
- Better Auth cookies (https://www.better-auth.com/docs/concepts/cookies): "All cookies are `httpOnly` and `secure`
  when the server is running in production mode". `useSecureCookies: true` forces secure cookies. **Unverified:**
  the default `SameSite` value (not on that page).
- Better Auth accounts (https://www.better-auth.com/docs/concepts/users-accounts): an account has "`providerId`"
  and "`accountId` is the stable identifier that provider assigned". Implicit linking by verified email is **on by
  default**. `disableImplicitLinking: true` rejects "Same-email OAuth sign-ins for an existing user". Trusted
  providers "may increase the risk of account takeover".
- Better Auth admin plugin (https://www.better-auth.com/docs/plugins/admin): includes "impersonating users"
  (`POST /admin/impersonate-user`, 1-hour default). `impersonate` is a permission on the `user` resource. The page
  shows no global off switch.
- Auth.js (https://authjs.dev/): "The Auth.js project is now part of Better Auth." Announcement
  (https://www.better-auth.com/blog/authjs-joins-better-auth, Sep 22, 2025): "we'll keep addressing security patches
  and urgent issues"; "we strongly recommend new projects to start with Better Auth".
- Lucia (https://lucia-auth.com/): "Lucia was deprecated in March 2025."
- Pricing: Clerk (https://clerk.com/pricing), Supabase (https://supabase.com/pricing), WorkOS
  (https://workos.com/pricing), Auth0 (https://auth0.com/pricing), Firebase (https://firebase.google.com/pricing).
  Figures are in table 2.2. Identity Platform per-MAU prices: **Unverified** (https://cloud.google.com/identity-platform/pricing
  came back truncated).

### 3.7 Identity standards (linking model)

- OpenID Connect Core 1.0 incorporating errata set 2 (Final, 15 Dec 2023;
  https://openid.net/specs/openid-connect-core-1_0.html):
  - `sub` is "A locally unique and never reassigned identifier within the Issuer".
  - §5.7: "the only guaranteed unique identifier for a given End-User is the combination of the iss Claim and the
    sub Claim". `email`, `phone_number`, `preferred_username` and `name` "MUST NOT be used as unique identifiers".
- LTI 1.3 Core (IMS Final Release, Document Version 3, 16 April 2019; https://www.imsglobal.org/spec/lti/v1p3/):
  - `sub` "MUST be a stable locally unique to the `iss` (Issuer) identifier".
  - Anonymous launches may omit `sub`.
  - Roles use URIs such as `…/membership#Instructor`, `…/membership#Learner` and the sub-role
    `…/membership/Instructor#TeachingAssistant`.
  - `lis.person_sourcedid` is "usually originating from the Student Information System".

---

## 4. Privacy implications (§6)

### 4.1 What each party learns

| Party | Learns | Never needs to learn | §6 risk |
|---|---|---|---|
| Microsoft + **UW tenant admins** (option 1) | That a named UW user signed in to "ClearCourse AI", when, from which client, plus the consent record and a service principal in UW's directory. Logs are immutable to UW and readable by Reports Readers | Any content, votes or counters | **Timing side channel (inference).** If anonymous posts show precise timestamps and few users are active, UW-side sign-in logs could narrow down who posted. This goes into the Q8/Q9 threat model. Mitigations to evaluate: long sessions (fewer sign-in events), coarse public timestamps |
| Email provider (option 2) | Recipient address, send time, the OTP in the message body, and opens/clicks if tracking is on | Content | Same timing channel. **Proposal:** turn off open/click tracking. Keep the email body minimal: no course names, nothing from anonymous content |
| Managed auth vendor (Clerk, Auth0, …) | The full identity record, every session, IP and user agent | Content | A second identity store outside our DB. Region not stated (Clerk). Another processor to disclose (PQ-A1-7) |
| Google / GitHub (option 4) | That the person uses ClearCourse | — | Unnecessary disclosure. Another reason to reject option 4 |
| Our identity domain | Person, auth accounts, sessions, roles, enrolments | Anonymous content, upvotes, counters linkage (Q9) | Must stay separated per §6.1 #3 |

### 4.2 Keeping auth identifiers inside the identity domain (Proposal)

- All auth tables live in the identity schema, owned by an identity-only DB role:
  - Better Auth `user`, `account`, `session`, `verification`, `passkey`
  - our `platform_role` and `course_membership`
  - Better Auth supports a non-public schema via `database.schemaName` (noted by the sibling stack research; re-check
    when implementing).
- Content and participation code paths never receive `user.id`, `account.accountId` (`oid`/email), the session
  token or the email. What they *do* receive is Q9's decision, and this branch does not pre-empt it. The auth layer's
  output to the rest of the app should be a narrow authorization decision: "this request may act as a Student of
  course C".
- **Logging (§6.2):**
  - Do not log the session cookie, user ID or email on any route that handles anonymous content.
  - Put a redacting logger on Better Auth.
  - Route auth errors to a channel separate from content errors.
  - Negative tests (§9) should grep logs and error payloads from content routes for identity fields.
- **Do not install the admin plugin's impersonation** (§5, Q7). Either skip the admin plugin, or use custom access
  control with no `impersonate` permission. A test should assert that `/admin/impersonate-user` returns 404.

### 4.3 Sessions (Proposal)

- **Database sessions, not JWTs.** The PDF chat suggests "HTTP-only cookies storing JWTs" `[src p.26]`. Challenge
  it: Better Auth's stateless mode can only revoke everything "by changing the version … and re-deploy". DB
  sessions give per-session revocation (`revokeSession(s)`), which bans and incident response need.
- Turn the **cookie cache off**, or keep `maxAge` at 5 minutes or less. The docs warn that revoked sessions survive
  until the cache expires.
- Set cookie attributes explicitly rather than relying on defaults:
  - `HttpOnly`, `Secure` (`useSecureCookies: true`), and a `__Host-` style prefix **(Unverified whether Better Auth
    sets a prefix by default)**.
  - `SameSite=Lax`, not `Strict`. OAuth callbacks are cross-site top-level navigations, and Microsoft documents
    re-authentication problems with `Strict` behind Safe Links redirects.
- Lifetime: Better Auth defaults to 7 days with sliding refresh, which is inside NIST's AAL1 "no more than 30 days".
  Whether production should aim for AAL2 (24 h overall, 1 h idle) is a new question (PQ-A1-5).
- Store OTPs and magic tokens hashed (`storeOTP: "hashed"`, `storeToken: "hashed"`). Both default to plain.
- Session tokens appear to be stored as the cookie value **(Unverified)**. Treat DB read access to `identity.session`
  as equivalent to account takeover, and grant it to nothing but the auth service role.

### 4.4 Identity-linking model, keyed on (issuer, subject) (Proposal; illustrative sketch, not code)

```
identity.person                -- one human; id = random UUID (never sequential)
  id, display_name, status, created_at

identity.auth_identity         -- maps 1:1 to Better Auth "account" rows; one row per (issuer, subject)
  person_id -> person
  provider_id   -- one provider config per issuer, e.g.
                --   'entra:723a5a87-…'   (prototype multi-tenant app, UW tenant)
                --   'email-otp'          (subject = normalised email; WEAK, reassignable)
                --   'uw-saml'            (future AD FS / Entra SAML; subject = persistent NameID)
                --   'uw-entra-prod'      (future UW-registered OIDC app; see note on oid vs sub)
                --   'lti:<platform iss>' (future LEARN launch; subject = LTI sub, scoped by client_id/deployment_id)
  issuer, subject, verified_at, last_used_at
  UNIQUE (provider_id, subject)

identity.contact_email         -- contact only, NEVER an identifier or authorization input
  person_id, address_normalised, verified_at, source

identity.platform_role         -- e.g. 'institution_admin'; grant/revoke are audit candidates (Q14)
identity.course_membership     -- (person_id, course_id, role in {student, instructor, ta},
                               --  ta_permissions, source in {invite, join_code, manual, csv, lti}, ...)
```

Rules (Proposal):

1. **Never link automatically by email across issuers.** Set Better Auth `accountLinking` with
   `disableImplicitLinking: true`. Following OIDC Core §5.7 and Microsoft's claims guidance, email is not an
   identifier.
2. **Explicit linking only.** The user is signed in with identity A and completes sign-in with identity B in the
   same session (Better Auth `linkSocial`, or a custom flow for SAML and LTI). Any admin-assisted link must be an
   audited event (Q14).
3. **Entra prototype to Entra production.** Key the Entra identity on `oid` (Better Auth already does), with `tid`
   fixed by the provider config. A later UW-registered Entra app sees the same `oid`, so the same person continues.
   **Caveat:** Better Auth's SSO plugin keys OIDC accounts on `sub`, which is pairwise per app. If production moves
   to the SSO plugin, use its `resolveUser` hook to map on `(tid, oid)` **(inference; verify in spike S2)**.
4. **Email-OTP prototype to SSO production.** There is no safe automatic mapping. Options: (a) a one-time explicit
   link, where the user proves the old email by OTP while signed in via SSO; (b) a fresh start in production, with
   no prototype data migrated. Which one applies is PQ-A1-4.
5. **LTI.** Map `(platform iss, client_id/deployment_id, sub)` to a person. Anonymous launches (no `sub`) cannot
   carry identity and must not create a person. LTI roles are inputs to `course_membership` only under whatever Q5
   decides.

### 4.5 What option choice does to §6 (summary)

None of the options touches content data directly. The differences are: (a) who else holds identity and sign-in
timing (UW and Microsoft for option 1; the email provider for option 2; the vendor for option 6); (b) how weak the
identifier is (email under option 2). In-app Better Auth keeps the whole identity domain in our own database, which
is the property §6.1 needs. A hosted vendor splits identity across two systems, which complicates the
threat-model deliverable (§6.2, Q8) **(inference)**.

---

## 5. Recommendation (PROPOSAL for the owner to approve; not a decision)

### 5.1 Library
**Better Auth**, provided Q3 selects a TypeScript stack.
- Pin to ≥1.7.7 and watch the GitHub security advisories feed. Patch within days. That pace is the realistic cost
  shown by 10 advisories in 3 months.
- Enable only these plugins: Microsoft provider, email OTP, and later passkey.
- Do **not** enable email/password, magic link, admin impersonation, OAuth proxy, SCIM or the organization plugin
  for the prototype. Several recent advisories sit in those plugins.
- Revisit the SSO plugin (and its advisory history) when production SSO is scoped.

### 5.2 Sign-in methods for the public prototype

1. **Run spike S1 first** (§6.3): 1–2 hours, $0.
2. **Always available: email OTP** (6 digits, 5-minute expiry, 3 attempts, hashed storage).
   - Accept only addresses whose normalised domain is on an **admin-configured allow-list** (default proposal:
     `uwaterloo.ca`; final list is PQ-A1-2). Enforce it in a Better Auth `before` hook on both the send and sign-in
     endpoints, using exact domain matching.
   - The code entry is one `<input autocomplete="one-time-code">` that accepts paste (WCAG 2.2 SC 3.3.8, if Q15
     adopts it).
   - The email states plainly that ClearCourse will never ask for a UW password.
   - Turn off open/click tracking.
3. **If S1 shows ordinary UW users can consent**, add "Sign in with Microsoft".
   - Authority pinned to the configured tenant ID (UW: `723a5a87-…`).
   - Scopes: `openid profile email` only. Check whether Better Auth adds `User.Read` or calls Graph for a photo; if
     it does, strip the image via `mapProfileToUser`.
   - Validate `iss`/`tid` against configuration. Reject guest accounts (`idp` present and ≠ `iss`; verify the
     behaviour in S1).
   - Make it the visually primary button, because it gives UW's familiar login page (credibility, §8) and production
     continuity via `oid`.
   - If S1 fails, **do not ship it**. Raise PQ-A1-1 with UW IST instead. An admin-consent request *is* asking for
     cooperation, but a small, sign-in-only one.
4. **Later (phase 2): optional passkeys** for returning users, added only while signed in. This cuts OTP email
   volume and phishing exposure. Use attestation `none` to avoid collecting device details **(Proposal; verify
   Better Auth's default)**.
5. **Local/CI only:** run a Keycloak (or similar) container as a fake SAML/OIDC IdP. This exercises the production
   SSO code path (§10 "sign in securely") with negative tests, with no hosting cost.

**Why not the alternatives:**
- Google/GitHub prove nothing about UW and add a third party.
- A hosted Keycloak costs more than the budget and still proves nothing.
- Managed vendors move identity out of our database, and their production SSO pricing ($25–$125+/month) breaks the
  $5 target. Auth0's free tier, which includes one enterprise connection, is the most interesting fallback if the
  in-app library becomes a burden.

### 5.3 Cost estimate (Proposal; figures from §3)
- Auth library and Entra app registration: $0 (the Azure free-account terms are **Unverified**).
- OTP email:
  - **Estimate:** monthly emails ≈ active users × sign-ins per user. With 7-day sessions that is about 4–5 per user
    per month, so Resend Free's 3,000/month covers about 600 active users.
  - The **100/day cap is the binding risk**. One 150-student class signing in on the same day exceeds it. The
    owner has given no user counts, so this needs Q6 plus a user-count estimate.
  - If Entra works, sign-in email volume largely disappears.

### 5.4 Role bootstrapping: options only (owner decides; nothing here is a requirement)

| Role | Option A | Option B | Option C | Notes |
|---|---|---|---|---|
| Institutional admin | Owner's identity in a deploy-time allow-list (config, not code) | CLI/migration grant run by the owner | — | §5 admin "must not … routinely connect anonymous content with student identities". The owner holding this role in the prototype should be recorded in the threat model (Q8). The owner is not UW staff, so this is a *prototype* admin, not an institutional one |
| Instructor | **Vetted allow-list**: user requests instructor status, owner/admin checks manually (for example a public UW directory or department page) and grants it | **Unofficial sandbox courses**: anyone signed in can create a course, labelled "Unofficial, not affiliated with the University of Waterloo", with real course codes blocked or flagged | **Invite-only pilot**: the owner creates courses for named pilot instructors | Stops "anyone claiming to teach ECE 150". An email domain can't separate staff from students (all are `@uwaterloo.ca`; **Unverified** whether UW uses role-specific subdomains). Real authority comes later from Q5 (LTI roles or roster) |
| TA | Instructor invites by email; the invitee must sign in with a matching verified identity | Instructor shares a TA join code | — | Per-course TA permissions per §5 `[src p.2]` |
| Student | Instructor-issued course join code or invite link | Roster CSV (Q5) | LTI launch (Q5) | §5: "Students may access only courses in which they are enrolled". A join code is weak proof of enrolment. Whether that is acceptable for the prototype is the owner's call (PQ-A1-3) |

---

## 6. Dependencies and proposed new open questions

### 6.1 Dependencies on existing §13 questions
- **Q3** (TypeScript → Better Auth). **Q6** (OTP email provider and its daily cap). **Q5** (authoritative roles and
  enrolment). **Q7** (impersonation off). **Q9** (what crosses the identity boundary). **Q8** (threat model must
  include IdP and email sign-in timing). **Q14** (sign-in, role-grant and account-link events). **Q15** (OTP and
  passkey accessibility). **Q17** (retention of sessions, codes and identity links; what happens to
  `auth_identity` when an account is deleted).
- **Q2:** the owner's "public prototype" statement must be recorded in CONTRIBUTING before work depends on it.

### 6.2 PROPOSED new open questions (for §13; not resolved here)

| ID | Question | Why it matters |
|---|---|---|
| PQ-A1-1 | May we test and use sign-in against UW's Entra tenant without asking UW first? It creates a service principal in UW's directory and appears in UW's sign-in logs. Should UW IST be told or asked (for example through the "M365 Admin request" route) before the public launch? | Ethics and relationship with UW. UW can disable the app at any time. Option 1 depends on it |
| PQ-A1-2 | Which email domains count as "institutional" (only `uwaterloo.ca`? subdomains?), and may alumni and retirees, who also hold UW mailboxes, sign in? | Option 2's allow-list. §4 makes this admin-configurable, but the default value needs owner approval |
| PQ-A1-3 | In the prototype, who may become an Instructor, and how is that verified (vetted list, unofficial sandbox courses, invite-only)? Is a join code acceptable proof of "enrolled" for prototype courses? | §5 enforcement before Q5 is answered |
| PQ-A1-4 | Will prototype accounts and data carry over into production, or does production start fresh? | Decides whether email-OTP identities need a linking or migration path |
| PQ-A1-5 | Target assurance for "sign in securely" (§10): session lifetime, idle timeout, and MFA or passkeys for Instructor/Admin roles? | NIST AAL1 vs AAL2 timeouts differ (30 days vs 24 h / 1 h idle) |
| PQ-A1-6 | Display precision of timestamps on anonymous content (exact time vs date only), given that UW/Microsoft sign-in logs and email-provider logs hold identity-linked timestamps | Timing correlation is an anonymity limit to document (§6.2, Q8) and possibly a Q9 design input |
| PQ-A1-7 | Privacy notice, consent and data residency for collecting UW people's names and emails in a non-UW prototype. Which processors are acceptable (email provider; Microsoft as IdP; any vendor)? Needs legal/privacy review; this branch makes no legal claims | Personal information of students handled outside the institution |
| PQ-A1-8 | §7.10 gives the instructor "student name". With email OTP the name is **self-entered and unverified**. With Entra it comes from the UW directory (`name` claim, display-only per Microsoft). Which source is authoritative, and can an instructor rely on it to match a gradebook (see Q12)? | Shared-level integrity, and impersonation of classmates at sharing time |
| PQ-A1-9 | Should the prototype collect any profile data beyond what sign-in needs (for example the Entra `email` claim or a photo)? | Data minimisation (§7.12's spirit of "no unnecessary metadata", which strictly applies to the survey only) |

### 6.3 Proposed spikes (cheap, no app code in the repo)

- **S1: Entra consent at UW** ($0, 1–2 h, needs one UW account holder; gated on PQ-A1-1).
  - Register a multi-tenant app in the owner's own Entra tenant, with redirect `http://localhost` and sign-in-only
    scopes. Use a throwaway local script *outside* the repo, or Microsoft's own sample.
  - Sign in with a UW account against `https://login.microsoftonline.com/{UW tenant ID}/oauth2/v2.0/authorize`.
  - Record:
    - (a) consent prompt shown and accepted, versus "need admin approval" / approval-required screen, versus error;
    - (b) how the unverified-publisher state is presented;
    - (c) the returned `iss`, `tid`, `oid`, `idp`, and whether `email`/`name` are present;
    - (d) whether Duo MFA is triggered.
  - Afterwards, revoke the consent in My Apps.
  - **Pass criterion:** an ordinary UW user completes sign-in without admin action.
- **S2: Better Auth linking** ($0, local).
  - Check that the Microsoft provider can be pinned to a tenant ID, can reject non-allow-listed `tid` and guests,
    and which scopes and Graph calls it makes.
  - Check `disableImplicitLinking` behaviour.
  - Check that SSO plugin `resolveUser` can map on `oid`.
  - Check the default `SameSite`, prefix and token-at-rest behaviour.
- **S3: OTP deliverability into UW Microsoft 365** ($0).
  - Send test codes from the candidate provider and domain (SPF/DKIM/DMARC set) to a UW mailbox.
  - Record inbox or junk placement, link rewriting, and delivery delay.
  - If magic links are still being considered, test whether a scanner hits the URL before the user does (server
    access log).

---

## 7. Verification log

| Claim | URL | Checked | Status |
|---|---|---|---|
| `uwaterloo.ca` is Entra tenant `723a5a87-f39a-4a22-9247-3fc240c01396`, region scope NA | https://login.microsoftonline.com/uwaterloo.ca/v2.0/.well-known/openid-configuration | 2026-10-11 | Verified |
| UW domain is Federated to `adfs.uwaterloo.ca`, brand "University of Waterloo" | https://login.microsoftonline.com/getuserrealm.srf?login=someone@uwaterloo.ca&xml=1 | 2026-10-11 | Verified |
| UW GitHub access uses "SAML single sign-on through Microsoft Entra ID with Duo MFA" | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/45093290829/Using+GitHub+at+the+University+of+Waterloo | 2026-10-11 | Verified (search excerpt) |
| UW requires an "M365 Admin request" for GNOME Online Accounts access | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44816171143/Gnome+Online+Accounts | 2026-10-11 | Verified |
| UW tenant's user-consent setting for sign-in-only third-party apps | (no public source found in IST KB searches) | 2026-10-11 | **Unverified**, spike S1 |
| By default users can consent to permissions not needing admin consent; Microsoft recommends verified-publisher-only consent | https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent | 2026-10-11 | Verified |
| "Let Microsoft manage your consent settings" is the default for a new tenant; its exception list excludes sign-in scopes | https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-app-consent-policies | 2026-10-11 | Verified |
| Publisher verification needs a verified Microsoft AI Cloud Partner Program account; free; not `*.onmicrosoft.com` | https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview | 2026-10-11 | Verified |
| Risk-based step-up blocks unverified multi-tenant apps only for permissions beyond basic sign-in/profile | https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview | 2026-10-11 | Verified |
| Partner Center verification checks the business is "legally registered" and checks employment | https://learn.microsoft.com/en-us/partner-center/enroll/understand-the-verification-process | 2026-10-11 | Verified |
| A solo developer without a business cannot be a verified publisher | (derived from the two rows above) | 2026-10-11 | Inference |
| Consent creates a service principal in the user's tenant; admins can disable user consent | https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant | 2026-10-11 | Verified |
| Multi-tenant apps must validate `iss` against metadata and `tid` | https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant | 2026-10-11 | Verified |
| A multi-tenant registration can use a tenant-specific authority to restrict to UW | — | 2026-10-11 | Inference, spike S1 |
| `oid` is the same across apps in a tenant; `sub` is pairwise per app; never use `email` for authorization | https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference | 2026-10-11 | Verified |
| `idp` differs from `iss` for guests | https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference | 2026-10-11 | Verified (rejection rule to test in S1) |
| Entra logs all sign-ins (who/how/what); Reports Reader can view; entries can't be changed | https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins | 2026-10-11 | Verified |
| App registration requires an Azure account with an active subscription; free account offered | https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app | 2026-10-11 | Verified; card requirement **Unverified** |
| Better Auth Microsoft provider uses `oid` as account ID; email is "never verified by Microsoft" | https://www.better-auth.com/docs/authentication/microsoft | 2026-10-11 | Verified |
| Better Auth Microsoft provider default scopes / Graph photo call / tid allow-list | https://www.better-auth.com/docs/authentication/microsoft | 2026-10-11 | **Unverified** (not documented), spike S2 |
| UW M365 email accounts go to employees, students, alumni and retirees | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email | 2026-10-11 | Verified (search excerpt) |
| Safe Links scans URLs before delivery and detonates no-reputation URLs in the background | https://learn.microsoft.com/en-us/defender-office-365/safe-links-about | 2026-10-11 | Verified |
| UW licenses Defender for Office 365 / Safe Links | — | 2026-10-11 | **Unverified**, spike S3 |
| Safe Links redirects can force re-authentication with SameSite=Strict cookies (Teams) | https://learn.microsoft.com/en-us/defender-office-365/safe-links-about | 2026-10-11 | Verified |
| Better Auth magic link: 300 s, single-use, consumed on first attempt, verify is GET, storeToken default plain, 5/60 s | https://www.better-auth.com/docs/plugins/magic-link | 2026-10-11 | Verified |
| Scanner pre-fetch would consume a Better Auth magic link | — | 2026-10-11 | Inference, spike S3 |
| Better Auth email OTP: 6 digits, 300 s, 3 attempts, storeOTP default plain, auto sign-up unless disabled | https://www.better-auth.com/docs/plugins/email-otp | 2026-10-11 | Verified |
| Better Auth `before` hook can reject by email domain with APIError | https://www.better-auth.com/docs/concepts/hooks | 2026-10-11 | Verified |
| Better Auth v1.7.7 "Latest" (30 Sep), fixes critical magic-link account takeover | https://github.com/better-auth/better-auth/releases | 2026-10-11 | Verified (year inferred) |
| 10 Better Auth advisories 26 Jun to 30 Sep 2026, incl. Critical GHSA-965c-763c-88jm and GHSA-rjg6-39jm-rgg4; several High in @better-auth/sso | https://github.com/better-auth/better-auth/security/advisories | 2026-10-11 | Verified (page 1 of 4) |
| Better Auth SSO plugin: OIDC + SAML 2.0 (samlify); OIDC keyed on provider+sub; resolveUser; replay protection always on | https://www.better-auth.com/docs/plugins/sso | 2026-10-11 | Verified |
| Better Auth sessions in DB by default; 7-day expiry; cookie-cache revocation caveat; stateless mode without DB | https://www.better-auth.com/docs/concepts/session-management | 2026-10-11 | Verified |
| Better Auth cookies httpOnly + secure in production; `useSecureCookies` option | https://www.better-auth.com/docs/concepts/cookies | 2026-10-11 | Verified; SameSite default **Unverified** |
| Better Auth implicit linking by verified email on by default; `disableImplicitLinking` exists | https://www.better-auth.com/docs/concepts/users-accounts | 2026-10-11 | Verified |
| Better Auth admin plugin includes user impersonation (1 h default) | https://www.better-auth.com/docs/plugins/admin | 2026-10-11 | Verified |
| Better Auth passkey plugin: SimpleWebAuthn, `@better-auth/passkey`, session required by default, conditional UI | https://www.better-auth.com/docs/plugins/passkey | 2026-10-11 | Verified |
| Better Auth licence is MIT; about 30.3k GitHub stars | https://github.com/better-auth/better-auth | 2026-10-11 | Verified |
| "The Auth.js project is now part of Better Auth" | https://authjs.dev/ | 2026-10-11 | Verified |
| Auth.js: security patches and urgent issues; new projects → Better Auth (Sep 22, 2025) | https://www.better-auth.com/blog/authjs-joins-better-auth | 2026-10-11 | Verified |
| Lucia deprecated March 2025 | https://lucia-auth.com/ | 2026-10-11 | Verified |
| Clerk Hobby 50,000 MRU/app; Pro $25/mo; SSO from Pro, extra $75/mo; branding removal Pro only | https://clerk.com/pricing | 2026-10-11 | Verified |
| Supabase Free 50,000 MAU; paused after 1 week inactivity; SAML not on Free; Pro from $25/month | https://supabase.com/pricing | 2026-10-11 | Verified |
| Supabase default SMTP 2/hour, team-only; 30/hour after custom SMTP | https://supabase.com/docs/guides/auth/auth-smtp | 2026-10-11 | Verified |
| WorkOS AuthKit free to 1M MAU; SSO $125/connection; custom domain $99/mo | https://workos.com/pricing | 2026-10-11 | Verified; SSO billing period **Unverified** |
| Auth0 Free 25,000 MAU, 1 enterprise connection, 1 custom domain; B2C Essentials from $35/month | https://auth0.com/pricing | 2026-10-11 | Verified |
| Firebase Spark 50K MAUs; SAML/OIDC 50 MAUs free | https://firebase.google.com/pricing | 2026-10-11 | Verified |
| Identity Platform per-MAU prices beyond free tier | https://cloud.google.com/identity-platform/pricing | 2026-10-11 | **Unverified** (page truncated) |
| Resend Free 3,000/month, 100/day, 3 domains; Pro $20/mo 50,000 | https://resend.com/pricing | 2026-10-11 | Verified |
| Google `hd` only for Google Cloud org accounts; email domain can't be relied on | https://developers.google.com/identity/openid-connect/openid-connect | 2026-10-11 | Verified |
| GitHub emails API returns email/primary/verified/visibility (needs `user:email`); no claim of organisational affiliation | https://docs.github.com/en/rest/users/emails | 2026-10-11 | Verified |
| UW has no Google Workspace domain | — | 2026-10-11 | **Unverified** |
| WebAuthn Level 3 is a W3C Recommendation, 25 Aug 2026; passkey = discoverable credential | https://www.w3.org/TR/webauthn-3/ | 2026-10-11 | Verified |
| NIST SP 800-63B-4: email SHALL NOT be used for OOB auth; OTP not phishing-resistant; AAL1 ≤30 d, AAL2 ≤24 h / 1 h idle | https://pages.nist.gov/800-63-4/sp800-63b.html | 2026-10-11 | Verified |
| WCAG 2.2 SC 3.3.8 (AA): manual code transcription non-compliant; paste must work | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | 2026-10-11 | Verified |
| OIDC Core: `sub` locally unique, never reassigned; iss+sub the only guaranteed unique identifier; email MUST NOT be an identifier | https://openid.net/specs/openid-connect-core-1_0.html | 2026-10-11 | Verified |
| LTI 1.3: `sub` stable and unique to `iss`; anonymous launches allowed; role URIs incl. TeachingAssistant sub-role | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| Keycloak base memory 1250 MB per pod (HA guide, nightly 26.8.0) | https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing | 2026-10-11 | Verified (HA context) |
| Hosted Keycloak exceeds $5/month | — | 2026-10-11 | Inference (PaaS prices not checked here) |
