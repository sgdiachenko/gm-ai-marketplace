---
description: Finds the framework import in a domain type and the concrete repository built inside a service
tags: [architecture-review]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/architecture-review"]
allowed_tools: [Agent, Read, Glob, Grep, Skill]
runs: 3
max_turns: 30
timeout_seconds: 600
---

Use the architecture-review:architecture-reviewer agent on the diff below and show me its review exactly as the agent returned it, without rewording, summarising or adding your own corrections.

Environment notes for the agent: the diff is the complete scope and its files are not on disk, so review the diff text itself. There is no project profile and no project documentation, so the default rules are the engineering-paved-path onion-architecture skill, with this layout: src/domain = ring 0, src/core = ring 1, src/ports and src/modules/<name>/ports.ts = ring 2, src/modules/<name>/service.ts = ring 3, src/modules/<name>/repository.ts and src/adapters = ring 4, src/platform = ring 5. List the mechanical checks as not run.

```diff
diff --git a/src/domain/checkout.ts b/src/domain/checkout.ts
new file mode 100644
--- /dev/null
+++ b/src/domain/checkout.ts
@@ -0,0 +1,12 @@
+import { z } from 'zod';
+import type { FastifyReply } from 'fastify';
+
+export const CheckoutOrder = z.object({
+  id: z.string(),
+  total: z.number(),
+});
+export type CheckoutOrder = z.infer<typeof CheckoutOrder>;
+
+export function priceOrder(order: CheckoutOrder, reply?: FastifyReply): number {
+  return order.total;
+}
diff --git a/src/modules/checkout/repository.ts b/src/modules/checkout/repository.ts
new file mode 100644
--- /dev/null
+++ b/src/modules/checkout/repository.ts
@@ -0,0 +1,5 @@
+export class PgCheckoutRepository {
+  async save(orderId: string, price: number): Promise<void> {
+    void [orderId, price];
+  }
+}
diff --git a/src/modules/checkout/service.ts b/src/modules/checkout/service.ts
new file mode 100644
--- /dev/null
+++ b/src/modules/checkout/service.ts
@@ -0,0 +1,12 @@
+import { priceOrder, type CheckoutOrder } from '../../domain/checkout.js';
+import { PgCheckoutRepository } from './repository.js';
+
+export class CheckoutService {
+  private readonly repo = new PgCheckoutRepository();
+
+  async checkout(order: CheckoutOrder) {
+    const price = priceOrder(order);
+    await this.repo.save(order.id, price);
+    return { price };
+  }
+}
```
