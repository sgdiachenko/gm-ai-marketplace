#!/usr/bin/env node
// Checks that compare this branch with its base branch:
//   - every changed plugin has a higher version than on the base branch;
//   - a plugin removed from the catalog is recorded in `renames`, and `renames` only grows.
// Usage: node scripts/check-pr.mjs [base-ref]   (default: origin/main)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.argv[2] ?? 'origin/main';
const MARKETPLACE = '.claude-plugin/marketplace.json';

const errors = [];
const fail = (message) => errors.push(message);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function readAtBase(path) {
  try {
    return JSON.parse(git('show', `${base}:${path}`));
  } catch {
    return null;
  }
}

function compareSemver(a, b) {
  const parse = (version) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(version ?? '');
    if (!match) throw new Error(`not a semver version: ${JSON.stringify(version)}`);
    return [Number(match[1]), Number(match[2]), Number(match[3]), match[4]];
  };
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  if (x[3] === y[3]) return 0;
  if (!x[3]) return 1; // 1.0.0 > 1.0.0-beta
  if (!y[3]) return -1;
  return x[3].localeCompare(y[3], 'en', { numeric: true });
}

// Plugins with changes since the merge base. README-only and CHANGELOG-only changes don't need a release.
const NO_RELEASE = new Set(['README.md', 'CHANGELOG.md']);
const changedPlugins = new Set(
  git('diff', '--name-only', `${base}...HEAD`, '--', 'plugins/')
    .split('\n')
    .filter(Boolean)
    .map((file) => file.split('/'))
    .filter(([, , ...rest]) => !NO_RELEASE.has(rest.join('/')))
    .map(([, name]) => name),
);

for (const name of changedPlugins) {
  const manifestPath = `plugins/${name}/.claude-plugin/plugin.json`;
  if (!existsSync(join(root, manifestPath))) continue; // removed plugin: covered by the renames check
  const current = JSON.parse(readFileSync(join(root, manifestPath), 'utf8')).version;
  const previous = readAtBase(manifestPath)?.version;
  if (previous === undefined) {
    console.log(`• ${name}: new plugin, ${current}`);
    continue;
  }
  try {
    if (compareSemver(current, previous) > 0) console.log(`• ${name}: ${previous} → ${current}`);
    else fail(`plugins/${name}: files changed but version ${current} is not greater than ${previous} on ${base}; bump it in ${manifestPath}`);
  } catch (error) {
    fail(`plugins/${name}: ${error.message}`);
  }
}

const before = readAtBase(MARKETPLACE);
if (before) {
  const now = JSON.parse(readFileSync(join(root, MARKETPLACE), 'utf8'));
  const names = new Set(now.plugins.map((plugin) => plugin.name));
  const renames = now.renames ?? {};
  for (const { name } of before.plugins) {
    if (!names.has(name) && !(name in renames)) {
      fail(`plugin "${name}" left the catalog; add "renames": { "${name}": "<new-name>" } or { "${name}": null } so installed users migrate`);
    }
  }
  for (const old of Object.keys(before.renames ?? {})) {
    if (!(old in renames)) fail(`renames["${old}"] was deleted; renames is append-only history`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✘ ${error}`);
  process.exit(1);
}
console.log(`✔ Versions and renames are consistent with ${base}`);
