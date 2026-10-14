---
description: architecture-review:architecture-reviewer is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the architecture-review:architecture-reviewer agent to review the diff below. The diff is the complete scope; its files are not on disk.

```diff
diff --git a/src/modules/reports/score.ts b/src/modules/reports/score.ts
--- a/src/modules/reports/score.ts
+++ b/src/modules/reports/score.ts
@@ -1,4 +1,4 @@
 export function summarize(rows: { id: string; score: number }[]) {
-  return rows.map((r) => ({ id: r.id, score: r.score }));
+  return rows.map((row) => ({ id: row.id, score: row.score }));
 }
```
