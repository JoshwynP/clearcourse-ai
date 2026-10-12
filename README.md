# ClearCourse AI

A course space where instructors explain AI use clearly and students can discuss those guidelines. A local application foundation is in `web/`. The fictional preview remains in `public/`.

## See it now

From the repository folder:

```bash
python3 -m http.server 8000 --directory public
```

Open [http://localhost:8000](http://localhost:8000). No install, account, or API key is needed. The public preview is prepared in `public/`; its live URL will be added after the hosting account is connected.

Choose Professor or Student for this browser tab, then try switching courses, filtering the discussion board, opening assignment cards, adding a question or comment, upvoting, and managing a sample card. Nothing is saved when you reload. All course content is fictional. This preview does not authenticate University of Waterloo users.

## What this is

This is a front-end demonstrator of the intended experience: a discussion board next to compact AI guidance cards. It has no server, database, accounts, real anonymous posting, participation tracking, or publishing. **Do not use it for real courses or student information.** The prototype can be hosted as static files for feedback, but that does not make it ready for real student use.

## Application foundation

The local app has a practice sign-in. Choose Professor or Student, then enter a name. A professor creates a course and shares the join code. A student joins with that code. Questions and replies do not show a name. Records stay in gitignored files on this computer. This is not University of Waterloo sign-in, and it is not ready for real student information.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm test` runs the smoke test, and `npm run build` checks the production build.

## Public preview checklist

The Next.js app stays local. The fictional preview that can go on a public URL is the static site in `public/`. Follow [CURSOR-START-HERE.md](CURSOR-START-HERE.md).

1. Sign in to Vercel and connect the private GitHub repository.
2. Deploy only `public/` (framework Other, output directory `public`, no build command).
3. Open the URL in a signed-out browser. Confirm the course switch, a card, and the sample notice.
4. Record the live URL in this README after it works.
5. Do not enter real student information.

## What comes next

Start with [CURSOR-START-HERE.md](CURSOR-START-HERE.md) for local setup and public deployment of the preview. [BUILD-NOW.md](BUILD-NOW.md) is the staged plan for the **complete** app. The full requirements remain in [CONTRIBUTING.md](CONTRIBUTING.md). The prior [research](docs/research/README.md) and [long-range plan](docs/plan.md) are reference material. Production hosting of the database-backed app, the database access library, and the UI component library are still open.
