import { notFound, redirect } from "next/navigation";
import { CourseStudio } from "@/components/course-studio";
import { SignedInShell } from "@/components/signed-in-shell";
import { memberCourse } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";
import { currentUser } from "@/lib/session";

export default async function StudioPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const course = memberCourse(readIdentity(), user.id, courseId);
  if (!course || course.instructorId !== user.id) notFound();

  return (
    <SignedInShell courseId={courseId} view="studio">
      <CourseStudio courseId={course.id} card={course.card} />
    </SignedInShell>
  );
}