// Skill, agent and command pages.
import { BRANCH, GITHUB } from '../config.mjs';
import { TYPE_ICONS, esc, icon, usage } from '../assets/render.js';
import { html, text } from '../assets/text.js';
import { installBox, issueUrl, linkList } from './layout.mjs';
import { componentRows } from './plugin.mjs';

export function componentPage({ t, plugin, component, item, rowsByType, body, marketplace }) {
  const root = '../../../../';
  const type = t.types[item.type];
  const links = [
    { href: `${GITHUB}/blob/${BRANCH}/${component.file}`, icon: 'code', label: t.plugin.viewSource },
    { href: issueUrl('bug-report.yml', { plugin: plugin.name, version: plugin.version }), icon: 'bug', label: t.plugin.reportProblem },
  ];
  // Facts are [string key in component.facts, value]; a boolean value reads Yes or No.
  const facts = component.facts.length
    ? `<dl class="facts">${component.facts
        .map(([key, value]) => `<div><dt>${esc(t.component.facts[key])}</dt><dd>${esc(typeof value === 'boolean' ? (value ? t.component.yes : t.component.no) : value)}</dd></div>`)
        .join('')}</dl>`
    : '';
  const more = componentRows(root, t, rowsByType, { except: item.id });
  const pluginHref = `${root}plugins/${esc(plugin.name)}/`;

  return `<main id="main" class="page detail">
  <nav class="breadcrumb" aria-label="${esc(t.a11y.breadcrumb)}"><a href="${pluginHref}">${icon(root, 'package')}<span>${esc(plugin.name)}</span></a>${icon(root, 'caret-right')}<a href="${pluginHref}#contents">${esc(type.plural)}</a>${icon(root, 'caret-right')}<span aria-current="page">${esc(item.name)}</span></nav>
  <header class="detail-header">
    <span class="kicker">${icon(root, TYPE_ICONS[item.type])}${esc(type.label)}</span>
    <h1>${esc(item.name)}</h1>
    <div class="detail-meta"><span>${html(t, t.component.inPlugin, { plugin: `<a href="${pluginHref}">${esc(plugin.title)}</a>` })}</span><span>${icon(root, 'tag')}${esc(text(t, t.card.pluginVersion, { version: plugin.version }))}</span></div>
    <p class="lead">${esc(item.description)}</p>
    <div class="detail-usage">${usage(root, t, item.usage)}</div>
    ${facts}
  </header>
  <div class="detail-grid">
    <aside class="detail-aside">
      ${installBox(root, t, plugin.name, marketplace, { heading: text(t, t.install.headingFor, { plugin: plugin.name }), compact: true })}
      ${linkList(root, t, links, 'desktop-only')}
    </aside>
    <div class="detail-main">
      ${body ? `<section class="section" aria-labelledby="body-h">
  <div class="section-head"><h2 id="body-h">${esc(t.component.instructions)}</h2><span class="section-meta">${esc(t.component.instructionsMeta)}</span></div>
  <div class="prose">${body}</div>
</section>` : ''}
      ${more ? `<section class="section" aria-labelledby="more-h">
  <h2 id="more-h">${esc(text(t, t.component.more, { plugin: plugin.title }))}</h2>
  ${more}
</section>` : ''}
      ${linkList(root, t, links, 'mobile-only')}
    </div>
  </div>
</main>`;
}
