import { describe, it, expect, afterEach } from 'vitest'
import {
  registerAdapter,
  unregisterAdapter,
  getAdapter,
  listAdapters,
  resolveSchema,
  type SapphireSchemaNode,
  type SchemaAdapter,
} from '../src'

const NAME = '__test_adapter__'
const node: SapphireSchemaNode = { kind: 'string' }

describe('adapter registry', () => {
  afterEach(() => {
    unregisterAdapter(NAME)
  })

  it('registerAdapter + getAdapter retornam a função registrada', () => {
    const fn: SchemaAdapter = (n) => n
    registerAdapter(NAME, fn)
    expect(getAdapter(NAME)).toBe(fn)
  })

  it('listAdapters inclui o nome após registro e remove após unregister', () => {
    registerAdapter(NAME, (n) => n)
    expect(listAdapters()).toContain(NAME)
    unregisterAdapter(NAME)
    expect(listAdapters()).not.toContain(NAME)
  })

  it('resolveSchema lança com formato exato para nome desconhecido', () => {
    expect(() => resolveSchema(node, 'unknown', undefined)).toThrow(
      `No adapter named "unknown". Registered: ${listAdapters().join(', ') || '<none>'}`,
    )
  })

  it('resolveSchema usa "<none>" quando nenhum adapter está registrado', () => {
    // Snapshot e limpa o registry temporariamente.
    const all = listAdapters()
    const saved: Array<[string, SchemaAdapter]> = []
    for (const n of all) {
      const fn = getAdapter(n)
      if (fn) saved.push([n, fn])
      unregisterAdapter(n)
    }
    try {
      expect(() => resolveSchema(node, 'unknown', undefined)).toThrow(
        'No adapter named "unknown". Registered: <none>',
      )
    } finally {
      for (const [n, fn] of saved) registerAdapter(n, fn)
    }
  })

  it('resolveSchema lança "No adapter specified" quando name e defaultAdapter são undefined', () => {
    expect(() => resolveSchema(node, undefined, undefined)).toThrow(
      /^No adapter specified\./,
    )
  })

  it('resolveSchema usa defaultAdapter quando name é undefined', () => {
    let called = false
    registerAdapter(NAME, (n) => {
      called = true
      return n
    })
    const result = resolveSchema(node, undefined, NAME)
    expect(called).toBe(true)
    expect(result).toBe(node)
  })
})
