import assert from "node:assert/strict";
import test from "node:test";
import { addQuestion, addReply, emptyContent, listedQuestions, toggleVote } from "../lib/content-model";
import { createCourse, emptyIdentity, joinCourse, memberCourse, signInAccount, voteToken } from "../lib/identity-model";

test("a question record cannot be joined back to a person", () => {
  let identity = emptyIdentity();
  const professor = signInAccount(identity, { name: "Ada Lovelace", role: "instructor" });
  assert.ok(professor);
  identity = professor.state;
  const instructor = identity.users[0];
  assert.ok(instructor);
  const withCourse = createCourse(identity, instructor.id, { code: "SDS 210", name: "Social data science" });
  assert.ok(withCourse);
  identity = withCourse;
  const course = identity.courses[0];
  assert.ok(course);
  assert.notEqual(course.joinCode, course.id);
  assert.equal(course.joinCode.length, 8);

  const studentSign = signInAccount(identity, { name: "Ada Lovelace", role: "student" });
  assert.ok(studentSign);
  identity = studentSign.state;
  assert.equal(identity.users.length, 2);
  const student = identity.users.find((user) => user.role === "student");
  assert.ok(student);
  assert.notEqual(student.id, instructor.id);
  assert.equal(createCourse(identity, student.id, { code: "ENGL 109", name: "Writing" }), null);
  assert.equal(joinCourse(identity, student.id, "NOPE"), null);
  assert.equal(memberCourse(identity, student.id, course.id), undefined);
  const joined = joinCourse(identity, student.id, course.joinCode.toLowerCase());
  assert.ok(joined);
  assert.ok(memberCourse(joined, student.id, course.id));

  const returning = signInAccount(joined, { name: "Ada Lovelace", role: "instructor" });
  assert.ok(returning);
  assert.equal(returning.state.users.length, 2);

  const asked = addQuestion(emptyContent(), course.id, { title: "Can I use AI for the outline?", body: "The card is unclear." });
  assert.ok(asked);
  const question = asked.questions[0];
  assert.ok(question);
  assert.notEqual(question.id, "1");
  const replied = addReply(asked, question.id, "Student", "Same question here.");
  assert.ok(replied);
  const studentToken = voteToken(student.voteKey, question.id);
  const instructorToken = voteToken(instructor.voteKey, question.id);
  assert.notEqual(studentToken, instructorToken);
  const once = toggleVote(replied, question.id, studentToken);
  assert.ok(once);
  const cancelled = toggleVote(once, question.id, studentToken);
  assert.ok(cancelled);
  assert.equal(cancelled.votes.length, 0);
  const both = toggleVote(toggleVote(replied, question.id, studentToken)!, question.id, instructorToken);
  assert.ok(both);
  assert.equal(both.votes.length, 2);

  const secrets = [student.id, instructor.id, student.name, instructor.name, student.voteKey, instructor.voteKey, professor.sessionId, studentSign.sessionId];
  assertNoIdentity(both, secrets);
  const listed = listedQuestions(both, course.id, (questionId) => voteToken(student.voteKey, questionId));
  assert.equal(listed[0]?.voted, true);
  assert.equal(listed[0]?.votes, 2);
  assert.equal(listed[0]?.replies[0]?.role, "Student");
  assertNoIdentity(listed, secrets);
});

function assertNoIdentity(value: unknown, secrets: string[]) {
  const bannedKeys = new Set(["userId", "name", "voteKey", "sessionId", "authorId", "author", "instructorId"]);
  walk(value);
  function walk(current: unknown) {
    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      assert.equal(bannedKeys.has(key), false, key);
      if (typeof item === "string") {
        for (const secret of secrets) assert.notEqual(item, secret);
      }
      walk(item);
    }
  }
}
