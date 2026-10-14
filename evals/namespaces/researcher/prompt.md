---
description: research-tools:researcher is reachable by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

Use the research-tools:researcher agent to answer this question about the current workspace: does it contain a package.json file? Scope: repo. Expected answer: yes or no with evidence.
