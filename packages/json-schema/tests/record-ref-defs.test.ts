import { describe, it, expect } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import { toJsonSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toJsonSchema — refs + $defs', () => {
  it('schema nomeado vira $ref na posição original e definição em $defs', () => {
    const author: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'Author',
      properties: {
        name: { kind: 'string', required: true },
      },
    }
    const post: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        title: { kind: 'string', required: true },
        author,
      },
    }
    const out = toJsonSchema(post) as any
    expect(out.properties.author).toEqual({ $ref: '#/$defs/Author' })
    expect(out.$defs.Author).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })
  })

  it('ref kind aponta para $defs/<target>', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        author: { kind: 'ref', required: true, target: 'Author' },
      },
    }
    const out = toJsonSchema(node, {
      defs: {
        Author: {
          kind: 'object',
          required: true,
          name: 'Author',
          properties: { name: { kind: 'string', required: true } },
        },
      },
    }) as any
    expect(out.properties.author).toEqual({ $ref: '#/$defs/Author' })
    expect(out.$defs.Author.type).toBe('object')
  })

  it('refs cíclicos compilam e validam em AJV 2020', () => {
    const user: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'User',
      properties: {
        name: { kind: 'string', required: true },
        posts: {
          kind: 'array',
          required: false,
          items: { kind: 'ref', required: true, target: 'Post' },
        },
      },
    }
    const post: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'Post',
      properties: {
        title: { kind: 'string', required: true },
        author: { kind: 'ref', required: true, target: 'User' },
      },
    }
    const out = toJsonSchema(user, { defs: { Post: post } })
    const ajv = new Ajv2020({ strict: false })
    const validate = ajv.compile(out)
    expect(
      validate({
        name: 'A',
        posts: [{ title: 't', author: { name: 'A' } }],
      }),
    ).toBe(true)
    expect(validate({ name: 'A', posts: [{ title: 't' }] })).toBe(false)
  })

  it('options.defs adicionais são incluídos em $defs', () => {
    const root: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        a: { kind: 'ref', required: true, target: 'Extra' },
      },
    }
    const extra: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'Extra',
      properties: { v: { kind: 'number', required: true } },
    }
    const out = toJsonSchema(root, { defs: { Extra: extra } }) as any
    expect(out.$defs.Extra).toBeDefined()
    expect(out.$defs.Extra.properties.v).toEqual({ type: 'number' })
  })

  it('tree wins quando há colisão entre auto-collected e options.defs', () => {
    const treeUser: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'User',
      properties: { fromTree: { kind: 'string', required: true } },
    }
    const optsUser: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'User',
      properties: { fromOpts: { kind: 'string', required: true } },
    }
    const root: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: { u: treeUser },
    }
    const out = toJsonSchema(root, { defs: { User: optsUser } }) as any
    expect(out.$defs.User.properties.fromTree).toBeDefined()
    expect(out.$defs.User.properties.fromOpts).toBeUndefined()
  })

  it('nome com chars proibidos lança erro', () => {
    const bad: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      name: 'with/slash',
      properties: {},
    }
    expect(() => toJsonSchema(bad)).toThrow(/not allowed/)
  })
})
