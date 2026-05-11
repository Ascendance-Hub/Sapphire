# Drizzle adapter — `@ascendance-hub/sapphire-drizzle`

The Drizzle adapter converts a Sapphire IR (`SapphireSchemaNode`) into a Drizzle table definition — `pgTable`, `mysqlTable`, or `sqliteTable`, depending on the chosen dialect — ready to pass into `drizzle(connection, { schema: { ... } })`. Three dialects are first-class; everything else (D1, Neon HTTP, Bun's `bun:sqlite`) layers on top because Drizzle's own driver split is orthogonal to the column-builder shape.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-drizzle drizzle-orm
```

Both `@ascendance-hub/sapphire-core` and `drizzle-orm` are peer dependencies.

### Supported `drizzle-orm` range

```
^0.44 || ^0.45
```

Pinned conservatively because Drizzle ships frequent column-builder breaking changes. The adapter is verified against `0.44.x` and `0.45.x`; later majors are not guaranteed until we rev the peer range.

## Register the adapter

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'

registerAdapter('drizzle', toDrizzleSchema)

export const a = new Sapphire({ defaultAdapter: 'drizzle' })
```

The adapter is **not auto-registered** — call this once in your entry point.

## Quickstart (Postgres)

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
import { a } from './sapphire'

const User = a
  .object({
    name: a.string().min(1),
    email: a.string().email().unique(),
    age: a.number().int().min(0).optional(),
  })
  .name('User')

const users = toDrizzleSchema(User.toSchema(), { dialect: 'pg' })

const db = drizzle(connectionString, { schema: { users } })
// `db.select().from(users)` is fully typed by Drizzle.
```

For multi-table emission with cross-table refs, share a single `DrizzleTableRegistry` instance across calls (see [Refs](#refs--drizzletableregistry) below).

## Adapter signature

```ts
toDrizzleSchema(node, { dialect: 'pg', ... }):    PgTableWithColumns<...>   // typed as any
toDrizzleSchema(node, { dialect: 'mysql', ... }): MySqlTableWithColumns<...> // typed as any
toDrizzleSchema(node, { dialect: 'sqlite', ... }):SQLiteTableWithColumns<...>// typed as any
```

Three overloads, each returning `any`. The actual runtime table is genuine — only the **declared TS type** is widened. The reason: Drizzle's column-builder generics aren't reliably exported across the supported peer range, and pinning a single signature would silently break for users on the other minor. Pass the returned table into `drizzle(conn, { schema: { users } })` and use the connection-level types for queries.

## IR → Drizzle mapping (per dialect)

| IR `kind`         | Postgres (`pg-core`)                                    | MySQL (`mysql-core`)                                                                                     | SQLite (`sqlite-core`)                                |
| ----------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `string`          | `text(name)` (or `uuid(name)` when `format: 'uuid'`)    | `varchar(name, { length: 36 })` for `format: 'uuid'`; else `varchar(name, { length: maxLength ?? 255 })` | `text(name)` (uuid stays `text`)                      |
| `number` (int)    | `integer(name)`                                         | `int(name)`                                                                                              | `integer(name)`                                       |
| `number` (float)  | `doublePrecision(name)`                                 | `double(name)`                                                                                           | `real(name)`                                          |
| `boolean`         | `boolean(name)`                                         | `boolean(name)`                                                                                          | `integer(name, { mode: 'boolean' })`                  |
| `date`            | `timestamp(name, { withTimezone: true, mode: 'date' })` | `datetime(name, { mode: 'date' })`                                                                       | `integer(name, { mode: 'timestamp' })` (unix seconds) |
| `object` (nested) | `jsonb(name)`                                           | `json(name)`                                                                                             | `text(name, { mode: 'json' })`                        |
| `array`           | `jsonb(name)`                                           | `json(name)`                                                                                             | `text(name, { mode: 'json' })`                        |
| `tuple`           | `jsonb(name)`                                           | `json(name)`                                                                                             | `text(name, { mode: 'json' })`                        |
| `union`           | `jsonb(name)`                                           | `json(name)`                                                                                             | `text(name, { mode: 'json' })`                        |
| `record`          | `jsonb(name)`                                           | `json(name)`                                                                                             | `text(name, { mode: 'json' })`                        |
| `literal`         | `text(name)`                                            | `varchar(name, { length: 255 })`                                                                         | `text(name)`                                          |
| `enum`            | `text(name)` (opt-in `pgEnum` via meta)                 | `varchar(name, { length: 255 })` (opt-in `mysqlEnum` via meta)                                           | `text(name)`                                          |
| `ref`             | `integer(name).references(() => target[pk])` (lazy)     | `int(name).references(() => target[pk])` (lazy)                                                          | `integer(name).references(() => target[pk])` (lazy)   |

### Universal modifiers (every column)

`applyCommon` walks each node and chains modifiers onto the built column **in order**:

1. `default(v)` → `col.default(v)`.
2. `required && !nullable` → `col.notNull()`.
3. `unique` → `col.unique()`.
4. Then escape-hatch `meta.drizzle` entries (see below).

All other Sapphire modifiers (`min`/`max`/`regex`/`format`/`startsWith`/`endsWith`/`multipleOf`/`finite`/`safe`/`coerce`/`transforms`) **stay in `safeParse`** — they are not enforced at the DB level. The single exception is MySQL `varchar`, which uses `maxLength` to size the column (default `255`).

### Implicit primary key

Every emitted table auto-prepends an `id` column unless you opt out:

| Dialect | Implicit `id` column                                |
| ------- | --------------------------------------------------- |
| pg      | `serial('id').primaryKey()`                         |
| mysql   | `serial('id').primaryKey()`                         |
| sqlite  | `integer('id').primaryKey({ autoIncrement: true })` |

Controlled by `options.primaryKey`:

```ts
toDrizzleSchema(node, { dialect: 'pg' }) // → id (default)
toDrizzleSchema(node, { dialect: 'pg', primaryKey: 'pk' }) // → pk
toDrizzleSchema(node, { dialect: 'pg', primaryKey: false }) // → no implicit PK; you declare your own via meta
```

## Refs + `DrizzleTableRegistry`

Drizzle requires `references(() => targetTable.column)` to be **lazy**, because the target table may not exist when the column is declared (forward refs, cycles). Sapphire's `ref('User')` is wired into a registry that the lazy callback queries at query time:

```ts
import { toDrizzleSchema, DrizzleTableRegistry } from '@ascendance-hub/sapphire-drizzle'
import { a } from './sapphire'

const tables = new DrizzleTableRegistry()

const User = a.object({ name: a.string() }).name('User')
const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'),
  })
  .name('Post')

const users = toDrizzleSchema(User.toSchema(), { dialect: 'pg', tables })
const posts = toDrizzleSchema(Post.toSchema(), { dialect: 'pg', tables })

// `posts.author.references(() => users.id)` resolves at query time.
```

### Cycles (User ↔ Post)

Emit both with the **same** registry. The lazy callback resolves once the cycle is closed. If the callback fires before the target table is registered, the adapter throws:

```
drizzle adapter: ref target table "User" not registered.
Emit it before invoking queries that traverse this reference.
```

Order of `toDrizzleSchema` calls doesn't matter — what matters is that **all** related tables are emitted before you run a query that traverses the ref.

## Composite indexes

`ObjectField.index(keys, opts?)` accumulates into `node.indexes`. The adapter emits each via the third-arg callback of `pgTable` / `mysqlTable` / `sqliteTable`, in the **array form** (the object form is deprecated in `drizzle-orm` ≥ 0.44):

```ts
const Post = a
  .object({
    authorId: a.number().int(),
    createdAt: a.date(),
  })
  .name('Post')
  .index(['authorId', 'createdAt'])
  .index(['authorId'], { unique: true })

const posts = toDrizzleSchema(Post.toSchema(), { dialect: 'pg' })
// Emits two indexes named `Post_idx_0`, `Post_idx_1` (unique).
```

Names follow `<tableName>_idx_<i>`, stable and unique within the table.

## Schema-level options

The second argument to `toDrizzleSchema(node, options)`:

| Option       | Default                   | Effect                                                                                      |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| `dialect`    | _(required)_              | `'pg'` / `'mysql'` / `'sqlite'`. Selects the column-builder set and table shape.            |
| `tableName`  | `node.name`               | Argument passed to `pgTable(name, ...)` / `mysqlTable(...)` / `sqliteTable(...)`.           |
| `primaryKey` | `'id'`                    | Implicit PK column name. `false` disables the implicit PK.                                  |
| `tables`     | _(new registry per call)_ | Shared `DrizzleTableRegistry`. Pass the same instance across related calls to resolve refs. |

## `.adapter('drizzle', opts)` escape hatch

Values from `.adapter('drizzle', { ... })` are read from `node.meta.drizzle` and applied as **method calls on the column builder**. Two scopes are supported:

- **Top-level keys** — applied for every dialect.
- **Dialect sub-keys** (`pg`, `mysql`, `sqlite`) — applied only when `options.dialect` matches.

```ts
a.string().adapter('drizzle', {
  // Top-level: applied for any dialect that has the method.
  primaryKey: true,
  // Dialect-specific: only applied when emitting for pg.
  pg: { array: true },
  // Same key under a different dialect bucket — ignored when emitting for pg.
  mysql: { fixed: 12 },
})
```

### Argument handling

| Value         | Becomes                           |
| ------------- | --------------------------------- |
| `true`        | `col.method()` (no args).         |
| `Array`       | `col.method(...args)` (spread).   |
| Anything else | `col.method(value)` (single arg). |

### Silent skip on missing methods

```ts
function callChain(col: any, method: string, args: unknown): any {
  if (typeof col[method] !== 'function') return col
  // ...
}
```

Methods missing on the column builder (e.g. `.array()` on a `text` column under SQLite) are **silently skipped** — meta is best-effort. The flip side: typos go undetected at runtime. Pair the escape hatch with tests that assert the runtime column properties (`isUnique`, `notNull`, etc.).

To swap the column constructor itself (e.g. force `text` instead of `varchar` in MySQL), declare the table by hand — the escape hatch only chains methods on an already-built column.

## Limitations

> [!WARNING]
> **No runtime validation in Drizzle.** Drizzle is a query builder, not a validator. Sapphire keeps validation in `safeParse`; the Drizzle adapter only shapes the table.

> [!WARNING]
> **Composite kinds collapse to JSON columns.** `array`, `tuple`, `union`, `record`, and nested `object` all map to `jsonb` (pg) / `json` (mysql) / `text({ mode: 'json' })` (sqlite). DB-level validation of the composite shape is lost — keep it in `safeParse`.

> [!WARNING]
> **`enum` is `text`/`varchar` by default.** `pgEnum` / `mysqlEnum` require a separately-declared type with a unique name and are opt-in via `.adapter('drizzle', { pg: { ... } })`.

> [!WARNING]
> **String validators are runtime-only.** `minLength`, `regex`, `format` (`email`/`url`/`uuid`), `startsWith`, `endsWith` are not enforced at the DB level. Exception: MySQL — `node.maxLength` sizes `varchar(N)`.

> [!WARNING]
> **SQLite `uuid` is `text`.** SQLite has no native UUID type. The adapter emits `text(name)` regardless of `format`; rely on `safeParse` for format checking.

> [!WARNING]
> **Boolean and date in SQLite are emulated.** Stored as `integer({ mode: 'boolean' })` and `integer({ mode: 'timestamp' })` (unix seconds). Drizzle handles serialisation transparently — but date precision is second-level by default.

> [!WARNING]
> **Return types of `toDrizzleSchema` are `any`** per overload. The runtime table is real; the TS type is widened because Drizzle's column-builder generics aren't reliably exported across the supported peer range.

> [!WARNING]
> **No `relations()` API.** Sapphire refs become Drizzle `references(...)` only. The higher-level `relations(users, ({ many }) => ({ ... }))` API is deferred to V1_FUTURE.

> [!WARNING]
> **Migrations are out of scope.** Pair the generated tables with `drizzle-kit` in your own pipeline.

> [!WARNING]
> **`ObjectField.timestamps()` is a no-op** in this adapter. The Mongoose-flavoured concept doesn't translate to Drizzle directly — declare `createdAt`/`updatedAt` explicitly with `a.date().default(() => new Date())` if you want them.

## Related

- [Fields and modifiers](../concepts/fields-and-modifiers.md) — what each IR kind models.
- [Refs and relations](../concepts/refs-and-relations.md) — ref lifecycle across adapters.
- [Escape hatch](../concepts/escape-hatch.md) — universal `.adapter(name, opts)` contract.
- [Recipes → One schema, many adapters](../recipes/one-schema-many-adapters.md).
- [Recipes → Writing a custom adapter](../recipes/custom-adapter.md).
