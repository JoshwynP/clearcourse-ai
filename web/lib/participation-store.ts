import { database } from "@/lib/database";

export type Counts = { questions: number; comments: number; upvotes: number };
export type Level = "No Record" | "Contributor" | "Sustained Contributor";

export function participationLevel(counts: Counts): Level {
  const posts = counts.questions + counts.comments;
  if (posts >= 2 && counts.upvotes >= 3) return "Sustained Contributor";
  if (posts >= 1 && counts.upvotes >= 1) return "Contributor";
  return "No Record";
}

export async function addParticipation(userId: string, courseId: string, kind: keyof Counts, delta = 1) {
  if (!(["questions", "comments", "upvotes"] as string[]).includes(kind) || ![-1, 1].includes(delta)) return;
  // The column comes from the closed allowlist above; values remain SQL parameters.
  await database().query(
    `insert into identity.participation (course_id, user_id, ${kind})
     select m.course_id, m.user_id, greatest(0, $3::integer)
     from identity.membership m join identity.profile p on p.user_id = m.user_id
     where m.course_id = $1 and m.user_id = $2 and p.role = 'student'
       and not exists (select 1 from identity.course_staff s where s.course_id = m.course_id and s.user_id = m.user_id)
     on conflict (course_id, user_id) do update set ${kind} = greatest(0, identity.participation.${kind} + $3)`,
    [courseId, userId, delta],
  );
}

export async function privateParticipation(userId: string, courseId: string) {
  const result = await database().query<Counts & { shared_at: Date | null }>(
    `select questions, comments, upvotes, shared_at from identity.participation
     where course_id = $1 and user_id = $2`, [courseId, userId],
  );
  const row = result.rows[0];
  const counts: Counts = row
    ? { questions: row.questions, comments: row.comments, upvotes: row.upvotes }
    : { questions: 0, comments: 0, upvotes: 0 };
  return { ...counts, level: participationLevel(counts), sharedAt: row?.shared_at ?? null };
}

export async function setParticipationSharing(userId: string, courseId: string, shared: boolean) {
  const result = await database().query(
    `insert into identity.participation (course_id, user_id, shared_at)
     select m.course_id, m.user_id, case when $3::boolean then now() else null end
     from identity.membership m join identity.profile p on p.user_id = m.user_id
     where m.course_id = $1 and m.user_id = $2 and p.role = 'student'
       and not exists (select 1 from identity.course_staff s where s.course_id = m.course_id and s.user_id = m.user_id)
     on conflict (course_id, user_id) do update set shared_at = excluded.shared_at
     returning course_id`, [courseId, userId, shared],
  );
  return Boolean(result.rowCount);
}

export async function sharedParticipationForInstructor(instructorId: string, courseId: string) {
  const result = await database().query<{ name: string; level: Level; shared_at: Date }>(
    `select u.name,
       case when p.questions + p.comments >= 2 and p.upvotes >= 3 then 'Sustained Contributor'
            when p.questions + p.comments >= 1 and p.upvotes >= 1 then 'Contributor'
            else 'No Record' end as level,
       p.shared_at
     from identity.participation p
     join identity.course c on c.id = p.course_id and
       (c.instructor_id = $1 or exists
         (select 1 from identity.course_staff s where s.course_id = c.id and s.user_id = $1 and s.role = 'professor'))
     join public."user" u on u.id = p.user_id
     where p.course_id = $2 and p.shared_at is not null
       and not exists (select 1 from identity.course_staff s where s.course_id = p.course_id and s.user_id = p.user_id)
     order by p.shared_at desc`, [instructorId, courseId],
  );
  return result.rows.map((row) => ({ name: row.name, level: row.level, sharedAt: row.shared_at }));
}
