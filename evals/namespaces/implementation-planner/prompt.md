---
description: sdd-engineering:implementation-planner is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the sdd-engineering:implementation-planner agent, pass 1, for this task: add a GET /health endpoint that returns {"status":"ok"}. There is no spec; the task description is the requirement. Return its pass-1 block.
