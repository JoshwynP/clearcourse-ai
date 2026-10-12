# ADR 0004: Prototype authentication and identity linking (Q4)

- **Status:** Proposed
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §4, §5, §6.1–§6.2, §7.10, §9, §10, §11, §12 / Q4 (primary);
  Q5 (context only), Q3, Q6, Q7, Q8, Q9, Q14, Q15, Q17, Q20; PQ-02, PQ-06, PQ-11, PQ-24,
  PQ-42, PQ-44 to PQ-50

Research: [docs/research/prototype-auth-and-provisioning.md](../research/prototype-auth-and-provisioning.md).

## Context

Q4 asks: "Authentication for the prototype: real UW SSO, a generic OIDC provider, or a dev-only
stand-in?" It blocks sign-in, and so every feature of milestone 1. The requirements involved:

- §10: "Institutional users can sign in securely" `[src p.19]`; §11: authentication is a
  deliverable `[src p.1]`.
- §5: authorization is "strict, role-based and course-based"; no impersonation without a tightly
  controlled, audited procedure `[src p.2]` (Q7).
- §6.1–§6.2: identity and enrolment are a separate domain, and identity must never appear with
  anonymous-content text in logs, error reports, views, exports or dashboards `[src p.3]`.
- §4: institution-specific settings are administrator-configurable `[src p.1]`.
- §12 (*Advisory*, not binding) suggests institutional SSO via SAML or OIDC with secure HTTP-only
  cookies, and notes that "a hosted SSO integration with UW requires the institution's
  cooperation".

The research found (all checked 2026-10-11; details and URLs in the research file):

- **UW SSO needs UW.** `uwaterloo.ca` is a public Entra tenant federated to UW's AD FS, so a
  multi-tenant "Sign in with Microsoft" app is technically possible. Whether UW lets ordinary
  users consent to an unknown app is **Unverified**. Publisher verification needs a business
  registered with Microsoft's partner programme, which a solo owner realistically cannot get
  (inference). Consent creates a service principal in UW's directory, and every sign-in appears
  in UW's immutable sign-in logs.
- **Email is not proof of role.** UW gives Microsoft 365 mailboxes to employees, students, alumni
  and retirees. NIST SP 800-63B-4 says email "SHALL NOT" be used for out-of-band authentication;
  its session limits are SHOULD recommendations.
- **Magic links and scanners.** Microsoft Safe Links scans URLs before delivery. Better Auth's
  magic link is a single-use GET, so a scanner could use it up (plausible inference, not
  documented; spike S3).
- **Library landscape.** Better Auth (MIT, v1.7.7 "Latest") now stewards Auth.js, which gets only
  "security patches and urgent issues"; Lucia was deprecated in March 2025. Managed services
  (Clerk, WorkOS, Auth0, Firebase, Supabase Auth) hold identity outside our database, and their
  production SSO prices break the <$5/month target, except Auth0's single free enterprise
  connection. ADR 0002 uses Supabase as plain Postgres without Supabase Auth.
- **Better Auth's cost.** 10 advisories between 26 June and 30 September 2026 (2 Critical: core
  magic-link/OAuth state and `@better-auth/scim`), and 9 more on 31 May 2026. Implicit linking by
  email is on by default, sessions slide by default, and session rows hold IP address and user
  agent.
- **Identifiers.** OIDC Core §5.7: only `iss` + `sub` is a guaranteed unique identifier; email
  must not be one. Microsoft: `oid` is stable across apps in a tenant while `sub` is pairwise per
  app. LTI 1.3: `sub` is unique per issuer.

**Provisioning assumed by this ADR (Q5, context only).** Sign-in must work with the prototype
provisioning that the research proposes, and must not block the production path:

- **Prototype (no UW cooperation):** vetted instructors create courses manually (who counts as
  vetted is PQ-46); students self-enrol with a hashed, expiring, revocable join link or code; TAs
  join by single-use invite and have no permissions until the instructor assigns them; no CSV or
  email roster import before a UW privacy review.
- **Production:** LTI 1.3 launch with just-in-time provisioning, plus Deep Linking and AGS (an
  instructor-clicked "apply to LEARN gradebook"), NRPS optional; tool side on `jose`, LTI state in
  the identity domain, tested on saLTIre and Moodle in Docker. This needs a UW sponsor, an IRA-PIA
  ("typically takes 2–4 weeks") and LEARN admin registration (PQ-02, PQ-50).
- **Data model now:** person keyed by (issuer, sub); course binding (deployment, context_id); a
  per-membership `source`.

**This ADR does not decide Q5.** Q5 should get its own ADR once the owner answers it.

## Options considered

**Sign-in methods** (M-numbers as in the research file):

1. **M1 Entra ID multi-tenant OIDC, pinned to the UW tenant:** pros: UW's own login page,
   tenant membership proven, `(tid, oid)` carries into a later UW-registered app; cons: UW's
   consent setting is unknown, it puts our app in UW's directory and logs without UW's agreement
   (PQ-44), and UW can disable it at any time. Never safe as the only method.
2. **M2 Email one-time code, admin-configured domains:** pros: works without UW, no third party
   beyond the email provider, $0 plus email cost; cons: proves mailbox control only, a weak and
   reassignable identifier, not a NIST-approved authenticator, depends on email deliverability
   and daily send caps.
3. **M3 Email magic link:** same as M2, plus the risk that link scanners use up single-use GET
   links (inference). Rejected unless redesigned with a POST confirmation step.
4. **M4 Passkeys:** phishing-resistant, but prove no affiliation. Useful only after a first
   sign-in by another method.
5. **M5 Google or GitHub OAuth:** prove nothing about UW and tell a third party who uses the app.
   Rejected.
6. **M6 Self-hosted Keycloak stand-in:** proves nothing about UW and likely exceeds the budget if
   hosted (**Unverified**). Useful only as a local/CI test IdP.
7. **M7 Real UW SSO:** the right production answer, but needs UW. Out of scope for the prototype.

**Libraries and services:**

1. **Better Auth (in-app):** pros: identity stays in our Postgres identity domain, mainstream,
   MIT, SSO plugin for a later SAML/OIDC path with no per-connection fee; cons: frequent serious
   advisories, defaults that must be changed (implicit linking, sliding sessions, plain-stored
   codes, session metadata).
2. **Auth.js:** maintenance-only; not for a new project.
3. **Lucia:** deprecated.
4. **Managed services (Clerk, WorkOS, Auth0, Firebase, Supabase Auth):** less code to own; but a
   second identity store at a vendor (complicating §6 and the threat model) and production SSO
   costs above the target. Auth0's free tier with one enterprise connection is the most credible
   fallback.

**Session style:**

1. **Database sessions with an opaque cookie:** per-session revocation, server-side expiry
   (OWASP).
2. **Self-contained JWT cookies** (the source chat's advice `[src p.26]`): cannot be revoked
   individually without extra state. Rejected.

## Decision

**Proposed (not yet approved by the owner):** use **Better Auth** with **email one-time codes**
as the prototype sign-in method, database sessions in the identity domain, and identity linking
on **(issuer, subject)** only, as in sections 6.1–6.4 of the research file. In summary:

1. **Library:** Better Auth, pinned at or above v1.7.7; GitHub security advisories watched;
   critical fixes applied within days (ADR 0001, item 11). Plugins on:
   email OTP; the Microsoft provider only under item 4; passkeys later. Plugins off: email and
   password, magic link, admin (impersonation, Q7), OAuth proxy, SCIM, organisation, and SSO until
   production SSO is scoped.
2. **Placement:** all auth tables in the `auth_private` schema, reachable only by the `cc_auth`
   role (ADR 0003). Content and participation code never receive the user ID, auth subject,
   session token or email; they receive an authorization decision for a course.
3. **Sign-in method:** a **6-digit email one-time code** (library defaults: 5-minute expiry,
   3 attempts), stored hashed (`storeOTP: "hashed"`), typed or pasted into one field that allows
   paste and autofill (WCAG 2.2 SC 3.3.8, if Q15 adopts it). Codes are sent only to addresses
   whose normalised domain exactly matches an **admin-configured allow-list** (default proposal
   `uwaterloo.ca`; the list is PQ-45), checked on both send and verify. Email content is
   owner-approved copy (to be written), content-free, with tracking off. Send and verify limits
   are Q20 placeholders. No clickable magic links.
4. **"Sign in with Microsoft"** is added only if spike S1 shows that an ordinary UW user can
   consent without admin action **and** the owner answers PQ-44 with a yes: authority pinned to the
   configured tenant, `iss` and `tid` validated, guests rejected, scopes `openid profile email`
   only. If S1 fails, it is not shipped and the question goes to UW IST instead.
5. **Sessions:** database sessions; cookie cache off; an opaque session ID in a cookie with
   `HttpOnly`, `Secure`, the `__Host-` prefix and `SameSite=Lax`, set explicitly; tokens stored
   hashed (`storeToken: "hashed"`) wherever the library offers it; **session refresh disabled**
   (`disableSessionRefresh: true`); IP address and user agent not stored, if the library allows
   (PQ-48). The session lifetime and any idle timeout are set by the owner (PQ-47).
6. **Identity linking:** one auth-link row per (issuer, subject); `disableImplicitLinking: true`;
   no trusted providers; never link by email. Linking is explicit only, with both identities
   proven in the same session, and audited (Q14). Entra identities are keyed on `oid` with the
   tenant fixed by configuration; future LTI identities on (platform `iss`, `sub`). Email-code
   accounts move to SSO or LTI by explicit link or a fresh start (PQ-06). Random UUIDs
   throughout.
7. **Role bootstrapping:** the institutional admin role comes from an owner-held allow-list in
   deployment configuration or a CI-run grant; instructor status is granted by manual vetting
   (option A in research section 6.3; the owner may pick another option under PQ-46). No role is
   ever inferred from an email domain.
8. **Testing without UW:** a Keycloak (or similar) container as a fake OIDC/SAML IdP in local and
   CI runs only.

**Conditions before this ADR can be accepted:**

- The owner answers **PQ-44** (testing against UW's tenant), **PQ-45** (allowed domains, alumni and
  retirees), **PQ-47** (what "sign in securely" requires: lifetime, idle timeout, MFA or passkeys
  for staff) and **PQ-48** (session metadata and refresh). PQ-46 (who may be an instructor or
  admin) must be answered before M1a.
- Spike S2 shows that Better Auth can pin the Microsoft provider to one tenant (if item 4
  applies), disable implicit linking, keep a session row unchanged across requests with refresh
  off, run with its tables confined to `cc_auth`, and set the cookie attributes in item 5. Gaps
  are recorded here, with the fallback (a thin session layer of our own) considered.
- Spike S3 shows that codes reach UW Microsoft 365 inboxes promptly from the chosen sender.
- ADR 0001 (TypeScript) and ADR 0002 (SES behind a mailer port) are accepted, or this ADR is
  revised. The Better Auth version is re-checked and recorded here at acceptance.

Approved by: (pending)

## Consequences

**Enables:**

- A public prototype that people can sign in to without UW's cooperation, at about $0 plus email
  cost (SES at $0.10 per 1,000 messages, per ADR 0002).
- The whole identity domain stays in our own database, which keeps §6.1's separation and the
  threat model simpler than a vendor-held identity store.
- A path to production without re-keying people: (issuer, subject) links accept Entra, SAML and
  LTI identities later, and the provisioning data model in the research file (section 6.4)
  binds a manually created course to an LTI context without a migration.

**Constrains:**

- Email codes prove mailbox control, not role or current status, and are not a NIST-approved
  authenticator. They are a prototype method. Production "sign in securely" (§10) is expected to
  rest on UW SSO or LTI, which need UW (PQ-02, PQ-50).
- Email becomes critical infrastructure: SES production access must be requested early, and a
  send-cap or deliverability failure stops sign-in (Q6, PQ-42).
- Owning auth code means owning its security: pinned versions, advisory alerts, patching within
  days, and negative tests. Better Auth's advisory cadence makes this a standing cost.
- Instructor vetting is manual work for the owner until LTI roles exist (PQ-46).

**Privacy implications (§6):**

- Sign-in leaves identity-linked timestamps outside our control: at the email provider and UW's
  mail system, and, if item 4 ships, in UW's Entra sign-in logs. With precise post times and few
  users, these could narrow down who posted (inference). The threat model (Q8) records this, and
  coarse post times (PQ-24) and fixed-length sessions reduce it.
- No impersonation route exists (§5, Q7); a test asserts that it returns 404.
- No identity field (cookie, user ID, auth subject, email) is logged on routes that handle
  anonymous content; auth errors use a separate channel; tests check logs and error payloads (§9).
- No email-domain sign-in creates role authority, and no LMS system role ever grants ClearCourse
  institutional admin.
- Whether IP addresses are identity-bearing (PQ-11) and whether the library's created/updated
  times may be kept (PQ-48) can still change the session schema before acceptance.

**Follow-up work:**

- Spikes S1 (only if PQ-44 allows), S2 and S3, with results in `docs/research/spike-results.md`
  and any changes proposed here.
- Candidate audited events for Q14: sign-in, role grants and revocations, account links.
- Retention of sessions, codes and auth links for Q17.
- A separate ADR for **Q5** (provisioning) once the owner answers it, covering join links, TA
  invites, the LTI path and the data model; the reconciliation of the LTI person key
  ((iss, sub) versus a deployment-scoped key) belongs there.
- Revisit this ADR before any UW pilot (M3), when real UW SSO may become available.
