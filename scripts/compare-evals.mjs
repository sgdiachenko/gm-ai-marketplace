#!/usr/bin/env node
// Compares two runs of an eval suite, a baseline and a candidate, and applies the quality gate of
// docs/COST-BASELINE.md. Reads each run's aggregate-result.json and, for token and call counts, the
// session transcripts `scripts/run-evals.sh cost-workflow` keeps with --keep-temp. The per-run
// metrics are saved to metrics.json beside aggregate-result.json on first read, so a comparison
// still works after the temporary directories are gone.
// Usage: node scripts/compare-evals.mjs <baseline-dir> <candidate-dir>
//        node scripts/compare-evals.mjs <results-dir>            (summary of one run, no gate)
// A side may list several results directories separated by commas, when its runs were made in more
// than one invocation: node scripts/compare-evals.mjs base-a,base-b cand
// Gate, all required: candidate pass rate ≥ baseline; no partial run or skipped paid grader; no
// grader that passed in every baseline run fails in a candidate run; and the candidate's median
// cost or median latency is below the baseline's lowest run, so the saving is outside the
// baseline's own spread. Exit 0 when the gate passes, 1 when it doesn't, 2 on bad input.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const [baselineArg, candidateArg] = process.argv.slice(2);
if (!baselineArg) {
  console.error('Usage: node scripts/compare-evals.mjs <baseline-dir> [<candidate-dir>]');
  process.exit(2);
}

const readJsonl = (file) =>
  readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

// One session transcript plus its subagents/: assistant lines repeat per content block, so keep
// one entry per message id (the last line carries the final usage) and count each tool_use once.
function transcriptMetrics(sessionFile) {
  const files = [sessionFile];
  const subDir = join(sessionFile.replace(/\.jsonl$/, ''), 'subagents');
  if (existsSync(subDir)) for (const f of readdirSync(subDir)) if (f.endsWith('.jsonl')) files.push(join(subDir, f));
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, apiCalls: 0, toolCalls: 0, subagents: files.length - 1 };
  const models = {};
  for (const file of files) {
    const messages = new Map();
    const tools = new Set();
    for (const line of readJsonl(file)) {
      if (line.type !== 'assistant' || !line.message) continue;
      const id = line.message.id ?? line.uuid;
      messages.set(id, { usage: line.message.usage ?? messages.get(id)?.usage, model: line.message.model ?? messages.get(id)?.model });
      for (const block of Array.isArray(line.message.content) ? line.message.content : []) if (block.type === 'tool_use') tools.add(block.id);
    }
    for (const { usage, model } of messages.values()) {
      if (model === '<synthetic>') continue;
      totals.apiCalls++;
      totals.input += usage?.input_tokens ?? 0;
      totals.output += usage?.output_tokens ?? 0;
      totals.cacheRead += usage?.cache_read_input_tokens ?? 0;
      totals.cacheWrite += usage?.cache_creation_input_tokens ?? 0;
      if (model) models[model] = (models[model] ?? 0) + 1;
    }
    totals.toolCalls += tools.size;
  }
  return { ...totals, models };
}

// tracePath is <run temp dir>/out/trace.jsonl; the run's own Claude config sits beside it.
function sessionFileFor(tracePath) {
  if (!tracePath) return null;
  const projects = join(dirname(dirname(tracePath)), 'config', 'projects');
  if (!existsSync(projects)) return null;
  for (const project of readdirSync(projects)) {
    const dir = join(projects, project);
    const sessions = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f));
    if (sessions.length) return sessions.sort((a, b) => statSync(b).size - statSync(a).size)[0];
  }
  return null;
}

function load(arg) {
  const parts = arg.split(',').filter(Boolean).map(loadOne);
  const unique = (values) => [...new Set(values)].join(', ');
  return {
    label: parts.map((p) => p.label).join(' + '),
    commit: unique(parts.map((p) => p.commit)),
    claude: unique(parts.map((p) => p.claude)),
    plugins: unique(parts.map((p) => p.plugins)),
    partial: parts.some((p) => p.partial),
    runs: parts.flatMap((p, i) => p.runs.map((r) => ({ ...r, key: parts.length > 1 ? `${i + 1}:${r.key}` : r.key }))),
  };
}

function loadOne(arg) {
  const dir = arg.endsWith('.json') ? dirname(arg) : arg;
  const resultFile = join(dir, 'aggregate-result.json');
  if (!existsSync(resultFile)) {
    console.error(`${resultFile} not found`);
    process.exit(2);
  }
  const result = JSON.parse(readFileSync(resultFile, 'utf8'));
  const metricsFile = join(dir, 'metrics.json');
  const saved = existsSync(metricsFile) ? JSON.parse(readFileSync(metricsFile, 'utf8')) : null;
  const runs = [];
  for (const kase of result.cases ?? []) {
    (kase.arms?.with ?? []).forEach((run, i) => {
      const key = `${kase.name}#${i + 1}`;
      let transcript = saved?.runs?.find((r) => r.key === key)?.transcript ?? null;
      if (!transcript) {
        const session = sessionFileFor(run.tracePath);
        transcript = session ? transcriptMetrics(session) : null;
      }
      runs.push({
        key,
        passed: run.passed,
        score: run.score,
        costUsd: run.costUsd,
        durationSeconds: run.durationSeconds,
        turns: run.turns,
        error: run.error,
        skippedPaidGraders: run.skippedPaidGraders,
        failed: (run.graders ?? []).filter((g) => g.scored !== false && !g.passed).map((g) => g.name),
        graders: (run.graders ?? []).filter((g) => g.scored !== false).map((g) => ({ name: g.name, passed: g.passed })),
        transcript,
      });
    });
  }
  if (runs.some((r) => r.transcript)) writeFileSync(metricsFile, `${JSON.stringify({ runs }, null, 2)}\n`);
  const commitFile = join(dir, 'commit.txt');
  return {
    label: basename(dirname(dir)) === 'results' ? basename(dir) : `${basename(dirname(dir))}/${basename(dir)}`,
    // Older runs recorded `git describe` output (<tag>-<n>-g<sha>); keep only the commit.
    commit: existsSync(commitFile) ? readFileSync(commitFile, 'utf8').trim().replace(/^.*-g([0-9a-f]{7,})(-dirty)?$/, '$1$2') : 'unknown',
    claude: result.claudeVersion,
    plugins: (result.suite?.plugins ?? []).map((p) => `${p.name}@${p.version}`).join(', '),
    partial: result.partial,
    runs,
  };
}

const median = (values) => {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
const min = (values) => Math.min(...values.filter((x) => typeof x === 'number'));
const max = (values) => Math.max(...values.filter((x) => typeof x === 'number'));

function summarize(side) {
  const t = (field) => side.runs.map((r) => r.transcript?.[field]).filter((x) => typeof x === 'number');
  const passed = side.runs.filter((r) => r.passed).length;
  const models = {};
  for (const r of side.runs) for (const [m, n] of Object.entries(r.transcript?.models ?? {})) models[m] = (models[m] ?? 0) + n;
  const cost = side.runs.map((r) => r.costUsd);
  const latency = side.runs.map((r) => r.durationSeconds);
  return {
    ...side,
    passed,
    passRate: side.runs.length ? passed / side.runs.length : 0,
    cost: { median: median(cost), min: min(cost), max: max(cost) },
    costPerSuccess: passed ? cost.reduce((a, b) => a + (b ?? 0), 0) / passed : null,
    latency: { median: median(latency), min: min(latency), max: max(latency) },
    tokens: { input: median(t('input')), output: median(t('output')), cacheRead: median(t('cacheRead')), cacheWrite: median(t('cacheWrite')) },
    apiCalls: median(t('apiCalls')),
    toolCalls: median(t('toolCalls')),
    subagents: median(t('subagents')),
    models: Object.entries(models).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} (${n} calls)`).join(', ') || '—',
    errors: side.runs.filter((r) => r.error || !r.passed).map((r) => `${r.key}: ${r.error ?? `failed ${r.failed.join(', ')}`}`),
  };
}

const usd = (x) => (x == null ? '—' : `$${x.toFixed(2)}`);
const sec = (x) => (x == null ? '—' : `${Math.round(x)} s`);
const num = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const pct = (x) => `${Math.round(x * 100)}%`;
const change = (a, b) => (a == null || b == null || a === 0 ? '' : ` (${b >= a ? '+' : ''}${Math.round(((b - a) / a) * 100)}%)`);

const sides = [summarize(load(baselineArg))];
if (candidateArg) sides.push(summarize(load(candidateArg)));

const rows = [
  ['Results', (s) => s.label],
  ['Commit', (s) => `\`${s.commit}\``],
  ['Plugins', (s) => s.plugins],
  ['Claude Code', (s) => s.claude],
  ['Models (API calls)', (s) => s.models],
  ['Runs passed', (s) => `${s.passed}/${s.runs.length} (${pct(s.passRate)})`],
  ['Median cost per run', (s, b) => `${usd(s.cost.median)}${b ? change(b.cost.median, s.cost.median) : ''} (${usd(s.cost.min)}–${usd(s.cost.max)})`],
  ['Cost per successful run', (s, b) => `${usd(s.costPerSuccess)}${b ? change(b.costPerSuccess, s.costPerSuccess) : ''}`],
  ['Median latency', (s, b) => `${sec(s.latency.median)}${b ? change(b.latency.median, s.latency.median) : ''} (${sec(s.latency.min)}–${sec(s.latency.max)})`],
  ['Median input tokens', (s) => num(s.tokens.input)],
  ['Median output tokens', (s, b) => `${num(s.tokens.output)}${b ? change(b.tokens.output, s.tokens.output) : ''}`],
  ['Median cache read tokens', (s, b) => `${num(s.tokens.cacheRead)}${b ? change(b.tokens.cacheRead, s.tokens.cacheRead) : ''}`],
  ['Median cache write tokens', (s, b) => `${num(s.tokens.cacheWrite)}${b ? change(b.tokens.cacheWrite, s.tokens.cacheWrite) : ''}`],
  ['Median API calls', (s) => num(s.apiCalls)],
  ['Median tool calls', (s) => num(s.toolCalls)],
  ['Median subagents', (s) => num(s.subagents)],
  ['Failed runs', (s) => (s.errors.length ? s.errors.join('; ') : 'none')],
];
const header = sides.length === 2 ? ['| Metric | Baseline | Candidate |', '|---|---|---|'] : ['| Metric | Value |', '|---|---|'];
console.log(header.join('\n'));
for (const [name, cell] of rows) console.log(`| ${name} | ${sides.map((s, i) => cell(s, i ? sides[0] : null)).join(' | ')} |`);

if (sides.length === 1) process.exit(0);

const [base, cand] = sides;
const problems = [];
if (base.partial || cand.partial) problems.push('a run is partial (cost ceiling, interruption or auth failure)');
if ([...base.runs, ...cand.runs].some((r) => r.skippedPaidGraders)) problems.push('paid graders were skipped, so scores are not comparable');
if (cand.passRate < base.passRate) problems.push(`pass rate fell from ${pct(base.passRate)} to ${pct(cand.passRate)}`);
const alwaysPassed = new Set(
  (base.runs[0]?.graders ?? []).map((g) => g.name).filter((name) => base.runs.every((r) => r.graders.find((g) => g.name === name)?.passed)),
);
const regressions = [...new Set(cand.runs.flatMap((r) => r.failed.filter((name) => alwaysPassed.has(name))))];
if (regressions.length) problems.push(`graders that passed in every baseline run now fail: ${regressions.join(', ')}`);
const cheaper = cand.cost.median != null && cand.cost.median < base.cost.min;
const faster = cand.latency.median != null && cand.latency.median < base.latency.min;
if (!cheaper && !faster) {
  problems.push(
    `no saving outside the baseline's spread: median cost ${usd(cand.cost.median)} vs baseline ${usd(base.cost.min)}–${usd(base.cost.max)}, ` +
      `median latency ${sec(cand.latency.median)} vs ${sec(base.latency.min)}–${sec(base.latency.max)}`,
  );
}

console.log('');
if (problems.length) {
  console.log(`✘ Quality gate: ${problems.join('; ')}`);
  process.exit(1);
}
console.log(`✔ Quality gate: quality held and the candidate is ${[cheaper && 'cheaper', faster && 'faster'].filter(Boolean).join(' and ')} than every baseline run`);
