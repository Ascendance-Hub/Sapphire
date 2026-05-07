import mongoose from 'mongoose'
import { registerAdapter, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export interface MongoAdapterOptions {
  /**
   * Default `_id` setting for nested subdoc schemas. When `false` (default), Sapphire
   * does NOT auto-add `_id` to subdocs (deviates from Mongoose's default `true`).
   * Set to `true` to opt back in to Mongoose's behavior.
   */
  subdocId?: boolean
}

type ObjectNode = Extract<SapphireSchemaNode, { kind: 'object' }>

/**
 * Keys that `meta.mongo` cannot override on a Mongoose definition object.
 * These are computed by Sapphire and overriding them would break the adapter.
 */
const META_BLACKLIST = new Set(['type', 'required'])

function applyCommon(
  def: Record<string, any>,
  node: SapphireSchemaNode,
  _options: MongoAdapterOptions,
): void {
  if (node.unique) def.unique = true
  if (node.index !== undefined) {
    if (typeof node.index === 'object' && node.index !== null) {
      def.index = true
      if (node.index.unique) def.unique = true
    } else if (node.index === true) {
      def.index = true
    }
  }
  if (node.default !== undefined) def.default = node.default
  if (node.enum !== undefined) def.enum = [...node.enum]
  if (node.description !== undefined) def.description = node.description

  // Escape hatch: meta.mongo merges last (overrides core-derived options),
  // EXCEPT for blacklisted keys (type/required) — those are always Sapphire-controlled.
  const metaMongo = node.meta?.mongo as Record<string, any> | undefined
  if (metaMongo) {
    for (const [k, v] of Object.entries(metaMongo)) {
      if (META_BLACKLIST.has(k)) continue
      def[k] = v
    }
  }
}

function buildField(
  node: SapphireSchemaNode,
  options: MongoAdapterOptions,
): Record<string, any> {
  switch (node.kind) {
    case 'string': {
      const def: Record<string, any> = { type: String, required: node.required }
      if (node.length !== undefined) {
        def.minlength = node.length
        def.maxlength = node.length
      }
      if (node.minLength !== undefined) def.minlength = node.minLength
      if (node.maxLength !== undefined) def.maxlength = node.maxLength
      if (node.regex !== undefined) {
        def.match = new RegExp(node.regex.source, node.regex.flags)
      }
      applyCommon(def, node, options)
      return def
    }
    case 'number': {
      const def: Record<string, any> = { type: Number, required: node.required }
      if (node.min !== undefined) def.min = node.min
      if (node.max !== undefined) def.max = node.max
      applyCommon(def, node, options)
      return def
    }
    case 'boolean': {
      const def: Record<string, any> = { type: Boolean, required: node.required }
      applyCommon(def, node, options)
      return def
    }
    case 'date': {
      const def: Record<string, any> = { type: Date, required: node.required }
      if (node.min !== undefined) def.min = node.min
      if (node.max !== undefined) def.max = node.max
      applyCommon(def, node, options)
      return def
    }
    case 'object': {
      // Nested object → subdoc Schema (sized as a SchemaTypeDefinition).
      // Mongoose accepts a Schema as a path type for subdocs.
      return { type: buildSubdoc(node, options), required: node.required }
    }
    case 'array': {
      return { type: [buildField(node.items, options)], required: node.required }
    }
    case 'union': {
      const def: Record<string, any> = {
        type: mongoose.Schema.Types.Mixed,
        required: node.required,
      }
      applyCommon(def, node, options)
      return def
    }
    case 'tuple': {
      const def: Record<string, any> = {
        type: [mongoose.Schema.Types.Mixed],
        required: node.required,
      }
      applyCommon(def, node, options)
      return def
    }
    case 'literal': {
      const ctor =
        typeof node.value === 'number'
          ? Number
          : typeof node.value === 'boolean'
            ? Boolean
            : String
      const def: Record<string, any> = {
        type: ctor,
        required: node.required,
        enum: [node.value],
      }
      applyCommon(def, node, options)
      return def
    }
    case 'enum': {
      const ctor = typeof node.values[0] === 'number' ? Number : String
      const def: Record<string, any> = {
        type: ctor,
        required: node.required,
        enum: [...node.values],
      }
      applyCommon(def, node, options)
      return def
    }
    case 'record': {
      const def: Record<string, any> = {
        type: Map,
        of: buildField(node.values, options),
        required: node.required,
      }
      applyCommon(def, node, options)
      return def
    }
    case 'ref': {
      const def: Record<string, any> = {
        type: mongoose.Schema.Types.ObjectId,
        ref: node.target,
        required: node.required,
      }
      applyCommon(def, node, options)
      return def
    }
  }
}

function buildSubdoc(node: ObjectNode, options: MongoAdapterOptions): mongoose.Schema {
  const definition: Record<string, any> = {}
  for (const [key, child] of Object.entries(node.properties)) {
    definition[key] = buildField(child, options)
  }
  return new mongoose.Schema(definition, { _id: options.subdocId ?? false })
}

function buildSchema(node: ObjectNode, options: MongoAdapterOptions): mongoose.Schema {
  const definition: Record<string, any> = {}
  for (const [key, child] of Object.entries(node.properties)) {
    definition[key] = buildField(child, options)
  }
  const schemaOptions: mongoose.SchemaOptions = {}
  if (node.timestamps) schemaOptions.timestamps = true
  const meta = node.meta?.mongo as Record<string, any> | undefined
  if (meta?.collection) schemaOptions.collection = String(meta.collection)
  const schema = new mongoose.Schema(definition, schemaOptions)
  if (node.indexes && node.indexes.length > 0) {
    for (const idx of node.indexes) {
      const fields: Record<string, 1> = {}
      for (const k of idx.keys) fields[k] = 1
      schema.index(fields, idx.unique ? { unique: true } : {})
    }
  }
  return schema
}

export function toMongoSchema(
  node: SapphireSchemaNode,
  options: MongoAdapterOptions = {},
): mongoose.Schema | Record<string, any> {
  if (node.kind === 'object') {
    return buildSchema(node, options)
  }
  return buildField(node, options)
}

registerAdapter('mongo', toMongoSchema as any)
