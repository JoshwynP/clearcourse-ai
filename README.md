# ClearCourse AI

A course space where instructors explain AI use clearly and students can discuss those guidelines. The first interactive prototype is now in this repository.

## See it now

From the repository folder:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). No install, account, or API key is needed. You can also open `index.html` directly in a browser.

Try switching courses, filtering questions, opening assignment cards, adding a question or reply, upvoting, and editing a sample card in **Instructor studio**. Edits last only until the page reloads. All course content is fictional.

## What this is

This is a front-end demonstrator of the intended experience: a familiar course conversation next to compact AI guidance cards. It has no server, database, accounts, real anonymous posting, participation tracking, or publishing. **Do not use it for real courses or student information.** The prototype can be hosted as static files for feedback, but that does not make it ready for real student use.

## What comes next

See [BUILD-NOW.md](BUILD-NOW.md) for the short build sequence and the decisions needed for a real pilot. The full requirements remain in [CONTRIBUTING.md](CONTRIBUTING.md). The prior [research](docs/research/README.md) and [long-range plan](docs/plan.md) are reference material, not prerequisites for viewing this prototype.
