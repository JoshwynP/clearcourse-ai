import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/lib/actions";
import { courseStaffRole, coursesForUser, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export async function SignedInShell({
  courseId,
  view,
  children,
}: {
  courseId?: string;
  view?: "home" | "conversation" | "guidance" | "studio" | "participation" | "settings";
  children: React.ReactNode;
}) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = courseId ? await memberCourseForUser(user.id, courseId) : undefined;
  if (courseId && !course) notFound();
  const staff = courseId ? await courseStaffRole(user.id, courseId) : null;
  if (view === "studio" && !staff) notFound();
  if (view === "settings" && staff !== "owner" && staff !== "professor") notFound();
  if (view === "participation" && staff === "ta") notFound();

  return (
    <AppShell
      courses={await coursesForUser(user.id)}
      course={course}
      view={view}
      studio={Boolean(staff)}
      owner={staff === "owner" || staff === "professor"}
      participation={staff !== "ta"}
      welcomeRole={user.role}
      needsWelcome={user.needsWelcome}
      footer={
        <>
          <div className="account-details"><strong className="account-name">{user.name}</strong>
          <span className="account-role">{staff === "ta" ? "Teaching assistant" : user.role === "instructor" ? "Professor" : "Student"}</span></div>
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
