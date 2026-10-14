---
description: Approves a behaviour-preserving rename without inventing violations
tags: [architecture-review]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/architecture-review"]
allowed_tools: [Agent, Read, Glob, Grep, Skill]
runs: 3
max_turns: 30
timeout_seconds: 600
---

Use the architecture-review:architecture-reviewer agent on the diff below and show me its review.

Environment notes for the agent: the diff is the complete scope and its files are not on disk, so review the diff text itself. There is no project profile and no project documentation, so the default rules are the engineering-paved-path onion-architecture skill, with this layout: src/domain = ring 0, src/core = ring 1, src/ports = ring 2, src/modules/<name>/service.ts = ring 3, src/modules/<name>/repository.ts and src/adapters = ring 4, src/platform = ring 5. List the mechanical checks as not run.

```diff
diff --git a/src/modules/reports/score.ts b/src/modules/reports/score.ts
--- a/src/modules/reports/score.ts
+++ b/src/modules/reports/score.ts
@@ -1,10 +1,11 @@
 export interface ScoreRow {
   id: string;
   score: number;
 }

-export function summarize(rows: ScoreRow[]) {
-  return rows.map((r) => ({ id: r.id, score: r.score }));
+// Renamed locals for readability; behaviour unchanged.
+export function summarize(rows: ScoreRow[]) {
+  return rows.map((row) => ({ id: row.id, score: row.score }));
 }
```
