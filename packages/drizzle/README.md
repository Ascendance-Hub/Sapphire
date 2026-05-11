# @ascendance-hub/sapphire-drizzle

Drizzle ORM adapter for [Sapphire](https://github.com/Ascendance-Hub/Sapphire). Converts a Sapphire IR (`SapphireSchemaNode`) into a Drizzle table definition (`pgTable` / `mysqlTable` / `sqliteTable`) ready to pass into `drizzle(connection, { schema: { ... } })`.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-drizzle drizzle-orm
```

`@ascendance-hub/sapphire-core` and `drizzle-orm` are peer dependencies. The supported `drizzle-orm` range is `^0.44 || ^0.45` — pinned conservatively because Drizzle still ships frequent column-builder breaking changes.

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your application entry point:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'

registerAdapter('drizzle', toDrizzleSchema)

export const a = new Sapphire({ defaultAdapter: 'drizzle' })
```

## Quickstart

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

For multi-table emission with cross-table refs, share a single `DrizzleTableRegistry` instance across calls (see [Refs + `DrizzleTableRegistry`](#refs--drizzletableregistry) below).

## IR mapping table

| IR `kind` | Postgres (`pg-core`)                                      | MySQL (`mysql-core`)                            | SQLite (`sqlite-core`)                                           |
| --------- | --------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `string`  | `text(name)` (or `uuid(name)` when `format: 'uuid'`)      | `varchar(name, { length: maxLength ?? 255 })`   | `text(name)` (uuid → `text`, see Limitations)                    |
| `number`  | `integer(name)` (when `int()`) or `doublePrecision(name)` | `int(name)` or `double(name)`                   | `integer(name)` or `real(name)`                                  |
| `boolean` | `boolean(name)`                                           | `boolean(name)`                                 | `integer(name, { mode: 'boolean' })` (SQLite has no native bool) |
| `date`    | `timestamp(name, { withTimezone: true, mode: 'date' })`   | `datetime(name, { mode: 'date' })`              | `integer(name, { mode: 'timestamp' })` (unix ms)                 |
| `object`  | `jsonb(name)` (nested object) / table at root             | `json(name)` (nested) / table at root           | `text(name, { mode: 'json' })` (nested) / table at root          |
| `array`   | `jsonb(name)`                                             | `json(name)`                                    | `text(name, { mode: 'json' })`                                   |
| `tuple`   | `jsonb(name)`                                             | `json(name)`                                    | `text(name, { mode: 'json' })`                                   |
| `union`   | `jsonb(name)`                                             | `json(name)`                                    | `text(name, { mode: 'json' })`                                   |
| `literal` | `text(name)`                                              | `varchar(name, { length: 255 })`                | `text(name)`                                                     |
| `enum`    | `text(name)` (`pgEnum` opt-in via meta)                   | `varchar(name, { length: 255 })`                | `text(name)`                                                     |
| `record`  | `jsonb(name)`                                             | `json(name)`                                    | `text(name, { mode: 'json' })`                                   |
| `ref`     | `integer(name).references(() => target[pk])` (lazy)       | `int(name).references(() => target[pk])` (lazy) | `integer(name).references(() => target[pk])` (lazy)              |

### Universals (applied to every column)

- `required` + not `nullable` → `.notNull()`.
- `unique` → `.unique()`.
- `default(v)` → `.default(v)`.
- All other modifiers (`min`/`max`/`regex`/`format`/`startsWith`/`endsWith`/`multipleOf`/`finite`/`safe`/`coerce`/`transforms`) are **not enforced at the DB level** — they stay in `safeParse`. The single exception is MySQL `varchar(maxLength)`, which uses `node.maxLength` to size the column (default `255`).

### Schema-level

- `ObjectField.name(...)` → table name (override with `options.tableName`).
- Implicit primary key `id` (`serial` in pg, `serial` in mysql, `integer({ autoIncrement: true })` in sqlite). Disable via `options.primaryKey: false`, or rename via `options.primaryKey: 'pk'`.
- `ObjectField.index(keys, opts?)` → composite indexes emitted in the third-arg callback of `pgTable` / `mysqlTable` / `sqliteTable`, in the **array form** (the object form is deprecated in Drizzle). Names follow `<tableName>_idx_<i>`.
- `ObjectField.timestamps()` is a no-op (Sapphire's `timestamps()` is a Mongoose-flavoured concept; if you want `createdAt`/`updatedAt` in Drizzle, declare them explicitly with `.default()`).

## Refs + `DrizzleTableRegistry`

Drizzle requires `references(() => targetTable.column)` to be **lazy**, because the target table may not exist yet (forward refs, cycles). Sapphire `ref('User')` is wired into a registry that the lazy callback queries at query time:

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

Emit both with the same registry; the lazy callback resolves once the cycle is closed. If the callback fires before the target table is registered, the adapter throws:

```
drizzle adapter: ref target table "User" not registered.
Emit it before invoking queries that traverse this reference.
```

## Schema-level options

| Option       | Default      | Effect                                                                                        |
| ------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `dialect`    | _(required)_ | `'pg'` / `'mysql'` / `'sqlite'`. Selects the column-builder set and returned table shape.     |
| `tableName`  | `node.name`  | Argument passed to `pgTable(name, ...)` / `mysqlTable(...)` / `sqliteTable(...)`.             |
| `primaryKey` | `'id'`       | Implicit PK column name. `false` disables the implicit PK (you declare it manually via meta). |
| `tables`     | _(new)_      | Shared `DrizzleTableRegistry`. Pass the same instance across related calls to resolve refs.   |

## `.adapter('drizzle', opts)` escape hatch

Anything passed via `.adapter('drizzle', { ... })` is read from `meta.drizzle` and applied as method calls on the Drizzle column builder. Two scopes are supported:

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

Argument handling:

- `true` → call with no args (`col.notNull()`).
- `Array` → spread as positional args (`col.method(...args)`).
- Anything else → passed as the single argument (`col.method(value)`).

**Best-effort.** Methods missing on the column builder (e.g. `.array()` on a `text` column under SQLite) are silently skipped. To swap the column constructor itself (e.g. force `text` instead of `varchar` in MySQL), declare the table by hand — the escape hatch only chains methods on an already-built column.

## Limitations

- **No runtime validation in Drizzle.** Drizzle is a query builder, not a validator. Sapphire keeps validation in `safeParse`; the Drizzle adapter only shapes the table.
- **Composite kinds collapse to JSON columns.** `array`, `tuple`, `union`, `record`, and nested `object` all map to `jsonb` (pg) / `json` (mysql) / `text({ mode: 'json' })` (sqlite). DB-level validation of the composite shape is lost — keep it in `safeParse`.
- **`enum` is `text`/`varchar` by default.** `pgEnum` requires a separately-declared type with a unique name and is opt-in via `.adapter('drizzle', { pg: { ... } })` (recipe coming in F15).
- **String validators are runtime-only.** `minLength`, `regex`, `format` (`email`/`url`/`uuid`), `startsWith`, `endsWith` are not enforced at the DB level. The single exception is MySQL: `node.maxLength` sizes `varchar(N)`.
- **SQLite `uuid` is `text`.** SQLite has no native UUID type. The adapter emits `text(name)` and relies on `safeParse` for format checking.
- **Boolean and date in SQLite are emulated** as `integer({ mode: 'boolean' })` / `integer({ mode: 'timestamp' })`. Drizzle handles serialisation transparently.
- **No `relations()` API.** Sapphire refs become Drizzle `references(...)` only. The higher-level `relations(users, ({ many }) => ({ ... }))` API is deferred to V1_FUTURE.
- **Migrations are out of scope.** Pair the generated tables with `drizzle-kit` in your own pipeline.
- **Return types of `toDrizzleSchema` are `any`** per overload. The exact `PgTableWithColumns<...>` / `MySqlTableWithColumns<...>` / `SQLiteTableWithColumns<...>` shapes are not reliably exported across the supported peerDep range. The runtime table is genuine; only the declared TS type is widened. Pass the table into `drizzle(conn, { schema: { users } })` and use the connection-level types for queries.
- **Auto-register removed.** Call `registerAdapter('drizzle', toDrizzleSchema)` once in your entry point.

## License

BSD-3-Clause
