<!-- Code in this guide is verified by tests/docs-examples/escape-hatch.test.ts -->

# Escape hatch — `.adapter(name, opts)`

Sapphire's core surface deliberately stops at "things every adapter can reasonably represent". When you need something that's specific to one backend — a Mongoose `sparse` index, a JSON Schema `examples` array, a Drizzle `.notNull()` chained call — `.adapter(name, opts)` is the universal escape hatch. The values you pass land in `node.meta[name]` on the IR; each adapter decides how (and whether) to read its slot.

## Minimal example

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
import { Sapphire, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()
const name = a
  .string()
  .adapter('mongo', { sparse: true })
  .adapter('json-schema', { 'x-internal': true })

const node = name.toSchema() as SapphireSchemaNode
// node.meta === { mongo: { sparse: true }, 'json-schema': { 'x-internal': true } }
```

`.adapter(name, opts)` returns a new field (immutable, like every other modifier). Repeated calls with the same name merge.

## Per-adapter behavior

### Mongo — passthrough except blacklisted keys

`meta.mongo` is merged **last** into every Mongoose `SchemaTypeDefinition`. It wins over Sapphire-derived options (e.g. you can override `def.minlength`), except for the blacklist: `type` and `required` are always Sapphire-controlled.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const a = new Sapphire()
const user = a.object({
  email: a.string().adapter('mongo', { sparse: true, collation: { locale: 'en' } }),
})
const schema = toMongoSchema(user.toSchema()) as mongoose.Schema
const path = schema.path('email') as unknown as {
  options: { sparse?: boolean; collation?: { locale: string }; type: unknown }
}
// path.options.sparse === true
// path.options.collation === { locale: 'en' }
// path.options.type === String  (blacklisted — escape-hatch can't override)
```

Common keys: `sparse`, `collation`, `validate`, `select`, `alias`, `immutable`, `lowercase`/`uppercase`/`trim` overrides, custom getters/setters. At the object-schema level (object's `.adapter('mongo', { collection: 'users' })`), `collection` is honored for `mongoose.SchemaOptions.collection`.

### JSON Schema — passthrough with `type` and `$ref` blacklisted

`meta['json-schema']` is merged into the emitted node, _after_ Sapphire's derived keys, with `type` and `$ref` blacklisted (those are Sapphire-controlled — overriding them breaks the schema). Useful for `title`, `description` (also surfaced via `.describe(...)`), `examples`, `deprecated`, and any custom `x-*` extension keyword.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const name = a.string().adapter('json-schema', {
  title: 'User Name',
  examples: ['Ada Lovelace'],
  type: 'integer', // ignored — blacklisted
  $ref: '#/nope', // ignored — blacklisted
})

const out = toJsonSchema(name.toSchema()) as Record<string, unknown>
// out.title === 'User Name'
// out.examples === ['Ada Lovelace']
// out.type === 'string'      (unchanged)
// out.$ref === undefined     (blacklisted)
```

### Drizzle — chained methods, optionally per-dialect

`meta.drizzle` keys are interpreted as **method names to call on the column builder**, in declaration order. Values control how the method is invoked:

- `true` → call with no arguments (`col.unique()`).
- An array → spread as arguments (`col.references(...args)`).
- Anything else → pass as the single argument (`col.default('x')`).

A method that doesn't exist on the column type is **silently skipped** — this is intentional (some methods exist only on certain column types or dialects). The flip side is that typos go undetected.

```ts
const user = a.object({
  email: a.string().adapter('drizzle', { unique: true }),
})
```

#### Per-dialect sub-keys

Sub-keys `pg`, `mysql`, and `sqlite` apply only when the matching dialect is selected. Top-level keys still apply for every dialect.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const user = a
  .object({
    name: a.string().adapter('drizzle', {
      pg: { unique: true }, // only when dialect: 'pg'
      mysql: { unique: false }, // only when dialect: 'mysql'
    }),
  })
  .name('users')

const pgTable = toDrizzleSchema(user.toSchema(), {
  dialect: 'pg',
  tables: new DrizzleTableRegistry(),
}) as Record<string, { isUnique?: boolean }>
// pgTable.name.isUnique === true
```

## Pitfalls

> [!WARNING]
> **Escape-hatch values merge LAST.** They win over Sapphire-derived keys in every adapter (except for each adapter's small blacklist — mongo: `type`/`required`; json-schema: `type`/`$ref`). This is a sharp tool: reach for it sparingly and keep close tests.

> [!WARNING]
> **Drizzle's escape hatch silently ignores method names it doesn't recognize.** A typo like `.uniqe` produces a passing typecheck and a column that quietly lacks the constraint you intended. Always assert the column's runtime properties (`isUnique`, `notNull`, etc.) in tests.

> [!WARNING]
> **JSON Schema's escape hatch blacklists `type` and `$ref`.** Trying to override either is a no-op. If you need a different type, drop the Sapphire field and emit a raw object via `options.defs` on the adapter call.

## Related

- [Config](./config.md) — `defaultAdapter`, instance options.
- [Refs and relations](./refs-and-relations.md) — uses `meta` indirectly via the named-schema registry.
- [Recipes → Writing a custom adapter](../recipes/custom-adapter.md).
