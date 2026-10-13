import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "../components/app-shell";
import { ConversationScreen } from "../components/conversation-screen";
import { CourseHome } from "../components/course-home";
import { CourseList } from "../components/course-list";
import { GuidancePanel } from "../components/guidance-panel";
import { SampleSessionProvider } from "../components/sample-session-provider";
import {
  ASSIGNMENT_PRINCIPLE,
  COURSE_PRINCIPLE,
  courses,
  getCourse,
  policyLinks,
} from "../lib/sample-courses";
import { addQuestion, initialSession, saveDraft, toggleVote } from "../lib/sample-session";

const allowedColors = new Set([
  "#000000",
  "#ffffff",
  "#dfdfdf",
  "#a2a2a2",
  "#f2eda8",
  "#fae100",
  "#fed34c",
  "#eaab00",
]);

test("course list names each course and opens its home", () => {
  const html = renderToStaticMarkup(<CourseList />);
  assert.match(html, /<h1>Courses<\/h1>/);
  assert.doesNotMatch(html, /course-icon/);
  for (const course of courses) {
    assert.match(html, new RegExp(`href="/courses/${course.id}"`));
    assert.match(html, new RegExp(course.code));
    assert.ok(html.includes(course.name.replaceAll("&", "&amp;")));
  }
});

test("course shell nests the open course's sections under that course", () => {
  const course = getCourse("sds");
  assert.ok(course);
  const html = renderToStaticMarkup(
    <AppShell course={course} courses={courses} view="conversation">
      <p>Sample</p>
    </AppShell>,
  );
  assert.doesNotMatch(html, /course-icon/);
  assert.ok(html.indexOf('href="/"') >= 0);
  assert.match(html, /src="\/uwaterloo-shield.svg"/);
  assert.match(html, />UW</);
  assert.match(html, /Independent website made by students/);
  assert.doesNotMatch(html, /University of Waterloo/);
  assert.match(html, /class="colour-bar"/);
  assert.match(html, /<strong>ClearCourse<\/strong>/);
  assert.ok(html.indexOf('href="/courses/sds"') < html.indexOf('href="/courses/sds/conversation"'));
  assert.ok(html.indexOf('href="/courses/sds/conversation"') < html.indexOf('href="/courses/sds/guidance"'));
  assert.ok(html.indexOf('href="/courses/sds/guidance"') < html.indexOf('href="/courses/sds/studio"'));
  assert.match(html, /href="\/courses\/engl"/);
  assert.doesNotMatch(html, /href="\/courses\/engl\/conversation"/);
  const current = html.match(/<a[^>]*href="\/courses\/sds\/conversation"[^>]*>/);
  assert.ok(current);
  assert.match(current[0], /aria-current="page"/);
  assert.match(html, /Discussion board/);
  assert.match(html, /AI cards/);
  assert.match(html, /Class participation/);
  assert.match(html, /Manage My Cards/);
});

test("course home links to the conversation, guidance, and assignments", () => {
  const course = getCourse("sds");
  assert.ok(course);
  const html = renderToStaticMarkup(<CourseHome course={course} />);
  assert.match(html, new RegExp(escapeRegExp(course.card.summary)));
  assert.match(html, /href="\/courses\/sds\/conversation"/);
  assert.match(html, /href="\/courses\/sds\/guidance"/);
  assert.match(html, /href="\/courses\/sds\/studio"/);
  assert.match(html, /href="\/courses\/sds\/guidance\?card=essay"/);
  assert.match(html, /Critical response essay/);
  assert.doesNotMatch(html, /anonymous/i);
});

test("guidance shows the assignment rule and the required principles", () => {
  const course = getCourse("sds");
  assert.ok(course);
  const assignment = course.assignments[0];
  const html = renderToStaticMarkup(
    <GuidancePanel course={course} cardId={assignment.id} text={assignment} />,
  );
  assert.match(html, /Assignment rule/);
  assert.match(html, new RegExp(escapeRegExp(assignment.difference)));
  assert.match(html, new RegExp(escapeRegExp(ASSIGNMENT_PRINCIPLE)));
  assert.doesNotMatch(html, /anonymous/i);
  for (const link of policyLinks) {
    assert.match(html, new RegExp(`href="${link.href}"`));
  }

  const courseHtml = renderToStaticMarkup(
    <GuidancePanel course={course} cardId="course" text={course.card} />,
  );
  assert.match(courseHtml, new RegExp(escapeRegExp(COURSE_PRINCIPLE)));
  assert.match(courseHtml, /Published example/);
});

test("conversation lists course and assignment questions for this sample", () => {
  const course = getCourse("sds");
  assert.ok(course);
  const html = renderToStaticMarkup(
    <SampleSessionProvider>
      <ConversationScreen course={course} />
    </SampleSessionProvider>,
  );
  assert.match(html, /All questions/);
  assert.match(html, />Course</);
  assert.match(html, /Critical response essay/);
  assert.match(html, /Can I use AI to help narrow down my essay topic/);
  assert.match(html, /Ask a question/);
  assert.doesNotMatch(html, /Add to this sample/);
  assert.doesNotMatch(html, /class="vote"/);
  assert.doesNotMatch(html, /anonymous/i);
  assert.equal(getCourse("missing"), undefined);
});

test("sample session keeps questions and card edits until reset", () => {
  const course = getCourse("engl");
  assert.ok(course);
  let state = initialSession();
  state = addQuestion(state, course, { tag: "general", title: "A third tag", body: "" });
  assert.equal(state.questions.engl.length, course.questions.length);
  state = addQuestion(state, course, { tag: "narrative", title: "May I compare two outlines?", body: "" });
  assert.equal(state.questions.engl[0]?.title, "May I compare two outlines?");
  const added = state.questions.engl[0];
  assert.ok(added);
  state = toggleVote(state, "engl", added.id);
  assert.equal(state.questions.engl[0]?.votes, 1);
  state = saveDraft(state, "engl", "course", {
    allowed: "Ask about structure.",
    notAllowed: "Do not submit generated prose.",
    disclose: "Add a short note.",
  });
  assert.equal(state.drafts.engl?.course?.allowed, "Ask about structure.");
});

test("the stylesheet uses the University of Waterloo black, white, grey, and gold palette", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const colors = css.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
  assert.ok(colors.length > 0);
  for (const color of colors) {
    assert.ok(allowedColors.has(color.toLowerCase()), color);
  }
  assert.ok(contrast("#000000", "#ffffff") >= 4.5);
  assert.ok(contrast("#000000", "#dfdfdf") >= 4.5);
  assert.ok(contrast("#000000", "#f2eda8") >= 4.5);
  assert.ok(contrast("#000000", "#eaab00") >= 4.5);
  assert.ok(contrast("#ffffff", "#000000") >= 4.5);
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
