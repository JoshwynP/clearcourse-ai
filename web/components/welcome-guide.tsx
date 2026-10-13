"use client";

import { useEffect, useRef, useState } from "react";
import { acknowledgeWelcome } from "@/lib/actions";

export function WelcomeGuide({ role, needsWelcome }: { role?: "instructor" | "student"; needsWelcome: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { if (needsWelcome && !dialog.current?.open) dialog.current?.showModal(); }, [needsWelcome]);

  function openGuide() {
    setLeaving(false);
    setError(false);
    dialog.current?.showModal();
  }

  async function closeGuide() {
    if (leaving) return;
    setLeaving(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    if (needsWelcome) {
      try {
        await acknowledgeWelcome();
        dialog.current?.close();
        window.location.reload();
      } catch {
        setLeaving(false);
        setError(true);
      }
    } else {
      dialog.current?.close();
      setLeaving(false);
    }
  }

  return <>
    <button className="about-trigger" type="button" onClick={openGuide} aria-haspopup="dialog">About ClearCourse</button>
    <dialog ref={dialog} className={`welcome-dialog ${leaving ? "leaving" : ""}`}
      aria-labelledby="welcome-title" onCancel={(event) => { event.preventDefault(); if (!needsWelcome) void closeGuide(); }}>
      <div className="welcome-topline">ClearCourse | Welcome guide</div>
      <div className="welcome-body">
        <h1 id="welcome-title">Clear guidance for every course</h1>
        <p className="welcome-lead">Made by UW students for UW students and professors. ClearCourse brings course AI rules, assignment expectations, and questions into one place so everyone can work from the same guidance.</p>
        <div className="welcome-grid">
          <section><h2>For students</h2><p>Find the Course AI card and assignment cards before you begin work. See what your professor permits, what needs disclosure, and where a rule applies. Ask a course related question when wording is unclear, and see the answer in the same place as the rule. Your participation level is private unless you choose to share it.</p></section>
          <section><h2>For professors and TAs</h2><p>Write guidance for your own course and assignments, keep changes visible, and answer recurring questions once for the class. Manage the teaching team and enrollment from course settings. ClearCourse helps communicate your decisions; it does not make policy or grade students for you.</p></section>
        </div>
        <section className="welcome-rules"><h2>Using the discussion board</h2>
          <ul>
            <li>Read the relevant AI card first, then ask a specific question about the course or an assignment.</li>
            <li>Be respectful. Keep questions and replies useful to the whole class.</li>
            <li>Do not include names, private details, student work, or assignment submissions.</li>
            <li>Professor instructions and official University policies remain the authority for course rules.</li>
          </ul>
        </section>
        <p className="welcome-safety">Current access limits: email ownership and Professor status are not verified. Do not enter identifying student information or rely on guaranteed anonymity while these controls are being completed.</p>
        {error ? <p role="alert">Could not save your acknowledgement. Please try again.</p> : null}
        <button className="button primary welcome-ack" type="button" onClick={closeGuide} disabled={leaving}>
          {leaving ? "Closing guide…" : needsWelcome ? `I understand. Continue as ${role === "instructor" ? "professor" : "student"}` : "Close guide"}
        </button>
      </div>
    </dialog>
  </>;
}
