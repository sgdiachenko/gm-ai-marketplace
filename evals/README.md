# Evals

Behaviour tests for the SDD plugins, in the format of Claude Code's built-in [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Maintainer-only: this directory sits outside `plugins/`, so it never ships to users. Each case names the plugins it loads with `plugins:` in its `prompt.md`.

## Suites

| Suite | What it checks | Graders | Approximate cost |
|---|---|---|---|
| `namespaces` | each skill and agent is reachable by its namespaced name: `engineering-paved-path:<skill>`, `research-tools:researcher`, `architecture-review:architecture-reviewer`, the four `sdd-engineering` agents | `tool_used` only (free) | one run per case |
| `sdd-engineering` | `spec-creator` in analyze mode asks numbered questions and writes no file; `/run-plan` without a plan points to the planner and starts no implementer | `tool_used`, `file_exists`, `regex` (free) | two runs per case |
| `architecture-review` | the reviewer finds a framework import in the domain ring and a concrete repository built in a service, flags filesystem access in the pure core, and approves a harmless rename | `tool_used` + `llm` judge | three runs per case, plus judge calls |

The `architecture-review` fixtures are the dev-digest fixtures moved onto the reference layout of `engineering-paved-path:onion-architecture` (`src/domain`, `src/core`, `src/modules/<name>/…`).

## Run

```bash
scripts/run-evals.sh namespaces              # per-case cost ceiling defaults to $2
scripts/run-evals.sh sdd-engineering
scripts/run-evals.sh architecture-review 5
```

The script runs each case with:

- `--ablation none` — without the plugins, the namespaced agents don't exist, so a baseline arm would only fail;
- `--no-publish` — `claude plugin eval` otherwise publishes the HTML report to claude.ai;
- `--trust-plugin` and `--max-cost-usd`.

Reports go to `evals/results/<timestamp>/<suite>/<case>/`, which git ignores.

Runs use your Claude credentials and count against your plan or API bill. CI doesn't run them: it has no model credentials. Run the suites by hand before releasing a change to these plugins, and note the result in the PR.

## Add a case

Copy a case directory in the suite and edit `prompt.md` and `graders/`. Prefer free graders (`tool_used`, `regex`, `file_exists`) for anything that can be checked without a judge. To check that an agent was used:

```markdown
---
type: tool_used
tool: Agent
input_match: '"subagent_type"\s*:\s*"research-tools:researcher"'
---
```

Grader types, `prompt.md` fields and the result format: [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals).
