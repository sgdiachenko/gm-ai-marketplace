# gm-ai-marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) for the team. One repository, one catalog (`.claude-plugin/marketplace.json`), one directory per plugin in `plugins/`.

## Install

In a Claude Code session, add the marketplace once:

```
/plugin marketplace add sgdiachenko/gm-ai-marketplace
```

Then install a plugin:

```
/plugin install <plugin>@gm-ai-marketplace
```

`<plugin>` is a name from the table below, the `name` of an entry in `.claude-plugin/marketplace.json`; `gm-ai-marketplace` is the catalog name. `/plugin` on its own browses the catalog.

From a terminal, one command does both (Claude Code 2.1.275 or later):

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace
```

No GitHub SSH key? Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` first.

## Update

Updating is two different things:

| Command | What it does |
|---|---|
| `/plugin marketplace update gm-ai-marketplace` | Refreshes the catalog, so new plugins and new versions show up |
| `claude plugin update <plugin>@gm-ai-marketplace` | Updates one installed plugin to the version the catalog lists; run `/reload-plugins` or restart Claude Code to load it |

Auto-update is off by default. To turn it on: `/plugin` → **Marketplaces** → `gm-ai-marketplace` → **Enable auto-update**.

Setup details and enabling plugins for a whole project: [docs/installing.md](docs/installing.md).

## Plugins

| Plugin | What it does |
|---|---|
| [sdd-engineering](plugins/sdd-engineering) | Spec-Driven Development: spec, plan, parallel implementation, verification against the spec, architecture and code review, a retro of the run. Installs the three plugins below |
| [engineering-paved-path](plugins/engineering-paved-path) | Shared engineering skills: React, Next.js, Fastify, frontend and backend architecture, React testing, security, `INSIGHTS.md` |
| [research-tools](plugins/research-tools) | Read-only `researcher` agent: answers a concrete question with evidence from the repo or external sources |
| [architecture-review](plugins/architecture-review) | Read-only `architecture-reviewer` agent: dependency direction, layering and module boundaries in a diff |
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
scripts/                          validation, release tagging and eval runs
evals/                            behaviour tests run with claude plugin eval; never shipped
site/                             the catalog site on GitHub Pages, built from this repository
docs/                             maintainer and user docs
specs/                            specs for planned plugins and changes
INSIGHTS.md                       lessons learned
AGENTS.md                         instructions for coding agents working on this repo
```
