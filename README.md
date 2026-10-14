# gm-ai-marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) for the team. One repository, one catalog (`.claude-plugin/marketplace.json`), one directory per plugin in `plugins/`.

## Install a plugin

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace
```

The command adds the marketplace on first use (Claude Code 2.1.275 or later). Inside a session, use `/plugin` to browse the catalog.

No GitHub SSH key? Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` first. Setup, updates and team-wide enablement: [docs/installing.md](docs/installing.md).

## Plugins

| Plugin | What it does |
|---|---|
| [example](plugins/example) | Template plugin. Copy it to start a new one; remove it once real plugins exist |

## Contributing

- Add a plugin: [docs/adding-a-plugin.md](docs/adding-a-plugin.md)
- Release, roll back, rename or remove a plugin: [docs/releasing.md](docs/releasing.md)
- Planned Codex support and the rules that keep it cheap: [docs/codex-compatibility.md](docs/codex-compatibility.md)
- Before pushing, run `scripts/validate.sh`. CI runs the same checks, plus a version-bump check on pull requests.
- The catalog site has its own check, Site; see [site/README.md](site/README.md).

## Layout

```
.claude-plugin/marketplace.json   catalog: one entry per plugin
plugins/<name>/                   a plugin; everything here ships to users
scripts/                          validation used locally and in CI
site/                             the catalog site on GitHub Pages, built from this repository
docs/                             maintainer and user docs
specs/                            specs for planned plugins and changes
INSIGHTS.md                       lessons learned
AGENTS.md                         instructions for coding agents working on this repo
```
