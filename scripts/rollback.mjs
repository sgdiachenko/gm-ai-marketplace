#!/usr/bin/env node
// Rolls a plugin back to an earlier release: restores that release's files and gives them a new, higher version.
// `git revert` of a release isn't enough: it lowers `version`, which check-pr.mjs rejects,
// and Claude Code caches plugins by version, so users keep the copy they already have.
// Usage: node scripts/rollback.mjs <plugin> <version|git-ref>
// The result is staged, not committed; review it with `git diff --staged`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MARKETPLACE = '.claude-plugin/marketplace.json';
const [name, target] = process.argv.slice(2);

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function die(message) {
  console.error(`✘ ${message}`);
  process.exit(1);
}

if (!name || !target) {
  console.error('Usage: node scripts/rollback.mjs <plugin> <version|git-ref>');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`"${name}" is not a plugin name`);

const dir = `plugins/${name}`;
const manifestPath = `${dir}/.claude-plugin/plugin.json`;

function readAt(commit, path) {
  try {
    return JSON.parse(git('show', `${commit}:${path}`));
  } catch {
    return null;
  }
}

function nextPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?/.exec(version ?? '');
  if (!match) die(`${manifestPath}: not a semver version: ${JSON.stringify(version)}`);
  const [, major, minor, patch, prerelease] = match;
  // 1.0.0-beta.2 → 1.0.0, which is already greater than the prerelease.
  return prerelease ? `${major}.${minor}.${patch}` : `${major}.${minor}.${Number(patch) + 1}`;
}

if (!existsSync(join(root, manifestPath))) die(`${manifestPath} not found; rollback works on a plugin that is in the catalog now`);
if (git('status', '--porcelain', '--', dir).trim()) die(`${dir} has uncommitted changes; commit or stash them first`);

const current = JSON.parse(readFileSync(join(root, manifestPath), 'utf8')).version;

let source;
if (/^\d+\.\d+\.\d+/.test(target)) {
  // The newest commit that still had this version: README edits made after the release come along.
  source = git('log', '--format=%H', 'HEAD', '--', dir)
    .split('\n')
    .filter(Boolean)
    .find((commit) => readAt(commit, manifestPath)?.version === target);
  if (!source) die(`no commit on this branch has ${name} at version ${target}`);
} else {
  try {
    source = git('rev-parse', '--verify', '--quiet', `${target}^{commit}`).trim();
  } catch {
    die(`"${target}" is neither a version of ${name} nor a git ref`);
  }
}

const restored = readAt(source, manifestPath)?.version;
if (restored === undefined) die(`${dir} does not exist at ${target}`);
if (restored === current) die(`${name} is already at ${current}`);

const next = nextPatch(current);
// No overlay: files added after the old release are deleted, not left behind.
git('restore', `--source=${source}`, '--staged', '--worktree', '--', dir);
const manifest = JSON.parse(readFileSync(join(root, manifestPath), 'utf8'));
manifest.version = next;
writeFileSync(join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
git('add', '--', manifestPath);

const short = source.slice(0, 7);
console.log(`✔ ${dir}: files from ${restored} (${short}), version ${current} → ${next}`);

const entry = (catalog) => JSON.stringify(catalog?.plugins?.find((plugin) => plugin.name === name));
if (entry(readAt(source, MARKETPLACE)) !== entry(readAt('HEAD', MARKETPLACE))) {
  console.log(`! The ${name} entry in ${MARKETPLACE} changed since ${short}; the rollback leaves it as is. Revert it by hand if needed.`);
}

console.log(`
Staged, not committed. Next:
  git diff --staged
  scripts/validate.sh
  git commit -m "${name}: roll back to ${restored} as ${next}"
then open a PR as for any release.`);
