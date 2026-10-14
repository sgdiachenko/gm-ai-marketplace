---
description: spec-creator in analyze mode returns numbered questions and writes no file
tags: [sdd-engineering]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 2
max_turns: 30
timeout_seconds: 600
---

Use the sdd-engineering:spec-creator agent in analyze mode. Request: team admins can invite members by email; an invitation expires after 7 days. Designs: none. Show me its questions exactly as it returns them.
