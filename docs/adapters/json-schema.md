# JSON Schema adapter — `@ascendance-hub/sapphire-json-schema`

The JSON Schema adapter compiles a Sapphire IR (`SapphireSchemaNode`) into a [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/) document. The output is plain JSON — pass it to AJV (`ajv/dist/2020.js`), feed it to a frontend form generator like `react-jsonschema-form`, surface it as a Model Context Protocol tool's `inputSchema`, or share it with a Python validator. Same shape, every consumer.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-json-schema
```

Only `@ascendance-hub/sapphire-core` is a peer. There are no other runtime requirements — the adapter emits JSON; pick whichever validator you like.

## Dialect — why 2020-12

Sapphire targets the **2020-12** draft specifically. Two reasons (V1_DESIGN §15 #4):

1. **`prefixItems`** is the canonical tuple representation; older drafts used the polymorphic `items: [...]` which AJV no longer treats as positional past draft-07.
2. **Numeric `exclusiveMinimum`/`exclusiveMaximum`** — older drafts emitted boolean flags; 2020-12 uses numeric forms that compose cleanly with `minimum`/`maximum`.

Use the 2020-aware AJV constructor:

```ts
import Ajv2020 from 'ajv/dist/2020.js'

const ajv = new Ajv2020({ strict: false })
```

Plain `new Ajv()` (default draft-07 in v8) will choke on `prefixItems`.

## Register the adapter

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

registerAdapter('json-schema', toJsonSchema)

export const a = new Sapphire({ defaultAdapter: 'json-schema' })
```

The adapter is **not auto-registered** — call this once in your entry point.

## Quickstart

```ts
import Ajv2020 from 'ajv/dist/2020.js'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { a } from './sapphire'

const CreateUser = a
  .object({
    name: a.string().min(1),
    email: a.string().email(),
    age: a.number().int().min(0).optional(),
  })
  .name('CreateUser')

const schema = toJsonSchema(CreateUser.toSchema(), {
  $id: 'https://example.com/schemas/create-user',
})

const ajv = new Ajv2020({ strict: false })
const validate = ajv.compile(schema)
validate({ name: 'Ada', email: 'ada@example.com' }) // → true
```

Or, with the adapter registered: `CreateUser.getSchema('json-schema')`.

## IR → JSON Schema mapping

| IR `kind`            | JSON Schema output                                                             | Notes                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`             | `{ type: 'string', ... }`                                                      | `minLength`/`maxLength`/`length` direct. `regex` → `pattern`; `startsWith`/`endsWith` → escaped patterns; combining yields `allOf: [{ pattern }, ...]`. `format`: `url` rewritten to `uri`; others pass through. |
| `number`             | `{ type: 'number' \| 'integer', ... }`                                         | `int()` → `'integer'`. `min`/`max`/`exclusiveMin`/`exclusiveMax`/`multipleOf` map directly. `finite`/`safe` no-op.                                                                                               |
| `boolean`            | `{ type: 'boolean' }`                                                          | —                                                                                                                                                                                                                |
| `date`               | `{ type: 'string', format: 'date-time' }`                                      | `min`/`max` (Date) no-op. AJV needs `ajv-formats` to runtime-check `date-time`.                                                                                                                                  |
| `object` (anonymous) | `{ type: 'object', properties, required }`                                     | `required` derived from `child.required === true`. `additionalProperties` set when the adapter option is present.                                                                                                |
| `object` (named)     | `{ $ref: '#/$defs/<name>' }` at the use site; body lives in top-level `$defs`. | Names must match `[A-Za-z0-9_-]+` — JSON Pointer escaping is not performed.                                                                                                                                      |
| `array`              | `{ type: 'array', items, minItems, maxItems }`                                 | `nonempty()` → `minItems: 1`. `length(n)` → both bounds to `n`.                                                                                                                                                  |
| `tuple`              | `{ type: 'array', prefixItems, items: false, minItems, maxItems }`             | 2020-12 shape. Length is fixed (both bounds equal `items.length`).                                                                                                                                               |
| `union`              | `{ oneOf: [...] }`                                                             | Semantically exclusive — exactly one branch must match.                                                                                                                                                          |
| `literal`            | `{ const: value }`                                                             | —                                                                                                                                                                                                                |
| `enum`               | `{ type, enum: [...values] }`                                                  | `type` is `'number'` if every value is numeric, else `'string'`.                                                                                                                                                 |
| `record`             | `{ type: 'object', additionalProperties, propertyNames? }`                     | `propertyNames` only emitted when the key field carries real constraints (`hasStringConstraints`).                                                                                                               |
| `ref`                | `{ $ref: '#/$defs/<target>' }`                                                 | Cycles are native in 2020-12.                                                                                                                                                                                    |

### `nullable` handling

Two emission strategies:

- **Plain primitive without `enum`** → lifted into a type union: `{ type: ['string', 'null'], ... }`.
- **Compound, refs, enums, literals** → wrapped in `oneOf`: `{ oneOf: [<original>, { type: 'null' }] }`.

```ts
a.string().nullable()
// → { type: ['string', 'null'] }

a.type().enum(['admin', 'user']).nullable()
// → { oneOf: [{ type: 'string', enum: ['admin', 'user'] }, { type: 'null' }] }
```

### Universal modifiers

| Modifier                                            | Effect                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `default(v)`                                        | `out.default = v`.                                                             |
| `describe(s)`                                       | `out.description = s`.                                                         |
| `enum([...])`                                       | `out.enum = [...]` (when not already set by the kind itself).                  |
| `unique`/`index`/`timestamps`/`coerce`/`transforms` | **No-op.** JSON Schema is descriptive; these are database or runtime concerns. |

### `$defs` collector

`toJsonSchema` walks the input tree and auto-collects every **named** object into top-level `$defs`. Walks descend into:

- `object.properties` (children),
- `array.items`,
- `tuple.items[]`,
- `union.options[]`,
- `record.keys` and `record.values`.

It does **not** walk arbitrary fields you reference elsewhere. If a `ref('Other')` points at a schema not embedded in the input tree, pass it via `options.defs`:

```ts
toJsonSchema(User.toSchema(), {
  defs: {
    Profile: ProfileObjectField.toSchema(),
  },
})
```

Cycles (e.g. User ↔ Post) work because `$ref` is just a string — no recursion happens until validation time.

## `JsonSchemaAdapterOptions`

The second argument to `toJsonSchema(node, options?)`:

| Option                 | Default | Effect                                                                                                                                                    |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalProperties` | omitted | Default emitted on every object schema. Spec default is `true`; set to `false` for strict mode. Per-object overrides still possible via the escape hatch. |
| `$id`                  | omitted | Top-level `$id` URL.                                                                                                                                      |
| `defs`                 | `{}`    | Extra named schemas appended to `$defs` beyond what the walker auto-collects.                                                                             |
| `emitSchemaUri`        | `true`  | Whether to emit `$schema: 'https://json-schema.org/draft/2020-12/schema'`. Turn off when embedding into a wrapper that already declares the dialect.      |

## `.adapter('json-schema', opts)` escape hatch

Anything passed via `.adapter('json-schema', { ... })` is read from `meta['json-schema']` and merged onto the output node **last** (after Sapphire-derived keys). It wins on conflicts, with one exception — the blacklist:

```ts
const META_BLACKLIST = new Set(['type', '$ref'])
```

`type` and `$ref` are always Sapphire-controlled. Useful keys:

| Key                                   | Effect                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| `title`                               | Annotation surfaced by UI generators.                                 |
| `examples`                            | Annotation array.                                                     |
| `deprecated`                          | `true` flags the property in docs/tooling.                            |
| `format: 'ipv4' \| 'hostname' \| ...` | Custom format strings (require `ajv-formats` to validate at runtime). |
| `contentEncoding`                     | Annotation for binary/base64 fields.                                  |
| `additionalProperties`                | Per-object override of the global default.                            |
| `x-*`                                 | Any vendor extension is passed through unchanged.                     |

## Use cases

- **MCP tool input schemas.** A Sapphire object → JSON Schema → drop into the MCP tool's `inputSchema` slot. Same definition feeds the runtime validator (via AJV) and the type inference (via `Infer<typeof schema>`).
- **Frontend form generators.** Output is compatible with `react-jsonschema-form`, `@rjsf/*`, JSON Forms, etc. The `title`/`description`/`examples` annotations come through unchanged.
- **Cross-language validation.** A Python or Go service can validate the same payload against the same emitted schema — keep the schema as the contract, not language-specific parsers.

## Limitations

> [!WARNING]
> **`transforms`/`coerce` no-op.** JSON Schema is descriptive, not an engine. Apply transforms via core (`safeParse`) before persisting.

> [!WARNING]
> **`unique`/`index`/`timestamps`/composite indexes no-op.** These are database concerns, not validation.

> [!WARNING]
> **`number.finite`/`number.safe` no-op.** No JSON Schema equivalent.

> [!WARNING]
> **`format` is annotation-only in AJV by default.** Install `ajv-formats` and call `addFormats(ajv)` to enable runtime checking of `email`/`uri`/`uuid`/`date-time` etc.

> [!WARNING]
> **`prefixItems` is 2020-12-only.** Use `Ajv2020` (`ajv/dist/2020.js`) to compile schemas containing tuples. Older draft constructors will silently mis-interpret them.

> [!WARNING]
> **Named schemas are restricted to `[A-Za-z0-9_-]+`.** JSON Pointer escaping for `/` and `~` is not performed; names with those characters throw at build time.

> [!WARNING]
> **2020-12 only.** Older dialects (draft-07, OpenAPI 3.0 subset) are V1_FUTURE.

## Related

- [Refs and relations](../concepts/refs-and-relations.md) — how named schemas become `$ref`s.
- [Nullable vs optional](../concepts/nullable-vs-optional.md) — drives the `oneOf` vs type-union choice.
- [Escape hatch](../concepts/escape-hatch.md) — universal `.adapter(name, opts)` contract.
- [Recipes → Share types with the frontend](../recipes/share-types-with-frontend.md).
