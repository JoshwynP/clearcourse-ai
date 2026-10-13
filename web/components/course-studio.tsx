import Link from "next/link";
import { saveCourseCard, saveAssignmentCard, setAssignmentStatus } from "@/lib/actions";
import type { AssignmentCard, AssignmentDetails } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

const assignmentFields: [keyof AssignmentDetails, string][] = [
  ["due", "Due date"], ["learning", "Learning being assessed"],
  ["permitted", "Is AI permitted?"], ["allowed", "When AI is allowed"],
  ["notAllowed", "When AI is not allowed"], ["disclose", "When disclosure is required"],
  ["process", "Process evidence requested"], ["resources", "Resources"],
  ["learn", "LEARN submission link"], ["opening", "Opening statement (optional)"],
];

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
        <form className="panel panel-pad composer studio-form" action={saveAssignmentCard} key={selected?.id ?? "new"}>
          <h2>{selected ? `Edit ${selected.title}` : "New assignment card"}</h2>
          <p className="meta">Saved cards start as private drafts. Publish when the wording is ready.</p>
          <input type="hidden" name="courseId" value={courseId} />
          {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
          <label htmlFor="identifier">Assignment identifier</label>
          <input className="field" id="identifier" name="identifier" required maxLength={40} pattern="[A-Za-z0-9_-]+" defaultValue={selected?.identifier} />
          <label htmlFor="assignment-title">Assignment title</label>
          <input className="field" id="assignment-title" name="title" required maxLength={120} defaultValue={selected?.title} />
          {assignmentFields.map(([key, label]) => (
            <div className="form-row" key={key}><label htmlFor={key}>{label}</label>
              <textarea className="field" id={key} name={key} maxLength={2000} defaultValue={selected?.details[key]} /></div>
          ))}
          <div className="form-actions"><button className="button primary" type="submit">Save card</button>
            <Link className="button" href={`/courses/${courseId}/guidance${selected?.status === "published" ? `?card=${selected.id}` : ""}`}>View student cards</Link>
          </div>
        </form>
      ) : (
        <form className="panel panel-pad composer studio-form" action={saveCourseCard}>
          <h2>Course AI card</h2>
          <input type="hidden" name="courseId" value={courseId} />
          <label htmlFor="summary">Course summary</label>
          <textarea className="field" id="summary" name="summary" defaultValue={card.summary} maxLength={1000} />
          <label htmlFor="allowed">Generally allowed</label>
          <textarea className="field" id="allowed" name="allowed" defaultValue={card.allowed} maxLength={2000} />
          <label htmlFor="notAllowed">Generally prohibited</label>
          <textarea className="field" id="notAllowed" name="notAllowed" defaultValue={card.notAllowed} maxLength={2000} />
          <label htmlFor="disclose">Disclosure</label>
          <textarea className="field" id="disclose" name="disclose" defaultValue={card.disclose} maxLength={2000} />
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
