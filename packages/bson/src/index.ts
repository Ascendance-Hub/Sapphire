import type { Field, Infer, SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { EMAIL_RE, UUID_RE } from '@ascendance-hub/sapphire-core'

export interface BsonValidatorOptions {
  /** Sets `additionalProperties` on every emitted object schema. Omitted when undefined. */
  additionalProperties?: boolean
}

export interface BsonValidator {
  $jsonSchema: Record<string, unknown>
}

/**
 * The typed document shape for a Sapphire schema, for use with the native
 * driver's `Collection<TSchema>`:
 *
 * ```ts
 * import type { Collection } from 'mongodb'
 * import type { BsonDoc } from '@ascendance-hub/sapphire-bson'
 * const users: Collection<BsonDoc<typeof User>> = db.collection('users')
 * ```
 *
 * A thin alias over core's `Infer` — there is no runtime helper, since the
 * document shape is a purely type-level concern.
 */
export type BsonDoc<F extends Field> = Infer<F>

/**
 * `$jsonSchema` keywords the adapter computes itself. The `.adapter('bson', …)`
 * escape hatch cannot override these — overriding them would break validation.
 */
const META_BLACKLIST = new Set(['bsonType', 'type', 'required', 'enum', 'properties', 'items'])

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Carries adapter-neutral keywords (`description`) and merges the
 * `.adapter('bson', …)` escape hatch. Note: MongoDB rejects unknown
 * `$jsonSchema` keywords, so the hatch must only carry valid ones.
 */
function applyCommon(out: Record<string, any>, node: SapphireSchemaNode): void {
  if (node.description !== undefined) out.description = node.description
  const meta = node.meta?.bson as Record<string, unknown> | undefined
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (META_BLACKLIST.has(k)) continue
      out[k] = v
    }
  }
}

/**
 * A nullable primitive lifts into a `bsonType` array (`['string', 'null']`).
 * A nullable schema with no plain string `bsonType` (union, literal, enum)
 * wraps in `anyOf` with an explicit `{ bsonType: 'null' }` branch.
 */
function wrapNullable(out: Record<string, any>, node: SapphireSchemaNode): Record<string, any> {
  if (!node.nullable) return out
  if (typeof out.bsonType === 'string' && out.enum === undefined) {
    return { ...out, bsonType: [out.bsonType, 'null'] }
  }
  return { anyOf: [out, { bsonType: 'null' }] }
}

function emitObject(
  node: Extract<SapphireSchemaNode, { kind: 'object' }>,
  options: BsonValidatorOptions,
): Record<string, any> {
  const properties: Record<string, any> = {}
  const required: string[] = []
  for (const [key, child] of Object.entries(node.properties)) {
    properties[key] = emit(child, options)
    if (child.required) required.push(key)
  }
  const out: Record<string, any> = { bsonType: 'object', properties }
  if (required.length > 0) out.required = required
  if (options.additionalProperties !== undefined) {
    out.additionalProperties = options.additionalProperties
  }
  applyCommon(out, node)
  return out
}

function emit(node: SapphireSchemaNode, options: BsonValidatorOptions): Record<string, any> {
  switch (node.kind) {
    case 'string': {
      const out: Record<string, any> = { bsonType: 'string' }
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
      if (node.format === 'email') patterns.push(EMAIL_RE.source)
      if (node.format === 'uuid') patterns.push(UUID_RE.source)
      // `format: 'url'` has no $jsonSchema equivalent — enforced client-side via parse().
      if (patterns.length === 1) out.pattern = patterns[0]
      else if (patterns.length > 1) out.allOf = patterns.map((p) => ({ pattern: p }))
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'number': {
      const out: Record<string, any> = { bsonType: node.int ? 'int' : 'number' }
      if (node.min !== undefined) out.minimum = node.min
      if (node.max !== undefined) out.maximum = node.max
      // MongoDB's $jsonSchema follows JSON Schema draft 4: `exclusiveMinimum`
      // and `exclusiveMaximum` are booleans paired with `minimum`/`maximum`,
      // not standalone numbers.
      if (node.exclusiveMin !== undefined) {
        out.minimum = node.exclusiveMin
        out.exclusiveMinimum = true
      }
      if (node.exclusiveMax !== undefined) {
        out.maximum = node.exclusiveMax
        out.exclusiveMaximum = true
      }
      if (node.multipleOf !== undefined) out.multipleOf = node.multipleOf
      // `finite` / `safe` have no $jsonSchema equivalent — enforced client-side.
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'boolean': {
      const out: Record<string, any> = { bsonType: 'bool' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'date': {
      const out: Record<string, any> = { bsonType: 'date' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'object':
      return wrapNullable(emitObject(node, options), node)
    case 'array': {
      const out: Record<string, any> = { bsonType: 'array', items: emit(node.items, options) }
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
        bsonType: 'array',
        items: node.items.map((item) => emit(item, options)),
        additionalItems: false,
        minItems: node.items.length,
        maxItems: node.items.length,
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'union': {
      const out: Record<string, any> = {
        anyOf: node.options.map((opt) => emit(opt, options)),
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'literal': {
      const out: Record<string, any> = { enum: [node.value] }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'enum': {
      const out: Record<string, any> = { enum: [...node.values] }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'record': {
      const out: Record<string, any> = {
        bsonType: 'object',
        additionalProperties: emit(node.values, options),
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'ref': {
      const out: Record<string, any> = { bsonType: 'objectId' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
  }
}

/**
 * Converts a Sapphire IR node into a MongoDB collection validator:
 * `{ $jsonSchema: … }`, suitable for `db.createCollection(name, { validator })`
 * or `db.command({ collMod, validator })`.
 */
export function toBsonSchema(
  node: SapphireSchemaNode,
  options: BsonValidatorOptions = {},
): BsonValidator {
  const root = emit(node, options)
  // MongoDB injects an `_id` into every document. A closed-shape root
  // (`additionalProperties: false`) must still permit that server-added `_id`
  // when the schema does not declare one — otherwise the validator rejects
  // every insert.
  if (options.additionalProperties === false && node.kind === 'object') {
    const props = root.properties as Record<string, unknown> | undefined
    if (props && !('_id' in props)) props._id = {}
  }
  return { $jsonSchema: root }
}
