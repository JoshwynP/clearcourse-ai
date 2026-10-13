"use client";

import { useRef, useState } from "react";
import { resetCourseAction } from "@/lib/actions";

export function ResetCourseForm({ courseId, code }: { courseId: string; code: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState({ discussion: false, students: false, assignments: false, courseCard: false });
  const labels = [
    selected.discussion && "Discussion questions, replies, votes, and participation",
    selected.students && "Student enrollment and their participation (join code will change)",
    selected.assignments && "Assignment AI cards",
    selected.courseCard && "Course AI card",
  ].filter(Boolean);

  return <form className="reset-form" action={resetCourseAction}>
    <input type="hidden" name="courseId" value={courseId} />
    <p>Choose what to clear when preparing this course for a new term. This cannot be undone. The course, teaching team, and accounts stay in place.</p>
    <label><input type="checkbox" name="discussion" checked={selected.discussion}
      onChange={(event) => setSelected((current) => ({ ...current, discussion: event.target.checked, assignments: event.target.checked ? current.assignments : false }))} /> Discussion and participation <small>Removes all questions, replies, votes, and participation records together.</small></label>
    <label><input type="checkbox" name="students" checked={selected.students}
      onChange={(event) => setSelected((current) => ({ ...current, students: event.target.checked }))} /> Student enrollment <small>Removes students and their participation. Generates a new join code so former students cannot rejoin with the old one.</small></label>
    <label><input type="checkbox" name="assignments" checked={selected.assignments} disabled={!selected.discussion}
      onChange={(event) => setSelected((current) => ({ ...current, assignments: event.target.checked }))} /> Assignment AI cards <small>Requires clearing discussion so assignment-tagged questions are not left without a card.</small></label>
    <label><input type="checkbox" name="courseCard" checked={selected.courseCard}
      onChange={(event) => setSelected((current) => ({ ...current, courseCard: event.target.checked }))} /> Course AI card <small>Clears the course guidance fields. You can write new guidance in Manage My Cards.</small></label>
    <button className="button reset-review" type="button" disabled={!labels.length} onClick={() => dialog.current?.showModal()}>Review course reset</button>
    <dialog className="reset-dialog" ref={dialog} aria-labelledby="reset-title">
      <h3 id="reset-title">Confirm course reset</h3>
      <p>You are about to permanently clear:</p>
      <ul>{labels.map((label) => <li key={String(label)}>{label}</li>)}</ul>
      <p>Type <strong>WIPE {code}</strong> to confirm.</p>
      <label htmlFor="reset-confirmation">Confirmation</label>
      <input className="field" id="reset-confirmation" name="confirmation" required autoComplete="off" />
      <div className="form-actions">
        <button className="button" type="button" onClick={() => dialog.current?.close()}>Cancel</button>
        <button className="button danger" type="submit">Wipe selected course data</button>
      </div>
    </dialog>
  </form>;
}
