// The plugin page: header, install box, setup, contents, README and links.
import { BRANCH, GITHUB } from '../config.mjs';
import { TYPE_ICONS, badges, esc, icon, usage } from '../assets/render.js';
import { formatDate, text } from '../assets/text.js';
import { installBox, issueUrl, linkList } from './layout.mjs';

const GROUPS = ['skill', 'agent', 'command', 'hook', 'mcp-server', 'lsp-server'];

// Rows for the plugin's components; `except` leaves one out (a component's own page).
export function componentRows(root, t, rowsByType, { except } = {}) {
  return GROUPS.map((type) => {
    const rows = (rowsByType[type] ?? []).filter((r) => r.id !== except);
    if (!rows.length) return '';
    return `<div class="contents-group">
  <h3 class="overline">${icon(root, TYPE_ICONS[type])}${esc(t.types[type].plural)}</h3>
  ${rows
    .map(
      (r) => `<div class="contents-row"${r.anchor ? ` id="${esc(r.anchor)}"` : ''}>
    <div class="row-name">${r.url ? `<a href="${root}${esc(r.url)}">${esc(r.name)}</a>` : `<span>${esc(r.name)}</span>`}</div>
    <div class="row-desc">${esc(r.description)}</div>
    <div class="row-usage">${usage(root, t, r.usage)}</div>
  </div>`,
    )
    .join('\n')}
</div>`;
  }).join('\n');
}

const contentsSummary = (t, rowsByType) =>
  GROUPS.filter((type) => rowsByType[type]?.length)
    .map((type) => text(t, t.types[type].count, { n: rowsByType[type].length }))
    .join(' · ');

export const pluginLinks = (t, plugin) => [
  { href: `${GITHUB}/tree/${BRANCH}/${plugin.dir}`, icon: 'code', label: t.plugin.viewSource },
  { href: issueUrl('bug-report.yml', { plugin: plugin.name, version: plugin.version }), icon: 'bug', label: t.plugin.reportProblem },
];

export function pluginPage({ t, plugin, rowsByType, readme, marketplace }) {
  const root = '../../';
  const meta = [
    ['tag', text(t, t.card.pluginVersion, { version: plugin.version })],
    ['folder-simple', plugin.category],
    ['user', plugin.author],
    ['clock-counter-clockwise', plugin.updated ? text(t, t.plugin.updated, { date: formatDate(t, plugin.updated) }) : ''],
  ].filter(([, value]) => value);
  const links = pluginLinks(t, plugin);
  const summary = contentsSummary(t, rowsByType);

  const setup = plugin.userConfig.length
    ? `<section id="setup" class="section" aria-labelledby="setup-h">
  <h2 id="setup-h">${esc(t.plugin.setup)}</h2>
  <p class="section-lead">${esc(t.plugin.setupLead)}</p>
  ${plugin.userConfig
    .map(
      (o) => `<div class="setup-row">
    <code>${esc(o.key)}</code>
    <div><div class="setup-desc">${esc(o.description)}</div>${o.sensitive ? `<div class="setup-note">${icon(root, 'lock-key')}${esc(t.plugin.keychain)}</div>` : ''}</div>
  </div>`,
    )
    .join('\n')}
</section>`
    : '';

  const contents = summary
    ? `<section id="contents" class="section" aria-labelledby="contents-h">
  <div class="section-head"><h2 id="contents-h">${esc(t.plugin.contents)}</h2><span class="section-meta">${esc(summary)}</span></div>
  ${componentRows(root, t, rowsByType)}
</section>`
    : '';

  const readmeSection = readme
    ? `<section class="section" aria-labelledby="readme-h">
  <h2 id="readme-h">${esc(t.plugin.readme)}</h2>
  <div class="prose">${readme}</div>
</section>`
    : '';

  return `<main id="main" class="page detail">
  <nav class="breadcrumb" aria-label="${esc(t.a11y.breadcrumb)}"><a href="${root}" data-back>${icon(root, 'arrow-left')}<span>${esc(t.plugin.back)}</span></a>${icon(root, 'caret-right')}<span aria-current="page">${esc(plugin.name)}</span></nav>
  <header class="detail-header">
    <span class="kicker">${icon(root, 'package')}${esc(t.plugin.kicker)}</span>
    <div>
      <h1>${esc(plugin.title)}</h1>
      ${plugin.title !== plugin.name ? `<div class="detail-name">${esc(plugin.name)}</div>` : ''}
    </div>
    <div class="detail-meta">${meta.map(([i, value]) => `<span>${icon(root, i)}${esc(value)}</span>`).join('')}</div>
    ${plugin.description ? `<p class="lead">${esc(plugin.description)}</p>` : ''}
    ${plugin.badges.length ? `<div class="badges">${badges(root, t, plugin.badges, { setupHref: '#setup' })}</div>` : ''}
  </header>
  <div class="detail-grid">
    <aside class="detail-aside">
      ${installBox(root, t, plugin.name, marketplace)}
      ${linkList(root, t, links, 'desktop-only')}
    </aside>
    <div class="detail-main">
      ${setup}
      ${contents}
      ${readmeSection}
      ${linkList(root, t, links, 'mobile-only')}
    </div>
  </div>
</main>`;
}
