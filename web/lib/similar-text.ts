const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "are", "was",
  "what", "when", "how", "not", "use", "used", "can", "you", "its", "into",
]);

export type DiscussionBoard = {
  courseId: string;
  questions: { id: string; title: string; body: string }[];
  replies: { questionId: string; role: string; text: string }[];
};

export type SimilarDiscussion = {
  title: string;
  body: string;
  replies: { role: string; text: string }[];
  sameCourse: boolean;
};

export function wordSet(text: string) {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

export function similarItems<T extends { id: string; text: string }>(query: string, items: T[], limit = 3) {
  const words = wordSet(query);
  if (words.size === 0) return [];
  return items
    .map((item) => {
      const other = wordSet(item.text);
      let shared = 0;
      for (const word of words) if (other.has(word)) shared += 1;
      return { item, shared, score: shared / Math.sqrt(words.size * Math.max(other.size, 1)) };
    })
    .filter((row) => row.shared >= 1 && row.score >= 0.2)
    .sort((left, right) => right.score - left.score || right.shared - left.shared || left.item.id.localeCompare(right.item.id))
    .slice(0, limit)
    .map((row) => row.item);
}

export function discussionBoards(rows: {
  courseId: string;
  state?: {
    questions?: { id?: string; title?: string; body?: string }[];
    replies?: { questionId?: string; role?: string; text?: string }[];
    votes?: { token?: string }[];
  };
}[]): DiscussionBoard[] {
  return rows.map((row) => ({
    courseId: row.courseId,
    questions: (row.state?.questions ?? []).flatMap((question) => (
      question?.id ? [{ id: question.id, title: String(question.title ?? ""), body: String(question.body ?? "") }] : []
    )),
    replies: (row.state?.replies ?? []).flatMap((reply) => (
      reply?.questionId ? [{ questionId: reply.questionId, role: String(reply.role ?? ""), text: String(reply.text ?? "") }] : []
    )),
  }));
}

export function similarDiscussions(
  boards: DiscussionBoard[],
  current: { courseId: string; questionId: string; title: string; body: string },
  limit = 3,
): SimilarDiscussion[] {
  const currentId = `${current.courseId}:${current.questionId}`;
  const items = boards.flatMap((board) => board.questions.map((question) => ({
    id: `${board.courseId}:${question.id}`,
    text: `${question.title} ${question.body}`,
    title: question.title.slice(0, 200),
    body: question.body.slice(0, 400),
    replies: board.replies
      .filter((reply) => reply.questionId === question.id)
      .slice(0, 3)
      .map((reply) => ({ role: reply.role, text: reply.text.slice(0, 400) })),
    sameCourse: board.courseId === current.courseId,
  })));
  return similarItems(`${current.title} ${current.body}`, items.filter((item) => item.id !== currentId), limit)
    .map(({ title, body, replies, sameCourse }) => ({ title, body, replies, sameCourse }));
}
