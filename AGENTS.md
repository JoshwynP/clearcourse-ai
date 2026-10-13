# ClearCourse AI agent instructions

- Prioritize working, reviewable product slices over more broad research. Read `BUILD-NOW.md` for the current sequence and `CONTRIBUTING.md` for product requirements.
- Implement one stage or smaller feature at a time. Each change should have a visible result and a focused verification step. Report what changed, what ran, and what remains.
- Keep the interface familiar and restrained: black, white, grey, and gold; a black banner with the ClearCourse name linking home; the University shield and the letters UW at the top right, with “Independent website made by students” in place of the University wordmark; flat borders, compact spacing, plain typography, and clear text labels. Do not present the site as an official University website, and do not use the University wordmark. Use WhatsApp only as an inspiration for simplicity; do not copy its assets or branding.
- The static prototype in `public/` contains fictional data and browser-session interactions only. Do not accept real student information there or imply that it guarantees anonymity. Keep research and configuration files outside the web output.
- Before real discussion or participation code, resolve the privacy architecture in `CONTRIBUTING.md` §6 and Q8–Q9. Keep identity and anonymous content separate; add negative privacy tests.
- Never implement the prohibitions in `CONTRIBUTING.md` §3. Do not use a generative model to set instructor policy.
- Keep expensive research bounded to the exact decision needed for the current stage. Check current official documentation when a technical fact may have changed.
