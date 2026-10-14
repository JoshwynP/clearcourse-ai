import { notFound, redirect } from "next/navigation";
import { CourseConversation } from "@/components/course-conversation";
import { SignedInShell } from "@/components/signed-in-shell";
import { listedQuestions } from "@/lib/content-model";
import { listContentBoards, readContent } from "@/lib/content-store";
import { discussionBoards, similarDiscussions } from "@/lib/similar-text";
import { assignmentCardsForCourse, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";
import { database } from "@/lib/database";
import { voteToken } from "@/lib/identity-model";
import { normalizeCardLayout } from "@/lib/card-layout";
import { courseEditableKeys } from "@/lib/card-rows";

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ tag?: string; q?: string }> }) {
  const { courseId } = await params;
  const { tag, q } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const profile = await database().query<{ vote_key: string }>("select vote_key from identity.profile where user_id = $1", [user.id]);
  const questions = listedQuestions(await readContent(courseId), courseId, (questionId) => voteToken(profile.rows[0].vote_key, questionId));
  const boards = discussionBoards(await listContentBoards());
  const similar = Object.fromEntries(questions.flatMap((question) => {
    const matches = similarDiscussions(boards, { courseId, questionId: question.id, title: question.title, body: question.body });
    return matches.length ? [[question.id, matches]] : [];
  }));
  const assignments = await assignmentCardsForCourse(courseId);

  return (
    <SignedInShell courseId={courseId} view="conversation">
      <CourseConversation courseId={courseId} questions={questions}
        summary={normalizeCardLayout(course.card.layout, courseEditableKeys).hiddenFields.includes("summary") ? "" : course.card.summary}
        assignments={assignments} tag={tag} query={q} similar={similar} />
    </SignedInShell>
  );
}
