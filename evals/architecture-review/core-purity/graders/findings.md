---
type: llm
---

PASS if the review flags `import { readFileSync } from 'node:fs'` (and the read in priceWithDiscount) in src/core/pricing.ts as a violation because the core ring is pure and must receive data or a port instead of reading the filesystem, quotes the changed line verbatim, rates it CRITICAL or WARNING, and ends with `request_changes` or `comment` consistent with its own severities (any CRITICAL → request_changes).
FAIL otherwise.
