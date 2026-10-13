# Threat model: local anonymous questions

This is the pilot threat model for CONTRIBUTING §6. It covers the local stand-in in ADR 0008 and ADR 0009. It is not a production deployment review.

## What this slice stores

- Identity file: name, role (Professor stored as instructor, or Student), random user id, random vote key, session id, courses, membership, and the course join code. Course-card text lives here because it is instructor policy.
- Content file: question text, reply text, the reply role label (Instructor or Student), and an opaque vote token.
- The content file has no user id, name, session id, or vote key.

## What a course member can do

- A professor can create a course, see its join code, edit the course card, and use the anonymous board.
- A student can join with a code and use the same board.
- Both see the same questions. Nothing on a question, reply, or vote shows who wrote it.
- A person who is not a member gets no course page. A student cannot create a course. A student does not see the join code after joining.
- One vote token counts once. Voting again removes it.

## What this slice does not do

- It does not credit participation, export grades, send email, or provide an administrator view.
- It does not reveal identity for abuse handling. The default is that nobody can deanonymize.
- It does not log a name together with question text.

## Limits of the stand-in

Anyone who can read the application folder can open both files. The separation is in the application code, not in separate database roles. That is acceptable only on the developer machine. Before real students use the app, the stores need separate PostgreSQL roles so an ordinary content query cannot read the identity store.

The vote token is an HMAC of a secret key and the question id. It is not a hash of the user id. Guessing a token does not reveal the person. Reading both files still lets a determined reader try every member's key. That comparison must become impossible for ordinary application queries in production.

Join codes are short random codes so a professor can share them. They are not secret from the students in the course. They must stay unguessable from outside the course.

Practice sign-in trusts the name the person types. It does not prove who they are.
