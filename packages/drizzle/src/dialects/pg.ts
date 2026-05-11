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
import { applyCommon } from '../shared/common'
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
      const pkName =
        ctx.options.primaryKey === false
          ? 'id'
          : typeof ctx.options.primaryKey === 'string'
            ? ctx.options.primaryKey
            : 'id'
      col = integer(name).references((): any => {
        const target = ctx.tables.get(targetName)
        if (!target) {
          throw new Error(
            `drizzle adapter: ref target table "${targetName}" not registered. Emit it before invoking queries that traverse this reference.`,
          )
        }
        return (target as any)[pkName]
      })
      break
    }
    default: {
      // Exhaustiveness guard.
      const _exhaustive: never = node
      throw new Error(`pgColumn: unhandled node kind ${(node as any).kind} (${_exhaustive})`)
    }
  }
  return applyCommon(col, node, ctx)
}

export function buildTable(node: SapphireSchemaNode, ctx: Ctx): any {
  if (node.kind !== 'object') {
    throw new Error('pg.buildTable: expected ObjectField at root')
  }
  const obj = node as ObjectNode
  const cols: Record<string, any> = {}

  if (ctx.options.primaryKey !== false) {
    const pkName = typeof ctx.options.primaryKey === 'string' ? ctx.options.primaryKey : 'id'
    cols[pkName] = serial(pkName).primaryKey()
  }

  for (const [key, child] of Object.entries(obj.properties)) {
    cols[key] = pgColumn(key, child, ctx)
  }

  // Composite indexes/uniques declared on the schema (`objectField.index(keys, opts)`)
  // are emitted via the third-arg callback of `pgTable`. We use the **array** form
  // (the object form is deprecated in drizzle-orm). Index names follow the
  // pattern `<tableName>_idx_<i>` to stay stable & unique within the table.
  const idxList = obj.indexes ?? []
  const table =
    idxList.length > 0
      ? pgTable(ctx.tableName, cols, (t: any) => {
          return idxList.map((idx, i) => {
            const idxName = `${ctx.tableName}_idx_${i}`
            const idxCols = idx.keys.map((k) => t[k]) as [any, ...any[]]
            return idx.unique ? uniqueIndex(idxName).on(...idxCols) : index(idxName).on(...idxCols)
          })
        })
      : pgTable(ctx.tableName, cols)
  ctx.tables.set(obj.name ?? ctx.tableName, table)
  return table
}
