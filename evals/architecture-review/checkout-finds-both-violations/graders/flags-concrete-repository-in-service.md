---
type: llm
---

PASS if the review reports `new PgCheckoutRepository()` (or the import of the concrete PgCheckoutRepository) in src/modules/checkout/service.ts as a CRITICAL or WARNING violation because a use case must receive a port and only the composition root creates concrete adapters.
FAIL if neither the import nor the `new` is reported, or they are reported only as a SUGGESTION.
