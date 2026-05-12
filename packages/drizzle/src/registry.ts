/**
 * Registry of generated Drizzle tables, keyed by Sapphire schema name.
 *
 * Used by the adapter to resolve `kind: 'ref'` foreign keys lazily — Drizzle
 * requires the `references(() => target.column)` callback because the target
 * table may not be declared yet (forward refs / cycles).
 *
 * Each entry carries the table **and** the name of its primary-key column, so
 * `ref` callbacks can point at the actual PK rather than assuming `'id'`. When
 * the target was emitted with `primaryKey: false`, `pkName` is `null` and the
 * ref callback throws with a clear error rather than dereferencing undefined.
 *
 * `set` is idempotent (overwrites are allowed) so that re-emitting a schema
 * during iteration does not throw.
 */
export interface DrizzleTableEntry {
  table: unknown
  /** PK column name, or `null` if the target was emitted with `primaryKey: false`. */
  pkName: string | null
}

export class DrizzleTableRegistry {
  private readonly map = new Map<string, DrizzleTableEntry>()

  set(name: string, table: unknown, pkName: string | null): void {
    this.map.set(name, { table, pkName })
  }

  get(name: string): DrizzleTableEntry | undefined {
    return this.map.get(name)
  }

  has(name: string): boolean {
    return this.map.has(name)
  }
}
