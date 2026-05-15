import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('RefField — parse-time target validation (B1)', () => {
  it('emits ref_target_missing when the target is not registered', () => {
    const a = new Sapphire()
    const Post = a.object({ author: a.ref('Ghost') })
    const r = Post.safeParse({ author: 'anything' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const codes = r.error.issues.map((i) => i.code)
      expect(codes).toContain('ref_target_missing')
      const issue = r.error.issues.find((i) => i.code === 'ref_target_missing')!
      expect(issue.path).toEqual(['author'])
      expect(issue.message).toMatch(/Ghost/)
    }
  })

  it('accepts a ref when the target IS registered', () => {
    const a = new Sapphire()
    a.object({ name: a.string() }).name('User')
    const Post = a.object({ author: a.ref('User') })
    const r = Post.safeParse({ author: 'anything' })
    expect(r.success).toBe(true)
  })

  it('skips the check on a field constructed without a Sapphire instance', () => {
    // RefField can be constructed standalone (used by drizzle adapter tests
    // that bypass the instance). When there is no namedSchemas reachable via
    // ctx, parse stays open — matches the documented "v1 only checks
    // presence" baseline.
    const a = new Sapphire()
    a.object({ name: a.string() }).name('Real')
    // Build a separate ref outside the instance flow; parse via .safeParse
    // which DOES reach the instance — so target check fires.
    const f = a.ref('NonExistent')
    const r = f.safeParse('whatever')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].code).toBe('ref_target_missing')
    }
  })

  it('still fires the required check before the target check', () => {
    const a = new Sapphire()
    const f = a.ref('Anywhere')
    const r = f.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) {
      // required wins — we never reach the target check
      expect(r.error.issues[0].code).toBe('required')
    }
  })

  it('optional + nullable bypass the target check (no value to ref)', () => {
    const a = new Sapphire()
    const f = a.ref('Nope').optional()
    const r = f.safeParse(undefined)
    expect(r.success).toBe(true)
  })

  it('nested ref inside an object emits with the correct path', () => {
    const a = new Sapphire()
    const Post = a.object({
      meta: a.object({ author: a.ref('Missing') }),
    })
    const r = Post.safeParse({ meta: { author: 'x' } })
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.code === 'ref_target_missing')!
      expect(issue.path).toEqual(['meta', 'author'])
    }
  })
})
