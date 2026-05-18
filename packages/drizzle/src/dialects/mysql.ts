import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import {
  mysqlTable,
  varchar,
  int,
  double,
  boolean,
  datetime,
  json,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/mysql-core'
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
 * Build a single MySQL column from a Sapphire IR node.
 *
 * Runtime column-type names (drizzle-orm ^0.45.2 mysql-core):
 *   varchar  → MySqlVarChar (dataType 'string',  exposes `.length`)
 *   int      → MySqlInt     (dataType 'number')
 *   double   → MySqlDouble  (dataType 'number')
 *   boolean  → MySqlBoolean (dataType 'boolean')
 *   datetime → MySqlDateTime(dataType 'date')
 *   json     → MySqlJson    (dataType 'json')
 *   serial   → MySqlSerial  (dataType 'number', used for implicit PK)
 *
 * Notes:
 *  - MySQL `varchar` requires `length`. We use IR `maxLength` when present,
 *    otherwise default to 255 (documented in the README).
 *  - `string` with `format='uuid'` maps to `varchar(name, { length: 36 })` —
 *    MySQL has no native UUID type; storing as char-ish varchar(36) is the
 *    conventional choice. (Users may opt-in to `binary(16)` via meta.)
 *  - `literal` / `enum` map to `varchar(length: 255)`. `mysqlEnum` exists but
 *    requires explicit opt-in via meta — out of scope for dispatch F.
 *  - Composite kinds (array/tuple/union/record/nested object) all fall back to
 *    `json(name)` — runtime validation lives in the core `safeParse`.
 */
function mysqlColumn(name: string, node: SapphireSchemaNode, ctx: Ctx): any {
  let col: any
  switch (node.kind) {
    case 'string': {
      const fmt = (node as any).format as string | undefined
      if (fmt === 'uuid') {
        col = varchar(name, { length: 36 })
      } else {
        const len = (node as any).maxLength ?? 255
        col = varchar(name, { length: len })
      }
      break
    }
    case 'number': {
      col = (node as any).int ? int(name) : double(name)
      break
    }
    case 'boolean': {
      col = boolean(name)
      break
    }
    case 'date': {
      // `fsp` (fractional seconds) left at default; users wanting millisecond
      // precision can override via meta `{ mysql: {...} }`.
      col = datetime(name, { mode: 'date' })
      break
    }
    case 'literal': {
      col = varchar(name, { length: 255 })
      break
    }
    case 'enum': {
      // mysqlEnum exists but requires explicit opt-in via meta (F15 recipe).
      // Default: varchar(255) + runtime validation in safeParse.
      col = varchar(name, { length: 255 })
      break
    }
    case 'array':
    case 'tuple':
    case 'union':
    case 'record':
    case 'object': {
      col = json(name)
      break
    }
    case 'ref': {
      const targetName = (node as any).target as string
      col = int(name).references((): any => {
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
      throw new Error(`mysqlColumn: unhandled node kind ${(node as any).kind} (${_exhaustive})`)
    }
    /* v8 ignore stop */
  }
  return applyCommon(col, node, ctx)
}

export function buildTable(node: SapphireSchemaNode, ctx: Ctx): any {
  /* v8 ignore next 3 -- defensive: toDrizzleSchema already rejects non-object roots */
  if (node.kind !== 'object') {
    throw new Error('mysql.buildTable: expected ObjectField at root')
  }
  const obj = node as ObjectNode
  const cols: Record<string, any> = {}

  // Resolve the primary key: single implicit/named column, or composite.
  const { pkName, compositePk } = resolvePrimaryKey(ctx.options.primaryKey, obj.properties)
  // season-five B2: when the schema declares its own field at the PK name,
  // that field IS the primary key — promote it with `.primaryKey()` rather
  // than emitting a separate `serial` column that the property loop below
  // would silently overwrite, leaving the table with no PK at all.
  const pkIsUserDeclared = pkName !== null && pkName in obj.properties
  if (pkName !== null && !pkIsUserDeclared) {
    // `int().autoincrement()` — NOT `serial`. `serial` in mysql-core is
    // `bigint unsigned`, which mismatches the `int` type of `ref` FK columns
    // and breaks foreign keys into implicit-PK tables (MySQL errno 150).
    // Plain `int` keeps the implicit PK and ref columns type-compatible.
    cols[pkName] = int(pkName).autoincrement().primaryKey()
  }

  for (const [key, child] of Object.entries(obj.properties)) {
    const col = mysqlColumn(key, child, ctx)
    cols[key] = key === pkName ? col.primaryKey() : col
  }

  // Composite indexes/uniques declared on the schema (`objectField.index(keys, opts)`)
  // emit via the third-arg callback of `mysqlTable`, array form. Index names
  // follow `<tableName>_idx_<i>` (stable, unique within table).
  const idxList = obj.indexes ?? []
  const fieldIdx = collectFieldIndexes(obj)
  const table =
    idxList.length > 0 || fieldIdx.length > 0 || compositePk !== null
      ? mysqlTable(ctx.tableName, cols, (t: any) => {
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
      : mysqlTable(ctx.tableName, cols)
  ctx.tables.set(obj.name ?? ctx.tableName, table, pkName, compositePk ?? undefined)
  return table
}
