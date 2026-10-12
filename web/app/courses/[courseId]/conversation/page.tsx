import { notFound, redirect } from "next/navigation";
import { CourseConversation } from "@/components/course-conversation";
import { SignedInShell } from "@/components/signed-in-shell";
import { listedQuestions } from "@/lib/content-model";
import { readContent } from "@/lib/content-store";
import { memberCourse, voteToken } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";
import { currentUser } from "@/lib/session";

export default async function ConversationPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const course = memberCourse(readIdentity(), user.id, courseId);
  if (!course) notFound();
  const questions = listedQuestions(readContent(), courseId, (questionId) => voteToken(user.voteKey, questionId));

  return (
    <SignedInShell courseId={courseId} view="conversation">
      <CourseConversation courseId={courseId} questions={questions} summary={course.card.summary} />
    </SignedInShell>
  );
}
