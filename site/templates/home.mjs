// Search, the home page. The plugin list is pre-rendered, so it reads without JavaScript;
// the search field, filters and copy buttons appear only with it (assets/home.js).
import { REPO } from '../config.mjs';
import { TYPE_ORDER, browse } from '../assets/search.js';
import { TYPE_ICONS, card, esc, icon } from '../assets/render.js';
import { text } from '../assets/text.js';

export function home({ t, items, categories }) {
  const root = './';
  const plugins = browse(items);
  const counts = Object.fromEntries(TYPE_ORDER.map((type) => [type, items.filter((it) => it.type === type).length]));
  const chips = [
    { key: 'all', label: t.search.all, icon: 'squares-four', count: counts.plugin },
    ...TYPE_ORDER.map((type) => ({ key: type, label: t.types[type].plural, icon: TYPE_ICONS[type], count: counts[type] })),
  ];
  const chip = (c) =>
    `<button type="button" class="chip" data-type="${c.key}" aria-pressed="${c.key === 'all'}">${icon(root, c.icon)}${esc(c.label)}<span class="count">${c.count}</span></button>`;
  const sheetRow = (c) =>
    `<button type="button" class="sheet-row" data-type="${c.key}" aria-pressed="${c.key === 'all'}">${icon(root, c.icon)}<span class="sheet-label">${esc(c.label)}</span><span class="count">${c.count}</span>${icon(root, 'check', 'sheet-check')}</button>`;
  const options = [`<option value="">${esc(t.search.anyCategory)}</option>`, ...categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)].join('');

  return `<main id="main" class="page home">
  <div class="search js-only" role="search">
    ${icon(root, 'magnifying-glass', 'search-icon')}
    <input id="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="${esc(t.search.label)}" placeholder="${esc(t.search.placeholder)}">
    <button type="button" class="search-clear" aria-label="${esc(t.search.clear)}" hidden>${icon(root, 'x')}</button>
    <kbd class="slash-hint" aria-hidden="true">/</kbd>
  </div>
  <div class="index-error" role="alert" hidden>
    ${icon(root, 'warning-circle')}
    <span>${esc(t.search.indexError)}</span>
    <button type="button" class="btn" data-retry>${icon(root, 'arrow-clockwise')}<span class="label">${esc(t.search.retry)}</span></button>
  </div>
  <div class="filters js-only">
    <div class="chips" role="group" aria-label="${esc(t.search.typeGroup)}">${chips.map(chip).join('')}</div>
    <label class="category">${esc(t.search.category)} <select data-category>${options}</select></label>
  </div>
  <div class="type-hint" hidden>
    ${icon(root, 'funnel-simple')}<span class="type-hint-text"></span><span aria-hidden="true">·</span>
    <button type="button" class="link-button" data-show-all>${esc(t.search.showAllTypes)}${icon(root, 'x')}</button>
  </div>
  <div class="results-head">
    <div class="results-status" role="status" aria-live="polite"><h2 class="results-label">${esc(t.search.allPlugins)}</h2><span class="results-sub">${esc(text(t, t.search.recentFirst, { n: plugins.length }))}</span></div>
    <button type="button" class="btn filters-button js-only" aria-haspopup="dialog" aria-controls="filters-sheet">${icon(root, 'sliders-horizontal')}${esc(t.search.filters)}<span class="count" hidden></span></button>
  </div>
  <div class="cards" id="results">
${plugins.map((it) => card(it, { root, t, repo: REPO })).join('\n')}
  </div>
  <div class="no-results" hidden></div>
</main>
<dialog class="sheet" id="filters-sheet" aria-labelledby="sheet-h">
  <div class="sheet-head">
    <h2 id="sheet-h">${esc(t.search.filters)}</h2>
    <button type="button" class="link-button" data-reset hidden>${esc(t.search.reset)}</button>
    <button type="button" class="icon-button" data-close aria-label="${esc(t.search.closeFilters)}">${icon(root, 'x')}</button>
  </div>
  <div class="sheet-body">
    <div role="group" aria-labelledby="sheet-type"><div id="sheet-type" class="overline">${esc(t.search.typeGroup)}</div>${chips.map(sheetRow).join('')}</div>
    <label class="sheet-category"><span class="overline">${esc(t.search.category)}</span><select data-category>${options}</select></label>
  </div>
  <div class="sheet-foot"><button type="button" class="btn btn-primary btn-block" data-close>${esc(text(t, t.search.showPlugins, { n: plugins.length }))}</button></div>
</dialog>`;
}
