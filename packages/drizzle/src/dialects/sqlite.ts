import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { applyCommon, collectFieldIndexes, resolvePrimaryKey } from '../shared/common'
import type { DrizzleAdapterOptions } from '../index'
import type { DrizzleTableRegistry } from '../registry'

type ObjectNode = Extract<SapphireSchemaNode, { kind: 'object' }>

export interface Ctx {
  options: DrizzleAdapterOptions
  tables: DrizzleTableRegistry
  tableName: string
}

/**
 * Build a single SQLite column from a Sapphire IR node.
 *
 * Runtime column-type names (drizzle-orm ^0.45.2 sqlite-core), verified
 * empirically:
 *   text                                 → SQLiteText      (dataType 'string')
 *   integer                              → SQLiteInteger   (dataType 'number')
 *   real                                 → SQLiteReal      (dataType 'number')
 *   integer({ mode: 'boolean' })         → SQLiteBoolean   (dataType 'boolean', `.mode === 'boolean'`)
 *   integer({ mode: 'timestamp' })       → SQLiteTimestamp (dataType 'date',    `.mode === 'timestamp'`)
 *   text({ mode: 'json' })               → SQLiteTextJson  (dataType 'json')
 *   integer().primaryKey({ autoIncrement: true })
 *     → SQLiteInteger with `.primary === true` and `.autoIncrement === true`
 *
 * Notes:
 *  - SQLite has no native boolean nor uuid nor timestamp; Drizzle emulates them
 *    via `integer` with `mode` (boolean/timestamp/timestamp_ms) or via plain
 *    `text` (uuid stays text). Documented in README.
 *  - Composite kinds (array/tuple/union/record/nested object) fall back to
 *    `text({ mode: 'json' })` — runtime validation lives in the core `safeParse`.
 *  - PK option spelling is camelCase `autoIncrement` in 0.45.2 (verified).
 */
function sqliteColumn(name: string, node: SapphireSchemaNode, ctx: Ctx): any {
  let col: any
  switch (node.kind) {
    case 'string': {
      // SQLite has no native uuid — keep as text regardless of format.
      col = text(name)
      break
    }
    case 'number': {
      col = (node as any).int ? integer(name) : real(name)
      break
    }
    case 'boolean': {
      col = integer(name, { mode: 'boolean' })
      break
    }
    case 'date': {
      // Stored as unix-seconds integer; users wanting unix-ms can override
      // via meta `{ sqlite: {...} }` (out of scope here).
      col = integer(name, { mode: 'timestamp' })
      break
    }
    case 'literal': {
      col = text(name)
      break
    }
    case 'enum': {
      // Plain text — runtime validation in safeParse.
      col = text(name)
      break
    }
    case 'array':
    case 'tuple':
    case 'union':
    case 'record':
    case 'object': {
      col = text(name, { mode: 'json' })
      break
    }
    case 'ref': {
      const targetName = (node as any).target as string
      col = integer(name).references((): any => {
        const entry = ctx.tables.get(targetName)
        if (!entry) {
          throw new Error(
            `drizzle adapter: ref target table "${targetName}" not registered. Emit it before invoking queries that traverse this reference.`,
          )
        }
        if (entry.pkName === null) {
          if (entry.compositePk) {
            throw new Error(
              `drizzle adapter: ref target "${targetName}" has a composite primary key (${entry.compositePk.join(', ')}) — a single-column ref cannot point at it.`,
            )
          }
          throw new Error(
            `drizzle adapter: ref target "${targetName}" was emitted with primaryKey: false — refs require a target PK column. Re-emit "${targetName}" with primaryKey: '<colName>' or use the default implicit PK.`,
          )
        }
        return (entry.table as any)[entry.pkName]
      })
      break
    }
    /* v8 ignore start -- exhaustiveness guard: unreachable while the IR union
       is exhaustively handled above; TypeScript's `never` enforces it. */
    default: {
      const _exhaustive: never = node
      throw new Error(`sqliteColumn: unhandled node kind ${(node as any).kind} (${_exhaustive})`)
    }
    /* v8 ignore stop */
  }
  return applyCommon(col, node, ctx)
}

export function buildTable(node: SapphireSchemaNode, ctx: Ctx): any {
  /* v8 ignore next 3 -- defensive: toDrizzleSchema already rejects non-object roots */
  if (node.kind !== 'object') {
    throw new Error('sqlite.buildTable: expected ObjectField at root')
  }
  const obj = node as ObjectNode
  const cols: Record<string, any> = {}

  // Resolve the primary key: single implicit/named column, or composite.
  const { pkName, compositePk } = resolvePrimaryKey(ctx.options.primaryKey, obj.properties)
  // season-five B2: when the schema declares its own field at the PK name,
  // that field IS the primary key — promote it with `.primaryKey()` rather
  // than emitting a separate `integer` column that the property loop below
  // would silently overwrite, leaving the table with no PK at all.
  const pkIsUserDeclared = pkName !== null && pkName in obj.properties
  if (pkName !== null && !pkIsUserDeclared) {
    // SQLite implicit PK: `integer(pk).primaryKey({ autoIncrement: true })` —
    // canonical autoincrement rowid alias (option spelling is camelCase in 0.45.2).
    cols[pkName] = integer(pkName).primaryKey({ autoIncrement: true })
  }

  for (const [key, child] of Object.entries(obj.properties)) {
    const col = sqliteColumn(key, child, ctx)
    cols[key] = key === pkName ? col.primaryKey() : col
  }

  // Composite indexes/uniques declared on the schema (`objectField.index(keys, opts)`)
  // emit via the third-arg callback of `sqliteTable`, array form. Index names
  // follow `<tableName>_idx_<i>` (stable, unique within table).
  const idxList = obj.indexes ?? []
  const fieldIdx = collectFieldIndexes(obj)
  const table =
    idxList.length > 0 || fieldIdx.length > 0 || compositePk !== null
      ? sqliteTable(ctx.tableName, cols, (t: any) => {
          const composite = idxList.map((idx, i) => {
            const idxName = `${ctx.tableName}_idx_${i}`
            const idxCols = idx.keys.map((k) => t[k]) as [any, ...any[]]
            return idx.unique ? uniqueIndex(idxName).on(...idxCols) : index(idxName).on(...idxCols)
          })
          const perField = fieldIdx.map(({ key, unique }) => {
            const idxName = `${ctx.tableName}_${key}_idx`
            return unique ? uniqueIndex(idxName).on(t[key]) : index(idxName).on(t[key])
          })
          const pk = compositePk
            ? [primaryKey({ columns: compositePk.map((k) => t[k]) as [any, ...any[]] })]
            : []
          return [...pk, ...composite, ...perField]
        })
      : sqliteTable(ctx.tableName, cols)
  ctx.tables.set(obj.name ?? ctx.tableName, table, pkName, compositePk ?? undefined)
  return table
}
