import Link from "next/link";
import { saveCourseCard, saveAssignmentCard, setAssignmentStatus } from "@/lib/actions";
import { assignmentEditableKeys, assignmentRows, courseEditableKeys, courseRows } from "@/lib/card-rows";
import { CardFieldEditor } from "@/components/card-field-editor";
import type { AssignmentCard } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

export function CourseStudio({ courseId, card, assignments, selectedId, error }: {
  courseId: string; card: CardFields; assignments: AssignmentCard[]; selectedId?: string; error?: string;
}) {
  const selected = assignments.find((item) => item.id === selectedId);
  const newAssignment = selectedId === "new";
  const editCourse = selectedId === "course";
  const courseValues = Object.fromEntries(courseEditableKeys.map((key) => [key, String(card[key] ?? "")]));
  const assignmentValues = Object.fromEntries(assignmentEditableKeys.map((key) => [key, String(selected?.details[key] ?? "")]));
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
          {assignments.map((item) => (
            <li className="manage-item" key={item.id}>
              <div className="manage-copy"><strong>{item.title}</strong><span className="status-tag">{item.status === "published" ? "Published" : item.status === "draft" ? "Private draft" : "Archived"}</span></div>
              <div className="manage-actions">
                <Link className="button small" href={`/courses/${courseId}/studio?card=${item.id}`}>Edit card</Link>
                {item.status !== "published" ? <StatusForm courseId={courseId} id={item.id} status="published" label="Publish to students" /> : <StatusForm courseId={courseId} id={item.id} status="draft" label="Return to private draft" />}
                {item.status !== "archived" ? <StatusForm courseId={courseId} id={item.id} status="archived" label="Archive" /> : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="manage-create"><Link className="button" href={`/courses/${courseId}/studio?card=new`}>Create an assignment card</Link></div>
      </section>
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
          <div className="form-actions"><button className="button primary" type="submit">Save card</button>
            {selected ? <Link className="button" href={`/courses/${courseId}/guidance?card=${selected.id}`}>View saved card</Link> : null}
            <Link className="button" href={`/courses/${courseId}/studio`}>Cancel</Link>
          </div>
        </form>
      ) : editCourse ? (
        <form className="panel panel-pad studio-form" action={saveCourseCard}>
          <h2>Edit Course AI card</h2>
          <input type="hidden" name="courseId" value={courseId} />
          <CardFieldEditor kind="course" rows={courseRows} values={courseValues} savedLayout={card.layout} />
          <div className="form-actions"><button className="button primary" type="submit">Save course card</button>
            <Link className="button" href={`/courses/${courseId}/studio`}>Cancel</Link></div>
        </form>
      ) : (
        <div className="panel panel-pad studio-chooser"><h2>Choose a card to edit</h2>
          <p>Select an existing card above, or create an assignment card. The Course AI card opens only when you choose to edit it.</p>
        </div>
      )}
    </div>
  );
}

function StatusForm({ courseId, id, status, label }: {
  courseId: string; id: string; status: AssignmentCard["status"]; label: string;
}) {
  return <form action={setAssignmentStatus} className="inline-form">
    <input type="hidden" name="courseId" value={courseId} />
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="status" value={status} />
    <button className="button small" type="submit">{label}</button>
  </form>;
}
