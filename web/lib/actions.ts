"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { currentAccount, signInOrCreate } from "@/lib/accounts";
import { createCourseForInstructor, joinCourseAsStudent, memberCourseForUser, saveCourseCardForInstructor, saveAssignmentCardForInstructor, setAssignmentStatusForInstructor, assignmentCardsForCourse, type AssignmentDetails } from "@/lib/app-store";
import { addQuestion, addReply, toggleVote } from "@/lib/content-model";
import { updateContent } from "@/lib/content-store";
import { database } from "@/lib/database";
import { voteToken, type Role } from "@/lib/identity-model";
import { addParticipation, setParticipationSharing } from "@/lib/participation-store";

export async function signIn(formData: FormData) {
  const role = formData.get("role");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const success = await signInOrCreate(email, password, role === "instructor" || role === "student" ? role as Role : undefined);
  if (!success) redirect("/sign-in?error=credentials");
  redirect("/");
}

export async function signOut() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

export async function createCourseAction(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  if (user.role !== "instructor") redirect("/");
  const ok = await createCourseForInstructor(user.id, String(formData.get("code") || ""), String(formData.get("name") || ""));
  redirect(ok ? "/" : "/?error=course");
}

export async function joinCourseAction(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  if (user.role !== "student") redirect("/");
  const ok = await joinCourseAsStudent(user.id, String(formData.get("code") || ""));
  redirect(ok ? "/" : "/?error=code");
}

export async function askQuestion(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const tag = String(formData.get("tag") || "course");
  if (tag !== "course" && !(await assignmentCardsForCourse(courseId)).some((item) => item.id === tag)) redirect("/");
  const saved = await updateContent(courseId, (state) => addQuestion(state, courseId, {
    title: String(formData.get("title") || ""), body: String(formData.get("body") || ""), tag,
  }));
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "questions");
  redirect(`/courses/${courseId}/conversation`);
}

export async function sendReply(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const questionId = String(formData.get("questionId") || "");
  const saved = await updateContent(courseId, (state) => {
    if (!state.questions.some((item) => item.id === questionId && item.courseId === courseId)) return null;
    return addReply(state, questionId, user.role === "instructor" ? "Instructor" : "Student", String(formData.get("reply") || ""));
  });
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "comments");
  redirect(`/courses/${courseId}/conversation`);
}

export async function castVote(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const questionId = String(formData.get("questionId") || "");
  const result = await database().query<{ vote_key: string }>("select vote_key from identity.profile where user_id = $1", [user.id]);
  if (!result.rows[0]) redirect("/");
  const token = voteToken(result.rows[0].vote_key, questionId);
  let delta = 0;
  const saved = await updateContent(courseId, (state) => {
    delta = state.votes.some((vote) => vote.questionId === questionId && vote.token === token) ? -1 : 1;
    return toggleVote(state, questionId, token);
  });
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "upvotes", delta);
  redirect(`/courses/${courseId}/conversation`);
}

export async function saveCourseCard(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (user.role !== "instructor") redirect("/");
  const ok = await saveCourseCardForInstructor(user.id, courseId, {
    summary: String(formData.get("summary") || ""),
    allowed: String(formData.get("allowed") || ""),
    notAllowed: String(formData.get("notAllowed") || ""),
    disclose: String(formData.get("disclose") || ""),
    opening: String(formData.get("opening") || ""),
    counts: String(formData.get("counts") || ""),
    permitted: String(formData.get("permitted") || ""),
    transparency: String(formData.get("transparency") || ""),
    suspected: String(formData.get("suspected") || ""),
    warning: String(formData.get("warning") || ""),
    resources: String(formData.get("resources") || ""),
  });
  redirect(ok ? `/courses/${courseId}/guidance` : "/");
}

export async function saveAssignmentCard(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (user.role !== "instructor") redirect("/");
  const details = Object.fromEntries(
    (["due", "learning", "permitted", "allowed", "notAllowed", "disclose", "discloseNot", "processRequested", "processNot", "bonusPercent", "bonusRequirements", "resources", "other", "learn", "opening"] as const)
      .map((key) => [key, String(formData.get(key) || "")]),
  ) as AssignmentDetails;
  const id = String(formData.get("id") || "") || undefined;
  try {
    const ok = await saveAssignmentCardForInstructor(
      user.id, courseId, id, String(formData.get("identifier") || ""), String(formData.get("title") || ""), details,
    );
    redirect(ok ? `/courses/${courseId}/studio` : `/courses/${courseId}/studio?error=card`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect(`/courses/${courseId}/studio?error=duplicate`);
    throw error;
  }
}

export async function setAssignmentStatus(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (user.role !== "instructor") redirect("/");
  const status = String(formData.get("status") || "");
  if (status !== "draft" && status !== "published" && status !== "archived") redirect("/");
  const ok = await setAssignmentStatusForInstructor(user.id, courseId, String(formData.get("id") || ""), status);
  redirect(ok ? `/courses/${courseId}/studio` : "/");
}

export async function changeParticipationSharing(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (user.role !== "student") redirect("/");
  const shared = formData.get("shared") === "true";
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  await setParticipationSharing(user.id, courseId, shared);
  redirect(`/courses/${courseId}/participation`);
}
