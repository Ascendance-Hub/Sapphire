import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

/**
 * I1: terminal issue codes that previously had no per-rule message customization
 * path now accept `{ message }` opts at the construction call site. This bateria
 * covers each newly-extended path and asserts the custom message bubbles up.
 *
 * Codes covered: enum, literal, union_no_match, tuple_length, unknown_key.
 * `required` / `invalid_type` continue to be customized via `fieldMessage`
 * (string or FieldMessages object) on each field — covered by existing tests.
 */
describe('I1 — per-rule message for terminal codes', () => {
  const a = new Sapphire()

  it('enum: t.enum(values, { message }) sets the enum issue message', () => {
    const f = a.type().enum(['admin', 'user'] as const, { message: 'role inválido' })
    const r = f.safeParse('nope')
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'enum')
      expect(issue?.message).toBe('role inválido')
    }
  })

  it('literal: t.literal(value, { message }) sets the literal issue message', () => {
    const f = a.type().literal('foo', { message: 'literal incorreto' })
    const r = f.safeParse('bar')
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'literal')
      expect(issue?.message).toBe('literal incorreto')
    }
  })

  it('union: t.union(fields, { message }) sets the union_no_match message', () => {
    const f = a.type().union([a.string(), a.number()], { message: 'tipo errado' })
    const r = f.safeParse(true)
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'union_no_match')
      expect(issue?.message).toBe('tipo errado')
    }
  })

  it('tuple: a.tuple(items, { message }) sets the tuple_length message', () => {
    const f = a.tuple([a.string(), a.number()], { message: 'tuple errada' })
    const r = f.safeParse(['a'])
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'tuple_length')
      expect(issue?.message).toBe('tuple errada')
    }
  })

  it('object: a.object(shape, { message }) sets the unknown_key message', () => {
    const f = a.object({ name: a.string() }, { message: 'chave desconhecida' })
    const r = f.safeParse({ name: 'a', extra: 1 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'unknown_key')
      expect(issue?.message).toBe('chave desconhecida')
    }
  })

  it('per-call messages still override per-rule (precedence preserved)', () => {
    const f = a.type().enum(['a', 'b'] as const, { message: 'rule-level' })
    const r = f.safeParse('c', { messages: { enum: 'per-call wins' } })
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'enum')
      expect(issue?.message).toBe('per-call wins')
    }
  })
})
