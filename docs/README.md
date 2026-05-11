# Sapphire Documentation

Schema once, types and adapters everywhere. These docs walk you from a first install through every concept and adapter Sapphire ships with.

## Getting Started

- [Getting Started](./getting-started.md) — install, your first schema, parse/safeParse, plugging in an adapter.

## Concepts

- [Overview](./concepts/overview.md) — what Sapphire is, what it isn't, and the mental model.
- _Fields and modifiers_ — _(coming in F15)_
- _Inferring types_ — _(coming in F15)_
- _Composition (pick/omit/partial/required/extend/merge)_ — _(coming in F15)_
- _Unions, literals, and enums_ — _(coming in F15)_
- _Tuples vs arrays_ — _(coming in F15)_
- _Refs and relations_ — _(coming in F15)_
- _Nullable vs optional_ — _(coming in F15)_
- _Validation_ — _(coming in F15)_
- _Config_ — _(coming in F15)_
- _Escape hatch (`.adapter(name, opts)`)_ — _(coming in F15)_

## Adapters

- [Mongo (`@ascendance-hub/sapphire-mongo`)](./adapters/mongo.md) — Mongoose `Schema` output, with refs, timestamps, and composite indexes.
- [JSON Schema (`@ascendance-hub/sapphire-json-schema`)](./adapters/json-schema.md) — JSON Schema 2020-12 output for AJV, MCP tools, and frontend form generators.
- [Drizzle (`@ascendance-hub/sapphire-drizzle`)](./adapters/drizzle.md) — `pgTable` / `mysqlTable` / `sqliteTable` output with lazy refs and composite indexes.

## Recipes

- [Form validation](./recipes/form-validation.md) — collect every issue from `safeParse` and pivot to per-field UI errors.
- [Share types with the frontend](./recipes/share-types-with-frontend.md) — one schema feeds Mongo, `Infer<>` types, and JSON Schema for forms or MCP tools.
- [One schema, many adapters](./recipes/one-schema-many-adapters.md) — register multiple adapters and emit each from the same IR.
- [Writing a custom adapter](./recipes/custom-adapter.md) — walk the IR's 12 kinds and plug into the registry.
- [Custom error messages](./recipes/custom-error-messages.md) — i18n and branded messages through the 5-level resolution hierarchy.
- [Migrating from Zod](./recipes/migrating-from-zod.md) — side-by-side mapping plus what each library does that the other doesn't.

## Meta

- _Architecture_ — _(coming in F15)_
- _Design decisions_ — _(coming in F15)_
- _Contributing_ — _(coming in F15)_
