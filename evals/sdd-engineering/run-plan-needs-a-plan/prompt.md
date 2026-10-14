---
description: /run-plan stops and points to the planner when no plan exists
tags: [sdd-engineering]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Read, Glob, Grep, Skill, Agent]
runs: 2
max_turns: 20
timeout_seconds: 600
---

/sdd-engineering:run-plan order-cancel
