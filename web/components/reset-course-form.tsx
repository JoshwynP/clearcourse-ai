"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { resetCourseAction } from "@/lib/actions";

function ResetSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button danger" type="submit" disabled={pending}>
    {pending ? "Wiping selected data…" : "Wipe selected course data"}
  </button>;
}

export function ResetCourseForm({ courseId, code }: { courseId: string; code: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState({ discussion: false, students: false, assignments: false, courseCard: false });
  const labels = [
    selected.discussion && "Discussion questions, replies, votes, and participation",
    selected.students && "Student enrollment and their participation (join code will change)",
    selected.assignments && "Assignment AI cards",
    selected.courseCard && "Course AI card",
  ].filter(Boolean);

  if (!expanded) return <button className="button danger" type="button" onClick={() => setExpanded(true)} aria-expanded="false">Wipe course data</button>;

  return <form className="reset-form" action={resetCourseAction}>
    <input type="hidden" name="courseId" value={courseId} />
    <h3>Choose what to wipe</h3>
    <p>Choose what to clear when preparing this course for a new term. This cannot be undone. The course, teaching team, and accounts stay in place.</p>
    <label><input type="checkbox" name="discussion" checked={selected.discussion}
      onChange={(event) => setSelected((current) => ({ ...current, discussion: event.target.checked, assignments: event.target.checked ? current.assignments : false }))} /> Discussion and participation <small>Removes all questions, replies, votes, and participation records together.</small></label>
    <label><input type="checkbox" name="students" checked={selected.students}
      onChange={(event) => setSelected((current) => ({ ...current, students: event.target.checked }))} /> Student enrollment <small>Removes students and their participation. Generates a new join code so former students cannot rejoin with the old one.</small></label>
    <label><input type="checkbox" name="assignments" checked={selected.assignments} disabled={!selected.discussion}
      onChange={(event) => setSelected((current) => ({ ...current, assignments: event.target.checked }))} /> Assignment AI cards <small>Requires clearing discussion so assignment-tagged questions are not left without a card.</small></label>
    <label><input type="checkbox" name="courseCard" checked={selected.courseCard}
      onChange={(event) => setSelected((current) => ({ ...current, courseCard: event.target.checked }))} /> Course AI card <small>Clears the course guidance fields. You can write new guidance in Manage My Cards.</small></label>
    <div className="form-actions"><button className="button" type="button" onClick={() => { setExpanded(false); setSelected({ discussion: false, students: false, assignments: false, courseCard: false }); }}>Cancel</button>
    <button className="button danger reset-review" type="button" disabled={!labels.length} onClick={() => {
      const field = dialog.current?.querySelector<HTMLInputElement>("#reset-confirmation");
      if (field) field.value = "";
      dialog.current?.showModal();
    }}>Review wipe</button></div>
    <dialog className="reset-dialog" ref={dialog} aria-labelledby="reset-title">
      <h3 id="reset-title">Confirm course reset</h3>
      <p>You are about to permanently clear:</p>
      <ul>{labels.map((label) => <li key={String(label)}>{label}</li>)}</ul>
      <p>Type <strong>WIPE {code}</strong> to confirm.</p>
      <label htmlFor="reset-confirmation">Confirmation</label>
      <input className="field" id="reset-confirmation" name="confirmation" required autoComplete="off" />
      <div className="form-actions">
        <button className="button" type="button" onClick={() => dialog.current?.close()}>Cancel</button>
        <ResetSubmitButton />
      </div>
    </dialog>
  </form>;
}
