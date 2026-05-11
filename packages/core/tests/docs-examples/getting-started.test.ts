// Pinned snippets for docs/getting-started.md. Each block below is the exact
// code shown in that guide. If the API changes, this test fails and the doc
// is explicitly marked as wrong instead of silently rotting.
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'

describe('docs/getting-started.md — snippet pinning', () => {
  it('your first schema — define + Infer', () => {
    // --- snippet: Your first schema ---
    const a = new Sapphire()

    const userSchema = a.object({
      name: a.string().min(1),
      email: a.string().email(),
      age: a.number().int().min(0).optional(),
    })

    type User = Infer<typeof userSchema>
    // User = { name: string; email: string; age?: number | undefined }
    // --- end snippet ---

    // Sanity: shape compiles and is non-empty.
    const sample: User = { name: 'Ada', email: 'ada@example.com' }
    expect(sample.name).toBe('Ada')
    expect(userSchema.toSchema().kind).toBe('object')
  })

  it('parse / safeParse — valid input', () => {
    const a = new Sapphire()
    const userSchema = a.object({
      name: a.string().min(1),
      email: a.string().email(),
      age: a.number().int().min(0).optional(),
    })

    // --- snippet: parse a valid input ---
    const user = userSchema.parse({
      name: 'Ada',
      email: 'ada@example.com',
      age: 36,
    })
    // user is typed as { name: string; email: string; age?: number | undefined }
    // --- end snippet ---

    expect(user).toEqual({ name: 'Ada', email: 'ada@example.com', age: 36 })
  })

  it('parse / safeParse — invalid input shows issues array', () => {
    const a = new Sapphire()
    const userSchema = a.object({
      name: a.string().min(1),
      email: a.string().email(),
      age: a.number().int().min(0).optional(),
    })

    // --- snippet: safeParse an invalid input ---
    const result = userSchema.safeParse({
      name: '',
      email: 'not-an-email',
      age: -1,
    })

    if (!result.success) {
      // result.error.issues is an array of { path, code, message }
      for (const issue of result.error.issues) {
        // e.g. { path: ['email'], code: 'format', message: '...' }
        // issue.path: where in the value the problem is
        // issue.code: a stable string from the IssueCode union
        // issue.message: the resolved message (string or object)
        void issue
      }
    }
    // --- end snippet ---

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(Array.isArray(result.error.issues)).toBe(true)
      expect(result.error.issues.length).toBeGreaterThan(0)
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('name')
      expect(paths).toContain('email')
      expect(paths).toContain('age')
    }
  })

  it('add an adapter — registerAdapter + getSchema', () => {
    // --- snippet: register an adapter and emit a mongoose schema ---
    registerAdapter('mongo', toMongoSchema)

    const a = new Sapphire({ defaultAdapter: 'mongo' })

    const userSchema = a.object({
      name: a.string().min(1),
      email: a.string().email(),
      age: a.number().int().min(0).optional(),
    })

    const mongoSchema = userSchema.getSchema() as mongoose.Schema
    // mongoSchema is a real mongoose.Schema, ready for mongoose.model(...)
    // --- end snippet ---

    expect(mongoSchema).toBeInstanceOf(mongoose.Schema)
    expect(mongoSchema.path('name')).toBeDefined()
    expect(mongoSchema.path('email')).toBeDefined()
    expect(mongoSchema.path('age')).toBeDefined()
  })
})
