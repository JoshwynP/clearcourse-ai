import Link from "next/link";
import { saveCourseCard, saveAssignmentCard, setAssignmentStatus } from "@/lib/actions";
import { assignmentRows, courseRows } from "@/lib/card-rows";
import type { AssignmentCard } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

export function CourseStudio({ courseId, card, assignments, selectedId, error }: {
  courseId: string; card: CardFields; assignments: AssignmentCard[]; selectedId?: string; error?: string;
}) {
  const selected = assignments.find((item) => item.id === selectedId);
  const newAssignment = selectedId === "new";
  return (
    <div className="page">
      <div className="page-head"><div><h1>Manage My Cards</h1>
        <p className="page-subtitle">Edit course and assignment guidance. You write the rules students see.</p>
      </div></div>
      {error ? <p className="notice" role="alert">{error === "duplicate" ? "That assignment identifier is already in use." : "Check the card title and identifier."}</p> : null}
      <section className="panel manage-panel" aria-label="Cards">
        <ul className="manage-list">
          <li className="manage-item"><div className="manage-copy"><strong>Course AI card</strong></div>
            <Link className="button small" href={`/courses/${courseId}/studio`}>Edit</Link></li>
          {assignments.map((item) => (
            <li className="manage-item" key={item.id}>
              <div className="manage-copy"><strong>{item.title}</strong><span className="status-tag">{item.status === "published" ? "Published" : item.status === "draft" ? "Private draft" : "Archived"}</span></div>
              <div className="manage-actions">
                <Link className="button small" href={`/courses/${courseId}/studio?card=${item.id}`}>Edit</Link>
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
          <p className="meta">Saved cards start as private drafts. Publish when the wording is ready.</p>
          <input type="hidden" name="courseId" value={courseId} />
          {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
          <div className="editor-meta">
            <div><label htmlFor="assignment-title">Assignment title</label><input className="field" id="assignment-title" name="title" required maxLength={120} defaultValue={selected?.title} /></div>
            <div><label htmlFor="identifier">Assignment identifier</label><input className="field" id="identifier" name="identifier" required maxLength={40} pattern="[A-Za-z0-9_-]+" defaultValue={selected?.identifier} /></div>
          </div>
          <div className="editor-opening"><label htmlFor="assignment-opening">Opening statement <span className="meta">(optional)</span></label>
            <textarea className="field" id="assignment-opening" name="opening" maxLength={2000} defaultValue={selected?.details.opening} /></div>
          <table className="card-table editor-table"><caption className="sr-only">Assignment AI card editor</caption><tbody>
            {assignmentRows.map(([label, key]) => <tr key={key}><th scope="row"><label htmlFor={`assignment-${key}`}>{label}</label></th>
              <td><textarea className="field" id={`assignment-${key}`} name={key} maxLength={2000} defaultValue={selected?.details[key]} /></td></tr>)}
          </tbody></table>
          <div className="form-actions"><button className="button primary" type="submit">Save card</button>
            {selected ? <Link className="button" href={`/courses/${courseId}/guidance?card=${selected.id}`}>View saved card</Link> : null}
          </div>
        </form>
      ) : (
        <form className="panel panel-pad studio-form" action={saveCourseCard}>
          <h2>Course AI card</h2>
          <input type="hidden" name="courseId" value={courseId} />
          <div className="editor-opening"><label htmlFor="course-opening">Opening statement <span className="meta">(optional)</span></label>
            <textarea className="field" id="course-opening" name="opening" defaultValue={card.opening ?? ""} maxLength={2000} /></div>
          <table className="card-table editor-table"><caption className="sr-only">Course AI card editor</caption><tbody>
            {courseRows.map(([label, key]) => <tr key={key}><th scope="row"><label htmlFor={`course-${key}`}>{label}</label></th>
              <td><textarea className="field" id={`course-${key}`} name={key} defaultValue={card[key] ?? ""} maxLength={key === "summary" ? 1000 : 2000} /></td></tr>)}
          </tbody></table>
          <button className="button primary" type="submit">Save course card</button>
        </form>
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
