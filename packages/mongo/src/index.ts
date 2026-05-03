import mongoose from 'mongoose'
import { registerAdapter, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

function applyCommon(def: Record<string, any>, node: SapphireSchemaNode): void {
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
}

export function toMongoSchema(node: SapphireSchemaNode): any {
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
      applyCommon(def, node)
      return def
    }
    case 'number': {
      const def: Record<string, any> = { type: Number, required: node.required }
      if (node.min !== undefined) def.min = node.min
      if (node.max !== undefined) def.max = node.max
      applyCommon(def, node)
      return def
    }
    case 'boolean': {
      const def: Record<string, any> = { type: Boolean, required: node.required }
      applyCommon(def, node)
      return def
    }
    case 'date': {
      const def: Record<string, any> = { type: Date, required: node.required }
      if (node.min !== undefined) def.min = node.min
      if (node.max !== undefined) def.max = node.max
      applyCommon(def, node)
      return def
    }
    case 'object': {
      const properties: Record<string, any> = {}
      for (const [key, child] of Object.entries(node.properties)) {
        properties[key] = toMongoSchema(child)
      }
      return { type: properties, required: node.required }
    }
    case 'array': {
      const items = Array.isArray(node.items) ? node.items : [node.items]
      if (items.length === 1) {
        return { type: [toMongoSchema(items[0])], required: node.required }
      }
      return { type: [mongoose.Schema.Types.Mixed], required: node.required }
    }
    case 'union':
      return { type: mongoose.Schema.Types.Mixed, required: node.required }
  }
}

registerAdapter('mongo', toMongoSchema)
