/**
 * Registry of generated Drizzle tables, keyed by Sapphire schema name.
 *
 * Used by the adapter to resolve `kind: 'ref'` foreign keys lazily — Drizzle
 * requires the `references(() => target.column)` callback because the target
 * table may not be declared yet (forward refs / cycles).
 *
 * `set` is idempotent (overwrites are allowed) so that re-emitting a schema
 * during iteration does not throw.
 */
export class DrizzleTableRegistry {
  private readonly map = new Map<string, unknown>()

  set(name: string, table: unknown): void {
    this.map.set(name, table)
  }

  get(name: string): unknown | undefined {
    return this.map.get(name)
  }

  has(name: string): boolean {
    return this.map.has(name)
  }
}
