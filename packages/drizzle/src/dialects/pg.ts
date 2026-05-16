import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  serial,
  uuid as pgUuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { applyCommon, collectFieldIndexes } from '../shared/common'
import type { DrizzleAdapterOptions } from '../index'
import type { DrizzleTableRegistry } from '../registry'

type ObjectNode = Extract<SapphireSchemaNode, { kind: 'object' }>

export interface Ctx {
  options: DrizzleAdapterOptions
  tables: DrizzleTableRegistry
  tableName: string
}

/**
 * Build a single Postgres column from a Sapphire IR node.
 *
 * Notes for future dispatches (D refs / E indexes):
 *  - Drizzle exposes runtime column metadata as plain properties: `.name`,
 *    `.dataType` (semantic: 'string'|'number'|'boolean'|'date'|'json'),
 *    `.columnType` (concrete: 'PgText'|'PgJsonb'|...), `.notNull`,
 *    `.hasDefault`, `.default`, `.isUnique`, `.uniqueName`, `.primary`.
 *    `Object.keys(column)` works — no symbol drilling needed.
 *  - JSONB columns surface `.dataType === 'json'` (NOT 'jsonb'), while
 *    `.columnType === 'PgJsonb'`.
 */
function pgColumn(name: string, node: SapphireSchemaNode, ctx: Ctx): any {
  let col: any
  switch (node.kind) {
    case 'string': {
      col = (node as any).format === 'uuid' ? pgUuid(name) : text(name)
      break
    }
    case 'number': {
      col = (node as any).int ? integer(name) : doublePrecision(name)
      break
    }
    case 'boolean': {
      col = boolean(name)
      break
    }
    case 'date': {
      col = timestamp(name, { withTimezone: true, mode: 'date' })
      break
    }
    case 'literal': {
      // Single-value scalar — emit as text and let runtime parse enforce.
      col = text(name)
      break
    }
    case 'enum': {
      // pgEnum is opt-in via meta (F15 recipe). Default: text + runtime
      // validation in safeParse.
      col = text(name)
      break
    }
    case 'array':
    case 'tuple':
    case 'union':
    case 'record':
    case 'object': {
      col = jsonb(name)
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
      throw new Error(`pgColumn: unhandled node kind ${(node as any).kind} (${_exhaustive})`)
    }
    /* v8 ignore stop */
  }
  return applyCommon(col, node, ctx)
}

export function buildTable(node: SapphireSchemaNode, ctx: Ctx): any {
  /* v8 ignore next 3 -- defensive: toDrizzleSchema already rejects non-object roots */
  if (node.kind !== 'object') {
    throw new Error('pg.buildTable: expected ObjectField at root')
  }
  const obj = node as ObjectNode
  const cols: Record<string, any> = {}

  // Resolve the implicit primary-key column name (null when disabled).
  const pkName =
    ctx.options.primaryKey === false
      ? null
      : typeof ctx.options.primaryKey === 'string'
        ? ctx.options.primaryKey
        : 'id'
  // season-five B2: when the schema declares its own field at the PK name,
  // that field IS the primary key — promote it with `.primaryKey()` rather
  // than emitting a separate `serial` column that the property loop below
  // would silently overwrite, leaving the table with no PK at all.
  const pkIsUserDeclared = pkName !== null && pkName in obj.properties
  if (pkName !== null && !pkIsUserDeclared) {
    cols[pkName] = serial(pkName).primaryKey()
  }

  for (const [key, child] of Object.entries(obj.properties)) {
    const col = pgColumn(key, child, ctx)
    cols[key] = key === pkName ? col.primaryKey() : col
  }

  // Composite indexes/uniques declared on the schema (`objectField.index(keys, opts)`)
  // are emitted via the third-arg callback of `pgTable`. We use the **array** form
  // (the object form is deprecated in drizzle-orm). Index names follow the
  // pattern `<tableName>_idx_<i>` to stay stable & unique within the table.
  // Field-level `.index()` declarations are merged in as single-column indexes.
  const idxList = obj.indexes ?? []
  const fieldIdx = collectFieldIndexes(obj)
  const table =
    idxList.length > 0 || fieldIdx.length > 0
      ? pgTable(ctx.tableName, cols, (t: any) => {
          const composite = idxList.map((idx, i) => {
            const idxName = `${ctx.tableName}_idx_${i}`
            const idxCols = idx.keys.map((k) => t[k]) as [any, ...any[]]
            return idx.unique ? uniqueIndex(idxName).on(...idxCols) : index(idxName).on(...idxCols)
          })
          const perField = fieldIdx.map(({ key, unique }) => {
            const idxName = `${ctx.tableName}_${key}_idx`
            return unique ? uniqueIndex(idxName).on(t[key]) : index(idxName).on(t[key])
          })
          return [...composite, ...perField]
        })
      : pgTable(ctx.tableName, cols)
  ctx.tables.set(obj.name ?? ctx.tableName, table, pkName)
  return table
}
