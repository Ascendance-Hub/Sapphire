import { describe, it, expect } from 'vitest'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — escape hatch via meta["json-schema"]', () => {
  it('passa pela meta keys customizadas', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      meta: { 'json-schema': { format: 'ipv4' } },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
      format: 'ipv4',
    })
  })

  it('contentEncoding via meta', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      meta: { 'json-schema': { contentEncoding: 'base64' } },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.contentEncoding).toBe('base64')
  })

  it('object additionalProperties via meta funciona per-schema', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: { a: { kind: 'string', required: true } },
      meta: { 'json-schema': { additionalProperties: false } },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.additionalProperties).toBe(false)
  })

  it('blacklist impede sobrescrever type', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      meta: { 'json-schema': { type: 'integer' } },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.type).toBe('string')
  })

  it('blacklist impede sobrescrever $ref em refs', () => {
    const node: SapphireSchemaNode = {
      kind: 'ref',
      required: true,
      target: 'X',
      meta: { 'json-schema': { $ref: '#/$defs/Hijacked' } },
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.$ref).toBe('#/$defs/X')
  })
})

describe('toJsonSchema — options', () => {
  it('options.$id is emitted on the root', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true }
    const out = toJsonSchema(node, { $id: 'https://example.com/s.json' }) as { $id?: string }
    expect(out.$id).toBe('https://example.com/s.json')
  })

  it('options.defs with an invalid key name throws', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true }
    expect(() =>
      toJsonSchema(node, { defs: { 'bad key!': { kind: 'string', required: true } } }),
    ).toThrow(/not allowed in a \$defs key/)
  })
})
