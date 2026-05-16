# Native MongoDB adapter — `@ascendance-hub/sapphire-bson`

The Mongo adapter converts a Sapphire IR (`SapphireSchemaNode`) into a MongoDB
**collection validator** — a `{ $jsonSchema: ... }` document you hand to the
native driver when creating or modifying a collection. The database itself then
rejects documents that do not match.

This is the adapter for users on the plain `mongodb` driver — no Mongoose. If
you use Mongoose, reach for [`@ascendance-hub/sapphire-mongoose`](./mongoose.md)
instead.

> **Unofficial.** A community adapter — not affiliated with, sponsored, or endorsed by MongoDB, Inc.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-bson
```

`@ascendance-hub/sapphire-core` is a peer dependency. `mongodb` is an **optional**
peer dependency — `toBsonSchema` emits a plain object and never imports the
driver, so you only need `mongodb` installed to actually create the collection.

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your
application entry point:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'

registerAdapter('bson', toBsonSchema)

export const a = new Sapphire({ defaultAdapter: 'bson' })
```

`registerAdapter` is process-global. The Mongoose adapter registers under the
separate name `'mongoose'`, so both can coexist in one process.

## Quickstart

```ts
import { MongoClient } from 'mongodb'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'
import { a } from './sapphire'

const User = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

const validator = toBsonSchema(User.toSchema())
// → { $jsonSchema: { bsonType: 'object', required: [...], properties: {...} } }

const client = new MongoClient(process.env.MONGO_URL!)
await client.connect()
const db = client.db('app')

await db.createCollection('users', { validator })
// or, on an existing collection:
await db.command({ collMod: 'users', validator })
```

`field.getSchema('bson')` is sugar for `toBsonSchema(field.toSchema())` once
the adapter is registered.

## IR → `$jsonSchema` mapping

`toBsonSchema` walks the IR and emits MongoDB's flavor of JSON Schema —
`bsonType` instead of `type`, BSON type names, everything inlined (no `$ref`).

| IR `kind` | `$jsonSchema` output                                            | Notes                                                                                                                                                                                                                                                                    |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `string`  | `{ bsonType: 'string' }`                                        | `minLength`/`maxLength`/`length` direct. `regex`/`startsWith`/`endsWith` → `pattern` (multiple → `allOf`). `format: email`/`uuid` → `pattern`. `format: url` is dropped (see Limitations).                                                                               |
| `number`  | `{ bsonType: 'number' }` or `{ bsonType: 'int' }`               | `.int()` → `bsonType: 'int'`; otherwise `'number'` (matches int/long/double/decimal). `min`/`max`/`multipleOf` map directly. Exclusive bounds (`.gt()`/`.lt()`) use JSON Schema draft-4 form — `minimum`/`maximum` plus a boolean `exclusiveMinimum`/`exclusiveMaximum`. |
| `boolean` | `{ bsonType: 'bool' }`                                          |                                                                                                                                                                                                                                                                          |
| `date`    | `{ bsonType: 'date' }`                                          |                                                                                                                                                                                                                                                                          |
| `object`  | `{ bsonType: 'object', properties, required }`                  | `required` lists every required key; omitted when empty. Named objects (`.name(...)`) are inlined — there is no `$ref`.                                                                                                                                                  |
| `array`   | `{ bsonType: 'array', items }`                                  | `minItems`/`maxItems`/`length` direct.                                                                                                                                                                                                                                   |
| `tuple`   | `{ bsonType: 'array', items: [...], additionalItems: false }`   | `items` is an array of per-position schemas; `minItems`/`maxItems` pinned to the tuple length.                                                                                                                                                                           |
| `union`   | `{ anyOf: [...] }`                                              | Requires MongoDB 5.0+ (when `$jsonSchema` gained `anyOf`).                                                                                                                                                                                                               |
| `literal` | `{ enum: [value] }`                                             |                                                                                                                                                                                                                                                                          |
| `enum`    | `{ enum: [...values] }`                                         |                                                                                                                                                                                                                                                                          |
| `record`  | `{ bsonType: 'object', additionalProperties: <values schema> }` |                                                                                                                                                                                                                                                                          |
| `ref`     | `{ bsonType: 'objectId' }`                                      | A reference is stored as an ObjectId — server-side validators are self-contained, so there is no `$ref`.                                                                                                                                                                 |

### Nullable

`a.string().nullable()` lifts the type into a `bsonType` array —
`{ bsonType: ['string', 'null'] }`. A nullable `union`/`literal`/`enum` (which
has no plain `bsonType`) wraps in `anyOf` with an explicit `{ bsonType: 'null' }`
branch instead.

### `description`

`describe(text)` becomes the `$jsonSchema` `description` keyword.

## `_id`

There is no special handling — an `_id` is just another property:

- **Declare an `_id` field** and it emits like any other property (and lands in
  `required` if required): `a.object({ _id: a.string(), ... })`.
- **Declare no `_id`** and the validator says nothing about it — MongoDB injects
  an `ObjectId` `_id` server-side as usual.
- An `_id` of `a.ref('User')` emits `{ bsonType: 'objectId' }`.

## `.adapter('bson', opts)` escape hatch

Values from `.adapter('bson', { ... })` are read from `node.meta.bson` and
merged into the emitted node, with a blacklist of keys the adapter computes
itself:

```ts
const META_BLACKLIST = new Set(['bsonType', 'type', 'required', 'enum', 'properties', 'items'])
```

> [!WARNING]
> **MongoDB rejects unknown `$jsonSchema` keywords.** `db.createCollection` throws
> if the validator contains a keyword it does not recognize. Only pass keys that
> are valid `$jsonSchema` keywords (`title`, `minProperties`, `maxProperties`,
> `patternProperties`, …) through the escape hatch.

## `BsonValidatorOptions`

The second argument to `toBsonSchema(node, options?)`:

| Option                 | Default     | Effect                                                                                                                                                                         |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `additionalProperties` | _(omitted)_ | When set, emits `additionalProperties` on every object schema. Set `false` for a strict, closed-shape validator — the root object still permits MongoDB's auto-injected `_id`. |

```ts
toBsonSchema(User.toSchema(), { additionalProperties: false })
```

## Typed documents — `BsonDoc`

`BsonDoc<F>` is a type-only helper for the native driver's
`Collection<TSchema>`:

```ts
import type { Collection } from 'mongodb'
import type { BsonDoc } from '@ascendance-hub/sapphire-bson'

const users: Collection<BsonDoc<typeof User>> = db.collection('users')
```

It is a thin alias over core's `Infer` — the document shape is a purely
type-level concern, so there is no runtime helper.

## Limitations

> [!WARNING]
> **A collection validator only validates.** It does not transform input or fill
> defaults. `transforms` (`trim`/`toLowerCase`/`toUpperCase`), `default(v)`,
> `coerce()`, and the numeric `finite`/`safe` checks have no `$jsonSchema`
> equivalent and are **not** emitted. Run them client-side via `parse()` /
> `safeParse()` before inserting.

> [!WARNING]
> **`format('url')` is not enforced server-side.** There is no exported URL
> regex; email and uuid become `pattern`, but `url` is dropped from the
> validator. Validate URLs client-side via `parse()`.

> [!WARNING]
> **`unique`/`index` are not part of the validator.** A `$jsonSchema` validator
> cannot declare indexes — create them with `db.collection.createIndex(...)`.

> [!WARNING]
> **`union` needs MongoDB 5.0+.** `anyOf` in `$jsonSchema` is unavailable on
> MongoDB 4.x.

## Related

- [Mongoose adapter](./mongoose.md) — the Mongoose-based sibling package.
- [Fields and modifiers](../concepts/fields-and-modifiers.md) — what each IR kind models.
- [Refs and relations](../concepts/refs-and-relations.md) — ref lifecycle across adapters.
- [Escape hatch](../concepts/escape-hatch.md) — universal `.adapter(name, opts)` contract.
- [Recipes → One schema, many adapters](../recipes/one-schema-many-adapters.md).
