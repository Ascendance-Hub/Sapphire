import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { DrizzleTableRegistry } from './registry'
import * as pg from './dialects/pg'
import * as mysql from './dialects/mysql'
import * as sqlite from './dialects/sqlite'

export { DrizzleTableRegistry } from './registry'

export type DrizzleDialect = 'pg' | 'mysql' | 'sqlite'

export interface DrizzleAdapterOptions<D extends DrizzleDialect = DrizzleDialect> {
  /** Target dialect. Required. */
  dialect: D
  /** Table name. Defaults to `node.name` when present; otherwise throws. */
  tableName?: string
  /**
   * Name of the implicit primary key column. Defaults to `'id'`. Pass `false`
   * to disable the implicit PK (you manage it yourself via meta).
   */
  primaryKey?: string | false
  /**
   * Registry of already-built tables, used to resolve refs across multiple
   * `toDrizzleSchema` calls. Pass the same instance when emitting related
   * schemas.
   */
  tables?: DrizzleTableRegistry
  /**
   * S2: when true, `meta.drizzle.*` keys that name a method missing on the
   * resolved column builder will **throw** instead of being silently dropped.
   * Use this in dev / CI as a typo guard. In non-strict mode (default), a
   * warning is logged outside production (`NODE_ENV !== 'production'`).
   */
  strict?: boolean
}

// Overloads — return type is conditional on the dialect literal. The exact
// `PgTableWithColumns<any>` / `MySqlTableWithColumns<any>` / `SQLiteTableWithColumns<any>`
// type names are not consistently exported across drizzle-orm versions; use
// the broad `ReturnType<typeof xTable>` shape via `any` for the stub. Dispatch
// H tightens these via `.test-d.ts` and proper imports.
export function toDrizzleSchema(node: SapphireSchemaNode, options: DrizzleAdapterOptions<'pg'>): any
export function toDrizzleSchema(
  node: SapphireSchemaNode,
  options: DrizzleAdapterOptions<'mysql'>,
): any
export function toDrizzleSchema(
  node: SapphireSchemaNode,
  options: DrizzleAdapterOptions<'sqlite'>,
): any
export function toDrizzleSchema(node: SapphireSchemaNode, options: DrizzleAdapterOptions): unknown
export function toDrizzleSchema(
  node: SapphireSchemaNode,
  options?: DrizzleAdapterOptions,
): unknown {
  // B1: when invoked via `getSchema('drizzle')` the registry forwards `options`
  // verbatim — including `undefined`. Surface a clear error instead of a generic
  // "Cannot read properties of undefined".
  if (!options || typeof options !== 'object') {
    throw new Error(
      'toDrizzleSchema: options.dialect is required. ' +
        "Use `schema.getSchema('drizzle', { dialect: 'pg' })` or call the adapter directly.",
    )
  }
  if (!('dialect' in options) || !options.dialect) {
    throw new Error("toDrizzleSchema: options.dialect is required ('pg' | 'mysql' | 'sqlite').")
  }
  if (node.kind !== 'object') {
    throw new Error(
      'toDrizzleSchema: root node must be ObjectField (Drizzle adapter only emits tables)',
    )
  }
  const tableName = options.tableName ?? (node as any).name
  if (!tableName) {
    throw new Error(
      'toDrizzleSchema: table name required — pass options.tableName or call .name() on the ObjectField',
    )
  }
  const ctx = {
    options,
    tables: options.tables ?? new DrizzleTableRegistry(),
    tableName,
  }
  switch (options.dialect) {
    case 'pg':
      return pg.buildTable(node, ctx)
    case 'mysql':
      return mysql.buildTable(node, ctx)
    case 'sqlite':
      return sqlite.buildTable(node, ctx)
    default:
      throw new Error(`toDrizzleSchema: unknown dialect "${(options as any).dialect}"`)
  }
}
