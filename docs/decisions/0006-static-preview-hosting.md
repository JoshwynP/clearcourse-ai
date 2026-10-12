# ADR 0006: Public hosting for the fictional-data preview

- **Status:** Accepted for the static preview only
- **Date:** 2026-10-12
- **Relates to:** ADR 0005, CONTRIBUTING §2 and §8 / Q2

## Context

The owner wants a publicly reachable site now and a path to the complete web application in stages. The repository is private. The current prototype needs only static hosting, and the repository contains research files that should not be part of the web output.

## Decision

Place only `index.html`, `styles.css`, and `app.js` in `public/`. Configure Vercel to deploy that directory from `main` as a static site with no build command. Keep the repository private and the preview visibly labelled as a fictional-data prototype. This is a hosting choice for the static preview, not a decision on production application hosting under Q3.

## Consequences

The preview can remain at one public URL while app development continues on branches. Connecting Vercel to the private GitHub repository requires the owner's account authorization. The real application may later replace the static output; when that happens, remove or revise `vercel.json` and verify the production host against Q3. No real student data belongs on this preview.
