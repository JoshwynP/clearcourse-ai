import { notFound, redirect } from "next/navigation";
import { CourseConversation } from "@/components/course-conversation";
import { SignedInShell } from "@/components/signed-in-shell";
import { listedQuestions } from "@/lib/content-model";
import { readContent } from "@/lib/content-store";
import { memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";
import { database } from "@/lib/database";
import { voteToken } from "@/lib/identity-model";

export default async function ConversationPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const profile = await database().query<{ vote_key: string }>("select vote_key from identity.profile where user_id = $1", [user.id]);
  const questions = listedQuestions(await readContent(courseId), courseId, (questionId) => voteToken(profile.rows[0].vote_key, questionId));

  return (
    <SignedInShell courseId={courseId} view="conversation">
      <CourseConversation courseId={courseId} questions={questions} summary={course.card.summary} />
    </SignedInShell>
  );
}
