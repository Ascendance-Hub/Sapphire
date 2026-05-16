# One schema, many adapters

## Use case

You persist your domain in MongoDB (via Mongoose) **and** expose a public REST/MCP API whose contract you publish as JSON Schema. Both should describe the exact same shape — when the model gains a field, both surfaces should update in lockstep, without anyone having to remember to edit two files.

Sapphire's IR is the single source of truth. Adapters are pure functions over it; they don't talk to each other and they don't mutate state. Registering more than one is the whole point.

## End-to-end example

```ts
import mongoose from 'mongoose'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

// Register both adapters once.
registerAdapter('mongoose', toMongooseSchema)
registerAdapter('json-schema', toJsonSchema)

const a = new Sapphire()

// Define the schema ONCE.
const Product = a
  .object({
    sku: a.string().regex(/^[A-Z0-9-]{4,16}$/),
    name: a.string().min(1),
    priceCents: a.number().int().min(0),
    tags: a.array(a.string()).default([]),
    archived: a.boolean().default(false),
  })
  .name('Product')
  .timestamps()
  .index(['sku'], { unique: true })

// Adapter #1 — Mongoose for persistence.
const ProductMongoSchema = Product.getSchema('mongoose') as mongoose.Schema
const ProductModel = mongoose.model('Product', ProductMongoSchema)

// Adapter #2 — JSON Schema for the public API contract.
const ProductJsonSchema = toJsonSchema(Product.toSchema(), {
  $id: 'https://api.example.com/schemas/product.json',
  additionalProperties: false,
})

// Both adapters walked the same IR. Sku regex, priceCents min, tags default,
// timestamps, and the unique sku index are all reflected — each adapter as it
// can represent them.
```

## Step by step

1. **Register every adapter you need.** `registerAdapter` is process-global; do it once at app startup. Calling twice with the same name throws — keep registrations out of library code.
2. **Define the schema once.** Use the field DSL, give it a `.name(...)` if it'll be referenced or emitted as a JSON Schema `$defs` entry.
3. **Call `getSchema(name)` (or the explicit adapter function) per consumer.** Both reads walk `Product.toSchema()` — same IR, two outputs. There is no shared mutable state between them.
4. **Trust the IR as the contract.** Any field you add, any modifier you chain, any `.index(...)` call updates the IR — and both downstream outputs pick it up the next time you call them.

## Variations

### Per-adapter escape hatches on the same field

When two adapters need slightly different behaviour for the same field, layer `.adapter(...)` calls. Each one writes to its own slot in `node.meta`:

```ts
const email = a
  .string()
  .email()
  .adapter('mongoose', { sparse: true, collation: { locale: 'en', strength: 2 } })
  .adapter('json-schema', { examples: ['ada@example.com'], 'x-internal-pii': true })
```

The Mongoose adapter reads `meta.mongoose`, JSON Schema reads `meta['json-schema']`. Neither sees the other's slot.

See [Concepts → Escape hatch](../concepts/escape-hatch.md) for the full per-adapter blacklist tables.

### Driving the same field through three adapters

```ts
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
registerAdapter('drizzle', toDrizzleSchema)

// Drizzle requires a `dialect` option — call the adapter directly instead of
// going through `getSchema()` (which only accepts an adapter name, no options).
const productPgTable = toDrizzleSchema(Product.toSchema(), { dialect: 'pg' })
```

The same `Product` field now backs Mongo + JSON Schema + Drizzle Postgres. The Drizzle adapter sees the same IR; what doesn't map cleanly (e.g. `regex` for `sku`) is a no-op at the DB level — the constraint stays in `safeParse` only. See [Adapters → Drizzle](../adapters/drizzle.md).

### When NOT to share a schema

Two outputs sharing a schema only works when **the shape is genuinely the same**. If your Mongo document stores rich subdocuments and the public API only exposes a flat projection, force the split:

```ts
const ProductDocument = a.object({ /* full shape */ }).name('ProductDocument')
const ProductDTO = a.object({ /* flat projection */ }).name('ProductDTO')

// Map between them in your controller:
function toDTO(doc: Infer<typeof ProductDocument>): Infer<typeof ProductDTO> { ... }
```

Resist the urge to bend one schema to cover two shapes via escape hatches and `.transform`s. Two schemas with an explicit mapping is clearer and tests cleanly.

> [!WARNING]
> **`registerAdapter` is process-global.** Two modules registering different functions under the same name will trample each other (the second wins). Centralize registrations in one bootstrap file.

> [!WARNING]
> **Adapters can disagree on what they represent.** A `.unique()` modifier survives in Mongo (`unique: true`) but is a no-op in JSON Schema (it's a database concern, not a contract concern). That's by design — see each adapter's "Limitations" section for the exhaustive list.

## See also

- [Concepts → Overview](../concepts/overview.md) — the DSL → IR → adapter mental model.
- [Concepts → Escape hatch](../concepts/escape-hatch.md) — per-adapter overrides via `.adapter(name, opts)`.
- [Recipes → Share types with the frontend](./share-types-with-frontend.md) — the type/JSON Schema sibling of this recipe.
- [Recipes → Custom adapter](./custom-adapter.md) — when the built-in adapters aren't enough.
