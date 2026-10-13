"use client";

import { useState } from "react";
import { normalizeCardLayout, type CardLayout, type CustomCardField } from "@/lib/card-layout";

type FieldRow = [label: string, key: string];

export function CardFieldEditor({ kind, rows, values, savedLayout }: {
  kind: "course" | "assignment";
  rows: FieldRow[];
  values: Record<string, string>;
  savedLayout?: CardLayout;
}) {
  const allRows: FieldRow[] = [["Opening statement (optional)", "opening"], ...rows];
  const initialLayout = normalizeCardLayout(savedLayout, allRows.map(([, key]) => key));
  const [hiddenFields, setHiddenFields] = useState(initialLayout.hiddenFields);
  const [customFields, setCustomFields] = useState(initialLayout.customFields);
  const [fieldValues, setFieldValues] = useState(values);
  const [removed, setRemoved] = useState<{ field: CustomCardField; index: number } | null>(null);
  const visibleRows = rows.filter(([, key]) => !hiddenFields.includes(key));
  const hiddenRows = allRows.filter(([, key]) => hiddenFields.includes(key));

  function hide(key: string) { setHiddenFields((current) => [...current, key]); }
  function restore(key: string) { setHiddenFields((current) => current.filter((item) => item !== key)); }
  function setValue(key: string, value: string) { setFieldValues((current) => ({ ...current, [key]: value })); }
  function updateCustom(id: string, patch: Partial<CustomCardField>) {
    setCustomFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  }

  return <div className="card-fields-editor">
    <input type="hidden" name="layout" value={JSON.stringify({ hiddenFields, customFields })} />
    <div className="editor-fields-heading"><div><h3>Fields shown to students</h3><p>Hide a default field without deleting its text. Add your own fields below.</p></div></div>
    {!hiddenFields.includes("opening") ? <div className="editor-opening">
      <div className="editor-field-heading"><label htmlFor={`${kind}-opening`}>Opening statement <span className="editor-optional">(optional)</span></label>
        <button className="text-action field-action" type="button" onClick={() => hide("opening")}>Hide field</button></div>
      <textarea className="field" id={`${kind}-opening`} name="opening" maxLength={2000} value={fieldValues.opening ?? ""} onChange={(event) => setValue("opening", event.target.value)} />
    </div> : null}
    <table className="card-table editor-table"><caption className="sr-only">{kind === "course" ? "Course" : "Assignment"} AI card fields</caption><tbody>
      {visibleRows.map(([label, key]) => <tr key={key}><th scope="row"><div className="editor-field-heading">
        <label htmlFor={`${kind}-${key}`}>{label}</label>
        <button className="text-action field-action" type="button" onClick={() => hide(key)}>Hide field</button>
      </div></th><td><textarea className="field" id={`${kind}-${key}`} name={key} maxLength={key === "summary" ? 1000 : 2000}
        value={fieldValues[key] ?? ""} onChange={(event) => setValue(key, event.target.value)} /></td></tr>)}
      {customFields.map((field) => <tr key={field.id}><th scope="row"><div className="editor-field-heading"><label htmlFor={`${kind}-custom-label-${field.id}`}>Custom field</label>
        <button className="text-action field-action" type="button" onClick={() => { setRemoved({ field, index: customFields.findIndex((item) => item.id === field.id) }); setCustomFields((current) => current.filter((item) => item.id !== field.id)); }}>Delete</button></div>
        <input className="field custom-field-label" id={`${kind}-custom-label-${field.id}`} aria-label="Custom field name" placeholder="Field name" required maxLength={80} value={field.label} onChange={(event) => updateCustom(field.id, { label: event.target.value })} />
      </th><td><label className="sr-only" htmlFor={`${kind}-custom-value-${field.id}`}>Content for {field.label || "custom field"}</label>
        <textarea className="field" id={`${kind}-custom-value-${field.id}`} maxLength={2000} value={field.value} onChange={(event) => updateCustom(field.id, { value: event.target.value })} /></td></tr>)}
    </tbody></table>
    <div className="custom-field-actions"><button className="button small" type="button" disabled={customFields.length >= 20} onClick={() => setCustomFields((current) => [...current, { id: crypto.randomUUID().replaceAll("-", ""), label: "", value: "" }])}>Add custom field</button>
      {removed ? <span role="status">Custom field deleted. <button className="text-action field-action" type="button" onClick={() => { setCustomFields((current) => [...current.slice(0, removed.index), removed.field, ...current.slice(removed.index)]); setRemoved(null); }}>Undo</button></span> : null}
    </div>
    {hiddenRows.length ? <section className="hidden-fields" aria-label="Hidden default fields">
      <h3>Hidden fields <span>({hiddenRows.length})</span></h3>
      <p>These fields will not appear on the card students see. Their text is kept if you restore them.</p>
      <ul>{hiddenRows.map(([label, key]) => <li key={key}><span>{label}</span><button className="button small" type="button" onClick={() => restore(key)}>Restore</button>
        <input type="hidden" name={key} value={fieldValues[key] ?? ""} /></li>)}</ul>
    </section> : null}
  </div>;
}
