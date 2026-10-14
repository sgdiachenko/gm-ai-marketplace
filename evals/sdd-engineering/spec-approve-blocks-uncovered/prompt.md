---
description: spec-creator refuses to approve a spec whose must story has no acceptance criterion, even with the user's approval, and names the story in a Coverage line
tags: [sdd-engineering]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Agent, Read, Glob, Grep]
runs: 2
max_turns: 20
timeout_seconds: 900
---

I approve spec 2026-10-01-team-invites. Use sdd-engineering:spec-creator in approve mode with Spec: docs/specs/2026-10-01-team-invites.md and tell it I explicitly approved it. Show me its report exactly as it returns it. Then read the spec file and add one last line: SPEC STATUS: <the value of its Status line>
