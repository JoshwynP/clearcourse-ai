import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseConversation } from "../components/course-conversation";
import { CourseGuidance } from "../components/course-guidance";
import { CourseStudio } from "../components/course-studio";
import { normalizeCardLayout, parseCardLayout } from "../lib/card-layout";
import { emptyCard } from "../lib/identity-model";
import type { AssignmentCard } from "../lib/app-store";

test("Manage My Cards opens as a chooser, with the course editor opened explicitly", () => {
  const card = emptyCard();
  const chooser = renderToStaticMarkup(<CourseStudio courseId="c1" card={card} assignments={[]} />);
  assert.match(chooser, /Choose a card to edit/);
  assert.match(chooser, /studio\?card=course/);
  assert.doesNotMatch(chooser, /Save course card/);
  const editor = renderToStaticMarkup(<CourseStudio courseId="c1" card={card} assignments={[]} selectedId="course" />);
  assert.match(editor, /Save course card/);
  assert.match(editor, /Preview new card/);
  assert.match(editor, /Accessibility and Equity Considerations/);
  assert.match(editor, /making AI use permitted but optional/);
  assert.doesNotMatch(editor, /View saved card/);
  assert.match(editor, /Add custom field/);
  assert.match(editor, /Hide field/);
  assert.doesNotMatch(chooser, /Accessibility and Equity Considerations/);
});

test("card layout accepts known hidden fields and valid custom fields only", () => {
  const allowed = ["opening", "summary"];
  const raw = JSON.stringify({ hiddenFields: ["summary"], customFields: [{ id: "x1", label: "Office hours", value: "Ask before using AI" }] });
  assert.deepEqual(parseCardLayout(raw, allowed), {
    hiddenFields: ["summary"], customFields: [{ id: "x1", label: "Office hours", value: "Ask before using AI" }],
  });
  assert.equal(parseCardLayout(JSON.stringify({ hiddenFields: ["unknown"], customFields: [] }), allowed), null);
  assert.deepEqual(normalizeCardLayout(undefined, allowed), { hiddenFields: [], customFields: [] });
});

test("hidden default text stays off the student card while custom fields appear", () => {
  const card = {
    ...emptyCard(), summary: "Private hidden draft text", allowed: "Use AI for outlines",
    layout: { hiddenFields: ["summary"], customFields: [{ id: "x1", label: "Office hours", value: "Tuesday" }] },
  };
  const html = renderToStaticMarkup(<CourseGuidance code="C1" name="Course" courseId="c1" card={card} assignments={[]} />);
  assert.doesNotMatch(html, /Private hidden draft text/);
  assert.doesNotMatch(html, /General course guidance/);
  assert.match(html, /Office hours/);
  assert.match(html, /Tuesday/);
  assert.match(html, /Use AI for outlines/);
});

test("assignment cards use their own hidden and custom field layout", () => {
  const assignment: AssignmentCard = {
    id: "a1", courseId: "c1", identifier: "essay-1", title: "Research essay", status: "published", updatedAt: new Date(),
    details: {
      opening: "", due: "Hidden deadline", learning: "Assess research", permitted: "Yes", allowed: "", notAllowed: "",
      disclose: "", discloseNot: "", processRequested: "", processNot: "", bonusPercent: "",
      bonusRequirements: "", resources: "", other: "", learn: "",
      layout: { hiddenFields: ["due"], customFields: [{ id: "c1", label: "Office hours", value: "Thursday" }] },
    },
  };
  const html = renderToStaticMarkup(<CourseGuidance code="C1" name="Course" courseId="c1"
    card={emptyCard()} assignments={[assignment]} selectedId="a1" />);
  assert.doesNotMatch(html, /Hidden deadline/);
  assert.match(html, /Office hours/);
  assert.match(html, /Thursday/);
  assert.match(html, /Assess research/);
});

test("archived cards sit below the AI cards list and can be unarchived", () => {
  const published = assignment("a1", "published", "Live essay");
  const archived = assignment("a2", "archived", "Old essay");
  const studio = renderToStaticMarkup(<CourseStudio courseId="c1" card={emptyCard()} assignments={[published, archived]} />);
  assert.ok(studio.indexOf("Live essay") < studio.indexOf("Archived cards"));
  assert.ok(studio.indexOf("Archived cards") < studio.indexOf("Old essay"));
  assert.match(studio, /Unarchive/);
  const guidance = renderToStaticMarkup(<CourseGuidance code="C1" name="Course" courseId="c1" card={emptyCard()}
    assignments={[published, archived]} canManage showBack selectedId="a2" />);
  assert.ok(guidance.indexOf("Live essay") < guidance.indexOf("Archived cards"));
  assert.ok(guidance.indexOf("Archived cards") < guidance.indexOf("Old essay"));
  assert.match(guidance, /Unarchive/);
  assert.match(guidance, /href="\/courses\/c1\/studio\?card=a2"/);
  assert.match(guidance, />Back</);
});

test("question details use optional placeholder text", () => {
  const html = renderToStaticMarkup(<CourseConversation courseId="c1" questions={[]} summary="" assignments={[]} />);
  assert.match(html, /placeholder="Include more context here \(optional\)"/);
});

function assignment(id: string, status: AssignmentCard["status"], title: string): AssignmentCard {
  return {
    id, courseId: "c1", identifier: id, title, status, updatedAt: new Date(),
    details: {
      opening: "", due: "", learning: "", permitted: "Yes", allowed: "", notAllowed: "",
      disclose: "", discloseNot: "", processRequested: "", processNot: "", bonusPercent: "",
      bonusRequirements: "", resources: "", other: "", learn: "",
    },
  };
}
