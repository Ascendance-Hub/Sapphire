import { describe, it, expect } from 'vitest'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { irToTypeString } from '../src/lib/ir-to-type'

describe('irToTypeString', () => {
  it('renders primitives', () => {
    expect(irToTypeString({ kind: 'string', required: true })).toBe('string')
    expect(irToTypeString({ kind: 'number', required: true })).toBe('number')
    expect(irToTypeString({ kind: 'boolean', required: true })).toBe('boolean')
    expect(irToTypeString({ kind: 'date', required: true })).toBe('Date')
  })

  it('renders a literal as its JSON value', () => {
    expect(irToTypeString({ kind: 'literal', required: true, value: 'admin' })).toBe('"admin"')
    expect(irToTypeString({ kind: 'literal', required: true, value: 42 })).toBe('42')
  })

  it('renders an enum as a union of its values', () => {
    expect(
      irToTypeString({ kind: 'enum', required: true, values: ['a', 'b'] }),
    ).toBe('"a" | "b"')
  })

  it('renders an array', () => {
    expect(
      irToTypeString({ kind: 'array', required: true, items: { kind: 'string', required: true } }),
    ).toBe('string[]')
  })

  it('renders a tuple', () => {
    expect(
      irToTypeString({
        kind: 'tuple',
        required: true,
        items: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      }),
    ).toBe('[string, number]')
  })

  it('renders a union', () => {
    expect(
      irToTypeString({
        kind: 'union',
        required: true,
        options: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      }),
    ).toBe('string | number')
  })

  it('renders a record', () => {
    expect(
      irToTypeString({
        kind: 'record',
        required: true,
        keys: { kind: 'string', required: true },
        values: { kind: 'number', required: true },
      }),
    ).toBe('Record<string, number>')
  })

  it('renders a ref as its target name', () => {
    expect(irToTypeString({ kind: 'ref', required: true, target: 'User' })).toBe('User')
  })

  it('renders an object with optional keys marked', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: false },
      },
    }
    expect(irToTypeString(node)).toBe('{ name: string; age?: number }')
  })

  it('appends | null for a nullable node', () => {
    expect(irToTypeString({ kind: 'string', required: true, nullable: true })).toBe('string | null')
  })

  it('parenthesizes a union array item', () => {
    expect(
      irToTypeString({
        kind: 'array',
        required: true,
        items: {
          kind: 'union',
          required: true,
          options: [
            { kind: 'string', required: true },
            { kind: 'number', required: true },
          ],
        },
      }),
    ).toBe('(string | number)[]')
  })

  it('does not parenthesize a tuple array item', () => {
    expect(
      irToTypeString({
        kind: 'array',
        required: true,
        items: {
          kind: 'tuple',
          required: true,
          items: [
            { kind: 'string', required: true },
            { kind: 'number', required: true },
          ],
        },
      }),
    ).toBe('[string, number][]')
  })

  it('renders an array of objects without parentheses', () => {
    expect(
      irToTypeString({
        kind: 'array',
        required: true,
        items: {
          kind: 'object',
          required: true,
          properties: { x: { kind: 'string', required: true } },
        },
      }),
    ).toBe('{ x: string }[]')
  })

  it('renders an empty object as {}', () => {
    expect(irToTypeString({ kind: 'object', required: true, properties: {} })).toBe('{}')
  })
})
