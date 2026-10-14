---
type: llm
---

PASS if the review does all of the following:
- flags `import type { FastifyReply } from 'fastify'` in src/domain/checkout.ts as a violation, because the domain ring must not depend on a web framework;
- flags `new PgCheckoutRepository()` in src/modules/checkout/service.ts as a violation, because only the composition root creates concrete adapters and a service receives a port;
- rates neither of those two findings SUGGESTION;
- quotes the offending changed line verbatim for each finding;
- ends with the verdict `request_changes`.
FAIL if any of these is missing, or if it reports unrelated findings about naming, style, test coverage or folder structure.
