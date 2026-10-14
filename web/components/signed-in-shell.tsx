import { notFound, redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { AppShell } from "@/components/app-shell";
import { courseStaffRole, coursesForUser, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export async function SignedInShell({
  courseId,
  view,
  account = false,
  children,
}: {
  courseId?: string;
  view?: "home" | "conversation" | "guidance" | "studio" | "participation" | "settings";
  account?: boolean;
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
      crumb={account ? "Account" : undefined}
      welcomeRole={user.role}
      needsWelcome={user.needsWelcome}
      footer={
        <AccountMenu
          name={user.name}
          roleLabel={staff === "ta" ? "Teaching assistant" : user.role === "instructor" ? "Professor" : "Student"}
          current={account}
        />
      }
    >
      {children}
    </AppShell>
  );
}
