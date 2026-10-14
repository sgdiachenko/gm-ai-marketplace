# Releasing, renaming and removing plugins

## Versioning

Each plugin has its own semver `version` in `plugins/<name>/.claude-plugin/plugin.json`. There is no repo-wide version, and catalog entries carry none.

Claude Code caches a plugin by its version. Push new commits under the same version and users keep the old copy. So every PR that changes files under `plugins/<name>/` bumps that plugin's version. Changes to the plugin's `README.md` alone are exempt. `scripts/check-pr.mjs` enforces this in CI.

| Bump | When |
|---|---|
| patch `0.1.0 → 0.1.1` | fixes, wording changes in skills or agents |
| minor `0.1.1 → 0.2.0` | a new skill, agent, hook or `userConfig` option |
| major `0.2.0 → 1.0.0` | removed or renamed components or `userConfig` keys, behaviour users must adapt to |

Keep each PR to one plugin where you can, so a release is easy to review and roll back.

## Check a release before merging

Push the branch, then install from it the way users will:

```bash
git push -u origin <branch>
scripts/try-install.sh <name>
```

The script adds the marketplace from the pushed branch to a throwaway profile (`CLAUDE_CONFIG_DIR`), installs the plugin through the plugin cache, and prints its components and token cost. `~/.claude` is left alone. It stops if the branch isn't pushed or differs from your local copy. Add `--keep` to keep the profile and try the plugin in a session; pass a branch name after the plugin to test someone else's branch.

## How a release reaches users

After the merge to `main`:

- Users with auto-update on get it in their next session, after a random delay of up to ten minutes, and are asked to run `/reload-plugins`.
- Everyone else runs `/plugin marketplace update gm-ai-marketplace` or `claude plugin update <name>@gm-ai-marketplace`.

## Roll back a release

Publish the old files under a new, higher version:

```bash
node scripts/rollback.mjs <name> <good-version>
```

The script finds the last commit where the plugin had `<good-version>` and restores `plugins/<name>/` from it, deleting files added since. It sets the version to the next patch above the current one: with `0.3.0` bad and `0.2.0` good, you get `0.3.1` containing the files of `0.2.0`. A git ref works in place of the version. The result is staged, not committed. The catalog entry is left as is; the script says when it changed since the good version. Review with `git diff --staged`, then open a PR as for any release.

Don't `git revert` a release. The version goes back down, so `scripts/check-pr.mjs` fails, and Claude Code caches by version, so users who have the bad version may never get the old files back.

Users with auto-update off keep the bad version until they run `claude plugin update <name>@gm-ai-marketplace`; tell them.

## Rename a plugin

A plugin's `name` is its install id, stored in users' `enabledPlugins` and `pluginConfigs`. For a cosmetic change, set `displayName` in `plugin.json` and keep `name`.

If the name itself must change:

1. Rename the directory, the catalog entry `name` and `source`, and the `name` in `plugin.json`.
2. Add the old name to `renames` at the top level of `.claude-plugin/marketplace.json`:
   ```json
   "renames": { "old-name": "new-name" }
   ```
3. Bump the version.

Claude Code then moves existing users to the new name. Users who added the marketplace from git may need to run `/plugin install new-name@gm-ai-marketplace` once.

`renames` is append-only history. Never edit or delete an entry. When you rename again, add a new entry; Claude Code follows the chain from the oldest name. `scripts/check-pr.mjs` fails a PR that drops a plugin without a `renames` entry or deletes an existing one.

## Remove a plugin

There is no "deprecated" state. To retire a plugin:

1. Delete its directory and its catalog entry, and its row in the root `README.md`.
2. Record the removal: `"renames": { "old-name": null }`.
3. Optionally set `"forceRemoveDeletedPlugins": true` at the top level of the catalog. Claude Code then uninstalls removed plugins from users' machines at session start. Without it, a removed plugin stays installed and reports `not found in marketplace`.

## Release channels

Not set up. One catalog serves one version of each plugin. If a beta track is needed, publish a second catalog with a different marketplace `name` (for example `gm-ai-marketplace-beta`) whose entries point at another ref, and give the two refs different versions.
