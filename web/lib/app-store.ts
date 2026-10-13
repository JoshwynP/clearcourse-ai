import { randomBytes, randomInt } from "node:crypto";
import { database } from "@/lib/database";
import { emptyCard, type CardFields, type CourseRecord } from "@/lib/identity-model";
import { courses as sampleCourses } from "@/lib/sample-courses";

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

export type CourseStaffRole = "owner" | "professor" | "ta";

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
           (select 1 from identity.course c where c.id = a.course_id and
             (c.instructor_id = $1 or exists (select 1 from identity.course_staff s where s.course_id = c.id and s.user_id = $1)))
         returning a.id`
      : `insert into identity.assignment_card (id, course_id, identifier, title, details)
         select $3, c.id, $4, $5, $6::jsonb from identity.course c
         where c.id = $2 and (c.instructor_id = $1 or exists
           (select 1 from identity.course_staff s where s.course_id = c.id and s.user_id = $1)) returning id`,
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
       (select 1 from identity.course c where c.id = a.course_id and
         (c.instructor_id = $1 or exists (select 1 from identity.course_staff s where s.course_id = c.id and s.user_id = $1)))
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

export async function courseStaffRole(userId: string, courseId: string): Promise<CourseStaffRole | null> {
  const result = await database().query<{ role: CourseStaffRole | null }>(
    `select case when c.instructor_id = $1 then 'owner' else s.role end as role
     from identity.course c left join identity.course_staff s on s.course_id = c.id and s.user_id = $1
     where c.id = $2 and (c.instructor_id = $1 or s.user_id is not null)`,
    [userId, courseId],
  );
  return result.rows[0]?.role ?? null;
}

export async function courseStaffForOwner(ownerId: string, courseId: string) {
  const result = await database().query<{ id: string; name: string; email: string; role: "professor" | "ta" }>(
    `select u.id, u.name, u.email, s.role from identity.course_staff s
     join identity.course c on c.id = s.course_id and c.instructor_id = $1
     join public."user" u on u.id = s.user_id where s.course_id = $2 order by s.added_at`,
    [ownerId, courseId],
  );
  return result.rows;
}

export async function addCourseStaffForOwner(ownerId: string, courseId: string, email: string, role: "professor" | "ta") {
  const client = await database().connect();
  try {
    await client.query("begin");
    const course = await client.query<{ instructor_id: string }>(
      "select instructor_id from identity.course where id = $1 for update", [courseId],
    );
    if (course.rows[0]?.instructor_id !== ownerId) { await client.query("rollback"); return "not-owner"; }
    const target = await client.query<{ id: string; role: string }>(
      `select u.id, p.role from public."user" u join identity.profile p on p.user_id = u.id where u.email = $1`, [email],
    );
    const userId = target.rows[0]?.id;
    if (!userId) { await client.query("rollback"); return "not-found"; }
    if (userId === ownerId) { await client.query("rollback"); return "self"; }
    if (role === "professor" && target.rows[0]?.role !== "instructor") { await client.query("rollback"); return "role"; }
    const member = await client.query("select 1 from identity.membership where course_id = $1 and user_id = $2", [courseId, userId]);
    await client.query("insert into identity.membership (course_id, user_id) values ($1, $2) on conflict do nothing", [courseId, userId]);
    await client.query(
      `insert into identity.course_staff (course_id, user_id, role, had_membership) values ($1, $2, $3, $4)
       on conflict (course_id, user_id) do update set role = excluded.role`,
      [courseId, userId, role, Boolean(member.rowCount)],
    );
    await client.query("commit");
    return "ok";
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function removeCourseStaffForOwner(ownerId: string, courseId: string, staffId: string) {
  const client = await database().connect();
  try {
    await client.query("begin");
    const removed = await client.query<{ had_membership: boolean }>(
      `delete from identity.course_staff s where s.course_id = $1 and s.user_id = $2
       and exists (select 1 from identity.course c where c.id = s.course_id and c.instructor_id = $3)
       returning had_membership`, [courseId, staffId, ownerId],
    );
    if (removed.rows[0] && !removed.rows[0].had_membership) {
      await client.query("delete from identity.membership where course_id = $1 and user_id = $2", [courseId, staffId]);
    }
    await client.query("commit");
    return Boolean(removed.rowCount);
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function createCourseForInstructor(userId: string, code: string, name: string, template = false) {
  const sample = sampleCourses[0];
  code = template ? "DEMO 210" : code.trim();
  name = template ? "Technology & society (example)" : name.trim();
  if (!code || code.length > 20 || !name || name.length > 80) return false;
  const db = database();
  for (let attempt = 0; attempt < 4; attempt++) {
    const joinCode = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
    const id = randomBytes(16).toString("hex");
    const client = await db.connect();
    try {
      await client.query("begin");
      const card = template && sample ? { ...emptyCard(),
        summary: sample.card.summary, allowed: sample.card.allowed,
        notAllowed: sample.card.notAllowed, disclose: sample.card.disclose,
        opening: "This is fictional example guidance. Edit every rule before using your own course.",
        counts: "Tools that generate text, images, or code from a prompt.",
        permitted: "Yes, for early exploration within the limits below.",
      } : {};
      const created = await client.query(
        `insert into identity.course (id, code, name, join_code, instructor_id, card)
         select $1, $2, $3, $4, p.user_id, $6::jsonb from identity.profile p
         where p.user_id = $5 and p.role = 'instructor' returning id`,
        [id, code, name, joinCode, userId, JSON.stringify(card)],
      );
      if (!created.rowCount) { await client.query("rollback"); return false; }
      await client.query("insert into identity.membership (course_id, user_id) values ($1, $2)", [id, userId]);
      if (template && sample) {
        for (const assignment of sample.assignments) {
          const details: AssignmentDetails = {
            ...emptyAssignment, due: `${assignment.due} (example)`, learning: assignment.learning,
            permitted: "Yes, within the limits below.", allowed: assignment.allowed,
            notAllowed: assignment.notAllowed, disclose: assignment.disclose,
            opening: "Fictional example assignment. Edit before using your own course.",
            other: "Dates and rules in this example are fictional.",
          };
          await client.query(
            `insert into identity.assignment_card (id, course_id, identifier, title, details, status)
             values ($1, $2, $3, $4, $5::jsonb, 'published')`,
            [randomBytes(16).toString("hex"), id, assignment.id, assignment.title, JSON.stringify(details)],
          );
        }
      }
      await client.query("commit");
      return id;
    } catch (error) {
      await client.query("rollback");
      if ((error as { code?: string }).code !== "23505") throw error;
    } finally {
      client.release();
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
    `update identity.course c set card = $1::jsonb where c.id = $2 and
       (c.instructor_id = $3 or exists
         (select 1 from identity.course_staff s where s.course_id = c.id and s.user_id = $3)) returning c.id`,
    [JSON.stringify(next), courseId, userId],
  );
  return Boolean(result.rowCount);
}
