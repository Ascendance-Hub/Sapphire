/**
 * season-five review B4 — `extend`/`merge`/`partial`/`required` preserve the
 * schema `name` (a pinned season-three decision). When a named schema and a
 * same-named derived schema both appear in one tree, `collectNamed` kept the
 * first and silently emitted a wrong `$ref` for the second. It now throws a
 * clear error instead of corrupting the output.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '../src'

describe('B4 — duplicate $defs name detection', () => {
  it('throws when two different shapes share one name', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const Org = a.object({
      owner: User,
      // extend() preserves the name 'User' (S7 decision) but widens the shape
      admin: User.extend({ role: a.string() }),
    })
    expect(() => toJsonSchema(Org.toSchema())).toThrow(/both named "User"/)
  })

  it('does not throw when the same schema is referenced twice', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const Org = a.object({ owner: User, backup: User })
    expect(() => toJsonSchema(Org.toSchema())).not.toThrow()
  })

  it('does not throw for distinct names', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const Admin = a.object({ name: a.string(), role: a.string() }).name('Admin')
    const Org = a.object({ owner: User, admin: Admin })
    expect(() => toJsonSchema(Org.toSchema())).not.toThrow()
  })
})
