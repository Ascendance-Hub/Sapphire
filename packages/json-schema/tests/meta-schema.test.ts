import { describe, it, expect } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

const ajv = new Ajv2020({ strict: false })

function assertValidSchema(
  node: SapphireSchemaNode,
  opts: Parameters<typeof toJsonSchema>[1] = {},
) {
  const schema = toJsonSchema(node, opts)
  const ok = ajv.validateSchema(schema)
  if (!ok) {
    throw new Error(
      `Schema is not a valid JSON Schema 2020-12: ${JSON.stringify(ajv.errors, null, 2)}\nschema=${JSON.stringify(schema, null, 2)}`,
    )
  }
  expect(ok).toBe(true)
}

describe('meta-schema validation (2020-12)', () => {
  const cases: [string, SapphireSchemaNode][] = [
    ['string', { kind: 'string', required: true, format: 'email', minLength: 1 }],
    [
      'string startsWith+endsWith',
      { kind: 'string', required: true, startsWith: 'a', endsWith: 'z' },
    ],
    ['number', { kind: 'number', required: true, int: true, multipleOf: 2 }],
    ['boolean', { kind: 'boolean', required: true }],
    ['date', { kind: 'date', required: true }],
    [
      'object',
      {
        kind: 'object',
        required: true,
        properties: { a: { kind: 'string', required: true } },
      },
    ],
    [
      'array nonempty (minItems: 1)',
      {
        kind: 'array',
        required: true,
        items: { kind: 'string', required: true },
        minItems: 1,
      },
    ],
    [
      'tuple',
      {
        kind: 'tuple',
        required: true,
        items: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      },
    ],
    [
      'union',
      {
        kind: 'union',
        required: true,
        options: [
          { kind: 'string', required: true },
          { kind: 'number', required: true },
        ],
      },
    ],
    ['literal', { kind: 'literal', required: true, value: 'x' }],
    ['enum', { kind: 'enum', required: true, values: ['a', 'b'] as const }],
    [
      'record',
      {
        kind: 'record',
        required: true,
        keys: { kind: 'string', required: true },
        values: { kind: 'boolean', required: true },
      },
    ],
    [
      'ref + named',
      {
        kind: 'object',
        required: true,
        properties: {
          a: {
            kind: 'object',
            required: true,
            name: 'A',
            properties: { v: { kind: 'string', required: true } },
          },
        },
      },
    ],
    ['nullable primitive', { kind: 'string', required: true, nullable: true }],
    ['nullable literal', { kind: 'literal', required: true, value: 'x', nullable: true }],
  ]

  for (const [name, node] of cases) {
    it(`${name} produz schema válido`, () => {
      assertValidSchema(node)
    })
  }
})
