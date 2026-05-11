<!-- Code in this guide is verified by tests/docs-examples/nullable-vs-optional.test.ts -->

# Nullable vs optional

`.optional()` and `.nullable()` look alike but model **different ideas**: optional is about whether the value is _there_, nullable is about whether it can be `null`. Sapphire keeps the two separate at every layer — brand types, IR, and adapter output — because storage frameworks differentiate "no field at all" from "field present but null". Conflating them is the most common source of "why doesn't my schema match" confusion; this page is short on purpose.

## The table

| Modifier                 | `_output`                | Semantic                      |
| ------------------------ | ------------------------ | ----------------------------- |
| _(none)_                 | `T`                      | required, value present       |
| `.optional()`            | `T \| undefined`         | field may be absent           |
| `.nullable()`            | `T \| null`              | value present but may be null |
| `.optional().nullable()` | `T \| null \| undefined` | both                          |

## Why distinct?

Storage and serialization frameworks model "absent" and "null" differently. Mongoose treats `required: false` (absence allowed) and `default: null` (present-with-null) as separate concerns. JSON Schema distinguishes a key missing from `required[]` (absence) from a `type: ['x', 'null']` value (present null). Drizzle distinguishes a nullable column from a column simply not part of an insert. If Sapphire collapsed them, you'd lose information on the way out to the adapter.

## Runtime behavior

<!-- from tests/docs-examples/nullable-vs-optional.test.ts -->

```ts
const nullableName = a.string().nullable()
nullableName.parse(null) // → null

const optionalName = a.string().optional()
optionalName.parse(undefined) // → undefined
```

`null` passed to a non-nullable required field fails with `code: 'required'` — Sapphire treats `null` like a missing value unless the field is `.nullable()`. If you want strict typing where `null` is "present but bad" instead of "missing", use `.nullable()` on the schema and reject `null` in your application layer.

## Inside an object

<!-- from tests/docs-examples/nullable-vs-optional.test.ts -->

```ts
const userOpt = a.object({ nickname: a.string().optional() })
type UserOpt = Infer<typeof userOpt>
// UserOpt = { nickname?: string | undefined }   // the KEY is optional

const userNul = a.object({ nickname: a.string().nullable() })
type UserNul = Infer<typeof userNul>
// UserNul = { nickname: string | null }         // the key is REQUIRED
```

Only `.optional()` lifts the property into a `?:` position. `.nullable()` keeps the key required and widens the value type to `T | null`.

## Adapter behavior

- **mongo** — `.optional()` → `required: false`. `.nullable()` is rare in Mongoose; the value is allowed but storage still requires the key to be present.
- **json-schema** — `.optional()` removes the key from `required[]`. `.nullable()` widens the type to `['x', 'null']` (or wraps in `oneOf` when there are constraints incompatible with a type-array).
- **drizzle** — `.optional()` and `.nullable()` both omit `notNull()` (the column accepts NULL). The semantic difference is on the input side; the column itself is the same.

## Pitfalls

> [!WARNING]
> **`.optional().default('x')` keeps `_output` as `T | undefined`.** Once `.optional()` widens the output brand to `T | undefined`, `.default()` doesn't narrow it back — only the input side. If you want `_output: T`, drop `.optional()` and rely on `.default('x')` alone (it already widens `_input` to `T | undefined` so callers may omit the key).

> [!WARNING]
> **`null` is treated as "missing" by non-nullable fields.** Calling `safeParse(null)` on a non-nullable required field fails with `code: 'required'` (NOT `'invalid_type'`) — Sapphire short-circuits null/undefined together before the type check. Form libraries that send `null` for empty fields land in the same `required` bucket as `undefined`. To get a real "present but null is illegal" semantic, mark the field `.nullable()` and validate further in your code.

## Related

- [Inferring types](./inferring-types.md) — full `_input` / `_output` table including `.default()`.
- [Validation](./validation.md) — `IssueCode` semantics for `required` vs `invalid_type`.
- [Fields and modifiers](./fields-and-modifiers.md) — universal modifier reference.
