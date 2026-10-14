// Compares what the build found in each plugin with what Claude Code loads from it
// (`claude plugin details`), so components in custom paths or of new types fail the build
// instead of silently missing from the site.
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BuildError } from './read-repo.mjs';

export const claudeAvailable = () => spawnSync('claude', ['--version'], { stdio: 'ignore' }).status === 0;

const SECTIONS = { Skills: 'skills', Agents: 'agents', Hooks: 'hooks', 'MCP servers': 'mcpServers', 'LSP servers': 'lspServers' };

export function parseDetails(output) {
  const found = {};
  for (const line of output.split('\n')) {
    const m = /^\s+(Skills|Agents|Hooks|MCP servers|LSP servers) \((\d+)\)(.*)$/.exec(line);
    if (!m) continue;
    const names = m[3]
      .replace(/\s{2,}\(.*\)\s*$/, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    found[SECTIONS[m[1]]] = { count: Number(m[2]), names };
  }
  for (const key of Object.values(SECTIONS)) {
    if (!found[key]) throw new BuildError(`could not read "${key}" from \`claude plugin details\`; its output format changed, update site/lib/inventory.mjs`);
  }
  return found;
}

// Each expected component may go by several names (a skill's frontmatter name or its directory).
function matches(listed, expected) {
  const left = [...expected];
  for (const name of listed) {
    const i = left.findIndex((aliases) => aliases.includes(name));
    if (i === -1) return false;
    left.splice(i, 1);
  }
  return left.length === 0;
}

export function checkInventory(root, plugin) {
  let output;
  try {
    output = execFileSync('claude', ['--plugin-dir', join(root, plugin.dir), 'plugin', 'details', plugin.name], {
      cwd: tmpdir(),
      encoding: 'utf8',
      timeout: 120_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() || error.message;
    throw new BuildError(`${plugin.dir}: \`claude plugin details\` failed; run \`claude plugin validate ${plugin.dir}\`.\n  ${detail}`);
  }
  const found = parseDetails(output);
  const expected = {
    skills: [...plugin.skills.map((s) => [s.name, s.dirName]), ...plugin.commands.map((c) => [c.name])],
    agents: plugin.agents.map((a) => [a.name]),
    hooks: [...new Set(plugin.hooks.map((h) => h.event))].map((e) => [e]),
    mcpServers: plugin.mcpServers.map((s) => [s.name]),
    lspServers: plugin.lspServers.map((s) => [s.name]),
  };
  const problems = [];
  for (const [key, list] of Object.entries(expected)) {
    const { count, names } = found[key];
    // Hooks are listed once per event; the count may include several handlers.
    const listed = key === 'hooks' ? [...new Set(names)] : names;
    const ok = key === 'hooks' ? matches(listed, list) : names.length === count ? matches(listed, list) : count === list.length;
    if (!ok) {
      problems.push(`${key}: the site found [${list.map((a) => a[0]).join(', ')}], Claude Code loads [${names.join(', ')}]`);
    }
  }
  if (problems.length) {
    throw new BuildError(
      `${plugin.dir}: components differ from \`claude plugin details\`:\n  ${problems.join('\n  ')}\n` +
        '  Components in custom paths or of a new type need support in site/lib/read-repo.mjs.',
    );
  }
}
