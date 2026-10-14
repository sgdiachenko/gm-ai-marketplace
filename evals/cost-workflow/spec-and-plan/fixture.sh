#!/usr/bin/env bash
# Seeds the workspace with a small Next.js app that has its own instructions, check commands
# and an SDD profile, but none of this marketplace's components. Runs only with --scaffold.
set -euo pipefail

mkdir -p app/words docs/specs docs/plans

cat > package.json <<'EOF'
{
  "name": "vocabulary",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "next": "16.2.6", "react": "19.2.4", "react-dom": "19.2.4" },
  "devDependencies": { "typescript": "^5", "vitest": "^3", "@testing-library/react": "^16", "eslint": "^9" }
}
EOF

cat > AGENTS.md <<'EOF'
# vocabulary

A small Next.js App Router app for learning words. There is no backend: data lives in the browser.

## Commands
- lint: `npm run lint`
- typecheck: `npm run typecheck`
- tests: `npm test` (Vitest + React Testing Library)

## Layout
- `app/` — routes; `app/words/` is the words page
- feature code that is not a route goes to `app/<feature>/_components/` and `app/<feature>/_lib/`
EOF

cat > app/layout.tsx <<'EOF'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

cat > app/page.tsx <<'EOF'
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Vocabulary</h1>
      <Link href="/words">Words</Link>
    </main>
  );
}
EOF

cat > app/words/page.tsx <<'EOF'
export default function WordsPage() {
  return (
    <main>
      <h1>Words</h1>
      <p>Coming soon.</p>
    </main>
  );
}
EOF

cat > docs/specs/README.md <<'EOF'
# Specs

| ID | Title | Status | Modules | Supersedes |
|---|---|---|---|---|
EOF

cat > docs/sdd-profile.md <<'EOF'
# SDD profile

## Paths

| What | Path |
|---|---|
| Specs | docs/specs/ |
| Plans and run state | docs/plans/ |
| Retros | docs/retros/ |
| Design images | docs/design/ |

## Language

- Docs language: English
- EARS keywords: WHEN / WHILE / IF … THEN / WHERE

## Modules

| Module | Path | Package manager | Full checks (what CI runs) | Targeted tests |
|---|---|---|---|---|
| web | ./ | npm | `npm run lint` · `npm run typecheck` · `npm test` | `npx vitest run <files>` |

## Skill lanes

| Files | Skills |
|---|---|
| `app/**/{page,layout}.tsx` | `engineering-paved-path:next-best-practices`, `engineering-paved-path:frontend-architecture` |
| `app/**/*.tsx` | `engineering-paved-path:react-best-practices` |
| `app/**/*.test.tsx` | `engineering-paved-path:react-testing-library` |

## Architecture rules

- Sources: AGENTS.md
- Checks: `npm run lint`

## Guardrails

- Forbidden commands: none beyond the built-in ones
- Do-not-touch paths: none

## Live checks

- Manual verification may call paid or credentialed services: no
- Run the app for manual checks: `npm run dev` (http://localhost:3000)
EOF

git init -q
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "Vocabulary app with a placeholder words page"
