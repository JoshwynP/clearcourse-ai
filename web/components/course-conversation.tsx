import Link from "next/link";
import { askQuestion, castVote, sendReply } from "@/lib/actions";
import type { ListedQuestion } from "@/lib/content-model";
import type { AssignmentCard } from "@/lib/app-store";

export function CourseConversation({
  courseId,
  questions,
  summary,
  assignments,
  tag,
  query,
}: {
  courseId: string;
  questions: ListedQuestion[];
  summary: string;
  assignments: AssignmentCard[];
  tag?: string;
  query?: string;
}) {
  const activeTag = tag === "course" || assignments.some((item) => item.id === tag) ? tag : "all";
  const search = (query ?? "").trim().toLowerCase();
  const shown = questions.filter((question) =>
    (activeTag === "all" || question.tag === activeTag) &&
    (!search || `${question.title} ${question.body}`.toLowerCase().includes(search)));
  const tagName = (id: string) => id === "course" ? "Course" : assignments.find((item) => item.id === id)?.title ?? "Assignment";
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Discussion board</h1>
          <p className="page-subtitle">Questions and replies do not include a name.</p>
          <p className="meta">Email and Professor status are not verified yet. Do not include identifying student information or assume guaranteed anonymity.</p>
        </div>
      </div>
      <details className="panel ask-panel">
          <summary>Ask a question</summary>
          <form className="ask-form" action={askQuestion}>
            <input type="hidden" name="courseId" value={courseId} />
            <label htmlFor="question-tag">Question about</label>
            <select className="field" id="question-tag" name="tag" defaultValue={activeTag === "all" ? "course" : activeTag}>
              <option value="course">General course question</option>
              {assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <label htmlFor="title">Question</label>
            <input className="field" id="title" name="title" required maxLength={160} />
            <label htmlFor="body">Details</label>
            <textarea className="field" id="body" name="body" maxLength={2000} />
            <button className="button primary" type="submit">
              Post question
            </button>
          </form>
      </details>
      <div className="layout">
      <section className="panel" aria-label="Course questions">
      <form className="conversation-tools" method="get" action={`/courses/${courseId}/conversation`}>
        <div className="filter-field"><label htmlFor="question-filter">Filter by:</label>
          <select className="field" id="question-filter" name="tag" defaultValue={activeTag}>
            <option value="all">All questions</option><option value="course">General course questions</option>
            {assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select></div>
        <div className="filter-field"><label htmlFor="question-search">Search</label>
          <input className="field" id="question-search" name="q" type="search" defaultValue={query ?? ""} /></div>
        <button className="button" type="submit">Apply</button>
      </form>
      {shown.length === 0 ? <p className="meta panel-pad">No questions match this view.</p> : null}
      <ul className="thread">
        {shown.map((question) => (
          <li className="question" key={question.id}>
            <span className={`status-tag question-tag ${question.tag === "course" ? "course-tag" : "assignment-tag"}`}>{tagName(question.tag)}</span>
            <h2>{question.title}</h2>
            {question.body ? <p>{question.body}</p> : null}
            <form className="inline-form question-vote" action={castVote}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="questionId" value={question.id} />
              <button className="text-action" type="submit">
                {question.voted ? "Upvoted" : "Upvote"} {question.votes}
              </button>
            </form>
            <ul className="replies">
              {question.replies.map((reply, index) => (
                <li className="reply" key={`${question.id}-${index}`}>
                  <strong>{reply.role}</strong>
                  <p>{reply.text}</p>
                </li>
              ))}
            </ul>
            <details className="ask-details">
              <summary className="button">Comments ({question.replies.length})</summary>
              <form className="composer" action={sendReply}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="questionId" value={question.id} />
                <label htmlFor={`reply-${question.id}`}>Add comment or request clarification</label>
                <textarea className="field" id={`reply-${question.id}`} name="reply" required maxLength={400} />
                <button className="button" type="submit">
                  Add comment
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>
      </section>
      <aside className="side-stack" aria-label="Course guidance">
        <section className="panel panel-pad">
          <div className="side-header">
            <h2 className="section-title">AI guidance</h2>
            <Link className="text-action" href={`/courses/${courseId}/guidance`}>
              View all
            </Link>
          </div>
          <p className="section-caption">The rules, in one place.</p>
          <p className="lead">{summary || "No course summary yet."}</p>
        </section>
      </aside>
      </div>
    </div>
  );
}
