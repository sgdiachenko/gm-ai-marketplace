# Installing plugins from gm-ai-marketplace

## Requirements

- Claude Code 2.1.275 or later for the one-step install in a session, 2.1.292 or later for the one-step install from a terminal. On older versions, add the marketplace first, then install. CI validates the catalog against the version pinned in `.github/workflows/validate.yml`.
- `git`.

## Git access

Claude Code clones the marketplace with `git`. The repository is public, so cloning needs no credentials.

No GitHub SSH key? Add `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to your shell profile. Claude Code can clone GitHub sources over SSH, and SSH needs a key even for a public repository. Without the variable, installs from `/plugin` and plugin updates fail, even when `claude plugin install` in a shell happens to work.

## Install

The commands below run in one of two places, and each block holds one command:

- **In a terminal**: your shell, such as macOS Terminal, iTerm or the terminal of your IDE. These commands start with `claude plugin`. Inside a running Claude Code session, you can run one by putting `!` in front of it.
- **In a Claude Code session**: at the Claude Code prompt. These commands start with `/plugin`.

Replace `<plugin>` with the plugin's name, such as `sdd-engineering`. A plugin installs together with the plugins it depends on.

### In a terminal

Add the marketplace, once per machine:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace
```

Install a plugin for yourself, in every project:

```bash
claude plugin install <plugin>@gm-ai-marketplace
```

Or do both in one command, on Claude Code 2.1.292 or later:

```bash
claude plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace
```

A Claude Code session that is already open loads the plugin after `/reload-plugins`.

### In a Claude Code session

Add the marketplace:

```text
/plugin marketplace add sgdiachenko/gm-ai-marketplace
```

Install a plugin:

```text
/plugin install <plugin>@gm-ai-marketplace
```

Or do both in one command, on Claude Code 2.1.275 or later. This is the command **Copy install** copies in the catalog:

```text
/plugin install <plugin> --marketplace sgdiachenko/gm-ai-marketplace
```

In a session, `/plugin install` doesn't install right away. It opens the plugin's details and asks where to install it: for you in every project (user scope), for everyone who works in this repository (project scope) or for you in this repository only (local scope). There is no `--scope` flag in a session. `/plugin` on its own lists everything in the catalog.

## Install into a project

To install a plugin for one repository, so that everyone who works in it gets it, run these in a terminal from the repository's root. Both take `--scope project`:

```bash
claude plugin marketplace add sgdiachenko/gm-ai-marketplace --scope project
```

```bash
claude plugin install <plugin>@gm-ai-marketplace --scope project
```

The first command declares the marketplace in the project's `.claude/settings.json`; the second enables the plugin and its dependencies there. Commit `.claude/settings.json`. Don't use the one-step `--marketplace` form for a project: it declares the marketplace in your user settings even with `--scope project`, so teammates wouldn't get it.

In a session, choosing **project scope** in the `/plugin install <plugin>@gm-ai-marketplace` panel enables the plugin for the repository too. Run the terminal `marketplace add … --scope project` command above as well, so the marketplace is declared in the project.

To write the file by hand instead, list the marketplace and the plugins in `.claude/settings.json`:

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

## Updates

Auto-update is off for this marketplace by default. To turn it on: `/plugin` → **Marketplaces** → `gm-ai-marketplace` → **Enable auto-update**. Claude Code then checks after your first message in a session and asks you to run `/reload-plugins`. A project can keep it off for itself with `"autoUpdate": false` on the marketplace's entry in its `.claude/settings.json`.

To update by hand, refresh the catalog first, then update the plugin. These are two separate steps.

### Update in a terminal

Refresh the catalog, so new plugins and new versions show up:

```bash
claude plugin marketplace update gm-ai-marketplace
```

Update one installed plugin to the version the catalog lists:

```bash
claude plugin update <plugin>@gm-ai-marketplace
```

For a plugin installed into a project, add `--scope project`:

```bash
claude plugin update <plugin>@gm-ai-marketplace --scope project
```

Then run `/reload-plugins` in an open session, or restart Claude Code.

### Update in a Claude Code session

Refresh the catalog:

```text
/plugin marketplace update gm-ai-marketplace
```

Then open `/plugin`, find the plugin on the **Installed** tab, choose **Update now**, and load the new version:

```text
/reload-plugins
```

## For administrators

Managed settings can register the marketplace with `"autoUpdate": true` for everyone, force-enable plugins through `enabledPlugins`, and restrict other sources with `strictKnownMarketplaces`. See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org).
