// Search over index.json, shared by the browser and the tests. No DOM access here.
// Query rules and ranking: specs/catalog-site.md, section Search.

export const TYPE_ORDER = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp-server', 'lsp-server', 'guide'];
const FIELDS = ['name', 'keywords', 'description', 'usage', 'plugin', 'text'];
const WEIGHTS = [5, 4, 3, 2, 1.5, 1];

export const normalize = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[‘’ʼ`]/g, "'");

// Splits on anything but letters, digits and apostrophes inside a word, so a word with an apostrophe stays whole.
export function words(s) {
  return normalize(s)
    .split(/[^\p{L}\p{N}']+/u)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

// A deliberately small English stemmer, applied the same way to the index and the query.
export function stem(w) {
  if (/[^a-z0-9']/.test(w)) return w;
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length >= 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function withinOneEdit(a, b) {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

// Exact word, then prefix (query words of 3+ characters), then one typo (5+ characters).
export function matchQuality(q, token) {
  if (token === q) return 1;
  if (q.length >= 3 && token.startsWith(q)) return 0.7;
  if (q.length >= 5 && withinOneEdit(q, token)) return 0.5;
  return 0;
}

// Compiles search-terms.json into lookups keyed by normalized words.
export function compileTerms(raw) {
  const stop = new Set((raw.stopWords ?? []).map(normalize));
  const types = new Map();
  for (const [type, list] of Object.entries(raw.typeWords ?? {})) for (const w of list) types.set(normalize(w), type);
  const followers = new Map();
  for (const [type, list] of Object.entries(raw.typeWordFollowers ?? {})) followers.set(type, new Set(list.map(normalize)));
  const synonyms = new Map();
  for (const [w, list] of Object.entries(raw.synonyms ?? {})) synonyms.set(normalize(w), list.map((x) => stem(normalize(x))));
  return { stop, types, followers, synonyms };
}

// Returns the query words, each with the alternatives that count as a match, and a type named in the query.
export function parseQuery(query, terms) {
  let type = null;
  const out = [];
  const seen = new Set();
  for (const w of words(query)) {
    if (terms.stop.has(w)) continue;
    const named = terms.types.get(w);
    if (named) {
      type ??= named;
      continue;
    }
    if (type && terms.followers.get(type)?.has(w)) continue;
    const s = stem(w);
    const alts = [...new Set([s, ...(terms.synonyms.get(w) ?? terms.synonyms.get(s) ?? [])])];
    const key = alts.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word: w, alts });
  }
  return { words: out, type };
}

const tokens = (s) => [...new Set(words(s).map(stem))];

// Builds a vocabulary of every token with the documents and fields it appears in.
export function createIndex(items) {
  const vocab = new Map();
  items.forEach((it, doc) => {
    const fields = [
      `${it.name} ${it.title}`,
      (it.keywords ?? []).join(' '),
      it.description ?? '',
      it.usage ?? '',
      `${it.plugin ?? ''} ${(it.headings ?? []).join(' ')}`,
      it.text ?? '',
    ];
    fields.forEach((text, field) => {
      for (const t of tokens(text)) {
        if (!vocab.has(t)) vocab.set(t, []);
        vocab.get(t).push(doc * FIELDS.length + field);
      }
    });
  });
  return { items, vocab };
}

const byName = (a, b) => a.name.localeCompare(b.name);
const typeRank = (t) => TYPE_ORDER.indexOf(t);

// Every item matching at least one query word, best first. A word scores its best field
// (weight × match quality), so long READMEs don't outrank a precise name.
export function search(index, parsed, { category = '' } = {}) {
  const { items, vocab } = index;
  const matched = new Array(items.length).fill(0);
  const score = new Array(items.length).fill(0);
  for (const { alts } of parsed.words) {
    const best = new Map();
    for (const [token, postings] of vocab) {
      let q = 0;
      for (const alt of alts) q = Math.max(q, matchQuality(alt, token));
      if (!q) continue;
      for (const p of postings) {
        const doc = Math.floor(p / FIELDS.length);
        const value = WEIGHTS[p % FIELDS.length] * q;
        if ((best.get(doc) ?? 0) < value) best.set(doc, value);
      }
    }
    for (const [doc, value] of best) {
      matched[doc]++;
      score[doc] += value;
    }
  }
  const results = [];
  items.forEach((item, doc) => {
    if (matched[doc] > 0 && (!category || item.category === category)) results.push({ item, matched: matched[doc], score: score[doc] });
  });
  return results.sort(
    (a, b) =>
      b.matched - a.matched || b.score - a.score || typeRank(a.item.type) - typeRank(b.item.type) || byName(a.item, b.item),
  );
}

// The empty-query listing: plugins most recently updated first, or every item of one type.
export function browse(items, { type = 'all', category = '' } = {}) {
  const pool = items.filter((it) => !category || it.category === category);
  if (type === 'all' || type === 'plugin') {
    return pool
      .filter((it) => it.type === 'plugin')
      .sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? '') || byName(a, b));
  }
  return pool.filter((it) => it.type === type).sort((a, b) => (a.plugin ?? '').localeCompare(b.plugin ?? '') || byName(a, b));
}

// Splits text into plain and matched runs for highlighting.
export function highlight(text, parsedWords) {
  if (!parsedWords.length) return [{ text, hit: false }];
  return String(text)
    .split(/([\p{L}\p{N}']+)/u)
    .filter((part) => part !== '')
    .map((part) => {
      const w = stem(normalize(part).replace(/^'+|'+$/g, ''));
      const hit = /[\p{L}\p{N}]/u.test(part) && parsedWords.some(({ alts }) => alts.some((alt) => matchQuality(alt, w) > 0));
      return { text: part, hit };
    });
}
