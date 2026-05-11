<!-- Code in this guide is verified by tests/docs-examples/inferring-types.test.ts -->

# Inferring types

`Infer<typeof schema>` is the bridge between Sapphire's runtime API and TypeScript's static world. Every field carries two phantom brand types — `_output` (what `parse` returns) and `_input` (what `parse` accepts) — and `Infer` / `InferInput` are thin aliases over those. Modifiers like `.optional()`, `.nullable()`, and `.default()` shape both sides; this page explains how.

## Minimal example

<!-- from tests/docs-examples/inferring-types.test.ts -->

```ts
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const user = a.object({
  name: a.string(),
  age: a.number().optional(),
})

type User = Infer<typeof user>
// User = { name: string; age?: number | undefined }
```

## `Infer<>` vs `InferInput<>`

| Type                        | Meaning                                |
| --------------------------- | -------------------------------------- |
| `Infer<typeof schema>`      | The output of `schema.parse(value)`.   |
| `InferInput<typeof schema>` | The value `schema.parse(...)` accepts. |

For most fields these match — they differ only when a modifier creates an asymmetry. The clearest case is `.default(value)`: at runtime, `undefined` is replaced by the default, so `_input` widens to `T | undefined` while `_output` stays `T`.

## Modifier table

| Modifier                   | `_input`         | `_output`        |
| -------------------------- | ---------------- | ---------------- |
| `a.string()`               | `string`         | `string`         |
| `.optional()`              | `T \| undefined` | `T \| undefined` |
| `.nullable()`              | `T \| null`      | `T \| null`      |
| `.default('x')`            | `T \| undefined` | `T`              |
| `.optional().default('x')` | `T \| undefined` | `T \| undefined` |

Note the last row: chaining `.optional()` **before** `.default('x')` keeps the output as `T | undefined`, because `.optional()` widens the brand types first and `.default()` doesn't narrow them back. If you want the output strictly `T`, drop `.optional()` — `.default(...)` alone already makes the field optional at the input level.

## Inside an object

`a.object({...})` lifts optional-output children into `?:` positions, so `{ name: string; age?: number | undefined }` is what you get from `Infer<>` when `age` is `a.number().optional()`. The same lifting applies to `_input` via `InferInput<>`.

## Pitfalls

> [!WARNING]
> **Don't use `ReturnType<typeof schema.parse>`.** TypeScript's `ReturnType` reads the method's declared return, but Sapphire's `Field<TOut, TIn>` brand types are what carry the precise inference. `Infer<typeof schema>` walks straight to `_output` and preserves narrowing through chains.

> [!WARNING]
> **`InferInput` matters when piping user input through `parse` in a typed boundary** — e.g. a tRPC procedure or an Express handler. `.default(...)` makes the input-side optional even when the output is required, so the caller can legally omit the field. The output of `parse` is always `_output`; only the function's parameter type benefits from `InferInput`.

## Related

- [Fields and modifiers](./fields-and-modifiers.md) — the per-field modifier tables.
- [Composition](./composition.md) — how `pick`/`omit`/`partial`/`required`/`extend`/`merge` recompute `Infer`.
- [Nullable vs optional](./nullable-vs-optional.md).
