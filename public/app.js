const SUGGESTED_OPENING = "Permission to use generative AI does not mean students are expected or required to use it. Any transparency bonus rewards reflection and evidence of the learning process equally whether or not AI was used.";
const NA = "Not applicable";
const POLICY_LINKS = [
  ["Policy 71", "https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policy-71"],
  ["Guidelines for the Assessment of Penalties", "https://uwaterloo.ca/secretariat/policies-procedures-guidelines/guidelines/guidelines-assessment-penalties"]
];

const COURSE_ROWS = [
  ["counts", "What counts as generative AI"],
  ["permitted", "Whether generative AI is generally permitted"],
  ["allowed", "Uses generally allowed"],
  ["notAllowed", "Uses generally prohibited"],
  ["disclose", "General disclosure requirements"],
  ["transparency", "General transparency-of-process expectations"],
  ["suspected", "How suspected inappropriate use is addressed"],
  ["warning", "Institutional-policy warning"],
  ["__policy71", "Policy 71 link"],
  ["__penalties", "Guidelines for the Assessment of Penalties link"],
  ["resources", "Additional resources"],
  ["updated", "Last updated date"],
  ["version", "Version history"],
  ["status", "Published status"]
];

const ASSIGNMENT_ROWS = [
  ["title", "Assignment title"],
  ["identifier", "Assignment identifier"],
  ["due", "Due date"],
  ["learning", "Learning being assessed"],
  ["permitted", "Is AI permitted?"],
  ["allowed", "When AI is allowed"],
  ["notAllowed", "When AI is not allowed"],
  ["disclose", "When disclosure is required"],
  ["discloseNot", "When disclosure is not required"],
  ["processRequested", "When process evidence is requested"],
  ["processNot", "When process evidence is not requested"],
  ["bonusPercent", "Optional transparency bonus percentage"],
  ["bonusRequirements", "Requirements for receiving the transparency bonus"],
  ["resources", "Resources"],
  ["other", "Other optional information"],
  ["learn", "LEARN submission link"],
  ["__policies", "Policy links"],
  ["status", "Status"],
  ["version", "Version history"],
  ["published", "Published date"],
  ["updated", "Last updated date"]
];

const OVERRIDE_KEYS = { allowed: "allowed", notAllowed: "notAllowed", disclose: "disclose" };

// Fictional teaching examples. No user account, network request, or persistent storage exists in this demo.
const courses = {
  sds: {
    code: "SDS 210", name: "Technology & society", term: "Fall 2026", participationBonus: true,
    courseCard: {
      title: "Course AI card", status: "Visible in this preview", visibility: "preview", updated: "September 8, 2026", opening: SUGGESTED_OPENING,
      counts: NA,
      permitted: "Generative AI can be used for early exploration, but your analysis and final writing must be your own.",
      allowed: "Brainstorming possible directions, testing an outline, and checking your understanding of concepts.",
      notAllowed: "Submitting generated writing as your own analysis or using AI to replace required reading.",
      disclose: "Briefly state which tool you used, for what purpose, and what you changed or rejected.",
      transparency: NA, suspected: NA, warning: NA, resources: NA, version: NA
    },
    assignments: [
      {
        id: "essay", identifier: "essay", title: "Critical response essay", due: "Oct 24", status: "Visible in this preview", visibility: "preview", updated: "October 2, 2026", published: NA,
        learning: "Develop an argument from course readings and evidence.",
        permitted: "Yes",
        allowed: "Use AI to brainstorm a question or compare possible outlines.",
        notAllowed: "Do not generate the final analysis, evidence, citations, or paragraphs for submission. The course card permits concept checks. For this essay, AI-generated final analysis is explicitly outside the permitted use.",
        disclose: "If you use AI, include a short process note about the tool, prompts, and how you evaluated its suggestions.",
        discloseNot: NA, processRequested: NA, processNot: NA, bonusPercent: NA, bonusRequirements: NA, resources: NA, other: NA, learn: NA, version: NA,
        opening: SUGGESTED_OPENING
      },
      {
        id: "presentation", identifier: "presentation", title: "Seminar presentation", due: "Nov 12", status: "Visible in this preview", visibility: "preview", updated: "October 6, 2026", published: NA,
        learning: "Explain a course concept clearly to classmates.",
        permitted: "Yes",
        allowed: "Use AI to rehearse questions your audience may ask. This assignment permits AI for rehearsal only.",
        notAllowed: "Do not use AI to prepare the explanation you present as your own.",
        disclose: "Mention any rehearsal use in your speaker notes.",
        discloseNot: NA, processRequested: NA, processNot: NA, bonusPercent: NA, bonusRequirements: NA, resources: NA, other: NA, learn: NA, version: NA,
        opening: SUGGESTED_OPENING
      }
    ],
    questions: [
      { id: 1, tag: "essay", title: "Can I use AI to help narrow down my essay topic?", body: "I have a few ideas but I'm not sure which one is focused enough for the word limit.", votes: 12, replies: [{ role: "Instructor", text: "Yes. Brainstorming and comparing directions is allowed. Your final argument and analysis should come from your own reading and reasoning." }], time: "Example conversation", voted: false },
      { id: 2, tag: "course", title: "What counts as a disclosure if I only used AI for brainstorming?", body: "Would a short note at the end be enough?", votes: 8, replies: [{ role: "Instructor", text: "A short process note is appropriate. Say which tool you used, what you asked it to help with, and what you chose to keep or reject." }], time: "Example conversation", voted: false },
      { id: 3, tag: "presentation", title: "Could we use AI to practice possible audience questions?", body: "I want to prepare for the discussion after our presentation.", votes: 5, replies: [], time: "Example conversation", voted: false }
    ]
  },
  engl: {
    code: "ENGL 109", name: "Introduction to writing", term: "Fall 2026", participationBonus: false,
    courseCard: {
      title: "Course AI card", status: "Visible in this preview", visibility: "preview", updated: "September 10, 2026", opening: SUGGESTED_OPENING,
      counts: NA,
      permitted: "Use generative AI as a conversation partner while keeping your drafting and revision decisions your own.",
      allowed: "Discuss possible structures and ask for explanations of writing concepts.",
      notAllowed: "Submit generated prose as original writing or fabricate references.",
      disclose: "Describe any AI assistance in a short note accompanying the assignment.",
      transparency: NA, suspected: NA, warning: NA, resources: NA, version: NA
    },
    assignments: [
      {
        id: "narrative", identifier: "narrative", title: "Literacy narrative", due: "Oct 30", status: "Visible in this preview", visibility: "preview", updated: "October 1, 2026", published: NA,
        learning: "Reflect on a personal experience with language and writing.",
        permitted: "Yes",
        allowed: "Use AI to ask questions about structure after making your own outline. Unlike the broader course guidance, AI may assist with structure only after your own outline exists.",
        notAllowed: "Do not generate personal memories or draft the narrative with AI.",
        disclose: "If used, briefly describe how the conversation influenced your structure.",
        discloseNot: NA, processRequested: NA, processNot: NA, bonusPercent: NA, bonusRequirements: NA, resources: NA, other: NA, learn: NA, version: NA,
        opening: SUGGESTED_OPENING
      }
    ],
    questions: [
      { id: 4, tag: "narrative", title: "Can I ask AI to suggest a different order for my paragraphs?", body: "I already have a complete outline and want to compare structures.", votes: 4, replies: [], time: "Example conversation", voted: false }
    ]
  }
};

const state = { course: "sds", view: "signin", filter: "all", search: "", card: "course", expanded: null, role: null, editing: false };
const privateParticipation = {
  sds: { questions: 0, comments: 0, upvotes: 0 },
  engl: { questions: 0, comments: 0, upvotes: 0 }
};
const sharedLevels = { sds: null, engl: null };
const SHARE_NOTICE = "Your instructor will receive your name and participation level. Your instructor will not receive your questions, comments, upvotes, dates, or activity breakdown.";
const root = document.querySelector("#view-root");
const dialog = document.querySelector("#compose-dialog");
const toast = document.querySelector("#toast");
let toastTimer;

function esc(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function current() { return courses[state.course]; }
function tagName(tag) { return tag === "course" ? "Course" : current().assignments.find(item => item.id === tag)?.title || "Assignment"; }
function assignmentById(id) { return current().assignments.find(item => item.id === id); }
function textOf(card, key) {
  const value = String(card?.[key] ?? "").trim();
  return value || NA;
}
function assignmentLabel(item) { return textOf(item, "title") === NA ? "New assignment card" : item.title; }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200); }
function participationLevel(counts) {
  const posts = counts.questions + counts.comments;
  if (posts >= 2 && counts.upvotes >= 3) return "Sustained Contributor";
  if (posts >= 1 && counts.upvotes >= 1) return "Contributor";
  return "No Record";
}
function recordParticipation(kind) {
  if (state.role !== "student") return;
  const counts = privateParticipation[state.course];
  if (kind === "upvote") counts.upvotes += 1;
  if (kind === "upvote-remove") counts.upvotes = Math.max(0, counts.upvotes - 1);
  if (kind === "question") counts.questions += 1;
  if (kind === "comment") counts.comments += 1;
  const shared = sharedLevels[state.course];
  if (shared) shared.level = participationLevel(counts);
}
function intro(eyebrow, title, subtitle, action = "") { return `<div class="page-intro"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${action}</div>`; }

function policyLink(label, href) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function linkCell(key) {
  if (key === "__policy71") return policyLink(POLICY_LINKS[0][0], POLICY_LINKS[0][1]);
  if (key === "__penalties") return policyLink(POLICY_LINKS[1][0], POLICY_LINKS[1][1]);
  return POLICY_LINKS.map(([label, href]) => policyLink(label, href)).join("<br>");
}

function learnCell(value) {
  const text = String(value ?? "").trim() || NA;
  if (text === NA) return `${esc(NA)}. This sample does not accept files.`;
  if (/^https:\/\/\S+$/.test(text)) return `<a href="${esc(text)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
  return esc(text);
}

function overridesCourse(assignment, key) {
  const courseKey = OVERRIDE_KEYS[key];
  if (!courseKey) return false;
  const value = textOf(assignment, key);
  if (value === NA) return false;
  const courseValue = textOf(current().courseCard, courseKey);
  return courseValue === NA || value !== courseValue;
}

function studentCell(card, key, assignment) {
  if (key.startsWith("__")) return linkCell(key);
  if (key === "learn") return learnCell(card.learn);
  const value = textOf(card, key);
  const mark = assignment && overridesCourse(assignment, key) ? `<span class="override-note">Overrides the course card</span>` : "";
  return `${esc(value)}${mark}`;
}

function cardTable(rows, card, assignment, caption) {
  const body = rows.map(([key, label]) => `<tr><th scope="row">${esc(label)}</th><td>${studentCell(card, key, assignment)}</td></tr>`).join("");
  return `<table class="card-table"><caption class="sr-only">${esc(caption)}</caption><tbody>${body}</tbody></table>`;
}

function openingCallout(card) {
  const text = String(card?.opening || "").trim();
  return text ? `<div class="callout">${esc(text)}</div>` : "";
}

function editorField(key, label, value, allowNa, note) {
  const raw = String(value ?? "").trim();
  const shown = allowNa ? (raw || NA) : raw;
  const na = allowNa && shown === NA;
  const toggle = allowNa ? `<label class="na-toggle"><input type="checkbox" data-na="${esc(key)}" ${na ? "checked" : ""}> Not applicable</label>` : "";
  const caption = note ? `<p class="section-caption">${esc(note)}</p>` : "";
  return `<tr><th scope="row"><label for="field-${esc(key)}">${esc(label)}</label></th><td>${toggle}${caption}<textarea id="field-${esc(key)}" data-field="${esc(key)}" ${na ? "disabled" : ""}>${esc(shown)}</textarea></td></tr>`;
}

function cardById(id) {
  return id === "course" ? current().courseCard : assignmentById(id);
}

function visibleCard(card) {
  return card && card.visibility !== "draft";
}

function editorTable(rows, card, extraRows = "") {
  const body = rows.map(([key, label]) => {
    if (key.startsWith("__")) return `<tr><th scope="row">${esc(label)}</th><td>${linkCell(key)}</td></tr>`;
    return editorField(key, label, card[key], true);
  }).join("");
  return `<table class="editor-table"><caption class="sr-only">Card editor</caption><tbody>${extraRows}${body}</tbody></table>`;
}

function renderSignIn() {
  if (state.view === "signin-professor" || state.view === "signin-student") {
    const professor = state.view === "signin-professor";
    return `<div class="page"><div class="page-intro"><div><h1>${professor ? "Professor sign-in" : "Student sign-in"}</h1><p class="page-subtitle">A fictional role for this browser tab.</p></div></div>
      <section class="panel signin-card signin-single"><p>${professor ? "Continue as a sample professor. You can manage example AI cards in this tab." : "Continue as a sample student. The discussion board uses example questions."}</p><p>This preview does not authenticate University of Waterloo users, does not save a sign-in, and does not accept real student information. It does not provide real anonymous posting.</p><div class="signin-actions"><button class="button primary" type="button" data-action="enter" data-role="${professor ? "professor" : "student"}">Continue</button><button class="button" type="button" data-view="signin">Back</button></div></section></div>`;
  }
  return `<div class="page"><div class="page-intro"><div><h1>Sign in</h1><p class="page-subtitle">Choose Professor or Student for this preview.</p></div></div>
    <p class="preview-note">This is a fictional preview. It does not authenticate University of Waterloo users, and it does not save a sign-in.</p>
    <div class="signin-grid"><section class="panel signin-card"><h2>Professor</h2><p>Open the sample courses and manage example AI cards.</p><button class="button primary" type="button" data-view="signin-professor">Professor sign-in</button></section>
    <section class="panel signin-card"><h2>Student</h2><p>Open the sample courses and the discussion board. This is not real anonymous posting.</p><button class="button primary" type="button" data-view="signin-student">Student sign-in</button></section></div></div>`;
}

function renderHome() {
  const items = Object.entries(courses).map(([id, item]) => `<li><button class="course-option" type="button" data-course="${id}" data-view="conversation"><strong>${esc(item.code)}</strong><small>${esc(item.name)}</small></button></li>`).join("");
  const who = state.role === "professor" ? "sample professor" : "sample student";
  return `<div class="page"><div class="page-intro"><div><h1>Home</h1><p class="page-subtitle">AI guidance, made clear</p></div></div><p class="preview-note">ClearCourse AI helps instructors state clearly, per course and per assignment, how generative AI may and may not be used.</p><p class="preview-note">You are in this tab as a ${who}. Nothing is saved when you reload.</p><h2 class="section-title">Sample courses</h2><ul class="home-list">${items}</ul></div>`;
}

function renderChrome() {
  const signedIn = Boolean(state.role);
  const course = current();
  const onHome = state.view === "home";
  const section = { conversation: "Discussion board", cards: "AI cards", instructor: "Manage My Cards", participation: state.role === "professor" ? "Class participation" : "My participation" }[state.view] || "Discussion board";
  const slot = document.querySelector("#session-slot");
  if (slot) {
    slot.innerHTML = signedIn ? `<span class="session-label">${state.role === "professor" ? "Professor preview" : "Student preview"}</span><button type="button" class="text-link" data-action="sign-out">Leave preview</button>` : "";
  }
  document.querySelector("#crumb").innerHTML = !signedIn
    ? `<strong>Sign in</strong>`
    : onHome
      ? `<strong>Home</strong>`
      : `<button type="button" data-view="home">Home</button><span aria-hidden="true">/</span><button type="button" data-course="${esc(state.course)}" data-view="conversation">${esc(course.code)}</button><span aria-hidden="true">/</span><strong>${section}</strong>`;
  const sections = [
    ["conversation", "Discussion board"],
    ["cards", "AI cards"],
    ["participation", state.role === "professor" ? "Class participation" : "My participation"],
    ...(state.role === "professor" ? [["instructor", "Manage My Cards"]] : [])
  ];
  const brand = document.querySelector(".masthead .brand-link");
  if (brand) {
    if (!signedIn || onHome) brand.setAttribute("aria-current", "page");
    else brand.removeAttribute("aria-current");
  }
  document.querySelector("#course-nav").innerHTML = signedIn ? Object.entries(courses).map(([id, item]) => {
    const open = state.course === id && !onHome;
    const links = open
      ? `<nav class="course-sections" aria-label="${esc(item.code)} sections">${sections.map(([view, label]) => `<button class="nav-item${state.view === view ? " active" : ""}" type="button" data-course="${id}" data-view="${view}"${state.view === view ? ' aria-current="page"' : ""}>${label}</button>`).join("")}</nav>`
      : "";
    return `<div class="course-group${open ? " current" : ""}"><button class="course-option${open ? " active" : ""}" type="button" data-course="${id}" data-view="conversation" aria-expanded="${open}"><strong>${esc(item.code)}</strong><small>${esc(item.name)}</small></button>${links}</div>`;
  }).join("") : `<p class="sidebar-wait">Sign in to open the sample courses.</p>`;
}

function render() {
  if (state.role === "student" && state.view === "instructor") state.view = "home";
  renderChrome();
  if (!state.role) {
    root.innerHTML = renderSignIn();
    return;
  }
  const page = { home: renderHome, cards: renderCards, instructor: renderStudio, participation: renderParticipation, conversation: renderConversation }[state.view] || renderConversation;
  root.innerHTML = page();
}

function renderConversation() {
  const course = current();
  const q = state.search.trim().toLowerCase();
  const posts = course.questions.filter(post => (state.filter === "all" || post.tag === state.filter) && (!q || `${post.title} ${post.body}`.toLowerCase().includes(q)));
  const assignmentSelected = course.assignments.some(item => item.id === state.filter);
  const bonus = course.participationBonus
    ? `<p class="preview-note anonymity-note">This example course includes an optional transparency-of-process bonus, available equally whether or not a student uses AI. This preview does not award that bonus.</p>`
    : "";
  const assignmentOptions = course.assignments.map(item => `<option value="${esc(item.id)}"${state.filter === item.id ? " selected" : ""}>${esc(assignmentLabel(item))}</option>`).join("");
  return `<div class="page">${intro(course.term, course.code + " · " + course.name, "Questions and AI guidelines for this course.")}
    <div class="layout"><section class="panel" aria-label="Course questions"><div class="panel-pad"><h2 class="section-title">Discussion board</h2></div>
    <fieldset class="filter-row"><legend id="filter-label">Filter by:</legend><div class="filter-controls"><label class="filter-choice"><input type="radio" name="question-filter" value="all"${state.filter === "all" ? " checked" : ""}> All questions</label><label class="filter-choice"><input type="radio" name="question-filter" value="course"${state.filter === "course" ? " checked" : ""}> General course questions</label><div class="filter-choice${assignmentSelected ? " chosen" : ""}"><label><input type="radio" name="question-filter" value="assignment"${assignmentSelected ? " checked" : ""}> One assignment</label><select id="assignment-filter" aria-label="Which assignment"><option value=""${!assignmentSelected ? " selected" : ""}>Choose assignment</option>${assignmentOptions}</select></div></div></fieldset>
    <div class="board-toolbar"><span class="section-caption">${posts.length} ${posts.length === 1 ? "question" : "questions"}</span><label class="sr-only" for="question-search">Search for a key term.</label><input class="search" type="search" id="question-search" placeholder="Search for a key term." value="${esc(state.search)}"></div>
    <div class="post-list">${posts.length ? posts.map(renderPost).join("") : '<div class="empty">No questions match this view yet.</div>'}</div></section>
    <aside class="side-stack"><section class="panel panel-pad" aria-label="AI cards"><h2 class="section-title">AI cards</h2><button class="button cards-link" type="button" data-action="cards">See your course and assignment<br>AI cards</button></section>
    <section class="panel panel-pad" aria-label="Ask a question"><h2 class="section-title">Ask a question</h2><button class="button" type="button" data-action="compose">Ask a question</button><p class="preview-note anonymity-note">Names are not shown on these example questions. This preview does not provide real anonymous posting and does not accept real student information. Questions you add stay in this browser tab until you reload.</p>${bonus}</section></aside></div></div>`;
}

function renderParticipation() {
  const course = current();
  if (state.role === "professor") {
    const shared = sharedLevels[state.course];
    const rows = shared
      ? `<table class="card-table"><caption class="sr-only">Students who shared a participation level</caption><tbody><tr><th scope="row">Student</th><td>${esc(shared.name)}</td></tr><tr><th scope="row">Participation level</th><td>${esc(shared.level)}</td></tr><tr><th scope="row">When shared</th><td>${esc(shared.when)}</td></tr></tbody></table>`
      : `<p class="empty">No student has shared a participation level in this preview.</p>`;
    return `<div class="page">${intro(course.code, "Class participation", "Levels shared by students in this course.")}
      <section class="panel panel-pad"><h2 class="section-title">Shared levels</h2><p class="preview-note">This list includes only a student who chose to share. It shows the participation level, not the questions, comments, or upvotes behind it. Students who do not share do not appear. This preview is not sent to a real class, and nothing is saved when you reload.</p>${rows}</section></div>`;
  }
  const counts = privateParticipation[state.course];
  const level = participationLevel(counts);
  const shared = sharedLevels[state.course];
  const shareControl = shared
    ? `<p class="preview-note">You are sharing <strong>${esc(shared.level)}</strong> in this preview as Sample student. Stop sharing and your name leaves the professor’s list. The discussion board still does not show your name.</p><button class="button" type="button" data-action="stop-sharing">Stop sharing</button>`
    : `<blockquote class="callout">${esc(SHARE_NOTICE)}</blockquote><button class="button primary" type="button" data-action="share-level">Share my level in this preview</button>`;
  return `<div class="page">${intro(course.code, "My participation", "Your private record for this course.")}
    <section class="panel panel-pad"><h2 class="section-title">This course</h2><p class="preview-note">Questions you ask, comments you add, and upvotes you give in this tab count. Example questions already on the board do not count. Views do not count. Your name is not added to a question, comment, or upvote.</p>
    <table class="card-table"><caption class="sr-only">Private participation counts</caption><tbody>
      <tr><th scope="row">Questions asked</th><td>${counts.questions}</td></tr>
      <tr><th scope="row">Comments added</th><td>${counts.comments}</td></tr>
      <tr><th scope="row">Upvotes given</th><td>${counts.upvotes}</td></tr>
      <tr><th scope="row">Participation level</th><td>${esc(level)}</td></tr>
    </tbody></table>
    <h3 class="participation-heading">How a level is reached</h3>
    <ul class="participation-levels"><li><strong>No Record.</strong> Fewer than one question or comment, or no upvote yet.</li><li><strong>Contributor.</strong> At least one question or comment, and at least one upvote.</li><li><strong>Sustained Contributor.</strong> At least two questions or comments, and at least three upvotes.</li></ul>
    <p class="preview-note">These counts stay in this browser tab. This preview does not save them or send them to a real instructor.</p></section>
    <section class="panel panel-pad participation-share"><h2 class="section-title">Share with your professor</h2><p class="preview-note">You can share the level only. The professor does not receive how many questions, comments, or upvotes you made, or which ones they were.</p>${shareControl}</section></div>`;
}

function renderPost(post) {
  const instructor = post.replies.filter(reply => reply.role === "Instructor");
  const later = post.replies.filter(reply => reply.role !== "Instructor");
  const open = state.expanded === post.id;
  const answers = instructor.map(reply => `<div class="reply"><strong>Instructor answer</strong>${esc(reply.text)}</div>`).join("");
  const comments = later.map(reply => `<div class="reply"><strong>${esc(reply.role)}</strong>${esc(reply.text)}</div>`).join("");
  return `<article class="post"><span class="post-tag ${post.tag === "course" ? "" : "assignment"}">${esc(tagName(post.tag))}</span><h3>${esc(post.title)}</h3><p>${esc(post.body)}</p>${answers ? `<div class="instructor-answer">${answers}</div>` : ""}<div class="post-meta"><button class="vote ${post.voted ? "voted" : ""}" data-vote="${post.id}" aria-label="${post.voted ? "Remove demo upvote from" : "Upvote"} ${esc(post.title)}" aria-pressed="${Boolean(post.voted)}" type="button">${post.voted ? "Upvoted" : "Upvote"} ${post.votes}</button><span>${esc(post.time)}</span></div><details class="comments" data-comments="${post.id}"${open ? " open" : ""}><summary>Comments${later.length ? ` (${later.length})` : ""}</summary>${comments || '<p class="section-caption">No comments yet.</p>'}<form class="reply-actions" data-reply="${post.id}"><input name="reply" maxlength="400" aria-label="Add comment or request clarification" placeholder="Add comment or request clarification" required><button class="button small" type="submit">Add comment</button></form></details></article>`;
}

function renderCards() {
  const course = current();
  const choices = [
    ...(visibleCard(course.courseCard) || state.role === "professor" ? [{ id: "course", title: "Course AI card", subtitle: course.courseCard.status, hidden: !visibleCard(course.courseCard) }] : []),
    ...course.assignments.filter(item => visibleCard(item) || state.role === "professor").map(item => ({ id: item.id, title: assignmentLabel(item), subtitle: item.status, hidden: !visibleCard(item) }))
  ].filter(choice => state.role === "professor" || !choice.hidden);
  if (!choices.length) {
    return `<div class="page">${intro(course.code, "AI cards", "Course and assignment rules for this course.")}<p class="preview-note">No cards are visible in this preview.</p></div>`;
  }
  if (!choices.some(choice => choice.id === state.card)) state.card = choices[0].id;
  const assignment = assignmentById(state.card);
  const card = assignment || course.courseCard;
  const draftNote = card.visibility === "draft" ? `<p class="preview-note">This card is a private draft in this preview, so students do not see it.</p>` : "";
  const article = assignment
    ? `<div class="card-topline"><span class="status-tag">${esc(textOf(assignment, "status"))}</span><span class="section-caption">Updated ${esc(textOf(assignment, "updated"))}</span></div><h2>${esc(assignmentLabel(assignment))}</h2>${draftNote}${openingCallout(assignment)}${cardTable(ASSIGNMENT_ROWS, assignment, assignment, assignmentLabel(assignment))}`
    : `<div class="card-topline"><span class="status-tag">${esc(course.courseCard.status)}</span><span class="section-caption">Updated ${esc(course.courseCard.updated)}</span></div><h2>Course AI card</h2>${draftNote}${openingCallout(course.courseCard)}${cardTable(COURSE_ROWS, course.courseCard, null, "Course AI card")}`;
  const list = choices.length ? choices.map(choice => `<button class="card-choice ${state.card === choice.id ? "active" : ""}" type="button" data-card="${esc(choice.id)}"${state.card === choice.id ? " aria-current=\"page\"" : ""}><strong>${esc(choice.title)}</strong><small>${esc(choice.subtitle)}</small></button>`).join("") : `<p class="preview-note">No cards are visible in this preview.</p>`;
  return `<div class="page">${intro(course.code, "AI cards", "Course and assignment rules for this course.")}
    <div class="card-layout"><nav class="panel card-list" aria-label="Choose an AI card">${list}</nav>
    <article class="panel guidance-card">${choices.length ? article : ""}<section class="guidance-section"><h3>Questions about this card?</h3><p>Bring it into the discussion board so everyone can see the clarification.</p><button class="button small" type="button" data-action="ask-about-card">Ask about this ${assignment ? "assignment" : "course"}</button></section></article></div></div>`;
}

function manageRow(id, title, card) {
  const selected = state.editing && state.card === id;
  const draft = card.visibility === "draft";
  const publish = draft
    ? `<button class="button small" type="button" data-action="publish-card" data-manage="${esc(id)}">Publish to students</button>`
    : `<button class="button small" type="button" data-action="draft-card" data-manage="${esc(id)}">Return to private draft</button>`;
  const remove = id === "course" ? "" : `<button class="button small" type="button" data-action="delete-card" data-manage="${esc(id)}">Delete</button>`;
  return `<li class="manage-item${selected ? " active" : ""}"><div class="manage-copy"><strong>${esc(title)}</strong><span class="status-tag">${esc(draft ? "Private draft" : "Visible in this preview")}</span></div><div class="manage-actions"><button class="button small" type="button" data-action="edit-card" data-manage="${esc(id)}">Edit</button>${publish}${remove}</div></li>`;
}

function renderStudio() {
  const course = current();
  if (state.card !== "course" && !assignmentById(state.card)) { state.card = "course"; state.editing = false; }
  const assignment = assignmentById(state.card);
  const card = assignment || course.courseCard;
  const rows = manageRow("course", "Course AI card", course.courseCard) + course.assignments.map(item => manageRow(item.id, assignmentLabel(item), item)).join("");
  const opening = editorField("opening", "Opening statement", card.opening || "", false, "Optional. You can edit the suggested wording, or leave this blank.");
  const editor = state.editing ? `<form id="studio-form" class="panel studio-form"><h2 class="section-title">Edit ${esc(assignment ? assignmentLabel(assignment) : "Course AI card")}</h2><div class="suggestion"><p class="section-caption">Suggested wording</p><p>${esc(SUGGESTED_OPENING)}</p><button class="button small" type="button" data-action="use-suggestion">Use suggested wording</button></div>${editorTable(assignment ? ASSIGNMENT_ROWS : COURSE_ROWS, card, opening)}<div class="studio-actions"><button type="submit" class="button primary">Save in this demo</button><button type="button" class="button" data-action="cards">View student card</button><button type="button" class="button" data-action="close-editor">Back to cards</button></div></form>` : "";
  return `<div class="page">${intro("Instructor preview", "Manage My Cards", "Choose a course or assignment card.")}
    <div class="notice studio-note"><h3>Preview only</h3><p>Changes stay in this browser tab until you reload. Publishing marks a card visible in this preview. It is not sent to real students. This page does not suggest policy.</p></div>
    <section class="panel manage-panel" aria-label="Cards"><ul class="manage-list">${rows}</ul><div class="manage-create"><button class="button" type="button" data-action="new-card">Create an assignment card</button></div></section>${editor}</div>`;
}

function blankAssignment() {
  const id = "a" + Date.now();
  return {
    id, identifier: id, title: NA, due: NA, learning: NA, permitted: NA, allowed: NA, notAllowed: NA, disclose: NA,
    discloseNot: NA, processRequested: NA, processNot: NA, bonusPercent: NA, bonusRequirements: NA, resources: NA,
    other: NA, learn: NA, status: "Private draft", visibility: "draft", version: NA, published: NA, updated: NA, opening: ""
  };
}

function openCompose(defaultTag = "course") {
  const selector = document.querySelector("#question-tag");
  const tag = defaultTag === "course" || assignmentById(defaultTag) ? defaultTag : "course";
  selector.innerHTML = `<option value="course">General course question</option>${current().assignments.map(item => `<option value="${esc(item.id)}">${esc(assignmentLabel(item))}</option>`).join("")}`;
  selector.value = tag;
  dialog.showModal();
  document.querySelector("#question-title").focus();
}

function collectEditor() {
  const values = {};
  document.querySelectorAll("[data-field]").forEach(field => {
    const key = field.dataset.field;
    const naBox = document.querySelector(`[data-na="${key}"]`);
    values[key] = naBox?.checked ? NA : field.value.trim();
  });
  return values;
}

function saveCard() {
  const assignment = assignmentById(state.card);
  const card = assignment || current().courseCard;
  const values = collectEditor();
  if (assignment && values.identifier && values.identifier !== NA && values.identifier !== assignment.id) {
    const taken = current().assignments.some(item => item !== assignment && (item.id === values.identifier || item.identifier === values.identifier));
    if (taken) {
      showToast("That assignment identifier is already used.");
      return;
    }
    current().questions.forEach(question => { if (question.tag === assignment.id) question.tag = values.identifier; });
    if (state.filter === assignment.id) state.filter = values.identifier;
    state.card = values.identifier;
    assignment.id = values.identifier;
  }
  Object.entries(values).forEach(([key, value]) => {
    if (key === "opening") card.opening = value;
    else card[key] = value || NA;
  });
  render();
  showToast("Sample card updated for this session.");
}

function setCardState(id, draft) {
  const card = cardById(id);
  if (!card) return;
  card.visibility = draft ? "draft" : "preview";
  card.status = draft ? "Private draft" : "Visible in this preview";
}

document.addEventListener("click", event => {
  const courseButton = event.target.closest("[data-course]");
  if (courseButton && state.role) {
    const changingCourse = courseButton.dataset.course !== state.course;
    state.course = courseButton.dataset.course;
    if (courseButton.dataset.view) state.view = courseButton.dataset.view;
    if (state.view !== "instructor") state.editing = false;
    if (changingCourse) { state.filter = "all"; state.search = ""; state.card = "course"; state.expanded = null; state.editing = false; }
    render();
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    const next = viewButton.dataset.view;
    if (!state.role && next !== "signin" && next !== "signin-professor" && next !== "signin-student") {
      state.view = "signin";
    } else {
      state.view = next === "home" && !state.role ? "signin" : next;
    }
    if (next !== "instructor") state.editing = false;
    render();
    return;
  }
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) { state.filter = filterButton.dataset.filter; render(); return; }
  const cardButton = event.target.closest("[data-card]");
  if (cardButton) { state.card = cardButton.dataset.card; state.view = "cards"; render(); return; }
  const voteButton = event.target.closest("[data-vote]");
  if (voteButton) {
    const post = current().questions.find(item => item.id === Number(voteButton.dataset.vote));
    if (post) {
      post.voted = !post.voted;
      post.votes += post.voted ? 1 : -1;
      recordParticipation(post.voted ? "upvote" : "upvote-remove");
      render();
    }
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  const action = actionButton?.dataset.action;
  if (action === "enter") { state.role = actionButton.dataset.role; state.view = "home"; render(); return; }
  if (action === "sign-out") { state.role = null; state.view = "signin"; state.editing = false; state.filter = "all"; state.search = ""; state.card = "course"; state.expanded = null; render(); return; }
  if (action === "compose" || action === "ask-about-card") { openCompose(action === "ask-about-card" ? state.card : "course"); return; }
  if (action === "cards") { state.view = "cards"; render(); return; }
  if (action === "use-suggestion") {
    const field = document.querySelector("#field-opening");
    if (field) { field.value = SUGGESTED_OPENING; field.focus(); }
    return;
  }
  if (action === "edit-card") { state.card = actionButton.dataset.manage; state.editing = true; state.view = "instructor"; render(); return; }
  if (action === "publish-card") { setCardState(actionButton.dataset.manage, false); render(); showToast("Visible in this preview. This demo does not publish to real students."); return; }
  if (action === "draft-card") { setCardState(actionButton.dataset.manage, true); render(); showToast("Returned to a private draft in this preview."); return; }
  if (action === "delete-card") {
    const id = actionButton.dataset.manage;
    if (id === "course") return;
    current().assignments = current().assignments.filter(item => item.id !== id);
    if (state.card === id) { state.card = "course"; state.editing = false; }
    if (state.filter === id) state.filter = "all";
    render();
    showToast("Assignment card removed from this preview.");
    return;
  }
  if (action === "close-editor") { state.editing = false; render(); return; }
  if (action === "share-level") {
    if (state.role !== "student") return;
    const counts = privateParticipation[state.course];
    sharedLevels[state.course] = { name: "Sample student", level: participationLevel(counts), when: "Shared in this preview" };
    render();
    showToast("Level shared in this preview. Questions and comments stay unnamed.");
    return;
  }
  if (action === "stop-sharing") {
    sharedLevels[state.course] = null;
    render();
    showToast("Sharing stopped in this preview.");
    return;
  }
  if (action === "new-card") {
    const created = blankAssignment();
    current().assignments.push(created);
    state.card = created.id;
    state.view = "instructor";
    state.editing = true;
    render();
    return;
  }
  if (event.target.closest("[data-close-dialog]")) dialog.close();
});

document.addEventListener("toggle", event => {
  const details = event.target;
  if (!(details instanceof HTMLDetailsElement) || !details.matches("[data-comments]")) return;
  const id = Number(details.dataset.comments);
  if (details.open) state.expanded = id;
  else if (state.expanded === id) state.expanded = null;
}, true);

document.addEventListener("change", event => {
  if (event.target.name === "question-filter") {
    if (event.target.value === "assignment") {
      const selected = document.querySelector("#assignment-filter")?.value;
      if (!selected) { document.querySelector("#assignment-filter")?.focus(); return; }
      state.filter = selected;
    } else state.filter = event.target.value;
    render();
    return;
  }
  if (event.target.id === "assignment-filter") { state.filter = event.target.value || "all"; render(); return; }
  if (event.target.matches("[data-na]")) {
    const area = event.target.closest("td, .field")?.querySelector("[data-field]");
    if (!area) return;
    if (event.target.checked) {
      area.value = NA;
      area.disabled = true;
    } else {
      if (area.value === NA) area.value = "";
      area.disabled = false;
      area.focus();
    }
  }
});

document.addEventListener("input", event => {
  if (event.target.id !== "question-search") return;
  const pos = event.target.selectionStart;
  state.search = event.target.value;
  render();
  const field = document.querySelector("#question-search");
  if (!field) return;
  field.focus();
  field.setSelectionRange(pos, pos);
});

document.addEventListener("submit", event => {
  if (event.target.id === "question-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const post = { id: Date.now(), tag: String(data.get("tag")), title, body: String(data.get("body") || "").trim(), votes: 0, replies: [], time: "Added in this demo", voted: false };
    current().questions.unshift(post);
    recordParticipation("question");
    state.view = "conversation";
    state.filter = "all";
    state.search = "";
    state.expanded = null;
    event.target.reset();
    dialog.close();
    render();
    showToast("Question added to this demo session.");
  } else if (event.target.id === "studio-form") {
    event.preventDefault();
    saveCard();
  } else if (event.target.matches("[data-reply]")) {
    event.preventDefault();
    const post = current().questions.find(item => item.id === Number(event.target.dataset.reply));
    const value = String(new FormData(event.target).get("reply") || "").trim();
    if (!post || !value) return;
    post.replies.push({ role: "Demo participant", text: value });
    recordParticipation("comment");
    state.expanded = post.id;
    render();
    showToast("Comment added to this demo session.");
  }
});

render();
