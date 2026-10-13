import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignedInShell } from "@/components/signed-in-shell";
import { memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const teaching = course.instructorId === user.id;

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
        <ul className="part-list">
          <li>
            <Link href={`/courses/${course.id}/conversation`}>Conversation</Link>
          </li>
          <li>
            <Link href={`/courses/${course.id}/guidance`}>AI guidance</Link>
          </li>
          {teaching ? (
            <li>
              <Link href={`/courses/${course.id}/studio`}>Instructor studio</Link>
            </li>
          ) : null}
        </ul>
      </div>
    </SignedInShell>
  );
}
