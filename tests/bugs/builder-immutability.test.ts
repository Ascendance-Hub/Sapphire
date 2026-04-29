import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Builder imutável', () => {
  const a = new Sapphire()

  it('optional() não muta a instância base', () => {
    const baseName = a.string()
    const optionalName = baseName.optional()

    expect(baseName.toSchema().required).toBe(true)
    expect(optionalName.toSchema().required).toBe(false)
    expect(baseName).not.toBe(optionalName)
  })

  it('reuso de field base entre schemas não vaza estado', () => {
    const baseName = a.string()
    const userSchema = a.object({ name: baseName })
    const adminSchema = a.object({ name: baseName.optional() })

    const userProps = (userSchema.toSchema() as any).properties
    const adminProps = (adminSchema.toSchema() as any).properties

    expect(userProps.name.required).toBe(true)
    expect(adminProps.name.required).toBe(false)
  })

  it('min() encadeado retorna nova instância sem afetar a anterior', () => {
    const m3 = a.string().min(3)
    const m5 = m3.min(5)

    expect((m3.toSchema() as any).minLength).toBe(3)
    expect((m5.toSchema() as any).minLength).toBe(5)
    expect(m3).not.toBe(m5)
  })

  it('a.string().optional() é instância diferente da original', () => {
    const base = a.string()
    const opt = base.optional()
    expect(base !== opt).toBe(true)
  })

  it('encadeamento funciona: string().optional().min(3)', () => {
    const field = a.string().optional().min(3)
    const schema = field.toSchema() as any
    expect(schema.required).toBe(false)
    expect(schema.minLength).toBe(3)
  })

  it('NumberField.optional() não muta', () => {
    const base = a.number()
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })

  it('BooleanField.optional() não muta', () => {
    const base = a.boolean()
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })

  it('DateField.optional() não muta', () => {
    const base = a.date()
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })

  it('ObjectField.optional() não muta', () => {
    const base = a.object({ name: a.string() })
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })

  it('ArrayField.optional() não muta', () => {
    const base = a.array([a.string()])
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })

  it('UnionField.optional() não muta', () => {
    const base = a.type().union([a.string(), a.number()])
    const opt = base.optional()
    expect(base.toSchema().required).toBe(true)
    expect(opt.toSchema().required).toBe(false)
  })
})
