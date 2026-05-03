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
    if (this.map.has(name)) {
      throw new Error(`Schema name "${name}" already registered in this Sapphire instance`)
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
