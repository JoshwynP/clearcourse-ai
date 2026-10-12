import { notFound, redirect } from "next/navigation";
import { CourseGuidance } from "@/components/course-guidance";
import { SignedInShell } from "@/components/signed-in-shell";
import { memberCourse } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";
import { currentUser } from "@/lib/session";

export default async function GuidancePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const course = memberCourse(readIdentity(), user.id, courseId);
  if (!course) notFound();

  return (
    <SignedInShell courseId={courseId} view="guidance">
      <CourseGuidance code={course.code} name={course.name} card={course.card} />
    </SignedInShell>
  );
}
