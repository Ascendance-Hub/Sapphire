<!-- Code in this guide is verified by tests/docs-examples/refs.test.ts -->

# Refs and relations

Refs let one schema point at another by name. They are how Sapphire models cross-collection relationships (Mongoose's `ref`), foreign keys (Drizzle), and JSON Schema's `$ref`. There are two complementary layers: **naming** a schema with `.name(string)` so it can be targeted, and **referencing** it via `a.ref(...)`. Both refs by schema object and refs by string name are supported — the string form is lazy and lets you express cycles or forward references that the typesafe form can't.

## Minimal example

<!-- from tests/docs-examples/refs.test.ts -->

```ts
import { Sapphire } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

const Post = a.object({
  title: a.string(),
  author: a.ref(User),
})
```

`Post.toSchema().properties.author` is `{ kind: 'ref', target: 'User', required: true }`. Adapters take it from there.

## Naming a schema

`.name(string)` is an ObjectField method. It registers the schema in the parent `Sapphire` instance's `NamedSchemaRegistry`, and it stamps the name onto the IR (`node.name`).

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

a.listNamedSchemas() // ['User']
```

A schema doesn't need a name unless something refs it (or until a name-sensitive adapter — JSON Schema's `$defs`, Drizzle's table name — needs one). Names are unique **per Sapphire instance**, not globally.

## Referencing — two forms

| Form               | Signature                           | Resolution | Typesafe                                   |
| ------------------ | ----------------------------------- | ---------- | ------------------------------------------ |
| `a.ref(SchemaObj)` | `(target: ObjectField) => RefField` | Eager      | Yes — requires `.name(...)` already called |
| `a.ref('Name')`    | `(target: string) => RefField`      | Lazy       | No — string is opaque                      |

### By schema object

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

const Post = a.object({
  title: a.string(),
  author: a.ref(User),
})
```

`a.ref(target)` reads `target.getName()` and snapshots the string. If `target` has no name set, construction throws — there's nothing for the adapters to render.

### By string (cycles, forward refs)

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'), // 'User' not yet registered — fine, lazy.
  })
  .name('Post')

const User = a
  .object({
    email: a.string().email(),
    latestPost: a.ref('Post'), // cycle: User <-> Post
  })
  .name('User')
```

The string form never validates the target at construction time. The check happens at adapter emission (Mongo, JSON Schema) or at query time (Drizzle, where `references(() => ...)` is itself lazy).

## Adapter behavior

| Adapter       | Output                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| `mongo`       | `{ type: ObjectId, ref: 'Name', required }`                                            |
| `json-schema` | `{ $ref: '#/$defs/Name' }` (named schemas collected into top-level `$defs`)            |
| `drizzle`     | `integer(name).references(() => target.id)` resolved lazily via `DrizzleTableRegistry` |

### Mongo

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const schema = Post.getSchema() as mongoose.Schema
const authorPath = schema.path('author') as unknown as {
  instance: string
  options: { ref: string }
}
authorPath.instance // 'ObjectID'
authorPath.options.ref // 'User'
```

### JSON Schema

```ts
const out = toJsonSchema(Post.toSchema(), {
  defs: { User: User.toSchema() },
}) as {
  properties: { author: { $ref: string } }
  $defs: Record<string, unknown>
}
out.properties.author // { $ref: '#/$defs/User' }
out.$defs.User // present, fully expanded
```

The adapter walks the IR collecting every `kind: 'object'` with a `.name` it encounters, materializing them into top-level `$defs`. Refs themselves are pointers — they don't descend into the target — so when User is referenced but never **nested** inside the input tree, pass it explicitly via `options.defs`. Cycles cost nothing once the named schemas are in `$defs`.

### Drizzle

```ts
import { DrizzleTableRegistry, toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'

const tables = new DrizzleTableRegistry()

const userTable = toDrizzleSchema(User.toSchema(), { dialect: 'pg', tables })
const postTable = toDrizzleSchema(Post.toSchema(), { dialect: 'pg', tables })
// each ref column = integer(name).references(() => tables.get('User').id)
```

Pass the same `DrizzleTableRegistry` across all `toDrizzleSchema` calls in a related set. The `references(() => ...)` closure resolves through the registry at query construction — emit order doesn't matter.

## Pitfalls

> [!WARNING]
> **Ref target resolution is lazy.** A missing target only throws at adapter-emission time (Mongo/JSON Schema) or at query time (Drizzle, via the `references(() => target.id)` closure). This is useful for forward refs and cycles, but a typo in `'Usr'` will compile and only blow up when something actually walks the registry.

> [!WARNING]
> **Named schemas are unique per Sapphire instance.** Re-using a name throws from `NamedSchemaRegistry.register`. In tests, prefer a fresh `new Sapphire()` per file (or per test) instead of a module-level singleton — otherwise two tests that both `.name('User')` will collide.

> [!WARNING]
> **`a.ref(SchemaObj)` only works after the target's `.name(...)` is set.** Reach for the typesafe form only when you control the order; for forward refs and cycles, use the string form.

## Related

- [Fields and modifiers](./fields-and-modifiers.md) — ObjectField's `.name()` API.
- [Nullable vs optional](./nullable-vs-optional.md) — how `.optional()` and `.nullable()` apply to refs.
- [Recipes → One schema, many adapters](../recipes/one-schema-many-adapters.md).
