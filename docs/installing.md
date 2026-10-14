# Installing plugins from gm-ai-marketplace

## Requirements

- Claude Code 2.1.275 or later for the one-step install below. CI validates the catalog against the version pinned in `.github/workflows/validate.yml`.
- `git`.

## Git access

Claude Code clones the marketplace with `git`. The repository is public, so cloning needs no credentials.

No GitHub SSH key? Add `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to your shell profile. Claude Code can clone GitHub sources over SSH, and SSH needs a key even for a public repository. Without the variable, installs from `/plugin` and plugin updates fail, even when `claude plugin install` in a shell happens to work.

## Install

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace
```

The first run adds the marketplace. After that, `claude plugin install <plugin>@gm-ai-marketplace` is enough, and `/plugin` inside a session lists everything in the catalog.

On Claude Code before 2.1.275, add the marketplace first:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace
claude plugin install <plugin>@gm-ai-marketplace
```

## Updates

Auto-update is off for this marketplace by default. To turn it on: `/plugin` → **Marketplaces** → `gm-ai-marketplace` → **Enable auto-update**. Claude Code then checks after your first message in a session and asks you to run `/reload-plugins`.

To update by hand:

- in a session: `/plugin marketplace update gm-ai-marketplace`
- in a shell: `claude plugin update <plugin>@gm-ai-marketplace`

## Enable plugins for everyone in a project

In the project repository, run once:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace --scope project
```

Then list the plugins in `.claude/settings.json` and commit the file:

```json
{
  "extraKnownMarketplaces": {
    "gm-ai-marketplace": {
      "source": { "source": "github", "repo": "sgdiachenko/gm-ai-marketplace" }
    }
  },
  "enabledPlugins": {
    "example@gm-ai-marketplace": true
  }
}
```

- Teammates get the plugins after they accept the workspace trust dialog for the folder. Every plugin here uses a relative-path source, so it loads without a separate install step.
- To opt out on your machine, set the plugin to `false` in `.claude/settings.local.json`.
- Cloud sessions don't add marketplaces listed in a repository's settings.

## For administrators

Managed settings can register the marketplace with `"autoUpdate": true` for everyone, force-enable plugins through `enabledPlugins`, and restrict other sources with `strictKnownMarketplaces`. See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org).
