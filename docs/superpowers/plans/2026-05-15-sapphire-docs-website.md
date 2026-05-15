# Sapphire Docs Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static documentation website for Sapphire — a bold landing page, an in-browser interactive playground, and all 25 markdown docs — deployed to GitHub Pages.

**Architecture:** A new private `website/` workspace running Astro 5. Astro renders the existing `docs/**/*.md` as a content collection (single source of truth). The playground is one hydrated island that bundles `@ascendance-hub/sapphire-core` + `@ascendance-hub/sapphire-json-schema` and runs them live in the browser. Output is a fully static site deployed via GitHub Actions.

**Tech Stack:** Astro 5, CodeMirror 6 (editor), Vitest (unit tests for pure modules), GitHub Pages + Actions.

---

## Notes for the implementer

- The repo is an npm-workspaces monorepo. `website/` becomes a new **private** workspace.
- Sapphire `core` and `json-schema` are TypeScript ESM packages with zero runtime dependencies. The website imports them by package name; `astro.config.mjs` aliases those names to the packages' `src/index.ts` so the site always builds against live source (no dependency on `dist/`).
- Astro components and pages are **not** unit-tested. Their verification step is: `npm run build` (in `website/`) succeeds, and `npx astro check` reports no errors. The three **pure logic modules** (`ir-to-type.ts`, `remark-rewrite-links.ts`, `playground-eval.ts`) are unit-tested with Vitest, TDD-style.
- All commands in this plan run from the repo root `C:\Users\alexa\code\Sapphire` unless a step says `cd website`.
- The site's GitHub Pages base path is `/Sapphire` (project page of `Ascendance-Hub/Sapphire`).

---

## Task 1: Scaffold the `website/` workspace

**Files:**
- Create: `website/package.json`
- Create: `website/astro.config.mjs`
- Create: `website/tsconfig.json`
- Create: `website/src/pages/index.astro`
- Create: `website/src/env.d.ts`
- Create: `website/public/.nojekyll`
- Modify: `package.json` (root — add `website` to `workspaces`)
- Modify: `.gitignore`

- [ ] **Step 1: Create `website/package.json`**

```json
{
  "name": "@ascendance-hub/sapphire-website",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.6.0",
    "codemirror": "^6.0.1",
    "@codemirror/lang-javascript": "^6.2.2"
  },
  "devDependencies": {
    "@ascendance-hub/sapphire-core": "*",
    "@ascendance-hub/sapphire-json-schema": "*",
    "unist-util-visit": "^5.0.0",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `website/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["src/lib/*"]
    }
  },
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Create `website/src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 4: Create `website/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'

// Project page: https://ascendance-hub.github.io/Sapphire
export default defineConfig({
  site: 'https://ascendance-hub.github.io',
  base: '/Sapphire',
  vite: {
    resolve: {
      alias: {
        '@ascendance-hub/sapphire-core': fileURLToPath(
          new URL('../packages/core/src/index.ts', import.meta.url),
        ),
        '@ascendance-hub/sapphire-json-schema': fileURLToPath(
          new URL('../packages/json-schema/src/index.ts', import.meta.url),
        ),
      },
    },
  },
})
```

- [ ] **Step 5: Create `website/public/.nojekyll`**

Empty file (prevents GitHub Pages from running Jekyll, which strips files beginning with `_`).

```
```

- [ ] **Step 6: Create a placeholder `website/src/pages/index.astro`**

```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Sapphire</title>
  </head>
  <body>
    <h1>Sapphire — scaffold OK</h1>
  </body>
</html>
```

- [ ] **Step 7: Add `website` to root `package.json` workspaces**

In `package.json` (root), change the `workspaces` array:

```json
  "workspaces": [
    "packages/*",
    "examples/consumer",
    "website"
  ],
```

- [ ] **Step 8: Add Astro build artifacts to `.gitignore`**

Append to `.gitignore`:

```
website/dist/
website/.astro/
```

- [ ] **Step 9: Install and verify the build**

Run: `npm install`
Then: `npm run build --workspace @ascendance-hub/sapphire-website`
Expected: Astro builds successfully; `website/dist/index.html` exists containing "scaffold OK".

- [ ] **Step 10: Commit**

```bash
git add website package.json .gitignore
git commit -m "feat(website): scaffold Astro workspace"
```

---

## Task 2: Design tokens and global styles

**Files:**
- Create: `website/src/styles/tokens.css`
- Create: `website/src/styles/global.css`

- [ ] **Step 1: Create `website/src/styles/tokens.css`**

```css
:root {
  /* sapphire accent */
  --sapphire-600: #2f7fd6;
  --sapphire-700: #1e4d8c;
  --sapphire-900: #16386b;
  --hero-gradient: linear-gradient(155deg, #16386b 0%, #2f7fd6 100%);

  /* ink (text) */
  --ink-900: #1e3a5f;
  --ink-600: #5b6b80;
  --ink-400: #8693a6;

  /* surfaces */
  --bg: #ffffff;
  --bg-soft: #f4f6fa;
  --border: #e3e9f0;

  /* status */
  --green-600: #1a9466;
  --red-600: #d6584a;

  /* type */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* layout */
  --radius: 8px;
  --maxw: 1080px;
}
```

- [ ] **Step 2: Create `website/src/styles/global.css`**

```css
@import './tokens.css';

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
  color: var(--ink-900);
  background: var(--bg);
  line-height: 1.6;
}

a { color: var(--sapphire-600); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3, h4 { color: var(--ink-900); line-height: 1.25; }

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-soft);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

pre {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  overflow-x: auto;
}
pre code { background: none; padding: 0; }
```

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build --workspace @ascendance-hub/sapphire-website`
Expected: build succeeds (CSS files are not imported yet — this just confirms no syntax breakage).

- [ ] **Step 4: Commit**

```bash
git add website/src/styles
git commit -m "feat(website): design tokens and global styles"
```

---

## Task 3: Base layout and navigation

**Files:**
- Create: `website/src/components/Nav.astro`
- Create: `website/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create `website/src/components/Nav.astro`**

```astro
---
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
---
<nav class="nav">
  <a class="logo" href={`${base}/`}>◆ Sapph<span>ire</span></a>
  <div class="links">
    <a href={`${base}/docs`}>Docs</a>
    <a href={`${base}/playground`}>Playground</a>
    <a class="gh" href="https://github.com/Ascendance-Hub/Sapphire">GitHub</a>
  </div>
</nav>

<style>
  .nav {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 13px 22px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .logo { font-weight: 800; color: var(--ink-900); font-size: 16px; }
  .logo:hover { text-decoration: none; }
  .logo span { color: var(--sapphire-600); }
  .links { margin-left: auto; display: flex; gap: 18px; align-items: center; font-size: 14px; }
  .links a { color: var(--ink-600); }
  .gh { background: var(--ink-900); color: #fff !important; padding: 6px 13px; border-radius: 6px; }
  .gh:hover { text-decoration: none; }
</style>
```

- [ ] **Step 2: Create `website/src/layouts/BaseLayout.astro`**

```astro
---
import Nav from '../components/Nav.astro'
import '../styles/global.css'
interface Props {
  title: string
  description?: string
}
const { title, description = 'One schema, every ORM — Sapphire.' } = Astro.props
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <Nav />
    <main>
      <slot />
    </main>
    <footer>
      <span>Sapphire — BSD-3-Clause</span>
    </footer>
    <style>
      footer {
        border-top: 1px solid var(--border);
        padding: 22px;
        text-align: center;
        color: var(--ink-400);
        font-size: 13px;
        margin-top: 48px;
      }
    </style>
  </body>
</html>
```

- [ ] **Step 3: Rewrite `website/src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
---
<BaseLayout title="Sapphire">
  <h1 style="padding: 40px 22px;">Landing page — coming in Task 4</h1>
</BaseLayout>
```

- [ ] **Step 4: Verify build and check**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build succeeds; `astro check` reports 0 errors.

- [ ] **Step 5: Commit**

```bash
git add website/src
git commit -m "feat(website): base layout and nav"
```

---

## Task 4: Landing page — hero and features

**Files:**
- Create: `website/src/components/Hero.astro`
- Create: `website/src/components/FeatureRow.astro`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1: Create `website/src/components/Hero.astro`**

```astro
---
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
---
<section class="hero">
  <h1>One schema. Every ORM.</h1>
  <p>
    Define your data shape once — Sapphire emits Mongoose, Drizzle, JSON Schema
    and TypeScript types from a single source of truth.
  </p>
  <div class="cta">
    <a class="btn primary" href={`${base}/docs`}>Get started →</a>
    <a class="btn ghost" href={`${base}/playground`}>Open playground</a>
  </div>
</section>

<style>
  .hero {
    background: var(--hero-gradient);
    color: #fff;
    text-align: center;
    padding: 64px 24px 76px;
  }
  .hero h1 {
    color: #fff;
    font-size: clamp(30px, 5vw, 44px);
    margin: 0 0 14px;
    letter-spacing: -0.02em;
  }
  .hero p {
    max-width: 480px;
    margin: 0 auto 24px;
    color: #cfe0f4;
    font-size: 16px;
  }
  .cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .btn { padding: 11px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .btn:hover { text-decoration: none; }
  .btn.primary { background: #fff; color: var(--sapphire-700); }
  .btn.ghost { background: rgba(255, 255, 255, 0.12); color: #fff; border: 1px solid rgba(255, 255, 255, 0.35); }
</style>
```

- [ ] **Step 2: Create `website/src/components/FeatureRow.astro`**

```astro
---
const features = [
  { icon: '⛃', title: 'Multi-output', body: 'One definition becomes a Mongoose schema, a Drizzle table, and a JSON Schema document.' },
  { icon: '{ }', title: 'Typed end to end', body: 'Infer<> derives a precise TypeScript type from the same schema — no drift.' },
  { icon: '✓', title: 'Validation built in', body: 'parse / safeParse with structured, DTO-ready errors via flatten() and format().' },
]
---
<section class="features">
  {features.map((f) => (
    <article class="feature">
      <div class="icon">{f.icon}</div>
      <h3>{f.title}</h3>
      <p>{f.body}</p>
    </article>
  ))}
</section>

<style>
  .features {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    max-width: var(--maxw);
    margin: 48px auto 0;
    padding: 0 22px;
  }
  .feature { flex: 1 1 240px; }
  .icon {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    background: #e9f1fb;
    color: var(--sapphire-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    margin-bottom: 10px;
  }
  .feature h3 { margin: 0 0 4px; font-size: 16px; }
  .feature p { margin: 0; color: var(--ink-600); font-size: 14px; }
</style>
```

- [ ] **Step 2b: Rewrite `website/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
import Hero from '../components/Hero.astro'
import FeatureRow from '../components/FeatureRow.astro'
---
<BaseLayout title="Sapphire — one schema, every ORM">
  <Hero />
  <FeatureRow />
</BaseLayout>
```

- [ ] **Step 3: Verify build, check, and visually inspect**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build + check pass.
Then run `cd website && npm run dev` and open the printed URL — confirm the hero gradient and three feature cards render. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add website/src
git commit -m "feat(website): landing page hero and features"
```

---

## Task 5: `ir-to-type.ts` — IR node to readable type string

**Files:**
- Create: `website/src/lib/ir-to-type.ts`
- Test: `website/tests/ir-to-type.test.ts`
- Create: `website/vitest.config.ts`

- [ ] **Step 1: Create `website/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@ascendance-hub/sapphire-core': fileURLToPath(
        new URL('../packages/core/src/index.ts', import.meta.url),
      ),
      '@ascendance-hub/sapphire-json-schema': fileURLToPath(
        new URL('../packages/json-schema/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write the failing test `website/tests/ir-to-type.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { irToTypeString } from '../src/lib/ir-to-type'

describe('irToTypeString', () => {
  it('renders primitives', () => {
    expect(irToTypeString({ kind: 'string', required: true })).toBe('string')
    expect(irToTypeString({ kind: 'number', required: true })).toBe('number')
    expect(irToTypeString({ kind: 'boolean', required: true })).toBe('boolean')
    expect(irToTypeString({ kind: 'date', required: true })).toBe('Date')
  })

  it('renders a literal as its JSON value', () => {
    expect(irToTypeString({ kind: 'literal', required: true, value: 'admin' })).toBe('"admin"')
    expect(irToTypeString({ kind: 'literal', required: true, value: 42 })).toBe('42')
  })

  it('renders an enum as a union of its values', () => {
    expect(
      irToTypeString({ kind: 'enum', required: true, values: ['a', 'b'] }),
    ).toBe('"a" | "b"')
  })

  it('renders an array', () => {
    expect(
      irToTypeString({ kind: 'array', required: true, items: { kind: 'string', required: true } }),
    ).toBe('string[]')
  })

  it('renders a tuple', () => {
    expect(
      irToTypeString({
        kind: 'tuple',
        required: true,
        items: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      }),
    ).toBe('[string, number]')
  })

  it('renders a union', () => {
    expect(
      irToTypeString({
        kind: 'union',
        required: true,
        options: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      }),
    ).toBe('string | number')
  })

  it('renders a record', () => {
    expect(
      irToTypeString({
        kind: 'record',
        required: true,
        keys: { kind: 'string', required: true },
        values: { kind: 'number', required: true },
      }),
    ).toBe('Record<string, number>')
  })

  it('renders a ref as its target name', () => {
    expect(irToTypeString({ kind: 'ref', required: true, target: 'User' })).toBe('User')
  })

  it('renders an object with optional keys marked', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: false },
      },
    }
    expect(irToTypeString(node)).toBe('{ name: string; age?: number }')
  })

  it('appends | null for a nullable node', () => {
    expect(irToTypeString({ kind: 'string', required: true, nullable: true })).toBe('string | null')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd website && npx vitest run tests/ir-to-type.test.ts && cd ..`
Expected: FAIL — `irToTypeString` not found.

- [ ] **Step 4: Implement `website/src/lib/ir-to-type.ts`**

```ts
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

/**
 * Renders a SapphireSchemaNode as a readable TypeScript-type string.
 * The IR fully determines the inferred type, so this is a faithful stand-in
 * for `Infer<>` — which cannot be computed at runtime because TS types erase.
 */
export function irToTypeString(node: SapphireSchemaNode): string {
  let base: string
  switch (node.kind) {
    case 'string':
      base = 'string'
      break
    case 'number':
      base = 'number'
      break
    case 'boolean':
      base = 'boolean'
      break
    case 'date':
      base = 'Date'
      break
    case 'literal':
      base = JSON.stringify(node.value)
      break
    case 'enum':
      base = node.values.map((v) => JSON.stringify(v)).join(' | ')
      break
    case 'array':
      base = `${wrapForArray(node.items)}[]`
      break
    case 'tuple':
      base = `[${node.items.map(irToTypeString).join(', ')}]`
      break
    case 'union':
      base = node.options.map(irToTypeString).join(' | ')
      break
    case 'record':
      base = `Record<${irToTypeString(node.keys)}, ${irToTypeString(node.values)}>`
      break
    case 'ref':
      base = node.target
      break
    case 'object': {
      const entries = Object.entries(node.properties).map(([key, child]) => {
        const opt = child.required ? '' : '?'
        return `${key}${opt}: ${irToTypeString(child)}`
      })
      base = entries.length > 0 ? `{ ${entries.join('; ')} }` : '{}'
      break
    }
  }
  if (node.nullable) base = `${base} | null`
  return base
}

/** Parenthesizes a union/nullable element so `(a | b)[]` parses correctly. */
function wrapForArray(node: SapphireSchemaNode): string {
  const s = irToTypeString(node)
  return /[ |]/.test(s) ? `(${s})` : s
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd website && npx vitest run tests/ir-to-type.test.ts && cd ..`
Expected: PASS — all assertions green.

- [ ] **Step 6: Commit**

```bash
git add website/src/lib/ir-to-type.ts website/tests/ir-to-type.test.ts website/vitest.config.ts
git commit -m "feat(website): ir-to-type renderer"
```

---

## Task 6: `playground-eval.ts` — sandboxed schema evaluation

**Files:**
- Create: `website/src/lib/playground-eval.ts`
- Test: `website/tests/playground-eval.test.ts`

- [ ] **Step 1: Write the failing test `website/tests/playground-eval.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { evaluatePlayground } from '../src/lib/playground-eval'

describe('evaluatePlayground', () => {
  const schema = `a.object({ name: a.string().min(2), age: a.number().int() })`

  it('returns the IR for a valid schema', () => {
    const r = evaluatePlayground(schema, '{}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.ir.kind).toBe('object')
      expect(r.typeString).toBe('{ name: string; age: number }')
    }
  })

  it('returns a JSON Schema document', () => {
    const r = evaluatePlayground(schema, '{}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(typeof r.jsonSchema).toBe('object')
    }
  })

  it('parses the sample value and reports success', () => {
    const r = evaluatePlayground(schema, '{ "name": "Ana", "age": 30 }')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.parse.success).toBe(true)
  })

  it('parses the sample value and reports issues', () => {
    const r = evaluatePlayground(schema, '{ "name": "x", "age": 1.5 }')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parse.success).toBe(false)
      if (!r.parse.success) expect(r.parse.issues.length).toBeGreaterThan(0)
    }
  })

  it('reports a schema syntax error without throwing', () => {
    const r = evaluatePlayground('a.object({ broken', '{}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/./)
  })

  it('reports an invalid sample-value JSON without throwing', () => {
    const r = evaluatePlayground(schema, '{ not json')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parse.success).toBe(false)
      if (!r.parse.success) expect(r.parse.sampleError).toMatch(/./)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd website && npx vitest run tests/playground-eval.test.ts && cd ..`
Expected: FAIL — `evaluatePlayground` not found.

- [ ] **Step 3: Implement `website/src/lib/playground-eval.ts`**

```ts
import { Sapphire, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { irToTypeString } from './ir-to-type'

type ParseOutcome =
  | { success: true; data: unknown }
  | { success: false; issues: unknown[]; sampleError?: string }

export type PlaygroundResult =
  | {
      ok: true
      ir: SapphireSchemaNode
      typeString: string
      jsonSchema: unknown
      parse: ParseOutcome
    }
  | { ok: false; error: string }

interface SchemaField {
  toSchema(): SapphireSchemaNode
  safeParse(value: unknown): { success: boolean; data?: unknown; error?: { issues: unknown[] } }
}

/**
 * Evaluates a user-typed Sapphire schema expression and a sample JSON value.
 * Everything runs client-side; the only blast radius is the user's own tab.
 * Never throws — failures are returned as data.
 */
export function evaluatePlayground(schemaCode: string, sampleValueJson: string): PlaygroundResult {
  let field: SchemaField
  try {
    const a = new Sapphire()
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function('a', `return (${schemaCode})`)
    const result = factory(a) as unknown
    if (!result || typeof (result as SchemaField).toSchema !== 'function') {
      return { ok: false, error: 'Expression did not produce a Sapphire field.' }
    }
    field = result as SchemaField
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  const ir = field.toSchema()

  let jsonSchema: unknown
  try {
    jsonSchema = toJsonSchema(ir)
  } catch (e) {
    jsonSchema = { error: e instanceof Error ? e.message : String(e) }
  }

  let parse: ParseOutcome
  let sampleValue: unknown
  let sampleError: string | undefined
  try {
    sampleValue = JSON.parse(sampleValueJson)
  } catch (e) {
    sampleError = e instanceof Error ? e.message : String(e)
  }
  if (sampleError !== undefined) {
    parse = { success: false, issues: [], sampleError }
  } else {
    const r = field.safeParse(sampleValue)
    parse = r.success
      ? { success: true, data: r.data }
      : { success: false, issues: r.error?.issues ?? [] }
  }

  return { ok: true, ir, typeString: irToTypeString(ir), jsonSchema, parse }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd website && npx vitest run tests/playground-eval.test.ts && cd ..`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/playground-eval.ts website/tests/playground-eval.test.ts
git commit -m "feat(website): sandboxed playground evaluation"
```

---

## Task 7: Playground component (CodeMirror + live output)

**Files:**
- Create: `website/src/components/Playground.astro`

- [ ] **Step 1: Create `website/src/components/Playground.astro`**

```astro
---
const DEFAULT_SCHEMA = `a.object({
  name: a.string().min(2),
  age: a.number().int().min(0),
  email: a.string().email(),
})`
const DEFAULT_SAMPLE = `{ "name": "Ana", "age": 30, "email": "ana@example.com" }`
---
<div class="pg">
  <div class="pg-head">
    <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
    <span class="pg-title">playground — edit the schema, watch it recompute</span>
    <span class="pg-live">live</span>
  </div>
  <div class="pg-body">
    <div class="pg-editor">
      <div class="pane-label">schema</div>
      <div id="pg-schema" data-default={DEFAULT_SCHEMA}></div>
      <div class="pane-label">sample value (JSON)</div>
      <div id="pg-sample" data-default={DEFAULT_SAMPLE}></div>
    </div>
    <div class="pg-output">
      <div class="pg-tabs" role="tablist">
        <button class="pg-tab active" data-tab="type">Type</button>
        <button class="pg-tab" data-tab="ir">IR</button>
        <button class="pg-tab" data-tab="json">JSON Schema</button>
        <button class="pg-tab" data-tab="parse">Parse</button>
      </div>
      <pre id="pg-out" class="pg-out"></pre>
    </div>
  </div>
</div>

<style>
  .pg { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
  .pg-head {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 13px; background: var(--bg-soft); border-bottom: 1px solid var(--border);
    font-size: 12px; color: var(--ink-600);
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .dot.r { background: #e6685b; } .dot.y { background: #e8b13f; } .dot.g { background: #5fb86f; }
  .pg-title { margin-left: 4px; }
  .pg-live {
    margin-left: auto; color: var(--green-600); font-size: 11px;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .pg-live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--green-600); }
  .pg-body { display: flex; flex-wrap: wrap; }
  .pg-editor { flex: 1 1 320px; border-right: 1px solid var(--border); }
  .pg-output { flex: 1 1 320px; }
  .pane-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-400); padding: 7px 12px 3px;
  }
  .pg-tabs { display: flex; border-bottom: 1px solid var(--border); }
  .pg-tab {
    border: none; background: none; font-family: var(--font-sans); cursor: pointer;
    padding: 9px 13px; font-size: 12px; color: var(--ink-400);
  }
  .pg-tab.active { color: var(--sapphire-600); border-bottom: 2px solid var(--sapphire-600); font-weight: 600; }
  .pg-out {
    margin: 0; border: none; border-radius: 0; background: #fff;
    min-height: 200px; font-size: 12.5px; white-space: pre-wrap;
  }
  .pg-out.error { color: var(--red-600); }
  :global(.cm-editor) { font-size: 12.5px; }
  :global(.cm-editor.cm-focused) { outline: none; }
</style>

<script>
  import { EditorView, basicSetup } from 'codemirror'
  import { javascript } from '@codemirror/lang-javascript'
  import { evaluatePlayground } from '../lib/playground-eval'

  function makeEditor(id: string, onChange: () => void): EditorView {
    const host = document.getElementById(id)!
    const initial = host.dataset.default ?? ''
    return new EditorView({
      doc: initial,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) onChange()
        }),
      ],
      parent: host,
    })
  }

  const out = document.getElementById('pg-out') as HTMLPreElement
  let activeTab = 'type'
  let last: ReturnType<typeof evaluatePlayground> | null = null

  function render(): void {
    if (!last) return
    out.classList.remove('error')
    if (!last.ok) {
      out.classList.add('error')
      out.textContent = `Error: ${last.error}`
      return
    }
    if (activeTab === 'type') {
      out.textContent = last.typeString
    } else if (activeTab === 'ir') {
      out.textContent = JSON.stringify(last.ir, null, 2)
    } else if (activeTab === 'json') {
      out.textContent = JSON.stringify(last.jsonSchema, null, 2)
    } else {
      const p = last.parse
      if (p.success) {
        out.textContent = `✓ valid\n\n${JSON.stringify(p.data, null, 2)}`
      } else if (p.sampleError) {
        out.classList.add('error')
        out.textContent = `Sample value is not valid JSON:\n${p.sampleError}`
      } else {
        out.classList.add('error')
        out.textContent = `✗ ${p.issues.length} issue(s)\n\n${JSON.stringify(p.issues, null, 2)}`
      }
    }
  }

  let schemaView: EditorView
  let sampleView: EditorView
  let timer: number | undefined

  function recompute(): void {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      last = evaluatePlayground(schemaView.state.doc.toString(), sampleView.state.doc.toString())
      render()
    }, 200)
  }

  schemaView = makeEditor('pg-schema', recompute)
  sampleView = makeEditor('pg-sample', recompute)

  document.querySelectorAll<HTMLButtonElement>('.pg-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pg-tab').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      activeTab = btn.dataset.tab!
      render()
    })
  })

  last = evaluatePlayground(schemaView.state.doc.toString(), sampleView.state.doc.toString())
  render()
</script>
```

- [ ] **Step 2: Verify build and check**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build + check pass. (The component is not yet placed on a page — this confirms it compiles and CodeMirror bundles.)

- [ ] **Step 3: Commit**

```bash
git add website/src/components/Playground.astro
git commit -m "feat(website): interactive playground component"
```

---

## Task 8: Playground page + embed on the landing page

**Files:**
- Create: `website/src/pages/playground.astro`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1: Create `website/src/pages/playground.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
import Playground from '../components/Playground.astro'
---
<BaseLayout title="Sapphire — playground">
  <section class="pg-page">
    <h1>Playground</h1>
    <p>Edit the schema and the sample value — every panel recomputes live.</p>
    <Playground />
  </section>
  <style>
    .pg-page { max-width: var(--maxw); margin: 0 auto; padding: 36px 22px; }
    .pg-page h1 { margin: 0 0 4px; }
    .pg-page p { color: var(--ink-600); margin: 0 0 20px; }
  </style>
</BaseLayout>
```

- [ ] **Step 2: Embed the playground on the landing page — rewrite `website/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
import Hero from '../components/Hero.astro'
import FeatureRow from '../components/FeatureRow.astro'
import Playground from '../components/Playground.astro'
---
<BaseLayout title="Sapphire — one schema, every ORM">
  <Hero />
  <section class="pg-embed">
    <Playground />
  </section>
  <FeatureRow />
  <style>
    .pg-embed {
      max-width: var(--maxw);
      margin: -34px auto 0;
      padding: 0 22px;
      position: relative;
    }
  </style>
</BaseLayout>
```

- [ ] **Step 3: Verify build, check, and interact**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build + check pass.
Then `cd website && npm run dev`, open the URL: confirm on both `/` and `/playground` you can edit the schema and the Type/IR/JSON Schema/Parse tabs update. Change `a.string()` to `a.string().min(99)` in the sample-failing direction and confirm the Parse tab shows issues. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add website/src/pages
git commit -m "feat(website): playground page and landing embed"
```

---

## Task 9: `remark-rewrite-links.ts` — markdown link rewriting

**Files:**
- Create: `website/src/lib/remark-rewrite-links.ts`
- Test: `website/tests/remark-rewrite-links.test.ts`

- [ ] **Step 1: Write the failing test `website/tests/remark-rewrite-links.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { rewriteDocLink } from '../src/lib/remark-rewrite-links'

// rewriteDocLink(url, fromSlug, base) → rewritten url
describe('rewriteDocLink', () => {
  const base = '/Sapphire'

  it('rewrites a sibling .md link', () => {
    expect(rewriteDocLink('./overview.md', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/concepts/overview',
    )
  })

  it('rewrites a parent-relative .md link', () => {
    expect(rewriteDocLink('../adapters/mongo.md', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/adapters/mongo',
    )
  })

  it('rewrites README.md to the docs index', () => {
    expect(rewriteDocLink('../README.md', 'concepts/fields', base)).toBe('/Sapphire/docs')
  })

  it('preserves an anchor on a .md link', () => {
    expect(rewriteDocLink('./validation.md#abortearly', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/concepts/validation#abortearly',
    )
  })

  it('leaves an external link untouched', () => {
    expect(rewriteDocLink('https://github.com/x/y', 'concepts/fields', base)).toBe(
      'https://github.com/x/y',
    )
  })

  it('leaves an anchor-only link untouched', () => {
    expect(rewriteDocLink('#section', 'concepts/fields', base)).toBe('#section')
  })

  it('leaves a non-.md relative link untouched', () => {
    expect(rewriteDocLink('./image.png', 'concepts/fields', base)).toBe('./image.png')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd website && npx vitest run tests/remark-rewrite-links.test.ts && cd ..`
Expected: FAIL — `rewriteDocLink` not found.

- [ ] **Step 3: Implement `website/src/lib/remark-rewrite-links.ts`**

```ts
import { visit } from 'unist-util-visit'

/**
 * Rewrites a Markdown link URL that points at a `.md` doc file into a site
 * route. `fromSlug` is the slug of the document the link lives in (e.g.
 * `concepts/fields`); `base` is the site base path (e.g. `/Sapphire`).
 * Non-`.md`, external, and anchor-only links are returned unchanged.
 */
export function rewriteDocLink(url: string, fromSlug: string, base: string): string {
  if (/^[a-z]+:/i.test(url) || url.startsWith('#') || url.startsWith('/')) return url

  const [path, anchor] = url.split('#')
  if (!path.endsWith('.md')) return url

  // resolve `path` relative to the directory of `fromSlug`
  const fromDir = fromSlug.includes('/') ? fromSlug.slice(0, fromSlug.lastIndexOf('/')) : ''
  const segments = fromDir ? fromDir.split('/') : []
  for (const seg of path.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') segments.pop()
    else segments.push(seg)
  }

  let slug = segments.join('/').replace(/\.md$/, '')
  // README.md is the docs index
  slug = slug.replace(/(^|\/)README$/i, '')

  const cleanBase = base.replace(/\/$/, '')
  const route = slug ? `${cleanBase}/docs/${slug}` : `${cleanBase}/docs`
  return anchor ? `${route}#${anchor}` : route
}

/**
 * Remark plugin factory. Pass `{ base }`. The slug of the file being processed
 * is derived from the vfile's path (`.../docs/<slug>.md`), so every intra-doc
 * link resolves relative to its own document.
 */
export function remarkRewriteLinks(options: { base: string }) {
  return function transformer(
    tree: unknown,
    file: { path?: string },
  ): void {
    let fromSlug = ''
    if (typeof file.path === 'string') {
      const m = file.path.replace(/\\/g, '/').match(/\/docs\/(.+)\.md$/i)
      if (m) fromSlug = m[1]
    }
    visit(tree as never, 'link', (node: { url: string }) => {
      node.url = rewriteDocLink(node.url, fromSlug, options.base)
    })
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd website && npx vitest run tests/remark-rewrite-links.test.ts && cd ..`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/remark-rewrite-links.ts website/tests/remark-rewrite-links.test.ts
git commit -m "feat(website): markdown doc-link rewriter"
```

---

## Task 10: Docs content collection, route, layout, and sidebar

**Files:**
- Create: `website/src/content.config.ts`
- Create: `website/src/components/Sidebar.astro`
- Create: `website/src/layouts/DocsLayout.astro`
- Create: `website/src/pages/docs/[...slug].astro`

- [ ] **Step 1: Create `website/src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../docs' }),
})

export const collections = { docs }
```

- [ ] **Step 2: Create `website/src/components/Sidebar.astro`**

```astro
---
import { getCollection } from 'astro:content'
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
const entries = await getCollection('docs')

// group by top-level folder; README is the index
const groups: Record<string, { id: string; title: string }[]> = {}
for (const entry of entries) {
  const id = entry.id // e.g. 'concepts/fields-and-modifiers' or 'README'
  if (/^readme$/i.test(id)) continue
  const folder = id.includes('/') ? id.split('/')[0] : 'guides'
  const title = id.split('/').pop()!.replace(/-/g, ' ')
  ;(groups[folder] ??= []).push({ id, title })
}
for (const list of Object.values(groups)) list.sort((a, b) => a.title.localeCompare(b.title))
const order = ['getting-started', 'concepts', 'adapters', 'recipes', 'meta', 'guides']
const sortedFolders = Object.keys(groups).sort(
  (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99),
)
const current = Astro.url.pathname
---
<aside class="sidebar">
  <a class="idx" href={`${base}/docs`}>Documentation</a>
  {sortedFolders.map((folder) => (
    <div class="group">
      <div class="group-name">{folder.replace(/-/g, ' ')}</div>
      {groups[folder].map((d) => {
        const href = `${base}/docs/${d.id}`
        return (
          <a class:list={['link', { on: current === href }]} href={href}>{d.title}</a>
        )
      })}
    </div>
  ))}
</aside>

<style>
  .sidebar { width: 220px; flex-shrink: 0; padding: 24px 14px; border-right: 1px solid var(--border); }
  .idx { font-weight: 700; color: var(--ink-900); display: block; margin-bottom: 12px; }
  .group { margin-bottom: 16px; }
  .group-name {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--sapphire-600); font-weight: 700; margin-bottom: 5px;
  }
  .link { display: block; padding: 3px 0; color: var(--ink-600); font-size: 13.5px; text-transform: capitalize; }
  .link.on { color: var(--sapphire-600); font-weight: 600; }
</style>
```

- [ ] **Step 3: Create `website/src/layouts/DocsLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro'
import Sidebar from '../components/Sidebar.astro'
interface Props {
  title: string
}
const { title } = Astro.props
---
<BaseLayout title={title}>
  <div class="docs-shell">
    <Sidebar />
    <article class="docs-body">
      <slot />
    </article>
  </div>
  <style>
    .docs-shell { display: flex; max-width: var(--maxw); margin: 0 auto; align-items: flex-start; }
    .docs-body { flex: 1; min-width: 0; padding: 28px 28px 40px; }
    .docs-body :global(h1) { margin-top: 0; }
    .docs-body :global(pre) { font-size: 13px; }
    .docs-body :global(img) { max-width: 100%; }
  </style>
</BaseLayout>
```

- [ ] **Step 4: Create `website/src/pages/docs/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content'
import DocsLayout from '../../layouts/DocsLayout.astro'

export async function getStaticPaths() {
  const entries = await getCollection('docs')
  return entries.map((entry) => {
    const isIndex = /^readme$/i.test(entry.id)
    return {
      params: { slug: isIndex ? undefined : entry.id },
      props: { entry },
    }
  })
}

const { entry } = Astro.props
const { Content } = await render(entry)
const title = /^readme$/i.test(entry.id)
  ? 'Sapphire — documentation'
  : `${entry.id.split('/').pop()!.replace(/-/g, ' ')} — Sapphire docs`
---
<DocsLayout title={title}>
  <Content />
</DocsLayout>
```

- [ ] **Step 5: Wire the link rewriter into `astro.config.mjs`**

Replace `website/astro.config.mjs` with:

```js
import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { remarkRewriteLinks } from './src/lib/remark-rewrite-links.ts'

const BASE = '/Sapphire'

export default defineConfig({
  site: 'https://ascendance-hub.github.io',
  base: BASE,
  markdown: {
    remarkPlugins: [[remarkRewriteLinks, { base: BASE }]],
  },
  vite: {
    resolve: {
      alias: {
        '@ascendance-hub/sapphire-core': fileURLToPath(
          new URL('../packages/core/src/index.ts', import.meta.url),
        ),
        '@ascendance-hub/sapphire-json-schema': fileURLToPath(
          new URL('../packages/json-schema/src/index.ts', import.meta.url),
        ),
      },
    },
  },
})
```

- [ ] **Step 6: Verify the docs build**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build succeeds; the output contains one HTML file per markdown doc — confirm `website/dist/docs/concepts/overview/index.html` and `website/dist/docs/index.html` exist.
Then `cd website && npm run dev`, open `/docs` and click through several pages: confirm the sidebar highlights the current page and intra-doc links navigate correctly. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add website/src website/astro.config.mjs
git commit -m "feat(website): render all docs with sidebar navigation"
```

---

## Task 11: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy docs website

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install --no-audit --no-fund
      - run: npm run build --workspace @ascendance-hub/sapphire-website
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/pages.yml','utf8'); if(!y.includes('deploy-pages')) throw new Error('bad'); console.log('workflow OK')"`
Expected: prints `workflow OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci(website): deploy docs site to GitHub Pages"
```

- [ ] **Step 4: Note for the maintainer (no action in this plan)**

After this branch merges to `main`, the repo owner must enable GitHub Pages with **Source: GitHub Actions** in repo Settings → Pages. The workflow then publishes on every push to `main`. The site will be live at `https://ascendance-hub.github.io/Sapphire`.

---

## Task 12: Full verification and final commit

**Files:** none (verification only)

- [ ] **Step 1: Run the website unit tests**

Run: `cd website && npm run test && cd ..`
Expected: all tests in `ir-to-type.test.ts`, `playground-eval.test.ts`, `remark-rewrite-links.test.ts` pass.

- [ ] **Step 2: Full website build + type check**

Run: `cd website && npm run build && npm run check && cd ..`
Expected: build succeeds, `astro check` reports 0 errors, 0 warnings.

- [ ] **Step 3: Confirm the core monorepo is unaffected**

Run: `npm run build && npm test`
Expected: the four packages still build and all 825 tests pass — the website workspace did not disturb them.

- [ ] **Step 4: Preview the production build**

Run: `cd website && npm run preview` and open the printed URL. Walk the golden path: landing hero renders, playground recomputes on edit, `/playground` works, `/docs` lists every section, a deep doc page renders with working sidebar + intra-doc links. Stop the preview server.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore(website): final verification fixes"
```

(Skip if Steps 1-4 required no changes.)

---

## Self-review notes

- **Spec coverage:** landing (T4, T8), playground depth A (T5-T8), all 25 docs (T10), theme B (T2), Astro build tool (T1), GitHub Pages (T11), single-source docs via content collection (T10), link rewriting (T9-T10), unit tests for the three pure modules (T5, T6, T9). All spec sections map to a task.
- **Type consistency:** `evaluatePlayground` returns `PlaygroundResult` (T6) consumed verbatim by `Playground.astro` (T7). `irToTypeString` (T5) is imported by `playground-eval.ts` (T6). `rewriteDocLink` (T9) is the pure unit-tested function; `remarkRewriteLinks` (T9) wraps it and derives the source slug from the vfile path — implemented once, not modified later.
- **Known constraint:** Astro/CodeMirror exact minor versions may differ at install time; if `astro@^5.6.0` resolves to a newer 5.x with API changes to the content loader, consult the Astro 5 docs for `glob()` — the `base` option is stable across 5.x.
