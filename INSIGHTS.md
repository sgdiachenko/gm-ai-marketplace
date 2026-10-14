# INSIGHTS

Lessons learned while working on this repository. Read before changing it; append new entries at the end.

Entry template:

```markdown
## YYYY-MM-DD — <short title>
- **Context:** what we were doing
- **Insight:** what turned out to be true and wasn't obvious
- **Action:** what we changed, or what to do next time
```

---

## 2026-10-13 — An unchanged version blocks updates
- **Context:** research for the initial scaffold.
- **Insight:** Claude Code resolves a plugin's version from `plugin.json`, then the catalog entry, then the commit SHA, and caches by it. New commits under an unchanged `version` never reach users. When both files set `version`, `plugin.json` wins without a load-time warning.
- **Action:** `version` lives only in `plugin.json`; `scripts/check-pr.mjs` fails a PR that changes a plugin without bumping it.

## 2026-10-13 — Symlinked plugin.json installs but fails strict catalog validation
- **Context:** tested one shared manifest for Claude Code and Codex on Claude Code 2.1.296.
- **Insight:** `.claude-plugin/plugin.json -> ../plugin.json` installs correctly (the symlink is kept in the cache), but `claude plugin validate . --strict` fails with "is a symlink or is not a regular file, so it was not validated". A Codex `extensions` field adds "Unknown field 'extensions'".
- **Action:** keep `plugin.json` a regular file; `scripts/check-marketplace.mjs` rejects a symlinked one. Plan for Codex in `docs/codex-compatibility.md`.

## 2026-10-13 — A local-path marketplace hides cache bugs
- **Context:** choosing how to test plugins before release.
- **Insight:** a marketplace added from a local directory loads relative-path plugins in place, ignores `version` and skips the dependency install, so `../` paths and missing bumps work locally and break for users. `CLAUDE_CONFIG_DIR` pointed at an empty directory gives a separate profile, plugin cache included, without touching `~/.claude`.
- **Action:** before release, install from the git branch into a throwaway profile (`docs/adding-a-plugin.md`).

## 2026-10-14 — A rollback is a new release
- **Context:** writing release and rollback tooling.
- **Insight:** `git revert` of a release lowers the plugin's `version`. `check-pr.mjs` rejects that, and since Claude Code caches by version, users who have the bad version may never get the old files back. Whether Claude Code moves users to a lower version at all is untested.
- **Action:** `scripts/rollback.mjs` restores the old files under the next patch version above the current one (`docs/releasing.md`).
