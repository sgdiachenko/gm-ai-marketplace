# Contributing

This repository is a Claude Code plugin marketplace: one catalog, `.claude-plugin/marketplace.json`, and one directory per plugin under `plugins/`. Everything inside `plugins/<name>/` ships to users; everything else is for maintainers.

## Where things go

| You are adding | Put it in | Read first |
|---|---|---|
| a new plugin | `plugins/<name>/` plus a catalog entry | `docs/adding-a-plugin.md` |
| a skill, agent or hook to a plugin | `plugins/<name>/skills/`, `agents/`, `hooks/` | `docs/adding-a-plugin.md` (*Plugin layout*, *Rules*), `docs/codex-compatibility.md` |
| a component another plugin uses | `engineering-paved-path`, or the plugin that owns it, then `dependencies` in the consumer | `docs/releasing.md` (*Dependencies between plugins*) |
| a behaviour test | `evals/<suite>/<case>/` | `evals/README.md` |
| maintainer notes on a plugin | `docs/plugins/<name>.md` | — |
| a plan for a new plugin or feature | `specs/<name>.md` | — |
| a change to the catalog site | `site/` | `site/README.md` |

## Manifest fields

`plugin.json` holds `name` (the directory name, kebab-case), `version` (semver; the only place a version lives), `description`, `author`, `repository`, `keywords` and `dependencies`. The catalog entry holds `name`, `source` (`./plugins/<name>`), `description` and `category`, and never `version`. Each release adds a `## <version> — <YYYY-MM-DD>` entry to the plugin's `CHANGELOG.md`.

## Dependency rules

A plugin that names another plugin's component as `<plugin>:<name>` declares that plugin in `dependencies` with a range such as `^1.0.0`. Ranges resolve against the `<plugin>--v<version>` tags CI creates on `main`, so release a dependency before the plugin that needs its new version. Details: `docs/releasing.md`.

## Checks

```bash
scripts/validate.sh                       # what CI runs: claude plugin validate --strict, conventions, shellcheck
node scripts/check-pr.mjs origin/main     # version bumps and renames against the base branch
scripts/try-install.sh <name> [branch]    # install from the pushed branch in a throwaway profile
scripts/run-evals.sh <suite>              # behaviour evals; paid, run by hand
```

## Pull request checklist

- [ ] One plugin per PR where possible.
- [ ] Every changed plugin has a higher `version` and a `CHANGELOG.md` entry (README- and CHANGELOG-only changes excepted).
- [ ] `scripts/validate.sh` and `node scripts/check-pr.mjs origin/main` pass.
- [ ] Every `<plugin>:<name>` reference is the plugin itself or a declared dependency.
- [ ] No secrets, absolute paths or one project's names in plugin files (`SECURITY.md`).
- [ ] For a behaviour change: the affected eval suites ran, and the PR notes the result and cost.
- [ ] The pushed branch installs with `scripts/try-install.sh <name>`.
- [ ] The plugin's `README.md` and `docs/plugins/<name>.md` describe the change; the root `README.md` table lists a new plugin.
- [ ] Everything is in English.
