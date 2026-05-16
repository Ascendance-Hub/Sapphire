# Sapphire Documentation

Schema once, types and adapters everywhere. These docs walk you from a first install through every concept and adapter Sapphire ships with.

## Getting Started

- [Getting Started](./getting-started.md) — install, your first schema, parse/safeParse, plugging in an adapter.

## Concepts

- [Overview](./concepts/overview.md) — what Sapphire is, what it isn't, and the mental model.
- [Fields and modifiers](./concepts/fields-and-modifiers.md) — full vocabulary of primitives, composites, and modifiers.
- [Inferring types](./concepts/inferring-types.md) — `Infer<>` vs `InferInput<>` and the brand-type model.
- [Composition](./concepts/composition.md) — `pick`, `omit`, `partial`, `required`, `extend`, `merge`.
- [Unions, literals, and enums](./concepts/unions-literals-enums.md) — the `a.type()` namespace.
- [Tuples vs arrays](./concepts/tuples-vs-arrays.md) — fixed-position vs homogeneous collections.
- [Refs and relations](./concepts/refs-and-relations.md) — named schemas and `a.ref()`.
- [Nullable vs optional](./concepts/nullable-vs-optional.md) — the canonical confusion, resolved.
- [Validation](./concepts/validation.md) — `parse` / `safeParse`, issues, message resolution.
- [Config](./concepts/config.md) — `Sapphire` options and per-call overrides.
- [Escape hatch](./concepts/escape-hatch.md) — `.adapter(name, opts)` for ORM-specific options.

## Adapters

- [Mongo (`@ascendance-hub/sapphire-bson`)](./adapters/bson.md) — native MongoDB driver `$jsonSchema` collection validators.
- [Mongoose (`@ascendance-hub/sapphire-mongoose`)](./adapters/mongoose.md) — Mongoose `Schema` output, with refs, timestamps, and composite indexes.
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

- [Architecture](./meta/architecture.md) — the 3-layer model (DSL → IR → adapter) with a Mermaid diagram.
- [Design decisions](./meta/design-decisions.md) — why the API looks the way it does.
- [Contributing](./meta/contributing.md) — repo setup and how to write a third-party adapter.
