"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeWelcome } from "@/lib/actions";

export function WelcomeGuide({ role }: { role: "instructor" | "student" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function acknowledge() {
    if (leaving) return;
    setLeaving(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      await acknowledgeWelcome();
      dialog.current?.close();
      router.refresh();
    } catch {
      setLeaving(false);
      setError(true);
    }
  }

  return <dialog ref={dialog} className={`welcome-dialog ${leaving ? "leaving" : ""}`}
    aria-labelledby="welcome-title" onCancel={(event) => event.preventDefault()}>
    <div className="welcome-topline">ClearCourse · Welcome</div>
    <div className="welcome-body">
      <h1 id="welcome-title">A clearer way to talk about AI in courses</h1>
      <p className="welcome-lead">Made by UW students for UW students and professors. ClearCourse helps everyone find the same course and assignment guidance and ask for clarification.</p>
      <div className="welcome-grid">
        <section><h2>For students</h2><p>Read the Course AI card and each assignment card before you begin. Ask a course related question when a rule is unclear. Your participation level stays private unless you choose to share it.</p></section>
        <section><h2>For professors</h2><p>Write the guidance for your own course, publish assignment specific cards, answer questions, and keep expectations visible in one place. ClearCourse does not set policy for you.</p></section>
      </div>
      <section className="welcome-rules"><h2>How to use the discussion board</h2>
        <ul>
          <li>Keep questions respectful, specific, and related to the course or an assignment.</li>
          <li>Do not include names, private details, student work, or assignment submissions.</li>
          <li>Check the relevant AI card first. Your professor and official University guidance remain the authority for course rules.</li>
        </ul>
      </section>
      <p className="welcome-practice">This is a practice release. Email and Professor status are unverified. Do not enter real student information or rely on guaranteed anonymity.</p>
      {error ? <p role="alert">Could not save your acknowledgement. Please try again.</p> : null}
      <button className="button primary welcome-ack" type="button" onClick={acknowledge} disabled={leaving}>
        {leaving ? "Opening your courses…" : `I understand · Continue as ${role === "instructor" ? "professor" : "student"}`}
      </button>
    </div>
  </dialog>;
}
