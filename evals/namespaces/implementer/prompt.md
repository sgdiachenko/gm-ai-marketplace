---
description: sdd-engineering:implementer is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the sdd-engineering:implementer agent to execute the plan at docs/plans/health.md. Return its report as it is.
