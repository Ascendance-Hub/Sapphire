# Sapphire

> **Schema once, types and adapters everywhere.** Sapphire is a TypeScript schema definition library that compiles to TS types plus ORM-specific outputs (MongoDB via Mongoose, Drizzle, JSON Schema 2020-12) through a pluggable adapter registry.

## Install

Core:

```bash
npm install @ascendance-hub/sapphire-core
```

Plus the adapter(s) you want. Each one declares its own peer dependencies — install them alongside.

Mongo adapter — native MongoDB driver (`mongodb` is an optional peer dep):

```bash
npm install @ascendance-hub/sapphire-mongo
```

Mongoose adapter (`mongoose` is a peer dep):

```bash
npm install @ascendance-hub/sapphire-mongoose mongoose
```

Drizzle adapter (`drizzle-orm` is a peer dep, supported range `^0.44 || ^0.45`):

```bash
npm install @ascendance-hub/sapphire-drizzle drizzle-orm
```

JSON Schema 2020-12 adapter (no extra peer deps):

```bash
npm install @ascendance-hub/sapphire-json-schema
```

## Quickstart

```ts
// see docs/getting-started.md for the full walkthrough
import mongoose from 'mongoose'
import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

registerAdapter('mongoose', toMongooseSchema)

const a = new Sapphire({ defaultAdapter: 'mongoose' })

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

type User = Infer<typeof userSchema>
// User = { name: string; email: string; age?: number | undefined }

const user = userSchema.parse({ name: 'Ada', email: 'ada@example.com' })

const mongoSchema = userSchema.getSchema() as mongoose.Schema
const UserModel = mongoose.model('User', mongoSchema)
```

The same `userSchema` powers every adapter from one definition:

```ts
// Mongoose Schema:
userSchema.getSchema('mongoose')

// Native MongoDB driver — a $jsonSchema collection validator:
userSchema.getSchema('mongo')

// JSON Schema 2020-12:
userSchema.getSchema('json-schema')

// Drizzle requires a dialect — pass adapter options as the second arg:
userSchema.getSchema('drizzle', { dialect: 'pg' })
```

## Docs

- [Docs index](./docs/README.md) — browseable table of contents.
- [Getting Started](./docs/getting-started.md) — install, your first schema, parsing, and plugging in an adapter.
- [Concepts](./docs/concepts/) — fields, modifiers, validation, inference, refs, composition.
- [Adapters](./docs/adapters/) — Mongo, Mongoose, JSON Schema, Drizzle.
- [Recipes](./docs/recipes/) — form validation, share-types-with-frontend, custom adapters, error messages, Zod migration.

## Packages

| Package                                | Description                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@ascendance-hub/sapphire-core`        | Core — field DSL, IR (`SapphireSchemaNode`), validation, adapter registry, type inference. |
| `@ascendance-hub/sapphire-mongo`       | Native MongoDB driver adapter — emits `$jsonSchema` collection validators.                 |
| `@ascendance-hub/sapphire-mongoose`    | Mongoose adapter — emits `mongoose.Schema` from any Sapphire IR.                           |
| `@ascendance-hub/sapphire-drizzle`     | Drizzle adapter — emits `pgTable` / `mysqlTable` / `sqliteTable`.                          |
| `@ascendance-hub/sapphire-json-schema` | JSON Schema 2020-12 adapter — for AJV, MCP tools, form generators.                         |

## License

BSD-3-Clause. © Alexandre Damas Murata.
