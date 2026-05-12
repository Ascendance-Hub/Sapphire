<!-- Code in this guide is verified by tests/docs-examples/fields-and-modifiers.test.ts -->

# Fields and modifiers

Sapphire's field DSL is the user-facing surface of the library. Every call on a `Sapphire` instance (`a.string()`, `a.object({...})`, `a.type().union([...])`) returns a new, immutable `Field`. Modifiers like `.optional()`, `.min(3)`, `.default('x')` return new fields rather than mutating the previous one — chains are safe to share and reuse.

This page is the reference for every field constructor and every modifier it supports. For composition methods on objects (`pick`, `omit`, `partial`, `required`, `extend`, `merge`) see [Composition](./composition.md). For union/literal/enum see [Unions, literals, and enums](./unions-literals-enums.md).

## Minimal example

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const user = a.object({
  name: a.string().min(1).max(120),
  age: a.number().int().nonnegative(),
  active: a.boolean().default(true),
  createdAt: a.date(),
})

type User = Infer<typeof user>
// User = { name: string; age: number; active: boolean; createdAt: Date }
```

## Primitives

### `a.string()`

| Modifier                     | Signature                                          | Notes                                                                                                                                               |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.min(n, opts?)`             | `(n: number, opts?: { message? }) => StringField`  | Minimum length. Error code `min_length`.                                                                                                            |
| `.max(n, opts?)`             | same                                               | Maximum length. Error code `max_length`.                                                                                                            |
| `.length(n, opts?)`          | same                                               | Exact length. Error code `length`.                                                                                                                  |
| `.regex(re, opts?)`          | `(re: RegExp, opts?: { message? }) => StringField` | Tests with `re.test(str)`. Error code `regex`.                                                                                                      |
| `.email(opts?)`              | `(opts?: { message? }) => StringField`             | Built-in format check (see note). Error code `format`.                                                                                              |
| `.url(opts?)`                | same                                               | Format `url` — uses the platform `URL` constructor; accepts anything `new URL(value)` parses.                                                       |
| `.uuid(opts?)`               | same                                               | Format `uuid` — RFC 4122 v1–v8 with valid variant nibble (`8`/`9`/`a`/`b`).                                                                          |
| `.startsWith(prefix, opts?)` | `(prefix: string, opts?) => StringField`           | Error code `starts_with`.                                                                                                                           |
| `.endsWith(suffix, opts?)`   | `(suffix: string, opts?) => StringField`           | Error code `ends_with`.                                                                                                                             |
| `.trim()`                    | `() => StringField`                                | Transform — runs after coerce, before rule checks.                                                                                                  |
| `.toLowerCase()`             | `() => StringField`                                | Transform.                                                                                                                                          |
| `.toUpperCase()`             | `() => StringField`                                | Transform.                                                                                                                                          |
| `.coerce()`                  | `() => StringField`                                | `String(value)` if input is not a string (skipped for `null`/`undefined` — those go through the required/nullable check). Runs first (see pitfall). |

Example:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const email = a.string().min(3).max(254).email()
```

> [!NOTE]
> **`.email()` is pragmatic, not RFC 5322 complete.** The built-in regex covers ~99% of practical addresses — it rejects obvious junk (`a@b..c`, leading/trailing dots, missing TLD) but does not accept exotic-but-RFC-legal forms like quoted local parts (`"foo bar"@example.com`). If you need full RFC compliance, plug a third-party validator via `.regex(yourRegex)` or post-`safeParse` checks.

### `a.number()`

| Modifier                | Signature                                         | Notes                                                  |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `.min(n, opts?)`        | `(n: number, opts?: { message? }) => NumberField` | Inclusive lower bound. Error code `min`.               |
| `.max(n, opts?)`        | same                                              | Inclusive upper bound. Error code `max`.               |
| `.gt(n, opts?)`         | same                                              | Exclusive lower bound. Error code `gt`.                |
| `.gte(n, opts?)`        | same                                              | Inclusive lower; reported as code `gte`.               |
| `.lt(n, opts?)`         | same                                              | Exclusive upper. Error code `lt`.                      |
| `.lte(n, opts?)`        | same                                              | Inclusive upper; reported as code `lte`.               |
| `.int(opts?)`           | `(opts?) => NumberField`                          | `Number.isInteger`. Error code `int`.                  |
| `.positive(opts?)`      | sugar for `.gt(0)`                                |                                                        |
| `.negative(opts?)`      | sugar for `.lt(0)`                                |                                                        |
| `.nonnegative(opts?)`   | sugar for `.gte(0)`                               |                                                        |
| `.nonpositive(opts?)`   | sugar for `.lte(0)`                               |                                                        |
| `.multipleOf(n, opts?)` | `(n: number, opts?) => NumberField`               | `value % n === 0`. Error code `multiple_of`.           |
| `.finite(opts?)`        | `(opts?) => NumberField`                          | Rejects `Infinity` / `-Infinity`. Error code `finite`. |
| `.safe(opts?)`          | `(opts?) => NumberField`                          | `Number.isSafeInteger`. Error code `safe`.             |
| `.coerce()`             | `() => NumberField`                               | `Number(value)`; preserves the original if `NaN`.      |

Example:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const age = a.number().int().gte(0).lte(150)
```

### `a.boolean()`

Boolean has no rule modifiers — just universal ones and `.coerce()`. With coerce, the strings `'true'`/`'false'` and numbers `1`/`0` are accepted.

### `a.date()`

| Modifier         | Signature                       | Notes                                                  |
| ---------------- | ------------------------------- | ------------------------------------------------------ |
| `.min(d, opts?)` | `(d: Date, opts?) => DateField` | `value.getTime() >= d.getTime()`. Error code `min`.    |
| `.max(d, opts?)` | same                            | Error code `max`.                                      |
| `.coerce()`      | `() => DateField`               | `new Date(value)` for number/string before validation. |

Strict by default — only `Date` instances are accepted. Call `.coerce()` to also accept strings or numbers (form payloads, URL params, JSON-deserialized timestamps); the adapter IR (`coerce: false` vs `coerce: true`) honestly reflects what runtime will accept.

## Composites

### `a.object(shape)`

Shape is a record of `Field`s. The output is a plain object whose keys mirror `shape`, with optional fields lifted into `?:` positions.

ObjectField carries schema-level metadata too: `.name(n)`, `.timestamps()`, `.index(keys, opts?)`. It also exposes the composition methods `pick`, `omit`, `partial`, `required`, `extend`, `merge` — those have their own page in [Composition](./composition.md).

### `a.array(item)`

Homogeneous, variable-length. The single `item` argument is the inner field — every entry is validated against it. Modifiers: `.min(n)`, `.max(n)`, `.length(n)`, `.nonempty()`.

### `a.tuple([f1, f2, ...])`

Heterogeneous, fixed-length. See [Tuples vs arrays](./tuples-vs-arrays.md) for the comparison.

## Type namespace

`a.type()` returns a builder for the non-leaf kinds:

| Call                                    | Returns        | Notes                                                                                 |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `a.type().union([f1, f2, ...])`         | `UnionField`   | `_output = T1 \| T2 \| ...`. See [unions-literals-enums](./unions-literals-enums.md). |
| `a.type().literal(value)`               | `LiteralField` | `value: string \| number \| boolean`. `_output = value` (narrowed).                   |
| `a.type().enum(values \| tsEnum)`       | `EnumField`    | Accepts `['a','b'] as const` or a TS `enum`.                                          |
| `a.type().record(keyField, valueField)` | `RecordField`  | Plain object whose keys conform to `keyField`, values to `valueField`.                |

## Refs

`a.ref(target)` declares "this position holds a reference to a named schema". `target` is either an `ObjectField` returned by `.name(...)` or the name string directly. Validation only checks presence in v1; adapters resolve the target shape (Mongo `ObjectId`, JSON Schema `$ref`, Drizzle `references(() => target.id)`). Detailed coverage in [Refs and relations](./refs-and-relations.md).

## Universal modifiers

These are available on every field. (`unique`, `index`, and the schema-level `name`/`timestamps` are not strictly universal — see the per-field tables — but follow the same chainable convention.)

| Modifier               | Signature                                        | Notes                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.optional()`          | `() => Field<T \| undefined>`                    | Removes the required flag. `_output` and `_input` both become `T \| undefined`.                                                                                          |
| `.required()`          | `() => Field<Exclude<T, undefined>>`             | Inverse of `.optional()`. Useful inside generic composition.                                                                                                             |
| `.nullable()`          | `() => Field<T \| null>`                         | Distinct from optional. See [Nullable vs optional](./nullable-vs-optional.md).                                                                                           |
| `.default(value)`      | `(value: TOut) => Field<TOut, TIn \| undefined>` | When input is `undefined`, the default fills in. `_input` widens to `T \| undefined`.                                                                                    |
| `.describe(text)`      | `(text: string) => Field`                        | Free-form description; adapters surface it (Mongo `meta`, JSON Schema `description`).                                                                                    |
| `.adapter(name, opts)` | `(name: string, opts: unknown) => Field`         | Per-adapter escape hatch — opts are merged into the adapter's output for this field.                                                                                     |
| `.message(msg)`        | `(msg: string \| FieldMessages) => Field`        | Field-level message override (one of five levels in the resolution hierarchy).                                                                                           |
| `.unique()`            | `() => Field`                                    | Marks the field as unique in the index sense. String/number/date only. For composite uniqueness across multiple keys, use `ObjectField.index([keys], { unique: true })`. |
| `.index(opts?)`        | `(opts?: { unique?: boolean }) => Field`         | Marks the field as indexed. String/number/boolean/date.                                                                                                                  |

Example:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const bio = a.string().max(280).optional().describe('User bio (markdown)')
const nickname = a.string().nullable()
const role = a.string().default('member')
```

## Pitfalls

> [!WARNING]
> **`.coerce()` runs first.** Order is `coerce → default substitution → null/undefined handling → invalid_type check → transforms → rule checks`. Validators see the coerced value, not the raw input. The snippet below converts `42` to `"42"` before the `min(3)` check fires.
>
> <!-- from tests/docs-examples/fields-and-modifiers.test.ts -->
>
> ```ts
> const slug = a.string().coerce().toLowerCase().min(3)
> // The number 42 becomes the string "42" first, then lowercases (no-op),
> // then is checked against min(3) — which fails because "42".length === 2.
> ```

> [!WARNING]
> **`.nullable()` is NOT `.optional()`.** `nullable` accepts `null`; `optional` accepts `undefined`. They are independent — combine them if you want both. See [Nullable vs optional](./nullable-vs-optional.md).

## Related

- [Inferring types](./inferring-types.md) — how modifiers feed into `Infer<>`.
- [Composition](./composition.md) — `pick`, `omit`, `partial`, `required`, `extend`, `merge`.
- [Unions, literals, and enums](./unions-literals-enums.md).
- [Tuples vs arrays](./tuples-vs-arrays.md).
- [Recipes → Custom error messages](../recipes/custom-error-messages.md).
- [Recipes → Writing a custom adapter](../recipes/custom-adapter.md).
