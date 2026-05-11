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

- _Form validation_ — _(coming in F15)_
- _Share types with the frontend_ — _(coming in F15)_
- _One schema, many adapters_ — _(coming in F15)_
- _Writing a custom adapter_ — _(coming in F15)_
- _Custom error messages_ — _(coming in F15)_
- _Migrating from Zod_ — _(coming in F15)_

## Meta

- _Architecture_ — _(coming in F15)_
- _Design decisions_ — _(coming in F15)_
- _Contributing_ — _(coming in F15)_
