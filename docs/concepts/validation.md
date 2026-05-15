<!-- Code in this guide is verified by tests/docs-examples/validation.test.ts -->

# Validation

Every Sapphire field exposes `parse(value, opts?)` and `safeParse(value, opts?)`. They consume runtime input and either return a typed value or surface a structured list of issues. Validation is a first-class secondary concern — Sapphire's design centre is the IR-and-adapters pipeline, but the parse layer is solid enough to drive form validation, API request validation, and MCP tool input checks.

## `parse` vs `safeParse`

| Method      | Success                              | Failure                                |
| ----------- | ------------------------------------ | -------------------------------------- |
| `parse`     | returns the parsed value (`_output`) | throws `SapphireValidationError`       |
| `safeParse` | `{ success: true, data }`            | `{ success: false, error }` (no throw) |

Use `safeParse` for expected error flows (forms, API requests). Use `parse` when an error means a bug (already-validated input, tests).

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const result = user.safeParse({ name: '', age: -1 })
if (result.success) {
  // result.data is typed as Infer<typeof user>
} else {
  // result.error is a SapphireValidationError
  // result.error.issues is ValidationIssue[]
}
```

## `SapphireValidationError`

```ts
class SapphireValidationError extends Error {
  readonly name: 'SapphireValidationError'
  readonly message: string // 'Validation failed (N issue[s])'
  readonly issues: ValidationIssue[]

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> }
  format(): FormattedError // recursive tree, `_errors` at every node
  toJSON(): { name: string; message: string; issues: ValidationIssue[] }
}
```

It's a normal `Error` subclass — `instanceof SapphireValidationError` works, and `JSON.stringify(err)` survives the wire (it routes through `toJSON()`; assuming none of your message values are functions, see pitfalls).

### Surfacing issues — `flatten()` / `format()`

`issues` is the raw list. For DTO / form work the two helpers below save you the pivot:

- **`flatten()`** — buckets messages by the **top-level** field name. Issues with an empty path go to `formErrors`; everything else lands in `fieldErrors[firstPathSegment]`. Ideal for flat forms.

  ```ts
  const r = UserSchema.safeParse(input)
  if (!r.success) {
    const { fieldErrors, formErrors } = r.error.flatten()
    // fieldErrors: { email: ['Invalid email'], age: ['Must be an integer'] }
  }
  ```

- **`format()`** — builds a tree mirroring the input shape, with an `_errors: string[]` array at every node. Ideal for nested DTOs where a flat key isn't enough.

  ```ts
  const tree = r.error.format()
  // tree.address.zip._errors → ['Must be exactly 5 characters']
  ```

## `ValidationIssue`

```ts
interface ValidationIssue {
  path: (string | number)[]
  code: IssueCode
  message: string | object
  context?: Record<string, unknown>
}
```

- `path` — where the issue lives in the input (e.g. `['profile', 'email']`).
- `code` — a stable string from the `IssueCode` union (table below).
- `message` — the resolved message. `string` by default; any shape if you returned an object from a `MessageValue`.
- `context` — rule-specific extras (e.g. `{ min: 3, got: 2 }`), absent when no extras apply.

## `IssueCode` — built-in codes

| Code                                       | Where it fires                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `required`                                 | Required field is `undefined` (or `null` when not nullable)                    |
| `invalid_type`                             | Wrong runtime type (e.g. `null` for a string, array for object)                |
| `min_length`                               | String shorter than `.min(n)`                                                  |
| `max_length`                               | String longer than `.max(n)`                                                   |
| `length`                                   | String length not equal to `.length(n)`                                        |
| `regex`                                    | `.regex(...)` didn't match                                                     |
| `format`                                   | `.email()` / `.url()` / `.uuid()` didn't match                                 |
| `starts_with`                              | `.startsWith(...)` failed                                                      |
| `ends_with`                                | `.endsWith(...)` failed                                                        |
| `min` / `max`                              | Number below `.min(n)` / above `.max(n)`                                       |
| `gt` / `gte` / `lt` / `lte`                | Numeric strict / inclusive bound failed                                        |
| `int`                                      | `.int()` got a non-integer                                                     |
| `multiple_of`                              | `.multipleOf(n)` failed                                                        |
| `finite`                                   | `.finite()` got `±Infinity` (NaN is caught earlier by `invalid_type`)          |
| `safe`                                     | `.safe()` got an unsafe integer                                                |
| `min_items` / `max_items` / `items_length` | Array constraints (`.nonempty()` is sugar for `.min(1)` → `min_items`)         |
| `enum`                                     | Value not in `enum(...)` set                                                   |
| `literal`                                  | Literal mismatch                                                               |
| `tuple_length`                             | Tuple's array length didn't match its shape                                    |
| `union_no_match`                           | No `union(...)` branch accepted the value                                      |
| `unknown_key`                              | Object received a key not declared in the schema (and `stripUnknown` is false) |
| `ref_target_missing`                       | `a.ref(name)` target not registered on the Sapphire instance                   |

Third-party adapters and future refine APIs can attach their own codes; `IssueCode` is `... | (string & {})` so custom codes type-check while built-ins still autocomplete.

## Message resolution hierarchy

Most specific wins. Each row beats every row above it:

| Layer             | API                                       |
| ----------------- | ----------------------------------------- |
| Built-in          | `packages/core/src/messages.ts` (English) |
| Sapphire instance | `new Sapphire({ messages: {...} })`       |
| Field-level       | `a.string().message('...' \| {...})`      |
| Per-rule          | `a.string().min(3, { message: '...' })`   |
| Per-call          | `schema.parse(v, { messages: {...} })`    |

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const a = new Sapphire({ messages: { min_length: 'instance: too short' } })

const name = a
  .string()
  .min(3, { message: 'per-rule: at least 3' })
  .message({ min_length: 'field: too short' })

// per-rule wins over field-level
const r1 = name.safeParse('ab')

// per-call beats per-rule
const r2 = name.safeParse('ab', {
  messages: { min_length: 'per-call wins' },
})
```

A `MessageValue` is `string | object | (ctx: MessageContext) => string | object`. Function form receives `ctx = { path, code, ...extras }` (rule extras like `min`, `max`, `expected`, `got`).

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const name = a.string().min(3, {
  message: (ctx) => `[${ctx.path.join('.')}] code=${ctx.code} min=${String(ctx.min)}`,
})

name.safeParse('ab')
// issue.message === '[] code=min_length min=3'
```

## `abortEarly`

`false` by default — Sapphire collects every issue across the whole input before returning. Set to `true` (instance or per-call) to short-circuit on the first failure.

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const result = user.safeParse({ name: '', age: -1 }, { abortEarly: true })
// result.error.issues.length === 1
```

`abortEarly: true` bails on the first rule failure both **between** fields (object key, array item, tuple slot, record entry) and **within** a single leaf field (`string`/`number`/`date` rule chain). So `a.string().min(10).regex(/^x/)` against `'a'` emits one issue when abortEarly is on, both when it's off.

The bail is uniform across composite fields: an array's length/`minItems`/`maxItems` checks, a tuple's length check, and an object's per-key checks all stop at the **first** issue when `abortEarly` is on. An array that violates both `.length(4)` and `.min(3)` reports just one issue under `abortEarly`, never starting per-item validation.

### Why the default is to accumulate

`safeParse` keeps every rule failure on every field by design — the **"tell the user everything wrong at once"** model fits forms and API validation, where surfacing partial errors leads to whack-a-mole correction loops. A single string field with `.length(5).min(7)` against `'abc'` will report **both** `length` and `min_length` so the UI can highlight both constraints at once. Flip `abortEarly` only on hot boundaries (e.g. server entrypoints) where you want to fail fast and don't care about completeness.

## `stripUnknown`

`false` by default. With the default, unknown keys on an object yield a `code: 'unknown_key'` issue per offending key (one per key, walked left-to-right). With `stripUnknown: true`, unknown keys are silently dropped from the output and no issues are emitted.

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const strict = user.safeParse({ name: 'Ada', rogue: 1 })
// strict.success === false; issues[0].code === 'unknown_key'

const lax = user.parse({ name: 'Ada', rogue: 1 }, { stripUnknown: true })
// lax === { name: 'Ada' }
```

## Pitfalls

> [!WARNING]
> **`safeParse` never mutates input.** Even when `coerce`/transform modifiers fire (e.g. `a.string().trim()`, `a.number().coerce()`), Sapphire produces a NEW value in `result.data`. The original object is untouched.

> [!WARNING]
> **Function messages run per failure, not at field-definition time.** `ctx` is rebuilt for every issue, so closure state in a message function will be invoked once per failure across all parses of the field. Useful for i18n (`(ctx) => translate(ctx.code, ctx)`), but don't put expensive computations inside.

> [!WARNING]
> **`abortEarly: true` hides downstream issues.** Default is `false` for a reason — most UIs want every error at once. Flip it for fast-fail server boundaries, not for forms.

> [!WARNING]
> **`stripUnknown: true` only affects unknown keys; it does not relax other rules.** It removes extras from the output silently. If you want a strict "throw on extras" mode, pair it with an explicit `unknown_key` check or document the API contract elsewhere — Sapphire does not have a `strict()` modifier in v1.

## Related

- [Config](./config.md) — instance options and per-call overrides in detail.
- [Nullable vs optional](./nullable-vs-optional.md) — when `required` vs `invalid_type` fires.
- [Recipes → Custom error messages](../recipes/custom-error-messages.md).
