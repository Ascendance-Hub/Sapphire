import { describe, it, expect } from 'vitest'
import { evaluatePlayground } from '../src/lib/playground-eval'

describe('evaluatePlayground', () => {
  const schema = `a.object({ name: a.string().min(2), age: a.number().int() })`

  it('returns the IR for a valid schema', () => {
    const r = evaluatePlayground(schema, '{}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.ir.kind).toBe('object')
      expect(r.typeString).toBe('{ name: string; age: number }')
    }
  })

  it('returns a JSON Schema document', () => {
    const r = evaluatePlayground(schema, '{}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect((r.jsonSchema as { type?: string }).type).toBe('object')
    }
  })

  it('parses the sample value and reports success', () => {
    const r = evaluatePlayground(schema, '{ "name": "Ana", "age": 30 }')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.parse.success).toBe(true)
  })

  it('parses the sample value and reports issues', () => {
    const r = evaluatePlayground(schema, '{ "name": "x", "age": 1.5 }')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parse.success).toBe(false)
      if (!r.parse.success) expect(r.parse.issues.length).toBeGreaterThan(0)
    }
  })

  it('reports a schema syntax error without throwing', () => {
    const r = evaluatePlayground('a.object({ broken', '{}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/./)
  })

  it('reports an invalid sample-value JSON without throwing', () => {
    const r = evaluatePlayground(schema, '{ not json')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parse.success).toBe(false)
      if (!r.parse.success) expect(r.parse.sampleError).toMatch(/./)
    }
  })
})
