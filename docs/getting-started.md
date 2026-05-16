<!-- Code in this guide is verified by tests/docs-examples/getting-started.test.ts -->

# Getting Started

Sapphire lets you define a schema once and emit TypeScript types plus ORM-specific outputs (MongoDB via Mongoose or the native driver, Drizzle tables, JSON Schema 2020-12) from the same source.

This guide walks you through installation, your first schema, parsing/validation, and plugging in an adapter.

## Install

Sapphire is published as a small set of workspace packages. Install the core, then any adapters you need.

Core only (just types, parsing, and the adapter registry):

```bash
npm install @ascendance-hub/sapphire-core
```

Core plus the Mongoose adapter (`mongoose` is a peer dependency):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongoose mongoose
```

Core plus the Drizzle adapter (`drizzle-orm` is a peer dependency, supported range `^0.44 || ^0.45`):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-drizzle drizzle-orm
```

Core plus the JSON Schema 2020-12 adapter (no extra peer deps — bring your own validator like AJV if you need runtime checks):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-json-schema
```

Core plus the native MongoDB driver adapter (no extra peer deps — emits a `$jsonSchema` collection validator for `db.createCollection`):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-bson
```

## Your first schema

Create a `Sapphire` instance and define an object schema with the field DSL:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

type User = Infer<typeof userSchema>
// User = { name: string; email: string; age?: number | undefined }
```

`Infer<typeof userSchema>` is the **output** type — the value you get back from `parse`. `InferInput<typeof userSchema>` would give you the **input** type (relevant once you start using `.default()`).

## Parse / safeParse

Every field exposes `parse` (throws `SapphireValidationError` on failure) and `safeParse` (returns a discriminated union, never throws):

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
const user = userSchema.parse({
  name: 'Ada',
  email: 'ada@example.com',
  age: 36,
})
// user is typed as { name: string; email: string; age?: number | undefined }
```

When the input is invalid, `safeParse` returns `{ success: false, error }`, where `error.issues` is an array describing every problem:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
const result = userSchema.safeParse({
  name: '',
  email: 'not-an-email',
  age: -1,
})

if (!result.success) {
  // result.error.issues is an array of { path, code, message }
  for (const issue of result.error.issues) {
    // e.g. { path: ['email'], code: 'format', message: '...' }
    // issue.path: where in the value the problem is
    // issue.code: a stable string from the IssueCode union
    // issue.message: the resolved message (string or object)
    void issue
  }
}
```

Each `ValidationIssue` carries three fields you care about:

- `path` — a `(string | number)[]` pointing to the offending value (e.g. `['address', 'zip']`).
- `code` — a stable string from the `IssueCode` union (e.g. `invalid_type`, `min_length`, `format`). Use this for branching, not the message.
- `message` — the resolved message (string or object). Resolution walks the per-call → per-rule → field → instance → built-in hierarchy.

## Add an adapter

Adapters are not auto-registered. Register the one you want once in your application's entry point, then call `.getSchema()` on any field to produce its adapted output:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
import mongoose from 'mongoose'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

registerAdapter('mongoose', toMongooseSchema)

const a = new Sapphire({ defaultAdapter: 'mongoose' })

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

const mongoSchema = userSchema.getSchema() as mongoose.Schema
// mongoSchema is a real mongoose.Schema, ready for mongoose.model(...)
```

`registerAdapter(name, fn)` puts your adapter under a name; `getSchema(name?, options?)` resolves the field's IR (`SapphireSchemaNode`) through that adapter. When the `Sapphire` instance has a `defaultAdapter`, `getSchema()` uses it; otherwise pass the name explicitly: `userSchema.getSchema('mongoose')`.

The same pattern works for the JSON Schema and Drizzle adapters — JSON Schema needs no options, Drizzle requires at minimum a `dialect`:

```ts
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
registerAdapter('json-schema', toJsonSchema)
const jsonSchema = userSchema.getSchema('json-schema')

import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
registerAdapter('drizzle', toDrizzleSchema)
// Drizzle needs adapter options — pass them as the second argument:
const usersTable = userSchema.getSchema('drizzle', { dialect: 'pg' })
```

> [!NOTE]
> The Drizzle adapter requires `{ dialect: 'pg' | 'mysql' | 'sqlite' }`. Calling
> `getSchema('drizzle')` without options throws a clear error. See
> [adapters/drizzle.md](./adapters/drizzle.md) for the full options surface
> (`tableName`, `primaryKey`, `tables`).

## Next steps

- [Concepts → Overview](./concepts/overview.md) — the mental model and where Sapphire fits.
- [Concepts → Fields and modifiers](./concepts/fields-and-modifiers.md) — full reference for every field and the modifiers it supports.
- [Adapters → Mongoose](./adapters/mongoose.md) — deep-dive on the Mongoose adapter, including escape hatches and IR mapping.
