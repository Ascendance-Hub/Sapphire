// Pinned snippets for docs/concepts/config.md.
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'

describe('docs/concepts/config.md — snippet pinning', () => {
  it('new Sapphire(options) — instance options propagate to parse', () => {
    // --- snippet: instance options ---
    const a = new Sapphire({
      abortEarly: true,
      stripUnknown: true,
      messages: { min_length: 'too short' },
    })

    const user = a.object({
      name: a.string().min(3),
      age: a.number(),
    })

    const r = user.safeParse({ name: 'ab', age: 1, extra: 'ignored' })
    // r.error.issues.length === 1 (abortEarly), and 'extra' was dropped
    // --- end snippet ---

    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues).toHaveLength(1)
      expect(r.error.issues[0].message).toBe('too short')
    }
  })

  it('per-call overrides win over instance options', () => {
    // --- snippet: per-call overrides ---
    const a = new Sapphire({ abortEarly: true })
    const schema = a.object({
      name: a.string().min(1),
      age: a.number().nonnegative(),
    })

    // Instance says abortEarly:true, per-call flips it to false:
    const r = schema.safeParse({ name: '', age: -1 }, { abortEarly: false })
    // r.error.issues collects both failures despite the instance default
    // --- end snippet ---

    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('message hierarchy — field beats instance; rule beats field; call beats rule', () => {
    // --- snippet: message hierarchy ---
    const a = new Sapphire({
      messages: { min_length: 'instance level' },
    })

    const onlyInstance = a.string().min(3)
    const r1 = onlyInstance.safeParse('ab')
    // r1.issues[0].message === 'instance level'

    const withField = a.string().min(3).message({ min_length: 'field level' })
    const r2 = withField.safeParse('ab')
    // r2 message === 'field level' (field beats instance)

    const withRule = a.string().min(3, { message: 'rule level' })
    const r3 = withRule.safeParse('ab')
    // r3 message === 'rule level' (rule beats field & instance)

    const r4 = withRule.safeParse('ab', {
      messages: { min_length: 'call level' },
    })
    // r4 message === 'call level' (per-call beats everything)
    // --- end snippet ---

    expect(r1.success).toBe(false)
    expect(r2.success).toBe(false)
    expect(r3.success).toBe(false)
    expect(r4.success).toBe(false)
    if (!r1.success) expect(r1.error.issues[0].message).toBe('instance level')
    if (!r2.success) expect(r2.error.issues[0].message).toBe('field level')
    if (!r3.success) expect(r3.error.issues[0].message).toBe('rule level')
    if (!r4.success) expect(r4.error.issues[0].message).toBe('call level')
  })

  it('named-schema registry is per-instance — separate instances are independent', () => {
    // --- snippet: per-instance registry ---
    const a1 = new Sapphire()
    const a2 = new Sapphire()

    a1.object({ x: a1.string() }).name('User')
    a2.object({ y: a2.string() }).name('User')
    // No collision — each Sapphire has its own NamedSchemaRegistry.
    // --- end snippet ---

    expect(a1.listNamedSchemas()).toEqual(['User'])
    expect(a2.listNamedSchemas()).toEqual(['User'])
  })

  it('function messages — closure capture works; ctx provides per-failure data', () => {
    // --- snippet: function messages closure ---
    let calls = 0
    const a = new Sapphire()
    const name = a.string().min(3, {
      message: (ctx) => {
        calls++
        return `failed at ${ctx.path.join('.') || '<root>'} (min=${String(ctx.min)})`
      },
    })

    name.safeParse('ab')
    name.safeParse('a')
    // calls === 2 — the function runs per failure, not at field-definition time
    // --- end snippet ---

    expect(calls).toBe(2)
  })
})
