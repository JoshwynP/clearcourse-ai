import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { emptyContent, type ContentState } from "@/lib/content-model";

neonConfig.webSocketConstructor = ws;
let pool: Pool | undefined;

function contentDatabase() {
  const connectionString = process.env.CONTENT_DATABASE_URL ?? process.env.CONTENT_DATABASE_DATABASE_URL;
  if (!connectionString) throw new Error("CONTENT_DATABASE_URL or CONTENT_DATABASE_DATABASE_URL is required");
  if (connectionString === process.env.DATABASE_URL) {
    throw new Error("Content and identity must use separate database roles");
  }
  return (pool ??= new Pool({ connectionString, max: 3 }));
}

export async function readContent(courseId: string): Promise<ContentState> {
  const row = await contentDatabase().query<{ state: ContentState }>(
    "select state from content.board where course_id = $1", [courseId],
  );
  return row.rows[0]?.state ?? emptyContent();
}

export async function updateContent(courseId: string, update: (state: ContentState) => ContentState | null) {
  const client = await contentDatabase().connect();
  try {
    await client.query("begin");
    await client.query(
      "insert into content.board (course_id, state) values ($1, $2::jsonb) on conflict do nothing",
      [courseId, JSON.stringify(emptyContent())],
    );
    const current = await client.query<{ state: ContentState }>(
      "select state from content.board where course_id = $1 for update", [courseId],
    );
    const next = update(current.rows[0]?.state ?? emptyContent());
    if (next) await client.query("update content.board set state = $2::jsonb where course_id = $1", [courseId, JSON.stringify(next)]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
