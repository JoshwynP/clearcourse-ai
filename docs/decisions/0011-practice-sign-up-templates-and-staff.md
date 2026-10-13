# ADR 0011: Practice sign-up, example courses, and course staff

- **Status:** Accepted for the hosted practice release
- **Date:** 2026-10-13
- **Relates to:** CONTRIBUTING §§5, 7.1–7.4, 7.6 and 8
- **Supersedes:** ADR 0010's combined first sign-in and account creation

## Context

The owner found that combined account creation/sign-in was unclear, assignment
drafts disappeared from the course page, the question composer was cramped,
and new courses had no example. The owner also requested course settings for
adding other professors and teaching assistants.

## Decision

1. Separate sign-up from sign-in. Sign-up saves name, email, password, and the
   chosen practice role; sign-in accepts existing accounts only. Neither email
   ownership nor instructor status is verified.
2. A professor can create a blank course or an explicitly fictional example
   with a filled course card and two assignment cards. Example card content is
   editable and has no actual student information.
3. A professor sees private assignment drafts on the course page; students
   see only published cards. The question composer has its own full-width
   panel and the question list uses distinct, restrained cards.
4. The owner can grant course professor or TA access to an existing account by
   email, and revoke it. Course professors can edit cards and see shared
   participation levels; TAs can edit cards and answer board questions. Only
   the owner can grant or revoke access. TA actions do not count toward student
   participation. This is course-level access, not an institutional admin role.

## Limits

The hosted app is still for practice. Account email and Professor status are
unverified. There is no emailed invitation. Migration 004 must be applied to
the identity database before this release is deployed.
