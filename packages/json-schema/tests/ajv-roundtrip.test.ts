import { describe, it, expect } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

const ajv = new Ajv2020({ strict: false, allErrors: true })

function compile(node: SapphireSchemaNode, opts: Parameters<typeof toJsonSchema>[1] = {}) {
  const schema = toJsonSchema(node, opts)
  return ajv.compile(schema)
}

describe('ajv-roundtrip — primitives', () => {
  it('string com pattern valida', () => {
    const v = compile({
      kind: 'string',
      required: true,
      regex: { source: '^[a-z]+$', flags: '' },
    })
    expect(v('alice')).toBe(true)
    expect(v('Alice')).toBe(false)
  })

  it('string com minLength valida', () => {
    const v = compile({ kind: 'string', required: true, minLength: 3 })
    expect(v('abc')).toBe(true)
    expect(v('ab')).toBe(false)
  })

  it('number int + min/max', () => {
    const v = compile({ kind: 'number', required: true, int: true, min: 0, max: 10 })
    expect(v(5)).toBe(true)
    expect(v(5.5)).toBe(false)
    expect(v(-1)).toBe(false)
    expect(v(11)).toBe(false)
  })

  it('boolean', () => {
    const v = compile({ kind: 'boolean', required: true })
    expect(v(true)).toBe(true)
    expect(v(0)).toBe(false)
  })

  it('date (string ISO) — format é annotation sem ajv-formats; valida shape string', () => {
    const v = compile({ kind: 'date', required: true })
    expect(v('2023-01-01T00:00:00Z')).toBe(true)
    expect(v(123)).toBe(false)
  })
})

describe('ajv-roundtrip — composites', () => {
  it('object com required[]', () => {
    const v = compile({
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: false },
      },
    })
    expect(v({ name: 'a' })).toBe(true)
    expect(v({ name: 'a', age: 1 })).toBe(true)
    expect(v({ age: 1 })).toBe(false)
  })

  it('array nonempty', () => {
    const v = compile({
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
      nonempty: true,
    })
    expect(v(['a'])).toBe(true)
    expect(v([])).toBe(false)
  })

  it('tuple [string, number] rejeita type errado e tamanho extra', () => {
    const v = compile({
      kind: 'tuple',
      required: true,
      items: [
        { kind: 'string', required: true },
        { kind: 'number', required: true },
      ],
    })
    expect(v(['a', 1])).toBe(true)
    expect(v(['a', 'b'])).toBe(false)
    expect(v(['a', 1, 'extra'])).toBe(false)
    expect(v(['a'])).toBe(false)
  })
})

describe('ajv-roundtrip — union/literal/enum/record', () => {
  it('union string|number', () => {
    const v = compile({
      kind: 'union',
      required: true,
      options: [
        { kind: 'string', required: true },
        { kind: 'number', required: true },
      ],
    })
    expect(v('a')).toBe(true)
    expect(v(1)).toBe(true)
    expect(v(true)).toBe(false)
  })

  it('literal const', () => {
    const v = compile({ kind: 'literal', required: true, value: 'admin' })
    expect(v('admin')).toBe(true)
    expect(v('user')).toBe(false)
  })

  it('enum strings', () => {
    const v = compile({ kind: 'enum', required: true, values: ['a', 'b'] as const })
    expect(v('a')).toBe(true)
    expect(v('c')).toBe(false)
  })

  it('record(string, boolean)', () => {
    const v = compile({
      kind: 'record',
      required: true,
      keys: { kind: 'string', required: true },
      values: { kind: 'boolean', required: true },
    })
    expect(v({ a: true, b: false })).toBe(true)
    expect(v({ a: 'no' })).toBe(false)
  })
})

describe('ajv-roundtrip — nullable', () => {
  it('nullable string aceita null', () => {
    const v = compile({ kind: 'string', required: true, nullable: true })
    expect(v(null)).toBe(true)
    expect(v('hi')).toBe(true)
    expect(v(1)).toBe(false)
  })

  it('nullable literal aceita null e o valor const', () => {
    const v = compile({ kind: 'literal', required: true, value: 1, nullable: true })
    expect(v(null)).toBe(true)
    expect(v(1)).toBe(true)
    expect(v(2)).toBe(false)
  })
})
