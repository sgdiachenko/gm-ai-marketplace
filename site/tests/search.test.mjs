import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { browse, compileTerms, createIndex, highlight, parseQuery, search, stem, words } from '../assets/search.js';

const terms = compileTerms(JSON.parse(readFileSync(new URL('../search-terms.json', import.meta.url), 'utf8')));

const item = (fields) => ({ keywords: [], usage: '', headings: [], text: '', category: 'code-review', updated: '', ...fields });
// The acceptance fixture from specs/catalog-site.md, with neighbours to rank against.
const ITEMS = [
  item({ id: 'plugin:pr-tools', type: 'plugin', name: 'pr-tools', title: 'PR Tools', plugin: 'pr-tools', description: 'Pull request tools for the team', keywords: ['github', 'code review'], updated: '2026-10-01' }),
  item({ id: 'skill:pr-tools/review-pr', type: 'skill', name: 'review-pr', title: 'review-pr', plugin: 'pr-tools', description: 'Reviews a pull request for bugs and style', usage: '/pr-tools:review-pr' }),
  item({ id: 'skill:pr-tools/describe-pr', type: 'skill', name: 'describe-pr', title: 'describe-pr', plugin: 'pr-tools', description: 'Writes a pull request title and description from the branch diff', usage: '/pr-tools:describe-pr' }),
  item({ id: 'agent:pr-tools/pr-reviewer', type: 'agent', name: 'pr-reviewer', title: 'pr-reviewer', plugin: 'pr-tools', description: 'Second-opinion reviewer that reports only high-confidence issues', usage: 'pr-tools:pr-reviewer' }),
  item({ id: 'plugin:release-kit', type: 'plugin', name: 'release-kit', title: 'release-kit', plugin: 'release-kit', description: 'Changelogs and version bumps', category: 'workflow', updated: '2026-10-09' }),
  item({ id: 'skill:release-kit/changelog', type: 'skill', name: 'changelog', title: 'changelog', plugin: 'release-kit', description: 'Drafts a changelog entry from the commits since the last tag', category: 'workflow', usage: '/release-kit:changelog' }),
  item({ id: 'mcp-server:db/postgres', type: 'mcp-server', name: 'postgres', title: 'postgres', plugin: 'db-helpers', description: 'Local MCP server; runs npx postgres-mcp.', category: 'data', usage: 'postgres (stdio)' }),
];
const index = createIndex(ITEMS);

function run(query, category = '') {
  const parsed = parseQuery(query, terms);
  const results = search(index, parsed, { category });
  const ofType = parsed.type ? results.filter((r) => r.item.type === parsed.type) : results;
  return { parsed, ids: ofType.map((r) => r.item.id) };
}

test('acceptance: "review pull request" puts review-pr first', () => {
  assert.equal(run('review pull request').ids[0], 'skill:pr-tools/review-pr');
});

test('acceptance: "revew pr" finds review-pr with one typo', () => {
  assert.ok(run('revew pr').ids.includes('skill:pr-tools/review-pr'));
});

test('acceptance: "skill for reviewing PRs" sets the type to skills', () => {
  const { parsed, ids } = run('skill for reviewing PRs');
  assert.equal(parsed.type, 'skill');
  assert.equal(ids[0], 'skill:pr-tools/review-pr');
});

test("acceptance: a Ukrainian query sets the type and finds review-pr", () => {
  const { parsed, ids } = run("мені треба скіл для рев'ю PR");
  assert.equal(parsed.type, 'skill');
  assert.deepEqual(parsed.words.map((w) => w.word), ["рев'ю", 'pr']);
  assert.equal(ids[0], 'skill:pr-tools/review-pr');
});

test('acceptance: "xyzzy" finds nothing', () => {
  assert.deepEqual(run('xyzzy').ids, []);
});

test('words keep apostrophes inside a word and normalize typographic ones', () => {
  assert.deepEqual(words("Рев’ю, PR-tools!"), ["рев'ю", 'pr', 'tools']);
  assert.deepEqual(words("'quoted'"), ['quoted']);
});

test('stemming reduces English forms on both sides', () => {
  assert.equal(stem('reviews'), 'review');
  assert.equal(stem('reviewing'), 'review');
  assert.equal(stem('branches'), 'branch');
  assert.equal(stem('рев\'ю'), "рев'ю");
});

test('"mcp server" names the type and leaves no words', () => {
  const parsed = parseQuery('mcp server', terms);
  assert.equal(parsed.type, 'mcp-server');
  assert.deepEqual(parsed.words, []);
});

test('a prefix of 3+ characters matches; shorter does not', () => {
  assert.ok(run('chang').ids.includes('skill:release-kit/changelog'));
  assert.ok(!run('ch').ids.includes('skill:release-kit/changelog'));
});

test('more matched words beat a higher score', () => {
  const ids = run('pull request diff').ids;
  assert.equal(ids[0], 'skill:pr-tools/describe-pr');
});

test('category filters the results', () => {
  assert.deepEqual(run('changelog', 'code-review').ids, []);
  assert.deepEqual(run('changelog', 'workflow').ids, ['skill:release-kit/changelog', 'plugin:release-kit']);
});

test('ties go by type: plugin before skill', () => {
  const tie = createIndex([
    item({ id: 'skill:a/x', type: 'skill', name: 'alpha', title: 'alpha', plugin: 'a', description: 'tool' }),
    item({ id: 'plugin:a', type: 'plugin', name: 'beta', title: 'beta', plugin: 'a', description: 'tool' }),
  ]);
  const results = search(tie, parseQuery('tool', terms));
  assert.deepEqual(results.map((r) => r.item.id), ['plugin:a', 'skill:a/x']);
});

test('browse lists plugins most recently updated first, or every item of one type', () => {
  assert.deepEqual(browse(ITEMS).map((it) => it.id), ['plugin:release-kit', 'plugin:pr-tools']);
  assert.deepEqual(browse(ITEMS, { type: 'skill' }).map((it) => it.id), [
    'skill:pr-tools/describe-pr',
    'skill:pr-tools/review-pr',
    'skill:release-kit/changelog',
  ]);
});

test('highlight marks matched words, including synonyms', () => {
  const parsed = parseQuery("рев'ю", terms);
  const segs = highlight('Reviews a pull request', parsed.words);
  assert.deepEqual(segs.filter((s) => s.hit).map((s) => s.text), ['Reviews']);
});

test('1,000 items answer within 50 ms', () => {
  const many = Array.from({ length: 1000 }, (_, i) =>
    item({
      id: `skill:p${i % 40}/s${i}`,
      type: 'skill',
      name: `skill-${i}`,
      title: `skill-${i}`,
      plugin: `plugin-${i % 40}`,
      description: `Handles task number ${i} for reviews, releases and pull requests`,
      text: `Body ${i} `.repeat(60) + 'with several distinct words like deploy, migrate, refactor and summarize',
    }),
  );
  const big = createIndex(many);
  const parsed = parseQuery('review pull request deploy', terms);
  search(big, parsed);
  const start = performance.now();
  search(big, parsed);
  assert.ok(performance.now() - start < 50, 'search took 50 ms or more');
});
