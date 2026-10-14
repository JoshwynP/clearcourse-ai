import { notFound, redirect } from "next/navigation";
import { CardSetupQuiz } from "@/components/card-setup-quiz";
import { SignedInShell } from "@/components/signed-in-shell";
import { applyCardSetup } from "@/lib/actions";
import { assignmentCardsForCourse, courseStaffRole, memberCourseForUser, publishedGuidanceExamples } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";
import { examplesForQuestions, type SetupKind } from "@/lib/card-setup";

export default async function CardSetupPage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ card?: string; error?: string }>;
}) {
  const { courseId } = await params;
  const { card, error } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course || !await courseStaffRole(user.id, courseId)) notFound();
  const kind: SetupKind = card === "course" ? "course" : "assignment";
  const assignments = kind === "assignment" ? await assignmentCardsForCourse(courseId, true) : [];
  const selected = card && card !== "new" && card !== "course" ? assignments.find((item) => item.id === card) : undefined;
  if (kind === "assignment" && card !== "new" && !selected) notFound();
  const examples = examplesForQuestions(kind, await publishedGuidanceExamples(courseId));
  const errors: Record<string, string> = {
    card: "Enter a title and an identifier made of letters, numbers, hyphens, or underscores.",
    duplicate: "That assignment identifier is already in use.",
  };

  return (
    <SignedInShell courseId={courseId} view="studio">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Set up this card</h1>
            <p className="page-subtitle">{kind === "course" ? "Course AI card" : selected?.title ?? "New assignment card"}</p>
          </div>
        </div>
        {error ? <p className="notice" role="alert">{errors[error] ?? "Could not save these answers."}</p> : null}
        <CardSetupQuiz
          action={applyCardSetup}
          kind={kind}
          courseId={courseId}
          cardId={selected?.id}
          needsIdentity={kind === "assignment" && !selected}
          title={selected?.title ?? ""}
          identifier={selected?.identifier ?? ""}
          examples={examples}
        />
      </div>
    </SignedInShell>
  );
}
