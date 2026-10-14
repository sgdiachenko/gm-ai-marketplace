# engineering-paved-path

The team's default engineering practices as Claude Code skills: how to write React, Next.js and Fastify code, where files go on the frontend and the backend, how to test React components, how to review for security, and how to keep a project's `INSIGHTS.md`.

Claude loads a skill on its own when the task matches its description. Other plugins build on these skills: `architecture-review` and `sdd-engineering` declare this plugin as a dependency and call its skills by their namespaced names.

## Install

```bash
claude plugin install engineering-paved-path --marketplace sgdiachenko/gm-ai-marketplace
```

Or in a session: `/plugin install engineering-paved-path --marketplace sgdiachenko/gm-ai-marketplace`. Installing `architecture-review` or `sdd-engineering` installs this plugin too.

## Skills

| Skill | Use it for | Call it |
|---|---|---|
| `react-best-practices` | component design, state, hooks rules, performance, data fetching; anti-patterns with severity | `/engineering-paved-path:react-best-practices` |
| `next-best-practices` | App Router file conventions, Server/Client boundaries, async request APIs, data and caching, errors, metadata, images, hydration | loaded by Claude when needed; not in the `/` menu |
| `fastify-best-practices` | Fastify routes, plugins, schemas, hooks, errors, logging, auth, databases, deployment | `/engineering-paved-path:fastify-best-practices` |
| `frontend-architecture` | where a component, hook, util or constant goes; which feature may import which; App Router layout | `/engineering-paved-path:frontend-architecture` |
| `onion-architecture` | backend rings, the dependency rule, ports and adapters, thin routes, the composition root, dependency-cruiser enforcement | `/engineering-paved-path:onion-architecture` |
| `react-testing-library` | user-flow tests with React Testing Library and Vitest: query priority, `userEvent`, async patterns, MSW | `/engineering-paved-path:react-testing-library` |
| `security` | OWASP Top 10:2025: injection, auth, access control, uploads, secrets, logging; confidence-gated findings | `/engineering-paved-path:security` |
| `engineering-insights` | reading `INSIGHTS.md` before a task and appending a dated finding after one | `/engineering-paved-path:engineering-insights` |

You rarely need to type these. Ask for the work ("add an endpoint that cancels an order", "where should this hook live?", "review this diff for security issues") and Claude picks the matching skill.

### Using a skill from an agent or another plugin

Refer to the skill by its namespaced name. In an agent's frontmatter:

```yaml
skills:
  - engineering-paved-path:onion-architecture
  - engineering-paved-path:engineering-insights
```

A plugin that does this declares the dependency in its `plugin.json`:

```json
"dependencies": [{ "name": "engineering-paved-path", "version": "^1.0.0" }]
```

## Your project's rules win

Every skill here gives defaults. A project's own `AGENTS.md` / `CLAUDE.md`, its architecture docs and its lint configs override them. The architecture skills describe a reference layout (`src/domain`, `src/core`, `src/ports`, `src/modules/<name>/…`, `src/adapters`, `src/platform` for the backend; feature folders for the frontend). Map it to your folders, or tell Claude where your rules live.

For `sdd-engineering` users: list the skills each part of your codebase should follow under *Skill lanes* in `docs/sdd-profile.md`.

## Enforcing the architecture

`onion-architecture` ships `assets/dependency-cruiser.layers.cjs`, a dependency-cruiser config for the reference backend layout. Copy it into your backend package, adapt the paths at the top, and run it in CI. See the skill's `enforcement.md`.

## Limits

- The stack skills target TypeScript web projects: React, Next.js (App Router), Fastify.
- Skills advise; they don't block anything. Enforcement comes from your linters and CI.
- Skill descriptions load into every session: about 930 tokens for all eight. A skill's body loads only when it fires (0.8k–7.2k tokens). Check with `claude plugin details engineering-paved-path`.

## Credits

- `fastify-best-practices` is by Matteo Collina, from [mcollina/skills](https://github.com/mcollina/skills), under the MIT License. See its `NOTICE.md` and `LICENSE`.
- The other skills were written for the team's SDD workflow.

## Releases

See [CHANGELOG.md](CHANGELOG.md).
