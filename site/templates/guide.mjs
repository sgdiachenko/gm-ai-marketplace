// Getting started: docs/installing.md with a table of contents.
import { BRANCH, GITHUB } from '../config.mjs';
import { esc, icon } from '../assets/render.js';
import { formatDate, text } from '../assets/text.js';
import { linkList } from './layout.mjs';

export function guidePage({ t, guide, rendered }) {
  const root = '../../';
  const toc = rendered.headings.filter((h) => h.depth === 2);
  const source = [{ href: `${GITHUB}/blob/${BRANCH}/${guide.file}`, icon: 'code', label: t.plugin.viewSource }];
  return `<main id="main" class="page detail">
  <header class="detail-header">
    <span class="kicker">${icon(root, 'book-open-text')}${esc(t.guide.kicker)}</span>
    <h1>${esc(rendered.title ?? t.guide.title)}</h1>
    ${guide.updated ? `<div class="detail-meta"><span>${icon(root, 'clock-counter-clockwise')}${esc(text(t, t.plugin.updated, { date: formatDate(t, guide.updated) }))}</span></div>` : ''}
  </header>
  <div class="detail-grid guide-grid">
    <aside class="detail-aside">
      ${toc.length ? `<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h" class="overline">${esc(t.guide.onThisPage)}</h2><ol>${toc.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('')}</ol></nav>` : ''}
      ${linkList(root, t, source, 'desktop-only')}
    </aside>
    <div class="detail-main">
      <div class="prose">${rendered.html}</div>
      ${linkList(root, t, source, 'mobile-only')}
    </div>
  </div>
</main>`;
}
