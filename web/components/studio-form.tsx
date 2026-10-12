"use client";

import { useState } from "react";
import type { SampleCourse } from "@/lib/sample-courses";
import { useSampleSession } from "@/components/sample-session-provider";

export function StudioForm({ course }: { course: SampleCourse }) {
  const session = useSampleSession();
  const [cardId, setCardId] = useState("course");
  const [saved, setSaved] = useState(false);
  const text = session.cardText(course, cardId);
  const choices = [
    { id: "course", title: "Course AI guidance" },
    ...course.assignments.map((assignment) => ({ id: assignment.id, title: assignment.title })),
  ];

  return (
    <div className="page">
      <h1>Edit a sample card</h1>
      <p className="notice">
        There is no instructor sign-in, publishing, or saved policy here. Edits remain in this browser tab until reload.
        This is a manual editing preview.
      </p>
      <form
        className="panel studio-form"
        key={cardId}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          session.saveDraft(course.id, cardId, {
            allowed: String(data.get("allowed") || ""),
            notAllowed: String(data.get("notAllowed") || ""),
            disclose: String(data.get("disclose") || ""),
          });
          setSaved(true);
        }}
      >
        <div className="form-row">
          <label htmlFor="studio-card">Card</label>
          <select
            className="field"
            id="studio-card"
            value={cardId}
            onChange={(event) => {
              setCardId(event.target.value);
              setSaved(false);
            }}
          >
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="studio-allowed">When AI is allowed</label>
          <textarea className="field" id="studio-allowed" name="allowed" required defaultValue={text.allowed} />
        </div>
        <div className="form-row">
          <label htmlFor="studio-not-allowed">When AI is not allowed</label>
          <textarea className="field" id="studio-not-allowed" name="notAllowed" required defaultValue={text.notAllowed} />
        </div>
        <div className="form-row">
          <label htmlFor="studio-disclose">Disclosure expectations</label>
          <textarea className="field" id="studio-disclose" name="disclose" required defaultValue={text.disclose} />
        </div>
        <div className="form-actions">
          <button className="button primary" type="submit">
            Save in this sample
          </button>
        </div>
        {saved ? (
          <p className="notice" role="status">
            Saved in this sample.
          </p>
        ) : null}
      </form>
    </div>
  );
}
