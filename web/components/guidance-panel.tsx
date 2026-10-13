import Link from "next/link";
import {
  ASSIGNMENT_PRINCIPLE,
  COURSE_PRINCIPLE,
  policyLinks,
  type Assignment,
  type CardText,
  type SampleCourse,
} from "@/lib/sample-courses";

export function GuidancePanel({
  course,
  cardId,
  text,
}: {
  course: SampleCourse;
  cardId: string;
  text: CardText;
}) {
  const assignment = course.assignments.find((item) => item.id === cardId);
  const selected = assignment ? assignment.id : "course";

  return (
    <div className="page">
      <h1>
        {course.code} | {course.name}
      </h1>
      <p className="page-subtitle">Sample guidance. Nothing here is published.</p>
      <ul className="card-choices">
        <li>
          <CardChoice courseId={course.id} cardId="course" active={selected === "course"} title="Course AI guidance" detail="Applies across this course" />
        </li>
        {course.assignments.map((item) => (
          <li key={item.id}>
            <CardChoice
              courseId={course.id}
              cardId={item.id}
              active={selected === item.id}
              title={item.title}
              detail={`Due ${item.due}`}
            />
          </li>
        ))}
      </ul>
      {assignment ? (
        <AssignmentCard assignment={assignment} text={text} />
      ) : (
        <article className="panel guidance-card">
          <p className="section-caption">
            {course.card.status} | Updated {course.card.updated}
          </p>
          <h2>{course.card.title}</h2>
          <p className="lead">{course.card.summary}</p>
          <div className="callout">{COURSE_PRINCIPLE}</div>
          <RuleSections text={text} allowedLabel="Generally allowed" prohibitedLabel="Generally prohibited" />
          <PolicyLinks />
        </article>
      )}
    </div>
  );
}

function CardChoice({
  courseId,
  cardId,
  active,
  title,
  detail,
}: {
  courseId: string;
  cardId: string;
  active: boolean;
  title: string;
  detail: string;
}) {
  return (
    <Link
      className={active ? "active" : undefined}
      href={`/courses/${courseId}/guidance?card=${cardId}`}
      aria-current={active ? "page" : undefined}
    >
      <strong>{title}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function AssignmentCard({ assignment, text }: { assignment: Assignment; text: CardText }) {
  return (
    <article className="panel guidance-card">
      <p className="section-caption">
        {assignment.status} | Updated {assignment.updated}
      </p>
      <h2>{assignment.title}</h2>
      <p className="lead">
        Due {assignment.due} | {assignment.learning}
      </p>
      <div className="callout">{ASSIGNMENT_PRINCIPLE}</div>
      <section className="guidance-section">
        <h3>
          How this assignment differs <span className="rule-label">Assignment rule</span>
        </h3>
        <p>{assignment.difference}</p>
      </section>
      <RuleSections text={text} allowedLabel="When AI is allowed" prohibitedLabel="When AI is not allowed" />
      <section className="guidance-section">
        <h3>Submission</h3>
        <p>Assignments are submitted through your course learning system. This sample does not accept files.</p>
      </section>
      <PolicyLinks />
    </article>
  );
}

function RuleSections({
  text,
  allowedLabel,
  prohibitedLabel,
}: {
  text: CardText;
  allowedLabel: string;
  prohibitedLabel: string;
}) {
  return (
    <>
      <section className="guidance-section">
        <h3>{allowedLabel}</h3>
        <p>{text.allowed}</p>
      </section>
      <section className="guidance-section">
        <h3>{prohibitedLabel}</h3>
        <p>{text.notAllowed}</p>
      </section>
      <section className="guidance-section">
        <h3>Disclosure</h3>
        <p>{text.disclose}</p>
      </section>
    </>
  );
}

function PolicyLinks() {
  return (
    <section className="guidance-section">
      <h3>Institutional policy</h3>
      <ul>
        {policyLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
