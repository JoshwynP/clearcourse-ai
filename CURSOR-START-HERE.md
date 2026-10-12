# Start building ClearCourse AI in Cursor

This repository is ready to open from `main`. The product goal is the **complete web application** in `CONTRIBUTING.md`; `BUILD-NOW.md` orders that work into small releases. The current `public/` site is a fictional-data starting screen and deployable preview. It is not the finished service.

## 1. Open and run it locally

Open this folder in Cursor: `clearcourse-ai`. If you are using a fresh machine, clone `https://github.com/JoshwynP/clearcourse-ai.git` and open the cloned folder. Use the `main` branch after the handoff merge.

In Cursor's terminal:

```bash
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. Stop the server with `Ctrl+C`. The preview needs no package installation or environment variables. Its changes reset when the page reloads. Only the three files in `public/` are meant to appear on the public preview.

Check the current prototype after edits:

```bash
node --check public/app.js
git diff --check
```

## 2. Put the fictional preview online

The repository is private. GitHub Pages on a Free account requires a public repository, while Vercel can deploy a personal private GitHub repository. The preview is configured for Vercel in `vercel.json`: framework **Other**, root directory **repository root**, output directory **public**. No build command or environment variables are needed for this static release. The public site will contain only the files in `public/`. See [Vercel's Git deployment guide](https://vercel.com/docs/git) and [build settings](https://vercel.com/docs/builds/configure-a-build).

To finish the first deployment, sign into Vercel, connect the `JoshwynP/clearcourse-ai` GitHub repository, and create a new project from `main`. Leave the project root at the repository root and confirm it serves `public/`. Open the resulting URL in a signed-out browser window. Verify the course switch, card view, and demo notice. Record the live URL in `README.md` after it works. A connected Git project can deploy future changes to `main` automatically.

Vercel Hobby is limited to personal, non-commercial use. Revisit the hosting decision before a real institutional pilot or a commercial launch. The production app host and privacy architecture are still decisions in `CONTRIBUTING.md` Q3 and Q8–Q9. [Vercel Hobby documentation](https://vercel.com/docs/plans/hobby)

## 3. Configure Cursor

Cursor reads the root `AGENTS.md`. Keep `CONTRIBUTING.md` and `BUILD-NOW.md` in the repo. Use Agent mode for a single implementation slice, Ask mode for a read-only question, and Plan mode for a bounded architecture choice. Do not feed Cursor the entire research folder in every chat.

Suggested model use, subject to what your Cursor Pro account offers:

- Composer 2.5 or Grok 4.7 for small UI, copy, and documentation work.
- Claude Sonnet 5.5 at medium effort for ordinary multi-file features; high effort for a genuinely hard one.
- Claude Opus 5.5 only for a short, specific architecture or privacy review after there is a concrete design to critique.

Check the usage dashboard and set a spending ceiling before long Agent sessions. The current [model list and pricing](https://cursor.com/docs/models-and-pricing) can change.

## 4. Begin real development

Follow `BUILD-NOW.md` from stage 1 through stage 9. The first real implementation slice is an application scaffold with the same course shell and one read-only card. Before that, close Q3 by accepting or revising proposed ADRs 0001 and 0002. The recommended baseline to evaluate is TypeScript, Next.js, and PostgreSQL; the exact versions and host must be checked when the work starts.

Paste this into a fresh Cursor Agent chat for the first bounded decision:

> Read AGENTS.md, BUILD-NOW.md, CONTRIBUTING.md §§2, 3, 6, 8, 12–13, and ADRs 0001–0002. I want the full ClearCourse AI app built in working stages, with the public preview staying live. For this session, decide only Q3: check the current official documentation for the proposed TypeScript/Next.js/PostgreSQL stack and hosting, list any material changes since the ADRs were written, and propose the smallest decision update needed to start the card-only app. Keep the response to one page and give me the exact next implementation slice. Do not do an exhaustive survey or start anonymous posting.

After Q3 is decided, use the stage-1 implementation prompt in `BUILD-NOW.md`. Start a new chat for each subsequent slice. Ask Cursor to run the app, inspect the changed screen, run focused tests, and show the diff before committing.

## What remains to make this a real student service

The public preview has no accounts, database, protected course access, real anonymous posting, or participation marks. Those are planned in stages 1–9. Do not invite students to use it for class work until the relevant access controls, privacy mechanism, and negative tests are in place.
