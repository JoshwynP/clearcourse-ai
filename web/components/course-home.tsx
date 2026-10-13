import Link from "next/link";
import type { SampleCourse } from "@/lib/sample-courses";

export function CourseHome({ course }: { course: SampleCourse }) {
  const questions = course.questions.length;
  const assignments = course.assignments.length;

  return (
    <div className="page">
      <h1>
        {course.code} | {course.name}
      </h1>
      <p className="page-subtitle">{course.term}</p>
      <p className="lead">{course.card.summary}</p>
      <ul className="part-list">
        <li>
          <Link href={`/courses/${course.id}/conversation`}>
            <strong>Conversation</strong>
            <small>
              {questions} sample {questions === 1 ? "question" : "questions"}
            </small>
          </Link>
        </li>
        <li>
          <Link href={`/courses/${course.id}/guidance`}>
            <strong>AI guidance</strong>
            <small>
              {assignments} {assignments === 1 ? "assignment" : "assignments"}
            </small>
          </Link>
        </li>
        <li>
          <Link href={`/courses/${course.id}/studio`}>
            <strong>Instructor preview</strong>
            <small>Manual editing preview</small>
          </Link>
        </li>
      </ul>
      <h2 className="section-heading">Assignments</h2>
      <ul className="part-list">
        {course.assignments.map((assignment) => (
          <li key={assignment.id}>
            <Link href={`/courses/${course.id}/guidance?card=${assignment.id}`}>
              <strong>{assignment.title}</strong>
              <small>Due {assignment.due}</small>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
