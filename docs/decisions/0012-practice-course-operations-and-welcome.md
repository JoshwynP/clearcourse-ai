# ADR 0012: Practice course operations and first sign-up guide

Date: 2026-10-13

## Decision

The owner requested fuller course settings and a first sign-up welcome screen for the hosted practice app. Course owners and added professors may edit the displayed course code/name, rotate the join code, add or remove existing Student accounts, and reset selected course data at the end of a term. Only the owner may add or remove teaching staff. The current join code remains visible in settings.

Reset choices are discussion plus participation, student enrollment, assignment cards, and the Course AI card. Discussion and participation reset together; removing assignment cards requires discussion reset so question tags do not refer to missing cards. Removing students also deletes their participation records and rotates the join code. A review dialog and exact `WIPE <course code>` phrase precede the action. The course, teaching team, and accounts are retained. The identity and content databases have no distributed transaction; a rare failure during final commit could leave a partial reset and needs operator review. This is a practice-only operation, not the production retention policy in Q17.

New practice accounts must acknowledge a short welcome guide before using the app. Existing accounts are marked acknowledged by migration 005. The guide explains the site's goals, student and professor uses, discussion expectations, and practice release limitations. It is guidance, not a substitute for official University or course policy. The app checks password confirmation on the server before creating an account.

The masthead puts ClearCourse on the left and the UW wordmark on the right, and states that the site is made by UW students for UW students and professors. This description reflects the owner's requested copy; it does not imply official University authentication or endorsement.
