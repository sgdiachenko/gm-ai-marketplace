---
name: ears-requirements
description: "Writing and checking testable requirements in EARS for SDD specs: the five patterns with shall, the AC line format (ID, pattern, story, priority, verify hint), banned vague words, measurable NFRs, the traceability matrix and the spec self-check. Use when writing, revising or verifying against a spec's AC, EC and NFR IDs. Trigger terms: EARS, acceptance criteria, shall."
metadata:
  tags: requirements, ears, sdd, acceptance-criteria, traceability
---

# EARS requirements for SDD specs

EARS (Easy Approach to Requirements Syntax) was introduced by Mavin, Wilkinson, Harwood and Novak (Rolls-Royce) at IEEE RE'09. It separates the **condition** from the **system response**, so each requirement is one checkable statement.

## Keywords

**shall** marks a mandatory requirement. The trigger keywords are `WHEN` (event-driven), `WHILE` (state-driven), `IF … THEN` (unwanted behaviour) and `WHERE` (optional feature).

A project that writes its specs in another language may list translated keywords in the *Language* section of its profile (`docs/sdd-profile.md`). Use them in the same positions, and use one set of keywords per spec. The examples below use the English keywords.

## The five patterns

| Pattern | Form | Use for |
|---|---|---|
| Ubiquitous | `The system shall <response>.` | always-true behaviour |
| Event-driven | `WHEN <trigger>, the system shall <response>.` | a reaction to one event |
| State-driven | `WHILE <state>, the system shall <response>.` | behaviour while a state holds |
| Unwanted behaviour | `IF <unwanted condition>, THEN the system shall <response>.` | failures, invalid input, timeouts |
| Optional feature | `WHERE <option is enabled/present>, the system shall <response>.` | configurable or optional parts |
| Complex | `WHILE <state>, WHEN <trigger>, the system shall <response>.` | only when one trigger is not enough |

"The system" may be a concrete module when the requirement is about a boundary: `the API shall`, `the worker shall`, `the checkout page shall`.

## AC line format

```
AC-7 [unwanted, US-2, must, verify: integration] IF the payment provider times out after 30 s, THEN the API shall store the order as `payment_pending` and return HTTP 202.
```

- `AC-n` — stable ID, never renumbered; dropped items are struck through (`~~AC-4~~ — dropped per Q3`), new ones appended.
- `[pattern, US-n, priority, verify: …]`:
  - priority — `must` | `should` | `could` (MoSCoW; `won't` goes to Non-goals). A planner may defer `should` / `could` only via an answered question, never silently.
  - verify — how a checker proves it: `unit` | `integration` | `e2e` | `manual` (+ what to look at). `manual` needs a reason (visual, needs a real third-party service, timing).
- One requirement per line: no "and/or" joining two responses. Two responses → two ACs.

## Testability rules

A requirement is testable when it names **an actor or trigger**, **one observable response** and **numbers instead of adjectives**.

Banned unless a number or definition follows: *fast, quickly, slow, normal, properly, correctly, user-friendly, intuitive, simple, large, small, many, few, reasonable, robust, gracefully, seamless, appropriate, sufficient, etc., and/or, if possible, as needed, support (without saying how).*

| Vague | Testable |
|---|---|
| "Must work fine on large accounts" | `WHEN an account has more than 10,000 orders, the orders page shall load them in pages of 50.` |
| "Must not crash if the provider is down" | `IF the payment provider returns 5xx, THEN the checkout page shall show "Payment is temporarily unavailable" and keep the cart.` |
| "Loads fast" | `WHEN the user opens the orders page, the page shall render the first 50 orders within 1 s at p95 on the staging dataset.` |
| "Handles errors gracefully" | `IF the API token is rejected with 401, THEN the settings page shall show "Token is invalid" with a link to re-enter it and shall not retry automatically.` |

If you can't make it testable, it is an **Open question**, not an AC.

## Coverage checklist per feature

- Every user story has ≥1 event-driven or ubiquitous AC (the happy path).
- Every failure the analysis found has an **unwanted-behaviour** AC: a dependency unavailable, timing out, returning 401 / 404 / 429 or malformed data; a database error; invalid or oversized input; a concurrent run of the same thing; stale data after a sync.
- Every long-running operation has a **state-driven** AC (what the UI shows while it runs) and says whether it can be cancelled.
- Every setting or flag has an **optional-feature** AC for both on and off where "off" is not obvious.

## Non-functional requirements (NFR-n)

Same line format, measurable. Walk these categories and write "n/a — <why>" for the ones that don't apply, so absence is a decision:

| Category | Measurable form |
|---|---|
| Performance | latency or throughput with a percentile, dataset and condition (`p95 ≤ 300 ms for GET /orders on the staging dataset`) |
| Cost | paid calls per action (LLM, third-party APIs), token or request budgets |
| Limits | max sizes and counts, and the behaviour when exceeded |
| Reliability | retries, idempotency, what survives a restart |
| Security | handling of each untrusted input (links to the *Untrusted inputs* section) |
| Accessibility | keyboard path, focus order, labels, the WCAG 2.2 AA items that apply |
| Observability | what is logged or recorded (and what must never be: secrets, personal data) |
| Compatibility | existing API consumers, existing data, migration need |
| i18n | where user-visible strings come from (message catalogs), locales in scope |

## Traceability matrix

The spec ends its requirement part with a matrix so a planner and a verifier can walk it mechanically:

```
| Story | AC | EC | NFR | Verify |
|---|---|---|---|---|
| US-1 | AC-1, AC-2, AC-7 | EC-1 → AC-7 | NFR-2 | integration, e2e |
```

- Every `US` appears; every `AC` / `EC` / `NFR` appears at least once.
- Downstream: `sdd-engineering:implementation-planner` steps carry `covers: AC-n`; `sdd-engineering:plan-verifier` uses the IDs as its requirement rows and looks for evidence of the kind named in `verify:`; `/sdd-engineering:run-plan` appends an `## Implementation` section keyed by the same IDs.

## Self-check (before a spec is returned)

- [ ] Every AC has an ID, pattern, story, priority and `verify:`.
- [ ] Every AC contains **shall**, one response, the right keyword for its pattern, and no banned word without a number.
- [ ] Every `US` is covered; the traceability matrix has no orphan ID.
- [ ] Every failure found in analysis has an unwanted-behaviour AC or EC.
- [ ] Every NFR category is filled or explicitly `n/a — <why>`.
- [ ] No implementation detail (files, functions, tables, libraries).
- [ ] IDs are stable (no renumbering; struck items keep their ID).

## Reading a spec as a verifier

- Evidence for an AC is behaviour: a test asserting trigger → response (`path:line`), matching its `verify:` kind. Code without a test is `partial`; a "done" claim is not evidence.
- For unwanted-behaviour ACs (`IF … THEN`, or its translation from the profile) the evidence must exercise the failure branch.
- `verify: manual` rows are `not-verifiable` for a static checker — say what a human must look at.

## Sources

- Alistair Mavin et al., "Easy Approach to Requirements Syntax (EARS)", IEEE RE'09.
- [ISO/IEC/IEEE 29148: requirements engineering](https://www.iso.org/standard/72089.html) — traceability.
- [MoSCoW prioritization](https://en.wikipedia.org/wiki/MoSCoW_method).
