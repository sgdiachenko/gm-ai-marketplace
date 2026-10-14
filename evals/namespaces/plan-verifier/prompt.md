---
description: sdd-engineering:plan-verifier is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the sdd-engineering:plan-verifier agent to verify the work for the plan docs/plans/health.md. Return its reply as it is.
