import Link from "next/link";
import { saveCourseCard, saveAssignmentCard, setAssignmentStatus } from "@/lib/actions";
import { assignmentEditableKeys, assignmentRows, courseEditableKeys, courseRows } from "@/lib/card-rows";
import { CardFieldEditor } from "@/components/card-field-editor";
import type { AssignmentCard } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

const EQUITY_NOTE = "Requiring students to use AI for an assignment may introduce accessibility and equity concerns. Where possible, instructors should consider making AI use permitted but optional, rather than mandatory. Additionally, if students can earn a transparency bonus for disclosing their AI use, students who choose not to use AI should have an equivalent opportunity to earn that bonus by being transparent about their process.";

export function CourseStudio({ courseId, card, assignments, selectedId, error }: {
  courseId: string; card: CardFields; assignments: AssignmentCard[]; selectedId?: string; error?: string;
}) {
  const selected = assignments.find((item) => item.id === selectedId);
  const newAssignment = selectedId === "new";
  const editCourse = selectedId === "course";
  const active = assignments.filter((item) => item.status !== "archived");
  const archived = assignments.filter((item) => item.status === "archived");
  const courseValues = Object.fromEntries(courseEditableKeys.map((key) => [key, String(card[key] ?? "")]));
  const assignmentValues = Object.fromEntries(assignmentEditableKeys.map((key) => [key, String(selected?.details[key] ?? "")]));
  const editing = Boolean(selected || newAssignment || editCourse);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Manage My Cards</h1>
        <p className="page-subtitle">Choose a card to edit or create a new assignment card. You write the rules students see.</p>
      </div></div>
      {error ? <p className="notice" role="alert">{error === "duplicate" ? "That assignment identifier is already in use." : error === "fields" ? "Check the custom fields and try saving again." : "Check the card title and identifier."}</p> : null}
      <section className="panel manage-panel" aria-label="Cards">
        <ul className="manage-list">
          <li className="manage-item"><div className="manage-copy"><strong>Course AI card</strong></div>
            <Link className="button small" href={`/courses/${courseId}/studio?card=course`}>Edit card</Link></li>
          {active.map((item) => (
            <li className="manage-item" key={item.id}>
              <div className="manage-copy"><strong>{item.title}</strong><span className="status-tag">{item.status === "published" ? "Published" : "Private draft"}</span></div>
              <div className="manage-actions">
                <Link className="button small" href={`/courses/${courseId}/studio?card=${item.id}`}>Edit card</Link>
                {item.status !== "published" ? <StatusForm courseId={courseId} id={item.id} status="published" label="Publish to students" /> : <StatusForm courseId={courseId} id={item.id} status="draft" label="Return to private draft" />}
                <StatusForm courseId={courseId} id={item.id} status="archived" label="Archive" />
              </div>
            </li>
          ))}
        </ul>
        <div className="manage-create"><Link className="button" href={`/courses/${courseId}/studio?card=new`}>Create an assignment card</Link></div>
      </section>
      {archived.length ? (
        <section className="panel archived-panel" aria-label="Archived cards">
          <h2>Archived cards</h2>
          <p className="meta">Unarchive moves a card back into your AI cards as a private draft.</p>
          <ul className="manage-list">
            {archived.map((item) => (
              <li className="manage-item" key={item.id}>
                <div className="manage-copy"><strong>{item.title}</strong><span className="status-tag">Archived</span></div>
                <div className="manage-actions">
                  <Link className="button small" href={`/courses/${courseId}/studio?card=${item.id}`}>Edit card</Link>
                  <StatusForm courseId={courseId} id={item.id} status="draft" label="Unarchive" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {editing ? (
        <div className="studio-workspace">
          {selected || newAssignment ? (
            <form className="panel panel-pad studio-form" action={saveAssignmentCard} key={selected?.id ?? "new"}>
              <h2>{selected ? `Edit ${selected.title}` : "New assignment card"}</h2>
              <p className="meta">New cards start as private drafts. Publish when the wording is ready.</p>
              <input type="hidden" name="courseId" value={courseId} />
              {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
              <div className="editor-meta">
                <div><label htmlFor="assignment-title">Assignment title</label><input className="field" id="assignment-title" name="title" required maxLength={120} placeholder="Research essay" defaultValue={selected?.title} />
                  <small className="field-hint">The name students will see on the card.</small></div>
                <div><label htmlFor="identifier">Assignment identifier</label><input className="field" id="identifier" name="identifier" required maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="essay-1" defaultValue={selected?.identifier} />
                  <small className="field-hint">A short unique code for this assignment. Use letters, numbers, hyphens, or underscores.</small></div>
              </div>
              <CardFieldEditor kind="assignment" rows={assignmentRows} values={assignmentValues} savedLayout={selected?.details.layout} />
              <p><Link href={`/courses/${courseId}/studio/setup?card=${selected?.id ?? "new"}`}>Answer setup questions</Link></p>
              <div className="form-actions">
                <button className="button primary" type="submit" name="intent" value="save">Save card</button>
                <button className="button" type="submit" name="intent" value="preview">Preview new card</button>
                <Link className="button" href={`/courses/${courseId}/studio`}>Cancel</Link>
              </div>
            </form>
          ) : (
            <form className="panel panel-pad studio-form" action={saveCourseCard}>
              <h2>Edit Course AI card</h2>
              <input type="hidden" name="courseId" value={courseId} />
              <CardFieldEditor kind="course" rows={courseRows} values={courseValues} savedLayout={card.layout} />
              <p><Link href={`/courses/${courseId}/studio/setup?card=course`}>Answer setup questions</Link></p>
              <div className="form-actions">
                <button className="button primary" type="submit" name="intent" value="save">Save course card</button>
                <button className="button" type="submit" name="intent" value="preview">Preview new card</button>
                <Link className="button" href={`/courses/${courseId}/studio`}>Cancel</Link>
              </div>
            </form>
          )}
          <aside className="panel panel-pad equity-panel" aria-label="Accessibility and Equity Considerations">
            <h2>Accessibility and Equity Considerations</h2>
            <p>{EQUITY_NOTE}</p>
          </aside>
        </div>
      ) : (
        <div className="panel panel-pad studio-chooser"><h2>Choose a card to edit</h2>
          <p>Select an existing card above, or create an assignment card. The Course AI card opens only when you choose to edit it.</p>
        </div>
      )}
    </div>
  );
}

export function StatusForm({ courseId, id, status, label, returnTo = "studio" }: {
  courseId: string; id: string; status: AssignmentCard["status"]; label: string; returnTo?: "studio" | "guidance";
}) {
  return <form action={setAssignmentStatus} className="inline-form">
    <input type="hidden" name="courseId" value={courseId} />
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="status" value={status} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <button className="button small" type="submit">{label}</button>
  </form>;
}
