import Link from "next/link";
import { COURSE_PRINCIPLE, ASSIGNMENT_PRINCIPLE, policyLinks } from "@/lib/sample-courses";
import { assignmentEditableKeys, assignmentRows, courseEditableKeys, courseRows } from "@/lib/card-rows";
import { normalizeCardLayout } from "@/lib/card-layout";
import type { AssignmentCard } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

export function CourseGuidance({ code, name, courseId, card, assignments, selectedId }: {
  code: string; name: string; courseId: string; card: CardFields;
  assignments: AssignmentCard[]; selectedId?: string;
}) {
  const selected = assignments.find((item) => item.id === selectedId);
  const selectedTitle = selected?.title ?? "Course AI card";
  const courseLayout = normalizeCardLayout(card.layout, courseEditableKeys);
  const selectedLayout = selected ? normalizeCardLayout(selected.details.layout, assignmentEditableKeys) : courseLayout;
  return (
    <div className="page">
      <div className="page-head"><div><h1>AI cards</h1><p className="page-subtitle">{code} | {name}</p></div></div>
      <div className="card-layout">
        <nav className="panel card-list" aria-label="Choose an AI card">
          <Link className={`card-choice ${selected ? "" : "active"}`} href={`/courses/${courseId}/guidance`} aria-current={selected ? undefined : "page"}>
            <strong>Course AI card</strong><small>Course guidance</small>
          </Link>
          {assignments.map((item) => (
            <Link className={`card-choice ${selected?.id === item.id ? "active" : ""}`} key={item.id}
              href={`/courses/${courseId}/guidance?card=${item.id}`} aria-current={selected?.id === item.id ? "page" : undefined}>
              <strong>{item.title}</strong><small>{item.status === "published" ? "Assignment card" : item.status === "draft" ? "Private draft" : "Archived"}</small>
            </Link>
          ))}
        </nav>
        <article className="panel panel-pad guidance-card">
          <h2>{selectedTitle}</h2>
          {selected && selected.status !== "published" ? <p className="notice">This card is {selected.status === "draft" ? "a private draft" : "archived"}. Students cannot see it.</p> : null}
          {!selectedLayout.hiddenFields.includes("opening") && (selected?.details.opening ?? card.opening)
            ? <p className="callout">{selected?.details.opening ?? card.opening}</p> : null}
          <table className="card-table"><caption className="sr-only">{selectedTitle}</caption><tbody>
            {selected
              ? assignmentRows.filter(([, key]) => !selectedLayout.hiddenFields.includes(key)).map(([label, key]) => (
                <tr key={key}><th scope="row">{label}</th><td>
                  {key === "learn" && /^https:\/\/\S+$/.test(selected.details.learn)
                    ? <a href={selected.details.learn} target="_blank" rel="noopener noreferrer">Open in LEARN</a>
                    : selected.details[key] || "Not applicable"}
                  {(key === "allowed" || key === "notAllowed" || key === "disclose") && selected.details[key] && selected.details[key] !== card[key]
                    ? <span className="override-note">Overrides the course card</span> : null}
                </td></tr>
              ))
              : courseRows.filter(([, key]) => !courseLayout.hiddenFields.includes(key)).map(([label, key]) => <tr key={key}><th scope="row">{label}</th><td>{card[key] || "Not specified yet"}</td></tr>)}
            {selectedLayout.customFields.map((field) => <tr key={field.id}><th scope="row">{field.label}</th><td>{field.value || "Not specified yet"}</td></tr>)}
          </tbody></table>
          {selected ? (selected.details.permitted.toLowerCase() !== "no" ? <p className="callout">{ASSIGNMENT_PRINCIPLE}</p> : null)
            : <p className="callout">{COURSE_PRINCIPLE}</p>}
          <div className="guidance-section"><h3>University policy links</h3><ul>
            {policyLinks.map((link) => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}
          </ul></div>
          <div className="guidance-section"><h3>Questions about this card?</h3>
            <p>Bring it into the discussion board so everyone can see the clarification.</p>
            <Link className="button" href={`/courses/${courseId}/conversation${selected ? `?tag=${selected.id}` : ""}`}>Ask about this {selected ? "assignment" : "course"}</Link>
          </div>
        </article>
      </div>
    </div>
  );
}
