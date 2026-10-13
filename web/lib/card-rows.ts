import type { AssignmentDetails } from "@/lib/app-store";
import type { CardFields } from "@/lib/identity-model";

export type CourseFieldKey = Exclude<keyof CardFields, "layout">;
export type AssignmentFieldKey = Exclude<keyof AssignmentDetails, "layout">;

export const courseRows: [string, CourseFieldKey][] = [
  ["What counts as generative AI", "counts"],
  ["Whether generative AI is generally permitted", "permitted"],
  ["General course guidance", "summary"], ["Uses generally allowed", "allowed"],
  ["Uses generally prohibited", "notAllowed"], ["General disclosure requirements", "disclose"],
  ["Transparency-of-process expectations", "transparency"],
  ["How suspected inappropriate use is addressed", "suspected"],
  ["Institutional-policy warning", "warning"], ["Additional resources", "resources"],
];

export const assignmentRows: [string, AssignmentFieldKey][] = [
  ["Due date", "due"], ["Learning being assessed", "learning"], ["Is AI permitted?", "permitted"],
  ["When AI is allowed", "allowed"], ["When AI is not allowed", "notAllowed"],
  ["When disclosure is required", "disclose"], ["When disclosure is not required", "discloseNot"],
  ["When process evidence is requested", "processRequested"],
  ["When process evidence is not requested", "processNot"],
  ["Optional transparency bonus percentage", "bonusPercent"],
  ["Requirements for receiving the transparency bonus", "bonusRequirements"],
  ["Resources", "resources"], ["Other optional information", "other"],
  ["LEARN submission link", "learn"],
];

export const courseEditableKeys: CourseFieldKey[] = ["opening", ...courseRows.map(([, key]) => key)];
export const assignmentEditableKeys: AssignmentFieldKey[] = ["opening", ...assignmentRows.map(([, key]) => key)];
