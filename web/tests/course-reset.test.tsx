import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { applyIdentityReset } from "../lib/app-store";

test("a full course reset keeps the course and teaching team but clears selected term data", async () => {
  const db = new PGlite();
  try {
    for (const file of ["001-accounts-and-courses.sql", "003-assignment-cards-and-participation.sql", "004-course-staff.sql"]) {
      await db.exec(readFileSync(new URL(`../db/${file}`, import.meta.url), "utf8"));
    }
    for (const [id, role] of [["owner", "instructor"], ["student", "student"], ["ta", "student"]] as const) {
      await db.query('insert into public."user" (id, name, email, "createdAt", "updatedAt") values ($1, $1, $2, now(), now())', [id, `${id}@example.test`]);
      await db.query("insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3)", [id, role, `${id}-key`]);
    }
    await db.query("insert into identity.course (id, code, name, join_code, instructor_id, card) values ('c1', 'DEMO 210', 'Course', 'OLDCODE', 'owner', '{\"summary\":\"Old rule\"}')");
    for (const id of ["owner", "student", "ta"]) await db.query("insert into identity.membership (course_id, user_id) values ('c1', $1)", [id]);
    await db.query("insert into identity.course_staff (course_id, user_id, role) values ('c1', 'ta', 'ta')");
    await db.query("insert into identity.assignment_card (id, course_id, identifier, title) values ('a1', 'c1', 'essay', 'Essay')");
    await db.query("insert into identity.participation (course_id, user_id, questions) values ('c1', 'student', 2)");

    await applyIdentityReset(db as unknown as Parameters<typeof applyIdentityReset>[0], "c1",
      { discussion: false, students: false, assignments: false, courseCard: true }, "UNUSED");
    const preserved = await db.query<{ join_code: string }>("select join_code from identity.course where id = 'c1'");
    assert.equal(preserved.rows[0]?.join_code, "OLDCODE");
    assert.equal((await db.query("select 1 from identity.membership where course_id = 'c1' and user_id = 'student'")).rowCount, 1);
    assert.equal((await db.query("select 1 from identity.assignment_card where course_id = 'c1'")).rowCount, 1);
    assert.equal((await db.query("select 1 from identity.participation where course_id = 'c1'")).rowCount, 1);

    await applyIdentityReset(db as unknown as Parameters<typeof applyIdentityReset>[0], "c1",
      { discussion: true, students: true, assignments: true, courseCard: true }, "NEWCODE12345");

    const course = await db.query<{ code: string; join_code: string; card: object }>("select code, join_code, card from identity.course where id = 'c1'");
    assert.equal(course.rows[0]?.code, "DEMO 210");
    assert.equal(course.rows[0]?.join_code, "NEWCODE12345");
    assert.deepEqual(course.rows[0]?.card, {});
    const members = await db.query<{ user_id: string }>("select user_id from identity.membership where course_id = 'c1' order by user_id");
    assert.deepEqual(members.rows.map((row) => row.user_id), ["owner", "ta"]);
    const staff = await db.query("select 1 from identity.course_staff where course_id = 'c1' and user_id = 'ta'");
    assert.equal(staff.rowCount, 1);
    const assignments = await db.query("select 1 from identity.assignment_card where course_id = 'c1'");
    const participation = await db.query("select 1 from identity.participation where course_id = 'c1'");
    assert.equal(assignments.rowCount, 0);
    assert.equal(participation.rowCount, 0);
  } finally {
    await db.close();
  }
});
