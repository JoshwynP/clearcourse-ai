import { notFound, redirect } from "next/navigation";
import { CourseStudio } from "@/components/course-studio";
import { SignedInShell } from "@/components/signed-in-shell";
import { assignmentCardsForCourse, courseStaffRole, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function StudioPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ card?: string; error?: string }> }) {
  const { courseId } = await params;
  const { card, error } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course || !await courseStaffRole(user.id, courseId)) notFound();

  return (
    <SignedInShell courseId={courseId} view="studio">
      <CourseStudio courseId={course.id} card={course.card} assignments={await assignmentCardsForCourse(courseId, true)} selectedId={card} error={error} />
    </SignedInShell>
  );
}
