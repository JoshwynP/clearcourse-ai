import { notFound, redirect } from "next/navigation";
import { CourseGuidance } from "@/components/course-guidance";
import { SignedInShell } from "@/components/signed-in-shell";
import { assignmentCardsForCourse, courseStaffRole, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function GuidancePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ card?: string; preview?: string }> }) {
  const { courseId } = await params;
  const { card, preview } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const staff = Boolean(await courseStaffRole(user.id, courseId));

  return (
    <SignedInShell courseId={courseId} view="guidance">
      <CourseGuidance code={course.code} name={course.name} courseId={courseId} card={course.card}
        assignments={await assignmentCardsForCourse(courseId, staff)} selectedId={card} canManage={staff} showBack={preview === "1" && staff} />
    </SignedInShell>
  );
}
