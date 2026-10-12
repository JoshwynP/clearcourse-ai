# Privacy mechanism comparison (judge's report) for Q9 (CONTRIBUTING §6.3)

> **Status:** IN PROGRESS, 2026-10-11 (checked date). Research and planning only.
> **Nothing here is a decision.** Every recommendation is a **PROPOSAL** for the owner to approve via an ADR
> (CONTRIBUTING §1, §6.3, §14). `P:/code/clearcourse-ai/CONTRIBUTING.md` is the source of truth; where this note
> conflicts with it, CONTRIBUTING wins. Q9 stays open until the owner decides.

## Contents

0. Inputs, evidence rules, scope
1. Executive summary (PROPOSAL)
2. Scored comparison matrix
3. Head-to-head discussion
4. Recommended mechanism "A+" (PROPOSAL), concrete specification
5. Threat-model document outline and the "limitations of anonymity" list (§6.2, §11)
6. Must-have controls
7. Negative tests that prove it (§9)
8. Open questions it depends on (existing §13 and PROPOSED new)
9. What evidence would change this recommendation
10. Verification log

---

## 0. Inputs, evidence rules, scope

**Inputs read (all 2026-10-11/12):** privacy-A (`research/privacy-A-db-enforced.md`), privacy-B
(`research/privacy-B-separated-services.md`), privacy-C (`research/privacy-C-cryptographic.md`), the red team
(`critique/privacy-redteam.md`), and the stack judge's report (`compare/stack-hosting.md`, skimmed for platform
context: its PROPOSAL is Next.js 16 + Drizzle + Supabase Free used as plain Postgres in `ca-central-1` + Vercel
Hobby, with a Cloud Run fallback; that is itself undecided, Q3).

**Evidence rules.**
- **Requirement** = text in CONTRIBUTING.md, cited `§N.N`. Nothing else is a requirement.
- **PROPOSAL** = my recommendation for the owner. It binds nothing until an ADR is approved (§1, §6.3, §14).
- **[J-n]** = a fact I re-fetched myself on 2026-10-11 (Verification log, §10). **[A Vn] / [B Fn] / [RT]** = a fact
  verified by an input note and not re-fetched by me; I rely on it only where the red team re-checked it or where it
  is not decision-critical, and say so.
- **Unverified** = not confirmed on a current official page. Never relied on as fact.
- I close no open question. New uncertainties are listed as **PROPOSED NEW** open questions (§8), numbered
  **PQ-P1…**, with cross-references to the designs' own NQ-A*, PNQ-B*, NQ-C* and the red team's NEW-* items.

**Scope split used throughout (from §6.2, §9, §3, §10).**

| Tier | Actors / channels | Source |
|---|---|---|
| **REQUIRED** | ordinary application queries; instructors; TAs; institutional admins (no *routine* linking); application logs, analytics events, error reports; DB views; exports; admin dashboards; predictable identifiers; UI and API surfaces. Also: learning a non-sharer's level, because §10 says "Students alone decide whether to share" and "Instructors receive no underlying participation activity" | §5, §6.2, §9, §3 last row, §10 |
| **STRONGER THAN REQUIRED** | the platform operator (the owner: DB console, deploy, host secrets); host, DB, auth and email vendors; holders of dumps, backups or WAL; app-server compromise; legal compulsion | not required; every gap must appear in the documented limitations (§6.2, §11) |

"Ordinary application query" is read strictly, as the red team does: anything an application runtime credential can
SELECT, **including Postgres system columns** such as `xmin`, because a later developer (or Claude) can write such a
query without touching a privileged path.

---

## 1. Executive summary (PROPOSAL; Q9 stays open)

**Recommended mechanism: "A+"**, a layered hybrid built on design A's single-Postgres, database-enforced core, with the
red team's fixes applied and the best ideas of B and C grafted on. In one paragraph:

> All five §6.1 domains live in one PostgreSQL database, each in its own schema with its own NOLOGIN owner. **No
> content row stores an author, pseudonym, tag or session** (A/B pillar P1). Per-student state (counters and per-item
> de-duplication facts) is keyed only by **keyed HMACs** under a per-course random key `K_c`. `K_c` is stored only
> wrapped, and **the HMACs are computed in a server-only "linkage" module of the app, so key material never enters
> SQL** (red team S-A2 fix). Runtime database roles have **no SELECT on any base table** in anonymous or identity
> schemas; they read through explicit-column views or definer functions, and write only through a whitelist of
> `SECURITY DEFINER` functions (A's narrow internal API, plus red team S-A1 fix). Upvotes, follows, unclear marks and
> reports are **per-item tags**, which are unlinkable across items without `K_c` (A/B). Merges re-key tags by roster
> recomputation inside one definer call (A/B). Crediting is synchronous in the posting transaction (A's Mode S) in the
> prototype, behind an interface that can switch to a **server-side daily batch** (B's batching idea, without B's
> services) if the owner wants more protection against the operator. Notifications are compute-on-read in-app and
> **one generic, content-free daily email** (A/B/C agree; red team X7). Level aggregates are **frozen snapshots on a
> fixed cadence and hidden once sharing opens**; survey text is **revealed only after the survey closes** (red team
> X2, X3). The exit survey uses A's completion flag plus shuffle-flush, with C's **blind-token survey** kept as a
> ready upgrade. At end of term the owner may crypto-shred `K_c` (Q17 option).

**Why A+ and not the others (detail in §2–§3):**

- It meets every REQUIRED-tier property the red team could attack, once the four A fixes are in (S-A1…S-A4), and its
  §9 negative tests are mostly **catalogue assertions that run in CI**, which is the cheapest reliable proof for a
  solo developer.
- B's separation buys protection mainly against the operator, which the spec does not require, at roughly twice A's
  build cost (B's own estimate ≈29–39 sessions vs A's ≈13–17, both unmeasured) and with Free-plan CPU risk. B's
  *principles* are kept; its *topology* is deferred to production, where A+'s no-cross-domain-FK rule makes the split
  mechanical (§4.12).
- C's client-held pseudonyms break or weaken §7.13 targeted email, §7.10/§7.11 integrity (token transfer, Sybil
  re-issuance) and the §6.4 option, and C's recommended H1 hybrid **stores an author pseudonym on every content row**,
  which makes past authorship recoverable by any `K_c` holder (red team F-C1). Only C's blind-token survey and its
  structural "no shared byte string across dumps" test survive into A+.

**Scores (§2, weighted, out of 100):** A+ **83.5**, A as written **74.5**, B-lite **68.0**, B-full **67.0**, C-H1 as
written **66.0**, C1 **56.5**. A+ still leads (77.5 vs B-full 68.5) when protection against the operator is weighted
three times higher.

**What the owner must decide before the Q9 ADR** (§8): the operator trust boundary (PQ-P1 = NQ-A9/PNQ-B13/NQ-C2/
NEW-3); hide/delete credit and self-upvotes (NQ-A4/A5, PNQ-B11, NQ-C10); "Answer posted" recipients (NQ-A1, PNQ-B7);
level-aggregate cadence and differencing rule (NQ-A7, NEW-1); survey reveal timing (NEW-2); timestamp precision
(NQ-A8); plus existing Q8, Q13, Q14, Q16, Q17, Q18, Q20.

