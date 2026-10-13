import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("account and anonymous content schemas remain in separate databases", async () => {
  const identity = new PGlite();
  const content = new PGlite();
  try {
    await identity.exec(readFileSync(new URL("../db/001-accounts-and-courses.sql", import.meta.url), "utf8"));
    await identity.exec(readFileSync(new URL("../db/003-assignment-cards-and-participation.sql", import.meta.url), "utf8"));
    await content.exec(readFileSync(new URL("../db/002-content.sql", import.meta.url), "utf8"));
    await identity.query(
      'insert into public."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, false, now(), now())',
      ["person-1", "Person", "person@example.test"],
    );
    await identity.query("insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3)", ["person-1", "instructor", "private-key"]);
    await identity.query(
      "insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3) on conflict (user_id) do nothing",
      ["person-1", "student", "different-key"],
    );
    const savedRole = await identity.query<{ role: string }>("select role from identity.profile where user_id = $1", ["person-1"]);
    assert.equal(savedRole.rows[0]?.role, "instructor");
    await identity.query("insert into identity.course (id, code, name, join_code, instructor_id) values ($1, $2, $3, $4, $5)",
      ["course-1", "SDS 210", "Test course", "ABCDEFGH", "person-1"]);
    await identity.query("insert into identity.membership (course_id, user_id) values ($1, $2)", ["course-1", "person-1"]);
    await identity.query("insert into identity.assignment_card (id, course_id, identifier, title) values ($1, $2, $3, $4)",
      ["card-1", "course-1", "essay", "Essay"]);
    await assert.rejects(identity.query("insert into identity.assignment_card (id, course_id, identifier, title) values ($1, $2, $3, $4)",
      ["card-2", "course-1", "essay", "Duplicate"]), /duplicate key/);
    await identity.query("insert into identity.participation (course_id, user_id, questions) values ($1, $2, 1)", ["course-1", "person-1"]);
    await assert.rejects(identity.query("update identity.participation set questions = -1 where course_id = 'course-1'"), /check constraint/);
    await assert.rejects(
      identity.query(
        'insert into public."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, false, now(), now())',
        ["person-2", "Another", "person@example.test"],
      ),
      /duplicate key/,
    );
    await content.query("insert into content.board (course_id, state) values ($1, $2::jsonb)", [
      "course-1",
      JSON.stringify({ questions: [{ id: "q1", courseId: "course-1", title: "Question", body: "Text", tag: "course" }], replies: [], votes: [] }),
    ]);
    const board = await content.query<{ state: unknown }>("select state from content.board where course_id = $1", ["course-1"]);
    assert.doesNotMatch(JSON.stringify(board.rows[0]), /person@example\.test|person-1|private-key/);
    await assert.rejects(content.query("select * from identity.profile"), /does not exist/);
    await assert.rejects(identity.query("select * from content.board"), /does not exist/);
  } finally {
    await identity.close();
    await content.close();
  }
});
