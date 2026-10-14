# Ports — the interfaces the core owns

A **port** is an interface declared in an inner ring and implemented in an outer one. It is how ring 1 and ring 3 reach the outside world without depending on it.

## Where a port lives

**The interface goes inward, the class goes outward.** Always.

```
src/ports/payment-gateway.ts           ← interface PaymentGateway      (ring 2)
src/adapters/payments/stripe.ts        ← class StripePaymentGateway    (ring 4)
src/adapters/mocks.ts                  ← class FakePaymentGateway      (ring 4)
```

A port declared inside its adapter file (`adapters/tokenizer/index.ts` exporting both `interface Tokenizer` and the class) forces every consumer to import *outward* just to name the type. The fix is a move, not a rewrite: the interface goes to `ports/`, the class stays where it is.

## Naming (HIGH)

Name a port for the **capability the core wants**, not for the technology that happens to provide it:

| Good | Bad | Why |
|---|---|---|
| `PaymentGateway` | `StripeClient` | survives swapping Stripe |
| `LLMProvider` | `OpenAIClient` | one interface, several providers |
| `CodeSearch` | `RipgrepSearcher` | the core wants search, not ripgrep |
| `SecretsProvider` | `SecretsFileReader` | file today, keychain tomorrow |

If renaming the vendor forces renaming the interface, the interface is not an abstraction — it is a passthrough.

Keep the port **narrow**: the methods the core actually calls, in the core's vocabulary. A port that mirrors an SDK's full surface is a leaky abstraction wearing an interface.

## Repository ports

A repository is an adapter like any other, so the same split applies.

```ts
// src/modules/orders/ports.ts — ring 2. Domain types in, domain types out.
import type { Order } from '../../domain/order';

export interface NewOrder {
  tenantId: string;
  customerId: string;
  lines: { sku: string; quantity: number }[];
}

export interface OrderStore {
  getById(tenantId: string, id: string): Promise<Order | undefined>;
  listByCustomer(tenantId: string, customerId: string): Promise<Order[]>;
  insert(values: NewOrder): Promise<Order>;
  cancel(tenantId: string, id: string): Promise<boolean>;
}
```

```ts
// src/modules/orders/repository.ts — ring 4. The only file that knows the table.
import { and, eq } from 'drizzle-orm';
import type { Order } from '../../domain/order';
import type { Db } from '../../db/client';
import * as t from '../../db/schema';
import type { NewOrder, OrderStore } from './ports';
import { toOrder } from './mapper';

export class SqlOrderStore implements OrderStore {
  constructor(private db: Db) {}

  async listByCustomer(tenantId: string, customerId: string): Promise<Order[]> {
    const rows = await this.db
      .select()
      .from(t.orders)
      .where(and(eq(t.orders.tenantId, tenantId), eq(t.orders.customerId, customerId)));
    return rows.map(toOrder); // ← the boundary
  }
}
```

Every query stays tenant-scoped, and `repository.ts` stays the only file that touches the table. What the port changes is the **direction** of the dependency and the **type** that crosses it.

## Row→domain mapping

An ORM row is the shape of a table. A domain type is the shape of a business concept. They drift, and when a handler returns a row the API breaks the moment a column is renamed. Typed query builders don't map entities for you, so the discipline is yours.

1. **ORM-inferred row types never appear in a ring-2 or ring-3 signature.** Keep them inside `repository.ts`.
2. **One mapper per entity**, next to the repository (`mapper.ts`): column names → contract field names, `Date` → ISO string, nullable columns → explicit optional fields.
3. **Map errors at the same boundary.** A unique-violation becomes a `ValidationError`; a missing row becomes `undefined`, and the service decides whether that is a `NotFoundError`. A raw database error code must not reach ring 3.

### Shared row types

A shared `db/rows.ts` that exports row types for several modules solves a real cross-module problem by making the *table* shape the shared vocabulary. The onion-consistent resolution: promote the *concepts* those rows stand for to ring 0, keep row types a ring-4 convenience for repositories only, and have ring 3 name the domain type.

## Transactions and unit of work

Two operations that must commit together cannot each own a connection. But the service must not hold the database client either. Put the transaction **inside the port**, in the core's vocabulary:

```ts
// ring 2
export interface OrderStore {
  /** Persist an order and its reservation atomically. */
  placeWithReservation(order: NewOrder, reservation: NewReservation): Promise<Order>;
}
```

The repository opens the transaction and threads it to its own private helpers. The use case calls one method and stays ignorant of the transaction.

When a use case genuinely must span **several** repositories atomically, introduce a narrow unit-of-work port rather than handing out the database:

```ts
// ring 2
export interface UnitOfWork {
  run<T>(fn: (stores: { orders: OrderStore; stock: StockStore }) => Promise<T>): Promise<T>;
}
```

```ts
// ring 4 — one transaction, stores rebound onto it
export class SqlUnitOfWork implements UnitOfWork {
  constructor(private db: Db) {}
  run<T>(fn: (stores: { orders: OrderStore; stock: StockStore }) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn({ orders: new SqlOrderStore(tx), stock: new SqlStockStore(tx) }));
  }
}
```

Each store accepts either the client or a transaction, so the same class works inside and outside a transaction.

## When you do not need a port (MEDIUM)

A port earns its keep when it buys a swap, a test double, or a boundary the core must not cross. It costs a file and an indirection. Skip it when:

- The dependency is a **pure function** with no I/O. Import it directly; better, move it inward where pure logic belongs.
- There is **one** implementation, **no** test-double need, and the call is already behind a repository.
- It would be a **one-method passthrough to another port** you already inject.

Do not invert this into "repositories are always over-engineering": with a real database, tenancy scoping and fake-driven service tests in play, the repository port is the cheapest of the three. Make the decision deliberately.
