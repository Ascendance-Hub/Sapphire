# Contributing

Thanks for your interest in Sapphire. This page covers two things: how to work on the lib itself, and how to publish your own third-party adapter against the public API.

## Repo setup

**Prerequisites:** Node 20+ and npm 10+.

```bash
git clone https://github.com/Ascendance-Hub/Sapphire.git
cd Sapphire
npm install
npm test
npm run build
```

The repo is a monorepo managed by **npm workspaces**:

```
packages/
├── core/           # @ascendance-hub/sapphire-core
├── bson/           # @ascendance-hub/sapphire-bson (native MongoDB driver)
├── mongoose/       # @ascendance-hub/sapphire-mongoose
├── json-schema/    # @ascendance-hub/sapphire-json-schema
└── drizzle/        # @ascendance-hub/sapphire-drizzle
```

Examples and docs live alongside under `examples/` and `docs/`.

## Development workflow

- **Branches.** Cut feature branches off `main` named `feat/<topic>` (or `fix/<topic>`, `docs/<topic>`, `chore/<topic>` to match the commit prefixes).
- **Commits.** Follow the existing prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Keep the subject line under ~72 chars.
- **Changesets.** Every behavior-affecting PR needs a changeset: `npx changeset`. Pick the affected packages and the bump level. Docs-only and internal-tooling PRs may skip this, but bump-patch on all four packages is the convention when changes ship as part of a release.
- **Tests.** Required for new behavior. Vitest is the runner (`npm test`). Type-level expectations use `expectTypeOf` from vitest.

## Running CI locally

CI runs five commands; you can run them in the same order before pushing:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

If `format:check` fails, run `npm run format` to fix.

## Writing a third-party adapter

Sapphire's adapter API is public and stable. You don't need a PR to core to ship an adapter — pick a name, publish a package, and users register it with `registerAdapter(name, fn)`.

### Step 1 — package setup

Name your package `@my-org/sapphire-<name>` (e.g. `@acme/sapphire-prisma`). Declare `@ascendance-hub/sapphire-core` as a **peerDependency** (not a regular dependency — the registry depends on a single core instance per app):

```json
{
  "name": "@acme/sapphire-prisma",
  "peerDependencies": {
    "@ascendance-hub/sapphire-core": "^1.0.0"
  }
}
```

Also declare the ORM you target as a peer (e.g. `prisma`, `drizzle-orm`, `kysely`).

### Step 2 — implement the adapter function

Your adapter is a single function:

```ts
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export function toMyOrm(node: SapphireSchemaNode, options?: unknown): MyOrmOutput {
  switch (node.kind) {
    case 'string':
      /* ... */ break
    case 'number':
      /* ... */ break
    case 'boolean':
      /* ... */ break
    case 'date':
      /* ... */ break
    case 'object':
      /* ... */ break
    case 'array':
      /* ... */ break
    case 'tuple':
      /* ... */ break
    case 'union':
      /* ... */ break
    case 'literal':
      /* ... */ break
    case 'enum':
      /* ... */ break
    case 'record':
      /* ... */ break
    case 'ref':
      /* ... */ break
  }
}
```

The 12 `kind` values are exhaustive — TypeScript will warn if you miss one. If your target can't represent some kind cleanly, pick a fallback (Mongo falls back to `Mixed`, Drizzle to `jsonb`, JSON Schema can usually produce something even if loose). Document the limitation in your README.

### Step 3 — handle the universals on `NodeBase`

Every IR node carries these properties in addition to its `kind`-specific fields:

| Property      | Meaning                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `required`    | Whether the field is required at parse time. Drives "not null" semantics. |
| `nullable`    | Whether `null` is an acceptable value (distinct from missing).            |
| `default`     | Default value applied when the input is `undefined`.                      |
| `description` | Human-readable description (from `.describe(...)`).                       |
| `unique`      | Unique constraint hint (applies to relevant kinds).                       |
| `index`       | Index hint, optionally `{ unique: true }`.                                |
| `enum`        | Constrained value set on the primitive.                                   |
| `meta`        | Adapter-specific blobs keyed by adapter name (your escape hatch).         |
| `message`     | Per-field message overrides — relevant to the validator, not the emitter. |

Read each one if your target supports the concept; otherwise drop it (don't error — adapters are best-effort over the IR).

### Step 4 — implement the escape hatch

Read `node.meta?.<your-adapter-name>` last, after deriving your output from the IR's own properties. Merge those values into your output so users can pass through ORM-specific options Sapphire doesn't model. Pick a tiny blacklist for keys you must keep Sapphire-controlled (e.g. the column type itself), and document it in your README.

> [!NOTE]
> By convention, escape-hatch keys merge **last** in every Sapphire adapter — they win over Sapphire-derived options. Follow the same convention so users have a single mental model.

### Step 5 — register

Export the adapter function and document the one-liner:

```ts
import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMyOrm } from '@acme/sapphire-prisma'

registerAdapter('my-orm', toMyOrm)
```

First-party adapters do **not** auto-register. Yours shouldn't either — explicit registration is what makes the registry tree-shakable and predictable.

### Step 6 — testing

Feed real Sapphire schemas through your adapter and assert the output shape. The pattern from `packages/mongo/tests/`, `packages/json-schema/tests/`, and `packages/drizzle/tests/` is a good reference: construct a small `a.object({ ... })`, call your adapter on `field.toSchema()`, and check the result against the target ORM's runtime APIs. Type tests via `expectTypeOf` are helpful for the `Infer<>` round-trip.

### Step 7 — publish

Standard `npm publish`. Tag your package with the keyword `sapphire-adapter` so users find it via npm search.

## Updating docs

Snippets in `docs/concepts/*.md` are **snippet-pinned** to test files in `packages/core/tests/docs-examples/*.test.ts`. The pinning is a convention, not automation: each code block in a concept doc has a header comment like `<!-- from tests/docs-examples/<name>.test.ts -->`, and the corresponding test file contains the same code as a real assertion. CI catches drift in the test files (vitest will fail); the `.md` is hand-synced.

When you change behavior:

1. Update the test in `packages/core/tests/docs-examples/`.
2. Run `npm test` to make sure it still passes.
3. Update the matching snippet in `docs/concepts/*.md`.

Use GitHub's alert syntax for callouts:

- `> [!WARNING]` — pitfalls and "don't do this".
- `> [!NOTE]` — asides and clarifications.

All user-facing docs are in English. Internal artifacts (changesets, handoffs in `specs/`) may be in Portuguese.

## Pull request checklist

Before opening a PR:

- [ ] Lint, typecheck, test, build, format:check all green locally.
- [ ] New behavior covered by tests (vitest; `expectTypeOf` for type-level).
- [ ] Changeset added if behavior or public API changed.
- [ ] Docs updated if the change is visible to users (`docs/concepts/`, `docs/adapters/`, or a `README.md`).
- [ ] PR title and description match the existing style. Open PRs against `main`.

## See also

- [Architecture](./architecture.md) — the 3-layer model and registry boundary.
- [Design decisions](./design-decisions.md) — why the API looks the way it does.
- [Escape hatch](../concepts/escape-hatch.md) — `.adapter(name, opts)` contract relevant to step 4.
