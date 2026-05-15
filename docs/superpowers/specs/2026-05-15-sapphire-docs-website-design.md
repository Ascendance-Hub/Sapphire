# Sapphire docs website — design

> Date: 2026-05-15. Status: approved (brainstorming). Next: implementation plan.

## Goal

A public website for Sapphire, deployed to GitHub Pages, that:

1. Sells the library with a landing page (bold sapphire hero, one-line pitch).
2. Hosts an **interactive playground** — the user edits a schema and sees real
   results compute live in the browser.
3. Renders all 25 existing markdown docs as browsable pages with sidebar
   navigation.

The existing `docs/**/*.md` files stay the single source of truth. The site
renders them; it does not fork them.

## Locked decisions (from brainstorming)

- **Playground depth:** live execution of Sapphire `core` + the `json-schema`
  adapter, bundled to the browser. Mongo/Drizzle are _not_ run live (their peer
  deps — `mongoose`, `drizzle-orm` — are heavy and Node-oriented); their output
  appears as pre-rendered examples on their own doc pages.
- **Site shape:** marketing landing page **plus** the full documentation
  behind the nav.
- **Theme:** light. Bold sapphire-gradient hero; light, readable docs pages.
  Accent blue `#2f7fd6`, hero gradient `#16386b → #2f7fd6`, slate text
  (`#1e3a5f` headings, `#5b6b80` body), light backgrounds (`#ffffff`,
  `#f4f6fa`).
- **Build tool:** Astro. Static output, content collections for the markdown,
  the playground as a single hydrated island.
- **Scope:** v1 ships landing + playground + all 25 docs.

## Architecture

### Repo placement

A new top-level `website/` directory — a **private workspace** (added to the
root `package.json` `workspaces` array, `"private": true`, never published to
npm). One `npm install` at the repo root wires it up. It depends on
`@ascendance-hub/sapphire-core` and `@ascendance-hub/sapphire-json-schema` via
the workspace protocol, so the playground bundles the real local packages.

### Directory layout

```
website/
  package.json            private workspace; Astro + CodeMirror deps
  astro.config.mjs        site/base config, markdown plugins
  tsconfig.json
  src/
    pages/
      index.astro         landing page
      playground.astro    full-page playground
      docs/[...slug].astro dynamic route — one page per markdown doc
    layouts/
      BaseLayout.astro    nav + footer + theme shell
      DocsLayout.astro    BaseLayout + docs sidebar
    components/
      Hero.astro
      Nav.astro
      Sidebar.astro       docs tree navigation
      Playground.astro    the interactive island (markup + client script)
      FeatureRow.astro
    lib/
      ir-to-type.ts       SapphireSchemaNode → readable TS-type string
      playground-eval.ts  sandboxed evaluation of user schema code
    content.config.ts     content-layer glob loader pointing at ../docs
    styles/
      tokens.css          CSS custom properties (the design system)
      global.css
  public/                 favicon, og image, .nojekyll
```

### Pages & routes

| Route          | Source                                   | Layout     |
| -------------- | ---------------------------------------- | ---------- |
| `/`            | `index.astro`                            | BaseLayout |
| `/playground`  | `playground.astro`                       | BaseLayout |
| `/docs/<slug>` | `../docs/**/*.md` via content collection | DocsLayout |

`docs/README.md` becomes the docs index, served at `/docs`. Every other slug
mirrors the markdown path: `docs/concepts/overview.md` →
`/docs/concepts/overview`.

### Docs ingestion — single source of truth

Astro 5 Content Layer `glob()` loader points at the repo-root `docs/`
directory (`../docs/**/*.md`). No copying. Editing a markdown file updates the
site on the next build.

A **remark plugin** rewrites intra-doc links: a Markdown link to `*.md`
(`./concepts/overview.md`, `../adapters/mongo.md`) is rewritten to its site
route (`/docs/concepts/overview`). Anchors and external links pass through
untouched. The `<!-- from tests/docs-examples/... -->` pin comments are HTML
comments and render to nothing — left as-is.

Syntax highlighting: Astro's built-in Shiki, light theme tuned to match the
site palette.

## The playground

The centrepiece. An Astro component whose client script runs entirely in the
browser.

### Components of the playground

1. **Editor** — CodeMirror 6 (modular, light footprint), JavaScript mode, a
   light editor theme matching the site. Seeded with a default schema.
2. **Sample-value input** — a small secondary CodeMirror (or textarea) holding
   a JSON value, used by the Parse tab. Defaults to `{}`.
3. **Output panel** — four tabs:
   - **Type** — a readable type string derived from the IR by `ir-to-type.ts`.
     (The real `Infer<>` is a compile-time type and cannot be computed at
     runtime; the IR fully determines the type, so a faithful string is
     derived from it instead.)
   - **IR** — `field.toSchema()`, pretty-printed JSON.
   - **JSON Schema** — `toJsonSchema(field.toSchema())`, pretty-printed JSON.
   - **Parse** — `field.safeParse(sampleValue)` result: success data or the
     `error.issues` list.

### Evaluation flow (`playground-eval.ts`)

1. Debounce editor changes (~200 ms).
2. Build a fresh `const a = new Sapphire()`.
3. Evaluate the user's expression in a sandbox:
   `new Function('a', 'return (' + userCode + ')')(a)`. Client-side only — the
   blast radius is the user's own tab.
4. Validate the result is a Sapphire field (has `toSchema`).
5. Compute each output; wrap every step in try/catch.
6. Render. On any error, show the message inline in the affected tab; the
   other tabs still render if they succeeded.

### Bundle

`core` (zero runtime deps) + `json-schema` (zero runtime deps) + CodeMirror 6.
Vite (Astro's bundler) handles the TS → browser ESM bundle. No `mongoose` /
`drizzle-orm` in the browser bundle.

### Reuse

The same `Playground.astro` component is embedded on the landing page and
mounted full-width on `/playground`.

## Theme / design system

`tokens.css` exposes CSS custom properties consumed everywhere:

- Accent: `--sapphire-600 #2f7fd6`, hero gradient `#16386b → #2f7fd6`.
- Text: `--ink-900 #1e3a5f` (headings), `--ink-600 #5b6b80` (body).
- Surfaces: `--bg #ffffff`, `--bg-soft #f4f6fa`, `--border #e3e9f0`.
- One accent green for "valid"/"live" states (`#1a9466`).

Landing hero uses the gradient; docs pages are light with the sidebar. No dark
mode in v1.

## Build & deploy

- `astro build` → `website/dist/` (fully static).
- `astro.config.mjs`: `site: 'https://ascendance-hub.github.io'`,
  `base: '/Sapphire'` (project page under the `Ascendance-Hub/Sapphire` repo).
- New workflow `.github/workflows/pages.yml`: on push to `main`, build the
  site and deploy via `actions/deploy-pages`. `public/.nojekyll` prevents
  Jekyll processing.
- The existing `ci.yml` (lint/test/build of the 4 packages) is untouched.

## Testing

- The Astro build succeeding is the primary gate (broken markdown link
  rewrite, broken component → build fails).
- Unit tests for the two pure modules: `ir-to-type.ts` (IR node → expected
  type string for each kind) and the link-rewrite remark plugin (in/out URL
  pairs). Vitest, co-located in `website/`.
- The playground evaluation is exercised by a smoke test: feed a known schema
  string through `playground-eval.ts`, assert IR + JSON Schema shape.
- No end-to-end browser test in v1.

## Out of scope (v1)

- Dark mode.
- Live Mongo/Drizzle output in the playground.
- Full-fidelity TypeScript inference in the Type tab (the TS compiler in the
  browser is ~7 MB — the IR-derived string is the v1 choice).
- Search across docs (Astro/Pagefind can be added later).
- Versioned docs.

## Open risks

- **Content Layer glob from outside `src/`** — Astro 5's `glob()` loader
  accepts an arbitrary `base`; pointing it at `../docs` is supported. If a
  version pin makes that awkward, the fallback is a prebuild step that copies
  `docs/` into `website/src/content/` (kept out of git).
- **Relative-link rewriting** — the remark plugin must handle `./`, `../`, and
  anchor-only links. Covered by unit tests.
- **`base: '/Sapphire'`** — all internal links/assets must respect the base
  path. Use Astro's route helpers, not hand-written absolute paths.
