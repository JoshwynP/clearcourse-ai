export type CustomCardField = { id: string; label: string; value: string };
export type CardLayout = { hiddenFields: string[]; customFields: CustomCardField[] };

export function normalizeCardLayout(input: unknown, allowedKeys: readonly string[]): CardLayout {
  if (!input || typeof input !== "object") return { hiddenFields: [], customFields: [] };
  const record = input as { hiddenFields?: unknown; customFields?: unknown };
  const allowed = new Set(allowedKeys);
  const hiddenFields = Array.isArray(record.hiddenFields)
    ? [...new Set(record.hiddenFields.filter((key): key is string => typeof key === "string" && allowed.has(key)))]
    : [];
  const seen = new Set<string>();
  const customFields: CustomCardField[] = [];
  if (Array.isArray(record.customFields)) for (const item of record.customFields.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const field = item as Record<string, unknown>;
    const id = typeof field.id === "string" ? field.id : "";
    const label = typeof field.label === "string" ? field.label.trim().slice(0, 80) : "";
    const value = typeof field.value === "string" ? field.value.trim().slice(0, 2000) : "";
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !label || seen.has(id)) continue;
    seen.add(id);
    customFields.push({ id, label, value });
  }
  return { hiddenFields, customFields };
}

export function parseCardLayout(value: FormDataEntryValue | null, allowedKeys: readonly string[]): CardLayout | null {
  if (typeof value !== "string" || value.length > 50000) return null;
  try {
    const raw = JSON.parse(value);
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.hiddenFields) || !Array.isArray(raw.customFields)) return null;
    if (raw.hiddenFields.length > allowedKeys.length || raw.customFields.length > 20) return null;
    const layout = normalizeCardLayout(raw, allowedKeys);
    if (layout.hiddenFields.length !== raw.hiddenFields.length || layout.customFields.length !== raw.customFields.length) return null;
    return layout;
  } catch { return null; }
}
