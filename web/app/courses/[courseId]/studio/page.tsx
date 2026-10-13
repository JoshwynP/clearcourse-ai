import { notFound, redirect } from "next/navigation";
import { CourseStudio } from "@/components/course-studio";
import { SignedInShell } from "@/components/signed-in-shell";
import { memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function StudioPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course || course.instructorId !== user.id) notFound();

  return (
    <SignedInShell courseId={courseId} view="studio">
      <CourseStudio courseId={course.id} card={course.card} />
    </SignedInShell>
  );
}
