import { describe, it, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer, InferInput } from '../../src/types/infer'

const a = new Sapphire()

describe('Infer — primitivos', () => {
  it('string: required → string; optional → string | undefined', () => {
    const reqd = a.string()
    const opt = a.string().optional()
    expectTypeOf<Infer<typeof reqd>>().toEqualTypeOf<string>()
    expectTypeOf<Infer<typeof opt>>().toEqualTypeOf<string | undefined>()
  })

  it('number', () => {
    const reqd = a.number()
    const opt = a.number().optional()
    expectTypeOf<Infer<typeof reqd>>().toEqualTypeOf<number>()
    expectTypeOf<Infer<typeof opt>>().toEqualTypeOf<number | undefined>()
  })

  it('boolean', () => {
    const reqd = a.boolean()
    const opt = a.boolean().optional()
    expectTypeOf<Infer<typeof reqd>>().toEqualTypeOf<boolean>()
    expectTypeOf<Infer<typeof opt>>().toEqualTypeOf<boolean | undefined>()
  })

  it('date', () => {
    const reqd = a.date()
    const opt = a.date().optional()
    expectTypeOf<Infer<typeof reqd>>().toEqualTypeOf<Date>()
    expectTypeOf<Infer<typeof opt>>().toEqualTypeOf<Date | undefined>()
  })

  it('min(...) preserva o output', () => {
    const s = a.string().min(3)
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string>()
  })
})

describe('Infer — object', () => {
  it('chaves required ficam required, optional ficam opcionais', () => {
    const obj = a.object({
      name: a.string(),
      age: a.number().optional(),
    })
    type T = Infer<typeof obj>
    expectTypeOf<T>().toEqualTypeOf<{ name: string; age?: number | undefined }>()
  })

  it('object aninhado preserva opcionalidade interna', () => {
    const obj = a.object({
      job: a.object({
        title: a.string(),
        company: a.string().optional(),
      }),
    })
    type T = Infer<typeof obj>
    expectTypeOf<T>().toEqualTypeOf<{
      job: { title: string; company?: string | undefined }
    }>()
  })

  it('object inteiro optional', () => {
    const obj = a.object({ name: a.string() }).optional()
    type T = Infer<typeof obj>
    expectTypeOf<T>().toEqualTypeOf<{ name: string } | undefined>()
  })
})

describe('Infer — array', () => {
  it('array de string → string[]', () => {
    const arr = a.array([a.string()])
    expectTypeOf<Infer<typeof arr>>().toEqualTypeOf<string[]>()
  })

  it('array optional', () => {
    const arr = a.array([a.string()]).optional()
    expectTypeOf<Infer<typeof arr>>().toEqualTypeOf<string[] | undefined>()
  })

  it('array com múltiplos fields → união[]', () => {
    const arr = a.array([a.string(), a.number()])
    type T = Infer<typeof arr>
    expectTypeOf<T>().toEqualTypeOf<(string | number)[]>()
  })
})

describe('Infer — union', () => {
  it('union([string, number]) → string | number', () => {
    const u = a.type().union([a.string(), a.number()])
    expectTypeOf<Infer<typeof u>>().toEqualTypeOf<string | number>()
  })

  it('union optional → ... | undefined', () => {
    const u = a.type().union([a.string(), a.number()]).optional()
    expectTypeOf<Infer<typeof u>>().toEqualTypeOf<string | number | undefined>()
  })
})

describe('InferInput', () => {
  it('reflete o input — em F7 igual ao output', () => {
    const obj = a.object({
      name: a.string(),
      age: a.number().optional(),
    })
    expectTypeOf<InferInput<typeof obj>>().toEqualTypeOf<{
      name: string
      age?: number | undefined
    }>()
  })
})
