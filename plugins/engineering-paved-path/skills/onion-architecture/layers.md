# Layers — the full import matrix

Reference for "is this import allowed?". Paths use the reference layout from [SKILL.md](SKILL.md); map them to the project's folders first. The regexes in [enforcement.md](enforcement.md) encode the same matrix.

## Ring assignment

| Path (reference layout) | Ring | Why |
|---|---|---|
| `src/domain/**` | 0 | entities, value objects, wire contracts, the error taxonomy |
| `src/core/**` | 1 | pure domain services: no I/O, no clock, no randomness unless injected |
| `src/ports/**`, `src/modules/<n>/ports.ts` | 2 | interfaces for outside capabilities and persistence |
| `src/modules/<n>/service.ts` | 3 | use cases |
| `src/modules/<n>/helpers.ts`, `constants.ts` | 3 | pure transforms and literals owned by the use case |
| `src/modules/<n>/repository.ts` | 4 | persistence adapter |
| `src/modules/<n>/routes.ts` | 4 | presentation adapter |
| `src/adapters/**` | 4 | implementations of ring-2 ports |
| `src/db/**` | 4 | schema, client, migrations |
| `src/platform/container.ts`, `app.ts`, `main.ts`, `config.ts` | 5 | composition root and configuration |

### A mixed folder is not one ring

Folders such as `platform/`, `lib/` or `utils/` collect files of several rings. Classify each file by what it depends on, not by the folder:

| Typical file | Ring | Note |
|---|---|---|
| `errors.ts` | 0 | the error taxonomy is domain vocabulary — every ring may import it |
| `config.ts` | 5 | reads `process.env`; produces a config object that others receive |
| retry/backoff helpers, formatters, pure calculators | 1 | keep them free of database and framework imports |
| a job runner or queue poller | 4 | takes the database or a broker — an adapter with a port-shaped surface |
| an event stream or SSE bus | 4 | transport |
| `container.ts` | 5 | the only module allowed to know every concrete class |

If one file needs both the database and pure logic, split it — that is the signal, not an exception.

### Shared request helpers

Request schemas shared by several routes (`IdParams`, pagination) are ring 0/2 contracts. A helper that resolves the current user or tenant from a request is ring 4 glue for the presentation layer. A **service** receives `tenantId` / `userId` as arguments rather than resolving them from a request itself.

## The matrix

`✔` allowed · `✘` forbidden

| from ↓ / to → | 0 domain | 1 core | 2 ports | 3 services | 4 repository | 4 routes | 4 adapters | 5 root | npm |
|---|---|---|---|---|---|---|---|---|---|
| **0 domain** | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | schema library only |
| **1 core** | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | pure libraries only |
| **2 ports** | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | schema library only |
| **3 services** | ✔ | ✔ | ✔ | own module | ✘ | ✘ | ✘ | ✘ | ✘ |
| **4 repository** | ✔ | ✘ | ✔ | ✘ | ✔ | ✘ | `db/*` | ✘ | the ORM |
| **4 routes** | ✔ | ✘ | ✔ | ✔ own module | ✘ | ✔ | ✘ | ✘ | the web framework |
| **4 adapters** | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✔ | ✘ | its own SDK |
| **5 root** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

The two rows that cause most review comments:

- **services → repository is ✘.** A service depends on the repository *port*, which is more central. The class arrives by injection. This is what makes the use case unit-testable without a database.
- **routes → services is ✔, routes → repository is ✘.** Even for a two-line read. If adding a service for one `SELECT` feels absurd, let the route call the repository **port** the root hands it — but never the database client.

## Cross-module rules

- A module may import another module's `constants.ts`.
- A module may **not** import another module's `service.ts` / `repository.ts`. Entities used by several modules get their repository built in the composition root and handed to each consumer.
- Two modules that need the same behavior means the behavior is not module-specific: move it inward (ring 1), do not import sideways.

## Diagnosing a violation

`depcruise` prints `rule: from → to`. Map it to a fix:

| Reported rule | What it means | Usual fix |
|---|---|---|
| `onion-no-persistence-in-http` | a route queries the database | extract a repository, then a service if there is any logic |
| `onion-db-only-in-repository` | a use case, helper or pipeline step names the ORM or `db/*` | define a repository port, return domain types |
| `onion-no-infra-in-http` | a route uses an SDK adapter | move the call into a service behind a port |
| `onion-concretes-only-in-composition-root` | someone imports a concrete adapter | inject it; if the target is an interface, move the interface inward |
| `onion-adapters-know-no-app` | an adapter imports a module | pass the value as a parameter |
| `onion-domain-*-is-pure` | the core grew an I/O dependency | invert it into a port the caller supplies |
| `no-circular` | usually service ↔ container | replace container injection with explicit ports |

## Why one direction

The cost of a change is the size of its blast radius, and blast radius is coupling. With every arrow pointing inward:

- The core can be tested with no database, no keys and no HTTP.
- The database, payment provider, LLM SDK and web framework become replaceable: each is one file behind one interface.
- A cycle means neither module can be changed, tested or deleted alone — which is why `no-circular` is an error, not a warning.
