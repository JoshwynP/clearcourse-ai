// Fictional teaching examples copied from the static preview. No accounts or stored identity.

export const COURSE_PRINCIPLE =
  "Permission to use generative AI is not a recommendation or requirement to use it. Students will not receive an advantage merely for using AI. Any transparency bonus rewards evidence and reflection about the learning process, whether that process involved AI or not.";

export const ASSIGNMENT_PRINCIPLE =
  "This assignment does not require you to use AI. If you choose to use it, the rules below explain what is permitted and what must be disclosed. The optional transparency-of-process bonus is available equally to students who use AI and students who do not.";

export const policyLinks = [
  {
    label: "Policy 71",
    href: "https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policy-71",
  },
  {
    label: "Guidelines for the Assessment of Penalties",
    href: "https://uwaterloo.ca/secretariat/policies-procedures-guidelines/guidelines/guidelines-assessment-penalties",
  },
] as const;

export type CardText = {
  allowed: string;
  notAllowed: string;
  disclose: string;
};

export type Assignment = CardText & {
  id: string;
  title: string;
  due: string;
  status: string;
  updated: string;
  learning: string;
  difference: string;
};

export type Reply = {
  role: string;
  text: string;
};

export type Question = {
  id: number;
  tag: string;
  title: string;
  body: string;
  votes: number;
  replies: Reply[];
  time: string;
  voted: boolean;
};

export type SampleCourse = {
  id: string;
  code: string;
  name: string;
  term: string;
  card: CardText & {
    title: string;
    status: string;
    updated: string;
    summary: string;
  };
  assignments: Assignment[];
  questions: Question[];
};

export const courses: SampleCourse[] = [
  {
    id: "sds",
    code: "SDS 210",
    name: "Technology & society",
    term: "Fall 2026",
    card: {
      title: "Course AI guidance",
      status: "Published example",
      updated: "September 8, 2026",
      summary:
        "Generative AI can be used for early exploration, but your analysis and final writing must be your own.",
      allowed:
        "Brainstorming possible directions, testing an outline, and checking your understanding of concepts.",
      notAllowed: "Submitting generated writing as your own analysis or using AI to replace required reading.",
      disclose: "Briefly state which tool you used, for what purpose, and what you changed or rejected.",
    },
    assignments: [
      {
        id: "essay",
        title: "Critical response essay",
        due: "Oct 24",
        status: "Published example",
        updated: "October 2, 2026",
        learning: "Develop an argument from course readings and evidence.",
        allowed: "Use AI to brainstorm a question or compare possible outlines.",
        notAllowed: "Do not generate the final analysis, evidence, citations, or paragraphs for submission.",
        disclose:
          "If you use AI, include a short process note about the tool, prompts, and how you evaluated its suggestions.",
        difference:
          "The course card permits concept checks. For this essay, AI-generated final analysis is explicitly outside the permitted use.",
      },
      {
        id: "presentation",
        title: "Seminar presentation",
        due: "Nov 12",
        status: "Published example",
        updated: "October 6, 2026",
        learning: "Explain a course concept clearly to classmates.",
        allowed: "Use AI to rehearse questions your audience may ask.",
        notAllowed: "Do not use AI to prepare the explanation you present as your own.",
        disclose: "Mention any rehearsal use in your speaker notes.",
        difference: "This assignment permits AI for rehearsal only.",
      },
    ],
    questions: [
      {
        id: 1,
        tag: "essay",
        title: "Can I use AI to help narrow down my essay topic?",
        body: "I have a few ideas but I'm not sure which one is focused enough for the word limit.",
        votes: 12,
        replies: [
          {
            role: "Instructor",
            text: "Yes. Brainstorming and comparing directions is allowed. Your final argument and analysis should come from your own reading and reasoning.",
          },
        ],
        time: "Example conversation",
        voted: false,
      },
      {
        id: 2,
        tag: "course",
        title: "What counts as a disclosure if I only used AI for brainstorming?",
        body: "Would a short note at the end be enough?",
        votes: 8,
        replies: [
          {
            role: "Instructor",
            text: "A short process note is appropriate. Say which tool you used, what you asked it to help with, and what you chose to keep or reject.",
          },
        ],
        time: "Example conversation",
        voted: false,
      },
      {
        id: 3,
        tag: "presentation",
        title: "Could we use AI to practice possible audience questions?",
        body: "I want to prepare for the discussion after our presentation.",
        votes: 5,
        replies: [],
        time: "Example conversation",
        voted: false,
      },
    ],
  },
  {
    id: "engl",
    code: "ENGL 109",
    name: "Introduction to writing",
    term: "Fall 2026",
    card: {
      title: "Course AI guidance",
      status: "Published example",
      updated: "September 10, 2026",
      summary:
        "Use generative AI as a conversation partner while keeping your drafting and revision decisions your own.",
      allowed: "Discuss possible structures and ask for explanations of writing concepts.",
      notAllowed: "Submit generated prose as original writing or fabricate references.",
      disclose: "Describe any AI assistance in a short note accompanying the assignment.",
    },
    assignments: [
      {
        id: "narrative",
        title: "Literacy narrative",
        due: "Oct 30",
        status: "Published example",
        updated: "October 1, 2026",
        learning: "Reflect on a personal experience with language and writing.",
        allowed: "Use AI to ask questions about structure after making your own outline.",
        notAllowed: "Do not generate personal memories or draft the narrative with AI.",
        disclose: "If used, briefly describe how the conversation influenced your structure.",
        difference:
          "Unlike the broader course guidance, AI may assist with structure only after your own outline exists.",
      },
    ],
    questions: [
      {
        id: 4,
        tag: "narrative",
        title: "Can I ask AI to suggest a different order for my paragraphs?",
        body: "I already have a complete outline and want to compare structures.",
        votes: 4,
        replies: [],
        time: "Example conversation",
        voted: false,
      },
    ],
  },
];

export function getCourse(courseId: string): SampleCourse | undefined {
  return courses.find((course) => course.id === courseId);
}

export function tagLabel(course: SampleCourse, tag: string): string {
  if (tag === "course") return "Course";
  return course.assignments.find((assignment) => assignment.id === tag)?.title ?? "Assignment";
}

export function isAllowedTag(course: SampleCourse, tag: string): boolean {
  return tag === "course" || course.assignments.some((assignment) => assignment.id === tag);
}
