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

## 2026-10-14 — Plugin agents ignore permissionMode
- **Context:** porting the SDD agents from dev-digest into `sdd-engineering`.
- **Insight:** Claude Code ignores `permissionMode`, `hooks`, `mcpServers` and `initialPrompt` in a plugin agent's frontmatter. The planner's `plan` mode and the implementer's `acceptEdits` don't carry over; only `tools` and `disallowedTools` restrict a plugin agent.
- **Action:** read-only agents have no Write/Edit in their tool lists; the `sdd-engineering` README tells users the implementer follows the session's permission mode.

## 2026-10-14 — Dependency ranges resolve against git tags
- **Context:** making `sdd-engineering` depend on three plugins with `^1.0.0`.
- **Insight:** a range in `dependencies` resolves against tags named `<plugin>--v<version>` in the repository that hosts the plugin — for relative-path plugins, this marketplace. Without a matching tag Claude Code installs the catalog's current copy and only checks the range at load time, disabling the dependent if it doesn't match. A `^1.0.0` range also means dependencies can't start at `0.1.0`.
- **Action:** `scripts/tag-releases.mjs` tags every untagged plugin version on `main` (`tag-releases.yml`); `scripts/check-marketplace.mjs` checks that each range is satisfied by the catalog. The four SDD plugins start at `1.0.0`.

## 2026-10-14 — Path variables are substituted in Markdown, not exported to Bash
- **Context:** pointing `workflow-retro` at its bundled script and a user rate card.
- **Insight:** `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are replaced inline in skill and agent Markdown, but commands Claude runs through the Bash tool don't get them as environment variables. A script can't read `CLAUDE_PLUGIN_DATA` itself.
- **Action:** skills write the variable into the command line (`node "${CLAUDE_SKILL_DIR}/assets/collect.mjs" --prices "${CLAUDE_PLUGIN_DATA}/prices.json"`), and scripts take paths as arguments.

## 2026-10-14 — claude plugin eval publishes reports by default
- **Context:** porting dev-digest's evals to the built-in `claude plugin eval`.
- **Insight:** the command publishes its HTML report to claude.ai unless given `--no-publish`, and its default baseline arm runs without the plugin, where namespaced agents don't exist and every dispatch fails.
- **Action:** `scripts/run-evals.sh` always passes `--no-publish` and `--ablation none`.

## 2026-10-14 — claude plugin eval loads plugins only from under its target
- **Context:** first run of the `namespaces` suite, with each case file as the target.
- **Insight:** a case's `plugins:` entries must resolve inside the containment root: the enclosing plugin, or else the directory given as the target. With a case file as the target, the root is the case directory, so `../../../plugins/<name>` fails to load ("outside the containment root") before any model call.
- **Action:** `scripts/run-evals.sh` runs `claude plugin eval .` from the repository root and selects a suite with `--tag <suite>`; every case carries its suite as a tag.

## 2026-10-14 — Judge graders need the agent's own words and a stronger judge
- **Context:** the `architecture-review` eval suite; the reviewer found both planted violations in every run, but the case scored 0.44.
- **Insight:** an `llm` grader judges the main session's final reply. Asked only to "show the review", the main session paraphrased it into a table, dropping the verbatim quotes the rubric required and adding its own corrections. One all-or-nothing rubric turned a single strict clause into a failed case, and the default Haiku judge failed on-topic findings that the rubric explicitly allowed.
- **Action:** prompts ask for the agent's output "exactly as returned"; one grader per criterion; rubrics name what fails rather than what passes; `scripts/run-evals.sh` passes `--judge-model sonnet`.

## 2026-10-14 — GitHub Pages serves 404.html at any depth
- **Context:** building the catalog site under the project path `/gm-ai-marketplace/`.
- **Insight:** relative links work on every page except `404.html`: GitHub returns it for a missing URL at any depth, so `assets/site.css` resolves against the missing path and the page renders unstyled. A local `python3 -m http.server` never serves `404.html` for a missing path, so the bug doesn't show in a preview.
- **Action:** `404.html` uses the absolute base path from `site/config.mjs`; every other page links relatively. `site/build.mjs` checks each link against the output and fails on a relative one in `404.html`.

## 2026-10-14 — `claude plugin details` lists commands as skills and has no JSON output
- **Context:** comparing the site's component inventory with what Claude Code loads, on Claude Code 2.1.299.
- **Insight:** the Skills line names skills and `commands/*.md` files together, the Hooks line lists each event once, and the command has no `--json` flag, so the build parses the text output. A wording change in a new Claude Code release breaks the parse.
- **Action:** `site/lib/inventory.mjs` fails with a clear message when a section is missing. Check it when bumping the Claude Code pin.

## 2026-10-14 — A CSP meta tag also blocks style attributes
- **Context:** porting the design prototype, which styles everything inline, to a site whose CSP allows only its own origin.
- **Insight:** `style-src 'self'` blocks `style="…"` attributes and `<style>` elements in the HTML, not only third-party stylesheets. Setting `element.style` from a script is still allowed. Fonts and icons from Google Fonts or unpkg would be blocked too.
- **Action:** all styles live in `site/assets/site.css`; fonts and icons are vendored in `site/vendor/`. A build test fails on any `style` attribute or inline script.

## 2026-10-14 — Real skills nest `metadata:` in frontmatter
- **Context:** the first build of the catalog site against the SDD engineering plugins (#3).
- **Insight:** skills use `metadata:` with `tags: a, b` under it, the Agent Skills convention, so a parser that rejects every nested mapping, as the spec first said, fails on real content. Agents also use `skills:` lists and `disallowedTools`.
- **Action:** `site/lib/frontmatter.mjs` accepts one level of mapping and still fails with `file:line` on deeper nesting; `metadata.tags` become search keywords. Build the site against new plugins before relying on a parser rule.
