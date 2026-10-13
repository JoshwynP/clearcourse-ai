import { randomBytes, randomInt } from "node:crypto";
import { database } from "@/lib/database";
import { emptyCard, type CardFields, type CourseRecord } from "@/lib/identity-model";

type CourseRow = {
  id: string;
  code: string;
  name: string;
  join_code: string;
  instructor_id: string;
  card: Partial<CardFields>;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function courseOf(row: CourseRow): CourseRecord {
  return {
    id: row.id, code: row.code, name: row.name, joinCode: row.join_code,
    instructorId: row.instructor_id, card: { ...emptyCard(), ...row.card },
  };
}

export async function coursesForUser(userId: string) {
  const result = await database().query<CourseRow>(
    "select c.* from identity.course c join identity.membership m on m.course_id = c.id where m.user_id = $1 order by c.created_at desc",
    [userId],
  );
  return result.rows.map(courseOf);
}

export async function memberCourseForUser(userId: string, courseId: string) {
  const result = await database().query<CourseRow>(
    "select c.* from identity.course c join identity.membership m on m.course_id = c.id where m.user_id = $1 and c.id = $2",
    [userId, courseId],
  );
  return result.rows[0] ? courseOf(result.rows[0]) : undefined;
}

export async function createCourseForInstructor(userId: string, code: string, name: string) {
  code = code.trim();
  name = name.trim();
  if (!code || code.length > 20 || !name || name.length > 80) return false;
  const db = database();
  for (let attempt = 0; attempt < 4; attempt++) {
    const joinCode = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
    const id = randomBytes(16).toString("hex");
    try {
      const row = await db.query(
        `with created as (
          insert into identity.course (id, code, name, join_code, instructor_id)
          select $1, $2, $3, $4, p.user_id from identity.profile p
          where p.user_id = $5 and p.role = 'instructor'
          returning id
        )
        insert into identity.membership (course_id, user_id)
        select id, $5 from created returning course_id`,
        [id, code, name, joinCode, userId],
      );
      return Boolean(row.rowCount);
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  return false;
}

export async function joinCourseAsStudent(userId: string, joinCode: string) {
  const row = await database().query(
    `insert into identity.membership (course_id, user_id)
     select c.id, p.user_id from identity.course c cross join identity.profile p
     where c.join_code = $1 and p.user_id = $2 and p.role = 'student'
     on conflict do nothing returning course_id`,
    [joinCode.trim().toUpperCase(), userId],
  );
  if (row.rowCount) return true;
  const existing = await database().query(
    `select 1 from identity.membership m join identity.course c on c.id = m.course_id
     where m.user_id = $1 and c.join_code = $2`,
    [userId, joinCode.trim().toUpperCase()],
  );
  return Boolean(existing.rowCount);
}

export async function saveCourseCardForInstructor(userId: string, courseId: string, card: CardFields) {
  const next = Object.fromEntries(Object.entries(card).map(([key, value]) => [key, value.trim()]));
  const result = await database().query(
    "update identity.course set card = $1::jsonb where id = $2 and instructor_id = $3 returning id",
    [JSON.stringify(next), courseId, userId],
  );
  return Boolean(result.rowCount);
}
