import { saveCourseCard } from "@/lib/actions";
import type { CardFields } from "@/lib/identity-model";

export function CourseStudio({ courseId, card }: { courseId: string; card: CardFields }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Instructor studio</h1>
          <p className="page-subtitle">This text is the course card students read. It does not set itself.</p>
        </div>
      </div>
      <form className="panel panel-pad composer" action={saveCourseCard}>
        <input type="hidden" name="courseId" value={courseId} />
        <label htmlFor="summary">Course summary</label>
        <textarea className="field" id="summary" name="summary" defaultValue={card.summary} maxLength={1000} />
        <label htmlFor="allowed">Generally allowed</label>
        <textarea className="field" id="allowed" name="allowed" defaultValue={card.allowed} maxLength={2000} />
        <label htmlFor="notAllowed">Generally prohibited</label>
        <textarea className="field" id="notAllowed" name="notAllowed" defaultValue={card.notAllowed} maxLength={2000} />
        <label htmlFor="disclose">Disclosure</label>
        <textarea className="field" id="disclose" name="disclose" defaultValue={card.disclose} maxLength={2000} />
        <button className="button primary" type="submit">
          Save course card
        </button>
      </form>
    </div>
  );
}
