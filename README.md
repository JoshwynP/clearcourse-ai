# ClearCourse AI

A course space where instructors explain AI use clearly and students can discuss those guidelines. The first interactive prototype is now in this repository.

## See it now

From the repository folder:

```bash
python3 -m http.server 8000 --directory public
```

Open [http://localhost:8000](http://localhost:8000). No install, account, or API key is needed. The public preview is prepared in `public/`; its live URL will be added after the hosting account is connected.

Try switching courses, filtering questions, opening assignment cards, adding a question or reply, upvoting, and editing a sample card in **Instructor studio**. Edits last only until the page reloads. All course content is fictional.

## What this is

This is a front-end demonstrator of the intended experience: a familiar course conversation next to compact AI guidance cards. It has no server, database, accounts, real anonymous posting, participation tracking, or publishing. **Do not use it for real courses or student information.** The prototype can be hosted as static files for feedback, but that does not make it ready for real student use.

## What comes next

Start with [CURSOR-START-HERE.md](CURSOR-START-HERE.md) for local setup, public deployment, and the first Cursor prompt. [BUILD-NOW.md](BUILD-NOW.md) is the staged plan for the **complete** app. The full requirements remain in [CONTRIBUTING.md](CONTRIBUTING.md). The prior [research](docs/research/README.md) and [long-range plan](docs/plan.md) are reference material.
