# architecture-review — maintainer notes

One agent, `architecture-reviewer`. Depends on `engineering-paved-path` `^1.0.0` (preloads `onion-architecture`, `frontend-architecture`, `engineering-insights`; loads `next-best-practices` on demand). `sdd-engineering` depends on it and runs it in `/run-plan`'s review phase. Spec: `specs/sdd-engineering.md`.

## Origin

`sgdiachenko/dev-digest` at `1b694bc41a61`, `.claude/agents/architecture-reviewer.md`. Changes:

- **Rule sources** instead of dev-digest's hardcoded ones: the project profile's *Architecture rules*, then `AGENTS.md` and architecture docs, then the project's linter configs (for real rule names), then the paved-path skills as defaults;
- **Checks** come from the profile, or from existing `arch` / `lint` / `depcruise` package scripts; dev-digest's `pnpm -C server arch:check`, `check-shared-sync.sh` and `gate.sh` are gone;
- **Finding schema and severity rules inlined**, since dev-digest's `pr-self-review` (`report.md`, `severity.md`) isn't ported; the `skill` field became `source`;
- the known-violation list moved from a dev-digest file to "the project's baseline";
- the Skill tool is enabled so it can load `next-best-practices` and other skills by namespaced name.

## Evals

`evals/architecture-review/` holds the three dev-digest fixtures moved onto the reference layout. Run with `scripts/run-evals.sh architecture-review` before a release.

## Context cost

`claude plugin details architecture-review` on Claude Code 2.1.299: ~140 tokens always-on, ~2.6k on invoke (plus the three preloaded skills, ~9k).

## Compatibility

`/run-plan` parses the findings JSON (`severity`, `file`, `line`, `rule`) and the verdict, and uses the delta re-review mode (`Re-check:`, `Fix files:`). Changing those is a major release.
