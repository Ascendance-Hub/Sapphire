import mongoose from 'mongoose'
import { SapphireSchemaNode } from '../schema/types'

export function toMongoSchema(node: SapphireSchemaNode): any {
  switch (node.kind) {
    case 'string': {
      const def: Record<string, any> = { type: String, required: node.required }
      if (node.minLength !== undefined) def.minlength = node.minLength
      return def
    }
    case 'number':
      return { type: Number, required: node.required }
    case 'boolean':
      return { type: Boolean, required: node.required }
    case 'date':
      return { type: Date, required: node.required }
    case 'object': {
      const properties: Record<string, any> = {}
      for (const [key, child] of Object.entries(node.properties)) {
        properties[key] = toMongoSchema(child)
      }
      return { type: properties, required: node.required }
    }
    case 'array': {
      if (node.items.length === 1) {
        return { type: [toMongoSchema(node.items[0])], required: node.required }
      }
      return { type: [mongoose.Schema.Types.Mixed], required: node.required }
    }
    case 'union':
      return { type: mongoose.Schema.Types.Mixed, required: node.required }
  }
}
