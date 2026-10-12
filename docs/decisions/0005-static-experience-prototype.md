# ADR 0005: Static experience prototype

- **Status:** Accepted for the fictional-data prototype only
- **Date:** 2026-10-12
- **Relates to:** CONTRIBUTING §2, §3, §6, §7.1–§7.4, §7.7, §8 / Q2

## Context

The owner wants to see and test the course experience immediately, before committing to the large proposed application stack. Q3 and Q9 still block a real authenticated or anonymous service.

## Decision

Build a dependency-free HTML, CSS, and JavaScript prototype in `public/` using fictional courses and browser-session state. It demonstrates the course conversation, the AI cards, and a manual editing preview. It makes no API requests and stores no identity or discussion data. This decision does not approve the production stack, hosting, authentication, or privacy architecture in ADRs 0001–0004.

## Consequences

The prototype can be viewed locally or hosted as static files for feedback. Its interactions reset on reload. It cannot serve real students, publish policy, guarantee anonymity, or award participation. Real posting and participation wait for a reviewed privacy design and negative tests.
