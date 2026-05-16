# @ascendance-hub/sapphire-core

> **Schema once, types and adapters everywhere.** The core of
> [Sapphire](https://github.com/Ascendance-Hub/Sapphire) — a TypeScript schema
> definition library: a fluent field DSL, a serializable IR
> (`SapphireSchemaNode`), runtime validation, type inference, and a pluggable
> adapter registry.

This package ships no ORM integration on its own. Install it alongside whichever
adapter(s) you need — Mongoose, Drizzle, JSON Schema, native MongoDB
`$jsonSchema`.

## Install

```bash
npm install @ascendance-hub/sapphire-core
```

## Quickstart

```ts
import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

// Register each adapter once, at application startup.
registerAdapter('mongoose', toMongooseSchema)

const a = new Sapphire({ defaultAdapter: 'mongoose' })

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

// 1 — infer the static type
type User = Infer<typeof userSchema>
// { name: string; email: string; age?: number | undefined }

// 2 — validate at runtime
const user = userSchema.parse({ name: 'Ada', email: 'ada@example.com' })

// 3 — emit an ORM-specific schema from the same definition
const mongoSchema = userSchema.getSchema('mongoose')
```

The same `userSchema` drives every registered adapter — `getSchema('mongoose')`,
`getSchema('drizzle', { dialect: 'pg' })`, `getSchema('json-schema')`,
`getSchema('bson')`.

## What's in here

- **Field DSL** — `string`, `number`, `boolean`, `date`, `object`, `array`,
  `tuple`, `record`, `union`, `literal`, `enum`, `ref`, plus modifiers
  (`optional`, `nullable`, `default`, `min` / `max`, `regex`, …).
- **IR** — `toSchema()` produces a serializable `SapphireSchemaNode`; adapters
  are pure functions from that IR to an ORM-specific output.
- **Validation** — `parse` / `safeParse` with structured issues, custom
  messages, `abortEarly`, `stripUnknown`.
- **Type inference** — `Infer<typeof schema>` / `InferInput<typeof schema>`.
- **Adapter registry** — `registerAdapter(name, fn)`. The registry is
  process-global; register each adapter once at startup.

## Adapters

| Package                                | Output                                           |
| -------------------------------------- | ------------------------------------------------ |
| `@ascendance-hub/sapphire-mongoose`    | `mongoose.Schema`                                |
| `@ascendance-hub/sapphire-bson`        | MongoDB `$jsonSchema` collection validators      |
| `@ascendance-hub/sapphire-drizzle`     | Drizzle `pgTable` / `mysqlTable` / `sqliteTable` |
| `@ascendance-hub/sapphire-json-schema` | JSON Schema 2020-12                              |

## Docs

Full documentation — getting started, concepts, adapters, recipes — lives in the
[repository `docs/`](https://github.com/Ascendance-Hub/Sapphire/tree/main/docs).

## License

MIT © Alexandre Damas Murata
