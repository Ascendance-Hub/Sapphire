import { describe, it, expect } from 'vitest'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — nullable/default/description', () => {
  it('nullable em primitivo vira type union [<x>, "null"]', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true, nullable: true }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ type: ['string', 'null'] })
  })

  it('nullable em number int → type: ["integer","null"]', () => {
    const node: SapphireSchemaNode = {
      kind: 'number',
      required: true,
      int: true,
      nullable: true,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ type: ['integer', 'null'] })
  })

  it('nullable em literal vira oneOf [original, {type:null}]', () => {
    const node: SapphireSchemaNode = {
      kind: 'literal',
      required: true,
      value: 'ok',
      nullable: true,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      oneOf: [{ const: 'ok' }, { type: 'null' }],
    })
  })

  it('nullable em ref vira oneOf', () => {
    const node: SapphireSchemaNode = {
      kind: 'ref',
      required: true,
      target: 'X',
      nullable: true,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      oneOf: [{ $ref: '#/$defs/X' }, { type: 'null' }],
    })
  })

  it('nullable em string com enum usa oneOf (pra não quebrar enum)', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      enum: ['a', 'b'],
      nullable: true,
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.oneOf).toBeDefined()
    expect(out.oneOf[1]).toEqual({ type: 'null' })
  })

  it('default e description são propagados', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      default: 'hello',
      description: 'a greeting',
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
      default: 'hello',
      description: 'a greeting',
    })
  })
})
