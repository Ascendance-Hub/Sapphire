import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('StringField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida string válida', () => {
    const field = a.string()
    expect(field.safeParse('ale').success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.string()
    const r = field.safeParse(123)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('campo obrigatório falha quando ausente', () => {
    const field = a.string()
    const a1 = field.safeParse(undefined)
    const a2 = field.safeParse(null)
    expect(a1.success).toBe(false)
    expect(a2.success).toBe(false)
    if (!a1.success) expect(a1.error.issues[0].code).toBe('required')
  })

  it('campo opcional aceita undefined/null', () => {
    const field = a.string().optional()
    expect(field.safeParse(undefined).success).toBe(true)
    expect(field.safeParse(null).success).toBe(true)
  })

  describe('vocabulary', () => {
    it('max: passes when within limit, fails with max_length', () => {
      const field = a.string().max(3)
      expect(field.safeParse('abc').success).toBe(true)
      const r = field.safeParse('abcd')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'max_length')).toBe(true)
    })

    it('max: per-rule message override', () => {
      const field = a.string().max(2, { message: 'too long' })
      const r = field.safeParse('abc')
      if (!r.success) expect(r.error.issues[0].message).toBe('too long')
    })

    it('length: exact length valid/invalid', () => {
      const field = a.string().length(3)
      expect(field.safeParse('abc').success).toBe(true)
      const r = field.safeParse('ab')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'length')).toBe(true)
    })

    it('length: per-rule message override', () => {
      const field = a.string().length(3, { message: 'wrong length' })
      const r = field.safeParse('a')
      if (!r.success) expect(r.error.issues[0].message).toBe('wrong length')
    })

    it('regex: matches and rejects', () => {
      const field = a.string().regex(/^\d+$/)
      expect(field.safeParse('123').success).toBe(true)
      const r = field.safeParse('abc')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'regex')).toBe(true)
    })

    it('regex: per-rule message override', () => {
      const field = a.string().regex(/^\d+$/, { message: 'digits only' })
      const r = field.safeParse('a')
      if (!r.success) expect(r.error.issues[0].message).toBe('digits only')
    })

    it('email: valid and invalid', () => {
      const field = a.string().email()
      expect(field.safeParse('foo@bar.com').success).toBe(true)
      const r = field.safeParse('not-email')
      expect(r.success).toBe(false)
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'format')
        expect(issue?.context?.format).toBe('email')
      }
    })

    it('email: per-rule message override', () => {
      const field = a.string().email({ message: 'bad email' })
      const r = field.safeParse('x')
      if (!r.success) expect(r.error.issues[0].message).toBe('bad email')
    })

    it('url: valid and invalid', () => {
      const field = a.string().url()
      expect(field.safeParse('https://example.com').success).toBe(true)
      const r = field.safeParse('not a url')
      expect(r.success).toBe(false)
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'format')
        expect(issue?.context?.format).toBe('url')
      }
    })

    it('url: per-rule message override', () => {
      const field = a.string().url({ message: 'bad url' })
      const r = field.safeParse('x')
      if (!r.success) expect(r.error.issues[0].message).toBe('bad url')
    })

    it('uuid: valid and invalid', () => {
      const field = a.string().uuid()
      expect(field.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true)
      const r = field.safeParse('not-a-uuid')
      expect(r.success).toBe(false)
    })

    it('uuid: per-rule message override', () => {
      const field = a.string().uuid({ message: 'bad uuid' })
      const r = field.safeParse('x')
      if (!r.success) expect(r.error.issues[0].message).toBe('bad uuid')
    })

    it('startsWith: valid and invalid', () => {
      const field = a.string().startsWith('foo')
      expect(field.safeParse('foobar').success).toBe(true)
      const r = field.safeParse('barfoo')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'starts_with')).toBe(true)
    })

    it('startsWith: per-rule message override', () => {
      const field = a.string().startsWith('foo', { message: 'must start' })
      const r = field.safeParse('x')
      if (!r.success) expect(r.error.issues[0].message).toBe('must start')
    })

    it('endsWith: valid and invalid', () => {
      const field = a.string().endsWith('bar')
      expect(field.safeParse('foobar').success).toBe(true)
      const r = field.safeParse('barfoo')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'ends_with')).toBe(true)
    })

    it('endsWith: per-rule message override', () => {
      const field = a.string().endsWith('bar', { message: 'must end' })
      const r = field.safeParse('x')
      if (!r.success) expect(r.error.issues[0].message).toBe('must end')
    })

    it('trim: transforms value', () => {
      const field = a.string().trim()
      const r = field.safeParse('  hi  ')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe('hi')
    })

    it('toLowerCase: transforms value', () => {
      const field = a.string().toLowerCase()
      const r = field.safeParse('AbC')
      if (r.success) expect(r.data).toBe('abc')
    })

    it('toUpperCase: transforms value', () => {
      const field = a.string().toUpperCase()
      const r = field.safeParse('aBc')
      if (r.success) expect(r.data).toBe('ABC')
    })

    it('coerce: converts non-string to string', () => {
      const field = a.string().coerce()
      const r = field.safeParse(123)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe('123')
    })
  })
})
