#!/usr/bin/env node
// Local development server. Builds the site from this repository, serves it the way GitHub Pages
// does (under the base path, 404.html for missing pages), rebuilds when the site code or the
// plugins change, and reloads the browser.
// Usage: node site/dev.mjs [--port 4000] [--root <repo>] [--inventory]
//   --root       the repository to read; defaults to this one, so only real plugins show
//   --inventory  also run the `claude plugin details` check on every rebuild (slower)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { BASE_PATH } from './config.mjs';

const SITE = fileURLToPath(new URL('.', import.meta.url));
const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '4000' },
    root: { type: 'string' },
    inventory: { type: 'boolean', default: false },
  },
});
const root = resolve(values.root ?? join(SITE, '..'));
const out = join(SITE, '..', '_site');
const port = Number(values.port);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Live reload. The page's CSP allows scripts and connections to its own origin, so this works without exceptions.
const RELOAD_JS = `const events = new EventSource('/__dev/events');
let banner;
events.addEventListener('reload', () => location.reload());
events.addEventListener('build-error', (event) => {
  banner ??= document.body.appendChild(document.createElement('pre'));
  Object.assign(banner.style, {
    position: 'fixed', left: '12px', right: '12px', bottom: '12px', zIndex: 100, margin: 0, padding: '12px 14px',
    maxHeight: '40vh', overflow: 'auto', whiteSpace: 'pre-wrap', font: '12px/1.5 ui-monospace, monospace',
    color: '#fff', background: '#7a1d2e', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
  });
  banner.textContent = 'Site build failed; showing the last good build.\\n\\n' + JSON.parse(event.data);
});
`;

const clients = new Set();
function broadcast(event, data = '') {
  for (const res of clients) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

let building = false;
let pending = false;
let lastError = '';

function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const started = Date.now();
  const args = [join(SITE, 'build.mjs'), '--root', root, '--out', out];
  if (!values.inventory) args.push('--skip-inventory');
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  child.on('close', (code) => {
    building = false;
    const time = new Date().toLocaleTimeString();
    if (code === 0) {
      lastError = '';
      console.log(`[${time}] rebuilt in ${Date.now() - started} ms`);
      broadcast('reload');
    } else {
      lastError = output.trim();
      console.error(`[${time}] build failed:\n${lastError}`);
      broadcast('build-error', lastError);
    }
    if (pending) {
      pending = false;
      build();
    }
  });
}

// What changes the site: its own code and the repository content it reads.
const IGNORED = /(^|[/\\])(\.git|node_modules|_site|tests)([/\\]|$)|\.DS_Store$|~$/;
let timer;
function watchDir(dir) {
  if (!existsSync(dir)) return;
  watch(dir, { recursive: true }, (_, file) => {
    if (file && IGNORED.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}
for (const dir of [SITE, join(root, '.claude-plugin'), join(root, 'plugins'), join(root, 'docs')]) watchDir(dir);

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendFile(res, file, status = 200) {
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  let body = readFileSync(file);
  if (type.startsWith('text/html')) body = body.toString().replace('</body>', '<script src="/__dev/reload.js"></script>\n</body>');
  send(res, status, type, body);
}

function notFound(res) {
  const page = join(out, '404.html');
  if (existsSync(page)) sendFile(res, page, 404);
  else send(res, 404, 'text/plain; charset=utf-8', lastError || 'Not found; the site has not been built yet.');
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/__dev/reload.js') return send(res, 200, TYPES['.js'], RELOAD_JS);
  if (pathname === '/__dev/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    if (lastError) res.write(`event: build-error\ndata: ${JSON.stringify(lastError)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (pathname === '/' || pathname === BASE_PATH.slice(0, -1)) {
    res.writeHead(302, { Location: BASE_PATH });
    return res.end();
  }
  if (!pathname.startsWith(BASE_PATH)) return notFound(res);

  const file = normalize(join(out, decodeURIComponent(pathname.slice(BASE_PATH.length))));
  if (relative(out, file).startsWith('..')) return notFound(res);
  if (existsSync(file) && statSync(file).isDirectory()) {
    // GitHub Pages redirects a directory without a trailing slash, so relative links resolve.
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/` });
      return res.end();
    }
    const index = join(file, 'index.html');
    return existsSync(index) ? sendFile(res, index) : notFound(res);
  }
  return existsSync(file) ? sendFile(res, file) : notFound(res);
});

setInterval(() => broadcast('ping'), 30_000).unref();
server.listen(port, '127.0.0.1', () => {
  console.log(`Catalog site: http://localhost:${port}${BASE_PATH}`);
  console.log(`Reading ${relative(process.cwd(), root) || '.'}; rebuilding on changes. Ctrl+C stops.`);
  build();
});
