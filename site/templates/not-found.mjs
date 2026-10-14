// 404.html. GitHub Pages serves it for a missing path at any depth, so its links use the
// absolute base path instead of relative ones.
import { esc, icon } from '../assets/render.js';

export function notFoundPage({ t, root }) {
  return `<main id="main" class="page not-found">
  <h1>${esc(t.notFound.title)}</h1>
  <p class="lead">${esc(t.notFound.lead)}</p>
  <form class="search" role="search" action="${root}" method="get">
    ${icon(root, 'magnifying-glass', 'search-icon')}
    <input name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="${esc(t.search.label)}" placeholder="${esc(t.search.placeholder)}">
  </form>
  <p><a class="btn" href="${root}">${icon(root, 'house')}${esc(t.notFound.home)}</a></p>
</main>`;
}
