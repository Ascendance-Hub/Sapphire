import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Integração com Mongoose', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('aceita schema simples em new mongoose.Schema', () => {
    const userField = a.object({
      name: a.string(),
      age: a.number().optional(),
    })
    const node = userField.toSchema()
    if (node.kind !== 'object') throw new Error('expected object node')
    const mongoDef: Record<string, any> = {}
    for (const [key, child] of Object.entries(node.properties)) {
      mongoDef[key] = toMongoSchema(child)
    }
    expect(() => new mongoose.Schema(mongoDef)).not.toThrow()
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
    const node = productField.toSchema()
    if (node.kind !== 'object') throw new Error('expected object node')
    const mongoDef: Record<string, any> = {}
    for (const [key, child] of Object.entries(node.properties)) {
      mongoDef[key] = toMongoSchema(child)
    }
    expect(() => new mongoose.Schema(mongoDef)).not.toThrow()
  })

  it('aceita union (vira Mixed)', () => {
    const field = a.object({
      val: a.type().union([a.string(), a.number()]),
    })
    const node = field.toSchema()
    if (node.kind !== 'object') throw new Error('expected object node')
    const mongoDef: Record<string, any> = {}
    for (const [key, child] of Object.entries(node.properties)) {
      mongoDef[key] = toMongoSchema(child)
    }
    expect(() => new mongoose.Schema(mongoDef)).not.toThrow()
  })

  it('valida required em string em runtime mongoose', async () => {
    const userField = a.object({
      name: a.string(),
    })
    const node = userField.toSchema()
    if (node.kind !== 'object') throw new Error('expected object node')
    const mongoDef: Record<string, any> = {}
    for (const [key, child] of Object.entries(node.properties)) {
      mongoDef[key] = toMongoSchema(child)
    }
    const Schema = new mongoose.Schema(mongoDef)
    const Model = mongoose.model('TestUser_' + Date.now(), Schema)
    const doc = new Model({})
    const err = doc.validateSync()
    expect(err).toBeDefined()
    expect(err?.errors.name).toBeDefined()
  })
})
