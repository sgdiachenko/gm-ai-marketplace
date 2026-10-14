# Changelog

All notable changes to `architecture-review`. Versions follow [semver](https://semver.org): a change to the findings format that callers parse, or to the agent's name, is a major release.

## 1.0.0 — 2026-10-14

### Added

- `architecture-reviewer` agent: read-only review of a diff for dependency direction, layering, ports and DI, and frontend module boundaries. Runs the project's architecture checks first, then a manual pass on changed lines; returns findings as JSON with a verdict. Supports delta re-review of earlier findings.
- Depends on `engineering-paved-path` `^1.0.0` for `onion-architecture`, `frontend-architecture`, `next-best-practices` and `engineering-insights`.
