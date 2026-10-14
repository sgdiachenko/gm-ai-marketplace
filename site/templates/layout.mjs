// The page shell and the pieces several pages share. Every URL is relative to `root`,
// the path from the page to the site root, so the site works under any base path.
// All UI text comes from `t`, the strings in site/i18n/<locale>.json.
import { BRANCH, GITHUB, MIN_CLAUDE_CODE, MIN_CLAUDE_CODE_SHELL, REPO, SITE_URL } from '../config.mjs';
import { claudeInstallCommand, copyButton, esc, icon, shellInstallCommand } from '../assets/render.js';
import { formatDate, html, text } from '../assets/text.js';

// Only the site's own origin; inline scripts and style attributes are off too.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

export const issueUrl = (template, params = {}) => `${GITHUB}/issues/new?${new URLSearchParams({ template, ...params })}`;

function header(root, t, site, current) {
  const links = [
    { href: `${root}guides/installing/`, icon: 'rocket-launch', label: t.header.gettingStarted, current: current === 'guide' },
    { href: GITHUB, icon: 'github-logo', label: t.header.github },
  ];
  const link = (l) => `<a href="${l.href}"${l.current ? ' aria-current="page"' : ''}>${icon(root, l.icon)}${esc(l.label)}</a>`;
  const search =
    current === 'home'
      ? ''
      : `<a class="header-search js-only" href="${root}#search">${icon(root, 'magnifying-glass')}${esc(t.header.search)}<kbd>/</kbd></a>`;
  const mobileSearch =
    current === 'home'
      ? ''
      : `<a class="icon-button js-only" href="${root}#search" aria-label="${esc(t.header.search)}">${icon(root, 'magnifying-glass')}</a>`;
  return `<header class="site-header">
  <a class="brand" href="${root}">${esc(site)}</a>
  <nav class="nav-desktop" aria-label="${esc(t.a11y.mainNav)}">${search}${links.map(link).join('')}</nav>
  <div class="nav-mobile">${mobileSearch}<details class="menu"><summary class="icon-button" aria-label="${esc(t.a11y.menu)}">${icon(root, 'list', 'when-closed')}${icon(root, 'x', 'when-open')}</summary><nav aria-label="${esc(t.a11y.mainNav)}">${links.map(link).join('')}</nav></details></div>
</header>`;
}

function footer(t, build) {
  const commit = `<a href="${GITHUB}/commit/${build.fullCommit}"><code>${esc(build.commit)}</code></a>`;
  const built = build.commit
    ? `<span class="built">${html(t, t.footer.built, { commit, date: esc(formatDate(t, build.date)) })}</span>`
    : '';
  return `<footer class="site-footer">
  <a href="${GITHUB}">${esc(t.footer.repository)}</a>
  <a href="${GITHUB}/blob/${BRANCH}/docs/adding-a-plugin.md">${esc(t.footer.contributing)}</a>
  <a href="${issueUrl('plugin-request.yml')}">${esc(t.footer.requestPlugin)}</a>
  ${built}
</footer>`;
}

/**
 * A full page. `path` is the page's URL path from the site root ('' for home, 'plugins/x/', '404.html');
 * `site` is the marketplace name from the catalog.
 */
export function page({ root, t, site, path, title, description, current, build, body }) {
  const canonical = path === '404.html' ? '' : `<link rel="canonical" href="${SITE_URL}${path}">`;
  return `<!doctype html>
<html lang="${esc(t.locale)}" data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical}
<meta name="color-scheme" content="dark light">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${root}assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/site.css">
<script src="${root}assets/boot.js"></script>
<script type="module" src="${root}assets/app.js"></script>
</head>
<body data-page="${current}">
<a class="skip-link" href="#main">${esc(t.a11y.skip)}</a>
<div class="shell">
${header(root, t, site, current)}
${body}
${footer(t, build)}
</div>
<div id="announce" class="sr-only" aria-live="polite"></div>
</body>
</html>
`;
}

const settingsSnippet = (plugin, marketplace) =>
  JSON.stringify(
    {
      extraKnownMarketplaces: { [marketplace]: { source: { source: 'github', repo: REPO } } },
      enabledPlugins: { [`${plugin}@${marketplace}`]: true },
    },
    null,
    2,
  );

// The install box: three tabs with JavaScript, three labelled blocks without. The Claude Code tab
// comes first, matching what the cards' Copy install copies.
export function installBox(root, t, plugin, marketplace, { heading = t.install.heading, compact = false, id = 'install' } = {}) {
  const tabs = [
    { key: 'claude', label: t.install.claude, note: text(t, t.install.claudeNote, { version: MIN_CLAUDE_CODE }), code: claudeInstallCommand(plugin, REPO), copied: t.install.commandCopied },
    { key: 'terminal', label: t.install.terminal, note: text(t, t.install.terminalNote, { version: MIN_CLAUDE_CODE_SHELL }), code: shellInstallCommand(plugin, REPO), copied: t.install.commandCopied },
    { key: 'project', label: t.install.project, note: t.install.projectNote, code: settingsSnippet(plugin, marketplace), copied: t.install.snippetCopied },
  ];
  const tablist = `<div class="tabs js-only" role="tablist" aria-label="${esc(t.install.method)}">${tabs
    .map(
      (tab, i) =>
        `<button type="button" role="tab" id="${id}-tab-${tab.key}" aria-controls="${id}-panel-${tab.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(tab.label)}</button>`,
    )
    .join('')}</div>`;
  const panels = tabs
    .map(
      (tab, i) => `<div class="tab-panel" role="tabpanel" id="${id}-panel-${tab.key}" aria-labelledby="${id}-tab-${tab.key}"${i === 0 ? '' : ' data-inactive'}>
  <h3 class="tab-title no-js-only">${esc(tab.label)}</h3>
  <p class="tab-note">${esc(tab.note)}</p>
  <div class="code-panel"><pre>${esc(tab.code)}</pre>${copyButton(root, t, { value: tab.code, label: t.copy.copy, message: tab.copied, cls: 'btn btn-small copy-code' })}</div>
</div>`,
    )
    .join('');
  return `<section class="install-box${compact ? ' compact' : ''}" aria-labelledby="${id}-h" data-tabs>
  <h2 id="${id}-h">${esc(heading)}</h2>
  ${tablist}
  ${panels}
  <p class="install-foot">${esc(t.install.trouble)} <a href="${root}guides/installing/">${esc(t.install.troubleLink)}</a></p>
</section>`;
}

export function linkList(root, t, links, cls = '') {
  return `<section class="link-list${cls ? ` ${cls}` : ''}" aria-label="${esc(t.a11y.links)}">${links
    .map((l) => `<a href="${esc(l.href)}">${icon(root, l.icon)}<span>${esc(l.label)}</span>${icon(root, 'arrow-up-right', 'trailing')}</a>`)
    .join('')}</section>`;
}
