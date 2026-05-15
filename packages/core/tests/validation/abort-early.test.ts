import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Validation — abortEarly', () => {
  it('default (false): coleta todas as issues do object', () => {
    const a = new Sapphire()
    const f = a.object({
      a: a.string(),
      b: a.number(),
      c: a.boolean(),
    })
    const r = f.safeParse({ a: 1, b: 'x', c: 'y' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(3)
  })

  it('abortEarly por instância: para na primeira issue', () => {
    const a = new Sapphire({ abortEarly: true })
    const f = a.object({
      a: a.string(),
      b: a.number(),
      c: a.boolean(),
    })
    const r = f.safeParse({ a: 1, b: 'x', c: 'y' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(1)
  })

  it('abortEarly por chamada sobrescreve a instância', () => {
    const a = new Sapphire({ abortEarly: false })
    const f = a.object({
      a: a.string(),
      b: a.number(),
    })
    const r = f.safeParse({ a: 1, b: 'x' }, { abortEarly: true })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(1)
  })

  // I2: abortEarly must now bail within a single leaf field as well (previously
  // honored only across object/array children).
  describe('I2 — abortEarly in leaf fields', () => {
    it('string: abortEarly true → only first rule failure reported', () => {
      const a = new Sapphire()
      const f = a.string().min(10).regex(/^x/)
      const r = f.safeParse('a', { abortEarly: true })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(1)
    })

    it('string: abortEarly false → both rule failures reported', () => {
      const a = new Sapphire()
      const f = a.string().min(10).regex(/^x/)
      const r = f.safeParse('a', { abortEarly: false })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(2)
    })

    it('number: abortEarly true → only first rule failure reported', () => {
      const a = new Sapphire()
      const f = a.number().int().min(100)
      const r = f.safeParse(1.5, { abortEarly: true })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(1)
    })

    it('number: abortEarly false → both rule failures reported', () => {
      const a = new Sapphire()
      const f = a.number().int().min(100)
      const r = f.safeParse(1.5, { abortEarly: false })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(2)
    })

    it('date: abortEarly true → only first rule failure reported', () => {
      const a = new Sapphire()
      const f = a.date().min(new Date('2030-01-01')).max(new Date('2020-01-01'))
      // value violates both min (too early) and max (too late, impossible bounds).
      const r = f.safeParse(new Date('2025-06-01'), { abortEarly: true })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(1)
    })

    it('date: abortEarly false → both rule failures reported', () => {
      const a = new Sapphire()
      const f = a.date().min(new Date('2030-01-01')).max(new Date('2020-01-01'))
      const r = f.safeParse(new Date('2025-06-01'), { abortEarly: false })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(2)
    })
  })

  // season-three B3 + I1: composite fields bail uniformly. After a length-style
  // preflight block, abortEarly stops before per-item validation runs.
  describe('B3 — array length checks respect abortEarly', () => {
    it('abortEarly true → array stops at the first length issue, no item checks', () => {
      const a = new Sapphire({ abortEarly: true })
      // [] violates length(4) and min(3); items would also fail if reached.
      const f = a.array(a.string()).min(3).max(5).length(4)
      const r = f.safeParse([])
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(1)
    })

    it('abortEarly false → array reports every length issue', () => {
      const a = new Sapphire({ abortEarly: false })
      const f = a.array(a.string()).min(3).length(4)
      const r = f.safeParse([])
      expect(r.success).toBe(false)
      // items_length + min_items both fire (empty array)
      if (!r.success) {
        const codes = r.error.issues.map((i) => i.code)
        expect(codes).toContain('items_length')
        expect(codes).toContain('min_items')
      }
    })

    it('abortEarly true → bad length short-circuits before bad items are checked', () => {
      const a = new Sapphire({ abortEarly: true })
      // length wrong AND items are wrong type — only the length issue surfaces.
      const f = a.array(a.number()).length(2)
      const r = f.safeParse(['not', 'a', 'number'])
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues.length).toBe(1)
        expect(r.error.issues[0].code).toBe('items_length')
      }
    })
  })

  describe('I1 — composite fields bail consistently', () => {
    it('tuple: abortEarly true stops at tuple_length', () => {
      const a = new Sapphire({ abortEarly: true })
      const f = a.tuple([a.string(), a.number()])
      const r = f.safeParse([1])
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues.length).toBe(1)
        expect(r.error.issues[0].code).toBe('tuple_length')
      }
    })

    it('object: abortEarly true stops at first bad key', () => {
      const a = new Sapphire({ abortEarly: true })
      const f = a.object({ a: a.string(), b: a.number() })
      const r = f.safeParse({ a: 1, b: 'x' })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.length).toBe(1)
    })
  })
})
