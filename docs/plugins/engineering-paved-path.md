# engineering-paved-path — maintainer notes

Shared practice skills. `architecture-review` and `sdd-engineering` depend on it (`^1.0.0`), so a major release here forces a release of both. Spec: `specs/sdd-engineering.md`.

## Where each skill came from

Ported from `sgdiachenko/dev-digest` at `1b694bc41a61` (`.claude/skills/<name>/`) unless noted.

| Skill | Origin | Changes in this plugin |
|---|---|---|
| `react-best-practices` | dev-digest; no public upstream found by code search on 2026-10-14 | copied unchanged |
| `next-best-practices` | new | written for this plugin. The dev-digest copy came from `vercel-labs/next-skills`, which publishes no license and has withdrawn the skill in favour of the docs bundled with Next.js, so it isn't redistributed |
| `fastify-best-practices` | [mcollina/skills](https://github.com/mcollina/skills/tree/72b72751477157ebda36203eaffac701ac5df5ae/skills/fastify) at `72b7275`, MIT | body and `rules/` identical to upstream (dev-digest had an older copy); description shortened; `LICENSE` and `NOTICE.md` added |
| `frontend-architecture` | dev-digest | description shortened; links to sibling skills replaced by namespaced names; the Ukrainian research `README.md` (with dev-digest paths) not shipped |
| `onion-architecture` | dev-digest | rewritten around a neutral reference layout (`src/domain`, `src/core`, `src/ports`, `src/modules/<name>/…`, `src/adapters`, `src/platform`); examples use an orders domain; dev-digest's ring map, violation list (`migration.md`) and research `README.md` dropped; dependency-cruiser config generalized with package lists at the top |
| `react-testing-library` | dev-digest (a rewrite of an earlier skill whose origin is unknown) | copied unchanged, with its `README.md` |
| `security` | dev-digest, synthesized from the sources in its `references.md` | an example path neutralized; an install command that wrote into a project's skills folder removed |
| `engineering-insights` | dev-digest | rewritten: no fixed module list; where `INSIGHTS.md` lives and its entry format follow the project |

Before adding a third-party skill: confirm its license allows redistribution, keep its `LICENSE` in the skill folder, add a `NOTICE.md` that names the upstream commit and lists changes, and add a row here.

## Context cost

Measured with `claude plugin details engineering-paved-path` on Claude Code 2.1.299:

- always-on: ~930 tokens per session (about 100–120 per skill description);
- on-invoke: from ~0.8k (`engineering-insights`) to ~7.2k (`react-testing-library`) tokens.

## Planned

The other dev-digest stack skills (`zod`, `typescript-expert`, `drizzle-orm-patterns`, `postgresql-table-design`, `breaking-change`, `response-schema`, `deprecation-policy`, `semver-discipline`) can join as minor releases after a license check and generalization.
