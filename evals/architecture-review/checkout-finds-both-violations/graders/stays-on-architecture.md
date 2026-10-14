---
type: llm
---

Look only at the `summary` of each finding in the review's Findings list.

FAIL only if some finding's main subject is one of: naming or wording, code style or formatting, missing or weak tests, performance, or a runtime bug such as an unused variable that has nothing to do with which ring code belongs in.

Everything about rings, dependency direction, imports between rings, ports and interfaces, dependency injection, the composition root, or moving code to another ring is on-topic — including a finding that the repository implements no port, and a finding that the pure `priceOrder` calculation belongs in the core ring.

PASS if no finding falls in the FAIL list.
