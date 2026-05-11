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
}
```

It's a normal `Error` subclass — `instanceof SapphireValidationError` works, and `JSON.stringify({ issues: err.issues })` survives the wire (assuming none of your message values are functions; see pitfalls).

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

| Code                                                    | Where it fires                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `required`                                              | Required field is `undefined` (or `null` when not nullable)                    |
| `invalid_type`                                          | Wrong runtime type (e.g. `null` for a string, array for object)                |
| `min_length`                                            | String shorter than `.min(n)`                                                  |
| `max_length`                                            | String longer than `.max(n)`                                                   |
| `length`                                                | String length not equal to `.length(n)`                                        |
| `regex`                                                 | `.regex(...)` didn't match                                                     |
| `format`                                                | `.email()` / `.url()` / `.uuid()` didn't match                                 |
| `starts_with`                                           | `.startsWith(...)` failed                                                      |
| `ends_with`                                             | `.endsWith(...)` failed                                                        |
| `min` / `max`                                           | Number below `.min(n)` / above `.max(n)`                                       |
| `gt` / `gte` / `lt` / `lte`                             | Numeric strict / inclusive bound failed                                        |
| `int`                                                   | `.int()` got a non-integer                                                     |
| `multiple_of`                                           | `.multipleOf(n)` failed                                                        |
| `finite`                                                | `.finite()` got `Infinity` or `NaN`                                            |
| `safe`                                                  | `.safe()` got an unsafe integer                                                |
| `min_items` / `max_items` / `items_length` / `nonempty` | Array constraints                                                              |
| `enum`                                                  | Value not in `enum(...)` set                                                   |
| `literal`                                               | Literal mismatch                                                               |
| `tuple_length`                                          | Tuple's array length didn't match its shape                                    |
| `union_no_match`                                        | No `union(...)` branch accepted the value                                      |
| `unknown_key`                                           | Object received a key not declared in the schema (and `stripUnknown` is false) |

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
- _Recipes → Custom error messages_ — [link](../recipes/custom-error-messages.md) _(coming in F15)_.
