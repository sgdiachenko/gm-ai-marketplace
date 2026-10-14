---
name: onion-architecture
description: "Backend architecture: which ring a file belongs to and which import is allowed (domain, core, ports, use cases, adapters, composition root). Use when adding a route, service, repository, adapter, port or DI wiring, or reviewing backend layering. Trigger terms: onion, clean architecture, hexagonal, ports and adapters."
metadata:
  tags: architecture, onion, clean-architecture, ports-and-adapters, ddd, typescript, backend
---

# Onion Architecture (backend)

This skill answers two questions about backend code, and only these two:

1. **Which ring does this code belong to?**
2. **Is this import allowed?**

How to write a Fastify route belongs to `engineering-paved-path:fastify-best-practices`; where frontend files go belongs to `engineering-paved-path:frontend-architecture`. Do not restate their rules here.

## Project rules win

A project's own `AGENTS.md` / `CLAUDE.md`, its architecture docs or ADRs, and its dependency-linter config win over every default here. This skill uses a reference layout (below); map it to the project's real folders before judging an import. When the project names its rings differently, use its names.

## Severity Levels

- **CRITICAL** — inverts the dependency rule; the core rots into framework code and stops being testable
- **HIGH** — couples a ring to a technology choice, making the technology unswappable
- **MEDIUM** — hurts navigability; the ring is right but the file is in the wrong place

---

## The One Rule (CRITICAL)

**All coupling points toward the center. Code may depend on a more central ring; it may never depend on a ring further out.**

> "All code can depend on layers more central, but code cannot depend on layers
> further out from the core. In other words, all coupling is toward the center."
> — Jeffrey Palermo, [The Onion Architecture part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)

Three corollaries:

- **The database is not the center. It is external.** The database, the ORM and the table definitions are outer-ring detail. The core does not know they exist.
- **Inner rings declare interfaces; outer rings implement them.** A port is named for the capability the core wants (`PaymentGateway`), never for the library that satisfies it (`StripeClient`).
- **Dependency inversion is the mechanism.** When a use case needs the network, it does not import an SDK — it takes a ring-2 interface in its constructor, and the composition root passes the SDK-backed implementation.

## The Ring Map

```
            ┌──────────────────────────────────────────────────┐
            │  5  composition root — container, config, main   │
            │  ┌────────────────────────────────────────────┐  │
            │  │  4  adapters + presentation                │  │
            │  │     routes · repositories · SDK adapters   │  │
            │  │  ┌──────────────────────────────────────┐  │  │
            │  │  │  3  application services (use cases) │  │  │
            │  │  │  ┌────────────────────────────────┐  │  │  │
            │  │  │  │  2  ports (interfaces)         │  │  │  │
            │  │  │  │  ┌──────────────────────────┐  │  │  │  │
            │  │  │  │  │ 1 domain services (pure) │  │  │  │  │
            │  │  │  │  │  ┌────────────────────┐  │  │  │  │  │
            │  │  │  │  │  │ 0 domain model     │  │  │  │  │  │
            │  │  │  │  │  └────────────────────┘  │  │  │  │  │
            │  │  │  │  └──────────────────────────┘  │  │  │  │
            │  │  │  └────────────────────────────────┘  │  │  │
            │  │  └──────────────────────────────────────┘  │  │
            │  └────────────────────────────────────────────┘  │
            └──────────────────────────────────────────────────┘
                        every arrow points inward
```

### Reference layout

```
src/
├── domain/                  ring 0  entities, value objects, contracts (e.g. Zod schemas), error taxonomy
├── core/                    ring 1  pure domain services: calculations, policies, no I/O
├── ports/                   ring 2  interfaces for outside capabilities (PaymentGateway, Clock, Mailer)
├── modules/<name>/
│   ├── ports.ts             ring 2  the module's repository port
│   ├── service.ts           ring 3  use cases
│   ├── repository.ts        ring 4  persistence adapter, the only file that knows the tables
│   └── routes.ts            ring 4  presentation adapter (HTTP)
├── adapters/<capability>/   ring 4  SDK-backed implementations of ports; adapters/mocks.ts for tests
└── platform/                ring 5  container.ts, config.ts, app.ts, main.ts
```

| Ring | Reference home | May import | Must never import |
|---|---|---|---|
| 0 — Domain model | `domain/**` | its schema library (e.g. `zod`), itself | anything else |
| 1 — Domain services | `core/**` | ring 0, ports | web framework, ORM, SDKs, `node:fs`, `process.env` |
| 2 — Ports | `ports/**`, `modules/<name>/ports.ts` | ring 0 | any implementation |
| 3 — Use cases | `modules/<name>/service.ts` and its pure helpers | rings 0–2 | ORM, tables, web framework, concrete adapters, the container |
| 4 — Adapters | `adapters/**`, `modules/<name>/repository.ts` | rings 0–2 | use cases, routes |
| 4 — Presentation | `modules/<name>/routes.ts` | ring 3 + ring 0 contracts | ORM, tables, adapters |
| 5 — Composition root | `platform/container.ts`, `app.ts`, `main.ts` | everything | (nothing imports it) |

Full allowed/forbidden matrix and how to classify a mixed folder: [layers.md](layers.md).

## Where Does This Go?

| I am adding… | Ring | Home |
|---|---|---|
| A field on a wire contract or a domain type | 0 | `domain/<concept>.ts` |
| A pure calculation (pricing, validation, scoring) | 1 | `core/` — no I/O, no injected clients |
| A new outside-world capability the core needs | 2 | an interface in `ports/` → [ports.md](ports.md) |
| Persistence for a new entity | 2 + 4 | port in `modules/<name>/ports.ts`, class in `modules/<name>/repository.ts` |
| Orchestration of several ports (a use case) | 3 | `modules/<name>/service.ts` → [services.md](services.md) |
| An HTTP endpoint | 4 | `modules/<name>/routes.ts` — schemas + one service call |
| A third-party SDK call | 4 | `adapters/<capability>/<library>.ts`, behind a ring-2 port |
| The decision which implementation to use | 5 | `platform/container.ts` → [container.md](container.md) |
| A secret or an env var read | 4/5 | one secrets adapter and `platform/config.ts` — nowhere else |
| A test double | 4 | `adapters/mocks.ts`, implementing the port |

## The Five Commandments

Most are machine-checkable — see [enforcement.md](enforcement.md).

1. **A service takes ports, not the container (CRITICAL).** `constructor(private container: Container)` is a service locator: the use case can reach anything, its real dependencies are invisible in its signature, and it creates an import cycle with the composition root. Take the two or three ports you actually use. → [services.md](services.md#constructor-injection)
2. **Only the repository names persistence (CRITICAL).** Inside a module, no service, helper or pipeline step imports the ORM, the table definitions or the database client. Persistence is reached through a repository **port**. → [ports.md](ports.md#repository-ports)
3. **A row never crosses a ring boundary (HIGH).** An ORM-inferred row type is the shape of a table, not of a business concept. Repositories map row → domain type at the boundary, and map database errors to domain errors there too. → [ports.md](ports.md#rowdomain-mapping)
4. **A route is a transport adapter (HIGH).** Parse input with a schema, call one service method, map the status code. No SQL, no SDKs, no business rules, no hand-rolled error JSON. → [services.md](services.md#routes-are-adapters)
5. **Only the composition root says `new` on a concrete adapter (HIGH).** Everything else receives it. Test wiring is the same rule with a different implementation. → [container.md](container.md)

## Anti-Patterns (CRITICAL unless noted)

- **`import { db } from '../../db/client'` in a service or route.** The classic inversion: the outermost detail becomes the most-depended-on module.
- **Service locator in a constructor** (`container: Container`). Hides dependencies and produces a `service → container → service` cycle.
- **A port interface declared inside its own adapter file.** Inner code must then reach *outward* just to name the type it depends on. The interface belongs inward, the class outward. → [ports.md](ports.md#where-a-port-lives)
- **A port named after its library** (`StripeClient`, `PrismaStore`). If the name changes when you swap the vendor, the abstraction bought you nothing.
- **Business rules in a route.** Not reusable by a job runner, a CLI or a queue consumer; testable only through HTTP.
- **An adapter importing a module.** Outward code reaching inward welds the adapter to one feature; pass the value in as a parameter instead.
- **Pure logic filed under `adapters/` (MEDIUM).** A parser with no I/O is domain logic that happens to live in the infrastructure folder. Purity, not subject matter, decides the ring.
- **A second module's internals imported directly (HIGH).** Modules share through root-provided repositories or ports, never by importing `../other/service`. Shared *constants* are fine.
- **Mapping skipped "for now" (MEDIUM).** Returning raw rows is how a column rename becomes an API break.

## Review Checklist

Check in this order; the first two are blocking:

1. Does any import point outward? Run the project's architecture check (for example `depcruise` with the config in [enforcement.md](enforcement.md)). (blocking)
2. Does a service constructor list ports, or does it take the container or the database client? (blocking)
3. Is the pure core still free of framework, database and `process.env`?
4. Does every repository method return a domain type rather than an ORM row?
5. Is the route thin — schema, one service call, status code, nothing else?
6. Is a new interface declared in a ring at least as central as its consumers?
7. Is a new concrete adapter `new`-ed only in the composition root, with a mock counterpart for tests?
8. Does new code read `process.env` outside the config and secrets chokepoints?
9. Is anything shared between two modules imported sideways instead of coming from the root?

## When NOT To Apply This

Onion pays for itself in long-lived code with real behavior; it is overhead everywhere else. Do not add rings to:

- **Seed scripts, migrations and one-shot operational scripts.** They may talk to the ORM and `process.env` directly.
- **A module that is a pure read-through.** It still must not query in the route, but it needs a repository, not a repository *and* a service *and* a use-case type.
- **A port with exactly one implementation and no test-double need.** Inject the function instead of minting an interface.

Palermo's own caveat: the pattern "is not appropriate for small websites" but is appropriate for "long-lived business applications as well as applications with complex behavior".

## Detail References

- [layers.md](layers.md) — the full import matrix, classifying a mixed folder, diagnosing a violation
- [ports.md](ports.md) — defining a port, repository ports, row→domain mapping, transactions / unit of work
- [services.md](services.md) — writing a use case with explicit ports, error taxonomy, thin routes, long-running work
- [container.md](container.md) — the composition root, lazy adapter resolution, test wiring per ring
- [enforcement.md](enforcement.md) — dependency-cruiser rules, baseline, CI
- [assets/dependency-cruiser.layers.cjs](assets/dependency-cruiser.layers.cjs) — a config for the reference layout, to adapt

## Sources

- Jeffrey Palermo — [The Onion Architecture](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
- Alistair Cockburn — [Hexagonal architecture](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- Mark Seemann — [Layers, Onions, Ports, Adapters: it's all the same](https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/)
- Neal Ford et al. — [Building Evolutionary Architectures, fitness functions](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/ch02.html)
- [dependency-cruiser rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
