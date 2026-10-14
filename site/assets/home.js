// Live search on the home page. The pre-rendered plugin list stays until index.json loads,
// and stays visible if it fails to load.
import { TYPE_ORDER, browse, compileTerms, createIndex, parseQuery, search, words } from './search.js';
import t from './i18n.js';
import { card, esc, icon } from './render.js';
import { html, text } from './text.js';

const root = document.documentElement.dataset.root || './';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const input = $('#q');
const clear = $('.search-clear');
const slash = $('.slash-hint');
const errorBox = $('.index-error');
const retry = $('[data-retry]');
const filters = $('.filters');
const typeButtons = $$('[data-type]');
const categories = $$('[data-category]');
const hint = $('.type-hint');
const hintText = $('.type-hint-text');
const label = $('.results-label');
const sub = $('.results-sub');
const results = $('#results');
const empty = $('.no-results');
const filtersButton = $('.filters-button');
const sheet = $('#filters-sheet');
const sheetCta = $('.sheet-foot [data-close]');
const sheetReset = $('[data-reset]');

const params = new URLSearchParams(location.search);
const state = {
  query: params.get('q') ?? '',
  chip: TYPE_ORDER.includes(params.get('type')) ? params.get('type') : null,
  category: params.get('category') ?? '',
  dismissedType: null,
};
let data = null;
let parsed = { words: [], type: null };
// What the results area shows now; the pre-rendered list equals the default state.
let shown = 'browse|all|';

const desktop = matchMedia('(min-width: 721px) and (pointer: fine)');
input.value = state.query;
if (desktop.matches || location.hash === '#search') input.focus({ preventScroll: true });
if (location.hash === '#search') history.replaceState(null, '', location.pathname + location.search);
if (state.query || state.chip || state.category) {
  label.textContent = t.search.searching;
  sub.textContent = '';
}

function syncSearchChrome() {
  clear.hidden = !input.value || input.disabled;
  slash.hidden = !!input.value || input.disabled;
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.query.trim()) p.set('q', state.query.trim());
  if (state.chip && state.chip !== 'all') p.set('type', state.chip);
  if (state.category) p.set('category', state.category);
  const search = p.toString();
  const url = location.pathname + (search ? `?${search}` : '');
  if (url !== location.pathname + location.search) history.replaceState(null, '', url);
}

function countByType(items) {
  const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
  for (const it of items) counts[it.type]++;
  return counts;
}

// Words from component names that are sure to find something in the current category.
function tipWords() {
  const freq = new Map();
  for (const it of data.items) {
    if (it.type === 'guide' || (state.category && it.category !== state.category)) continue;
    for (const w of words(it.name)) if (/^[a-z]{4,}$/.test(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([w]) => w);
}

function renderEmpty({ browsing, type, filtersOn }) {
  if (browsing) {
    const types = t.types[type === 'all' ? 'plugin' : type].lower;
    empty.innerHTML = `<p class="empty-note">${esc(text(t, state.category ? t.search.noneInCategory : t.search.noneYet, { types }))}</p>`;
    return;
  }
  const q = state.query.trim();
  const request = `https://github.com/${data.repo}/issues/new?${new URLSearchParams({ template: 'plugin-request.yml', need: q })}`;
  const tips = tipWords();
  empty.innerHTML = `<h2>${html(t, t.search.nothingFound, { query: esc(q) })}</h2>
<p>${esc(filtersOn ? t.search.nothingWithFilters : t.search.nothingAtAll)}</p>
<div class="actions">${filtersOn ? `<button type="button" class="btn" data-clear-filters>${icon(root, 'funnel-x')}${esc(t.search.clearFilters)}</button>` : ''}<a class="btn btn-primary" href="${esc(request)}">${icon(root, 'github-logo')}${esc(t.search.requestPlugin)}</a></div>
${tips.length ? `<div class="tip">${icon(root, 'lightbulb')}<span>${esc(t.search.tip)}</span>${tips.map((w) => `<button type="button" data-try="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}`;
}

function render() {
  syncSearchChrome();
  writeUrl();
  if (!data) return;
  parsed = parseQuery(state.query, data.terms);
  const browsing = parsed.words.length === 0;
  const hintType = !state.chip && parsed.type && state.dismissedType !== parsed.type ? parsed.type : null;
  const type = state.chip || hintType || 'all';
  const category = state.category;

  let list;
  let counts;
  if (browsing) {
    counts = countByType(data.items.filter((it) => !category || it.category === category));
    counts.all = counts.plugin;
    list = browse(data.items, { type, category });
  } else {
    const found = search(data.index, parsed, { category });
    counts = countByType(found.map((r) => r.item));
    counts.all = found.length;
    list = found.filter((r) => type === 'all' || r.item.type === type).map((r) => r.item);
  }

  for (const el of typeButtons) {
    const key = el.dataset.type;
    el.setAttribute('aria-pressed', String(key === type));
    el.querySelector('.count').textContent = counts[key];
    el.classList.toggle('empty', counts[key] === 0);
  }
  hint.hidden = !hintType;
  if (hintType) hintText.textContent = text(t, t.search.showing, { types: t.types[hintType].lower });

  const n = list.length;
  if (browsing) {
    label.textContent = type === 'all' ? t.search.allPlugins : t.types[type].plural;
    sub.textContent = text(t, type === 'all' ? t.search.recentFirst : t.search.inMarketplace, { n });
  } else {
    label.textContent = text(t, t.search.results, { n });
    sub.textContent = '';
  }

  const filtersOn = type !== 'all' || !!category;
  const active = (type !== 'all' ? 1 : 0) + (category ? 1 : 0);
  filtersButton.classList.toggle('active', active > 0);
  const badge = filtersButton.querySelector('.count');
  badge.hidden = active === 0;
  badge.textContent = active;
  sheetReset.hidden = !filtersOn;
  sheetCta.textContent = text(t, browsing && type === 'all' ? t.search.showPlugins : t.search.showResults, { n });

  const key = `${browsing ? 'browse' : state.query}|${type}|${category}`;
  if (key !== shown) {
    shown = key;
    results.innerHTML = list.map((it) => card(it, { root, t, words: parsed.words, repo: data.repo })).join('\n');
  }
  results.hidden = n === 0;
  empty.hidden = n > 0;
  if (n === 0) renderEmpty({ browsing, type, filtersOn });
}

function clearFilters() {
  state.chip = null;
  state.category = '';
  state.dismissedType = parsed.type;
  for (const select of categories) select.value = '';
  render();
}

function setQuery(value) {
  state.query = value;
  input.value = value;
  render();
}

async function fetchJson(path) {
  const response = await fetch(new URL(`${root}${path}`, location.href));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function load() {
  try {
    const [index, terms] = await Promise.all([fetchJson('index.json'), fetchJson('assets/search-terms.json')]);
    data = { items: index.items, repo: index.marketplace.repo, index: createIndex(index.items), terms: compileTerms(terms) };
    if (state.category && !index.categories.includes(state.category)) state.category = '';
    for (const select of categories) select.value = state.category;
    errorBox.hidden = true;
    filters.hidden = false;
    filtersButton.hidden = false;
    input.disabled = false;
    render();
  } catch (error) {
    console.error(error);
    errorBox.hidden = false;
    filters.hidden = true;
    filtersButton.hidden = true;
    hint.hidden = true;
    input.disabled = true;
    label.textContent = t.search.allPlugins;
    sub.textContent = '';
    syncSearchChrome();
  } finally {
    retry.disabled = false;
    retry.querySelector('.label').textContent = t.search.retry;
  }
}

input.addEventListener('input', () => {
  state.query = input.value;
  render();
});
input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && input.value) {
    event.preventDefault();
    setQuery('');
  }
});
clear.addEventListener('click', () => {
  setQuery('');
  input.focus();
});
retry.addEventListener('click', () => {
  retry.disabled = true;
  retry.querySelector('.label').textContent = t.search.retrying;
  load();
});
for (const el of typeButtons) {
  el.addEventListener('click', () => {
    state.chip = el.dataset.type;
    render();
  });
}
for (const select of categories) {
  select.addEventListener('change', () => {
    state.category = select.value;
    for (const other of categories) other.value = select.value;
    render();
  });
}
$('[data-show-all]').addEventListener('click', () => {
  state.dismissedType = parsed.type;
  render();
});
empty.addEventListener('click', (event) => {
  if (event.target.closest('[data-clear-filters]')) clearFilters();
  const tip = event.target.closest('[data-try]');
  if (tip) {
    setQuery(tip.dataset.try);
    input.focus();
  }
});
filtersButton.addEventListener('click', () => sheet.showModal());
sheetReset.addEventListener('click', clearFilters);
sheet.addEventListener('click', (event) => {
  // A click on the backdrop lands on the dialog itself.
  if (event.target === sheet || event.target.closest('[data-close]')) sheet.close();
});

syncSearchChrome();
load();
