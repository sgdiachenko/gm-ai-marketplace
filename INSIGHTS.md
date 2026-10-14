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
- **Context:** the first build of the catalog site against plugins in progress on the `sdd-engineering` branch.
- **Insight:** skills use `metadata:` with `tags: a, b` under it, the Agent Skills convention, so a parser that rejects every nested mapping, as the spec first said, fails on real content. Agents also use `skills:` lists and `disallowedTools`.
- **Action:** `site/lib/frontmatter.mjs` accepts one level of mapping and still fails with `file:line` on deeper nesting; `metadata.tags` become search keywords. Build the site against new plugins before relying on a parser rule.
