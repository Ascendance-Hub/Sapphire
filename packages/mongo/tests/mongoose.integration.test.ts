import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'
import { uniqueModelName } from './_setup'

describe('Integração com Mongoose', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('top-level object retorna mongoose.Schema diretamente', () => {
    const userField = a.object({
      name: a.string(),
      age: a.number().optional(),
    })
    const schema = toMongoSchema(userField.toSchema()) as mongoose.Schema
    expect(schema).toBeInstanceOf(mongoose.Schema)
    expect(schema.path('name')).toBeDefined()
    expect(schema.path('age')).toBeDefined()
  })

  it('aceita schema aninhado com object e array', () => {
    const productField = a.object({
      title: a.string().min(1),
      tags: a.array(a.string()).optional(),
      metadata: a.object({
        createdAt: a.date(),
        updatedAt: a.date().optional(),
      }),
    })
    const schema = toMongoSchema(productField.toSchema()) as mongoose.Schema
    expect(schema).toBeInstanceOf(mongoose.Schema)
    const sub = schema.path('metadata') as any
    expect(sub.schema).toBeInstanceOf(mongoose.Schema)
    expect(sub.schema.options._id).toBe(false)
  })

  it('aceita union (vira Mixed)', () => {
    const field = a.object({
      val: a.type().union([a.string(), a.number()]),
    })
    const schema = toMongoSchema(field.toSchema()) as mongoose.Schema
    const valPath = schema.path('val') as any
    expect(valPath.instance).toBe('Mixed')
  })

  it('valida required em string em runtime mongoose', () => {
    const userField = a.object({
      name: a.string(),
    })
    const schema = toMongoSchema(userField.toSchema()) as mongoose.Schema
    const Model = mongoose.model(uniqueModelName('TestUser'), schema)
    const doc = new Model({})
    const err = doc.validateSync()
    expect(err).toBeDefined()
    expect(err?.errors.name).toBeDefined()
  })
})
