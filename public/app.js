const COURSE_PRINCIPLE = "Permission to use generative AI is not a recommendation or requirement to use it. Students will not receive an advantage merely for using AI. Any transparency bonus rewards evidence and reflection about the learning process, whether that process involved AI or not.";
const ASSIGNMENT_PRINCIPLE = "This assignment does not require you to use AI. If you choose to use it, the rules below explain what is permitted and what must be disclosed. The optional transparency-of-process bonus is available equally to students who use AI and students who do not.";

// Fictional teaching examples. No user account, network request, or persistent storage exists in this demo.
const courses = {
  sds: {
    code: "SDS 210", name: "Technology & society", term: "Fall 2026",
    courseCard: {
      title: "Course AI guidance", status: "Published example", updated: "September 8, 2026",
      summary: "Generative AI can be used for early exploration, but your analysis and final writing must be your own.",
      allowed: "Brainstorming possible directions, testing an outline, and checking your understanding of concepts.",
      notAllowed: "Submitting generated writing as your own analysis or using AI to replace required reading.",
      disclose: "Briefly state which tool you used, for what purpose, and what you changed or rejected."
    },
    assignments: [
      { id: "essay", title: "Critical response essay", due: "Oct 24", status: "Published example", updated: "October 2, 2026", learning: "Develop an argument from course readings and evidence.", allowed: "Use AI to brainstorm a question or compare possible outlines.", notAllowed: "Do not generate the final analysis, evidence, citations, or paragraphs for submission.", disclose: "If you use AI, include a short process note about the tool, prompts, and how you evaluated its suggestions.", difference: "The course card permits concept checks. For this essay, AI-generated final analysis is explicitly outside the permitted use.", link: "" },
      { id: "presentation", title: "Seminar presentation", due: "Nov 12", status: "Published example", updated: "October 6, 2026", learning: "Explain a course concept clearly to classmates.", allowed: "Use AI to rehearse questions your audience may ask.", notAllowed: "Do not use AI to prepare the explanation you present as your own.", disclose: "Mention any rehearsal use in your speaker notes.", difference: "This assignment permits AI for rehearsal only.", link: "" }
    ],
    questions: [
      { id: 1, tag: "essay", title: "Can I use AI to help narrow down my essay topic?", body: "I have a few ideas but I'm not sure which one is focused enough for the word limit.", votes: 12, replies: [{ role: "Instructor", text: "Yes. Brainstorming and comparing directions is allowed. Your final argument and analysis should come from your own reading and reasoning." }], time: "Example conversation", voted: false },
      { id: 2, tag: "course", title: "What counts as a disclosure if I only used AI for brainstorming?", body: "Would a short note at the end be enough?", votes: 8, replies: [{ role: "Instructor", text: "A short process note is appropriate. Say which tool you used, what you asked it to help with, and what you chose to keep or reject." }], time: "Example conversation", voted: false },
      { id: 3, tag: "presentation", title: "Could we use AI to practice possible audience questions?", body: "I want to prepare for the discussion after our presentation.", votes: 5, replies: [], time: "Example conversation", voted: false }
    ]
  },
  engl: {
    code: "ENGL 109", name: "Introduction to writing", term: "Fall 2026",
    courseCard: {
      title: "Course AI guidance", status: "Published example", updated: "September 10, 2026",
      summary: "Use generative AI as a conversation partner while keeping your drafting and revision decisions your own.",
      allowed: "Discuss possible structures and ask for explanations of writing concepts.",
      notAllowed: "Submit generated prose as original writing or fabricate references.",
      disclose: "Describe any AI assistance in a short note accompanying the assignment."
    },
    assignments: [
      { id: "narrative", title: "Literacy narrative", due: "Oct 30", status: "Published example", updated: "October 1, 2026", learning: "Reflect on a personal experience with language and writing.", allowed: "Use AI to ask questions about structure after making your own outline.", notAllowed: "Do not generate personal memories or draft the narrative with AI.", disclose: "If used, briefly describe how the conversation influenced your structure.", difference: "Unlike the broader course guidance, AI may assist with structure only after your own outline exists.", link: "" }
    ],
    questions: [
      { id: 4, tag: "narrative", title: "Can I ask AI to suggest a different order for my paragraphs?", body: "I already have a complete outline and want to compare structures.", votes: 4, replies: [], time: "Example conversation", voted: false }
    ]
  }
};

const state = { course: "sds", view: "courses", filter: "all", search: "", card: "course", expanded: null, role: "student" };
const root = document.querySelector("#view-root");
const dialog = document.querySelector("#compose-dialog");
const toast = document.querySelector("#toast");
let toastTimer;

function esc(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function current() { return courses[state.course]; }
function tagName(tag) { return tag === "course" ? "Course" : current().assignments.find(a => a.id === tag)?.title || "Assignment"; }
function assignmentById(id) { return current().assignments.find(a => a.id === id); }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200); }
function intro(eyebrow, title, subtitle, action = "") { return `<div class="page-intro"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${action}</div>`; }

function renderChrome() {
  const course = current();
  const section = { conversation: "Conversation", cards: "AI guidance", instructor: "Instructor studio" }[state.view];
  const crumb = document.querySelector("#crumb");
  crumb.innerHTML = state.view === "courses"
    ? "<strong>Courses</strong>"
    : `<button type="button" data-action="courses">Courses</button><span aria-hidden="true">/</span>${section ? `<button type="button" data-course="${esc(state.course)}" data-view="home">${esc(course.code)}</button><span aria-hidden="true">/</span><strong>${section}</strong>` : `<strong>${esc(course.code)}</strong>`}`;
  document.querySelector("#course-nav").innerHTML = Object.entries(courses).map(([id, item]) => {
    const here = state.view !== "courses" && state.course === id;
    const sections = [
      ["conversation", "Conversation"],
      ["cards", "AI guidance"],
      ["instructor", "Instructor studio"],
    ];
    return `<div class="course-group${here ? " current" : ""}"><button class="course-option${here && state.view === "home" ? " active" : ""}" type="button" data-course="${id}" data-view="home"${here && state.view === "home" ? ' aria-current="page"' : ""}><strong>${esc(item.code)}</strong><small>${esc(item.name)}</small></button><nav class="course-sections" aria-label="${esc(item.code)} sections">${sections.map(([view, label]) => `<button class="nav-item${here && state.view === view ? " active" : ""}" type="button" data-course="${id}" data-view="${view}"${here && state.view === view ? ' aria-current="page"' : ""}>${label}</button>`).join("")}</nav></div>`;
  }).join("");
}

function render() {
  renderChrome();
  root.innerHTML = state.view === "courses" ? renderCourses() : state.view === "home" ? renderHome() : state.view === "conversation" ? renderConversation() : state.view === "cards" ? renderCards() : renderStudio();
}

function renderCourses() {
  return `<div class="page"><div class="page-intro"><div><h1>Courses</h1><p class="page-subtitle">Sample courses. Open one to see the conversation and guidance.</p></div></div>
    <div class="course-list">${Object.entries(courses).map(([id, course]) => `<button type="button" data-course="${id}" data-view="home"><strong>${esc(course.code)}</strong><span>${esc(course.name)}</span><small>${esc(course.term)}</small><p>${esc(course.courseCard.summary)}</p></button>`).join("")}</div></div>`;
}

function renderHome() {
  const course = current();
  const questions = course.questions.length;
  const assignments = course.assignments.length;
  return `<div class="page"><div class="page-intro"><div><h1>${esc(course.code)} · ${esc(course.name)}</h1><p class="page-subtitle">${esc(course.term)}</p></div></div>
    <p class="home-summary">${esc(course.courseCard.summary)}</p>
    <div class="home-parts">
      <button type="button" data-view="conversation"><strong>Conversation</strong><small>${questions} sample ${questions === 1 ? "question" : "questions"}</small></button>
      <button type="button" data-view="cards"><strong>AI guidance</strong><small>${assignments} ${assignments === 1 ? "assignment" : "assignments"}</small></button>
      <button type="button" data-view="instructor"><strong>Instructor studio</strong><small>Manual editing preview</small></button>
    </div>
    <h2 class="section-heading">Assignments</h2>
    <div class="home-parts">${course.assignments.map(a => `<button type="button" data-card="${esc(a.id)}"><strong>${esc(a.title)}</strong><small>Due ${esc(a.due)}</small></button>`).join("")}</div></div>`;
}

function renderConversation() {
  const course = current();
  const q = state.search.trim().toLowerCase();
  const posts = course.questions.filter(post => (state.filter === "all" || post.tag === state.filter) && (!q || `${post.title} ${post.body}`.toLowerCase().includes(q)));
  const tabs = [{ id: "all", label: "All questions" }, { id: "course", label: "Course" }, ...course.assignments.map(a => ({ id: a.id, label: a.title }))];
  return `<div class="page">${intro(course.term, course.code + " · " + course.name, "Questions and AI guidelines for this course.", '<button class="button primary" data-action="compose" type="button">Ask a question</button>')}
    <div class="layout"><section class="panel" aria-label="Course questions"><div class="panel-pad"><h2 class="section-title">Conversation</h2><p class="section-caption">Questions are grouped by course or assignment, so the guidance stays in context.</p></div>
    <div class="tabs" role="group" aria-label="Filter questions">${tabs.map(tab => `<button class="tab ${state.filter === tab.id ? "active" : ""}" data-filter="${esc(tab.id)}" type="button" aria-pressed="${state.filter === tab.id}">${esc(tab.label)}</button>`).join("")}</div>
    <div class="board-toolbar"><span class="section-caption">${posts.length} ${posts.length === 1 ? "question" : "questions"}</span><input class="search" type="search" id="question-search" aria-label="Search questions" placeholder="Search this conversation" value="${esc(state.search)}"></div>
    <div class="post-list">${posts.length ? posts.map(renderPost).join("") : '<div class="empty">No questions match this view yet.</div>'}</div></section>
    <aside class="side-stack" aria-label="Course guidance"><section class="panel panel-pad"><div class="side-header"><h2 class="section-title">AI guidance</h2><button type="button" class="text-link" data-action="cards">View all →</button></div><p class="section-caption">The rules, in one place.</p><div class="mini-card"><span class="mini-icon" aria-hidden="true">▦</span><h3>Start with the course card</h3><p>${esc(course.courseCard.summary)}</p><button data-card="course" type="button">Read course guidance →</button></div></section>
    <section class="panel panel-pad"><h2 class="section-title">Assignments</h2><p class="section-caption">Each card explains what applies to that work.</p>${course.assignments.map(a => `<div class="assignment-mini"><div><strong>${esc(a.title)}</strong><small>Due ${esc(a.due)}</small><button class="text-link" type="button" data-card="${esc(a.id)}">Open card</button></div></div>`).join("")}</section>
    <div class="notice"><h3>About this prototype</h3><p>The questions and course are examples. Anything you add disappears on reload. No real student identity, anonymous posting, or participation record exists here.</p></div></aside></div></div>`;
}

function renderPost(post) {
  const open = state.expanded === post.id;
  return `<article class="post"><span class="post-tag ${post.tag === "course" ? "" : "assignment"}">${esc(tagName(post.tag))}</span><h3>${esc(post.title)}</h3><p>${esc(post.body)}</p><div class="post-meta"><button class="vote ${post.voted ? "voted" : ""}" data-vote="${post.id}" aria-label="${post.voted ? "Remove demo upvote from" : "Upvote"} ${esc(post.title)}" aria-pressed="${Boolean(post.voted)}" type="button">${post.voted ? "Upvoted" : "Upvote"} ${post.votes}</button><span>${esc(post.time)}</span><button type="button" data-expand="${post.id}" aria-expanded="${open}">${post.replies.length} ${post.replies.length === 1 ? "reply" : "replies"} · ${open ? "Hide" : "Open"}</button></div>${open ? `<div class="reply-box">${post.replies.map(reply => `<div class="reply"><strong>${esc(reply.role)}</strong>${esc(reply.text)}</div>`).join("")}${!post.replies.length ? '<p>No replies yet. Start the conversation.</p>' : ""}<form class="reply-actions" data-reply="${post.id}"><input name="reply" maxlength="400" aria-label="Write a demo reply" placeholder="Write a reply for this demo" required><button class="button small" type="submit">Reply</button></form></div>` : ""}</article>`;
}

function renderCards() {
  const course = current();
  if (state.card !== "course" && !assignmentById(state.card)) state.card = "course";
  const a = assignmentById(state.card);
  const card = a || course.courseCard;
  const choices = [{ id: "course", title: "Course AI guidance", subtitle: "Applies across this course" }, ...course.assignments.map(item => ({ id: item.id, title: item.title, subtitle: `Due ${item.due}` }))];
  return `<div class="page">${intro(course.code, "AI guidance", "Course rules and assignment details in one place.")}
    <div class="card-layout"><nav class="panel card-list" aria-label="Choose a card">${choices.map(choice => `<button class="card-choice ${state.card === choice.id ? "active" : ""}" type="button" data-card="${esc(choice.id)}" aria-current="${state.card === choice.id ? "page" : "false"}"><strong>${esc(choice.title)}</strong><small>${esc(choice.subtitle)}</small></button>`).join("")}</nav>
    <article class="panel guidance-card"><div class="card-topline"><span class="status-tag">${esc(card.status)}</span><span class="section-caption">Updated ${esc(card.updated)}</span></div><h2>${esc(a ? a.title : card.title)}</h2><p class="lead">${esc(a ? `Due ${a.due} · ${a.learning}` : card.summary)}</p><div class="callout">${esc(a ? ASSIGNMENT_PRINCIPLE : COURSE_PRINCIPLE)}</div>
    ${a ? `<section class="guidance-section"><h3>How this assignment differs <span class="override">Assignment rule</span></h3><p>${esc(a.difference)}</p></section>` : ""}
    <section class="guidance-section"><h3>${a ? "When AI is allowed" : "Generally allowed"}</h3><p>${esc(card.allowed)}</p></section>
    <section class="guidance-section"><h3>${a ? "When AI is not allowed" : "Generally prohibited"}</h3><p>${esc(card.notAllowed)}</p></section>
    <section class="guidance-section"><h3>Disclosure</h3><p>${esc(card.disclose)}</p></section>
    ${a ? `<section class="guidance-section"><h3>Submission</h3><p>Assignments are submitted through your course learning system. This prototype does not accept files.</p></section>` : ""}
    <section class="guidance-section"><h3>Questions about this guidance?</h3><p>Bring it into the course conversation so everyone can see the clarification.</p><button class="button small" style="margin-top:12px" type="button" data-action="ask-about-card">Ask about this ${a ? "assignment" : "course"}</button></section></article></div></div>`;
}

function renderStudio() {
  const course = current();
  const a = assignmentById(state.card);
  const card = a || course.courseCard;
  return `<div class="page">${intro("Instructor preview", "Edit AI guidance", "Try editing example text, then switch to AI guidance to see the student view.")}
    <div class="notice" style="margin-bottom:20px"><h3>Demo editing only</h3><p>There is no instructor sign-in, publishing, or saved policy here. Edits remain in this browser tab until reload. The real editor needs access controls, version history, and publishing safeguards.</p></div>
    <div class="studio-layout"><section class="panel studio-form"><h2 class="section-title">Edit a sample card</h2><p class="section-caption">This is a manual editing preview, not an AI-generated policy.</p><form id="studio-form" class="form-grid"><div class="field"><label for="studio-card">Card</label><select id="studio-card" name="card"><option value="course" ${!a ? "selected" : ""}>Course AI guidance</option>${course.assignments.map(item => `<option value="${esc(item.id)}" ${a?.id === item.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></div><div class="field"><label for="studio-allowed">When AI is allowed</label><textarea id="studio-allowed" name="allowed" required>${esc(card.allowed)}</textarea></div><div class="field"><label for="studio-not-allowed">When AI is not allowed</label><textarea id="studio-not-allowed" name="notAllowed" required>${esc(card.notAllowed)}</textarea></div><div class="field"><label for="studio-disclose">Disclosure expectations</label><textarea id="studio-disclose" name="disclose" required>${esc(card.disclose)}</textarea></div><div class="studio-actions"><button type="submit" class="button primary">Save in this demo</button><button type="button" class="button" data-action="cards">View student card →</button></div></form></section>
    <aside class="panel panel-pad"><h2 class="section-title">What the full editor needs</h2><p class="preview-note">The project spec calls for a guided wizard and manual editor, draft and published states, student preview, and version history. Published changes must say what changed, why, when they take effect, and whether they apply to work already underway.</p><div class="mini-card"><h3>Keep the professor in control</h3><p>Any future recommendations must come from explicit, reviewable rules. The app must not use generative AI to set policy.</p></div></aside></div></div>`;
}

function openCompose(defaultTag = "course") {
  const selector = document.querySelector("#question-tag");
  selector.innerHTML = `<option value="course">Course</option>${current().assignments.map(a => `<option value="${esc(a.id)}">${esc(a.title)}</option>`).join("")}`;
  selector.value = defaultTag;
  dialog.showModal();
  document.querySelector("#question-title").focus();
}

document.addEventListener("click", event => {
  const courseButton = event.target.closest("[data-course]");
  if (courseButton) {
    const changingCourse = courseButton.dataset.course !== state.course;
    state.course = courseButton.dataset.course;
    if (courseButton.dataset.view) state.view = courseButton.dataset.view;
    if (changingCourse) { state.filter = "all"; state.search = ""; state.card = "course"; state.expanded = null; }
    render();
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { state.view = viewButton.dataset.view; render(); return; }
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) { state.filter = filterButton.dataset.filter; render(); return; }
  const cardButton = event.target.closest("[data-card]");
  if (cardButton) { state.card = cardButton.dataset.card; state.view = "cards"; render(); return; }
  const voteButton = event.target.closest("[data-vote]");
  if (voteButton) { const post = current().questions.find(p => p.id === Number(voteButton.dataset.vote)); if (post) { post.voted = !post.voted; post.votes += post.voted ? 1 : -1; render(); } return; }
  const expandButton = event.target.closest("[data-expand]");
  if (expandButton) { const id = Number(expandButton.dataset.expand); state.expanded = state.expanded === id ? null : id; render(); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "compose" || action === "ask-about-card") { openCompose(action === "ask-about-card" ? state.card : "course"); return; }
  if (action === "cards") { state.view = "cards"; render(); return; }
  if (action === "courses") { state.view = "courses"; render(); return; }
  if (event.target.closest("[data-close-dialog]")) dialog.close();
});

document.addEventListener("change", event => { if (event.target.id === "studio-card") { state.card = event.target.value; render(); } });
document.addEventListener("input", event => { if (event.target.id === "question-search") { const pos = event.target.selectionStart; state.search = event.target.value; render(); const field = document.querySelector("#question-search"); field.focus(); field.setSelectionRange(pos, pos); } });
document.addEventListener("submit", event => {
  if (event.target.id === "question-form") {
    event.preventDefault(); const data = new FormData(event.target); const title = String(data.get("title") || "").trim(); if (!title) return;
    const post = { id: Date.now(), tag: String(data.get("tag")), title, body: String(data.get("body") || "").trim(), votes: 0, replies: [], time: "Added in this demo", voted: false };
    current().questions.unshift(post); state.view = "conversation"; state.filter = "all"; state.search = ""; state.expanded = post.id; event.target.reset(); dialog.close(); render(); showToast("Question added to this demo session.");
  } else if (event.target.id === "studio-form") {
    event.preventDefault(); const data = new FormData(event.target); const card = state.card === "course" ? current().courseCard : assignmentById(state.card); if (!card) return;
    for (const key of ["allowed", "notAllowed", "disclose"]) card[key] = String(data.get(key) || "").trim();
    showToast("Sample card updated for this session.");
  } else if (event.target.matches("[data-reply]")) {
    event.preventDefault(); const post = current().questions.find(p => p.id === Number(event.target.dataset.reply)); const value = String(new FormData(event.target).get("reply") || "").trim(); if (!post || !value) return;
    post.replies.push({ role: "Demo participant", text: value }); render(); showToast("Reply added to this demo session.");
  }
});

render();
