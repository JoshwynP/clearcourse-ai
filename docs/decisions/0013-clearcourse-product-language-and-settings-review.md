# ADR 0013: ClearCourse product language and settings review

**Date:** 2026-10-13  
**Status:** Accepted by owner

## Decision

ClearCourse is the intended course product. Account and interface copy should call a new account a ClearCourse account and should not label the live app a practice website. The fictional static site in `public/` remains a separate design reference. This decision supersedes the temporary product labels in ADRs 0008–0012; those records remain as development history.

The sidebar keeps sign-out visible while the course list scrolls and can be searched. The welcome guide can be reopened from any page after first acknowledgement. Course detail changes, join-code rotation, and removal of students or teaching staff require review before submission. End-of-term wipe is a red action at the bottom of settings; its choices stay collapsed until selected, and the existing typed confirmation remains required.

## Boundary

Copy changes do not create verified email ownership, validated Professor status, institutional authorization, guaranteed anonymity, or an approved retention policy. The current app remains unsuitable for real student information or grading until the privacy architecture and negative tests in `CONTRIBUTING.md` §6 and Q8–Q9, verification, and Q17 are resolved. Preserve accurate in-product guidance about these current limits without describing the product as a practice site.
