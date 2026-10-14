# SDD profile

<!--
Project profile for the sdd-engineering plugin. Save it as docs/sdd-profile.md in your project
(or point agents at another path with a "Profile: <path>" line in the prompt).
Agents read it instead of guessing project paths, commands and rules. Keep the headings;
delete the example rows and write your own. A section you leave empty falls back to the default
noted in it; a missing check command is never guessed — the agents ask instead.
-->

## Paths

| What | Path |
|---|---|
| Specs | docs/specs/ |
| Plans and run state | docs/plans/ |
| Retros | docs/retros/ |
| Design images | docs/design/ |

## Language

- Docs language: English
- EARS keywords: English (WHEN / WHILE / IF … THEN / WHERE)

<!-- For Ukrainian keywords write: EARS keywords: Ukrainian (КОЛИ / ПОКИ / ЯКЩО … ТОДІ / ДЕ) -->

## Modules

| Module | Path | Package manager | Full checks (what CI runs) | Targeted tests |
|---|---|---|---|---|
| api | apps/api/ | pnpm | `pnpm -C apps/api lint` · `pnpm -C apps/api typecheck` · `pnpm -C apps/api test` | `pnpm -C apps/api exec vitest run <files>` |
| web | apps/web/ | pnpm | `pnpm -C apps/web lint` · `pnpm -C apps/web typecheck` · `pnpm -C apps/web test` | `pnpm -C apps/web exec vitest run <files>` |

Tests that need infrastructure (not run by implementers unless it is up):

- `apps/api/**/*.it.test.ts` — needs Docker (`docker info`)

## Skill lanes

Which skills govern which files. Implementers load these for every file they touch.

| Files | Skills |
|---|---|
| `apps/web/src/app/**/{page,layout,route,loading,error,not-found}.tsx` | `engineering-paved-path:next-best-practices`, `engineering-paved-path:frontend-architecture` |
| `apps/web/src/**/*.tsx` | `engineering-paved-path:react-best-practices`, `engineering-paved-path:frontend-architecture` |
| `apps/web/**/*.test.tsx` | `engineering-paved-path:react-testing-library` |
| `apps/api/src/modules/*/routes.ts` | `engineering-paved-path:fastify-best-practices`, `engineering-paved-path:onion-architecture`, `engineering-paved-path:security` |
| `apps/api/src/**` | `engineering-paved-path:onion-architecture` |

## Architecture rules

- Sources: docs/architecture.md, apps/api/.dependency-cruiser.cjs, apps/web/eslint.config.mjs
- Checks: `pnpm -C apps/api arch:check` · `pnpm -C apps/web lint`
- Baseline of known violations: apps/api/.dependency-cruiser-known-violations.json

## Guardrails

Built in for every agent: no commits, pushes or PRs; no installs; no migrations or seeds; no destructive container commands. Add your own:

- Forbidden commands: `pnpm db:reset`
- Do-not-touch paths: `apps/api/src/generated/`, `infra/`

## Live checks

- Manual verification may call paid or credentialed services: no
- Run the app for manual checks: `pnpm dev` (web on http://localhost:3000)
