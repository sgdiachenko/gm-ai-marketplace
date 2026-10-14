---
description: a small edit that needs no spec or plan does not start any sdd-engineering agent or skill
tags: [sdd-engineering]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep, Skill]
runs: 2
max_turns: 10
timeout_seconds: 300
---

Rename the variable `cnt` to `count` in this function and show me the result:

```js
function total(items) {
  let cnt = 0;
  for (const item of items) cnt += item.qty;
  return cnt;
}
```
