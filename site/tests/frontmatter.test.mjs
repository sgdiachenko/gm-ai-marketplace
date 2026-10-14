import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FrontmatterError, parseFrontmatter } from '../lib/frontmatter.mjs';

const parse = (text) => parseFrontmatter(text, 'SKILL.md');

test('scalars, quoted strings and booleans', () => {
  const { data, body } = parse(`---
name: review-pr
description: "Reviews a \\"pull request\\""
note: 'it''s fine'
disable-model-invocation: true
user-invocable: False
empty:
# a comment
---
Body text
`);
  assert.deepEqual(data, {
    name: 'review-pr',
    description: 'Reviews a "pull request"',
    note: "it's fine",
    'disable-model-invocation': true,
    'user-invocable': false,
    empty: null,
  });
  assert.equal(body, 'Body text\n');
});

test('folded and literal blocks', () => {
  const { data } = parse(`---
folded: >
  Writes a title
  and a description.

  Second paragraph.
literal: |-
  line one
  line two
next: value
---
`);
  assert.equal(data.folded, 'Writes a title and a description.\nSecond paragraph.\n');
  assert.equal(data.literal, 'line one\nline two');
  assert.equal(data.next, 'value');
});

test('block and flow lists, and plain scalars over several lines', () => {
  const { data } = parse(`---
tools:
  - Read
  - "Grep"
allowed-tools: [Bash(git:*), 'Read']
description: A long description
  that continues here
---
`);
  assert.deepEqual(data.tools, ['Read', 'Grep']);
  assert.deepEqual(data['allowed-tools'], ['Bash(git:*)', 'Read']);
  assert.equal(data.description, 'A long description that continues here');
});

test('one level of mapping, as skills use for metadata', () => {
  const { data } = parse(`---
name: onion-architecture
metadata:
  tags: architecture, onion, ddd
  owners: [platform, backend]
user-invocable: false
---
`);
  assert.deepEqual(data.metadata, { tags: 'architecture, onion, ddd', owners: ['platform', 'backend'] });
  assert.equal(data['user-invocable'], false);
});

test('no frontmatter returns the whole text as the body', () => {
  assert.deepEqual(parse('# Title\n'), { data: {}, body: '# Title\n', bodyLine: 1 });
});

test('unsupported YAML fails with file:line', () => {
  const cases = [
    ['---\nname: x\nmetadata:\n  owner:\n    team: core\n---\n', 'SKILL.md:4: mappings nested more than one level are not supported'],
    ['---\nname: x\nmetadata:\n  owner: me\n    team: core\n---\n', 'SKILL.md:5: mappings nested more than one level are not supported'],
    ['---\nname: "unterminated\n---\n', 'SKILL.md:2: unterminated or multi-line double-quoted string'],
    ['---\nname: x\nname: y\n---\n', 'SKILL.md:3: duplicate key "name"'],
    ['---\nlist: {a: 1}\n---\n', 'SKILL.md:2: unsupported YAML ({); use a plain or quoted string'],
    ['---\nname: x\n', 'SKILL.md:1: frontmatter is not closed with ---'],
  ];
  for (const [text, message] of cases) {
    assert.throws(() => parse(text), (error) => error instanceof FrontmatterError && error.message === message, message);
  }
});
