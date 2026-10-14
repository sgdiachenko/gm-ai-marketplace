---
type: tool_order
before:
  tool: Agent
  input_match: '"subagent_type"\s*:\s*"sdd-engineering:spec-creator"'
after:
  tool: Agent
  input_match: '"subagent_type"\s*:\s*"sdd-engineering:implementation-planner"'
---
