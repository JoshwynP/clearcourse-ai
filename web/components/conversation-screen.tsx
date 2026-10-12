"use client";

import { useState } from "react";
import { tagLabel, type Question, type SampleCourse } from "@/lib/sample-courses";
import { useSampleSession } from "@/components/sample-session-provider";

export function ConversationScreen({ course }: { course: SampleCourse }) {
  const session = useSampleSession();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [asking, setAsking] = useState(false);
  const questions = session.state.questions[course.id] ?? [];
  const query = search.trim().toLowerCase();
  const visible = questions.filter((question) => {
    const matchesFilter = filter === "all" || question.tag === filter;
    const matchesSearch = !query || `${question.title} ${question.body}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const filters = [
    { id: "all", label: "All questions" },
    { id: "course", label: "Course" },
    ...course.assignments.map((assignment) => ({ id: assignment.id, label: assignment.title })),
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            {course.code} · {course.name}
          </h1>
          <p className="page-subtitle">Sample questions. They stay in this browser tab until you reload.</p>
        </div>
        <button className="button primary" type="button" aria-expanded={asking} onClick={() => setAsking((open) => !open)}>
          Ask a question
        </button>
      </div>
      {asking ? (
        <form
          className="panel panel-pad composer"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            session.addQuestion(course, {
              tag: String(data.get("tag") || "course"),
              title: String(data.get("title") || ""),
              body: String(data.get("body") || ""),
            });
            event.currentTarget.reset();
            setAsking(false);
          }}
        >
          <div className="form-row">
            <label htmlFor="question-tag">Question about</label>
            <select className="field" id="question-tag" name="tag" required>
              <option value="course">Course</option>
              {course.assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="question-title">Your question</label>
            <input className="field" id="question-title" name="title" maxLength={120} required />
          </div>
          <div className="form-row">
            <label htmlFor="question-body">More context (optional)</label>
            <textarea className="field" id="question-body" name="body" maxLength={600} rows={3} />
          </div>
          <div className="form-actions">
            <button className="button" type="button" onClick={() => setAsking(false)}>
              Cancel
            </button>
            <button className="button primary" type="submit">
              Add to this sample
            </button>
          </div>
        </form>
      ) : null}
      <div className="conversation-tools">
        <div className="filters" role="group" aria-label="Filter questions">
          {filters.map((item) => (
            <button
              key={item.id}
              className={filter === item.id ? "filter active" : "filter"}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          value={search}
          aria-label="Search questions"
          placeholder="Search"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {visible.length ? (
        <div className="thread">
          {visible.map((question) => (
            <QuestionItem
              key={question.id}
              course={course}
              question={question}
              onVote={() => session.toggleVote(course.id, question.id)}
              onReply={(text) => session.addReply(course.id, question.id, text)}
            />
          ))}
        </div>
      ) : (
        <p className="empty">No questions match this view.</p>
      )}
    </div>
  );
}

function QuestionItem({
  course,
  question,
  onVote,
  onReply,
}: {
  course: SampleCourse;
  question: Question;
  onVote: () => void;
  onReply: (text: string) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <article className="question">
      <span className="section-caption">{tagLabel(course, question.tag)}</span>
      <h2>{question.title}</h2>
      {question.body ? <p>{question.body}</p> : null}
      <div className="meta">
        <button
          className="text-action"
          type="button"
          aria-pressed={question.voted}
          aria-label={`${question.voted ? "Remove upvote from" : "Upvote"} ${question.title}`}
          onClick={onVote}
        >
          {question.voted ? "Upvoted" : "Upvote"} {question.votes}
        </button>
        <span>{question.time}</span>
        <span>
          {question.replies.length} {question.replies.length === 1 ? "reply" : "replies"}
        </span>
        <button className="text-action" type="button" aria-expanded={replying} onClick={() => setReplying((open) => !open)}>
          Reply
        </button>
      </div>
      {question.replies.map((reply, index) => (
        <p className="reply" key={`${question.id}-${index}`}>
          <strong>{reply.role}</strong>
          {reply.text}
        </p>
      ))}
      {replying ? (
        <form
          className="reply-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onReply(String(data.get("reply") || ""));
            event.currentTarget.reset();
            setReplying(false);
          }}
        >
          <input name="reply" maxLength={400} aria-label={`Reply to ${question.title}`} placeholder="Write a reply" required />
          <button className="button" type="submit">
            Send
          </button>
        </form>
      ) : null}
    </article>
  );
}
