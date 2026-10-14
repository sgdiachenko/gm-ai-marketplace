---
description: sdd-engineering:spec-creator is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the sdd-engineering:spec-creator agent in analyze mode. Request: customers can download their invoices as a CSV file. Designs: none. Return its questions; don't run any other agent.
