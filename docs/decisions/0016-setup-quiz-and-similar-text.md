# ADR 0016: Card setup answers and similar text

Date: 2026-10-13

Status: Accepted for the current app

## Decision

The card setup quiz copies an instructor’s own answers into existing card fields with fixed rules.
It does not call a generative model. Similar answers shown during setup come from published
assignment-card text in the identity database, excluding the current course. Similar discussion
questions come from `content.board` across courses. Results include question title, body, reply
role, and reply text, plus whether the question is from the same course. They do not include a
course name, course code, account, or vote token. Draft card text is not included. Suggestions
never block a question or fill a card on their own.

The start-of-term control in course settings records that a reminder was prepared and shows the
join code. It does not send email or any other message.

## Consequences

Instructors can walk through the twelve setup questions and then edit the filled card. Discussion
can show related questions from other courses without naming those courses. Real notification
delivery remains blocked until the email provider and essential-notification questions are decided.
