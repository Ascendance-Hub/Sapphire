import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('Bug: ObjectField.optional() não funciona', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('objeto opcional aceita undefined', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })

  it('objeto opcional aceita null', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.safeParse(null).success).toBe(true)
  })

  it('objeto obrigatório falha em undefined', () => {
    const field = a.object({ name: a.string() })
    expect(field.safeParse(undefined).success).toBe(false)
  })

  it('objeto opcional ainda valida quando presente', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.safeParse({ name: 'ale' }).success).toBe(true)
    expect(field.safeParse({ name: 123 }).success).toBe(false)
  })

  it('schema reflete required:false após optional()', () => {
    const field = a.object({ name: a.string() }).optional()
    expect((field.getSchema() as { required: boolean }).required).toBe(false)
  })
})
