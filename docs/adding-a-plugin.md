# Adding a plugin

## Steps

1. Write a spec in `specs/<name>.md`: the problem, who uses the plugin, which components it needs.
2. Copy the template:
   ```bash
   cp -R plugins/example plugins/<name>
   ```
3. In `plugins/<name>/.claude-plugin/plugin.json`, set `name` and `description`, and reset `version` to `0.1.0`.
4. Add an entry to `.claude-plugin/marketplace.json`. Leave `version` out; it lives only in `plugin.json`.
   ```json
   {
     "name": "<name>",
     "source": "./plugins/<name>",
     "description": "One line users see in /plugin",
     "category": "<category>"
   }
   ```
5. Build the components (layout below) and update the plugin's `README.md`.
6. Run `scripts/validate.sh`.
7. Try it while editing: `claude --plugin-dir plugins/<name>`, then `/reload-plugins` after each change.
8. Before merging, push the branch and install it the way users will, in a throwaway profile that leaves `~/.claude` alone:
   ```bash
   scripts/try-install.sh <name>
   ```
   This copies the plugin into a cache like a real install does, which a local-path marketplace doesn't. Details in `docs/releasing.md`.
9. Add a row to the plugin table in the root `README.md`.

## Plugin layout

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json       only the manifest goes in .claude-plugin/
├── skills/<skill>/SKILL.md
├── agents/<agent>.md
├── hooks/hooks.json
├── .mcp.json
├── scripts/              executables called from hooks or MCP configs
└── README.md
```

Claude Code finds these locations without any manifest field. Component folders placed inside `.claude-plugin/` are silently ignored.

## Rules

**Names.** Kebab-case. Directory name, catalog entry `name` and `plugin.json` `name` are the same. Names starting with `claude-` or `anthropic-` fail validation. Choose carefully: renaming later needs a migration (see `docs/releasing.md`). For a friendlier label, set `displayName`.

**Only runtime files.** Everything under `plugins/<name>/` is copied to users. Specs go in `specs/`, maintainer notes in `docs/plugins/<name>.md`, tests and tooling at the repo root. `scripts/check-marketplace.mjs` rejects `AGENTS.md`, `CLAUDE.md`, `INSIGHTS.md`, `docs/`, `specs/`, `tests/` and `node_modules/` inside a plugin. Claude Code doesn't load a plugin's `CLAUDE.md` anyway; put instructions in a skill.

**Skills over commands.** New behaviour goes into `skills/`. Commands stay Claude-only; skills port to Codex (see `docs/codex-compatibility.md`).

**Paths.**
- Hooks and MCP configs reference bundled files as `"${CLAUDE_PLUGIN_ROOT}"/scripts/<file>`, quoted so paths with spaces stay one argument.
- Nothing may point outside the plugin directory (`../`). Installed plugins are copied to a cache, and files outside aren't copied.
- To share a file between plugins, symlink it inside the repo. On install, Claude Code copies the target's content in place of the link.
- Persistent state, caches and installed dependencies go to `${CLAUDE_PLUGIN_DATA}`. `${CLAUDE_PLUGIN_ROOT}` changes with every version.

**Scripts.** Executable, with a shebang. Shell must run on bash 3.2 (stock macOS): no `mapfile`, `declare -A` or `${var,,}`; mind BSD vs GNU flags (`sed -i ''`, `readlink -f`, `stat`).

**No top-level `bin/`.** claude.ai organization sync rejects plugins that have one. Use `scripts/`.

**Node.js dependencies.** Ship `package.json` with `package-lock.json` (npm 7 or later) or a text `bun.lock`. Claude Code installs them into the cache with install scripts disabled, within 60 seconds. `yarn.lock`, `pnpm-lock.yaml` and git dependencies get no install.

**No Git LFS.** Clones never download LFS content; plugins would receive pointer files.

**Context cost.** Every skill and agent description loads into each session, used or not. Keep descriptions short and check the cost with `claude plugin details <name>`. For heavy plugins, or plugins that call external services, set `"defaultEnabled": false` in the catalog entry so users opt in.

**Secrets.** Never commit credentials. Ask users for them through `userConfig` with `"sensitive": true`, which stores the value in the system keychain.
