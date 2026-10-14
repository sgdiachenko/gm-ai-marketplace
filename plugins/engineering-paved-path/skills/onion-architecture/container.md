# The composition root

`platform/container.ts` (with `app.ts` / `main.ts`) is ring 5: **the one place that knows which concrete class backs which port.** It may import everything precisely because nothing imports it.

## What the root is for

- Decide the implementation per port (real vs fake, one provider vs another).
- Own construction order and lifetime (singleton per app instance, lazy where a secret must be resolved first).
- Build the use cases and hand them their ports.

Everything else asks for what it needs and receives it. Commandment 5: **only the root says `new` on a concrete adapter.**

## Lazy resolution is fine; leaking it is not

Lazy getters are good design: an app that never charges a card never constructs a payment client.

```ts
get payments(): PaymentGateway {
  if (this.overrides.payments) return this.overrides.payments;
  this._payments ??= new StripePaymentGateway(this.config.stripe);
  return this._payments;
}
```

Keep that. What must not leak outward is the *container itself*: services take ports, not `Container` ([services.md](services.md#constructor-injection)). The root's job is to resolve, then hand over.

## Building use cases in the root

Routes don't construct services. The root builds them once and the route reads them:

```ts
// platform/container.ts
get orderService(): OrderService {
  return (this._orderService ??= new OrderService(
    new SqlOrderStore(this.db),
    this.payments,
    this.clock,
    this.jobs,
  ));
}
```

```ts
// modules/orders/routes.ts
const service = app.container.orderService;
```

This is also what breaks the `service → container → service` cycle: the arrow now points one way.

## Why the root may import modules

`container.ts` importing repositories and services from several modules looks like a layer violation and is not — it is the root's whole purpose. It is safe for the same reason it must stay *only* here: the moment one module imports another module's repository directly, the root is no longer the only broker and two features are welded together. Cross-module sharing goes through a root-owned instance.

A root-owned *service* that itself takes `Container` re-creates the cycle. Give it ports like any other use case.

## Secrets and config

Two chokepoints, and no third:

- **One secrets adapter** — the only module that reads secrets, from wherever the project keeps them (environment, a key file, a vault).
- **`platform/config.ts`** — the only module that reads `process.env` for configuration, producing a typed config object.

Everything else receives `SecretsProvider` or the config object. Seed and migration scripts are the usual documented exceptions. `process.env` is not an import, so a dependency linter cannot see it — it is checklist item 8 and a grep in [enforcement.md](enforcement.md).

When a stored secret changes, invalidate cached clients built from it; otherwise they keep the old credential.

## Testing per ring

Each ring has one natural test style. If a test needs machinery from a further-out ring, the boundary is wrong.

| Ring | Style | Needs |
|---|---|---|
| 0 domain | parse or round-trip a schema; construct value objects | nothing |
| 1 domain services | call the function with literal inputs; inject stubs for any port | nothing — no keys, no network |
| 2 ports | none (interfaces have no behavior) | — |
| 3 use cases | construct with fakes; assert behavior and port calls | nothing |
| 4 adapters (database) | a real database, e.g. via testcontainers | Docker or a test database |
| 4 adapters (SDK) | pin the HTTP layer or replay a recorded fixture | nothing |
| 4 routes | inject requests into the app wired with fakes | nothing |
| 5 root | boot the app with all-fake overrides, assert wiring | nothing |

Keep database-backed tests distinguishable by name or folder (for example `*.it.test.ts`) so the fast suite and the integration suite split cleanly in CI.

The container's `overrides` is the seam:

```ts
const container = new Container(config, db, {
  payments: new FakePaymentGateway({ approve: false }),
  clock: new FixedClock('2026-01-01T00:00:00Z'),
});
```

`overrides` exists for tests; production wiring never passes it. If a test needs a fake that the overrides type cannot express, add the port to the overrides type — do not reach around the container.
