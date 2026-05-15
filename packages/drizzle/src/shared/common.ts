import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

/**
 * Context passed by dialect-specific table builders. Loose — each dialect has
 * its own `tables` registry shape and column builders aren't worth typing
 * precisely (drizzle-orm's column builder generics are notoriously complex).
 */
export interface ApplyCtx {
  options: {
    dialect: 'pg' | 'mysql' | 'sqlite'
    primaryKey?: string | false
    /** S2: when true, missing methods invoked by meta keys throw instead of
     *  being silently skipped. Useful as a typo guard in dev / CI. */
    strict?: boolean
  }
}

/**
 * Safely call a chain method on a Drizzle column builder. If the method does
 * not exist (e.g. `.references()` on a `text` column built without the FK
 * helper, or a dialect-specific method missing on another dialect), silently
 * skip — meta is best-effort.
 *
 * This variant is for **internal** Sapphire-controlled calls (default, notNull,
 * unique). For user-supplied `meta.drizzle.*` keys, use `callChainFromMeta`.
 */
function callChain(col: any, method: string, args: unknown): any {
  if (typeof col[method] !== 'function') return col
  if (args === true) return col[method]()
  if (Array.isArray(args)) return col[method](...args)
  return col[method](args)
}

/**
 * S2: invoked for user-supplied `meta.drizzle.*` keys. Adds a warning when the
 * method is missing on the column builder (typo guard) and an opt-in throw via
 * `ctx.options.strict`. Production stays silent unless strict is set.
 */
function callChainFromMeta(
  col: any,
  method: string,
  args: unknown,
  ctx: ApplyCtx,
  scope: 'top-level' | 'dialect',
): any {
  if (typeof col[method] !== 'function') {
    const where = scope === 'top-level' ? 'meta.drizzle' : `meta.drizzle.${ctx.options.dialect}`
    const msg = `drizzle adapter: method "${method}" is not available on this column type (${where}). Meta key silently dropped — verify the spelling and that the method exists on the column builder for this dialect.`
    if (ctx.options.strict) {
      throw new Error(msg)
    }
    // Avoid spamming production logs; warn in everything else.
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
      console.warn(msg)
    }
    return col
  }
  return callChain(col, method, args)
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
 * column type are warned about (typo guard) and skipped — or, with
 * `strict: true`, thrown.
 */
/**
 * Collects field-level `.index()` declarations from an object node's
 * properties. Drizzle models single-column indexes at the table level (the
 * third-arg callback of `xTable`), so the dialect builders call this and merge
 * the result with the composite `obj.indexes` list.
 *
 * `node.index === true` → a plain index; `node.index === { unique: true }` →
 * a unique index. The column-level `node.unique` constraint is separate and
 * handled by `applyCommon`.
 */
export function collectFieldIndexes(
  obj: Extract<SapphireSchemaNode, { kind: 'object' }>,
): Array<{ key: string; unique: boolean }> {
  const out: Array<{ key: string; unique: boolean }> = []
  for (const [key, child] of Object.entries(obj.properties)) {
    if (child.index === true) {
      out.push({ key, unique: false })
    } else if (child.index && typeof child.index === 'object') {
      out.push({ key, unique: child.index.unique === true })
    }
  }
  return out
}

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
      out = callChainFromMeta(out, k, v, ctx, 'top-level')
    }
    const dialectMeta = metaDz[ctx.options.dialect]
    if (dialectMeta && typeof dialectMeta === 'object' && !Array.isArray(dialectMeta)) {
      for (const [k, v] of Object.entries(dialectMeta as Record<string, unknown>)) {
        out = callChainFromMeta(out, k, v, ctx, 'dialect')
      }
    }
  }

  return out
}
