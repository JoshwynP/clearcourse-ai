import { notFound, redirect } from "next/navigation";
import { CourseGuidance } from "@/components/course-guidance";
import { SignedInShell } from "@/components/signed-in-shell";
import { assignmentCardsForCourse, courseStaffRole, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function GuidancePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ card?: string }> }) {
  const { courseId } = await params;
  const { card } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();

  return (
    <SignedInShell courseId={courseId} view="guidance">
      <CourseGuidance code={course.code} name={course.name} courseId={courseId} card={course.card}
        assignments={await assignmentCardsForCourse(courseId, Boolean(await courseStaffRole(user.id, courseId)))} selectedId={card} />
    </SignedInShell>
  );
}
