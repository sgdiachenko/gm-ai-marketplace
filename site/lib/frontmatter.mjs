// Frontmatter in the YAML subset that skills, agents and commands use: scalars, quoted strings,
// `>` and `|` blocks, simple lists, and one level of mapping (`metadata:`). Anything else fails
// with file:line, so the site never shows a half-parsed description.

export class FrontmatterError extends Error {}

const KEY = /^([A-Za-z0-9_][\w.-]*)\s*:(?:\s+(.*?))?\s*$/;
const NESTED_KEY = /^\s*[\w.-]+\s*:(\s|$)/;

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => line.trim() === '' || /^\s*#/.test(line);

function unquoteDouble(s, where) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => {
    if (c[0] === 'u') return String.fromCharCode(parseInt(c.slice(1), 16));
    const map = { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/', r: '\r', 0: '\0' };
    if (!(c in map)) throw new FrontmatterError(`${where}: unsupported escape \\${c}`);
    return map[c];
  });
}

function scalar(raw, where) {
  const s = raw.trim();
  if (s.startsWith('"')) {
    const m = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(s);
    if (!m) throw new FrontmatterError(`${where}: unterminated or multi-line double-quoted string`);
    return unquoteDouble(m[1], where);
  }
  if (s.startsWith("'")) {
    const m = /^'((?:[^']|'')*)'\s*(?:#.*)?$/.exec(s);
    if (!m) throw new FrontmatterError(`${where}: unterminated or multi-line single-quoted string`);
    return m[1].replace(/''/g, "'");
  }
  if (/^[{&*!%@`]/.test(s)) throw new FrontmatterError(`${where}: unsupported YAML (${s[0]}); use a plain or quoted string`);
  const value = s.replace(/\s+#.*$/, '');
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^(null|~)$/i.test(value) || value === '') return null;
  return value;
}

function flowList(raw, where) {
  const m = /^\[(.*)\]\s*(?:#.*)?$/.exec(raw.trim());
  if (!m) throw new FrontmatterError(`${where}: unterminated [list]`);
  if (m[1].trim() === '') return [];
  const items = [];
  // Splits on commas outside quotes.
  let current = '';
  let quote = null;
  for (const ch of m[1]) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      items.push(current);
      current = '';
    } else if (ch === '[' || ch === '{') {
      throw new FrontmatterError(`${where}: nested lists and maps are not supported`);
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items.map((item) => scalar(item, where));
}

function blockScalar(header, lines, start, where) {
  const style = header[0];
  const chomp = header[1] ?? '';
  const body = [];
  let i = start;
  let indent = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push('');
      continue;
    }
    const n = indentOf(line);
    if (indent === null) indent = n;
    if (n < indent || n === 0) break;
    body.push(line.slice(indent));
  }
  while (body.length && body[body.length - 1] === '') body.pop();
  if (indent === null) throw new FrontmatterError(`${where}: empty ${style} block`);
  let text;
  if (style === '|') text = body.join('\n');
  else {
    // Folded: lines join with a space, a blank line becomes a line break, more-indented lines stay as they are.
    text = body[0] ?? '';
    for (let k = 1; k < body.length; k++) {
      const line = body[k];
      const prev = body[k - 1];
      if (line === '') text += '\n';
      else if (prev === '') text += line;
      else if (/^\s/.test(line) || /^\s/.test(prev)) text += `\n${line}`;
      else text += ` ${line}`;
    }
  }
  if (chomp === '+') text += '\n';
  else if (chomp !== '-') text = text.replace(/\n*$/, '\n');
  return { value: chomp === '-' ? text.replace(/\n+$/, '') : text, next: i };
}

// Returns { data, body, bodyLine } for a Markdown file; `file` is used in error messages.
export function parseFrontmatter(source, file) {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines[0] !== '---') return { data: {}, body: text, bodyLine: 1 };
  const end = lines.findIndex((line, i) => i > 0 && (line === '---' || line === '...'));
  if (end === -1) throw new FrontmatterError(`${file}:1: frontmatter is not closed with ---`);

  const data = {};
  const fm = lines.slice(1, end);
  const at = (i) => `${file}:${i + 2}`;
  let i = 0;
  while (i < fm.length) {
    const line = fm[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    if (/^\s/.test(line)) throw new FrontmatterError(`${at(i)}: unexpected indentation`);
    const m = KEY.exec(line);
    if (!m) throw new FrontmatterError(`${at(i)}: expected "key: value"`);
    const [, key, rest = ''] = m;
    if (key in data) throw new FrontmatterError(`${at(i)}: duplicate key "${key}"`);
    i++;

    if (/^[|>][+-]?$/.test(rest)) {
      const block = blockScalar(rest, fm, i, at(i - 1));
      data[key] = block.value;
      i = block.next;
    } else if (rest.startsWith('[')) {
      data[key] = flowList(rest, at(i - 1));
    } else if (rest === '' && i < fm.length && NESTED_KEY.test(fm[i]) && /^\s/.test(fm[i])) {
      // One level of mapping, as in `metadata:` with `tags: a, b` under it; values are scalars or [lists].
      const map = {};
      const indent = indentOf(fm[i]);
      while (i < fm.length && (isBlank(fm[i]) || /^\s/.test(fm[i]))) {
        if (isBlank(fm[i])) {
          i++;
          continue;
        }
        const entry = /^\s+([\w.-]+)\s*:(?:\s+(.*?))?\s*$/.exec(fm[i]);
        if (!entry || indentOf(fm[i]) !== indent) throw new FrontmatterError(`${at(i)}: mappings nested more than one level are not supported`);
        const [, name, value = ''] = entry;
        if (value === '' || /^[|>]/.test(value)) throw new FrontmatterError(`${at(i)}: mappings nested more than one level are not supported`);
        if (name in map) throw new FrontmatterError(`${at(i)}: duplicate key "${key}.${name}"`);
        map[name] = value.startsWith('[') ? flowList(value, at(i)) : scalar(value, at(i));
        i++;
      }
      data[key] = map;
    } else if (rest === '') {
      // Either a list of `- item` lines or an empty value.
      const items = [];
      while (i < fm.length && (isBlank(fm[i]) || /^\s*- /.test(fm[i]) || /^\s*-$/.test(fm[i]) || /^\s/.test(fm[i]))) {
        const item = fm[i];
        if (isBlank(item)) {
          i++;
          continue;
        }
        const li = /^\s*-(?:\s+(.*))?$/.exec(item);
        if (!li) throw new FrontmatterError(`${at(i)}: expected a "- item" list`);
        if (NESTED_KEY.test(li[1] ?? '')) throw new FrontmatterError(`${at(i)}: list items must be plain values, not mappings`);
        items.push(scalar(li[1] ?? '', at(i)));
        i++;
      }
      data[key] = items.length ? items : null;
    } else {
      let value = rest;
      // A plain scalar may continue on indented lines.
      if (!/^["']/.test(rest)) {
        while (i < fm.length && /^\s+\S/.test(fm[i]) && !/^\s*#/.test(fm[i])) {
          if (NESTED_KEY.test(fm[i]) || /^\s*- /.test(fm[i])) throw new FrontmatterError(`${at(i)}: nested mappings are not supported`);
          value += ` ${fm[i].trim()}`;
          i++;
        }
      }
      data[key] = scalar(value, at(i - 1));
    }
  }
  return { data, body: lines.slice(end + 1).join('\n'), bodyLine: end + 2 };
}
