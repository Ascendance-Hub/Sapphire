// Pinned snippets for docs/concepts/tuples-vs-arrays.md.
import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

describe('docs/concepts/tuples-vs-arrays.md — snippet pinning', () => {
  it('array — homogeneous, variable length', () => {
    // --- snippet: array ---
    const tags = a.array(a.string()).min(1).max(10)
    type Tags = Infer<typeof tags>
    // Tags = string[]
    // --- end snippet ---

    expectTypeOf<Tags>().toEqualTypeOf<string[]>()
    expect(tags.parse(['a', 'b'])).toEqual(['a', 'b'])
    expect(tags.safeParse([]).success).toBe(false)
  })

  it('tuple — heterogeneous, fixed length', () => {
    // --- snippet: tuple ---
    const point = a.tuple([a.number(), a.number(), a.string()])
    type Point = Infer<typeof point>
    // Point = [number, number, string]
    // --- end snippet ---

    expectTypeOf<Point>().toEqualTypeOf<[number, number, string]>()
    expect(point.parse([1, 2, 'origin'])).toEqual([1, 2, 'origin'])
    // Wrong length:
    expect(point.safeParse([1, 2]).success).toBe(false)
    // Wrong element type at position 2:
    expect(point.safeParse([1, 2, 3]).success).toBe(false)
  })

  it('array of union — the explicit either-of-shapes pattern', () => {
    // --- snippet: array of union ---
    const mixed = a.array(a.type().union([a.string(), a.number()]))
    type Mixed = Infer<typeof mixed>
    // Mixed = (string | number)[]
    // --- end snippet ---

    expectTypeOf<Mixed>().toEqualTypeOf<(string | number)[]>()
    expect(mixed.parse(['x', 1, 'y', 2])).toEqual(['x', 1, 'y', 2])
  })
})
