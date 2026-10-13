# ClearCourse AI

A course space where instructors explain AI use clearly and students can discuss those guidelines. The database-backed application is in `web/`. The fictional design reference remains in `public/`.

## ClearCourse app

The live application is [clearcourse-ai.vercel.app](https://clearcourse-ai.vercel.app/). People can create a ClearCourse account, sign in, join or create courses, read and write AI cards, and use course discussion and settings. It is independent of University of Waterloo sign-in.

**Current access limits:** email ownership and Professor status are not verified. The privacy and retention gates in [CONTRIBUTING.md](CONTRIBUTING.md) remain open. Do not invite real students or enter identifying student information until those requirements are complete.

The static `public/` site contains fictional data and is retained only as a design reference.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm test` runs the smoke test, and `npm run build` checks the production build.

## Project direction

[BUILD-NOW.md](BUILD-NOW.md) tracks the next verifiable product slice. [CONTRIBUTING.md](CONTRIBUTING.md) is the product source of truth, and [web/SETUP.md](web/SETUP.md) documents the deployed app and database setup. Historical decisions remain in [docs/decisions/](docs/decisions/).
