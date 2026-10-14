// Formatting for the UI strings in site/i18n/<locale>.json, shared by the build and the browser.
// Strings use {name} placeholders; an object with "one"/"other" (or any Intl plural category) picks a form by {n}.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const pluralRules = new Map();

function pick(t, entry, vars) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') throw new Error(`missing UI string (got ${JSON.stringify(entry)})`);
  if (!pluralRules.has(t.locale)) pluralRules.set(t.locale, new Intl.PluralRules(t.locale));
  return entry[pluralRules.get(t.locale).select(Number(vars.n ?? 0))] ?? entry.other;
}

// Plain text with placeholders filled in.
export function text(t, entry, vars = {}) {
  return pick(t, entry, vars).replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

// HTML: the string itself is escaped, placeholder values are inserted as given (escape them first).
export function html(t, entry, vars = {}) {
  return pick(t, entry, vars)
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      return m && m[1] in vars ? String(vars[m[1]]) : esc(part);
    })
    .join('');
}

// YYYY-MM-DD as a short date in the site's locale, for example "Oct 14, 2026".
export function formatDate(t, iso) {
  if (!iso) return '';
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat(t.locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
