import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/lib/actions";
import { coursesFor, memberCourse } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";
import { currentUser } from "@/lib/session";

export async function SignedInShell({
  courseId,
  view,
  children,
}: {
  courseId?: string;
  view?: "home" | "conversation" | "guidance" | "studio";
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const identity = readIdentity();
  const course = courseId ? memberCourse(identity, user.id, courseId) : undefined;
  if (courseId && !course) notFound();
  if (view === "studio" && course?.instructorId !== user.id) notFound();

  return (
    <AppShell
      courses={coursesFor(identity, user.id)}
      course={course}
      view={view}
      studio={Boolean(course && course.instructorId === user.id)}
      footer={
        <>
          {user.name}
          <small>{user.role === "instructor" ? "Professor" : "Student"}</small>
          <form action={signOut}>
            <button className="text-action" type="submit">
              Sign out
            </button>
          </form>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
