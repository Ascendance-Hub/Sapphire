# @ascendance-hub/sapphire-mongo

Mongoose adapter for [Sapphire](https://github.com/Ascendance-Hub/Sapphire). Converts a Sapphire IR (`SapphireSchemaNode`) into a `mongoose.Schema` (top-level) or a `SchemaTypeDefinition` (nested).

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongo mongoose
```

`@ascendance-hub/sapphire-core` and `mongoose` are peer dependencies — they must be installed alongside this package.

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your application entry point:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'

registerAdapter('mongo', toMongoSchema)

export const a = new Sapphire({ defaultAdapter: 'mongo' })
```

## Quickstart

```ts
import mongoose from 'mongoose'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'
import { a } from './sapphire'

const User = a
  .object({
    name: a.string().min(1),
    email: a.string().email().unique(),
    age: a.number().int().min(0).optional(),
  })
  .name('User')
  .timestamps()
  .index(['email'], { unique: true })

const UserSchema = toMongoSchema(User.toSchema()) as mongoose.Schema
const UserModel = mongoose.model('User', UserSchema)
```

## IR mapping table

| IR `kind` | Mongoose output                                      | Notes                                                                                     |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `string`  | `{ type: String, ... }`                              | `format` (email/url/uuid), `startsWith`/`endsWith` via custom validators.                 |
| `number`  | `{ type: Number, ... }`                              | `exclusiveMin`/`Max`/`int`/`multipleOf`/`finite`/`safe` via `validate: [...]`.            |
| `boolean` | `{ type: Boolean, ... }`                             | —                                                                                         |
| `date`    | `{ type: Date, min, max }`                           | —                                                                                         |
| `object`  | `mongoose.Schema` (top-level) or sub-Schema (nested) | Subdocs default to `_id: false`. Override with `toMongoSchema(node, { subdocId: true })`. |
| `array`   | `{ type: [item], ... }`                              | Homogeneous; item is recursively converted.                                               |
| `tuple`   | `{ type: [Mixed], validate: length }`                | Per-position type-checking lives in core (`safeParse`); Mongoose only checks length.      |
| `union`   | `{ type: Mixed }`                                    | Validation lives in core. No Mongoose-level checks.                                       |
| `literal` | `{ type: <ctor>, enum: [value] }`                    | Constructor inferred from literal type.                                                   |
| `enum`    | `{ type: <ctor>, enum: [...values] }`                | Constructor String for string-enum, Number for number-enum.                               |
| `record`  | `{ type: Map, of: <values> }` or `Mixed`             | `Map` when keyField is string/enum/literal; `Mixed` fallback otherwise.                   |
| `ref`     | `{ type: ObjectId, ref: <name> }`                    | `ref` resolves to the named schema's `name(...)`.                                         |

### Schema-level

- `ObjectField.timestamps()` → `new Schema(def, { timestamps: true })`.
- `ObjectField.index(keys, opts?)` → `schema.index({ ...keys: 1 }, opts)` per call (multiple calls accumulate).
- `ObjectField.adapter('mongo', { collection: 'people' })` → `new Schema(def, { collection: 'people' })`.

## `.adapter('mongo', opts)` escape hatch

Any options passed via `.adapter('mongo', { ... })` are merged into the Mongoose `SchemaTypeOptions` for that field (last-wins). Common keys:

| Key           | Effect                                                              |
| ------------- | ------------------------------------------------------------------- |
| `sparse`      | Mongoose-native `sparse: true` (sparse index).                      |
| `collation`   | Mongoose-native `collation`.                                        |
| `description` | Preserved on `SchemaType.options.description` (introspection only). |
| `collection`  | (top-level only) Sets `Schema.options.collection`.                  |

**Blacklist:** `type` and `required` cannot be overridden via `.adapter('mongo', ...)`. They are always Sapphire-controlled.

## `MongoAdapterOptions`

| Option     | Default  | Effect                                                                                       |
| ---------- | -------- | -------------------------------------------------------------------------------------------- |
| `subdocId` | `false`  | Whether nested object Schemas auto-add `_id`. Default deviates from Mongoose's `true`.       |
| `rootId`   | `'auto'` | Root document `_id` strategy. `'auto'` = Mongoose default; `'none'` = emit `{ _id: false }`. |

```ts
toMongoSchema(node, { subdocId: true })
```

### Custom root `_id`

Declare a field literally named `_id` to use a custom identity instead of the
auto-generated `ObjectId` — Mongoose honors a declared `_id` path:

```ts
const User = a.object({ _id: a.string(), name: a.string() })
toMongoSchema(User.toSchema()) // String _id, no auto ObjectId
```

`rootId: 'none'` strips the root `_id` entirely (ignored when the schema
declares its own `_id`).

## Limitations

- **Tuple per-position type-checking** is not enforced at the Mongoose level. Mongoose validators only check the array length. For full tuple validation (per-position type), use `safeParse` from core.
- **Union** is materialized as `Mixed` with no Mongoose-level validation. Use core's `safeParse` for the canonical check.
- **`nullable`** has no dedicated Mongoose flag. A non-required field accepts `null` implicitly. Sapphire IR `nullable: true` is a no-op in this adapter.
- **`coerce`** is ignored — Mongoose has its own cast layer that handles coercion universally; opt out via core (`safeParse`) before persisting if needed.
- **Subdoc `_id: false`** is the default. Set `subdocId: true` to opt back in to Mongoose's default.
- **Auto-register removed.** Call `registerAdapter('mongo', toMongoSchema)` once in your entry point.

## License

BSD-3-Clause
