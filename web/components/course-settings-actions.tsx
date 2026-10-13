"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type SettingsAction = (formData: FormData) => Promise<void>;

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export function CourseDetailsForm({ courseId, code, name, action }: {
  courseId: string; code: string; name: string; action: SettingsAction;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [nextCode, setNextCode] = useState(code);
  const [nextName, setNextName] = useState(name);
  return <form className="settings-form" action={action} onSubmit={() => dialog.current?.close()}>
    <input type="hidden" name="courseId" value={courseId} />
    <div><label htmlFor="settings-code">Course code</label><input className="field" id="settings-code" name="code" value={nextCode} onChange={(event) => setNextCode(event.target.value)} required maxLength={20} /></div>
    <div><label htmlFor="settings-name">Course name</label><input className="field" id="settings-name" name="name" value={nextName} onChange={(event) => setNextName(event.target.value)} required maxLength={80} /></div>
    <button className="button primary" type="button" disabled={!nextCode.trim() || !nextName.trim() || (nextCode === code && nextName === name)} onClick={() => dialog.current?.showModal()}>Review changes</button>
    <dialog className="reset-dialog" ref={dialog} aria-labelledby="details-confirm-title">
      <h3 id="details-confirm-title">Save course details?</h3>
      <p>Everyone in this course will see the updated details.</p>
      <dl className="change-summary"><dt>Course code</dt><dd>{code} → <strong>{nextCode}</strong></dd><dt>Course name</dt><dd>{name} → <strong>{nextName}</strong></dd></dl>
      <div className="form-actions"><button className="button" type="button" onClick={() => dialog.current?.close()}>Cancel</button><ConfirmButton label="Save changes" /></div>
    </dialog>
  </form>;
}

export function ConfirmActionForm({ courseId, action, extraName, extraValue, button, title, description, confirm }: {
  courseId: string; action: SettingsAction; extraName?: string; extraValue?: string;
  button: string; title: string; description: string; confirm: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <form action={action} onSubmit={() => dialog.current?.close()}>
    <input type="hidden" name="courseId" value={courseId} />
    {extraName ? <input type="hidden" name={extraName} value={extraValue} /> : null}
    <button className="button small" type="button" onClick={() => dialog.current?.showModal()}>{button}</button>
    <dialog className="reset-dialog" ref={dialog} aria-labelledby={`confirm-${extraValue ?? "join-code"}`}>
      <h3 id={`confirm-${extraValue ?? "join-code"}`}>{title}</h3><p>{description}</p>
      <div className="form-actions"><button className="button" type="button" onClick={() => dialog.current?.close()}>Cancel</button><ConfirmButton label={confirm} /></div>
    </dialog>
  </form>;
}
