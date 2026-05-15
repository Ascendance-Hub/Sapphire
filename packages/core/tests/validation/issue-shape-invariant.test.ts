import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src'

const ISSUE_CODES = new Set<string>([
  'required',
  'invalid_type',
  'min_length',
  'max_length',
  'length',
  'regex',
  'format',
  'starts_with',
  'ends_with',
  'min',
  'max',
  'gt',
  'gte',
  'lt',
  'lte',
  'int',
  'multiple_of',
  'finite',
  'safe',
  'min_items',
  'max_items',
  'items_length',
  'enum',
  'literal',
  'tuple_length',
  'union_no_match',
  'unknown_key',
])

function assertIssueShape(issues: readonly unknown[]): void {
  expect(Array.isArray(issues)).toBe(true)
  expect(issues.length).toBeGreaterThan(0)
  for (const raw of issues) {
    expect(raw).toBeTypeOf('object')
    expect(raw).not.toBeNull()
    const issue = raw as Record<string, unknown>

    expect(Array.isArray(issue.path)).toBe(true)
    for (const seg of issue.path as unknown[]) {
      const t = typeof seg
      expect(t === 'string' || t === 'number').toBe(true)
    }

    expect(typeof issue.code).toBe('string')
    expect(ISSUE_CODES.has(issue.code as string)).toBe(true)

    // message must be present and either string or an object (some custom shapes
    // are allowed); never undefined or null.
    expect(issue.message).toBeDefined()
    const msgType = typeof issue.message
    expect(msgType === 'string' || msgType === 'object').toBe(true)
    if (msgType === 'string') {
      expect((issue.message as string).length).toBeGreaterThan(0)
    }

    // context, when present, must be an object
    if (issue.context !== undefined) {
      expect(typeof issue.context).toBe('object')
      expect(issue.context).not.toBeNull()
    }
  }
}

describe('issue shape invariants — generic walker', () => {
  const a = new Sapphire()

  it('string failures (min/max/format/regex)', () => {
    const s = a.string().min(3).max(5).email()
    const r = s.safeParse('a')
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('number failures (int/min/multipleOf/finite)', () => {
    const n = a.number().int().min(10).multipleOf(3).finite()
    const r = n.safeParse(1.5)
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('object with unknown_key + nested issues', () => {
    const obj = a.object({
      name: a.string().min(2),
      age: a.number().int(),
    })
    const r = obj.safeParse({ name: 'a', age: 1.5, extra: 1 })
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('array with min/max items + element failures', () => {
    const arr = a.array(a.string().min(2)).min(2).max(3)
    const r = arr.safeParse(['x'])
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('tuple length mismatch', () => {
    const t = a.tuple([a.string(), a.number()])
    const r = t.safeParse(['a'])
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('union no match', () => {
    const u = a.type().union([a.string(), a.number()])
    const r = u.safeParse(true)
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('enum mismatch', () => {
    const e = a.type().enum(['a', 'b', 'c'] as const)
    const r = e.safeParse('z')
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('literal mismatch', () => {
    const l = a.type().literal('admin')
    const r = l.safeParse('user')
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('required (missing field)', () => {
    const obj = a.object({ name: a.string() })
    const r = obj.safeParse({})
    expect(r.success).toBe(false)
    if (!r.success) assertIssueShape(r.error.issues)
  })

  it('deeply nested path is fully populated', () => {
    const obj = a.object({
      user: a.object({
        addresses: a.array(
          a.object({
            zip: a.string().length(5),
          }),
        ),
      }),
    })
    const r = obj.safeParse({ user: { addresses: [{ zip: '1' }] } })
    expect(r.success).toBe(false)
    if (!r.success) {
      assertIssueShape(r.error.issues)
      // confirm path actually descended
      const issue = r.error.issues[0] as { path: (string | number)[] }
      expect(issue.path).toEqual(['user', 'addresses', 0, 'zip'])
    }
  })
})
