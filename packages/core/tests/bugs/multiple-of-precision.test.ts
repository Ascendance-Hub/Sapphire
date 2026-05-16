/**
 * season-five review B1 — `multipleOf` rejected valid multiples for large
 * operands. The float tolerance was scaled by the divisor (`m`), but the
 * rounding error of the check grows with the magnitude of the operand `n`,
 * so for large `n` a genuine multiple failed validation.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

describe('B1 — multipleOf precision across operand magnitudes', () => {
  it('accepts a small exact multiple (0.3 is a multiple of 0.1)', () => {
    expect(a.number().multipleOf(0.1).safeParse(0.3).success).toBe(true)
  })

  it('accepts a large exact multiple (100.2 is a multiple of 0.1)', () => {
    expect(a.number().multipleOf(0.1).safeParse(100.2).success).toBe(true)
  })

  it('accepts an even larger exact multiple (1000.3 is a multiple of 0.1)', () => {
    expect(a.number().multipleOf(0.1).safeParse(1000.3).success).toBe(true)
  })

  it('still rejects a genuine non-multiple (0.15 is not a multiple of 0.1)', () => {
    const r = a.number().multipleOf(0.1).safeParse(0.15)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('multiple_of')
  })

  it('rejects a large non-multiple (100.3 is not a multiple of 0.5)', () => {
    expect(a.number().multipleOf(0.5).safeParse(100.3).success).toBe(false)
  })

  it('integer multiples are unaffected', () => {
    expect(a.number().multipleOf(3).safeParse(9).success).toBe(true)
    expect(a.number().multipleOf(3).safeParse(10).success).toBe(false)
  })

  it('negative divisors still work', () => {
    expect(a.number().multipleOf(-0.1).safeParse(100.2).success).toBe(true)
  })
})
