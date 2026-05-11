# Writing a custom adapter

## Use case

The three first-party adapters (Mongo, JSON Schema, Drizzle) cover the common cases, but Sapphire is built so that adapters are pure functions over the IR. Anyone can write one. Reasons you might:

- **Prisma / Kysely / TypeORM** — your team's ORM isn't in the box yet.
- **Internal serialization formats** — Protobuf, Avro, a custom snapshot format.
- **Tooling output** — generate Markdown docs, an OpenAPI fragment, a GraphQL SDL, or a `console.log`-friendly description of a schema.

`registerAdapter` is public API. The contract is small: a function from `SapphireSchemaNode` to whatever you want.

## End-to-end example — a tiny "log" adapter

The adapter below walks the IR and emits a one-line human-readable description per node. It's useful for debugging, for telemetry, and as a template.

```ts
import {
  Sapphire,
  registerAdapter,
  type SapphireSchemaNode,
  type SchemaAdapter,
} from '@ascendance-hub/sapphire-core'

function toLogString(node: SapphireSchemaNode): string {
  const opt = node.required ? '' : '?'
  const nul = node.nullable ? '|null' : ''
  switch (node.kind) {
    case 'string': {
      const parts: string[] = []
      if (node.minLength !== undefined) parts.push(`min=${node.minLength}`)
      if (node.maxLength !== undefined) parts.push(`max=${node.maxLength}`)
      if (node.format) parts.push(`format=${node.format}`)
      const suffix = parts.length ? `(${parts.join(',')})` : ''
      return `string${suffix}${nul}${opt}`
    }
    case 'number': {
      const parts: string[] = []
      if (node.int) parts.push('int')
      if (node.min !== undefined) parts.push(`min=${node.min}`)
      if (node.max !== undefined) parts.push(`max=${node.max}`)
      const suffix = parts.length ? `(${parts.join(',')})` : ''
      return `number${suffix}${nul}${opt}`
    }
    case 'boolean':
      return `boolean${nul}${opt}`
    case 'date':
      return `date${nul}${opt}`
    case 'object': {
      const entries = Object.entries(node.properties).map(([k, v]) => `${k}: ${toLogString(v)}`)
      const name = node.name ? `${node.name} ` : ''
      return `${name}{ ${entries.join(', ')} }${nul}${opt}`
    }
    case 'array':
      return `${toLogString(node.items)}[]${nul}${opt}`
    case 'tuple':
      return `[${node.items.map(toLogString).join(', ')}]${nul}${opt}`
    case 'union':
      return `(${node.options.map(toLogString).join(' | ')})${nul}${opt}`
    case 'literal':
      return `${JSON.stringify(node.value)}${nul}${opt}`
    case 'enum':
      return `enum(${node.values.map((v) => JSON.stringify(v)).join('|')})${nul}${opt}`
    case 'record':
      return `Record<${toLogString(node.keys)}, ${toLogString(node.values)}>${nul}${opt}`
    case 'ref':
      return `ref(${node.target})${nul}${opt}`
    default: {
      // Exhaustiveness check — TS will error here if a new IR kind is added.
      const _exhaustive: never = node
      return `<unknown>${String(_exhaustive)}`
    }
  }
}

// The adapter signature is `(node, options?) => unknown`.
const logAdapter: SchemaAdapter = (node) => toLogString(node)
registerAdapter('log', logAdapter)

// --- Use it -------------------------------------------------------
const a = new Sapphire()

const User = a
  .object({
    id: a.string().format('uuid' as never),
    name: a.string().min(1),
    age: a.number().int().min(0).optional(),
    role: a.type().enum(['admin', 'user'] as const),
  })
  .name('User')

console.log(User.getSchema('log'))
// User { id: string(format=uuid), name: string(min=1), age: number(int,min=0)?, role: enum("admin"|"user") }
```

## Step by step

1. **Define the adapter function.** Signature: `(node: SapphireSchemaNode, options?: unknown) => unknown`. Return whatever your consumer needs — a string, an object, a function, anything.
2. **Switch on `node.kind`.** Sapphire's IR is a discriminated union with 12 cases. TypeScript will narrow `node` to the right branch inside each `case`.
3. **Recurse into composites.** `object` has `properties`, `array` has `items`, `tuple` has `items[]`, `union` has `options[]`, `record` has `keys` + `values`. Always go through the same adapter function so behaviour stays uniform.
4. **Handle `NodeBase` universals.** Every node carries `required`, `nullable`, `default`, `description`, `unique`, `index`, `enum`, `meta`, `message`. Decide which apply to your output; ignore the rest. JSON Schema treats `unique`/`index` as no-ops, for example — there is no JSON Schema concept for them.
5. **Add an exhaustiveness check.** The `_exhaustive: never` trick makes the TypeScript compiler fail if a future Sapphire version adds a new IR kind. Cheap insurance against drift.
6. **`registerAdapter('log', fn)`.** From this point on, any `field.getSchema('log')` (or any `Sapphire({ defaultAdapter: 'log' }).object(...).getSchema()`) goes through your function.

## Variations

### Per-adapter options (the second argument)

The adapter signature accepts a second `options?: unknown` argument. Use it for emitter-wide settings — your adapter's equivalent of `JsonSchemaAdapterOptions.additionalProperties`. The registry passes it through when callers invoke the adapter directly (`toMyAdapter(node, opts)`); when going through `field.getSchema()` no options are passed.

```ts
interface LogOptions {
  indent?: number
}

function toLogString(node: SapphireSchemaNode, opts: LogOptions = {}): string {
  const pad = ' '.repeat(opts.indent ?? 0)
  // ...
  return pad + body
}
```

### Reading `meta.<name>` for escape hatches

Mirror the first-party convention — your adapter has a reserved slot in `node.meta`:

```ts
function toLogString(node: SapphireSchemaNode): string {
  const extra = (node.meta?.log as { suffix?: string } | undefined)?.suffix ?? ''
  return baseRender(node) + extra
}
```

Users can now do `a.string().adapter('log', { suffix: ' /* PII */' })`.

### Test your adapter against real schemas

Drop a few representative schemas into a Vitest file and assert the output exactly:

```ts
import { describe, expect, it } from 'vitest'

describe('log adapter', () => {
  it('renders a primitive with constraints', () => {
    const a = new Sapphire()
    const s = a.string().min(3).max(10)
    expect(toLogString(s.toSchema())).toBe('string(min=3,max=10)')
  })
})
```

Compose schemas from every IR kind across the test suite — that's how the in-tree adapters guard against silent IR-shape changes.

> [!WARNING]
> **Don't register the adapter from library code.** `registerAdapter` is process-global. If your package registers on import, two consumers who both want the slot collide. Export the function and let the application call `registerAdapter` once at startup.

> [!WARNING]
> **The IR is the contract, not the field DSL.** Your adapter must accept any valid `SapphireSchemaNode` — including ones produced by future versions of the DSL. Keep the exhaustiveness check, and prefer a sensible fallback (`'<unsupported>'`) over throwing.

## See also

- [Concepts → Overview](../concepts/overview.md) — the DSL → IR → adapter mental model.
- [Concepts → Escape hatch](../concepts/escape-hatch.md) — how `meta` is read by adapters.
- [Recipes → One schema, many adapters](./one-schema-many-adapters.md) — sister recipe for combining adapters.
- [Meta → Contributing](../meta/contributing.md) — repo setup and the full step-by-step for publishing a third-party adapter.
