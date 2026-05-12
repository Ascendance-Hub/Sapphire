/**
 * Per-Sapphire-instance registry of named ObjectFields.
 * Populated by `ObjectField.name(string)`. Read by `a.ref(SchemaObj)` to
 * extract the target name.
 *
 * Throws on duplicate names within an instance — schemas are unique per
 * Sapphire registry, not globally.
 */

export class NamedSchemaRegistry {
  private readonly map = new Map<string, unknown>()

  register(name: string, schema: unknown): void {
    // S3: idempotent on identical reference. Throwing on every duplicate was
    // too strict — re-registering the same field instance (e.g. when the
    // same module is re-evaluated in HMR / tests) should be a no-op. Only
    // a *different* field instance under an existing name is a collision.
    const existing = this.map.get(name)
    if (existing !== undefined && existing !== schema) {
      throw new Error(
        `Schema name "${name}" already registered in this Sapphire instance with a different field instance`,
      )
    }
    this.map.set(name, schema)
  }

  get(name: string): unknown {
    return this.map.get(name)
  }

  has(name: string): boolean {
    return this.map.has(name)
  }

  list(): string[] {
    return [...this.map.keys()]
  }
}
