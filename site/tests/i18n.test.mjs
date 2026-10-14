// Every text the site shows, apart from repository content, comes from site/i18n/<locale>.json.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { LOCALE } from '../config.mjs';
import { TYPE_ORDER } from '../assets/search.js';
import { formatDate, html, text } from '../assets/text.js';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const t = JSON.parse(readFileSync(join(SITE, 'i18n', `${LOCALE}.json`), 'utf8'));
const CODE = [
  ...['assets', 'templates', 'lib'].flatMap((dir) =>
    readdirSync(join(SITE, dir))
      .filter((f) => /\.m?js$/.test(f))
      .map((f) => `${dir}/${f}`),
  ),
  'build.mjs',
];
const source = (file) => readFileSync(join(SITE, file), 'utf8');

test('every string the code names exists', () => {
  for (const file of CODE) {
    for (const m of source(file).matchAll(/\bt\.([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)*)/g)) {
      const value = m[1].split('.').reduce((node, key) => node?.[key], t);
      assert.ok(value !== undefined, `${file}: t.${m[1]} is not in site/i18n/${LOCALE}.json`);
    }
  }
});

test('every component type and fact has its strings', () => {
  for (const type of TYPE_ORDER) {
    for (const key of ['label', 'plural', 'lower', 'count']) assert.ok(t.types[type]?.[key], `types.${type}.${key}`);
  }
  for (const m of source('lib/read-repo.mjs').matchAll(/\[\['?([a-zA-Z]+)'?, |^\s+\['([a-zA-Z]+)', /gm)) {
    const key = m[1] ?? m[2];
    assert.ok(t.component.facts[key], `component.facts.${key}`);
  }
});

// The literal parts of every template literal (`…`), with ${…} expressions dropped, nested ones included.
function templateText(code) {
  const out = [];
  let i = 0;
  function literal() {
    let text = '';
    for (i++; i < code.length && code[i] !== '`'; i++) {
      if (code[i] === '\\') i++;
      else if (code[i] === '$' && code[i + 1] === '{') expression();
      else text += code[i];
    }
    out.push(text);
  }
  function expression() {
    let depth = 0;
    for (i++; i < code.length; i++) {
      if (code[i] === '`') literal();
      else if (code[i] === '{') depth++;
      else if (code[i] === '}' && --depth === 0) return;
    }
  }
  for (; i < code.length; i++) {
    if (code[i] === '`') literal();
    else if (code[i] === "'" || code[i] === '"') {
      const quote = code[i];
      for (i++; i < code.length && code[i] !== quote; i++) if (code[i] === '\\') i++;
    } else if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
    }
  }
  return out;
}

test('templates and scripts carry no visible text of their own', () => {
  // Files that write markup; search.js and text.js have regexes a simple scanner would misread.
  const markup = CODE.filter((f) => f.startsWith('templates/') || ['assets/render.js', 'assets/home.js', 'assets/app.js', 'lib/markdown.mjs'].includes(f));
  for (const file of markup) {
    for (const code of templateText(source(file))) {
    for (const m of code.matchAll(/>([^<>`]*[A-Za-z]{2,}[^<>`]*)</g)) {
      assert.fail(`${file}: text "${m[1].trim()}" belongs in site/i18n/${LOCALE}.json`);
    }
    for (const m of code.matchAll(/\b(?:aria-label|title|placeholder|alt)="([^"]*[A-Za-z]{2,}[^"]*)"/g)) {
      assert.fail(`${file}: attribute text "${m[1]}" belongs in site/i18n/${LOCALE}.json`);
    }
    }
  }
});

test('formatting fills placeholders, picks plural forms and escapes HTML', () => {
  assert.equal(text(t, t.search.results, { n: 1 }), '1 result');
  assert.equal(text(t, t.search.results, { n: 3 }), '3 results');
  assert.equal(html(t, 'Nothing for “{query}” & more', { query: '<b>x</b>' }), 'Nothing for “<b>x</b>” &amp; more');
  assert.equal(formatDate(t, '2026-10-14'), 'Oct 14, 2026');
  const uk = { locale: 'uk' };
  const forms = { one: '{n} плагін', few: '{n} плагіни', many: '{n} плагінів', other: '{n} плагіна' };
  assert.deepEqual([1, 3, 5].map((n) => text(uk, forms, { n })), ['1 плагін', '3 плагіни', '5 плагінів']);
});
