/**
 * Onion Architecture layer rules for a TypeScript backend in the reference layout:
 *
 *   src/domain/          ring 0   src/modules/<n>/service.ts      ring 3
 *   src/core/            ring 1   src/modules/<n>/repository.ts   ring 4
 *   src/ports/           ring 2   src/modules/<n>/routes.ts       ring 4
 *   src/adapters/        ring 4   src/platform/                   ring 5
 *
 * Install:  copy to the backend package as .dependency-cruiser.cjs, then adapt the
 *           path patterns and package lists below to the project's layout.
 * Run:      npx depcruise src --config .dependency-cruiser.cjs
 * Matrix and reasoning: ../layers.md
 *
 * Do NOT set `exclude: { path: 'node_modules' }`: it removes third-party modules from
 * the graph, and every rule whose `to` names an npm package then silently passes.
 * `doNotFollow` keeps npm packages as leaves without traversing them.
 */

// Packages each ring may name. Patterns are unanchored so pnpm's nested paths match.
const SCHEMA_LIBS = 'node_modules/(zod)/';
const PURE_LIBS = 'node_modules/(zod|date-fns)/';
const PERSISTENCE = 'node_modules/(drizzle-orm|postgres|pg|@prisma|prisma|kysely|typeorm|mongoose)/';
const FRAMEWORKS_AND_SDKS =
  'node_modules/(drizzle-orm|postgres|pg|@prisma|kysely|typeorm|mongoose|fastify|express|@nestjs|openai|@anthropic-ai|stripe|@aws-sdk|octokit|@octokit)/';
// Stateful, swappable, secret-carrying adapters that only the composition root may name.
const CONCRETE_ADAPTERS = '^src/adapters/(?!mocks)';

module.exports = {
  forbidden: [
    {
      name: 'onion-domain-model-is-pure',
      comment:
        'Ring 0 is the domain vocabulary. It may import its schema library and itself, ' +
        'nothing else. A domain type that imports a framework or the database has stopped ' +
        'being a domain type.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { pathNot: ['^src/domain/', SCHEMA_LIBS] },
    },
    {
      name: 'onion-domain-services-are-pure',
      comment:
        'Ring 1 is pure: no database, no network, no filesystem, no framework. Side ' +
        'effects arrive through ports the caller injects.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { pathNot: ['^src/core/', '^src/domain/', '^src/ports/', PURE_LIBS] },
    },
    {
      name: 'onion-no-persistence-in-http',
      comment:
        'A route parses, delegates to one use case and maps a status code. SQL in a ' +
        'handler cannot be reused by a job or a CLI and is testable only through HTTP.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: ['^src/db/', PERSISTENCE] },
    },
    {
      name: 'onion-no-infra-in-http',
      comment: 'A route that needs an outside service calls a use case that injects the port.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'onion-db-only-in-repository',
      comment:
        'Inside a module, only repository.ts (or repository/*.ts) may name persistence or ' +
        'an SDK. Routes are covered by their own rule so the message points at the right fix.',
      severity: 'error',
      from: {
        path: '^src/modules/',
        pathNot: ['^src/modules/[^/]+/routes\\.ts$', '^src/modules/[^/]+/repository(\\.ts$|/)', '\\.test\\.ts$'],
      },
      to: { path: ['^src/db/', FRAMEWORKS_AND_SDKS] },
    },
    {
      name: 'onion-adapters-know-no-app',
      comment:
        'An adapter must not import a module. Reading a module constant welds the adapter ' +
        'to that feature; pass the value in as a parameter.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'onion-concretes-only-in-composition-root',
      comment:
        'Only the composition root names a concrete adapter; everyone else receives it. ' +
        'A hit is either a missing injection or a port declared in its own adapter file — ' +
        'move the interface to src/ports/.',
      severity: 'error',
      from: {
        pathNot: ['^src/platform/', '^src/adapters/', '^src/db/(seed|migrate)\\.ts$', '\\.test\\.ts$'],
      },
      to: { path: CONCRETE_ADAPTERS },
    },
    {
      name: 'onion-no-cross-module-internals',
      comment:
        "Modules share through root-owned repositories and ports, not by importing each other's " +
        'service or repository. Sharing a constants.ts is fine.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/[^/]+/(service|repository)', pathNot: '^src/modules/$1/' },
    },
    {
      name: 'no-circular',
      comment:
        'A cycle means neither module can be changed, tested or deleted alone. The usual ' +
        'cause is a service that takes the container.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    reporterOptions: {
      archi: {
        collapsePattern: '^src/(domain|core|ports|adapters/[^/]+|modules/[^/]+|db|platform)',
      },
    },
  },
};
