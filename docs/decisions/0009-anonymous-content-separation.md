# ADR 0009: Anonymous content separation

- **Status:** Accepted
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §6 / Q8, Q9

## Context

The owner decided that questions are always anonymous, and asked for the privacy design to be chosen. Participation counters are not part of this slice. Upvotes still must not be counted twice for the same person. ADR 0007 forbids treating the sample session as stored anonymous content. The sample session uses sequential question ids and must not become the store.

## Options considered

1. **Store the author id on each question and hide it in the interface.** Rejected. An ordinary read of the content store would still join the question to the person.
2. **Use a plain hash of the user id as the vote key.** Rejected. Someone who knows the enrolled user ids can hash them and compare.
3. **Keep identity and content in separate stores, and store only an opaque vote token on the content side.** Chosen for this local stand-in.

## Decision

Approved by the owner on 2026-10-12. The threat model is `docs/privacy/threat-model.md`.

1. Questions are always anonymous. A question, reply, or vote stores no user id, name, session id, or vote key.
2. Identity and content are separate modules and separate files. Content functions do not accept a user id or a name.
3. Each person has a random vote key that stays in the identity store. A vote stores `HMAC-SHA256(vote key, question id)`. The same token toggles one vote. A different person produces a different token.
4. Replies are labeled Instructor or Student. They are not labeled with a person's name.
5. Question, course, user, and session ids are random. They are not sequential.
6. Participation counters are not written in this slice. When they are added, they need their own store and must not be joinable to question text by an ordinary query.
7. Nobody can deanonymize through the application. There is no deanonymization path in this pilot.

## Consequences

The local files can still be opened together by someone with the computer. That is a limit of the stand-in, not the intended production design. Production must put these stores behind separate database roles before real student use. Course-card text is instructor policy and stays with the course in the identity store.
