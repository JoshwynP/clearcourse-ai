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

export type AssignmentDetails = {
  due: string;
  learning: string;
  permitted: string;
  allowed: string;
  notAllowed: string;
  disclose: string;
  discloseNot: string;
  processRequested: string;
  processNot: string;
  bonusPercent: string;
  bonusRequirements: string;
  resources: string;
  other: string;
  learn: string;
  opening: string;
};

export type AssignmentCard = {
  id: string;
  courseId: string;
  identifier: string;
  title: string;
  details: AssignmentDetails;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

const emptyAssignment: AssignmentDetails = {
  due: "", learning: "", permitted: "", allowed: "", notAllowed: "", disclose: "",
  discloseNot: "", processRequested: "", processNot: "", bonusPercent: "",
  bonusRequirements: "", resources: "", other: "", learn: "", opening: "",
};

export async function assignmentCardsForCourse(courseId: string, includePrivate = false): Promise<AssignmentCard[]> {
  const result = await database().query<{
    id: string; course_id: string; identifier: string; title: string;
    details: Partial<AssignmentDetails>; status: AssignmentCard["status"]; updated_at: Date;
  }>(
    `select id, course_id, identifier, title, details, status, updated_at
     from identity.assignment_card where course_id = $1 ${includePrivate ? "" : "and status = 'published'"}
     order by updated_at desc`, [courseId],
  );
  return result.rows.map((row) => ({
    id: row.id, courseId: row.course_id, identifier: row.identifier, title: row.title,
    details: { ...emptyAssignment, ...row.details }, status: row.status, updatedAt: row.updated_at,
  }));
}

export async function saveAssignmentCardForInstructor(
  userId: string, courseId: string, id: string | undefined,
  identifier: string, title: string, details: AssignmentDetails,
) {
  identifier = identifier.trim(); title = title.trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(identifier) || !title || title.length > 120) return false;
  const clean = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim().slice(0, 2000)]));
  const result = await database().query(
    id
      ? `update identity.assignment_card a set identifier = $4, title = $5, details = $6::jsonb, updated_at = now()
         where a.id = $3 and a.course_id = $2 and exists
           (select 1 from identity.course c where c.id = a.course_id and c.instructor_id = $1)
         returning a.id`
      : `insert into identity.assignment_card (id, course_id, identifier, title, details)
         select $3, c.id, $4, $5, $6::jsonb from identity.course c
         where c.id = $2 and c.instructor_id = $1 returning id`,
    [userId, courseId, id ?? randomBytes(16).toString("hex"), identifier, title, JSON.stringify(clean)],
  );
  return Boolean(result.rowCount);
}

export async function setAssignmentStatusForInstructor(
  userId: string, courseId: string, cardId: string, status: AssignmentCard["status"],
) {
  const result = await database().query(
    `update identity.assignment_card a set status = $4, updated_at = now()
     where a.id = $3 and a.course_id = $2 and exists
       (select 1 from identity.course c where c.id = a.course_id and c.instructor_id = $1)
     returning a.id`, [userId, courseId, cardId, status],
  );
  return Boolean(result.rowCount);
}

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
