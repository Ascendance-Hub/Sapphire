import { SapphireSchemaNode } from '../schema/types'

/**
 * An adapter is a pure function from the IR to some ORM-specific output. The
 * `options` parameter is intentionally `any`: each adapter declares its own
 * concrete options type (`MongoAdapterOptions`, `JsonSchemaAdapterOptions`,
 * etc.), and `any` lets those typed functions register without a cast. The
 * registry treats `options` opaquely and forwards whatever `getSchema` passed.
 */
export type SchemaAdapter = (node: SapphireSchemaNode, options?: any) => unknown

/**
 * The adapter registry is **process-global** — a single `Map` shared by every
 * `Sapphire` instance in the process. This is intentional (S1): the set of
 * adapters is a startup-time concern, not a per-instance one. Register every
 * adapter you need once, at application startup, before any `getSchema(name)`
 * call. Adapters coexist under distinct names — registering one never blocks
 * another, so a multi-database app registers `'mongoose'`, `'drizzle'`, etc.
 * side by side and emits all of them from one schema definition.
 */
export const adapterRegistry: Map<string, SchemaAdapter> = new Map()

/**
 * Wires an adapter function to a name in the process-global registry, making
 * it reachable via `field.getSchema(name)`. Call once per adapter at startup.
 */
export function registerAdapter(name: string, adapter: SchemaAdapter): void {
  adapterRegistry.set(name, adapter)
}

export function unregisterAdapter(name: string): void {
  adapterRegistry.delete(name)
}

export function getAdapter(name: string): SchemaAdapter | undefined {
  return adapterRegistry.get(name)
}

export function listAdapters(): string[] {
  return Array.from(adapterRegistry.keys())
}

export function resolveSchema(
  node: SapphireSchemaNode,
  name: string | undefined,
  defaultAdapter: string | undefined,
  options?: unknown,
): unknown {
  const target = name ?? defaultAdapter
  if (!target) {
    throw new Error(
      'No adapter specified. Pass a name to getSchema(name) or set defaultAdapter on the Sapphire instance.',
    )
  }
  const adapter = adapterRegistry.get(target)
  if (!adapter) {
    throw new Error(
      `No adapter named "${target}". Registered: ${listAdapters().join(', ') || '<none>'}`,
    )
  }
  return adapter(node, options)
}
