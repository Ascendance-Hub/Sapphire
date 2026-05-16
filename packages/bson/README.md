# @ascendance-hub/sapphire-bson

Native MongoDB driver adapter for [Sapphire](https://github.com/Ascendance-Hub/Sapphire). Converts a Sapphire IR (`SapphireSchemaNode`) into a MongoDB **collection validator** — a `{ $jsonSchema: ... }` document you hand to the driver so the database itself rejects malformed inserts.

> **Unofficial.** A community adapter — not affiliated with, sponsored, or endorsed by MongoDB, Inc.

> Using Mongoose? See [`@ascendance-hub/sapphire-mongoose`](https://www.npmjs.com/package/@ascendance-hub/sapphire-mongoose) instead.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-bson
```

`@ascendance-hub/sapphire-core` is a peer dependency. `mongodb` is an **optional** peer dependency — `toBsonSchema` emits a plain object and never imports the driver; you only need `mongodb` installed to actually create the collection.

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your application entry point:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'

registerAdapter('bson', toBsonSchema)

export const a = new Sapphire({ defaultAdapter: 'bson' })
```

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

const db = new MongoClient(process.env.MONGO_URL!).db('app')
await db.createCollection('users', { validator })
// or, on an existing collection:
await db.command({ collMod: 'users', validator })
```

## IR → `$jsonSchema` mapping

MongoDB's flavor of JSON Schema — `bsonType` instead of `type`, BSON type names, everything inlined (no `$ref`).

| IR `kind` | `$jsonSchema` output                                          | Notes                                                                                                |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `string`  | `{ bsonType: 'string' }`                                      | `minLength`/`maxLength`/`length` direct. `regex`/`startsWith`/`endsWith`/`email`/`uuid` → `pattern`. |
| `number`  | `{ bsonType: 'number' }` or `{ bsonType: 'int' }`             | `.int()` → `'int'`. `min`/`max`/`multipleOf` direct; exclusive bounds use draft-4 boolean flags.     |
| `boolean` | `{ bsonType: 'bool' }`                                        | —                                                                                                    |
| `date`    | `{ bsonType: 'date' }`                                        | —                                                                                                    |
| `object`  | `{ bsonType: 'object', properties, required }`                | Named objects are inlined — there is no `$ref`.                                                      |
| `array`   | `{ bsonType: 'array', items }`                                | `minItems`/`maxItems`/`length` direct.                                                               |
| `tuple`   | `{ bsonType: 'array', items: [...], additionalItems: false }` | `minItems`/`maxItems` pinned to the tuple length.                                                    |
| `union`   | `{ anyOf: [...] }`                                            | Requires MongoDB 5.0+.                                                                               |
| `literal` | `{ enum: [value] }`                                           | —                                                                                                    |
| `enum`    | `{ enum: [...values] }`                                       | —                                                                                                    |
| `record`  | `{ bsonType: 'object', additionalProperties: <values> }`      | —                                                                                                    |
| `ref`     | `{ bsonType: 'objectId' }`                                    | A reference is stored as an ObjectId.                                                                |

A `nullable()` primitive lifts into a `bsonType` array (`['string', 'null']`); a nullable `union`/`literal`/`enum` wraps in `anyOf` with a `{ bsonType: 'null' }` branch.

## `BsonValidatorOptions`

| Option                 | Default     | Effect                                                                                                                                  |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalProperties` | _(omitted)_ | When set, emits `additionalProperties` on every object. `false` gives a closed shape (the root still permits MongoDB's injected `_id`). |

## `.adapter('bson', opts)` escape hatch

Keys passed via `.adapter('bson', { ... })` are merged into the emitted node. The adapter-computed keys `bsonType`, `type`, `required`, `enum`, `properties`, `items` are blacklisted and cannot be overridden.

**Note:** MongoDB rejects unknown `$jsonSchema` keywords — only pass keys that are valid `$jsonSchema` keywords (`title`, `minProperties`, `patternProperties`, …).

## Typed documents — `BsonDoc`

```ts
import type { Collection } from 'mongodb'
import type { BsonDoc } from '@ascendance-hub/sapphire-bson'

const users: Collection<BsonDoc<typeof User>> = db.collection('users')
```

`BsonDoc<F>` is a type-only alias over core's `Infer` — there is no runtime helper.

## Limitations

- **A validator only validates.** It does not transform input or fill defaults. `transforms`, `default(v)`, `coerce()`, and the numeric `finite`/`safe` checks have no `$jsonSchema` equivalent and are not emitted — run them client-side via `parse()` / `safeParse()`.
- **`format('url')`** is not enforced server-side (no exported URL regex); email and uuid become `pattern`. Validate URLs client-side.
- **`unique` / `index`** are not part of the validator — create indexes with `db.collection.createIndex(...)`.
- **`union`** needs MongoDB 5.0+ (`anyOf` in `$jsonSchema`).

## License

MIT
