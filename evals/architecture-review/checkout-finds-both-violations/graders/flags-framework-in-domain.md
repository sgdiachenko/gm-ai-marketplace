---
type: llm
---

PASS if the review reports `import type { FastifyReply } from 'fastify'` in src/domain/checkout.ts as a CRITICAL or WARNING violation because the domain ring must not depend on a web framework.
FAIL if this import is not reported, or is reported only as a SUGGESTION.
