# Mongo adapter — `@ascendance-hub/sapphire-mongo`

The Mongo adapter converts a Sapphire IR (`SapphireSchemaNode`) into a `mongoose.Schema` (when the root node is an object) or a `SchemaTypeDefinition` (anywhere else). It is the closest match for Sapphire's modeling style — Mongoose has a similar "schema-as-definition" surface — and is the adapter where the most modifiers survive at the DB level.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongo mongoose
```

Both `@ascendance-hub/sapphire-core` and `mongoose` are **peer dependencies**. The package will not pull them in transitively — install them alongside.

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your application entry point — typically the same module that constructs your `Sapphire` instance:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'

registerAdapter('mongo', toMongoSchema)

export const a = new Sapphire({ defaultAdapter: 'mongo' })
```

`registerAdapter` is process-global. Calling it twice with the same name throws; calling it from a library is discouraged — leave it to the consuming application.

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

const UserSchema = User.getSchema('mongo') as mongoose.Schema
const UserModel = mongoose.model('User', UserSchema)
```

`field.getSchema('mongo')` is sugar for `toMongoSchema(field.toSchema())` once the adapter is registered — the latter is the explicit form when you want to skip the registry.

## IR → Mongoose mapping

Every Sapphire IR `kind` lands somewhere in Mongoose's `SchemaTypeDefinition`. The table below is exhaustive — what isn't covered here is not part of the adapter's surface.

| IR `kind`               | Mongoose output                                      | Notes                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`                | `{ type: String, ... }`                              | `minLength`/`maxLength`/`length` → `minlength`/`maxlength`. `regex` → `match`. `format` (`email`/`url`/`uuid`)/`startsWith`/`endsWith` → custom `validate`. `transforms` → `trim`/`lowercase`/`uppercase` directly. |
| `number`                | `{ type: Number, ... }`                              | `min`/`max` direct. `exclusiveMin`/`exclusiveMax`/`int`/`multipleOf`/`finite`/`safe` → custom `validate`.                                                                                                           |
| `boolean`               | `{ type: Boolean, ... }`                             | Universal modifiers only.                                                                                                                                                                                           |
| `date`                  | `{ type: Date, min, max }`                           | `min`/`max` accept `Date` instances.                                                                                                                                                                                |
| `object` (root)         | `mongoose.Schema`                                    | Top-level — pass directly to `mongoose.model(name, schema)`.                                                                                                                                                        |
| `object` (nested)       | sub-`Schema` wrapped as `{ type: schema, required }` | Subdocs default to `_id: false`. Pass `{ subdocId: true }` to opt back in.                                                                                                                                          |
| `array`                 | `{ type: [item], required }`                         | `item` is `buildField` applied recursively.                                                                                                                                                                         |
| `tuple`                 | `{ type: [Mixed], validate }`                        | Custom validator enforces **length only**. Per-position type-checking lives in core.                                                                                                                                |
| `union`                 | `{ type: Mixed, required }`                          | No DB-level checks — use `safeParse` for the canonical validation.                                                                                                                                                  |
| `literal`               | `{ type: <ctor>, enum: [value] }`                    | Constructor inferred: `Number` for numeric, `Boolean` for boolean, otherwise `String`.                                                                                                                              |
| `enum`                  | `{ type: <ctor>, enum: [...values] }`                | Constructor is `Number` when the first value is numeric, otherwise `String`.                                                                                                                                        |
| `record` (string-keyed) | `{ type: Map, of: <values>, required }`              | When `keys.kind` is `string`, `enum`, or `literal`.                                                                                                                                                                 |
| `record` (other)        | `{ type: Mixed, required }`                          | Mongoose `Map` keys are strings under the hood; non-string keys lose typing.                                                                                                                                        |
| `ref`                   | `{ type: ObjectId, ref: <target>, required }`        | `<target>` is the string passed to the named object's `.name(...)`.                                                                                                                                                 |

### Universal modifiers

These apply to **every** node kind unless noted:

| Modifier      | Effect on Mongoose definition                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `required`    | Always set on the definition (Sapphire owns it — `required: true/false`).                                    |
| `unique`      | `def.unique = true`.                                                                                         |
| `index`       | `def.index = true`. If passed `{ unique: true }`, also sets `def.unique = true`.                             |
| `default(v)`  | `def.default = v`.                                                                                           |
| `describe(s)` | `def.description = s` (introspection only — Mongoose ignores it at validation time).                         |
| `enum([...])` | `def.enum = [...]` (clones the array).                                                                       |
| `nullable()`  | **No-op.** Mongoose accepts `null` on non-required fields implicitly; there is no dedicated `nullable` flag. |

> [!WARNING]
> **`coerce()` is silently dropped.** Mongoose has its own cast layer that handles coercion universally (e.g. `"42"` → `42` for `Number` fields). If you need Sapphire-level coercion to run, pipe the input through `safeParse` before assigning to a Mongoose document.

### Schema-level options

The root-level `ObjectField` carries schema-wide flags that translate to Mongoose `SchemaOptions`:

| Sapphire call                                                | Mongoose effect                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `.name('User')`                                              | Used by `mongoose.model(name, schema)` — the adapter does not call `mongoose.model` itself, it returns the bare `Schema`. |
| `.timestamps()`                                              | `new Schema(def, { timestamps: true })` — Mongoose then auto-fills `createdAt`/`updatedAt`.                               |
| `.index(['email', 'name'], { unique: true })`                | Each call accumulates: `schema.index({ email: 1, name: 1 }, { unique: true })`. Multiple invocations stack.               |
| `.adapter('mongo', { collection: 'people' })` (object-level) | `new Schema(def, { collection: 'people' })`.                                                                              |

## Refs

Sapphire refs resolve **lazily by name**:

```ts
const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'),
  })
  .name('Post')
```

Emits `{ type: ObjectId, ref: 'User', required: true }`. The string lands directly in Mongoose's `ref` slot — Mongoose's `populate('author')` then handles the lookup at query time. The adapter does **not** verify that a model named `'User'` exists; that resolution happens when Mongoose runs the query. If you want a typed ref, use `a.ref(SchemaObj)` instead of the string form — the IR is identical, but the call site is typesafe against your `name(...)` registry.

See [refs-and-relations.md](../concepts/refs-and-relations.md) for the full ref lifecycle.

## `.adapter('mongo', opts)` escape hatch

Values from `.adapter('mongo', { ... })` are read from `node.meta.mongo` and merged into the field's Mongoose definition **last** (after Sapphire-derived keys). They win on conflicts, with one exception — the blacklist:

```ts
const META_BLACKLIST = new Set(['type', 'required'])
```

`type` and `required` are always Sapphire-controlled; trying to override them via the escape hatch is a no-op.

Common keys:

| Key                              | Effect                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `sparse`                         | Mongoose-native `sparse: true` (sparse index).                                            |
| `collation`                      | Mongoose-native `collation: { locale: ... }`.                                             |
| `validate`                       | Adds a custom Mongoose validator. Merged with Sapphire-derived ones if you pass an array. |
| `select`                         | `select: false` to omit the field by default in query results.                            |
| `immutable`                      | Lock the field after creation.                                                            |
| `alias`                          | Mongoose alias path.                                                                      |
| `description`                    | Mongoose `SchemaType.options.description` — surfaces in introspection.                    |
| `collection` (object-level only) | `Schema.options.collection`.                                                              |

Any other key Mongoose accepts on a `SchemaTypeDefinition` is honored verbatim — the adapter simply copies the entries onto the definition object.

## `MongoAdapterOptions`

The second argument to `toMongoSchema(node, options?)`:

| Option     | Default | Effect                                                                                                                              |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `subdocId` | `false` | Whether nested object Schemas auto-add `_id`. Default deviates from Mongoose's `true` — most apps don't need `_id` on subdocuments. |

```ts
toMongoSchema(node, { subdocId: true })
```

## Limitations

> [!WARNING]
> **Tuples enforce length only at the DB level.** Per-position type checking lives in `safeParse` — Mongoose receives `[Mixed]` plus a length validator. If you need per-position checks before persistence, run `safeParse` on the value first.

> [!WARNING]
> **Unions degrade to `Mixed`.** No Mongoose-level validation. Pair with `safeParse` to get the discriminated-union check.

> [!WARNING]
> **`record` with non-string keys falls back to `Mixed`.** Mongoose's `Map` keys are always strings — `a.record(a.number(), ...)` loses key typing in the DB. The `keys.kind ∈ { string, enum, literal }` path uses `Map` correctly.

> [!WARNING]
> **`nullable()` is a no-op.** Mongoose has no dedicated nullable flag; non-required fields accept `null` implicitly. If you need strict `null` rejection, validate via `safeParse`.

> [!WARNING]
> **`nullable() + required` differs across Sapphire and Mongoose.** Sapphire treats `null` as a valid value when `nullable: true` is set. Mongoose, by default, treats `null` as missing for the `required` check. Result: a field declared as `a.string().nullable()` (with the default `required: true`) will pass `Sapphire.safeParse(null)` but Mongoose `.validate()` will reject `null` on the same path. If you want Mongoose to also accept `null` without filling, pass an explicit `default: null` via the escape hatch (`.adapter('mongo', { default: null })`), or drop `nullable()` and validate elsewhere.

> [!WARNING]
> **`coerce()` is dropped.** Use `safeParse` before handing values to Mongoose if you want Sapphire's coercion semantics.

> [!WARNING]
> **Subdocument `_id: false` is the default.** Mongoose's own default is `true`. Set `subdocId: true` on `toMongoSchema` to opt back in.

> [!WARNING]
> **No discriminator / plugin / hook support.** Sapphire emits a bare `Schema`. Mongoose's discriminators, plugins, and middleware are deferred to V1_FUTURE — wire them on the returned `Schema` yourself if you need them now.

## Related

- [Fields and modifiers](../concepts/fields-and-modifiers.md) — what each IR kind models.
- [Refs and relations](../concepts/refs-and-relations.md) — ref lifecycle across adapters.
- [Escape hatch](../concepts/escape-hatch.md) — universal `.adapter(name, opts)` contract.
- [Recipes → One schema, many adapters](../recipes/one-schema-many-adapters.md).
- [Recipes → Custom error messages](../recipes/custom-error-messages.md).
