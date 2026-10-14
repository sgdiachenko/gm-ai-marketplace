// Reads the catalog and every plugin into one model the templates and index.json are built from.
// Throws BuildError on content the site can't show, naming the file.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, posix } from 'node:path';
import { FrontmatterError, parseFrontmatter } from './frontmatter.mjs';
import { lastCommitDate } from './git.mjs';
import { text } from '../assets/text.js';

export class BuildError extends Error {}

const readText = (root, path) => readFileSync(join(root, path), 'utf8');
const isFile = (root, path) => existsSync(join(root, path)) && statSync(join(root, path)).isFile();
const isDir = (root, path) => existsSync(join(root, path)) && statSync(join(root, path)).isDirectory();

function readJson(root, path) {
  try {
    return JSON.parse(readText(root, path));
  } catch (error) {
    throw new BuildError(`${path}: ${error.message}`);
  }
}

const asList = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);
const toolList = (value) =>
  asList(value)
    .flatMap((v) => String(v).split(/,\s*(?![^()]*\))/))
    .map((v) => v.trim())
    .filter(Boolean);
// Plugin paths in plugin.json are relative to the plugin directory, written as ./x or x.
const inPlugin = (dir, path) => posix.normalize(posix.join(dir, String(path).replace(/^\$\{CLAUDE_PLUGIN_ROOT\}\/?/, '')));
const stripPluginRoot = (s) => String(s).replace(/"?\$\{CLAUDE_PLUGIN_ROOT\}"?\//g, '');
const shorten = (s, max = 60) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

function frontmatter(root, file) {
  try {
    return parseFrontmatter(readText(root, file), file);
  } catch (error) {
    if (error instanceof FrontmatterError) throw new BuildError(error.message);
    throw error;
  }
}

function requireFields(file, data, fields) {
  for (const field of fields) {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      throw new BuildError(`${file}:1: frontmatter needs a "${field}"`);
    }
  }
}

function markdownFiles(root, path) {
  if (isFile(root, path)) return path.endsWith('.md') ? [path] : [];
  if (!isDir(root, path)) return [];
  return readdirSync(join(root, path))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => posix.join(path, f));
}

function skillFiles(root, path) {
  if (isFile(root, posix.join(path, 'SKILL.md'))) return [posix.join(path, 'SKILL.md')];
  if (!isDir(root, path)) return [];
  return readdirSync(join(root, path))
    .sort()
    .map((d) => posix.join(path, d, 'SKILL.md'))
    .filter((f) => isFile(root, f));
}

// Component paths in plugin.json add to the default directories.
function componentPaths(root, dir, manifest, key, fallback) {
  const custom = manifest[key];
  if (custom != null && typeof custom === 'object' && !Array.isArray(custom)) {
    throw new BuildError(`${dir}/.claude-plugin/plugin.json: "${key}" as an object is not supported by the site build; use paths`);
  }
  return [posix.join(dir, fallback), ...asList(custom).map((p) => inPlugin(dir, p))];
}

const unique = (files) => [...new Set(files)];

function readSkills(root, dir, manifest) {
  const files = unique(componentPaths(root, dir, manifest, 'skills', 'skills').flatMap((p) => skillFiles(root, p)));
  return files.map((file) => {
    const { data, body } = frontmatter(root, file);
    requireFields(file, data, ['name', 'description']);
    return {
      kind: 'skill',
      name: data.name.trim(),
      dirName: basename(posix.dirname(file)),
      description: data.description.trim(),
      keywords: toolList(data.metadata?.tags ?? data.tags),
      file,
      body,
      facts: [
        ['userInvocable', data['user-invocable'] !== false],
        ['modelInvocable', data['disable-model-invocation'] !== true],
        ...(data['allowed-tools'] != null ? [['allowedTools', toolList(data['allowed-tools']).join(', ')]] : []),
      ],
    };
  });
}

function readAgents(root, dir, manifest) {
  const files = unique(componentPaths(root, dir, manifest, 'agents', 'agents').flatMap((p) => markdownFiles(root, p)));
  return files.map((file) => {
    const { data, body } = frontmatter(root, file);
    requireFields(file, data, ['name', 'description']);
    return {
      kind: 'agent',
      name: data.name.trim(),
      description: data.description.trim(),
      file,
      body,
      facts: [
        ...(data.model ? [['model', String(data.model)]] : []),
        ...(data.tools != null ? [['tools', toolList(data.tools).join(', ')]] : []),
      ],
    };
  });
}

function readCommands(root, dir, manifest) {
  const files = unique(componentPaths(root, dir, manifest, 'commands', 'commands').flatMap((p) => markdownFiles(root, p)));
  return files.map((file) => {
    const { data, body } = frontmatter(root, file);
    requireFields(file, data, ['description']);
    return {
      kind: 'command',
      name: basename(file, '.md'),
      description: data.description.trim(),
      file,
      body,
      facts: [
        ...(data['argument-hint'] ? [['argumentHint', String(data['argument-hint'])]] : []),
        ...(data['allowed-tools'] != null ? [['allowedTools', toolList(data['allowed-tools']).join(', ')]] : []),
      ],
    };
  });
}

// A path, a list of paths, or the config itself: how plugin.json points at hooks, MCP and LSP configs.
function configSources(root, dir, manifest, key, defaultFile) {
  const sources = [];
  if (isFile(root, posix.join(dir, defaultFile))) sources.push({ file: posix.join(dir, defaultFile) });
  for (const value of asList(manifest[key])) {
    if (typeof value === 'string') {
      const file = inPlugin(dir, value);
      if (!isFile(root, file)) throw new BuildError(`${dir}/.claude-plugin/plugin.json: "${key}" points to ${file}, which does not exist`);
      if (!sources.some((s) => s.file === file)) sources.push({ file });
    } else if (value && typeof value === 'object') {
      sources.push({ file: `${dir}/.claude-plugin/plugin.json`, config: value });
    }
  }
  return sources.map((s) => ({ file: s.file, config: s.config ?? readJson(root, s.file) }));
}

// Hook descriptions are generated, from the strings under "generated" in site/i18n/<locale>.json.
function hookAction(t, handler) {
  const g = t.generated;
  if (handler.type === 'command' && handler.command) return text(t, g.hookRuns, { command: shorten(stripPluginRoot(handler.command)) });
  if (handler.type === 'http' && handler.url) return g.hookUrl;
  if (handler.type === 'prompt' || handler.type === 'agent') return g.hookPrompt;
  return g.hookOther;
}

function readHooks(root, dir, manifest, t) {
  const g = t.generated;
  const hooks = [];
  for (const { file, config } of configSources(root, dir, manifest, 'hooks', 'hooks/hooks.json')) {
    const events = config.hooks ?? {};
    if (typeof events !== 'object' || Array.isArray(events)) throw new BuildError(`${file}: "hooks" must be an object of events`);
    for (const [event, groups] of Object.entries(events)) {
      for (const group of asList(groups)) {
        const matcher = typeof group.matcher === 'string' && group.matcher !== '' && group.matcher !== '*' ? group.matcher : '';
        const actions = [...new Set(asList(group.hooks).map((h) => hookAction(t, h)))].join('; ') || g.hookOther;
        const tool = matcher ? text(t, g.hookTool, { matcher }) : g.hookAnyTool;
        const when = text(t, g.hookWhen[event] ?? g.hookWhen.other, { tool, event });
        const sentence = text(t, g.hookSentence, { actions, when });
        hooks.push({ event, matcher, file, description: sentence[0].toUpperCase() + sentence.slice(1) });
      }
    }
  }
  return hooks;
}

function readMcpServers(root, dir, manifest, t) {
  const servers = [];
  for (const { file, config } of configSources(root, dir, manifest, 'mcpServers', '.mcp.json')) {
    const map = config.mcpServers ?? config;
    for (const [name, server] of Object.entries(map)) {
      const remote = ['http', 'sse', 'streamable-http'].includes(server.type) || (!server.command && server.url);
      let description;
      if (remote) {
        let host = server.url ?? '';
        try {
          host = new URL(server.url).host;
        } catch {}
        description = host ? text(t, t.generated.mcpRemote, { host }) : t.generated.mcpRemoteNoHost;
      } else {
        const command = [server.command, ...asList(server.args)].filter(Boolean).map(stripPluginRoot).join(' ');
        description = text(t, t.generated.mcpLocal, { command: shorten(command) });
      }
      servers.push({ name, transport: remote ? 'HTTP' : 'stdio', description, file });
    }
  }
  return servers;
}

function readLspServers(root, dir, manifest, t) {
  const servers = [];
  for (const { file, config } of configSources(root, dir, manifest, 'lspServers', '.lsp.json')) {
    for (const [name, server] of Object.entries(config.lspServers ?? config)) {
      const extensions = Object.keys(server.extensionToLanguage ?? {});
      const description = extensions.length ? text(t, t.generated.lspFor, { extensions: extensions.join(', ') }) : t.generated.lsp;
      servers.push({ name, transport: server.transport === 'socket' ? 'socket' : 'stdio', description, file });
    }
  }
  return servers;
}

function readUserConfig(file, userConfig) {
  if (userConfig == null) return [];
  if (typeof userConfig !== 'object' || Array.isArray(userConfig)) throw new BuildError(`${file}: "userConfig" must be an object`);
  return Object.entries(userConfig).map(([key, option]) => ({
    key,
    description: option.description || option.title || '',
    sensitive: option.sensitive === true,
  }));
}

function readPlugin(root, entry, marketplace, t) {
  if (typeof entry.source !== 'string') {
    throw new BuildError(`.claude-plugin/marketplace.json: plugin "${entry.name}" has a non-path source; the site indexes only plugins in this repository`);
  }
  const dir = posix.normalize(entry.source.replace(/^\.\//, '')).replace(/\/$/, '');
  const manifestFile = `${dir}/.claude-plugin/plugin.json`;
  const manifest = readJson(root, manifestFile);
  const author = manifest.author?.name ?? entry.author?.name ?? marketplace.owner?.name ?? '';
  const userConfig = readUserConfig(manifestFile, manifest.userConfig);
  const badges = [];
  if (userConfig.length) badges.push('needs-setup');
  if (entry.defaultEnabled === false) badges.push('off-by-default');
  const readme = isFile(root, `${dir}/README.md`) ? `${dir}/README.md` : null;

  return {
    name: entry.name,
    displayName: manifest.displayName ?? entry.displayName ?? '',
    title: manifest.displayName ?? entry.displayName ?? entry.name,
    version: manifest.version,
    description: entry.description ?? manifest.description ?? '',
    category: entry.category ?? manifest.category ?? '',
    keywords: [...new Set([...(entry.keywords ?? []), ...(entry.tags ?? []), ...(manifest.keywords ?? [])])],
    author,
    badges,
    userConfig,
    dir,
    manifestFile,
    readme,
    updated: lastCommitDate(root, dir),
    skills: readSkills(root, dir, manifest),
    agents: readAgents(root, dir, manifest),
    commands: readCommands(root, dir, manifest),
    hooks: readHooks(root, dir, manifest, t),
    mcpServers: readMcpServers(root, dir, manifest, t),
    lspServers: readLspServers(root, dir, manifest, t),
  };
}

// `t` is the UI strings; generated descriptions of hooks and servers use them.
export function readRepo(root, t) {
  const catalogFile = '.claude-plugin/marketplace.json';
  const marketplace = readJson(root, catalogFile);
  const plugins = (marketplace.plugins ?? []).map((entry) => readPlugin(root, entry, marketplace, t));
  const guideFile = 'docs/installing.md';
  return {
    marketplace,
    plugins,
    categories: [...new Set(plugins.map((p) => p.category).filter(Boolean))].sort(),
    guide: isFile(root, guideFile) ? { file: guideFile, source: readText(root, guideFile), updated: lastCommitDate(root, guideFile) } : null,
  };
}
