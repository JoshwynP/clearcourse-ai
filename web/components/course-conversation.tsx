import Link from "next/link";
import { askQuestion, castVote, sendReply } from "@/lib/actions";
import type { ListedQuestion } from "@/lib/content-model";

export function CourseConversation({
  courseId,
  questions,
  summary,
}: {
  courseId: string;
  questions: ListedQuestion[];
  summary: string;
}) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Conversation</h1>
          <p className="page-subtitle">Questions and replies do not include a name.</p>
          <p className="meta">Practice accounts only. Do not enter real student information or rely on this release for guaranteed anonymity.</p>
        </div>
        <details className="ask-details">
          <summary className="button primary">Ask a question</summary>
          <form className="composer" action={askQuestion}>
            <input type="hidden" name="courseId" value={courseId} />
            <label htmlFor="title">Question</label>
            <input className="field" id="title" name="title" required maxLength={160} />
            <label htmlFor="body">Details</label>
            <textarea className="field" id="body" name="body" maxLength={2000} />
            <button className="button primary" type="submit">
              Post question
            </button>
          </form>
        </details>
      </div>
      <div className="layout">
      <section className="panel" aria-label="Course questions">
      {questions.length === 0 ? <p className="meta panel-pad">No questions yet.</p> : null}
      <ul className="thread">
        {questions.map((question) => (
          <li className="question" key={question.id}>
            <h2>{question.title}</h2>
            {question.body ? <p>{question.body}</p> : null}
            <form className="inline-form" action={castVote}>
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
              <summary className="button">Reply</summary>
              <form className="composer" action={sendReply}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="questionId" value={question.id} />
                <label htmlFor={`reply-${question.id}`}>Reply</label>
                <textarea className="field" id={`reply-${question.id}`} name="reply" required maxLength={2000} />
                <button className="button" type="submit">
                  Post reply
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
