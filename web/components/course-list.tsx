import Link from "next/link";
import { courses } from "@/lib/sample-courses";

export function CourseList() {
  return (
    <div className="page">
      <div>
        <h1>Courses</h1>
        <p className="page-subtitle">Sample courses. Open one to see the conversation and guidance.</p>
      </div>
      <ul className="course-list">
        {courses.map((course) => (
          <li key={course.id}>
            <Link href={`/courses/${course.id}`}>
              <strong>{course.code}</strong>
              <span className="course-name">{course.name}</span>
              <small>{course.term}</small>
              <p>{course.card.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
