# Branch A2: Course/role provisioning (Q5) and the production integration path (LTI 1.3 / LTI Advantage)

> Research notes, written 2026-10-11. RESEARCH ONLY. Nothing here is a requirement.
> - Requirements are cited as CONTRIBUTING §N.N (with `[src p.N]` where CONTRIBUTING gives one).
> - Everything labelled **Proposal** needs the owner's approval, and an ADR where it is architectural (CONTRIBUTING §1, §14).
> - Web facts carry a URL and "(checked 2026-10-11)". Anything I could not confirm on an official page is marked
>   **Unverified**. Where official sources disagree, it is marked **Conflicting**.
> - **Second run (2026-10-11):** the notes were found complete. This run did not repeat the research, to save
>   budget. It re-verified the two most surprising claims (D2L `Anonymous` removal; ltijs v7 rewrite), checked the
>   CONTRIBUTING and source citations, and corrected one item: `SendInstitutionRole` is a registration property
>   (§3.8, §4.4, §7).
> - The source chat on pages 20–31 says nothing about LTI or provisioning. This branch therefore adopts nothing
>   from it. It only notes that the advisory's "LMS integrations" bullet `[src p.20]` restates §4.

---

## 0. Summary

- **What LTI 1.3 gives us.** An LTI 1.3 launch is an OIDC third-party-initiated login. The LMS (Brightspace = LEARN)
  posts a signed `id_token` JWT. That token carries a stable user id (`sub`, unique per issuer), the course
  (`context.id`, unique per deployment) and the user's course roles (Instructor / Learner / `Instructor#TeachingAssistant`).
  A tool can therefore **sign in, create the course and assign roles on first launch**, with no roster upload. This
  is the most direct way to meet §10 "Courses and roles can be provisioned through supported integrations" `[src p.19]`.
  - NRPS adds roster reads. AGS adds grade passback, which is relevant to §7.11 and Q12. Deep Linking lets instructors
    place ClearCourse links in LEARN content.
- **Brightspace supports everything we would need.** D2L documents core launch, AGS, NRPS, Deep Linking, Dynamic
  Registration and per-deployment privacy toggles. One notable item: D2L's API reference says the deployment
  "Anonymous" setting was removed, and as of LMS 20.26.2 it "is always considered to be false". So Brightspace always
  identifies the user to the tool. D2L's own KB article still mentions an Anonymous setting (**Conflicting**, §3.8).
- **Deal-breaker for the prototype milestone: UW must do the integration, not us.** Only a Brightspace
  administrator with the org-level "Manage LTI Tools" permission can register a tool. UW says its LEARN team reviews
  third-party tools with the Privacy Officer and Information Security Officer "prior to integration with LEARN".
  UW's IRA-PIA review "typically takes 2–4 weeks". Its EdTech governance has an operations group (LEO) that handles
  "requests for integration with the LMS", then Advisory and Steering. Their criteria include "sustainable" and
  "scalable, with strong potential for broad campus use".
  - **So LTI with LEARN cannot be part of a self-serve public prototype.** It needs a UW sponsor and months of
    process. Whether a solo-run tool passes these criteria is a real, **Unverified** risk.
- **The UW evidence also argues against roster import in the prototype.** UW's privacy guidance says instructors
  "are not authorized to release student information to anyone except the student to whom it pertains" without
  proper permission. It also says it is "best to choose a tool that does not require students to identify
  themselves". Uploading a LEARN classlist, or typing students' emails into an unvetted tool, is exactly that kind
  of release. (The cloud-tools page is dated July 2017, and how it applies to this case is my reading; see §4.2.)
- **Recommendation (Proposal).** This needs owner approval.
  - **Prototype:** vetted instructors create courses manually. Students self-enrol with a high-entropy, expiring,
    revocable join link (or code). TAs join with single-use invite links that the instructor delivers outside
    ClearCourse. No CSV or email roster import until a UW IRA-PIA exists.
  - **Production:** LTI 1.3 core launch with just-in-time provisioning, plus AGS ("apply to LEARN gradebook"),
    plus Deep Linking. NRPS is optional and reads only status.
  - **Implementation:** build the tool side ourselves on `jose`. It has zero dependencies, is MIT-licensed and is
    actively maintained. LTI state then stays in the Postgres identity domain. `ltijs` v7 is a month-old rewrite
    whose listed database backends are MongoDB only.
  - **Data model:** design it now so a prototype course can later be bound to an LTI context with no migration.
    That means `(issuer, sub)` person keys, `(registration, deployment_id, context_id)` course refs, and a
    per-membership `source`.

---

## 1. Question(s) and what they block (cite §13)

| # | Question (CONTRIBUTING §13) | What it blocks | How this branch relates |
|---|---|---|---|
| **Q5** | "Course/role provisioning integration: LTI 1.3 with LEARN/Brightspace, CSV import, manual entry, or another method?" `[src p.19]` | Provisioning | **Primary subject.** Options in §2, recommendation in §5. |
| Q2 | Prototype vs production; first-milestone features | Roadmap | Decides whether LTI work belongs in milestone 1 (a dark spike) or later. The owner's constraint says milestone 1 is a public prototype. |
| Q4 | Prototype authentication | Sign-in | An LTI launch is also an authentication. Prototype provisioning (join links) relies on whatever Q4 picks. See sibling branch A1. |
| Q9 | Mechanism keeping content and identity unjoinable | §6, §7.7, §7.9 | Provisioning writes to the identity domain (§6.1 item 3). Linking accounts (prototype identity to LTI identity) must carry the Q9 participation key across without exposing it. |
| Q12 | Grade export format required by UW | §7.11 | AGS is an "authorized grade result" route. The Brightspace CSV import format is the export route. Both are evidenced in §3.4 and §3.12. |
| Q13 / Q6 | Essential notifications / email provider | §7.13 | Email notifications need an email address. Under LTI it arrives only if UW's deployment sends it. |
| Q17 | Retention and deletion | Data model | NRPS `Inactive`/`Deleted` statuses and end-of-term course copies create lifecycle events that Q17 must govern. |
| Q18 | When the sharing window opens, and who triggers "end of course" | §7.10, §7.12 | Core LTI claims carry no course end date. Whether Brightspace substitution parameters can supply one is **Unverified**. |
| Q1 | Admin scope | §7.15 | §4 says "LMS configuration" must be admin-configurable `[src p.1]`, so LTI registrations need an admin UI, not hard-coded values. |
| Q8 | Threat-model document | §6 | LMS-side visit logs and join timestamps are anonymity limitations that must be documented (§4.3). |

**Requirements this branch relies on (verbatim or near-verbatim from CONTRIBUTING):**

- §5: "Students may access only courses in which they are enrolled. Instructors may manage only courses they teach.
  Teaching assistants receive specific permissions assigned by instructors" `[src p.2]`.
- §4: "All institutional names, links, policy language, branding, and LMS configuration must be
  administrator-configurable" and "Later institutions must be supportable without code changes" `[src p.1]`.
- §6.1 item 3: "Student identity and enrollment" is its own domain, separated from content `[src p.3]`.
- §6.2: identity-bearing information must never appear with anonymous-content text in any "application log,
  analytics event, error report, database view, export or administrator dashboard" `[src p.3]`.
- §7.10: the instructor receives only "student name · verified level · date shared". Sharing can be revoked "until
  the instructor exports or applies the result" `[src p.14]`.
- §7.11: "provide an authorized grade result or export compatible with institutional requirements". The app never
  determines the final course grade `[src p.15]`. Automatically determining final course grades is also prohibited
  in §3.
- §10: "Institutional users can sign in securely" and "Courses and roles can be provisioned through supported
  integrations" `[src p.19]`.
- §9: negative tests must show instructors and TAs cannot retrieve authors "through the UI, API, exports, logs or
  predictable identifiers" `[src p.18]`.

**Not requirements** (and therefore open, or proposals here):

- Which integration is "supported".
- Whether NRPS, AGS or Deep Linking are used at all.
- How LTI roles map to ClearCourse roles.
- What TAs can do by default.
- Whether CSV import exists.
- Whether join codes count as "enrolled".

---

## 2. Options considered

### 2.1 Prototype provisioning (no UW cooperation)

Every non-LTI option needs a **course container created by an instructor**. Who may become an instructor is sibling
branch A1's role-bootstrapping question (allow-list, sandbox or invite-only pilot), so it is not repeated here.

| # | Method | Proof of enrolment (§5) | PII the instructor must enter | Security notes | Effort | Verdict (Proposal) |
|---|---|---|---|---|---|---|
| P1 | **Manual course creation** by a vetted instructor | n/a (creates the container) | Course title/code only | Course codes are free text. Label the course "Unofficial pilot" until LTI-bound (copy text is an open question, not invented here) | Low | **Yes**, needed by every option |
| P2 | **Join code** (short, typed) | Weak. Proves possession of a code | None | Codes leak (screenshots, forums). Need high entropy, rate limits on redemption, expiry, rotation and revocation. Short codes are guessable at scale without rate limits | Low | Yes, as a variant of P3 for in-class use |
| P3 | **Join link** (long random token in a URL). The instructor posts it inside LEARN (announcement or content page) or elsewhere | Weak to moderate. Posting it inside LEARN means only LEARN course members see it, but anyone can forward it | None | Same mitigations as P2. A 128-bit token cannot be guessed. Store only a hash of the token | Low | **Yes (recommended)** |
| P4 | **Per-student email invitations** (the instructor types or pastes student emails) | Strong (proves email control) | **Every student's email**, entered by the instructor into an unvetted tool | Needs an email provider (Q6). Creates identity records for students who never consent. UW guidance on releasing student information applies (§4.2) | Medium | **No** for the prototype |
| P5 | **CSV roster import** (for example a LEARN classlist export) | Strongest without an integration | **Bulk class PII** | Same as P4, plus it goes stale (adds/drops) and needs a reconciliation UI. Brightspace's own import/export uses OrgDefinedId/Username (§3.12) | Medium–High | **No** before a UW IRA-PIA. Possibly later as an admin-only fallback |
| P6 | **Affiliation gate**: only accounts proven to be UW (Entra `tid`, or a verified `@uwaterloo.ca` email, per A1) may redeem P2/P3 | Proves UW affiliation, not enrolment | None | Stops outsiders, not non-enrolled UW people. Whether a gate is available depends on Q4/A1 | Low | Yes, as an optional per-course instructor setting, if Q4 provides it |
| P7 | **TA invite**: a single-use, expiring link bound to the TA role, which the instructor delivers through their own channel | Strong for that one link | None (the instructor does not type the TA's email into ClearCourse) | A TA invite grants staff powers, so it needs single use, a short expiry (the value is an open question) and the instructor's re-confirmation on redemption. A new TA gets **no permissions until the instructor assigns them** (§5) | Low | **Yes** |
| P8 | **Instructor approval queue** (join requests need approval) | Moderate | None typed, but the instructor sees the requester's name | It lets the instructor see the time each person joined. That timing is a side-channel against anonymity (§4.3) | Medium | Optional. Show only names and statuses, never join times |

### 2.2 Production integration paths (§10 "supported integrations")

| # | Path | What it provisions | Standards status | UW involvement | Verdict (Proposal) |
|---|---|---|---|---|---|
| L1 | **LTI 1.3 core launch, with just-in-time (JIT) provisioning** | Person `(iss, sub)`, course `(deployment, context.id)`, membership and role on every launch | 1EdTech Final, 2019 | Register, deploy and share the tool | **Yes (core)** |
| L2 | **+ NRPS 2.0** (roster read) | Full membership list, with `Active`/`Inactive` status and `Deleted` in "differences" | Final, 2019 | Enable the extension per deployment | **Optional.** Use it for status sync (drops) and TA discovery only, with minimal fields (§4.4) |
| L3 | **+ AGS 2.0** (gradebook) | A line item, plus scores for students who shared, when the instructor clicks "apply" | Final, 2019 | Enable the extension | **Yes**. This is the cleanest "authorized grade result" for §7.11/Q12 |
| L4 | **+ Deep Linking 2.0** | Instructor places links (board, Course Card, a specific Assignment Card) into LEARN content | Final, 2019, doc revised 2023 | Always available in Brightspace "as of LMS v20.25.11" | **Yes** |
| L5 | **LTI Dynamic Registration 1.0** | Automates the registration exchange. The admin still reviews and activates | "IMS Candidate Final" | Admin pastes a URL, then reviews and enables | **Yes, offer it** (it lowers UW admin effort). Also keep a manual registration form (§4 admin-configurable) |
| L6 | Brightspace Valence REST API (proprietary) | Classlists via D2L OAuth2 app | D2L-specific | Needs institution approval anyway | **No**: it is not portable to "later institutions" (§4) |
| L7 | SIS / OneRoster feed | Institution-wide rosters | Not researched (**Unverified**) | Deep institutional integration | **No**: far more PII than needed |
| L8 | Entra ID group claims / roster-synced Microsoft Teams | Possibly course groups | UW offers "Microsoft Teams - Requesting a Roster-synced Team" (IST KB sidebar). Whether group claims could carry enrolment is **Unverified** | UW Entra admins | **No** (speculative; not researched further) |

### 2.3 How to implement the LTI tool side (TypeScript/Node)

| Option | Facts (checked 2026-10-11) | Fit with §6 and owner constraints | Verdict (Proposal) |
|---|---|---|---|
| **Own implementation on `jose`** | `jose` 6.2.12, MIT, "Dependencies: 0". Repo pushed 2026-10-01, 7,824 stars, 0 open issues. Exports `jwtVerify`, `createRemoteJWKSet`, `SignJWT`, `generateKeyPair`, `exportJWK`. Runs on Node, Workers, Deno and Bun | All LTI state (registrations, nonces, service URLs) lives in our Postgres identity domain. No extra datastore. Works with whichever stack Q3 chooses. LTI is fully specified (§3.1–3.6) | **Recommended.** Bound the risk with conformance tests (§2.4) and a security review |
| `ltijs` (Cvmcosta) | v7.0.0 released **2026-09-09** as "a full, from-scratch TypeScript rewrite", now at 7.0.7. Apache-2.0. Node ">=24", `engineStrict`. Depends on `mongoose`, `express` 5, `ioredis`, `jsonwebtoken`. Backends listed: "the default `MongoDatabaseManager`, or `MongoLegacyDatabaseManager`", plus optional Redis caching. Previous release v5.9.5 was 2024-05-01. 373 stars, 27 open issues. Supports launches, DL, AGS, NRPS and Dynamic Registration, with "cookie-free launch state" via `localStorage` or platform postMessage storage. The example uses `provider.listen()` | Adds MongoDB (and maybe Redis) as a second store that holds launch data. That is another identity-bearing store to separate, threat-model and pay for. Whether a Postgres adapter exists for v7 is **Unverified**. Whether it can be mounted in serverless or Next.js is **Unverified**. v7 has a one-month track record | **Not recommended now.** Its handling of cookies and platform storage is a useful reference |
| `@atomicjolt/lti-server` | 3.3.3, MIT, depends on `jose ^6.0`. The npm metadata has **no repository field** | Maintenance and docs **Unverified** | Reference only |
| Hosted LTI-as-a-service (for example LTIaaS, promoted in the ltijs README) | Pricing and data terms **Unverified** | It would route every launch's identity claims through another processor. That works against §6 minimization and would complicate UW's IRA-PIA | **No** |

### 2.4 Developing and testing LTI 1.3 without UW

| Tool | What it offers (checked 2026-10-11) | Cost/access | Verdict (Proposal) |
|---|---|---|---|
| **saLTIre** (ceLTIc Project, v3.3.2 ©2026) | A "Test Platform" for testing a tool (LTI 1.3: issuer, client id, deployment id, auth/token URLs, keys), plus a Test Tool. Supports Deep Linking, a line-item service with a "Grades released option", Dynamic Registration and Platform Storage. Can deliberately send invalid messages. NRPS is not named on the page (**Unverified**) | No account needed for basic use. Optional Google sign-in for saved configurations. Price not stated | **Yes**: the first target for a launch spike. Synthetic users only (it is a public third-party service) |
| **Moodle in Docker** (`moodlehq/moodle-docker`, GPL-3.0, pushed 2026-07-30) | Moodle acts as a full LTI Advantage platform: admin "Add LTI Advantage" registration, a pending-then-activate review, toggles to share name/email, "Accept grades from the tool", and memberships. Docs page labelled "5.3 docs" | Free, runs locally | **Yes**: a realistic full-LMS integration test (roster, grades, deep linking) |
| 1EdTech Reference Implementation (`lti-ri.imsglobal.org`) | "Limited functionality is provided free of charge". Members get "services and message types". Footer ©2018–2020 | Free (limited) | Optional. It may be stale |
| 1EdTech BUILD / LTI Advantage Certification Suite | "Diagnostic & Certification (login Required)". "Active 1EdTech membership is required to maintain certification", with annual recertification. Membership price not listed on the page | Membership (cost **Unverified**) | Later, only if UW or the owner wants certification (proposed OQ) |
| Canvas Lite | "Canvas Lite gives individual educators a free Canvas account". Whether users can create LTI 1.3 developer keys is **Unverified** | Free | Optional; check in a spike |
| D2L "Brightspace Development Environment" | A D2L KB article tells developers to "Join the Developer Group to access the 'Developer Instance Credentials' file" | Whether LTI Advantage registration is allowed there is **Unverified** | Ask D2L (proposed spike) |

---

## 3. Evidence (URLs + checked date)

### 3.1 LTI 1.3 Core (1EdTech)

Source: https://www.imsglobal.org/spec/lti/v1p3/ (checked 2026-10-11).

**Status and dependencies**

- IMS Final Release, Spec Version 1.3, Document Version 3, issued 16 April 2019. Errata are at
  https://www.imsglobal.org/spec/lti/v1p3/errata/.
- It uses the 1EdTech Security Framework for message and service authentication. LTI 1.3 replaces OAuth 1.0a with
  "OpenID Connect, signed JWTs, and OAuth2.0 workflows". The platform is the OpenID Provider and sends the
  `id_token` through "the OpenID third-party initiated login flow".
- Extra login parameters: `lti_message_hint` (opaque, returned unaltered), `lti_deployment_id` (must match the
  claim) and `client_id` (supports multiple registrations per issuer).

**Required claims in `LtiResourceLinkRequest`**

| Claim | Value or rule |
|---|---|
| `…/claim/message_type` | `LtiResourceLinkRequest` |
| `…/claim/version` | `1.3.0` |
| `…/claim/deployment_id` | "MUST NOT exceed 255 ASCII characters" |
| `…/claim/target_link_uri` | Tools should rely on this signed claim "since the login initiation request is unsigned" |
| `…/claim/resource_link` | `id` required. It is "stable and locally unique to the `deployment_id`" and changes when the link is copied |
| `sub` | Required, except in anonymous launches |
| `…/claim/roles` | An array of URIs, which may be empty |

**Context (the course)**

- The `…/claim/context` claim is **optional**.
- `context.id` is required within it. It must be "locally unique to the `deployment_id`", and the spec recommends it
  also be unique to `iss`. Limit is 255 ASCII characters, case-sensitive.
- `type` values are `…/lis/v2/course#` CourseTemplate, CourseOffering, CourseSection or Group.
- `label` is "often the course code". `title` is often the course name.

**User identity**

- `sub` "MUST be a stable locally unique to the `iss` (Issuer) identifier". It is "the only required user claim".
- In an anonymous launch the platform omits `sub`. The tool "must interpret the lack of a `sub` claim as a launch
  request coming from an anonymous user".
- `name`, `given_name`, `family_name` and `email` "MAY be shared with a tool".
- Tools and platforms "MUST NOT use any other attribute other than the unique identifier" to identify a user between
  systems. (The fetch summary quoted this sentence. My reading of its context is user identification across
  systems.)

**Roles**

- Context roles use the prefix `http://purl.imsglobal.org/vocab/lis/v2/membership#`. Core roles: Administrator,
  ContentDeveloper, Instructor, Learner, Mentor. Non-core: Manager, Member, Officer.
- Sub-roles look like `…/membership/Instructor#TeachingAssistant`. When sending a sub-role, platforms should also
  send the principal role.
- Simple names (for example `Instructor`) are deprecated. Implementations "MUST recognize the new URI values".
- Institution roles (`…/institution/person#`) include Faculty, Student, Staff and others. System roles include
  `…/system/person#Administrator`. There is also a marker role, `…/lti/system/person#TestUser`.

**Deployment and platform identity**

- Platforms "MUST generate an immutable `deployment_id`". It is "a stable locally unique identifier within the
  `iss`".
- A platform instance "is uniquely identified by its `issuer`, `client_id`, and `deployment_id`".
- Tools must allow several deployments to share one `client_id`.

**Course-system identifiers**

- The optional `…/claim/lis` claim carries `person_sourcedid`, `course_offering_sourcedid` and
  `course_section_sourcedid`. These are SIS identifiers.

### 3.2 1EdTech Security Framework 1.0

Source: https://www.imsglobal.org/spec/security/v1p0/ (checked 2026-10-11). Final Release, 15 May 2019.

**Login flow**

- Every launch "*MUST* be treated as a 3rd party initiated login", to prevent Login CSRF.
- Login initiation is a GET or POST, and "a Tool must support either case". It carries `iss`, `login_hint` and
  `target_link_uri`.
- The tool then sends an authentication request with `scope=openid`, `response_type=id_token`, `client_id`,
  `redirect_uri`, `login_hint`, `state`, `response_mode=form_post`, `nonce` (required) and `prompt=none`.

**id_token checks the tool must make (§5.1.3)**

- Verify the JWS signature with the platform's public key.
- `iss` must match exactly.
- `aud` must contain the tool's client_id. Reject the token if it contains untrusted extra audiences.
- If there are multiple audiences, check `azp`.
- `alg` should be RS256.
- The current time must be before `exp`. `iat` may be used to reject old tokens.
- The token "*MUST* contain a `nonce`", and the tool "*SHOULD* verify that it has not yet received this nonce value".

**Service tokens**

- The tool gets service tokens with a client-credentials grant and a JWT client assertion (RFC 7523). The assertion
  carries `iss`, `sub` (both the client_id), `aud`, `iat`, `exp` and `jti`.
- Scopes "*MUST* be used". 1EdTech recommends "a default expiry time of 1 hour".

**Keys**

- "Even when there is only one key in a key-set a kid MUST be supplied."
- Do not reuse a `kid` for a different key.
- When rotating keys, preserve the previous key in the key set "to allow an overlap".
- "A system SHOULD NOT use a single key pair to secure message signing for more than one system."
- Systems "MUST use SHA-256 (RS256) as a minimum". No minimum RSA size is stated in the fetched part.

### 3.3 Names and Role Provisioning Services 2.0

Source: https://www.imsglobal.org/spec/lti-nrps/v2p0 (checked 2026-10-11). Final Release, 16 April 2019.

- **Launch claim:** `https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice`, with `context_memberships_url`
  and service versions `["2.0"]`.
- **Scope:** `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly`.
- **Media type:** `application/vnd.ims.lti-nrps.v2.membershipcontainer+json`.
- **Fields:** only `user_id` and `roles` are required. Name, email, picture and `lis_person_sourcedid` are optional.
  "Any other member attributes will need an explicit consent from the Platform to be shared". A tool "should never
  rely on additional member attributes to be present".
- `user_id` is the launch `sub`.
- **Status:** `Active` (the default) or `Inactive`. `Deleted` appears only in "differences" responses.
- **Query features:** a `role` filter, paging with `rel="next"`, a `rel="differences"` link, and an optional `rlid`
  filter for resource-link membership.
- **Privacy:** "LTI does not pass user information in its default configuration."

### 3.4 Assignment and Grade Services 2.0

Source: https://www.imsglobal.org/spec/lti-ags/v2p0 (checked 2026-10-11; read in two fetches). Final Release,
Document Version 3, 16 April 2019.

- **Launch claim:** `https://purl.imsglobal.org/spec/lti-ags/claim/endpoint`, with `lineitems`, `lineitem` and
  `scope`.
- **Scopes:** `lineitem`, `lineitem.readonly`, `result.readonly` and `score`. The `score` scope means "Tool can
  publish score updates to its line items" (POST `{lineitem}/scores`).
- **Line items:** "Line items may be created without any explicit relationship to any Resource Link." The platform
  "MUST NOT modify the `resourceId` and `tag` values".
- **Score fields:**
  - `userId` "MUST be present".
  - `scoreGiven` must be 0 or higher. `scoreMaximum` is required when a score is given.
  - `comment` is plain text and visible to students and instructors.
  - `timestamp` is required and strictly increasing.
  - `activityProgress` and `gradingProgress` are required. `gradingProgress` is one of `FullyGraded`, `Pending`,
    `PendingManual`, `Failed` or `NotReady`.
  - Media type: `application/vnd.ims.lis.v1.score+json`.
- **Platform control:**
  - A platform "MAY ignore scores that are not `FullyGraded`".
  - `gradesReleased`: a tool "MAY specify … if it wishes the grades to be released or not", and the platform decides
    "as the platform owns its gradebook behavior".
  - "the platform has the final say on what should be a student final score". An instructor can "force a grade
    through a manual entry".
  - This fits §3's ban on automatically determining final grades and §7.11's "authorized grade result".

### 3.5 Deep Linking 2.0

Source: https://www.imsglobal.org/spec/lti-dl/v2p0 (checked 2026-10-11). Final Release, issued 16 April 2019;
Document Version 2 dated 24 January 2023.

- **Messages:** `LtiDeepLinkingRequest` and `LtiDeepLinkingResponse`.
- **Settings claim:** `deep_link_return_url`, `accept_types`, `accept_presentation_document_targets`,
  `accept_multiple`, `auto_create` and `data`.
- **The `ltiResourceLink` item** may carry:
  - `custom` parameters. These "MUST be included in the LtiResourceLinkRequest payload", which is how a link could
    target one Assignment Card.
  - A `lineItem` (requires `scoreMaximum`).
- **Response:** "an auto-submitted form as an HTTP POST request using the `JWT` parameter", with `aud` set to the
  platform issuer.

### 3.6 LTI Dynamic Registration 1.0

Source: https://www.imsglobal.org/spec/lti-dr/v1p0 (checked 2026-10-11). "IMS Candidate Final", 1.0, Document
Version 2 dated 27 March 2023.

- The platform opens the tool's URL with `openid_configuration` and an optional `registration_token`.
- The tool POSTs an RFC 7591 registration that includes `https://purl.imsglobal.org/spec/lti-tool-configuration`
  (`domain`, `target_link_uri`, `claims`, `messages`).
- A successful registration "is properly configured, but it is not activated yet". The admin "may then review,
  alter, reject or activate" it.
- The 1EdTech LTI page lists Dynamic Registration as "1.0 Public Candidate Final":
  https://www.1edtech.org/standards/lti (checked 2026-10-11).

### 3.7 Third-party cookies and iframes

**1EdTech**

- https://www.1edtech.org/standards/lti (checked 2026-10-11) lists, under "Cookie Problems:", "OIDC Login with LTI
  Client Site PostMessages" (https://www.imsglobal.org/spec/lti-cs-oidc/v0p1), "LTI Client Side postMessages" and
  "LTI postMessage Storage".
- The OIDC guide (https://www.imsglobal.org/spec/lti-cs-oidc/v0p1, checked 2026-10-11) is a "Base Document" v0.1,
  doc v5, 25 Oct 2022, "for review and comment by 1EdTech Contributing Members".
  - Mechanism: `lti_storage_target` plus `lti.put_data` and `lti.get_data` postMessages.
  - Support is optional. The tool detects it from the parameter.

**Browsers.** MDN (https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies, last modified
15 Jun 2026; checked 2026-10-11):

- Safari: ITP protections "are enabled by default".
- Firefox: Total Cookie Protection is on by default, giving third-party cookies "a separate cookie jar per site".
- Chrome: it "doesn't block third-party cookies by default".
- Embedded state can use `SameSite=None; Secure` with the CHIPS `Partitioned` attribute, or the Storage Access API.

**UW practice.** UW tells instructors to tick "Open as External Resource" for Piazza "To ensure Piazza opens in all
browsers":
https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/43073961985/Integrating+Piazza+with+a+LEARN+course (page v5,
2023-03-15; checked 2026-10-11 via the public Confluence REST API).

### 3.8 D2L Brightspace (LEARN's platform)

**What Brightspace supports.** D2L KB "LTI Advantage (v1.3)", updated 2026-05-09:
https://community.d2l.com/brightspace/kb/articles/23660-lti-advantage-v1-3 (checked 2026-10-11 via
`community.d2l.com/api/v2/articles/23660`, because the HTML page renders client-side).

- Supported: core launch, AGS v2.0 (with "two-way sync" with the Gradebook), NRPS v2.0, Deep Linking 2.0 and Asset
  Processors.
- D2L "does not yet support all aspects of the standard".
- All LTI grade activity is logged under a D2L-generated "LTI Advantage Service User".

**Registering and deploying a tool.** D2L KB "Tool Registration, Deployment, and Links", updated 2026-10-01:
https://community.d2l.com/brightspace/kb/articles/23662-tool-registration-deployment-and-links (checked 2026-10-11
via the API).

Registration:

- "ensure the Manage LTI Tools permission is set at the organization level". Path: Admin Tools > Manage
  Extensibility > LTI Advantage > Register Tool.
- Registration can be Standard or Dynamic. Dynamic: "the Registration is disabled by default as per the
  specification".
- Required fields: Name, Domain, Redirect URLs, OpenID Connect Login URL. "Domains can only be used in one enabled
  registration at a time." "Redirect URLs must be an exact match. Wildcarding is not supported." "You must enter a
  Keyset URL to add extensions."
- Brightspace gives the tool its Client Id, Keyset URL, OAuth2 Access Token URL, OpenID Connect Authentication
  Endpoint, Audience and Issuer.

Deployment:

- Path: External Learning Tools > LTI Advantage > New Deployment. Each deployment is shared with chosen org units
  and their descendants.
- "Each individual deployment can be unique, supporting the ability for different LTI extensions and Security
  Settings."
- The Deployment Id is "a GUID-based globally unique ID".
- The "Send Institution Role" setting adds institution roles. Context roles are sent "unless … Anonymous" (see the
  conflict note below).
  - **Correction (re-checked 2026-10-11):** D2L's API reference lists `SendInstitutionRole` as a **registration**
    property, not a deployment flag (https://docs.valence.desire2learn.com/res/ltiadvantage.html). So UW would set it
    once per tool registration, not per deployment. The KB article's placement is ambiguous.
- Links: "Most integrations create the LTI links via deep linking." "Links created for a deployment appear in all
  courses where the deployment is shared."

**Management API.** D2L "LTI Advantage management" API reference:
https://docs.valence.desire2learn.com/res/ltiadvantage.html (checked 2026-10-11).

- Deployment flags include `SendUserFirstName`, `SendUserMiddleName`, `SendUserLastName`, `SendUserEmail`,
  `SendD2LUserId`, `SendD2LUsername`, `SendD2LOrgDefinedId` and `SendUserExternalIds` (added in LE API v1.99).
- `PreProvisioning` is a "Security setting to send classlist including users not known to tool". My reading is that
  NRPS normally returns only users the tool already knows. That reading is **Unverified**.
- `OpenAsExternal`, `IncludeInFinalGrade` and `AutoCreateGrade` are also deployment fields.
- Retired settings:
  - `SendOrgUnitInformation`, `SendLinkTitle` and `SendLinkDescription` "are always considered to be true" as of
    LMS 20.25.11.
  - **`Anonymous` "was removed as of LE API v1.92" and "is always considered to be false" as of LMS 20.26.2.**
  - **Conflicting:** the KB article above (updated 2026-10-01) still mentions an Anonymous deployment setting. For
    ClearCourse design, assume Brightspace always sends `sub`.
- "Registrations and deployments can only be created at the organization."

**Role mapping.** D2L KB "Org Units and Role Mapping", updated 2026-05-09:
https://community.d2l.com/brightspace/kb/articles/23663-org-units-and-role-mapping (checked 2026-10-11 via search
API).

- "The IMS Configuration tool enables you to map the many roles they have in Brightspace to the standard roles
  defined by IMS".
- "D2L recommends that you map each Brightspace role to at least one institution and context role."
- **How UW maps its LEARN roles (for example TA) is Unverified.**

**Developer access.** D2L KB "Using Postman with the Brightspace API":
https://community.d2l.com/brightspace/kb/articles/1100-using-postman-with-the-brightspace-api (checked 2026-10-11).
It says to "Join the Developer Group to access the 'Developer Instance Credentials' file". Whether that instance
allows LTI registration is **Unverified**.

**Visit reports.** D2L KB "Leveraging Tool Level Reporting…", updated 2024-01-04:
https://community.d2l.com/brightspace/kb/articles/23391-leveraging-tool-level-reporting-in-brightspace-to-access-course-level-data
(checked 2026-10-11).

- Content Reports show, per user, "the last visited date, number of visits, total time spent".
- **Whether LTI-link topics are tracked this way is Unverified.** This is relevant to §4.3.

### 3.9 University of Waterloo

**LEARN privacy and third-party tools.** "LEARN Privacy information and other tools", IST KB, version 3,
2024-10-09:
https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44088164615/LEARN+Privacy+information+and+other+tools
(checked 2026-10-11 via `…/wiki/rest/api/content/44088164615`).

- "LEARN is D2L software, hosted by D2L."
- The team participates in Waterloo's "Information Risk Assessment" process and works with the University Privacy
  Officer and Information Security Officer "to review third-party tools prior to integration with LEARN".
- Most integrated tools receive a standard set: "USERID (e.g. jsmith), Role (e.g. student, instructor), username
  (e.g. jsmith), email", plus the system username and system role. Turnitin gets "first name, last name, email
  address". Akindi and Crowdmark also get the student number.
- Contacts: learnhelp@uwaterloo.ca and fippa@uwaterloo.ca.

**How an existing LTI tool reaches a course.** "Integrating Piazza with a LEARN course": the instructor adds it
through Content > Existing Activities > External Learning Tools and selects "Piazza from the list of LTI links". The
tool is pre-registered centrally. (URL in §3.7.)

**IRA-PIA program.** https://uwaterloo.ca/privacy/information-risk-assessment (checked 2026-10-11).

- Bill 194 amended FIPPA "effective July 1, 2025". An assessment is needed "before collecting personal information".
- Process: screening questions, then an IRA-PIA intake form. Review is by the Privacy Team with Legal and with IST
  Information Security Services. It "typically takes 2–4 weeks".
- Ownership "resides with the relevant Information Steward(s)", so the process is initiated by a UW unit, not a
  vendor (my reading).

**EdTech governance.** https://uwaterloo.ca/educational-technology-hub/governance (checked 2026-10-11).

- LEO (Learning Environment Operations) handles "intake requests for new EdTech tools, particularly requests for
  integration with the LMS". Non-operational items go to EdTech Advisory and then EdTech Steering.
- Principles include "Be sustainable" and "Be scalable, with strong potential for broad campus use".
- The CIO "must approve the contract or equipment, as specified in Procedure 1".
- Committees meet monthly.

**Centrally supported tools.** https://uwaterloo.ca/educational-technology-hub/catalogs/centrally-supported-tools
(checked 2026-10-11). These tools "have undergone an Information Risk Assessment … and Privacy Impact Assessment".
Twenty are listed, including Piazza and Perusall. No public request form for new tools was found (**Unverified**
whether one exists).

**Online Educational Technologies guideline.**
https://uwaterloo.ca/privacy/guidelines/online-educational-technologies (no date shown; checked 2026-10-11).

- Instructors should first check tools already in use, then "Determine whether an Information Risk Assessment is
  required. Complete this step before proceeding any further!"
- Then notify students and "Provide alternatives. Allow students to opt out".
- "It is best to choose a tool that does not require students to identify themselves". Otherwise assign "a pseudonym
  or fictional name".

**Cloud-based Educational Technologies guideline.**
https://uwaterloo.ca/information-systems-technology/about/policies-standards-and-guidelines/teaching-learning/cloud-based-educational-technologies
(dated July 2017; checked 2026-10-11).

- Under Policy 46, without proper permission "instructors are not authorized to release student information to
  anyone except the student to whom it pertains".
- It allows a US-hosted tool if no comparable Canadian alternative exists, with an alternative offered to students
  who object.

### 3.10 Libraries

- **jose:**
  - https://api.github.com/repos/panva/jose: MIT, not archived, pushed 2026-10-01, 7,824 stars, 0 open issues.
  - https://registry.npmjs.org/jose/latest: 6.2.12, no dependencies.
  - https://raw.githubusercontent.com/panva/jose/main/README.md: lists the exports and runtimes.
  - All checked 2026-10-11.
- **ltijs:**
  - https://api.github.com/repos/Cvmcosta/ltijs: Apache-2.0, pushed 2026-10-06, 373 stars, 27 open issues.
  - https://api.github.com/repos/Cvmcosta/ltijs/releases?per_page=5: v7.0.0 on 2026-09-09; v5.9.5 on 2024-05-01.
  - https://api.github.com/repos/Cvmcosta/ltijs/releases/tags/v7.0.0: backends, cookie-free state, Node 24.
  - https://registry.npmjs.org/ltijs/latest: 7.0.7 and its dependencies.
  - https://raw.githubusercontent.com/Cvmcosta/ltijs/master/README.md
  - All checked 2026-10-11.
- **@atomicjolt/lti-server:** https://registry.npmjs.org/@atomicjolt/lti-server/latest: 3.3.3, MIT, no repository
  field (checked 2026-10-11).

### 3.11 Test platforms

- saLTIre: https://saltire.lti.app/ (checked 2026-10-11).
- Moodle: https://api.github.com/repos/moodlehq/moodle-docker and https://docs.moodle.org/en/External_tool ("5.3
  docs", last edited 26 March 2024) (checked 2026-10-11).
- 1EdTech RI: https://lti-ri.imsglobal.org/ (checked 2026-10-11).
- 1EdTech certification: https://www.1edtech.org/certification/get-certified (checked 2026-10-11).
- Canvas Lite: https://www.instructure.com/canvas/try-canvas (checked 2026-10-11).

### 3.12 Brightspace grade import CSV (relevant to Q12; not decided here)

Source: D2L KB "Import grades and grade items" (Higher Ed), updated 2026-10-01:
https://community.d2l.com/brightspace/kb/articles/3537-import-grades-and-grade-items (checked 2026-10-11 via search
API).

- Each row needs "OrgDefinedID, Username, or both".
- Grade columns use the form "`<item> Points Grade`", "Grade Symbol" or "Text Grade".
- The last column is "End-of-Line Indicator", with `#` on every row.
- Unknown items can be created on import.
- **Implication:** a LEARN-importable CSV needs an institutional identifier. §7.10 lists only "student name ·
  verified level · date shared" (see proposed OQ PQ-A2-5).

---

## 4. Privacy implications (§6)

### 4.1 What each provisioning method puts into the identity domain (§6.1 item 3)

| Method | Identity data created | Who supplies it | Holds data on people who never used ClearCourse? |
|---|---|---|---|
| P1 + P3/P2 join link | Person (from sign-in, per A1/Q4) + membership (`source=join_link`) | The student, voluntarily | No |
| P7 TA invite | TA membership (`source=invite`) | The TA, voluntarily | No |
| P4 email invites | An email per student, before any consent | The instructor | **Yes** |
| P5 CSV roster | Names, emails and perhaps OrgDefinedIds for the whole class | The instructor | **Yes** |
| L1 LTI launch (JIT) | Person `(iss, sub)`, plus whatever the deployment sends (names/email per UW settings) + membership (`source=lti_launch`) | The platform, at the user's own launch | No |
| L2 NRPS | `user_id` + roles (+ name/email if UW enables them) for **every** member | The platform | **Yes**, unless we restrict it (§4.4) |
| L3 AGS | We send `userId` (= `sub`) + score for students who shared | Us, to the platform | n/a |

### 4.2 Instructor disclosure (UW guidance)

- P4 and P5 have the **instructor** export student personal information from LEARN to ClearCourse.
- UW's guidance says that without proper permission "instructors are not authorized to release student information
  to anyone except the student to whom it pertains" (Cloud-based EdTech, July 2017). It also asks instructors to
  check whether an Information Risk Assessment is required "before proceeding any further!" (Online Educational
  Technologies).
- **Consequence (my reading, not legal advice):** a prototype that invites instructors to upload class lists would
  push them into a step UW guidance tells them not to take without review.
- The self-enrolment options (P2, P3, P6, P7) avoid this. Each person decides to join, and the instructor discloses
  nobody.
- UW's "best to choose a tool that does not require students to identify themselves" is in tension with §7.10. That
  section needs a name when a student *chooses* to share. A student can still use the board without the instructor
  learning they are a member, provided member lists are handled as in §4.3.

### 4.3 Linkage and side channels the threat model must document (§6.2 "limitations of anonymity"; Q8)

1. **Join or launch timing.** If instructors can see when each student joined, or a "recent members" feed, then
   "joined 10:02" plus "first question 10:03" deanonymizes in small classes.
   - **Proposal:** never show join or launch timestamps to instructors, TAs or admins.
   - **Proposal:** never write membership events and content events to the same log stream, which §6.2 requires
     anyway.
   - **Proposal:** membership tables store coarse dates at most (the granularity is a proposed OQ).
2. **LMS-side visit logs (outside our control).** Brightspace Content Reports show per-user "last visited date,
   number of visits, total time spent" for content topics (§3.8). If LTI links are tracked the same way
   (**Unverified**), an instructor could correlate a student's LEARN launch with a new anonymous post.
   - ClearCourse cannot prevent this. **It must be stated in the threat model as a limitation.**
   - Possible mitigations, all **Proposals**: let a student launch once and then stay signed in through a
     first-party session in a new window ("Open as External"); avoid exact-minute timestamps on anonymous content
     (proposed OQ PQ-A2-7, a Q9 dependency).
3. **Member lists vs anonymity.** Instructors seeing *who* is a member is enrolment data (the same as the LEARN
   classlist), so it is allowed (§5). Member lists must never be combined with activity counts, timestamps or content
   in any view (§6.2, §3 "Instructor access to individual activity breakdowns").
4. **NRPS full roster.** Pulling the whole classlist creates identity records for non-users. It also gives anyone who
   reads the identity domain a "who never participated" set to compare against participation shares.
   - **Proposal:** request NRPS only for membership status (drops) and TA discovery.
   - **Proposal:** store only `user_id`, roles and status for members who have never launched.
   - **Proposal:** ask UW to leave `PreProvisioning` off, unless a requirement needs it.
5. **AGS comment field.** `comment` is shown to students and instructors (§3.4).
   - **Proposal:** never send a comment.
   - **Proposal:** the score is only the published value for the shared level (§7.11). No dates and no counts, per
     §7.10 "will not receive … dates, or activity breakdown".
6. **LTI tokens contain PII.** The `id_token` may carry name and email.
   - **Proposal:** never log raw tokens or claims. Store only the mapped fields in the identity schema.
   - **Proposal:** scrub launch errors before they reach error reporting (§6.2 "error report").
   - Nonce and state tables hold no content and no names.
7. **`sub` is identity data.** It must not be used, or hashed without a key, as a participation or content key. The
   CONTRIBUTING §12 known issue on unkeyed hashes applies equally to `sub`. Q9 decides the real mechanism.
8. **Account linking** (prototype account to LTI account) is a moment when two identities meet.
   - LTI says not to identify users by other attributes (§3.1), so there is **no automatic merge by email**.
   - **Proposal:** offer explicit linking only inside a session where the user has just proven both identities
     (signed in with the old method *and* arrived by a fresh launch). Audit it without content (§7.17).
   - How the participation key moves across depends on Q9.

### 4.4 Proposed LTI privacy defaults to request from UW (Proposal; each needs a requirement to justify it)

| Brightspace deployment setting | Proposed | Justification |
|---|---|---|
| First / Last name | On | §7.10 requires "student name" for shares. **Note:** UW's standard tool data set lists USERID, role, username and email, not names (§3.9). If UW will not send names, the name must come from elsewhere (PQ-A2-5) |
| Email | On only if Q6/Q13 confirm email notifications need it | §7.13 email notifications `[src p.16]` |
| Org Defined ID / Username | Off, unless Q12 requires CSV export to LEARN | AGS does not need them |
| Send Institution Role (a **registration** property per the D2L API reference, §3.8) | Off, unless needed (for example to separate staff from students) | Minimization. Institutional admin should never be granted from LMS claims (Proposal) |
| Substitution parameters | Only those with a cited use (for example a context-history parameter for course copies, **Unverified** name) | Minimization |
| PreProvisioning (NRPS) | Off | §4.3 item 4 |
| Open as External Resource | On | §3.7. It avoids third-party-cookie failures and gives a first-party session |

### 4.5 Data model so prototype provisioning can switch to LTI without migration (illustrative sketch, not code)

All tables below live in the **identity schema** (§6.1 item 3). The content schema refers only to an opaque
`course_id`, never to `person_id` or membership rows.

```
-- Institution & LMS configuration (§4 "LMS configuration must be administrator-configurable")
identity.lti_registration(id uuid, institution_id, issuer text, client_id text,
     auth_login_url text, token_url text, jwks_url text, audience text,
     tool_kid text, status [pending|active|disabled], created_by_admin)
     UNIQUE(issuer, client_id)
identity.lti_deployment(id uuid, registration_id, deployment_id text, status)
     UNIQUE(registration_id, deployment_id)

-- People (aligned with sibling A1's (issuer, subject) linking model)
identity.person(person_id uuid)                         -- opaque, random
identity.person_identity(person_id, issuer text, subject text, kind [entra|email|lti|...])
     UNIQUE(issuer, subject)                            -- LTI: issuer = platform iss, subject = sub
     -- LTI says sub is unique per iss (§3.1), so (iss, sub) is the key. client_id/deployment stay as
     -- attributes. This differs from A1's note "scoped by client_id/deployment_id"; reconcile in the ADR.

-- Courses: the same row whether created manually or by LTI
identity.course(course_id uuid, institution_id, title, code, term,
     created_via [manual|lti], status [active|archived])
identity.course_lti_context(course_id, deployment_ref → lti_deployment.id, context_id text,
     context_label, context_title, context_types text[], bound_at_date, bound_by_person)
     UNIQUE(deployment_ref, context_id)                 -- context.id is unique per deployment (§3.1)
     -- A manually created prototype course gets a row here later, when an instructor binds it
     -- (see §5.4). No column changes.

identity.course_membership(course_id, person_id, role [student|instructor|ta],
     status [active|inactive|removed], source [manual|join_link|join_code|invite|csv|lti_launch|lti_nrps],
     source_ref uuid NULL, created_on date, updated_on date)   -- dates are coarse on purpose (§4.3)
     UNIQUE(course_id, person_id, role)
identity.ta_permission(course_id, person_id, permission [moderate|edit_cards|...])  -- §5. LTI never sets these

identity.join_link(id, course_id, token_hash, role='student', expires_at, max_uses NULL, revoked_at NULL)
identity.ta_invite(id, course_id, token_hash, expires_at, redeemed_at NULL, created_by)

-- LTI runtime (no content, no names)
identity.lti_oidc_state(state_hash, nonce_hash, registration_id, expires_at)    -- short TTL, single use
identity.lti_resource_link(deployment_ref, resource_link_id, course_id, target [board|course_card|assignment_card], target_ref)
identity.lti_course_services(course_id, nrps_url NULL, ags_lineitems_url NULL, ags_scopes text[], refreshed_on)
identity.lti_line_item(course_id, line_item_url, purpose='participation_level')
```

**Rules (Proposal):**

- Authorization resolves `(session → person → membership/role → course)` inside the identity domain. The content API
  receives only `course_id` and a capability set, never `person_id` (§6.2 "narrowly scoped internal APIs").
- `source` tells you how a member arrived, which matters for revocation. For example, when NRPS says `Deleted` and
  the source is `lti_*`, the membership is set inactive. A `manual` membership is left alone.
- Tokens are stored only as hashes. IDs are random UUIDs, never sequential (CLAUDE.md "Never use sequential or
  guessable IDs" applies to content; using UUIDs here as well costs nothing).

---

## 5. Recommendation (PROPOSAL for the owner to approve; not a decision)

### 5.1 Prototype (milestone 1, public, no UW integration)

1. **Courses:** a vetted instructor creates them manually (P1). Who counts as vetted is A1's role-bootstrapping
   question.
2. **Students:**
   - Self-enrol through an instructor-generated **join link** (P3): a ≥128-bit random token, stored hashed, with an
     expiry, revocable and rotatable. A **short join code** (P2) is offered for in-class use.
   - Redemption is rate-limited. The exact values are Q20 territory, so none are set here.
   - Optional per-course **UW-affiliation gate** (P6), if Q4 gives a verifiable UW identity.
3. **TAs:**
   - Join through a **single-use, expiring TA invite link** (P7) that the instructor delivers themselves.
   - Redemption needs the TA to be signed in, and the instructor confirms afterwards.
   - A new TA has **no permissions until the instructor assigns them** (my reading of §5).
4. **No CSV import and no email roster invites** (P4, P5) until a UW IRA-PIA covers them (§4.2).
5. **Instructor member view:** names, roles and statuses only. No join times, no activity, no counts (§4.3).
6. **Build the §4.5 data model from day one**, including the `lti_*` tables, even though they stay empty.
7. **Dark LTI spike, Proposal (Q2 decides).** Implement the LTI 1.3 launch and test it against saLTIre and Moodle in
   Docker, but do not register it with any real institution. This proves the migration path early and costs $0.

### 5.2 Production (§10 "supported integrations")

1. **LTI 1.3 core launch with JIT provisioning** (L1).
   - Each launch upserts the person `(iss, sub)`, the course `(deployment, context.id)` and the membership
     (`source=lti_launch`).
   - A launch **with no `context` claim, or no `sub`**, provisions nothing and shows an explanation. Brightspace
     should always send `sub` (§3.8).
2. **Deep Linking** (L4): instructors place board and card links in LEARN content. Custom parameters target a
   specific Assignment Card.
3. **AGS** (L3): an instructor-triggered **"Apply shared levels to LEARN gradebook"** action.
   - It posts scores only for students who shared. The score is the published value per level (§7.11). There is no
     comment.
   - That click is the "applies the result" moment that makes sharing final (§7.10).
   - `gradesReleased`/release behaviour stays with the instructor in LEARN.
   - Use `FullyGraded`, since a platform "MAY ignore" other values.
   - CSV export stays as the fallback (Q12).
4. **NRPS** (L2), optional: used only to mark dropped students inactive and to discover TAs, with the minimal fields
   in §4.4.
5. **Registration:** offer **Dynamic Registration** (L5), plus a manual admin form for issuer, client_id, URLs and
   keys. The manual form meets §4 "LMS configuration … administrator-configurable" and supports "later institutions
   … without code changes".
6. **Sessions:** after a launch, use a first-party session in a new window ("Open as External Resource"). Iframe
   embedding with CHIPS cookies or LTI platform storage is a later enhancement (PQ-A2-6).
7. **Two LMS registrations** (for example staging and production) need **two distinct domains**: Brightspace allows a
   domain in only one enabled registration, and redirect URLs must match exactly with no wildcards (§3.8). Preview
   URLs from the host cannot be used as LTI redirect URLs.

### 5.3 Implementation approach (Proposal)

- Implement the tool side on **`jose`**. The jose function names come from its README (§3.10).
  1. Login endpoint (GET+POST): look up the registration by `(iss, client_id)` (reject if ambiguous). Create
     single-use `state` and `nonce` (CSPRNG), stored hashed with a short TTL. Redirect with the §3.2 parameters.
  2. Launch endpoint: check `state`. Run `jwtVerify` against `createRemoteJWKSet(registration.jwks_url)`, checking
     issuer, audience, `alg` RS256, `exp`/`iat` and `azp`. Consume the nonce once. Check `deployment_id` against
     active deployments, `version == 1.3.0`, `message_type` routing, and `target_link_uri`.
  3. Map the claims to provisioning (§4.5), refresh the service URLs, and create a session.
  4. Tool JWKS endpoint (`kid` always set; rotation with overlap, §3.2). Client-credentials token requests use a
     `SignJWT` assertion. The Deep Linking response is signed with `SignJWT`.
- **Conformance tests:**
  - Automated tests against recorded saLTIre/Moodle launches.
  - Negative tests: bad signature, wrong `aud`, replayed nonce, unknown deployment, missing `sub`.
  - These extend the §9 negative-test culture to authentication.
- **Why not `ltijs`, for now:** v7 is a one-month-old rewrite. Its only listed database backends are MongoDB, so it
  would add a second identity-bearing store and another managed service. That conflicts with the <$5/month and "no
  services to operate" constraints, and with the §6 separation design. Revisit if a Postgres adapter and a track
  record appear.

### 5.4 Migration path, prototype to LTI (Proposal)

- **Bind a course.** An instructor launches from a LEARN course with an Instructor role. ClearCourse sees an unknown
  `(deployment, context.id)`. If the instructor is also an instructor of existing ClearCourse courses, it offers
  "Link this LEARN course to an existing ClearCourse course" or "Create new". Binding inserts a
  `course_lti_context` row and nothing else.
- **Link a person.** Explicit, dual-proof linking (§4.3 item 8). Otherwise the LTI identity becomes a new person.
  Whether prototype data carries forward is a Q17/Q2 decision.
- **Memberships.** Existing join-link memberships stay, with their `source`. New launches add `lti_launch`
  memberships. Whether join links are disabled once a course is LTI-bound is an open question (PQ-A2-10).

### 5.5 Role mapping (Proposal; UW's actual IMS Configuration mapping is Unverified)

| LTI context role(s) | ClearCourse | Note |
|---|---|---|
| `membership#Instructor` (no TA sub-role) | Instructor | §5 |
| `membership/Instructor#TeachingAssistant` (usually sent with `membership#Instructor`, §3.1) | **TA with no permissions until assigned** | The sub-role must take precedence over the principal role it comes with. §5: TAs get only instructor-assigned permissions |
| `membership#Learner` | Student | §5 |
| `membership#ContentDeveloper`, `#Mentor`, context `#Administrator`, any non-core role | **No access** until the owner decides | PQ-A2-1 |
| Empty roles, or none recognized | No access | |
| Learner **and** Instructor in the same context | **Block, and ask an admin** | PQ-A2-1. A dual role could straddle the identity/anonymity boundary |
| System/institution Administrator | **Never** grants ClearCourse institutional admin | §5 admin is configured inside ClearCourse (Q1) |

### 5.6 Cost (all figures from §3)

| Item | Cost |
|---|---|
| `jose`, own LTI code | $0 (MIT) |
| saLTIre | No account needed. Price not stated |
| Moodle in Docker | $0 (GPL-3.0), runs locally |
| Extra datastore | None with the jose approach. ltijs would add MongoDB (+ optional Redis); cost **Unverified** |
| 1EdTech membership/certification | Not priced on the page (**Unverified**). Only needed if certification is wanted |
| UW integration | No fee found. Staff time and process on UW's side (**Unverified**) |

### 5.7 Candid risks and deal-breakers

- **UW may never integrate a solo-run tool.** The governance criteria ("sustainable", "scalable … broad campus use"),
  the contract approval by the CIO, and the IRA-PIA owned by a UW Information Steward all suggest it needs a UW
  sponsor. Production §10 provisioning may stall here no matter how good the code is.
  - **Mitigation (Proposal):** find a UW sponsor early (an instructor or unit). The prototype's privacy design
    documents (Q8/Q9) are the main asset for the IRA-PIA.
- **Join links are weak enrolment.** §5 "enrolled" is not proven. For a public prototype, the owner must decide
  whether this is acceptable (overlaps A1's PQ-A1-3).
- **Building LTI ourselves is security-critical code.** Mitigate with the spec's MUST list, negative tests,
  conformance runs on saLTIre/Moodle, and possibly a 1EdTech certification run.

---

## 6. Dependencies and proposed new open questions

### 6.1 Dependencies on existing §13 questions

- **Q2:** whether the dark LTI spike belongs in milestone 1.
- **Q3:** the stack must allow plain HTTPS POST endpoints (login and launch), a public JWKS endpoint, and outbound
  HTTPS for service calls. All mainstream options do.
- **Q4 / A1:**
  - The prototype join flow needs sign-in first.
  - The affiliation gate (P6) needs a verifiable UW identity.
  - The `(issuer, subject)` model must reconcile with §4.5 (LTI key = `(iss, sub)`).
- **Q6/Q13:** whether email must be requested from LEARN.
- **Q8/Q9:** threat-model entries (§4.3), and how linking carries the participation key.
- **Q12:** AGS vs CSV, and the identifier needed for CSV.
- **Q17:** handling of NRPS-inactive members and prototype data.
- **Q18:** the end-of-course trigger. LTI core carries no end date (Brightspace substitution parameters
  **Unverified**).
- **Q20:** rate limits for join-code redemption.
- **Q1:** the admin UI for LTI registrations.

### 6.2 PROPOSED new open questions (for §13; not resolved here)

| # | Proposed question | Blocks |
|---|---|---|
| PQ-A2-1 | How do LTI roles map to ClearCourse roles? In particular `ContentDeveloper`, `Mentor`, context `Administrator`, a person who is both Learner and Instructor in one course, and how UW's LEARN roles are mapped in its IMS Configuration. | LTI provisioning, §5 |
| PQ-A2-2 | Does a TA arriving by LTI (or invite) start with **no** permissions until the instructor assigns them? | §5 TA permissions |
| PQ-A2-3 | In the prototype, may instructors upload rosters or enter student emails before a UW IRA-PIA? Or is self-enrolment the only route? (UW guidance: §4.2.) | P4/P5 |
| PQ-A2-4 | Who is the UW sponsor or Information Steward for an eventual LEARN integration and IRA-PIA? When should that process start? | Production §10 |
| PQ-A2-5 | May a grade passback or export carry an institutional identifier beyond §7.10's "name · level · date shared"? (LTI `sub` for AGS; OrgDefinedId/Username for a LEARN CSV.) If UW's deployment does not send names, where does the "student name" come from? | §7.10, §7.11, Q12 |
| PQ-A2-6 | Should ClearCourse ever render inside a LEARN iframe, or always open in a new window? (Cookie limits; UW's Piazza instructions.) | UX, §8 |
| PQ-A2-7 | What timestamp precision should anonymous content and membership records show and store, given join-time and LMS visit-log correlation? | Q8, Q9, §7.7 |
| PQ-A2-8 | What is one ClearCourse course in LTI terms? (One per LEARN course offering/context? Cross-listed and multi-section courses? What happens on LEARN course copy each term?) | Course lifecycle |
| PQ-A2-9 | When a prototype user later arrives through LTI, are accounts linked (explicit dual proof) or started fresh? Does prototype participation data carry over? | Q9, Q17 |
| PQ-A2-10 | In production, can courses also be created manually or by join link, or only through LTI? Are join links disabled once a course is LTI-bound? | §10, §5 |
| PQ-A2-11 | Should NRPS be used at all, given it pulls non-users' data? If so, which fields? | §6 minimization |
| PQ-A2-12 | Is 1EdTech certification wanted or required (membership cost unknown)? | Production |

### 6.3 Proposed spikes (scratch only; no code in the repo until an ADR)

- **S-A2-1:** LTI 1.3 launch against the saLTIre Test Platform using `jose`. Pass/fail on every §3.2 check, plus
  negative cases.
- **S-A2-2:** Moodle in Docker as the platform: Dynamic Registration, Deep Linking, NRPS, AGS. Confirm a "pending
  then activate" flow like Brightspace's.
- **S-A2-3:** Browser matrix (Safari, Firefox, Chrome) for iframe vs new-window launch, and `Partitioned` state
  cookies vs LTI postMessage storage.
- **S-A2-4:** Ask on the D2L developer community whether the "Brightspace Development Environment" allows LTI
  Advantage registration by independent developers.
- **S-A2-5:** Email learnhelp@uwaterloo.ca or pia@uwaterloo.ca to ask how a new LTI integration request starts and who
  sponsors it. The owner must approve before anyone contacts UW.

---

## 7. Verification log

| Claim | URL | Checked | Status |
|---|---|---|---|
| LTI 1.3 Core is IMS Final Release, Doc v3, 16 Apr 2019 | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| `sub` "MUST be a stable locally unique to the iss"; no `sub` = anonymous launch | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| Context claim optional; `context.id` "locally unique to the deployment_id" | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| `deployment_id` immutable and unique within `iss`; a platform instance is identified by issuer + client_id + deployment_id | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| TA sub-role URI `…/membership/Instructor#TeachingAssistant`; send the principal role too | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified |
| "MUST NOT use any other attribute other than the unique identifier" to identify users between systems | https://www.imsglobal.org/spec/lti/v1p3/ | 2026-10-11 | Verified (quoted via fetch summary; exact surrounding context not re-read) |
| Security Framework 1.0 Final, 15 May 2019; the id_token checks and nonce rules listed | https://www.imsglobal.org/spec/security/v1p0/ | 2026-10-11 | Verified |
| `kid` always required; preserve the previous key on rotation | https://www.imsglobal.org/spec/security/v1p0/ | 2026-10-11 | Verified |
| NRPS 2.0 Final, 16 Apr 2019; only `user_id` + `roles` required; "LTI does not pass user information in its default configuration" | https://www.imsglobal.org/spec/lti-nrps/v2p0 | 2026-10-11 | Verified |
| AGS 2.0 Final, 16 Apr 2019; platform MAY ignore non-`FullyGraded`; "platform has the final say" | https://www.imsglobal.org/spec/lti-ags/v2p0 | 2026-10-11 | Verified |
| Deep Linking 2.0 Final; doc v2 dated 24 Jan 2023; custom params included in launches | https://www.imsglobal.org/spec/lti-dl/v2p0 | 2026-10-11 | Verified |
| Dynamic Registration 1.0 is "Candidate Final"; registration is "not activated yet" until the admin activates it | https://www.imsglobal.org/spec/lti-dr/v1p0 | 2026-10-11 | Verified |
| LTI 1.3 is the current version; LTI Advantage = AGS, NRPS, DL | https://www.1edtech.org/standards/lti | 2026-10-11 | Verified |
| OIDC postMessage cookie workaround is a v0.1 Base Document for members' review | https://www.imsglobal.org/spec/lti-cs-oidc/v0p1 | 2026-10-11 | Verified |
| Safari ITP and Firefox TCP on by default; Chrome does not block by default; CHIPS `Partitioned` option | https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies | 2026-10-11 | Verified |
| Brightspace supports core launch, AGS, NRPS, Deep Linking 2.0 | https://community.d2l.com/brightspace/kb/articles/23660-lti-advantage-v1-3 | 2026-10-11 | Verified (via the community API JSON) |
| Registration needs "Manage LTI Tools" at org level; Dynamic Registration is disabled by default; exact redirect URLs; one enabled registration per domain | https://community.d2l.com/brightspace/kb/articles/23662-tool-registration-deployment-and-links | 2026-10-11 | Verified (via the community API JSON) |
| Deployment `Anonymous` removed (LE API v1.92), "always considered to be false" from LMS 20.26.2 | https://docs.valence.desire2learn.com/res/ltiadvantage.html | 2026-10-11 | **Conflicting** (KB 23662 still mentions Anonymous) |
| Deployment flags for names, email, OrgDefinedId; `PreProvisioning` sends classlist "including users not known to tool" | https://docs.valence.desire2learn.com/res/ltiadvantage.html | 2026-10-11 | Verified (my reading of `PreProvisioning` is Unverified) |
| Brightspace roles are mapped to IMS roles via the IMS Configuration tool | https://community.d2l.com/brightspace/kb/articles/23663-org-units-and-role-mapping | 2026-10-11 | Verified |
| UW's actual LEARN to LTI role mapping | none found | 2026-10-11 | **Unverified** |
| Brightspace Content Reports show per-user last visit, visit count, time spent | https://community.d2l.com/brightspace/kb/articles/23391-leveraging-tool-level-reporting-in-brightspace-to-access-course-level-data | 2026-10-11 | Verified (whether LTI links are included is Unverified) |
| Brightspace grade import needs OrgDefinedID or Username plus an End-of-Line Indicator | https://community.d2l.com/brightspace/kb/articles/3537-import-grades-and-grade-items | 2026-10-11 | Verified |
| "LEARN is D2L software, hosted by D2L"; LEARN team reviews third-party tools with the Privacy Officer and ISO before integration; standard data set USERID/role/username/email | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/44088164615/LEARN+Privacy+information+and+other+tools | 2026-10-11 | Verified (page v3, 2024-10-09) |
| Piazza is added through Existing Activities > External Learning Tools; "Open as External Resource" advised | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/43073961985/Integrating+Piazza+with+a+LEARN+course | 2026-10-11 | Verified (page v5, 2023-03-15) |
| UW IRA-PIA review "typically takes 2–4 weeks"; FIPPA amended by Bill 194, effective 1 Jul 2025 | https://uwaterloo.ca/privacy/information-risk-assessment | 2026-10-11 | Verified |
| UW LEO handles "requests for integration with the LMS"; principles "sustainable", "scalable"; CIO approves contracts | https://uwaterloo.ca/educational-technology-hub/governance | 2026-10-11 | Verified |
| Centrally supported tools have undergone an IRA and PIA | https://uwaterloo.ca/educational-technology-hub/catalogs/centrally-supported-tools | 2026-10-11 | Verified |
| A public UW request form for new LEARN integrations exists | none found | 2026-10-11 | **Unverified** |
| UW: check whether an IRA is required "before proceeding any further"; "best to choose a tool that does not require students to identify themselves" | https://uwaterloo.ca/privacy/guidelines/online-educational-technologies | 2026-10-11 | Verified |
| UW (Policy 46): instructors "not authorized to release student information" without proper permission | https://uwaterloo.ca/information-systems-technology/about/policies-standards-and-guidelines/teaching-learning/cloud-based-educational-technologies | 2026-10-11 | Verified (page dated July 2017) |
| `jose` 6.2.12, MIT, 0 dependencies, pushed 2026-10-01 | https://registry.npmjs.org/jose/latest ; https://api.github.com/repos/panva/jose | 2026-10-11 | Verified |
| `ltijs` v7.0.0 (2026-09-09) TS rewrite; latest 7.0.7; Node >=24; MongoDB backends; previous release 2024-05-01 | https://api.github.com/repos/Cvmcosta/ltijs/releases?per_page=5 ; https://registry.npmjs.org/ltijs/latest | 2026-10-11 | Verified |
| `ltijs` v7 has a Postgres adapter / runs serverless | none found | 2026-10-11 | **Unverified** |
| `@atomicjolt/lti-server` 3.3.3, MIT, no repository field | https://registry.npmjs.org/@atomicjolt/lti-server/latest | 2026-10-11 | Verified (maintenance Unverified) |
| saLTIre Test Platform supports LTI 1.3, Deep Linking, a line-item service, Dynamic Registration; no account needed | https://saltire.lti.app/ | 2026-10-11 | Verified (NRPS support Unverified) |
| moodle-docker exists, GPL-3.0, pushed 2026-07-30 | https://api.github.com/repos/moodlehq/moodle-docker | 2026-10-11 | Verified |
| Moodle registers LTI Advantage tools ("Add LTI Advantage"), pending then activate; name/email sharing toggles | https://docs.moodle.org/en/External_tool | 2026-10-11 | Verified ("5.3 docs") |
| 1EdTech RI: "Limited functionality is provided free of charge" | https://lti-ri.imsglobal.org/ | 2026-10-11 | Verified (may be stale) |
| Certification needs active 1EdTech membership; price not listed | https://www.1edtech.org/certification/get-certified | 2026-10-11 | Verified (cost Unverified) |
| Canvas Lite is a free individual-educator account | https://www.instructure.com/canvas/try-canvas | 2026-10-11 | Verified (LTI 1.3 developer keys Unverified) |
| D2L developer instance credentials are available to the Developer Group | https://community.d2l.com/brightspace/kb/articles/1100-using-postman-with-the-brightspace-api | 2026-10-11 | Verified (LTI registration there Unverified) |
| Brightspace supports LTI postMessage platform storage (`lti_storage_target`) | none found | 2026-10-11 | **Unverified** |
| Brightspace `sub` format | none found | 2026-10-11 | **Unverified** (not relied on) |
| Re-check: `Anonymous` "always considered to be false" as of LMS 20.26.2; `PreProvisioning` wording; Send* flag list | https://docs.valence.desire2learn.com/res/ltiadvantage.html | 2026-10-11 (second run) | Verified (unchanged) |
| `SendInstitutionRole` is a registration property, not a deployment flag | https://docs.valence.desire2learn.com/res/ltiadvantage.html | 2026-10-11 (second run) | Verified (corrects the earlier §3.8/§4.4 placement) |
| Re-check: ltijs v7.0.0 published 2026-09-09, "full, from-scratch TypeScript rewrite", Mongo-only backends, Node 24+; previous release v5.9.5 2024-05-01 | https://api.github.com/repos/Cvmcosta/ltijs/releases?per_page=5 | 2026-10-11 (second run) | Verified (unchanged; no Postgres mention) |
| §5 quotes ("Students may access only courses in which they are enrolled" etc.) are verbatim in the source spec | P:/code/clearcourse-ai/docs/research/source-prompt.txt (p.2) | 2026-10-11 (second run) | Verified |
