import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CardSetupQuiz } from "../components/card-setup-quiz";
import { CourseConversation } from "../components/course-conversation";
import { CourseStudio } from "../components/course-studio";
import { TermReminder } from "../components/term-reminder";
import { applySetupAnswers, examplesForQuestions, setupQuestions, SUGGESTED_OPENING } from "../lib/card-setup";
import { emptyCard } from "../lib/identity-model";
import { discussionBoards, similarDiscussions } from "../lib/similar-text";

const prompts = [
  "What learning is being assessed?",
  "Which work must students perform independently?",
  "Could AI assist without replacing that learning?",
  "Is AI permitted?",
  "At which stages?",
  "What is prohibited?",
  "What must be disclosed?",
  "What process evidence could support reflection?",
  "Is a transparency bonus offered?",
  "What is its value?",
  "What resources should students receive?",
  "What happens if inappropriate use is suspected?",
];

test("setup questions stay verbatim and answers copy into the named fields", () => {
  assert.deepEqual(setupQuestions.map((question) => question.prompt), prompts);
  const assignment = applySetupAnswers("assignment", { opening: "", learning: "Keep this until replaced", due: "Friday" }, {
    learning: "Assess the research essay",
    independent: "Write the analysis yourself",
    assist: "No",
    permitted: "Yes",
    stages: "Outlines only",
    prohibited: "Do not paste the final draft",
    disclose: "Name the tool",
    evidence: "Keep drafts",
    bonus: "Yes",
    bonusValue: "5",
    resources: "Library workshop",
    suspected: "Ask for drafts",
  });
  assert.equal(assignment.learning, "Assess the research essay");
  assert.equal(assignment.permitted, "Yes");
  assert.equal(assignment.notAllowed, "Write the analysis yourself\n\nDo not paste the final draft");
  assert.doesNotMatch(assignment.notAllowed, /Independent|Prohibited/);
  assert.equal(assignment.processRequested, "Keep drafts");
  assert.equal(assignment.other, "Ask for drafts");
  assert.equal(assignment.bonusPercent, "5");
  assert.equal(assignment.opening, SUGGESTED_OPENING);
  assert.equal(assignment.due, "Friday");
  assert.equal(assignment.assist, undefined);

  const kept = applySetupAnswers("assignment", { opening: "Custom opening", bonusPercent: "" }, { bonus: "No", bonusValue: "15", learning: "  " });
  assert.equal(kept.opening, "Custom opening");
  assert.equal(kept.bonusPercent, "");
  assert.equal(kept.learning, undefined);

  const course = applySetupAnswers("course", { summary: "Existing guidance" }, {
    learning: "",
    evidence: "Save version history",
    suspected: "Request drafts",
    bonus: "Yes",
    bonusValue: "10",
  });
  assert.equal(course.summary, "Existing guidance");
  assert.equal(course.transparency, "Save version history");
  assert.equal(course.suspected, "Request drafts");
  assert.equal(course.opening, SUGGESTED_OPENING);
  assert.equal(course.bonusPercent, undefined);
  assert.equal(course.learning, undefined);
});

test("similar questions omit course identity and leave the original question in place", () => {
  const rows = [{
    courseId: "course-secret",
    state: {
      questions: [
        { id: "q1", title: "Research essay citation", body: "How should we cite the research essay? unique-marker-current" },
        { id: "q3", title: "Citation format for the research essay", body: "Where does the research essay citation go?" },
      ],
      replies: [{ questionId: "q3", role: "Instructor", text: "Put the research essay citation in the bibliography." }],
      votes: [{ token: "secret-vote-token" }],
    },
  }, {
    courseId: "other-secret",
    state: {
      questions: [{ id: "q2", title: "Bibliography for the research essay", body: "Cite the research essay in the bibliography." }],
      replies: [{ questionId: "q2", role: "Student", text: "List the research essay sources." }],
    },
  }, {
    courseId: "third-secret",
    state: {
      questions: [{ id: "q4", title: "Parking passes for visitors", body: "Where are visitor parking passes collected?" }],
      replies: [],
    },
  }];
  const boards = discussionBoards(rows);
  const before = JSON.stringify(boards);
  const matches = similarDiscussions(boards, {
    courseId: "course-secret", questionId: "q1", title: "Research essay citation", body: "How should we cite the research essay? unique-marker-current",
  });
  assert.equal(JSON.stringify(boards), before);
  assert.equal(boards[0].questions.length, 2);
  const serialized = JSON.stringify(matches);
  assert.doesNotMatch(serialized, /course-secret|other-secret|third-secret|secret-vote-token|unique-marker-current|@/);
  assert.ok(matches.some((match) => match.sameCourse && match.title === "Citation format for the research essay"));
  assert.ok(matches.some((match) => !match.sameCourse && match.replies[0]?.role === "Student"));
  assert.ok(matches.every((match) => JSON.stringify(Object.keys(match).sort()) === JSON.stringify(["body", "replies", "sameCourse", "title"])));
  assert.doesNotMatch(serialized, /Parking passes/);
  assert.deepEqual(examplesForQuestions("course", { learning: ["Assess the research essay carefully"] }).learning, ["Assess the research essay carefully"]);
  assert.deepEqual(examplesForQuestions("course", { bonusPercent: ["5 percent"] }).bonusValue, []);
});

test("the reminder, setup quiz, and similar questions are visible and do not send or block", () => {
  const reminder = renderToStaticMarkup(<TermReminder courseId="c1" joinCode="JOINCODE" />);
  assert.match(reminder, /Start of term/);
  assert.match(reminder, /Prepare student link reminder/);
  assert.match(reminder, /JOINCODE/);
  assert.match(reminder, /This button does not send email or other messages/);
  const source = readFileSync(new URL("../lib/actions.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function prepareTermReminder");
  const reminderSource = source.slice(start, source.indexOf("export async function", start + 10));
  assert.doesNotMatch(reminderSource, /mail|smtp|resend|fetch\(/i);

  const quiz = renderToStaticMarkup(
    <CardSetupQuiz action={() => undefined} kind="course" courseId="c1" needsIdentity={false} title="" identifier="" examples={{ learning: ["Assess the research essay carefully"] }} />,
  );
  assert.match(quiz, /What learning is being assessed/);
  assert.match(quiz, /Fixed rule:/);
  assert.match(quiz, /Why this matters/);
  assert.match(quiz, /No similar answers yet/);
  assert.match(quiz, /These suggestions do not fill the card/);
  assert.match(quiz, /Fill card from these answers|Next/);

  const studio = renderToStaticMarkup(<CourseStudio courseId="c1" card={emptyCard()} assignments={[]} selectedId="course" />);
  assert.match(studio, /href="\/courses\/c1\/studio\/setup\?card=course"/);
  assert.match(studio, /Answer setup questions/);

  const board = renderToStaticMarkup(
    <CourseConversation courseId="c1" questions={[{
      id: "q1", tag: "course", title: "Research essay citation", body: "How should we cite it?", votes: 1, voted: false, replies: [],
    }]} summary="" assignments={[]} similar={{
      q1: [{ title: "Bibliography for the research essay", body: "Cite the research essay.", replies: [{ role: "Instructor", text: "Use the course citation guide." }], sameCourse: false }],
    }} />,
  );
  assert.match(board, /Similar questions/);
  assert.match(board, /Another course/);
  assert.match(board, /does not block this one/);
  assert.match(board, /Ask a question/);
  assert.doesNotMatch(board, /course-secret/);
});
