# Overview

## What is Sapphire?

Sapphire is a TypeScript schema definition library. You describe your data shape once with a fluent DSL — `a.object({...})`, `a.string().email()`, `a.number().int().min(0)` — and Sapphire gives you back two things for free: a TypeScript type via `Infer<typeof schema>`, and ORM-specific outputs (a `mongoose.Schema`, a Drizzle table, a JSON Schema 2020-12 document, or your own) via a pluggable adapter registry. There is one source of truth for your data; types and database schemas stay in lockstep with it.

## What it is NOT

- **Not a validator-first library.** Validation exists (`parse`, `safeParse`), but the design centre is the intermediate representation (IR) and the adapters that consume it. If runtime validation is your _only_ need, a dedicated validation library is a lighter fit.
- **Not an ORM.** Sapphire produces schemas; it does not run queries, manage connections, or own a transaction model.
- **Not a migrations tool.** Schema diffing and migration generation live in your ORM of choice (Drizzle Kit, Mongoose's runtime, Prisma Migrate).

## Mental model

Three layers, in order:

1. **Field DSL.** `a.string()`, `a.object({...})`, `a.array(...)`, `a.type().union([...])`, and friends. Each call returns a new, immutable `Field` value. Modifiers like `.optional()`, `.min(3)`, `.default('x')` return new fields rather than mutating in place.
2. **IR — `SapphireSchemaNode`.** Every field can produce a normalized intermediate representation via `field.toSchema()`. The IR is 12 discriminated `kind`s (`string`, `number`, `boolean`, `date`, `object`, `array`, `tuple`, `union`, `literal`, `enum`, `record`, `ref`) — flat, JSON-serializable, and free of TypeScript types.
3. **Adapter registry.** `registerAdapter(name, fn)` registers a function `(node: SapphireSchemaNode, opts?) => Output`. `field.getSchema(name?)` walks the IR through the registered adapter and returns whatever that adapter produces — a `mongoose.Schema`, a Drizzle table, a JSON Schema object, etc.

The flow for any field is always the same: **DSL → IR → adapter → output**. Adapters are pure functions over the IR; you can write your own without modifying Sapphire.

## Where Sapphire fits

Sapphire earns its place when the **same** schema needs to land in multiple places — your Mongoose model, your frontend form generator, your MCP tool's `inputSchema`, your Drizzle Postgres table. One definition, kept in lockstep, instead of a hand-maintained copy per target.

If you are coming from another schema library and want a feature-by-feature mapping, see [Migrating from Zod](../recipes/migrating-from-zod.md).

## When to use Sapphire

- You ship a TypeScript stack with MongoDB + a frontend and want one schema to drive both your ORM model and your form validation / JSON Schema export.
- You build MCP tools and want a typed schema that's also a clean `inputSchema`.
- You share types between backend and frontend and want runtime parsing on top of static types.
- You run on multiple databases and want a thin abstraction over the schema-definition surface without committing to a full ORM.

## When NOT to use Sapphire

- You only need runtime validation and never emit a database schema — a dedicated validation library is a lighter fit.
- You target a single SQL database and want the deepest possible ORM integration — use that ORM directly.
- You need a mature plugin ecosystem today — Sapphire is a v1 library.

## Links

- [Getting Started](../getting-started.md) — install and your first schema.
- [Adapters → Mongo](../adapters/bson.md) / [Mongoose](../adapters/mongoose.md) / [JSON Schema](../adapters/json-schema.md) / [Drizzle](../adapters/drizzle.md).
- [Concepts → Fields and modifiers](./fields-and-modifiers.md).
