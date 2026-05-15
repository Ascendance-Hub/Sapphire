import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { SapphireValidationError } from '../../src/lib/validation-error'

describe('SapphireValidationError — DTO helpers (I3)', () => {
  const a = new Sapphire()

  describe('flatten()', () => {
    it('groups field errors by top-level key', () => {
      const f = a.object({
        name: a.string().min(3),
        age: a.number().int(),
      })
      const r = f.safeParse({ name: 'x', age: 1.5 })
      expect(r.success).toBe(false)
      if (!r.success) {
        const flat = r.error.flatten()
        expect(Object.keys(flat.fieldErrors).sort()).toEqual(['age', 'name'])
        expect(flat.fieldErrors.name.length).toBeGreaterThan(0)
        expect(flat.fieldErrors.age.length).toBeGreaterThan(0)
        expect(flat.formErrors).toEqual([])
      }
    })

    it('root-level issues land in formErrors', () => {
      const f = a.string().min(5)
      const r = f.safeParse('ab')
      expect(r.success).toBe(false)
      if (!r.success) {
        const flat = r.error.flatten()
        expect(flat.formErrors.length).toBe(1)
        expect(Object.keys(flat.fieldErrors)).toEqual([])
      }
    })

    it('multiple issues on the same field accumulate under one key', () => {
      const f = a.object({ name: a.string().min(5).regex(/^x/) })
      const r = f.safeParse({ name: 'a' })
      expect(r.success).toBe(false)
      if (!r.success) {
        const flat = r.error.flatten()
        expect(flat.fieldErrors.name.length).toBe(2)
      }
    })

    it('nested path keys on the top-level segment', () => {
      const f = a.object({
        address: a.object({ zip: a.string().length(5) }),
      })
      const r = f.safeParse({ address: { zip: '1' } })
      expect(r.success).toBe(false)
      if (!r.success) {
        const flat = r.error.flatten()
        // grouped under 'address' (the first path segment)
        expect(flat.fieldErrors.address.length).toBe(1)
      }
    })
  })

  describe('format()', () => {
    it('builds a tree mirroring the input shape', () => {
      const f = a.object({
        user: a.object({
          email: a.string().email(),
        }),
        tags: a.array(a.string().min(2)),
      })
      const r = f.safeParse({ user: { email: 'nope' }, tags: ['x'] })
      expect(r.success).toBe(false)
      if (!r.success) {
        const formatted = r.error.format()
        expect(formatted._errors).toEqual([])
        const user = formatted.user as { _errors: string[]; email: { _errors: string[] } }
        expect(user.email._errors.length).toBe(1)
        const tags = formatted.tags as { _errors: string[]; [k: string]: unknown }
        const tag0 = tags['0'] as { _errors: string[] }
        expect(tag0._errors.length).toBe(1)
      }
    })

    it('root errors land in the top-level _errors', () => {
      const f = a.string().min(5)
      const r = f.safeParse('ab')
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.format()._errors.length).toBe(1)
      }
    })

    it('two issues under the same parent reuse the same node', () => {
      // exercises format()'s "reuse existing node" branch — both failures
      // live under `user`, so the `user` node is created once and reused.
      const f = a.object({
        user: a.object({
          name: a.string().min(3),
          email: a.string().email(),
        }),
      })
      const r = f.safeParse({ user: { name: 'x', email: 'bad' } })
      expect(r.success).toBe(false)
      if (!r.success) {
        const formatted = r.error.format()
        const user = formatted.user as {
          _errors: string[]
          name: { _errors: string[] }
          email: { _errors: string[] }
        }
        expect(user.name._errors.length).toBe(1)
        expect(user.email._errors.length).toBe(1)
      }
    })
  })

  describe('toJSON()', () => {
    it('returns a serialization-safe shape', () => {
      const f = a.object({ name: a.string().min(3) })
      const r = f.safeParse({ name: 'x' })
      expect(r.success).toBe(false)
      if (!r.success) {
        const json = r.error.toJSON()
        expect(json.name).toBe('SapphireValidationError')
        expect(typeof json.message).toBe('string')
        expect(Array.isArray(json.issues)).toBe(true)
        // round-trips through JSON
        const reparsed = JSON.parse(JSON.stringify(json))
        expect(reparsed.issues.length).toBe(json.issues.length)
      }
    })

    it('JSON.stringify on the error itself uses toJSON', () => {
      const err = new SapphireValidationError([
        { path: ['x'], code: 'min_length', message: 'too short' },
      ])
      const out = JSON.parse(JSON.stringify(err))
      expect(out.name).toBe('SapphireValidationError')
      expect(out.issues[0].code).toBe('min_length')
    })
  })
})
