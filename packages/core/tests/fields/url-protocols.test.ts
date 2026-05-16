/**
 * season-five S5 — `.url()` defaults to http/https; `.url({ protocols })`
 * widens or narrows the accepted schemes. The IR carries the resolved list.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

type StringNode = { kind: string; format?: string; urlProtocols?: string[] }

describe('S5 — .url() protocol scoping', () => {
  it('accepts http and https by default', () => {
    const u = a.string().url()
    expect(u.safeParse('http://example.com').success).toBe(true)
    expect(u.safeParse('https://example.com').success).toBe(true)
  })

  it('rejects non-http schemes by default', () => {
    const u = a.string().url()
    expect(u.safeParse('javascript:alert(1)').success).toBe(false)
    expect(u.safeParse('mailto:a@b.com').success).toBe(false)
    expect(u.safeParse('file:///etc/passwd').success).toBe(false)
  })

  it('a custom protocol list widens what is accepted', () => {
    const u = a.string().url({ protocols: ['http', 'https', 'ftp'] })
    expect(u.safeParse('ftp://files.example.com').success).toBe(true)
    expect(u.safeParse('https://example.com').success).toBe(true)
  })

  it('a custom protocol list also narrows — only those schemes pass', () => {
    const u = a.string().url({ protocols: ['mailto'] })
    expect(u.safeParse('mailto:a@b.com').success).toBe(true)
    expect(u.safeParse('https://example.com').success).toBe(false)
  })

  it('the IR carries the resolved protocol list', () => {
    const def = a.string().url().toSchema() as StringNode
    expect(def.format).toBe('url')
    expect(def.urlProtocols).toEqual(['http', 'https'])

    const custom = a
      .string()
      .url({ protocols: ['ftp'] })
      .toSchema() as StringNode
    expect(custom.urlProtocols).toEqual(['ftp'])
  })

  it('a non-url string carries no urlProtocols', () => {
    const def = a.string().toSchema() as StringNode
    expect(def.urlProtocols).toBeUndefined()
  })

  it('the format issue code is still `format`', () => {
    const r = a.string().url().safeParse('not a url')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('format')
  })

  it('a custom per-rule message still works alongside protocols', () => {
    const u = a.string().url({ protocols: ['https'], message: 'must be https' })
    const r = u.safeParse('http://example.com')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('must be https')
  })
})
