import { notFound, redirect } from "next/navigation";
import { CourseGuidance } from "@/components/course-guidance";
import { SignedInShell } from "@/components/signed-in-shell";
import { memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function GuidancePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();

  return (
    <SignedInShell courseId={courseId} view="guidance">
      <CourseGuidance code={course.code} name={course.name} card={course.card} />
    </SignedInShell>
  );
}
