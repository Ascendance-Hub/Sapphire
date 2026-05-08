# @ascendance-hub/sapphire-json-schema

JSON Schema 2020-12 adapter for [Sapphire](https://github.com/Ascendance-Hub/Sapphire). Converts a Sapphire IR (`SapphireSchemaNode`) into a JSON Schema object suitable for AJV, MCP tool input schemas, frontend form generators, and cross-language validators.

## Install

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-json-schema
```

`@ascendance-hub/sapphire-core` is a peer dependency. There are no other peer requirements — pick whichever JSON Schema validator you like (AJV, Hyperjump, browser-based, etc.).

## Register the adapter

The adapter is **not auto-registered**. Call `registerAdapter` once in your application entry point:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

registerAdapter('json-schema', toJsonSchema)

export const a = new Sapphire({ defaultAdapter: 'json-schema' })
```

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

The output is a plain JSON Schema 2020-12 object. Use it as an MCP tool's `inputSchema`, feed it to `react-jsonschema-form`, or share it with a Python validator — same shape everywhere.

## IR mapping table

| IR `kind` | JSON Schema output                                         | Notes                                                                                                                                                                    |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `string`  | `{ type: 'string', ... }`                                  | `format` (`email`/`uri`/`uuid`); Sapphire's `url` is emitted as `uri`. `startsWith`/`endsWith` become escaped `pattern`s; combined with `regex` they merge into `allOf`. |
| `number`  | `{ type: 'number' \| 'integer', ... }`                     | `int()` → `'integer'`. `min`/`max`/`exclusiveMin`/`exclusiveMax`/`multipleOf` map to JSON Schema keywords. `finite`/`safe` are no-ops (no JSON Schema equivalent).       |
| `boolean` | `{ type: 'boolean' }`                                      | —                                                                                                                                                                        |
| `date`    | `{ type: 'string', format: 'date-time' }`                  | `min`/`max` (Date) are no-ops; AJV requires `ajv-formats` to validate `date-time`.                                                                                       |
| `object`  | `{ type: 'object', properties, required, ... }`            | `required` derived from `child.required === true`. Named objects emit a `$ref`; the body lives in top-level `$defs`.                                                     |
| `array`   | `{ type: 'array', items, minItems, maxItems }`             | `nonempty()` → `minItems: 1`. `length(n)` → `minItems: maxItems: n`.                                                                                                     |
| `tuple`   | `{ type: 'array', prefixItems, items: false, min/max }`    | 2020-12-only shape. Use `Ajv2020` for compilation.                                                                                                                       |
| `union`   | `{ oneOf: [...] }`                                         | `oneOf` (exactly one) — semantically discriminated.                                                                                                                      |
| `literal` | `{ const: value }`                                         | —                                                                                                                                                                        |
| `enum`    | `{ type, enum: [...values] }`                              | `type` is `'string'` or `'number'` based on the values.                                                                                                                  |
| `record`  | `{ type: 'object', additionalProperties, propertyNames? }` | `propertyNames` is emitted only when the key field carries real constraints.                                                                                             |
| `ref`     | `{ $ref: '#/$defs/<target>' }`                             | Cyclic refs are supported natively in 2020-12.                                                                                                                           |

### Schema-level

- `ObjectField.timestamps()` and `ObjectField.index([...])` → no-op (database semantics, not validation).
- `ObjectField.adapter('json-schema', { ... })` → see escape hatch.

## `.adapter('json-schema', opts)` escape hatch

Anything passed via `.adapter('json-schema', { ... })` is read from `meta['json-schema']` and merged onto the resulting schema (last-wins). Useful keys:

| Key                    | Effect                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `format: 'ipv4'` etc.  | Custom format strings (require `ajv-formats` or equivalent to validate at runtime). |
| `contentEncoding`      | Annotation for binary/base64 fields.                                                |
| `additionalProperties` | Per-object override; pair with the global default in `JsonSchemaAdapterOptions`.    |
| `examples`             | Annotation array surfaced by docs/UI generators.                                    |

**Blacklist:** `type` and `$ref` cannot be overridden. They are always Sapphire-controlled.

## `JsonSchemaAdapterOptions`

| Option                 | Default | Effect                                                                              |
| ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `additionalProperties` | omitted | Default value emitted on every object schema. JSON Schema's spec default is `true`. |
| `$id`                  | omitted | Top-level `$id`.                                                                    |
| `defs`                 | `{}`    | Extra named schemas to include in `$defs` beyond what the walker auto-collects.     |
| `emitSchemaUri`        | `true`  | Whether to emit `$schema: 'https://json-schema.org/draft/2020-12/schema'`.          |

```ts
toJsonSchema(node, {
  additionalProperties: false,
  $id: 'https://example.com/schemas/user',
  defs: { ExtraType: someNode },
})
```

## Limitations

- **`transforms`/`coerce` no-op.** JSON Schema is descriptive, not an engine. Apply transforms via core (`safeParse`) before persisting.
- **`unique`/`index`/`timestamps`/composite indexes no-op.** These are database concerns, not validation.
- **`nullable` rewrites `type` to a union** (`type: [<x>, 'null']`) for plain primitives, or `oneOf: [original, { type: 'null' }]` for composite/`$ref`/`enum`/`literal` cases.
- **`name` characters are limited to `[A-Za-z0-9_-]+`.** JSON Pointer escaping for `/` and `~` is not performed; names with those characters throw at build time.
- **`prefixItems` is 2020-12-only.** Compile tuples with `Ajv2020` (`ajv/dist/2020.js`); the default 8.x `Ajv` constructor uses draft-07 and will not understand them.
- **`format` is annotation-only in AJV out-of-the-box.** Install `ajv-formats` if you want runtime checking of `email`/`uri`/`uuid`/`date-time` etc.
- **`number.finite`/`number.safe` no-op.** No JSON Schema equivalent.
- **Auto-register removed.** Call `registerAdapter('json-schema', toJsonSchema)` once in your entry point.

## License

BSD-3-Clause
