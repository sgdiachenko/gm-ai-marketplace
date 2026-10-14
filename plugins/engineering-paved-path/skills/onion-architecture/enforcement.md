# Enforcement

A dependency rule nobody checks is a comment. Turn the matrix in [layers.md](layers.md) into a linter so CI rejects an outward import before review.

## dependency-cruiser

[`assets/dependency-cruiser.layers.cjs`](assets/dependency-cruiser.layers.cjs) encodes the rules for the reference layout. Copy it into the backend package, then adapt the path patterns at the top of the file to the project's real folders.

```sh
npm install --save-dev dependency-cruiser
cp <this skill>/assets/dependency-cruiser.layers.cjs .dependency-cruiser.cjs
```

Add scripts to the backend `package.json`:

```json
"arch:check": "depcruise src --config .dependency-cruiser.cjs",
"arch:graph": "depcruise src --config .dependency-cruiser.cjs --output-type archi | dot -T svg > arch.svg"
```

Use the `.cjs` extension when the package is `"type": "module"`.

## What it checks

All rules are `severity: error`. The first two guard the core; the rest guard the outer rings.

| Rule | Guards |
|---|---|
| `onion-domain-model-is-pure` | ring 0 imports nothing but its schema library and itself |
| `onion-domain-services-are-pure` | ring 1 imports nothing but ring 0, ports and allowed pure libraries |
| `onion-no-persistence-in-http` | no `db/*` or ORM in a route |
| `onion-no-infra-in-http` | no `adapters/*` in a route |
| `onion-db-only-in-repository` | inside a module, only the repository names `db/*`, the ORM or an SDK |
| `onion-adapters-know-no-app` | `adapters/*` never imports `modules/*` |
| `onion-concretes-only-in-composition-root` | stateful, swappable adapters are named only in ring 5 |
| `onion-no-cross-module-internals` | no module imports another module's service or repository |
| `no-circular` | no import cycle anywhere |

## Two configuration traps

1. **Never set `exclude: { path: 'node_modules' }`.** It drops third-party modules from the graph, and every rule whose `to` names an npm package then passes silently. Use `doNotFollow`: packages stay as graph leaves but are not traversed.
2. **Point `tsConfig` at the real `tsconfig.json`.** Without it, path aliases don't resolve and rules written against aliased imports match nothing.

Under pnpm, resolved third-party paths look like `node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>/…`, which is why every npm pattern in the config is **unanchored** (`node_modules/drizzle-orm/`, not `^node_modules/drizzle-orm/`).

## Land it without blocking the branch

An existing codebase usually has violations on day one. Do not start with a red CI:

```sh
npx depcruise-baseline src --config .dependency-cruiser.cjs   # writes .dependency-cruiser-known-violations.json
```

`depcruise --ignore-known` then fails only on **new** violations, and the baseline file shrinks with each fix. It is a ratchet: entries come out, never go in. A change that adds a baseline entry needs a written reason.

## CI

Run it next to the type check:

```yaml
- name: Architecture boundaries
  run: npx depcruise src --config .dependency-cruiser.cjs --ignore-known
```

It is fast, so it belongs in the same job as the type check rather than a separate one.

## What the linter cannot see

`process.env` is not an import, so "configuration and secrets have one chokepoint each" needs a grep with an allowlist:

```sh
grep -rln "process\.env" src --include='*.ts' \
  | grep -vE '^src/(platform/config|adapters/secrets/[^/]+|db/(seed|migrate))\.ts$' \
  && echo "process.env outside the allowlist" && exit 1 || echo ok
```

Also invisible to it, and therefore checklist work in review:

- a repository returning ORM rows instead of domain types (the types flow, not the import — [ports.md](ports.md#rowdomain-mapping));
- a port named after its vendor;
- a business rule that drifted into a handler;
- a service taking `Container` (the import may be legal; the cycle it creates is what `no-circular` catches).

## Alternatives

- **ESLint `import/no-restricted-paths` or `eslint-plugin-boundaries`** — good when the project already runs ESLint on the backend.
- **TypeScript project references** — make violations unbuildable, the strongest option, but require splitting the code into real packages.
- **`madge --circular`** — cycles only; no layer rules.
