// Markup shared by the build (pre-rendered pages) and the browser (live search results),
// so a card looks the same either way. `root` is the relative path from the page to the site root;
// `t` is the UI strings from site/i18n/<locale>.json.
import { highlight } from './search.js';
import { esc, text } from './text.js';

export { esc };

export const TYPE_ICONS = {
  plugin: 'package',
  skill: 'sparkle',
  agent: 'robot',
  command: 'terminal-window',
  hook: 'flow-arrow',
  'mcp-server': 'plugs-connected',
  'lsp-server': 'brackets-curly',
  guide: 'book-open-text',
};

export const icon = (root, name, cls = '') =>
  `<svg class="icon${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"><use href="${root}assets/icons.svg#${name}"></use></svg>`;

export const installCommand = (plugin, repo) => `claude plugin install ${plugin} --marketplace ${repo}`;

const marked = (value, words) =>
  highlight(value, words)
    .map((s) => (s.hit ? `<mark>${esc(s.text)}</mark>` : esc(s.text)))
    .join('');

// A copy button. With `label`, it reads "Copied" for two seconds after a click; without, only its icon changes.
export function copyButton(root, t, { value, label, message, cls = '', aria }) {
  const ariaAttr = aria ? ` aria-label="${esc(aria)}" title="${esc(t.copy.copy)}"` : '';
  const inner = label ? `${icon(root, 'copy')}<span class="label">${esc(label)}</span>` : icon(root, 'copy');
  return `<button type="button" class="${cls} js-only" data-copy="${esc(value)}" data-copy-message="${esc(message ?? t.copy.done)}"${ariaAttr}>${inner}</button>`;
}

// The usage string: a copy button with JavaScript, plain code without.
export function usage(root, t, value) {
  return (
    `<button type="button" class="usage js-only" data-copy="${esc(value)}" data-copy-message="${esc(text(t, t.copy.valueCopied, { value }))}" aria-label="${esc(text(t, t.copy.copyValue, { value }))}" title="${esc(t.copy.copy)}"><span class="usage-text">${esc(value)}</span>${icon(root, 'copy')}</button>` +
    `<code class="usage usage-static no-js-only">${esc(value)}</code>`
  );
}

export function badges(root, t, list, { setupHref } = {}) {
  const out = [];
  if (list.includes('needs-setup')) {
    const inner = `${icon(root, 'key')}${esc(t.badges.needsSetup)}`;
    out.push(setupHref ? `<a class="badge" href="${setupHref}">${inner}</a>` : `<span class="badge">${inner}</span>`);
  }
  if (list.includes('off-by-default')) {
    out.push(`<span class="badge" title="${esc(t.badges.offByDefaultHint)}">${icon(root, 'toggle-left')}${esc(t.badges.offByDefault)}</span>`);
  }
  return out.join('');
}

function context(item, t) {
  if (item.type === 'plugin') {
    return item.category
      ? text(t, t.card.pluginContext, { version: item.pluginVersion, category: item.category })
      : text(t, t.card.pluginVersion, { version: item.pluginVersion });
  }
  if (item.type === 'guide') return (item.source ?? '').replace(/^.*?\/blob\/[^/]+\//, '');
  return text(t, t.card.componentContext, { plugin: item.plugin, version: item.pluginVersion });
}

// A result card. `words` are parsed query words to highlight; `repo` builds the install command.
export function card(item, { root, t, words = [], repo }) {
  const ctx = context(item, t);
  const actions = [];
  if (item.usage) actions.push(usage(root, t, item.usage));
  if (item.plugin) {
    actions.push(
      `<span class="card-buttons">${copyButton(root, t, {
        value: installCommand(item.plugin, repo),
        label: t.card.copyInstall,
        message: text(t, t.card.installCopied, { plugin: item.plugin }),
        cls: 'btn btn-small',
      })}</span>`,
    );
  }
  return `<article class="card">
  <div class="card-main">
    <div class="card-top"><span class="kicker">${icon(root, TYPE_ICONS[item.type])}${esc(t.types[item.type].label)}</span><span class="badges">${badges(root, t, item.badges ?? [])}</span></div>
    <h3 class="card-title"><a href="${root}${esc(item.url)}">${marked(item.title, words)}</a></h3>
    ${ctx ? `<div class="card-context">${esc(ctx)}</div>` : ''}
    <p class="card-desc">${marked(item.description, words)}</p>
  </div>
  ${actions.length ? `<div class="card-actions">${actions.join('')}</div>` : ''}
</article>`;
}
