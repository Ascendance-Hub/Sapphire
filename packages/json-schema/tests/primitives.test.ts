import { describe, it, expect } from 'vitest'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — primitives', () => {
  it('string básico', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true }
    const out = toJsonSchema(node, { emitSchemaUri: false })
    expect(out).toEqual({ type: 'string' })
  })

  it('string com min/max/length', () => {
    const min: SapphireSchemaNode = { kind: 'string', required: true, minLength: 3, maxLength: 10 }
    expect(toJsonSchema(min, { emitSchemaUri: false })).toEqual({
      type: 'string',
      minLength: 3,
      maxLength: 10,
    })
    const len: SapphireSchemaNode = { kind: 'string', required: true, length: 5 }
    expect(toJsonSchema(len, { emitSchemaUri: false })).toEqual({
      type: 'string',
      minLength: 5,
      maxLength: 5,
    })
  })

  it('string regex vira pattern', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      regex: { source: '^[a-z]+$', flags: '' },
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
      pattern: '^[a-z]+$',
    })
  })

  it('string format email/uuid mapeia direto; url vira uri', () => {
    const email: SapphireSchemaNode = { kind: 'string', required: true, format: 'email' }
    expect(toJsonSchema(email, { emitSchemaUri: false })).toEqual({
      type: 'string',
      format: 'email',
    })
    const uuid: SapphireSchemaNode = { kind: 'string', required: true, format: 'uuid' }
    expect(toJsonSchema(uuid, { emitSchemaUri: false })).toEqual({
      type: 'string',
      format: 'uuid',
    })
    const url: SapphireSchemaNode = { kind: 'string', required: true, format: 'url' }
    expect(toJsonSchema(url, { emitSchemaUri: false })).toEqual({ type: 'string', format: 'uri' })
  })

  it('startsWith/endsWith viram pattern com escape', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      startsWith: 'foo.',
      endsWith: '.bar',
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.allOf).toEqual([{ pattern: '^foo\\.' }, { pattern: '\\.bar$' }])
  })

  it('regex + startsWith viram allOf', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      regex: { source: '[a-z]', flags: '' },
      startsWith: 'X',
    }
    const out = toJsonSchema(node, { emitSchemaUri: false }) as any
    expect(out.allOf).toEqual([{ pattern: '[a-z]' }, { pattern: '^X' }])
    expect(out.pattern).toBeUndefined()
  })

  it('number básico vira type: number', () => {
    const node: SapphireSchemaNode = { kind: 'number', required: true }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ type: 'number' })
  })

  it('number int vira type: integer', () => {
    const node: SapphireSchemaNode = { kind: 'number', required: true, int: true }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ type: 'integer' })
  })

  it('number com min/max/exclusive/multipleOf', () => {
    const node: SapphireSchemaNode = {
      kind: 'number',
      required: true,
      min: 0,
      max: 10,
      exclusiveMin: 1,
      exclusiveMax: 9,
      multipleOf: 2,
    }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'number',
      minimum: 0,
      maximum: 10,
      exclusiveMinimum: 1,
      exclusiveMaximum: 9,
      multipleOf: 2,
    })
  })

  it('boolean simples', () => {
    const node: SapphireSchemaNode = { kind: 'boolean', required: true }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({ type: 'boolean' })
  })

  it('date vira type:string format:date-time', () => {
    const node: SapphireSchemaNode = { kind: 'date', required: true }
    expect(toJsonSchema(node, { emitSchemaUri: false })).toEqual({
      type: 'string',
      format: 'date-time',
    })
  })

  it('finite/safe/coerce/transforms são no-op', () => {
    const num: SapphireSchemaNode = { kind: 'number', required: true, finite: true, safe: true }
    expect(toJsonSchema(num, { emitSchemaUri: false })).toEqual({ type: 'number' })
    const str: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      transforms: ['trim', 'toLowerCase'],
      coerce: true,
    }
    expect(toJsonSchema(str, { emitSchemaUri: false })).toEqual({ type: 'string' })
  })

  it('emite $schema 2020-12 por default no top-level', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true }
    const out = toJsonSchema(node)
    expect(out.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
  })
})
