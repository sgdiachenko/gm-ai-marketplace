#!/usr/bin/env node
// Tags each plugin's current version as `<plugin>--v<version>`, the name Claude Code resolves
// dependency ranges such as "^1.0.0" against. Plugins whose tag already exists are skipped.
// Runs on every push to main (.github/workflows/tag-releases.yml); safe to run again.
// Usage: node scripts/tag-releases.mjs [--push]   (without --push it only lists the tags it would create)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const push = process.argv.includes('--push');

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const tagExists = (tag) => {
  try {
    git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`);
    return true;
  } catch {
    return false;
  }
};

if (push) git('fetch', '--tags', '--quiet', 'origin');

const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const created = [];
for (const { name, source } of marketplace.plugins) {
  const { version } = JSON.parse(readFileSync(join(root, source, '.claude-plugin/plugin.json'), 'utf8'));
  const tag = `${name}--v${version}`;
  if (tagExists(tag)) continue;
  if (push) git('tag', '--annotate', tag, '--message', `${name} ${version}`);
  created.push(tag);
}

if (created.length === 0) {
  console.log('✔ Every plugin version is tagged');
} else if (push) {
  git('push', '--quiet', 'origin', ...created.map((tag) => `refs/tags/${tag}`));
  for (const tag of created) console.log(`• tagged ${tag}`);
} else {
  for (const tag of created) console.log(`• would tag ${tag}`);
  console.log('Run with --push to create and push these tags.');
}
