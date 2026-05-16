# Migrating from Zod

## Use case

You know Zod. The fluent-builder DX is similar enough that Sapphire feels familiar — but the libraries solve different problems. Zod is a **validation-first** library with a deep refinement and transform pipeline. Sapphire is **schema-first**: validation is one of multiple outputs (alongside Mongoose, Drizzle, JSON Schema). This recipe maps your existing Zod habits to Sapphire idioms and calls out where the two libraries diverge.

If your only need is validation, **stay with Zod**. Sapphire shines when you want the same schema definition to drive an ORM model and a frontend contract.

## Side-by-side mini-comparisons

### Schema definition

```ts
// Zod
import { z } from 'zod'
const User = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0),
})
```

```ts
// Sapphire
import { Sapphire } from '@ascendance-hub/sapphire-core'
const a = new Sapphire()
const User = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0),
})
```

Zod has a singleton (`z.*`). Sapphire requires a `new Sapphire()` instance — usually one per app, exported from a single module — because it owns the named-schema registry and configuration.

### Optional / nullable

```ts
// Zod
z.string().optional() // string | undefined
z.string().nullable() // string | null
z.string().nullish() // string | null | undefined
```

```ts
// Sapphire
a.string().optional() // string | undefined
a.string().nullable() // string | null
a.string().nullable().optional() // string | null | undefined
```

No `nullish()` shortcut — chain `.nullable().optional()`. See [Concepts → Nullable vs optional](../concepts/nullable-vs-optional.md) for why the distinction matters at the persistence layer.

### Composition

```ts
// Zod
User.pick({ name: true, email: true })
User.omit({ age: true })
User.partial()
User.extend({ role: z.string() })
User.merge(OtherSchema)
```

```ts
// Sapphire
User.pick(['name', 'email'] as const)
User.omit(['age'] as const)
User.partial()
User.extend({ role: a.string() })
User.merge(OtherSchema)
```

API parity, two notable differences: Sapphire's `pick`/`omit` take an array of keys (with `as const` for literal inference) instead of an object mask, and the composition methods are only available on **ObjectField** — primitives don't have them. See [Concepts → Composition](../concepts/composition.md).

### Type inference

```ts
// Zod
type User = z.infer<typeof User> // output type
type UserInput = z.input<typeof User> // input type
```

```ts
// Sapphire
import type { Infer, InferInput } from '@ascendance-hub/sapphire-core'
type User = Infer<typeof User> // output type
type UserInput = InferInput<typeof User> // input type
```

Same semantics, different import surface. See [Concepts → Inferring types](../concepts/inferring-types.md).

### Parse / safeParse

```ts
// Zod
User.parse(value) // throws ZodError
User.safeParse(value) // { success, data | error }
```

```ts
// Sapphire
User.parse(value) // throws SapphireValidationError
User.safeParse(value) // { success, data | error }
```

Semantically identical at the call site. The error shape is similar — Sapphire's `error.issues` is a flat `ValidationIssue[]` (Zod's is `ZodIssue[]`), both with `path`, `code`, `message`. Migration is usually a find-and-replace on the error type and (sometimes) a code-table mapping.

### Refinements

```ts
// Zod
z.string().refine((s) => s.startsWith('A'), { message: 'must start with A' })
```

```ts
// Sapphire — no general .refine() in v1; for ORM-specific escape hatches:
a.string()
  .startsWith('A', { message: 'must start with A' })
  .adapter('mongoose', { validate: { validator: (v: string) => v.startsWith('A') } })
```

Sapphire v1 has **no general-purpose `.refine()` / `.superRefine()`** equivalent. Built-in rules (`min`, `max`, `regex`, `startsWith`, `endsWith`, `email`, `url`, `uuid`, `int`, `multipleOf`, `finite`, `safe`, etc.) cover most cases, and `.adapter('mongoose', { validate: ... })` pipes a custom validator to Mongoose for DB-level enforcement. A general custom-validator API is on the V1_FUTURE roadmap.

## What Sapphire does that Zod doesn't

- **Multi-output emission.** The same schema produces a `mongoose.Schema`, a Drizzle table (`pgTable` / `mysqlTable` / `sqliteTable`), and a JSON Schema 2020-12 document. Zod is validation-only; converters exist as third-party packages but aren't part of the design centre.
- **Schema-level options on objects.** `.timestamps()`, `.index([...], { unique: true })`, `.adapter('mongoose', { collection: 'people' })` — first-class for persistence concerns. Zod has no equivalent because it doesn't model "this schema becomes a table".
- **Refs.** `a.ref('User')` and `a.ref(SchemaObj)` model relations between named schemas. Mongoose populates them at query time; JSON Schema turns them into `$ref`; Drizzle into `references(() => ...)`. Zod has no native ref concept.
- **A documented IR.** `SapphireSchemaNode` is a discriminated union you can walk yourself — handy for building your own adapter (see [Recipes → Custom adapter](./custom-adapter.md)).

## What Zod does that Sapphire doesn't (yet)

- **`refine` / `superRefine`** — arbitrary custom validators with rich `ctx` access. Sapphire v1 ships only the built-in rule set; custom validators are V1_FUTURE.
- **Broader transform pipeline.** Zod has `.transform()` and `.pipe()` for arbitrary input → output mapping. Sapphire has narrow transforms (`.trim()`, `.toLowerCase()`, `.toUpperCase()` on strings; `.coerce()` on primitives) and no general `.pipe()`.
- **Async parsing.** Zod has `parseAsync` / `safeParseAsync`. Sapphire parsing is synchronous-only in v1.
- **Branded primitive types.** `z.string().brand<'UserId'>()` is a Zod-specific TS trick for nominal typing. Sapphire has no equivalent — use `as unknown as Brand<'UserId'>` at the use site if you need it.
- **Discriminated unions with TS-level narrowing.** Zod's `z.discriminatedUnion('kind', [...])` gives you a `kind`-narrowed output type. Sapphire's `a.type().union([...])` is structural — narrow yourself in user code.
- **Mature plugin and recipe ecosystem.** Zod has years of community packages, codemods, and StackOverflow answers. Sapphire is v1.

### Parity Sapphire has

- **`error.flatten()` / `error.format()` helpers.** Like Zod, `SapphireValidationError` ships `flatten()` (field-keyed string arrays for form rendering), `format()` (nested error tree matching the schema shape), and `toJSON()` (serialization-safe shape). See [`validation.md`](../concepts/validation.md).

## Recommended migration paths

- **Keep using Zod for pure validation.** If your only consumer of the schema is `parse`/`safeParse`, there's no reason to switch.
- **Move to Sapphire for shared/persistence-aware schemas.** When the same shape needs to land in MongoDB / Drizzle / JSON Schema / a frontend form generator, the multi-output story wins.
- **Coexist where it helps.** Nothing stops you from using Zod for request validation in one layer and Sapphire for ORM schema definition in another. They don't share types, but they don't fight either.

> [!WARNING]
> **No `refine`/`superRefine` means some Zod patterns don't port directly.** Audit your codebase for `.refine(` and `.superRefine(` calls before migrating — those need to be re-expressed as built-in rules, escape-hatch adapter validators, or a post-`parse` check.

> [!WARNING]
> **Sapphire is synchronous.** `parseAsync` / `safeParseAsync` have no equivalent. If you rely on async refinements (e.g. database lookups), keep them outside the schema and run after `safeParse` succeeds.

## See also

- [Concepts → Overview](../concepts/overview.md) — the mental model and where Sapphire fits.
- [Concepts → Composition](../concepts/composition.md) — `pick` / `omit` / `partial` / `extend` / `merge` reference.
- [Concepts → Validation](../concepts/validation.md) — issue shape, `IssueCode` table, message hierarchy.
- [Recipes → One schema, many adapters](./one-schema-many-adapters.md) — the multi-output use case in detail.
