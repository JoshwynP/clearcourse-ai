import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/lib/actions";
import { coursesForUser, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export async function SignedInShell({
  courseId,
  view,
  children,
}: {
  courseId?: string;
  view?: "home" | "conversation" | "guidance" | "studio" | "participation";
  children: React.ReactNode;
}) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = courseId ? await memberCourseForUser(user.id, courseId) : undefined;
  if (courseId && !course) notFound();
  if (view === "studio" && course?.instructorId !== user.id) notFound();

  return (
    <AppShell
      courses={await coursesForUser(user.id)}
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
