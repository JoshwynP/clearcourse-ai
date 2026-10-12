# Build now: from clickable prototype to pilot

## Already visible

The static prototype in `index.html`, `styles.css`, and `app.js` shows the main course experience. It has two fictional courses, course and assignment AI cards, a question board with only Course and Specific Assignment categories, and a manual instructor editing preview. The sample interactions work in the current browser tab. Nothing is stored or sent.

## Next three small milestones

1. **Get feedback on the experience.** Run the prototype locally, then put the static files on a preview URL. Ask an instructor and a few students to walk through one assignment card and its related conversation. Keep it fictional during this step. Refine the layout, wording, and card fields from that feedback.
2. **Build the real card workflow.** Decide the application stack and hosting (Q3), then add instructor authentication and course access (Q4–Q5). Build real course and assignment card editing, drafts, student preview, publishing, and version history (§7.3–§7.6). This can provide a useful pilot before any student discussion data is collected.
3. **Add private discussion and participation.** Approve a documented privacy mechanism and threat model (Q8–Q9) before writing real posting or counter code. Add course access checks, moderation and rate controls, the negative privacy test suite (§6, §7.7, §9), then the private participation counters and student-controlled level sharing (§7.9–§7.10).

## Decisions that actually block the next milestone

- **Q3:** Which production app stack and preview/pilot host? ADRs 0001–0002 propose one path, but remain proposals.
- **Q4–Q5:** How will instructors and students sign in and enter their courses for a pilot?
- **Q8–Q9:** What reviewed privacy design will support truly anonymous discussion and private participation? ADR 0003 is proposed. Resolve this before accepting real posts.

Other open questions in CONTRIBUTING §13 can be answered when their feature is reached. Avoid making the full research document a launch checklist.

## Definition of the first public preview

A public URL can serve this fictional-data front end with a visible prototype label and no real student information. A real-course pilot requires the card workflow, authorization, and a review of privacy and institutional requirements. A public URL alone is not a production launch.
