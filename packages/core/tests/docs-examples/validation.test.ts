// Pinned snippets for docs/concepts/validation.md.
import { describe, it, expect } from 'vitest'
import { Sapphire, SapphireValidationError } from '@ascendance-hub/sapphire-core'

describe('docs/concepts/validation.md — snippet pinning', () => {
  it('parse vs safeParse — throws vs returns', () => {
    const a = new Sapphire()
    const user = a.object({
      name: a.string().min(1),
      age: a.number().int().nonnegative(),
    })

    // --- snippet: parse throws on failure ---
    expect(() => user.parse({ name: '', age: -1 })).toThrow(SapphireValidationError)
    // --- end snippet ---

    // --- snippet: safeParse returns a result ---
    const result = user.safeParse({ name: '', age: -1 })
    if (result.success) {
      // result.data is typed as Infer<typeof user>
    } else {
      // result.error is a SapphireValidationError
      // result.error.issues is ValidationIssue[]
    }
    // --- end snippet ---
    expect(result.success).toBe(false)
  })

  it('SapphireValidationError shape — issues, message, name', () => {
    const a = new Sapphire()
    const user = a.object({ name: a.string().min(3) })

    // --- snippet: error shape ---
    const result = user.safeParse({ name: 'ab' })
    if (!result.success) {
      void result.error.name // 'SapphireValidationError'
      void result.error.message // 'Validation failed (1 issue)'
      void result.error.issues // ValidationIssue[]
    }
    // --- end snippet ---
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.name).toBe('SapphireValidationError')
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].code).toBe('min_length')
    }
  })

  it('ValidationIssue — path, code, message, context', () => {
    const a = new Sapphire()
    const user = a.object({
      profile: a.object({
        email: a.string().email(),
      }),
    })

    const result = user.safeParse({ profile: { email: 'not-an-email' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      const [issue] = result.error.issues
      // --- snippet: issue shape ---
      void issue.path // ['profile', 'email']
      void issue.code // 'format'
      void issue.message // string | object
      void issue.context // { format: 'email' } | undefined
      // --- end snippet ---
      expect(issue.path).toEqual(['profile', 'email'])
      expect(issue.code).toBe('format')
    }
  })

  it('abortEarly — stops on first issue', () => {
    const a = new Sapphire()
    const user = a.object({
      name: a.string().min(1),
      age: a.number().nonnegative(),
    })

    // --- snippet: abortEarly ---
    const result = user.safeParse({ name: '', age: -1 }, { abortEarly: true })
    // result.error.issues.length === 1 (stopped at first)
    // --- end snippet ---
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
    }

    // Default (false) collects everything:
    const full = user.safeParse({ name: '', age: -1 })
    expect(full.success).toBe(false)
    if (!full.success) {
      expect(full.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('stripUnknown — default false rejects extra keys with unknown_key', () => {
    const a = new Sapphire()
    const user = a.object({ name: a.string() })

    // --- snippet: stripUnknown default ---
    const strict = user.safeParse({ name: 'Ada', rogue: 1 })
    // strict.success === false; issues[0].code === 'unknown_key'
    // --- end snippet ---
    expect(strict.success).toBe(false)
    if (!strict.success) {
      expect(strict.error.issues[0].code).toBe('unknown_key')
    }

    // --- snippet: stripUnknown true ---
    const lax = user.parse({ name: 'Ada', rogue: 1 }, { stripUnknown: true })
    // lax === { name: 'Ada' } — extras dropped silently
    // --- end snippet ---
    expect(lax).toEqual({ name: 'Ada' })
  })

  it('message hierarchy — per-rule beats field; per-call beats all', () => {
    const a = new Sapphire({
      messages: { min_length: 'instance: too short' },
    })

    // --- snippet: message hierarchy ---
    const name = a
      .string()
      .min(3, { message: 'per-rule: at least 3' })
      .message({ min_length: 'field: too short' })

    // per-rule wins over field-level
    const r1 = name.safeParse('ab')

    // per-call beats per-rule
    const r2 = name.safeParse('ab', {
      messages: { min_length: 'per-call wins' },
    })
    // --- end snippet ---

    expect(r1.success).toBe(false)
    if (!r1.success) expect(r1.error.issues[0].message).toBe('per-rule: at least 3')

    expect(r2.success).toBe(false)
    if (!r2.success) expect(r2.error.issues[0].message).toBe('per-call wins')
  })

  it('function messages — receive ctx with path/code/extras', () => {
    const a = new Sapphire()

    // --- snippet: function messages ---
    const name = a.string().min(3, {
      message: (ctx) => `[${ctx.path.join('.')}] code=${ctx.code} min=${String(ctx.min)}`,
    })

    const result = name.safeParse('ab')
    // result.error.issues[0].message === '[] code=min_length min=3'
    // --- end snippet ---

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('[] code=min_length min=3')
    }
  })

  it('error.flatten() — field-keyed string arrays', () => {
    const a = new Sapphire()
    const UserSchema = a.object({ email: a.string().email(), age: a.number().int() })

    // --- snippet: flatten ---
    const r = UserSchema.safeParse({ email: 'bad', age: 1.5 })
    if (!r.success) {
      const { fieldErrors } = r.error.flatten()
      // fieldErrors: { email: [...], age: [...] }
      void fieldErrors
    }
    // --- end snippet ---

    expect(r.success).toBe(false)
    if (!r.success) {
      const flat = r.error.flatten()
      expect(Object.keys(flat.fieldErrors).sort()).toEqual(['age', 'email'])
      expect(flat.formErrors).toEqual([])
    }
  })

  it('error.format() — nested error tree', () => {
    const a = new Sapphire()
    const Schema = a.object({ address: a.object({ zip: a.string().length(5) }) })

    // --- snippet: format ---
    const r = Schema.safeParse({ address: { zip: '1' } })
    if (!r.success) {
      const tree = r.error.format()
      // tree.address.zip._errors → ['...']
      void tree
    }
    // --- end snippet ---

    expect(r.success).toBe(false)
    if (!r.success) {
      const tree = r.error.format()
      const address = tree.address as { zip: { _errors: string[] } }
      expect(address.zip._errors.length).toBe(1)
    }
  })

  it('error.toJSON() — serialization-safe shape', () => {
    const a = new Sapphire()
    const r = a.object({ name: a.string().min(3) }).safeParse({ name: 'x' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const json = r.error.toJSON()
      expect(json.name).toBe('SapphireValidationError')
      expect(Array.isArray(json.issues)).toBe(true)
    }
  })

  it('ref_target_missing — unregistered ref target fails safeParse', () => {
    const a = new Sapphire()

    // --- snippet: ref target validation ---
    const Post = a.object({ author: a.ref('User') }) // 'User' never registered
    const r = Post.safeParse({ author: 'some-id' })
    // r.success === false; issues[0].code === 'ref_target_missing'
    // --- end snippet ---

    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].code).toBe('ref_target_missing')
    }
  })

  // SapphireValidationError is imported in the snippet pinning above so the
  // doc's class-shape reference stays honest.
  it('SapphireValidationError is the thrown error type', () => {
    const a = new Sapphire()
    try {
      a.string().min(3).parse('x')
    } catch (e) {
      expect(e).toBeInstanceOf(SapphireValidationError)
    }
  })
})
