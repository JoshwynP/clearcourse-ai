"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { currentAccount, signInOrCreate } from "@/lib/accounts";
import { createCourseForInstructor, joinCourseAsStudent, memberCourseForUser, saveCourseCardForInstructor } from "@/lib/app-store";
import { addQuestion, addReply, toggleVote } from "@/lib/content-model";
import { updateContent } from "@/lib/content-store";
import { database } from "@/lib/database";
import { voteToken, type Role } from "@/lib/identity-model";

export async function signIn(formData: FormData) {
  const role = formData.get("role");
  if (role !== "instructor" && role !== "student") redirect("/sign-in?error=role");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const success = await signInOrCreate(email, password, role as Role);
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
  await updateContent(courseId, (state) => addQuestion(state, courseId, {
    title: String(formData.get("title") || ""), body: String(formData.get("body") || ""),
  }));
  redirect(`/courses/${courseId}/conversation`);
}

export async function sendReply(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const questionId = String(formData.get("questionId") || "");
  await updateContent(courseId, (state) => {
    if (!state.questions.some((item) => item.id === questionId && item.courseId === courseId)) return null;
    return addReply(state, questionId, user.role === "instructor" ? "Instructor" : "Student", String(formData.get("reply") || ""));
  });
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
  await updateContent(courseId, (state) => toggleVote(state, questionId, token));
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
  });
  redirect(ok ? `/courses/${courseId}/guidance` : "/");
}
