import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

/**
 * Context passed by dialect-specific table builders. Loose — each dialect has
 * its own `tables` registry shape and column builders aren't worth typing
 * precisely (drizzle-orm's column builder generics are notoriously complex).
 */
export interface ApplyCtx {
  options: { dialect: 'pg' | 'mysql' | 'sqlite'; primaryKey?: string | false }
}

/**
 * Safely call a chain method on a Drizzle column builder. If the method does
 * not exist (e.g. `.references()` on a `text` column built without the FK
 * helper, or a dialect-specific method missing on another dialect), silently
 * skip — meta is best-effort.
 */
function callChain(col: any, method: string, args: unknown): any {
  if (typeof col[method] !== 'function') return col
  if (args === true) return col[method]()
  if (Array.isArray(args)) return col[method](...args)
  return col[method](args)
}

/**
 * Apply universal column modifiers to a Drizzle column builder.
 *
 * Order matters slightly — defaults first so subsequent modifiers (notNull,
 * unique) chain on the result. Each Drizzle method call returns a new builder.
 *
 * Reads two escape-hatch buckets from `node.meta?.drizzle`:
 *  - top-level keys (`{ drizzle: { unique: true } }`) applied for every dialect.
 *  - dialect sub-key (`{ drizzle: { pg: { array: true } } }`) applied only when
 *    `ctx.options.dialect` matches.
 *
 * Meta values may be `true` (call with no args), an array (spread as args), or
 * any other value (passed as the single argument). Methods missing on the
 * column type are silently skipped.
 */
export function applyCommon(col: any, node: SapphireSchemaNode, ctx: ApplyCtx): any {
  let out = col
  if (node.default !== undefined) {
    out = callChain(out, 'default', node.default)
  }
  if (node.required && !node.nullable) {
    out = callChain(out, 'notNull', true)
  }
  if (node.unique) {
    out = callChain(out, 'unique', true)
  }

  const metaDz = (node.meta?.drizzle ?? undefined) as Record<string, unknown> | undefined
  if (metaDz) {
    for (const [k, v] of Object.entries(metaDz)) {
      // Dialect sub-keys are handled below; skip them here.
      if (k === 'pg' || k === 'mysql' || k === 'sqlite') continue
      out = callChain(out, k, v)
    }
    const dialectMeta = metaDz[ctx.options.dialect]
    if (dialectMeta && typeof dialectMeta === 'object' && !Array.isArray(dialectMeta)) {
      for (const [k, v] of Object.entries(dialectMeta as Record<string, unknown>)) {
        out = callChain(out, k, v)
      }
    }
  }

  return out
}
