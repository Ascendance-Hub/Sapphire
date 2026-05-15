<!-- Code in this guide is verified by tests/docs-examples/config.test.ts -->

# Config

The `Sapphire` instance carries configuration and the named-schema registry. You construct one with `new Sapphire(options)` and use it as your DSL entry point — `a.object(...)`, `a.string(...)`, etc. Most apps export a single instance and import it everywhere, but the class is fully testable: nothing global, no singleton, no module-side-effects.

## Minimal example

<!-- from tests/docs-examples/config.test.ts -->

```ts
import { Sapphire } from '@ascendance-hub/sapphire-core'

const a = new Sapphire({
  abortEarly: true,
  stripUnknown: true,
  messages: { min_length: 'too short' },
})

const user = a.object({
  name: a.string().min(3),
  age: a.number(),
})

const r = user.safeParse({ name: 'ab', age: 1, extra: 'ignored' })
// r.error.issues.length === 1 (abortEarly), and 'extra' was dropped
```

## `SapphireOptions`

| Option           | Type                                                    | Default     | Notes                                                                        |
| ---------------- | ------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `defaultAdapter` | `string \| undefined`                                   | `undefined` | Name used by `field.getSchema()` when called without an argument             |
| `messages`       | `Partial<Record<IssueCode, MessageValue>> \| undefined` | `undefined` | Global message overrides (one layer of the resolution hierarchy)             |
| `stripUnknown`   | `boolean`                                               | `false`     | Applied to every parse; with `false`, unknown keys emit `unknown_key` issues |
| `abortEarly`     | `boolean`                                               | `false`     | Applied to every parse; with `true`, stops on the first issue                |

## Per-call overrides

`parse` and `safeParse` accept the same names. Per-call wins over instance:

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a = new Sapphire({ abortEarly: true })
const schema = a.object({
  name: a.string().min(1),
  age: a.number().nonnegative(),
})

// Instance says abortEarly:true, per-call flips it to false:
const r = schema.safeParse({ name: '', age: -1 }, { abortEarly: false })
// r.error.issues collects both failures despite the instance default
```

## Message layers in one place

The full hierarchy (most specific wins):

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a = new Sapphire({
  messages: { min_length: 'instance level' },
})

const onlyInstance = a.string().min(3)
// onlyInstance.safeParse('ab') → 'instance level'

const withField = a.string().min(3).message({ min_length: 'field level' })
// withField.safeParse('ab') → 'field level' (field beats instance)

const withRule = a.string().min(3, { message: 'rule level' })
// withRule.safeParse('ab') → 'rule level' (rule beats field & instance)

withRule.safeParse('ab', { messages: { min_length: 'call level' } })
// → 'call level' (per-call beats everything)
```

See [Validation](./validation.md) for the same hierarchy framed around issues.

## Named-schema registry

The instance owns a `NamedSchemaRegistry` (populated by `.name(...)` on object fields, read by `a.ref(...)`). It's **per-instance** — two `Sapphire` instances never share state:

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a1 = new Sapphire()
const a2 = new Sapphire()

a1.object({ x: a1.string() }).name('User')
a2.object({ y: a2.string() }).name('User')
// No collision — each Sapphire has its own NamedSchemaRegistry.
```

## Pitfalls

> [!WARNING]
> **Don't share a Sapphire instance across modules unless the schemas are meant to be shared.** The named-schema registry is per-instance; if module A and module B both `.name('User')` against the same `a`, the second one throws. Tests in particular should construct a fresh `new Sapphire()` per file (or per test).

> [!WARNING]
> **Function messages run AT MESSAGE TIME, not at field-creation time.** They receive `ctx = { path, code, ...extras }` per failure, but they have no access to the Sapphire instance — close over any extra data you need at definition site.

> [!NOTE]
> **A field captures its instance options when it is constructed.** `defaultAdapter` and the message layers are read off the `Sapphire` instance at the moment `a.string()` / `a.object()` etc. run. `abortEarly` and `stripUnknown`, by contrast, are read at parse time. The practical rule: construct one `Sapphire` instance per logical configuration and build all of that config's schemas from it — don't expect a field built on instance A to pick up changes you make by constructing instance B later.

## Related

- [Validation](./validation.md) — `parse` / `safeParse` options and issue shape.
- [Refs and relations](./refs-and-relations.md) — how the named-schema registry is used.
- [Escape hatch](./escape-hatch.md) — adapter-specific config that doesn't belong in `SapphireOptions`.
