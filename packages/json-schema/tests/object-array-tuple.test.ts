import { describe, it, expect } from 'vitest'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — object/array/tuple', () => {
  it('object com required derivado de child.required', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        nick: { kind: 'string', required: false },
      },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.type).toBe('object')
    expect(out.properties).toEqual({ name: { type: 'string' }, nick: { type: 'string' } })
    expect(out.required).toEqual(['name'])
  })

  it('object sem required produz output sem required key', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        a: { kind: 'string', required: false },
      },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.required).toBeUndefined()
  })

  it('options.additionalProperties: false aplica em todo object', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: { a: { kind: 'string', required: true } },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false, additionalProperties: false }) as any
    expect(out.additionalProperties).toBe(false)
  })

  it('array básico com items', () => {
    const node: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'number', required: true },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'array',
      items: { type: 'number' },
    })
  })

  it('array com min/max/length/nonempty', () => {
    const node: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
      minItems: 2,
      maxItems: 5,
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.minItems).toBe(2)
    expect(out.maxItems).toBe(5)

    const len: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
      length: 3,
    }
    const lenOut = toJsonSchema(len, { emitSchemaUri: false }) as any
    expect(lenOut.minItems).toBe(3)
    expect(lenOut.maxItems).toBe(3)

    const ne: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
      nonempty: true,
    }
    const neOut = toJsonSchema(ne, { emitSchemaUri: false }) as any
    expect(neOut.minItems).toBe(1)

    const both: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
      minItems: 0,
      nonempty: true,
    }
    const bothOut = toJsonSchema(both, { emitSchemaUri: false }) as any
    expect(bothOut.minItems).toBe(1)
  })

  it('tuple emite prefixItems + items:false + min/max iguais ao length', () => {
    const node: SapphireSchemaNode = {
      kind: 'tuple',
      required: true,
      items: [
        { kind: 'string', required: true },
        { kind: 'number', required: true },
      ],
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out).toEqual({
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      items: false,
      minItems: 2,
      maxItems: 2,
    })
  })
})
