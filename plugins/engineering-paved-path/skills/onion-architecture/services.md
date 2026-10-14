# Application services (use cases) and the presentation adapter

Ring 3 is where a business operation lives: "place an order", "invite a member", "close an invoice". Ring 4 presentation carries it over HTTP, a queue or a CLI.

## Constructor injection

**A use case declares its dependencies in its constructor, as ports.** That signature is the honest list of what the operation touches.

```ts
// ✔ ring 3 — four ports, zero technology
export class OrderService {
  constructor(
    private orders: OrderStore,
    private payments: PaymentGateway,
    private clock: Clock,
    private jobs: JobQueue,
  ) {}
}
```

```ts
// ✘ a service locator
export class OrderService {
  private store: OrderRepository;
  constructor(private container: Container) {
    this.store = new OrderRepository(container.db); // ring 3 building ring 4
  }
}
```

Four things go wrong in those lines, and all four are why commandment 1 is CRITICAL:

1. **Hidden dependencies.** The signature says "container". Reading the class is the only way to learn it needs payments, the clock and the job queue.
2. **Ring 3 reaches ring 4.** `new OrderRepository(...)` and `container.db` make the use case depend on the database transitively — the thing Onion exists to prevent.
3. **An import cycle.** The container imports the services it builds; the services import `Container`.
4. **Unbounded blast radius in tests.** A unit test must build a whole container instead of passing two fakes.

The rule also covers the sneaky variants:

- `constructor(private container: Container)` with only `container.secrets` used — still a locator. Take `SecretsProvider`.
- `private store: Container['orderStore']` — the type is borrowed from the container, so the cycle survives. Name the port.
- A service reading `container.config` — take the two fields you need as constructor arguments, or a small value object.

### Async ports

Some dependencies resolve asynchronously, for example a client that needs a secret first. Do not leak that into ring 3. Inject a resolver port instead:

```ts
// ring 2
export interface LLMProviderResolver {
  resolve(id: 'openai' | 'anthropic'): Promise<LLMProvider>;
}
```

The use case takes the resolver; the container's method *is* the implementation. The service never learns where the secret lives.

## What belongs in a use case

**Yes:** orchestration order, authorization and tenancy checks, domain rules that span ports, mapping domain errors, emitting progress events, deciding what to persist.

**No:** SQL, HTTP status codes, response shaping for one client, SDK calls, `process.env`, `new` on anything infrastructural.

A use case method takes and returns domain types:

```ts
async place(tenantId: string, customerId: string, lines: OrderLine[]): Promise<{ order: Order; created: boolean }>
```

`tenantId` arrives as an **argument**, resolved by the route. A service that resolves the tenant from a request itself is coupled to HTTP and can never run from a job or a CLI.

## Errors

Throw from the domain error taxonomy — `NotFoundError`, `ValidationError`, `ExternalServiceError`, `ConfigError`, or a base `AppError` with an explicit code. Never return an HTTP status, never build error JSON. One shared error handler turns an `AppError` into the response shape with the right status; anything else becomes a 500.

An adapter translates *its* failures into that taxonomy at its own boundary: a 404 from an SDK becomes `NotFoundError`, a timeout becomes `ExternalServiceError`. Ring 3 must never `instanceof` an SDK error class.

## Routes are adapters

A route does exactly four things: declare input/output schemas, resolve request context, call one service method, map the status code.

```ts
export default async function orderRoutes(app: FastifyInstance) {
  const service = app.container.orderService; // built by the root

  app.post('/orders', { schema: { body: OrderInput } }, async (req, reply) => {
    const { tenantId, userId } = await requestContext(req);
    const { order, created } = await service.place(tenantId, userId, req.body.lines);
    reply.status(created ? 201 : 200);
    return order;
  });
}
```

Rules:

- **Every route declares its schemas** so invalid input is rejected before the handler runs. Never hand-roll `Schema.parse(req.body)` inside the handler.
- **No database client, no ORM, no table imports.**
- **No adapters.** A route that needs a payment provider calls a service that injects `PaymentGateway`.
- **No business rules.** The test for "is this a rule?": would a job runner or a CLI need it too?
- Framework specifics — hooks, plugin encapsulation, serialization: `engineering-paved-path:fastify-best-practices`.

### A module with no logic

A single list read does not need a service — but it does need to stop querying in the handler. Inject the store and call it:

```ts
const projects = app.container.projectStore;
app.get('/projects', async (req) => projects.listForTenant((await requestContext(req)).tenantId));
```

Adding a service here would be ceremony. Adding a repository is the minimum that keeps the ring boundary real.

## Long-running work and streaming

When an operation streams progress rather than returning once, keep the split:

- The **use case** emits domain events to an injected event-sink port — it does not know what SSE or WebSockets are.
- The transport (an SSE bus, a WebSocket hub) and the route own the wire format.
- The **job runner** is an adapter too: the service registers a handler and receives typed payloads; the runner owns polling, timeouts and retries.

That is what lets the same use case run behind HTTP, a queue worker or a CLI with no changes.

## Testing a use case

Construct it with fakes and assert on behavior:

```ts
const service = new OrderService(
  new InMemoryOrderStore(),
  new FakePaymentGateway({ approve: true }),
  new FixedClock('2026-01-01T00:00:00Z'),
  new FakeJobQueue(),
);
```

No container, no database. If a test for a use case needs a running database, a ring boundary is wrong — that is the signal, and a more reliable one than reading the imports. Per-ring test strategy: [container.md](container.md#testing-per-ring).
