# sdd-engineering — maintainer notes

The Spec-Driven Development workflow. Depends on `engineering-paved-path`, `research-tools` and `architecture-review`, each `^1.0.0`. Claude Code only (its value is in agents; see `docs/codex-compatibility.md`, rule 5). Spec: `specs/sdd-engineering.md`.

## Where each component came from

Ported from `sgdiachenko/dev-digest` at `1b694bc41a61`.

| Component | Source | Main changes |
|---|---|---|
| `agents/spec-creator.md` | `.claude/agents/spec-creator.md` | paths, modules and language from the project profile; EARS keywords from the profile (English by default); preloads namespaced skills; contract-change reasoning inlined instead of reading three dev-digest skills; never sets `implemented` (run-plan does) |
| `agents/implementation-planner.md` | `.claude/agents/implementation-planner.md` | preloads one skill instead of 16 (~40k tokens); skills per file from the profile's *Skill lanes* or by file type, loaded through the Skill tool; checks from the profile; unknown project facts become `Q#`; `doc-writer` / `test-writer` hand-offs removed |
| `agents/implementer.md` | `.claude/agents/implementer.md` | step skills loaded through the Skill tool by namespaced name; checks and guardrails from the profile; dev-digest's lane table, commands, migration and contract-sync rules generalized |
| `agents/plan-verifier.md` | `.claude/agents/plan-verifier.md` | `gate.sh fingerprint` replaced by the bundled `skills/run-plan/scripts/fingerprint.sh`; skill sources loaded through the Skill tool; checks from the profile |
| `skills/run-plan/` | `.claude/skills/run-plan/SKILL.md` | profile intake and draft offer; reviewers = `architecture-review:architecture-reviewer` ∥ `/code-review` (+ `/security-review` when flagged); the `doc-writer` phase became "close the spec"; the `/pr-self-review` gate became "full checks, then commit or PR on the user's yes"; principles renumbered |
| `skills/run-plan/profile-template.md` | new | the profile template |
| `skills/run-plan/scripts/fingerprint.sh` | new | working-tree fingerprint (HEAD + staged, unstaged, untracked changes), with `--exclude` for the plans directory |
| `skills/workflow-retro/` | `.claude/skills/workflow-retro/` | script called through `${CLAUDE_SKILL_DIR}`; transcripts found through `CLAUDE_CONFIG_DIR`; rate card read from `${CLAUDE_PLUGIN_DATA}/prices.json` (`--prices`), bundled card empty; report language from the profile |
| `skills/ears-requirements/` | `.claude/skills/ears-requirements/SKILL.md` | English keywords by default with a Ukrainian option; examples rewritten without dev-digest's domain |
| `skills/ux-design-review/` | `.claude/skills/ux-design-review/SKILL.md` | dev-digest states (`~/.devdigest`, GitHub token, LLM review runs) generalized |
| `skills/mermaid-diagram/` | `.claude/skills/mermaid-diagram/` | reference to a missing `references.md` replaced by the Mermaid docs link |

Not ported, by decision (see the spec's non-goals): `brainstorm`, `test-writer`, `doc-writer`, `security-reviewer`, `stack-reviewer`, `conventions-reviewer`, `pr-self-review` and its gate hook, dev-digest's own specs, plans and retros.

## Platform facts the design relies on

- Plugin agents ignore `permissionMode`, `hooks` and `mcpServers`. Read-only agents are read-only through `tools` / `disallowedTools`; the implementer runs in whatever permission mode the session has.
- `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_SKILL_DIR}` are substituted in skill and agent Markdown, but they are not in the environment of Bash commands. Scripts receive paths as arguments.
- Skills with `disable-model-invocation: true` (`run-plan`, `workflow-retro`) run only when typed and can't be preloaded by an agent.
- Whether an agent's `skills:` list preloads a skill from a dependency plugin by its namespaced name is not documented. The `namespaces` eval suite checks reachability; if preloading turns out not to work, agents still load the skills through the Skill tool.

## Context cost

Measured with `claude plugin details sdd-engineering` on Claude Code 2.1.299: ~1,120 tokens always-on for 4 agents and 5 skills; on invoke from ~2.4k (`ux-design-review`) to ~7.7k (`spec-creator`). With its three dependencies, installing `sdd-engineering` adds ~2,300 tokens to every session.

## Before a release

1. `scripts/validate.sh`.
2. Load all four plugins: `claude --plugin-dir plugins/engineering-paved-path --plugin-dir plugins/research-tools --plugin-dir plugins/architecture-review --plugin-dir plugins/sdd-engineering`, then `claude plugin details <name>` for each.
3. `scripts/run-evals.sh namespaces` and `scripts/run-evals.sh sdd-engineering` (paid).
4. A manual chain on a small project: spec → plan → `/run-plan` → `/workflow-retro`.
5. Push the branch and run `scripts/try-install.sh sdd-engineering`; the three dependencies must install with it.
