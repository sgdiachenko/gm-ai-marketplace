#!/usr/bin/env node
// Repository conventions that `claude plugin validate` does not check.
// Usage: node scripts/check-marketplace.mjs
import { existsSync, lstatSync, openSync, readFileSync, readSync, closeSync, readdirSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// Everything under plugins/<name>/ is copied to users, so maintainer files stay at the repo root.
const MAINTAINER_ONLY = ['AGENTS.md', 'CLAUDE.md', 'INSIGHTS.md', 'docs', 'specs', 'tests', 'node_modules'];
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.sh', '.js', '.mjs', '.cjs', '.ts', '.py', '.yml', '.yaml', '.toml', '.txt']);
// Matches ${CLAUDE_PLUGIN_ROOT}/x, "${CLAUDE_PLUGIN_ROOT}"/x and the JSON-escaped \"${CLAUDE_PLUGIN_ROOT}\"/x.
const PLUGIN_ROOT_REF = /\$\{CLAUDE_PLUGIN_ROOT\}(?:\\?")?\/([\w./-]+)/g;
// Catalog metadata and docs are in English. Skill bodies, plugin code and quoted examples in `code` may use any language.
const CYRILLIC = /[\u0400-\u04FF]/;
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const FRONTMATTER = /^---\n[\s\S]*?\n---/;
const COMPONENT_DOC = /^(skills\/[^/]+\/SKILL|agents\/[^/]+|commands\/[^/]+)\.md$/;
const ROOT_DOCS = ['.claude-plugin/marketplace.json', 'README.md', 'AGENTS.md', 'INSIGHTS.md', 'docs', 'specs', 'site'];

const errors = [];
const fail = (message) => errors.push(message);
const rel = (path) => relative(root, path) || '.';

function isInside(path, dir) {
  const r = relative(dir, path);
  return r === '' || (r.split(sep)[0] !== '..' && !isAbsolute(r));
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${rel(path)}: ${error.message}`);
    return null;
  }
}

// Lists files without following symlinks, so symlinks are reported as files.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function checkEnglish(path, text = readFileSync(path, 'utf8')) {
  const prose = text.replace(CODE, (code) => code.replace(/[^\n]/g, ' '));
  const line = prose.split('\n').findIndex((l) => CYRILLIC.test(l));
  if (line !== -1) fail(`${rel(path)}:${line + 1}: Cyrillic text; catalog metadata and docs are in English`);
}

function hasShebang(path) {
  const fd = openSync(path, 'r');
  const head = Buffer.alloc(2);
  const bytes = readSync(fd, head, 0, 2, 0);
  closeSync(fd);
  return bytes === 2 && head.toString() === '#!';
}

function checkFile(file, pluginDir) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) {
    let target;
    try {
      target = realpathSync(file);
    } catch {
      return fail(`${rel(file)}: broken symlink`);
    }
    if (!isInside(target, root)) fail(`${rel(file)}: symlink points outside the repository; Claude Code skips it on install`);
    return;
  }
  if (hasShebang(file) && (stat.mode & 0o111) === 0) fail(`${rel(file)}: has a shebang but is not executable (chmod +x)`);

  const path = relative(pluginDir, file).split(sep).join('/');
  if (path === '.claude-plugin/plugin.json' || path === 'README.md') checkEnglish(file);
  else if (COMPONENT_DOC.test(path)) checkEnglish(file, FRONTMATTER.exec(readFileSync(file, 'utf8'))?.[0] ?? '');

  if (!TEXT_EXTENSIONS.has(extname(file))) return;

  for (const match of readFileSync(file, 'utf8').matchAll(PLUGIN_ROOT_REF)) {
    const target = match[1].replace(/\.+$/, '');
    const path = resolve(pluginDir, target);
    if (!isInside(path, pluginDir)) fail(`${rel(file)}: \${CLAUDE_PLUGIN_ROOT}/${target} escapes the plugin directory`);
    else if (!existsSync(path)) fail(`${rel(file)}: \${CLAUDE_PLUGIN_ROOT}/${target} does not exist in the plugin`);
  }
}

function checkPlugin(entry, where) {
  const dir = resolve(root, entry.source);
  if (entry.source !== `./plugins/${entry.name}`) fail(`${where}: source must be "./plugins/${entry.name}"`);
  if (!existsSync(dir)) return fail(`${where}: source directory ${rel(dir)} does not exist`);

  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) return fail(`${rel(dir)}: missing .claude-plugin/plugin.json`);
  if (lstatSync(manifestPath).isSymbolicLink()) {
    fail(`${rel(manifestPath)}: must be a regular file; \`claude plugin validate . --strict\` fails on a symlinked manifest`);
  }
  const manifest = readJson(manifestPath);
  if (manifest) {
    if (manifest.name !== entry.name) fail(`${rel(manifestPath)}: name "${manifest.name}" differs from marketplace entry "${entry.name}"`);
    if (!SEMVER.test(manifest.version ?? '')) fail(`${rel(manifestPath)}: needs a semver "version", got ${JSON.stringify(manifest.version)}`);
  }

  for (const name of MAINTAINER_ONLY) {
    if (existsSync(join(dir, name))) fail(`${rel(join(dir, name))}: ships to users; keep maintainer files at the repo root (docs/plugins/, specs/, INSIGHTS.md)`);
  }
  if (existsSync(join(dir, 'bin'))) {
    fail(`${rel(join(dir, 'bin'))}: claude.ai organization sync rejects a top-level bin/; use scripts/ and "\${CLAUDE_PLUGIN_ROOT}"/scripts/<name>`);
  }
  for (const file of walk(dir)) checkFile(file, dir);
}

const marketplacePath = join(root, '.claude-plugin', 'marketplace.json');
const marketplace = readJson(marketplacePath);
if (marketplace) {
  const listed = new Set();
  for (const [i, entry] of (marketplace.plugins ?? []).entries()) {
    const where = `marketplace.json plugins[${i}] "${entry.name}"`;
    listed.add(entry.name);
    if ('version' in entry) fail(`${where}: remove "version"; it lives only in the plugin's plugin.json`);
    if (typeof entry.source === 'string') checkPlugin(entry, where);
  }

  const pluginsDir = join(root, 'plugins');
  if (existsSync(pluginsDir)) {
    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !listed.has(entry.name)) fail(`plugins/${entry.name}: not listed in .claude-plugin/marketplace.json`);
    }
  }
}

for (const name of ROOT_DOCS) {
  const path = join(root, name);
  if (!existsSync(path)) continue;
  const files = lstatSync(path).isDirectory() ? walk(path).filter((file) => extname(file) === '.md') : [path];
  for (const file of files) checkEnglish(file);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✘ ${error}`);
  console.error(`\n${errors.length} problem(s) found`);
  process.exit(1);
}
console.log('✔ Repository conventions passed');
