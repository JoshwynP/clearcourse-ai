import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("account and anonymous content schemas remain in separate databases", async () => {
  const identity = new PGlite();
  const content = new PGlite();
  try {
    await identity.exec(readFileSync(new URL("../db/001-accounts-and-courses.sql", import.meta.url), "utf8"));
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
