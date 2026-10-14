import { prepareTermReminder } from "@/lib/actions";

export function TermReminder({ courseId, joinCode }: { courseId: string; joinCode: string }) {
  return (
    <section className="panel panel-pad settings-panel">
      <h2>Start of term</h2>
      <p>When the term begins, use this reminder to send students the link to join this course. Students join with the code <strong>{joinCode}</strong>.</p>
      <form className="term-reminder-form" action={prepareTermReminder}>
        <input type="hidden" name="courseId" value={courseId} />
        <button className="button primary" type="submit">Prepare student link reminder</button>
      </form>
      <p className="meta">This button does not send email or other messages.</p>
    </section>
  );
}
