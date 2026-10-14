// Markdown for READMEs, component bodies and docs/installing.md. Raw HTML is escaped,
// relative links open the file on GitHub, and relative images are copied into the site
// (the CSP allows no other origin).
import { existsSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { Marked, Renderer } from '../vendor/marked.esm.js';
import { esc, icon } from '../assets/render.js';

const SAFE_SCHEME = /^(https?:|mailto:)/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function slug(text) {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  );
}

function plainText(tokens, out = []) {
  for (const token of tokens ?? []) {
    if (token.type === 'table') {
      for (const cell of token.header) plainText(cell.tokens, out);
      for (const row of token.rows) for (const cell of row) plainText(cell.tokens, out);
    } else if (token.type === 'list') {
      for (const item of token.items) plainText(item.tokens, out);
    } else if (token.tokens) {
      plainText(token.tokens, out);
    } else if (['text', 'codespan', 'code', 'escape'].includes(token.type)) {
      out.push(token.text);
    }
  }
  return out;
}

const textOf = (tokens) => plainText(tokens).join(' ').replace(/\s+/g, ' ').trim();

/**
 * Renders Markdown from the repository.
 * - file: repository-relative path of the Markdown file, used to resolve relative links
 * - root: repository directory on disk
 * - github: https://github.com/<owner>/<repo>; branch: the branch links point to
 * - dropTitle: names, and a leading h1 equal to one of them is dropped; or true to drop any leading h1
 * - topLevel: the level the document's highest heading renders at, so it nests under the page's own headings
 * - pageRoot: relative path from the page to the site root
 * - t: UI strings, for the copy buttons on code blocks
 * - image(repoPath): copies an image into the site and returns its URL relative to the page
 * Returns { html, title, headings: [{ depth, text, id }], text }.
 */
export function renderMarkdown(source, { file, root, github, branch, dropTitle = [], topLevel = 2, pageRoot, t, image }) {
  const md = new Marked({ gfm: true });
  let tokens = md.lexer(source);

  let title = null;
  const first = tokens.find((token) => token.type !== 'space');
  if (first?.type === 'heading' && first.depth === 1) {
    title = textOf(first.tokens);
    const names = dropTitle === true ? [title.toLowerCase()] : dropTitle.map((n) => n.toLowerCase().trim());
    if (names.includes(title.toLowerCase())) tokens = tokens.filter((token) => token !== first);
  }

  const depths = tokens.filter((token) => token.type === 'heading').map((token) => token.depth);
  const shift = depths.length ? Math.max(0, topLevel - Math.min(...depths)) : 0;

  const used = new Map();
  const headingId = (text) => {
    const base = slug(text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
  const headings = [];
  const dir = posix.dirname(file);

  const resolveHref = (href) => {
    if (href.startsWith('#')) return href;
    if (SAFE_SCHEME.test(href) || href.startsWith('//')) return href;
    if (ANY_SCHEME.test(href)) return null;
    const [path, hash = ''] = href.split('#');
    if (!path) return `#${hash}`;
    const target = posix.normalize(path.startsWith('/') ? path.slice(1) : posix.join(dir, path));
    const onDisk = `${root}/${target}`;
    const kind = existsSync(onDisk) && statSync(onDisk).isDirectory() ? 'tree' : 'blob';
    return `${github}/${kind}/${branch}/${target.replace(/\/$/, '')}${hash ? `#${hash}` : ''}`;
  };

  md.use({
    renderer: {
      html({ text, block }) {
        return block ? `<p>${esc(text)}</p>\n` : esc(text);
      },
      heading({ tokens: inline, depth }) {
        const text = textOf(inline);
        const id = headingId(text);
        headings.push({ depth, text, id });
        const level = Math.min(6, depth + shift);
        return `<h${level} id="${esc(id)}">${this.parser.parseInline(inline)}</h${level}>\n`;
      },
      link({ href, title: linkTitle, tokens: inline }) {
        const body = this.parser.parseInline(inline);
        const url = resolveHref(href);
        if (url === null) return body;
        const titleAttr = linkTitle ? ` title="${esc(linkTitle)}"` : '';
        return `<a href="${esc(url)}"${titleAttr}>${body}</a>`;
      },
      image({ href, text, title: imageTitle }) {
        if (SAFE_SCHEME.test(href) || href.startsWith('//') || ANY_SCHEME.test(href)) {
          const url = resolveHref(href);
          return url ? `<a href="${esc(url)}">${esc(text || 'Image')}</a>` : esc(text);
        }
        const target = posix.normalize(posix.join(dir, href.split('#')[0]));
        const src = image(target);
        const titleAttr = imageTitle ? ` title="${esc(imageTitle)}"` : '';
        return `<img src="${esc(src)}" alt="${esc(text)}"${titleAttr} loading="lazy">`;
      },
      code({ text, lang }) {
        const cls = lang ? ` class="language-${esc(lang.split(/\s/)[0])}"` : '';
        return `<div class="code-block"><pre><code${cls}>${esc(text)}</code></pre><button type="button" class="btn btn-small copy-code js-only" data-copy-code data-copy-message="${esc(t.copy.done)}">${icon(pageRoot, 'copy')}<span class="label">${esc(t.copy.copy)}</span></button></div>\n`;
      },
      table(token) {
        return `<div class="table-wrap">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
    },
  });

  const html = md.parser(tokens);
  return {
    html,
    title,
    headings,
    text: textOf(tokens),
  };
}
