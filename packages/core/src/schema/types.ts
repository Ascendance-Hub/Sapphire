import type { FieldMessages } from '../lib/types'

export interface NodeBase {
  required: boolean
  nullable?: boolean
  default?: unknown
  description?: string
  unique?: boolean
  index?: boolean | { unique?: boolean }
  meta?: Record<string, unknown>
  message?: FieldMessages
}

export type SapphireSchemaNode =
  | (NodeBase & {
      kind: 'string'
      minLength?: number
      maxLength?: number
      length?: number
      regex?: { source: string; flags: string }
      format?: 'email' | 'url' | 'uuid'
      startsWith?: string
      endsWith?: string
      transforms?: ('trim' | 'toLowerCase' | 'toUpperCase')[]
      coerce?: boolean
    })
  | (NodeBase & {
      kind: 'number'
      min?: number
      max?: number
      exclusiveMin?: number
      exclusiveMax?: number
      int?: boolean
      multipleOf?: number
      finite?: boolean
      safe?: boolean
      coerce?: boolean
    })
  | (NodeBase & { kind: 'boolean'; coerce?: boolean })
  | (NodeBase & { kind: 'date'; min?: Date; max?: Date; coerce?: boolean })
  | (NodeBase & {
      kind: 'object'
      name?: string
      properties: Record<string, SapphireSchemaNode>
      timestamps?: boolean
      indexes?: { keys: string[]; unique?: boolean }[]
    })
  | (NodeBase & {
      kind: 'array'
      items: SapphireSchemaNode
      minItems?: number
      maxItems?: number
      length?: number
    })
  | (NodeBase & { kind: 'tuple'; items: SapphireSchemaNode[] })
  | (NodeBase & { kind: 'union'; options: SapphireSchemaNode[] })
  | (NodeBase & { kind: 'literal'; value: string | number | boolean })
  | (NodeBase & { kind: 'enum'; values: readonly (string | number)[] })
  | (NodeBase & {
      kind: 'record'
      keys: SapphireSchemaNode
      values: SapphireSchemaNode
    })
  | (NodeBase & { kind: 'ref'; target: string })
