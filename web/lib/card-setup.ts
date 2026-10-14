export const SUGGESTED_OPENING =
  "Permission to use generative AI does not mean students are expected or required to use it. Any transparency bonus rewards reflection and evidence of the learning process equally whether or not AI was used.";

export type SetupKind = "course" | "assignment";

export type SetupQuestion = {
  id: string;
  prompt: string;
  explanation: string;
  why: string;
  rule: Record<SetupKind, string>;
  choices?: readonly ["Yes", "No"];
};

const yesNo = ["Yes", "No"] as const;

export const setupQuestions: SetupQuestion[] = [
  {
    id: "learning",
    prompt: "What learning is being assessed?",
    explanation: "Assignment cards show this in Learning being assessed. The course card shows it in General course guidance.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into General course guidance.",
      assignment: "Your answer is copied into Learning being assessed.",
    },
  },
  {
    id: "independent",
    prompt: "Which work must students perform independently?",
    explanation: "This answer is placed in the same field as What is prohibited?",
    why: "Both answers are copied into the prohibited-use field. You can edit or clear that field afterward.",
    rule: {
      course: "Your answer is copied into Uses generally prohibited, before the answer to What is prohibited?, with a blank line between them and no added labels.",
      assignment: "Your answer is copied into When AI is not allowed, before the answer to What is prohibited?, with a blank line between them and no added labels.",
    },
  },
  {
    id: "assist",
    prompt: "Could AI assist without replacing that learning?",
    explanation: "This question stays in the setup sequence.",
    why: "The answer is not copied onto the card.",
    rule: {
      course: "A Yes or No here does not change Whether generative AI is generally permitted.",
      assignment: "A Yes or No here does not change Is AI permitted?",
    },
    choices: yesNo,
  },
  {
    id: "permitted",
    prompt: "Is AI permitted?",
    explanation: "This is the permission field students read on the card.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into Whether generative AI is generally permitted.",
      assignment: "Your answer is copied into Is AI permitted?",
    },
    choices: yesNo,
  },
  {
    id: "stages",
    prompt: "At which stages?",
    explanation: "This is where the card lists the stages of work.",
    why: "Your answer is copied into the allowed-use field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into Uses generally allowed.",
      assignment: "Your answer is copied into When AI is allowed.",
    },
  },
  {
    id: "prohibited",
    prompt: "What is prohibited?",
    explanation: "This answer follows the independent-work answer in the prohibited-use field.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into Uses generally prohibited, after the answer to Which work must students perform independently?, with a blank line between them and no added labels.",
      assignment: "Your answer is copied into When AI is not allowed, after the answer to Which work must students perform independently?, with a blank line between them and no added labels.",
    },
  },
  {
    id: "disclose",
    prompt: "What must be disclosed?",
    explanation: "This is the disclosure field on the card.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into General disclosure requirements.",
      assignment: "Your answer is copied into When disclosure is required.",
    },
  },
  {
    id: "evidence",
    prompt: "What process evidence could support reflection?",
    explanation: "This is the process-evidence field on the card.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into Transparency-of-process expectations.",
      assignment: "Your answer is copied into When process evidence is requested.",
    },
  },
  {
    id: "bonus",
    prompt: "Is a transparency bonus offered?",
    explanation: "A Yes answer can fill a blank opening statement with the suggested wording.",
    why: "A No leaves the opening statement as it is. You can edit or clear a filled statement afterward.",
    rule: {
      course: `If you answer Yes and Opening statement is blank, this wording is copied in: "${SUGGESTED_OPENING}"`,
      assignment: `If you answer Yes and Opening statement is blank, this wording is copied in: "${SUGGESTED_OPENING}"`,
    },
    choices: yesNo,
  },
  {
    id: "bonusValue",
    prompt: "What is its value?",
    explanation: "Assignment cards have a field for the optional transparency bonus percentage.",
    why: "The percentage is copied only when a transparency bonus is offered, and only onto an assignment card.",
    rule: {
      course: "The course card has no bonus-percentage field, so this answer is not copied onto the course card.",
      assignment: "If a transparency bonus is offered, your answer is copied into Optional transparency bonus percentage.",
    },
  },
  {
    id: "resources",
    prompt: "What resources should students receive?",
    explanation: "This is the resources field on the card.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into Additional resources.",
      assignment: "Your answer is copied into Resources.",
    },
  },
  {
    id: "suspected",
    prompt: "What happens if inappropriate use is suspected?",
    explanation: "The course card has a field for this. An assignment card stores it in Other optional information.",
    why: "Your answer is copied into that field. You can edit or clear it afterward.",
    rule: {
      course: "Your answer is copied into How suspected inappropriate use is addressed.",
      assignment: "Your answer is copied into Other optional information.",
    },
  },
];

function clean(value: string | undefined) {
  return (value ?? "").trim().slice(0, 2000);
}

function joinParts(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

export function applySetupAnswers(
  kind: SetupKind,
  current: Record<string, string>,
  answers: Record<string, string>,
): Record<string, string> {
  const next = { ...current };
  const set = (key: string, value: string) => {
    const text = clean(value);
    if (text) next[key] = text;
  };
  const answer = (id: string) => clean(answers[id]);
  const bonus = answer("bonus").toLowerCase() === "yes";
  if (kind === "course") set("summary", answer("learning"));
  else set("learning", answer("learning"));
  set("permitted", answer("permitted"));
  set("allowed", answer("stages"));
  set("notAllowed", joinParts([answer("independent"), answer("prohibited")]));
  set("disclose", answer("disclose"));
  if (kind === "course") set("transparency", answer("evidence"));
  else set("processRequested", answer("evidence"));
  set("resources", answer("resources"));
  if (kind === "course") set("suspected", answer("suspected"));
  else set("other", answer("suspected"));
  if (bonus && !clean(current.opening)) set("opening", SUGGESTED_OPENING);
  if (kind === "assignment" && bonus) set("bonusPercent", answer("bonusValue"));
  return next;
}

export function exampleFields(kind: SetupKind, questionId: string) {
  switch (questionId) {
    case "learning": return ["learning"];
    case "independent":
    case "prohibited": return ["notAllowed"];
    case "permitted": return ["permitted"];
    case "stages": return ["allowed"];
    case "disclose": return ["disclose"];
    case "evidence": return ["processRequested"];
    case "resources": return ["resources"];
    case "suspected": return ["other"];
    case "bonusValue": return kind === "assignment" ? ["bonusPercent"] : [];
    default: return [];
  }
}

export function examplesForQuestions(kind: SetupKind, buckets: Record<string, string[]>) {
  return Object.fromEntries(setupQuestions.map((question) => {
    const texts = exampleFields(kind, question.id).flatMap((field) => buckets[field] ?? []);
    return [question.id, [...new Set(texts)].slice(0, 12)];
  }));
}
