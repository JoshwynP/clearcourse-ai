# ADR 0014: Card field layout

Date: 2026-10-13

Status: Accepted for the current app

## Decision

Manage My Cards opens with a chooser. An instructor must select a course card, an existing
assignment card, or a new assignment card to open an editor. A new card includes every standard
field. Standard fields can be hidden and restored, while preserving their text. Custom fields have
a name and content and can be added or deleted. Hidden standard fields and their values are omitted
from student-facing card and summary views. The fixed University policy links remain visible.

Card layout is stored in the existing JSONB card record as `layout.hiddenFields` and
`layout.customFields`; existing records without layout show all standard fields. The server accepts
only known standard field keys and validates the custom field list. No database migration is needed.

## Consequences

Instructors can simplify a card without losing the standard wording. Hiding a field affects the
student view only after saving. Deleting a custom field takes effect when the card is saved. The
editor offers an Undo action before saving. Published-card versioning remains a separate unresolved
requirement from §7.6 and is not implemented by this layout change.
