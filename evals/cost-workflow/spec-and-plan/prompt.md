---
description: the fixed cost scenario — the user asks for a spec and a plan for a small feature; spec-creator analyze, write and approve (at most one revise), then implementation-planner pass 1 and pass 2
tags: [cost-workflow]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep, Write, Edit]
runs: 3
max_turns: 60
timeout_seconds: 2400
---

Prepare a spec and an implementation plan for a small feature in this repository with the Spec-Driven Development flow. I'm not available to answer questions: wherever the flow needs my answer, use the rules below and don't stop to ask. Keep the feature as small as the request: don't add scope I didn't ask for.

Feature request: on the words page, a user can add a word with its translation, and the new entry appears at the top of a list below the form. The list is kept only while the page is open; after a reload it is empty. Designs: none.

1. Use sdd-engineering:spec-creator in analyze mode with this request.
2. For each research request RQ#, run research-tools:researcher once with that question.
3. Answer every Q# yourself with the option that keeps the scope smallest. Reject every UX# proposal. Accept an EC# only when the feature would be wrong without it.
4. Use sdd-engineering:spec-creator in write mode with the request, the research and your answers.
5. Use sdd-engineering:spec-creator in approve mode: the user approved the spec it wrote. If it refuses, run revise once with answers to what it lists, using the same rules, then approve again. Don't run more than two approve passes.
6. Use sdd-engineering:implementation-planner, pass 1, with the approved spec's path, and save its report, unchanged, to docs/plans/words-list.pass1.md.
7. Accept every REC#, and choose Mode: single-agent.
8. Use sdd-engineering:implementation-planner, pass 2, with the same spec, the path of the pass-1 report, your decisions and the mode.
9. Save the plan pass 2 returned, unchanged, to docs/plans/words-list.md.

Then read the spec file and reply with exactly these five lines and nothing else:

SPEC: <spec path>
SPEC STATUS: <the value of the spec's Status line>
AC LINES: <number of acceptance-criteria lines, AC-n, in the spec>
PLAN: docs/plans/words-list.md
PLAN STEPS: <number of steps in the plan>
