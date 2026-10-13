import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignedInShell } from "@/components/signed-in-shell";
import { assignmentCardsForCourse, courseStaffRole, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const staff = await courseStaffRole(user.id, courseId);
  const teaching = Boolean(staff);
  const assignments = await assignmentCardsForCourse(courseId, teaching);

  return (
    <SignedInShell courseId={courseId} view="home">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{course.code}</h1>
            <p className="page-subtitle">{course.name}</p>
          </div>
        </div>
        {teaching ? (
          <p>
            Students join with this code: <strong>{course.joinCode}</strong>
          </p>
        ) : null}
        {course.card.summary ? <p className="lead">{course.card.summary}</p> : null}
        <ul className="part-list">
          <li>
            <Link href={`/courses/${course.id}/conversation`}>Discussion board</Link>
          </li>
          <li>
            <Link href={`/courses/${course.id}/guidance`}>AI cards</Link>
          </li>
          {staff !== "ta" ? <li>
            <Link href={`/courses/${course.id}/participation`}>{teaching ? "Class participation" : "My participation"}</Link>
          </li> : null}
          {teaching ? (
            <li>
              <Link href={`/courses/${course.id}/studio`}>Manage My Cards</Link>
            </li>
          ) : null}
          {teaching ? <li><Link href={`/courses/${course.id}/studio?card=new`}>Create an assignment card</Link></li> : null}
          {staff === "owner" ? <li><Link href={`/courses/${course.id}/settings`}>Course settings</Link></li> : null}
        </ul>
        <h2 className="section-heading">Assignments</h2>
        {assignments.length ? <ul className="part-list">
          {assignments.map((item) => <li key={item.id}><Link href={`/courses/${courseId}/guidance?card=${item.id}`}>
            <strong>{item.title}</strong><small>{item.status === "draft" ? "Private draft · " : item.status === "archived" ? "Archived · " : ""}{item.details.due ? `Due ${item.details.due}` : "View AI card"}</small>
          </Link></li>)}
        </ul> : <p>{teaching ? "No assignment cards yet. Create one in Manage My Cards." : "No assignment cards published yet."}</p>}
      </div>
    </SignedInShell>
  );
}
