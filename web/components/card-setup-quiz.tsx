"use client";

import Link from "next/link";
import { useState } from "react";
import { setupQuestions, type SetupKind } from "@/lib/card-setup";
import { similarItems } from "@/lib/similar-text";

export function CardSetupQuiz({
  action, kind, courseId, cardId, needsIdentity, title, identifier, examples,
}: {
  action: (formData: FormData) => void;
  kind: SetupKind;
  courseId: string;
  cardId?: string;
  needsIdentity: boolean;
  title: string;
  identifier: string;
  examples: Record<string, string[]>;
}) {
  const steps = setupQuestions.length + (needsIdentity ? 1 : 0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftIdentifier, setDraftIdentifier] = useState(identifier);
  const [identityError, setIdentityError] = useState(false);
  const identityStep = needsIdentity && step === 0;
  const question = identityStep ? undefined : setupQuestions[needsIdentity ? step - 1 : step];
  const matches = question
    ? similarItems(answers[question.id] ?? "", (examples[question.id] ?? []).map((text, index) => ({ id: String(index), text })))
    : [];
  const editor = `/courses/${courseId}/studio?card=${cardId ?? (kind === "course" ? "course" : "new")}`;

  function next() {
    if (identityStep && (!draftTitle.trim() || !/^[A-Za-z0-9_-]{1,40}$/.test(draftIdentifier.trim()))) {
      setIdentityError(true);
      return;
    }
    setIdentityError(false);
    setStep(step + 1);
  }

  return (
    <form className="panel panel-pad setup-form" action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="kind" value={kind} />
      {cardId ? <input type="hidden" name="id" value={cardId} /> : null}
      {setupQuestions.map((item) => <input key={item.id} type="hidden" name={item.id} value={answers[item.id] ?? ""} />)}
      <p className="meta">Question {step + 1} of {steps}</p>
      {needsIdentity ? (
        <div hidden={!identityStep}>
          <h2>Name this assignment card</h2>
          <p>Students see the title. The identifier is a short unique code for this assignment.</p>
          <p className="meta">Fixed rule: the title and identifier are saved with the card. Later answers do not change them.</p>
          <div className="editor-meta">
            <div>
              <label htmlFor="setup-title">Assignment title</label>
              <input className="field" id="setup-title" name="title" maxLength={120} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
            </div>
            <div>
              <label htmlFor="setup-identifier">Assignment identifier</label>
              <input className="field" id="setup-identifier" name="identifier" maxLength={40} pattern="[A-Za-z0-9_-]+" value={draftIdentifier} onChange={(event) => setDraftIdentifier(event.target.value)} />
              <small className="field-hint">Use letters, numbers, hyphens, or underscores.</small>
            </div>
          </div>
          {identityError ? <p className="notice" role="alert">Enter a title and an identifier made of letters, numbers, hyphens, or underscores.</p> : null}
        </div>
      ) : null}
      {question ? (
        <div>
          <h2 id={`setup-${question.id}`}>{question.prompt}</h2>
          <p>{question.explanation}</p>
          <p><strong>Why this matters. </strong>{question.why}</p>
          <p className="meta">Fixed rule: {question.rule[kind]}</p>
          {question.choices ? (
            <div className="setup-choices" role="radiogroup" aria-labelledby={`setup-${question.id}`}>
              {question.choices.map((choice) => (
                <label key={choice}>
                  <input
                    type="radio"
                    checked={answers[question.id] === choice}
                    onChange={() => setAnswers({ ...answers, [question.id]: choice })}
                  />
                  {choice}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="field"
              aria-labelledby={`setup-${question.id}`}
              maxLength={2000}
              value={answers[question.id] ?? ""}
              onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
            />
          )}
          <aside className="similar-box" aria-label="Similar answers">
            <h3>Similar answers</h3>
            <p className="meta">Published answers from other courses, matched by shared words. Course names are not shown. These suggestions do not fill the card.</p>
            {matches.length ? (
              <ul>
                {matches.map((match) => <li key={match.id}>{match.text}</li>)}
              </ul>
            ) : <p>No similar answers yet.</p>}
          </aside>
        </div>
      ) : null}
      <div className="form-actions">
        {step > 0 ? <button className="button" type="button" onClick={() => setStep(step - 1)}>Back</button> : <Link className="button" href={editor}>Cancel</Link>}
        {step < steps - 1
          ? <button className="button primary" type="button" onClick={next}>Next</button>
          : <button className="button primary" type="submit">Fill card from these answers</button>}
      </div>
    </form>
  );
}
