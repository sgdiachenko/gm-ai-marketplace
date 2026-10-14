---
name: next-best-practices
description: "Next.js App Router practices: file conventions, Server/Client Component boundaries, async request APIs, data fetching and mutations, caching, error handling, metadata, images and fonts, hydration errors. Use when writing, reviewing or debugging Next.js code. Checks the installed version and its bundled docs first."
user-invocable: false
---

# Next.js best practices (App Router)

Next.js changes fast, and several defaults (caching, async request APIs) changed between major versions. Rules below are stable across recent versions; anything version-sensitive says so. Where this skill and the installed version's docs disagree, the docs win.

## Severity Levels

- **CRITICAL** — a security hole, a crash, or data shown to the wrong user
- **HIGH** — broken rendering, a hydration error, or a request waterfall users feel
- **MEDIUM** — a convention break that makes the app harder to change

## 0. Check the version first

1. Read `next` in `package.json` and the lockfile.
2. If `node_modules/next/dist/docs/` exists (bundled docs, shipped with recent versions), read the relevant page there before relying on memory. A generated `AGENTS.md` / `CLAUDE.md` from `next dev` carries the same rules.
3. Follow the project's own `AGENTS.md` / `CLAUDE.md` over this skill.

## 1. File conventions

| File | Role | Notes |
|---|---|---|
| `page.tsx` | makes a segment routable | the only file that exposes a URL |
| `layout.tsx` | wraps children, persists across navigation | receives `children`; doesn't re-render on navigation between its pages |
| `template.tsx` | like a layout, but remounts on navigation | use only when state must reset |
| `loading.tsx` | Suspense fallback for the segment | streams while the page's data loads |
| `error.tsx` | error boundary for the segment | **must be a Client Component** (`'use client'`); receives `error`, `reset` |
| `global-error.tsx` | error boundary for the root layout | must render its own `<html>` and `<body>` |
| `not-found.tsx` | UI for `notFound()` and unmatched URLs | |
| `route.ts` | Route Handler (HTTP endpoint) | can't sit in the same segment as `page.tsx` |
| `default.tsx` | fallback for a parallel-route slot | needed so hard navigation doesn't 404 |

- `_folder` is private: not routable, for colocated components and helpers.
- `(group)` organizes routes and layouts without adding a URL segment.
- `@slot` defines a parallel route; `(.)segment` intercepts a route.

## 2. Server and Client Components (CRITICAL / HIGH)

- Components are **Server Components by default**. Add `'use client'` only where interactivity (state, effects, event handlers, browser APIs) is needed, and push it to the leaves.
- Props passed from a Server to a Client Component must be **serializable**: plain data, not class instances or functions. The exception is a Server Action, which may be passed as a prop.
- A Client Component can't import a Server Component; pass it as `children` or another prop instead.
- Client Components can't be `async`.
- Mark server-only modules (database access, secrets) with `import 'server-only'` so a client import fails at build time. Never read secrets in a module a Client Component can import. (CRITICAL)
- Environment variables reach the browser only with the `NEXT_PUBLIC_` prefix; anything else must stay server-side.

## 3. Async request APIs (HIGH, version-sensitive)

From Next.js 15, `params` and `searchParams` page props and `cookies()`, `headers()` and `draftMode()` are **asynchronous**. Await them:

```tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await cookies();
  // ...
}
```

In a Client Component, read them with `use(params)` or the navigation hooks (`useParams`, `useSearchParams`). On Next.js 14 and earlier they are synchronous; follow the installed version.

## 4. Data fetching and mutations (HIGH)

- **Fetch in Server Components**, close to where the data is used. No `useEffect` fetching for data the server can provide.
- **Avoid waterfalls.** Start independent requests together (`Promise.all`) or split them into sibling components under separate `<Suspense>` boundaries.
- **Don't call your own Route Handlers from a Server Component.** Call the underlying function directly; the HTTP round trip adds latency and loses types.
- **Mutations use Server Actions** (`'use server'`). Treat every Server Action as a public endpoint: validate input, check authentication **and** authorization of the resource inside the action, every time. (CRITICAL)
- After a mutation, refresh what changed with `revalidatePath` / `revalidateTag`, or `redirect` to the result.
- **Route Handlers** are for clients other than your own pages: webhooks, third-party callers, mobile apps.
- Keep data access in one server-only layer (a data access layer) that performs the authorization checks, so pages and actions don't each re-implement them.

## 5. Caching (version-sensitive)

Caching defaults changed across versions: in Next.js 15, `fetch` requests and `GET` Route Handlers are no longer cached by default, and newer versions add explicit caching directives. Don't assume a default — read the installed version's caching docs, and state the intended behavior explicitly in code (`cache`, `revalidate`, tags, or the version's cache directive).

- User-specific data must never be cached in a shared cache. (CRITICAL)
- Prefer tag-based revalidation for data shared by several pages.

## 6. Errors, redirects and not found (HIGH)

- `redirect()` and `notFound()` work by throwing. Don't call them inside a `try` whose `catch` swallows errors; call them after the `try`, or rethrow.
- An `error.tsx` boundary catches errors from its segment's children, not from the layout in the same segment; the parent segment's boundary handles that.
- Show users a safe message; log the details on the server. Never render a raw error from the server in production.

## 7. Metadata

- Export a static `metadata` object, or `generateMetadata` when it depends on data. Both work only in Server Components (`page` or `layout`).
- Data fetched in both `generateMetadata` and the page is deduplicated for the same request when it uses the same `fetch` call or a `cache()`-wrapped function.
- Use the file conventions for icons and social images (`icon.png`, `opengraph-image.tsx`) rather than hand-written `<link>` tags.

## 8. Images and fonts (MEDIUM)

- Use `next/image` with explicit `width` and `height`, or `fill` with a `sizes` attribute, so layout doesn't shift. Mark the largest above-the-fold image as high priority, using the prop the installed version documents.
- Remote images need their hosts listed in `images.remotePatterns`.
- Load fonts with `next/font`: it self-hosts them and removes layout shift. Define each font once and share it.

## 9. Suspense and streaming

- `loading.tsx` wraps the whole page; add finer `<Suspense>` boundaries around slow parts so the rest renders first.
- A Client Component that calls `useSearchParams()` needs a `<Suspense>` boundary above it, or the whole route falls back to client rendering.

## 10. Hydration errors (HIGH)

Server and client rendered different HTML. Common causes and fixes:

| Cause | Fix |
|---|---|
| `Date.now()`, `Math.random()`, locale formatting during render | compute on the server and pass down, or render it after mount in `useEffect` |
| `typeof window` branches in render | move browser-only output into an effect or a client-only component |
| invalid HTML nesting (`<div>` in `<p>`, nested `<a>`) | fix the markup |
| browser extensions changing the DOM | confirm in a clean profile; not an app bug |

`suppressHydrationWarning` silences one element's text mismatch. Use it only for values that legitimately differ, such as a timestamp.

## Review checklist

1. Is `'use client'` at the leaves, and does nothing server-only (secrets, database) reach a client module?
2. Are `params`, `searchParams`, `cookies()` and `headers()` awaited on Next.js 15 or later?
3. Does every Server Action validate input and check authorization of the resource it touches?
4. Are independent requests started in parallel?
5. Is caching stated explicitly, and is no user-specific data in a shared cache?
6. Are `redirect()` / `notFound()` outside swallowing `try`/`catch` blocks?
7. Does every route that can fail have an `error.tsx`, and does `error.tsx` have `'use client'`?
8. Do images have dimensions or `fill` + `sizes`, and are fonts loaded with `next/font`?

## Sources

- [Next.js documentation](https://nextjs.org/docs) and the bundled docs in `node_modules/next/dist/docs/`
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Data security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js 15 upgrade guide: async request APIs](https://nextjs.org/docs/app/guides/upgrading/version-15)
