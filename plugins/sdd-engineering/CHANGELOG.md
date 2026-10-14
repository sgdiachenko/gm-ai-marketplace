# Changelog

All notable changes to `sdd-engineering`. Versions follow [semver](https://semver.org):

- **patch** — wording and fixes in agents and skills that don't change what they write;
- **minor** — a new agent, skill, mode or profile field that existing projects can ignore;
- **major** — a renamed or removed agent or skill, a changed artifact format or path, a profile field that projects must update.

## 1.0.0 — 2026-10-14

First release, ported from the team's in-repo workflow and made project-neutral.

### Added

- `spec-creator` agent: analyze, write, revise and approve modes; dated specs with EARS acceptance criteria, edge cases, NFRs, contracts, untrusted inputs and a traceability matrix; a spec registry.
- `implementation-planner` agent: two passes (spec conflicts, recommendations and execution mode; then the plan), work packages with non-overlapping owned paths for parallel implementers.
- `implementer` agent: executes a plan or one work package, writes the plan's tests, runs the project's checks, reports per step.
- `plan-verifier` agent: traceability matrix over requirements, constraints, steps and tests; re-runs checks unless the tree fingerprint matches; writes its report to a file.
- `/sdd-engineering:run-plan` skill: implementer waves, verification, architecture review with `/code-review` and optional `/security-review`, a bounded review-fix loop, closing the spec, the commit/PR gate; resumable state file.
- `/sdd-engineering:workflow-retro` skill: token, timing and launch metrics from session transcripts, judged findings, a report and a ledger row.
- `ears-requirements`, `ux-design-review` and `mermaid-diagram` skills used by the agents.
- Project profile (`docs/sdd-profile.md`) for paths, docs language, EARS keywords, modules and check commands, skill lanes, architecture rules and guardrails; template in `skills/run-plan/profile-template.md`.
- Dependencies: `engineering-paved-path`, `research-tools` and `architecture-review`, each `^1.0.0`.
