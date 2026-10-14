# architecture-review

A read-only `architecture-reviewer` agent that checks a diff for layering problems before a human reviewer has to: imports that point outward, services that take the whole DI container, SQL in route handlers, adapters reaching into modules, frontend features importing each other's internals.

It reviews against **your** rules first — the project profile, `AGENTS.md`, architecture docs, and the linters you already configured (dependency-cruiser, ESLint boundary rules). Where you have none, it falls back to the `onion-architecture` and `frontend-architecture` skills from `engineering-paved-path`.

## Install

```bash
claude plugin install architecture-review --marketplace sgdiachenko/gm-ai-marketplace
```

This also installs `engineering-paved-path`, which the agent depends on. `sdd-engineering` installs both.

## The `architecture-reviewer` agent

| | |
|---|---|
| Name | `architecture-review:architecture-reviewer` |
| Model | Sonnet |
| Tools | Read, Grep, Glob, read-only Bash, Skill |
| Preloaded skills | `engineering-paved-path:onion-architecture`, `engineering-paved-path:frontend-architecture`, `engineering-paved-path:engineering-insights` |
| Writes | nothing |

### How to use it

```text
Use architecture-review:architecture-reviewer on all open changes.
Use architecture-review:architecture-reviewer on origin/main..HEAD.
Use architecture-review:architecture-reviewer: re-check F1 and F3 after my fix in src/modules/orders/service.ts.
```

Or @-mention it: `@agent-architecture-review:architecture-reviewer`.

With no scope, it reviews everything not yet on the default branch: committed, staged, unstaged and untracked changes.

### What it does

1. Reads your rule sources: `docs/sdd-profile.md` (*Architecture rules*), `AGENTS.md` / `CLAUDE.md`, architecture docs, linter configs.
2. Runs your architecture checks first, such as `npm run arch:check` or a dependency-cruiser script, and records exit codes. It never installs anything and never runs `--fix`.
3. Reviews the changed lines only, using the onion and frontend checklists mapped onto your folders.
4. Returns findings and a verdict.

### Output

```text
# Architecture Review
## Scope            base, files, areas, rule sources read
## Mechanical checks  command · exit · result
## Findings         JSON array: severity, file, line, source, rule, summary, evidence, fix
## Verdict          approve | comment | request_changes
## Config vs documentation drift
## Not found / gaps
```

- `CRITICAL` needs a `file:line` in the diff, the changed line quoted, and a named rule; otherwise it is reported as `WARNING`.
- The verdict follows from the findings alone: any `CRITICAL` → `request_changes`; only `WARNING` / `SUGGESTION` → `comment`; none → `approve`.
- Pre-existing violations outside the changed lines, and entries in your linter's baseline, are not reported unless the diff makes them worse.

### Delta re-review

After a fix round, pass the earlier findings and the files you changed:

```text
Use architecture-review:architecture-reviewer.
Re-check: F1 src/modules/orders/routes.ts:42, F3 src/adapters/payments/stripe.ts:10
Fix files: src/modules/orders/routes.ts, src/modules/orders/service.ts
```

It marks each finding `fixed`, `still-open` or `moved`, and reviews only the changed lines of the fix files for new problems. `/sdd-engineering:run-plan` uses this mode in its review-fix loop.

## Tell it your rules

The agent works best when it knows where your rules and checks are. If you use `sdd-engineering`, fill in *Architecture rules* in `docs/sdd-profile.md`:

```markdown
## Architecture rules
- Sources: docs/architecture.md, .dependency-cruiser.cjs, apps/web/eslint.config.mjs
- Checks: npm run arch:check · npm --prefix apps/web run lint
- Baseline: .dependency-cruiser-known-violations.json
```

Without a profile it reads `AGENTS.md` and finds linter configs and `arch`/`lint` scripts on its own.

## Limits

- Static review only: it reads code and runs your checks; it doesn't run the app or the tests.
- It reviews architecture only. Correctness bugs belong to `/code-review`; security to `/security-review`.
- Read-only Bash is enforced by its prompt and its tool list (no Write or Edit), not by a sandbox.

## Releases

See [CHANGELOG.md](CHANGELOG.md).
