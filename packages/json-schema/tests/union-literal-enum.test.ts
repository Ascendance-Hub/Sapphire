import { describe, it, expect } from 'vitest'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — union/literal/enum', () => {
  it('union vira oneOf', () => {
    const node: SapphireSchemaNode = {
      kind: 'union',
      required: true,
      options: [
        { kind: 'string', required: true },
        { kind: 'number', required: true },
      ],
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    })
  })

  it('literal string vira const', () => {
    const node: SapphireSchemaNode = { kind: 'literal', required: true, value: 'admin' }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ const: 'admin' })
  })

  it('literal number/boolean também viram const', () => {
    const num: SapphireSchemaNode = { kind: 'literal', required: true, value: 42 }
    expect(toJsonSchema(num, { emitSchemaUri: false })).toEqual({ const: 42 })
    const bool: SapphireSchemaNode = { kind: 'literal', required: true, value: true }
    expect(toJsonSchema(bool, { emitSchemaUri: false })).toEqual({ const: true })
  })

  it('enum kind (strings) vira type: string + enum', () => {
    const node: SapphireSchemaNode = {
      kind: 'enum',
      required: true,
      values: ['a', 'b', 'c'] as const,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
      enum: ['a', 'b', 'c'],
    })
  })

  it('enum kind (numbers) vira type: number + enum', () => {
    const node: SapphireSchemaNode = {
      kind: 'enum',
      required: true,
      values: [1, 2, 3] as const,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'number',
      enum: [1, 2, 3],
    })
  })

  // I4: NodeBase.enum was removed (it was dead — no field class ever wrote
  // to it). The proper path for enum-like constraints is the dedicated
  // `kind: 'enum'` node — covered by tests above. This negative test confirms
  // that even if user-built IR smuggles an `enum` field through casting, the
  // adapter doesn't honor it.
  it('I4: NodeBase.enum (legado) não é mais propagado pelo adapter', () => {
    // Cast through unknown — IR type no longer declares `enum` on string.
    const node = {
      kind: 'string',
      required: true,
      enum: ['x', 'y'],
    } as unknown as SapphireSchemaNode
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
    })
  })
})

describe('toJsonSchema — record', () => {
  it('record(string, V) sem restrições nas keys NÃO emite propertyNames', () => {
    const node: SapphireSchemaNode = {
      kind: 'record',
      required: true,
      keys: { kind: 'string', required: true },
      values: { kind: 'boolean', required: true },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'object',
      additionalProperties: { type: 'boolean' },
    })
  })

  it('record(string com regex, V) emite propertyNames', () => {
    const node: SapphireSchemaNode = {
      kind: 'record',
      required: true,
      keys: { kind: 'string', required: true, regex: { source: '^[a-z]+$', flags: '' } },
      values: { kind: 'number', required: true },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'object',
      additionalProperties: { type: 'number' },
      propertyNames: { type: 'string', pattern: '^[a-z]+$' },
    })
  })

  it('record(enum, V) emite propertyNames com enum', () => {
    const node: SapphireSchemaNode = {
      kind: 'record',
      required: true,
      keys: { kind: 'enum', required: true, values: ['x', 'y'] as const },
      values: { kind: 'boolean', required: true },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'object',
      additionalProperties: { type: 'boolean' },
      propertyNames: { type: 'string', enum: ['x', 'y'] },
    })
  })
})
