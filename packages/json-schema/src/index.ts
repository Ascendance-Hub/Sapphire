import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export interface JsonSchemaAdapterOptions {
  /**
   * Default `additionalProperties` for object schemas. When undefined, the
   * keyword is omitted (JSON Schema's default is `true`). Set to `false` for a
   * monorepo-wide strict mode; per-object overrides are still possible via
   * `.adapter('json-schema', { additionalProperties: false })`.
   */
  additionalProperties?: boolean
  /**
   * Optional top-level `$id` (e.g. `"https://example.com/schemas/user"`).
   */
  $id?: string
  /**
   * Extra named schemas to include in `$defs`, beyond inline-named objects.
   * Useful when refs target schemas not embedded in the input tree.
   */
  defs?: Record<string, SapphireSchemaNode>
  /**
   * Emit `$schema` declaration on top-level output. Default: true.
   */
  emitSchemaUri?: boolean
}

export type JsonSchemaOutput = Record<string, unknown>

const SCHEMA_URI_2020_12 = 'https://json-schema.org/draft/2020-12/schema'

const META_BLACKLIST = new Set(['type', '$ref'])

const NAME_RE = /^[A-Za-z0-9_-]+$/

interface Ctx {
  options: JsonSchemaAdapterOptions
  defs: Map<string, SapphireSchemaNode>
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyCommon(out: Record<string, any>, node: SapphireSchemaNode): void {
  if (node.default !== undefined) out.default = node.default
  if (node.description !== undefined) out.description = node.description
  const metaJs = node.meta?.['json-schema'] as Record<string, unknown> | undefined
  if (metaJs) {
    for (const [k, v] of Object.entries(metaJs)) {
      if (META_BLACKLIST.has(k)) continue
      out[k] = v
    }
  }
}

function wrapNullable(out: Record<string, any>, node: SapphireSchemaNode): Record<string, any> {
  if (!node.nullable) return out
  // Simple primitive type with no enum can be lifted into a type-union with null.
  if (typeof out.type === 'string' && out.enum === undefined) {
    return { ...out, type: [out.type, 'null'] }
  }
  return { oneOf: [out, { type: 'null' }] }
}

function collectNamed(node: SapphireSchemaNode, defs: Map<string, SapphireSchemaNode>): void {
  if (node.kind === 'object' && node.name !== undefined) {
    if (!NAME_RE.test(node.name)) {
      throw new Error(
        `[sapphire-json-schema] Object name "${node.name}" contains characters not allowed in a $defs key. Use only [A-Za-z0-9_-].`,
      )
    }
    if (defs.has(node.name)) return
    defs.set(node.name, node)
  }
  switch (node.kind) {
    case 'object':
      for (const child of Object.values(node.properties)) collectNamed(child, defs)
      break
    case 'array':
      collectNamed(node.items, defs)
      break
    case 'tuple':
      for (const item of node.items) collectNamed(item, defs)
      break
    case 'union':
      for (const opt of node.options) collectNamed(opt, defs)
      break
    case 'record':
      collectNamed(node.keys, defs)
      collectNamed(node.values, defs)
      break
    default:
      break
  }
}

function emitObjectBody(
  node: Extract<SapphireSchemaNode, { kind: 'object' }>,
  ctx: Ctx,
): Record<string, any> {
  const properties: Record<string, any> = {}
  const required: string[] = []
  for (const [key, child] of Object.entries(node.properties)) {
    properties[key] = emit(child, ctx)
    if (child.required) required.push(key)
  }
  const out: Record<string, any> = { type: 'object', properties }
  if (required.length > 0) out.required = required
  if (ctx.options.additionalProperties !== undefined) {
    out.additionalProperties = ctx.options.additionalProperties
  }
  applyCommon(out, node)
  return out
}

function hasStringConstraints(node: SapphireSchemaNode): boolean {
  if (node.kind !== 'string') return true
  return Boolean(
    node.minLength ||
    node.maxLength ||
    node.length ||
    node.regex ||
    node.format ||
    node.startsWith ||
    node.endsWith ||
    node.enum,
  )
}

function emit(node: SapphireSchemaNode, ctx: Ctx): Record<string, any> {
  if (node.kind === 'object' && node.name !== undefined) {
    return wrapNullable({ $ref: `#/$defs/${node.name}` }, node)
  }

  switch (node.kind) {
    case 'string': {
      const out: Record<string, any> = { type: 'string' }
      if (node.minLength !== undefined) out.minLength = node.minLength
      if (node.maxLength !== undefined) out.maxLength = node.maxLength
      if (node.length !== undefined) {
        out.minLength = node.length
        out.maxLength = node.length
      }
      const patterns: string[] = []
      if (node.regex) patterns.push(node.regex.source)
      if (node.startsWith !== undefined) patterns.push(`^${escapeRegex(node.startsWith)}`)
      if (node.endsWith !== undefined) patterns.push(`${escapeRegex(node.endsWith)}$`)
      if (patterns.length === 1) out.pattern = patterns[0]
      else if (patterns.length > 1) {
        out.allOf = patterns.map((p) => ({ pattern: p }))
      }
      if (node.format !== undefined) {
        out.format = node.format === 'url' ? 'uri' : node.format
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'number': {
      const out: Record<string, any> = { type: node.int ? 'integer' : 'number' }
      if (node.min !== undefined) out.minimum = node.min
      if (node.max !== undefined) out.maximum = node.max
      if (node.exclusiveMin !== undefined) out.exclusiveMinimum = node.exclusiveMin
      if (node.exclusiveMax !== undefined) out.exclusiveMaximum = node.exclusiveMax
      if (node.multipleOf !== undefined) out.multipleOf = node.multipleOf
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'boolean': {
      const out: Record<string, any> = { type: 'boolean' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'date': {
      const out: Record<string, any> = { type: 'string', format: 'date-time' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'object': {
      const body = emitObjectBody(node, ctx)
      return wrapNullable(body, node)
    }
    case 'array': {
      const out: Record<string, any> = {
        type: 'array',
        items: emit(node.items, ctx),
      }
      if (node.minItems !== undefined) out.minItems = node.minItems
      if (node.maxItems !== undefined) out.maxItems = node.maxItems
      if (node.length !== undefined) {
        out.minItems = node.length
        out.maxItems = node.length
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'tuple': {
      const out: Record<string, any> = {
        type: 'array',
        prefixItems: node.items.map((item) => emit(item, ctx)),
        items: false,
        minItems: node.items.length,
        maxItems: node.items.length,
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'union': {
      const out: Record<string, any> = {
        oneOf: node.options.map((opt) => emit(opt, ctx)),
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'literal': {
      const out: Record<string, any> = { const: node.value }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'enum': {
      const allNumber = node.values.every((v) => typeof v === 'number')
      const out: Record<string, any> = {
        type: allNumber ? 'number' : 'string',
        enum: [...node.values],
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'record': {
      const out: Record<string, any> = {
        type: 'object',
        additionalProperties: emit(node.values, ctx),
      }
      if (hasStringConstraints(node.keys)) {
        out.propertyNames = emit(node.keys, ctx)
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'ref': {
      const out: Record<string, any> = { $ref: `#/$defs/${node.target}` }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
  }
}

function emitNamedDef(
  node: Extract<SapphireSchemaNode, { kind: 'object' }>,
  ctx: Ctx,
): Record<string, any> {
  return emitObjectBody(node, ctx)
}

export function toJsonSchema(
  node: SapphireSchemaNode,
  options: JsonSchemaAdapterOptions = {},
): JsonSchemaOutput {
  const defs = new Map<string, SapphireSchemaNode>()
  collectNamed(node, defs)
  if (options.defs) {
    for (const [name, n] of Object.entries(options.defs)) {
      if (!NAME_RE.test(name)) {
        throw new Error(
          `[sapphire-json-schema] options.defs key "${name}" contains characters not allowed in a $defs key. Use only [A-Za-z0-9_-].`,
        )
      }
      collectNamed(n, defs)
      if (!defs.has(name)) defs.set(name, n as Extract<SapphireSchemaNode, { kind: 'object' }>)
    }
  }
  const ctx: Ctx = { options, defs }
  const root = emit(node, ctx)
  const out: Record<string, any> = { ...root }
  if (options.emitSchemaUri !== false) {
    out.$schema = SCHEMA_URI_2020_12
  }
  if (options.$id !== undefined) {
    out.$id = options.$id
  }
  if (defs.size > 0) {
    const defsOut: Record<string, any> = {}
    for (const [name, n] of defs.entries()) {
      if (n.kind !== 'object') continue
      defsOut[name] = emitNamedDef(n, ctx)
    }
    out.$defs = defsOut
  }
  return out
}
