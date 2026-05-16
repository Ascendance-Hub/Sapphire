/**
 * season-five review B3 — `buildField` skipped `applyCommon` for the `array`
 * and nested `object` cases, silently dropping `default` / `description` and
 * the `meta.mongoose` escape hatch on those kinds. Every other field kind
 * ran it.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '../src'

const a = new Sapphire({ defaultAdapter: 'mongoose' })

describe('B3 — applyCommon runs for array and nested-object fields', () => {
  it('array field keeps default and description', () => {
    const def = toMongooseSchema(
      a.array(a.number()).default([1, 2]).describe('user tags').toSchema(),
    ) as Record<string, any>
    expect(def.default).toEqual([1, 2])
    expect(def.description).toBe('user tags')
  })

  it('array field honors the meta.mongoose escape hatch', () => {
    const def = toMongooseSchema(
      a.array(a.string()).adapter('mongoose', { select: false }).toSchema(),
    ) as Record<string, any>
    expect(def.select).toBe(false)
  })

  it('nested object field keeps description and the escape hatch', () => {
    const def = toMongooseSchema(
      a
        .array(
          a
            .object({ bio: a.string() })
            .describe('the profile')
            .adapter('mongoose', { select: false }),
        )
        .toSchema(),
    ) as Record<string, any>
    const itemDef = def.type[0]
    expect(itemDef.description).toBe('the profile')
    expect(itemDef.select).toBe(false)
  })

  it('end-to-end: a non-empty array default reaches a Mongoose model', () => {
    const schema = toMongooseSchema(
      a.object({ tags: a.array(a.number()).default([7, 8]) }).toSchema(),
    ) as mongoose.Schema
    const Model = mongoose.model('B3_' + Math.random().toString(36).slice(2), schema)
    expect([...new Model({}).tags]).toEqual([7, 8])
  })
})
