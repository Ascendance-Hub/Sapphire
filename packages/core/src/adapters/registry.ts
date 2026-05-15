import { SapphireSchemaNode } from '../schema/types'

export type SchemaAdapter = (node: SapphireSchemaNode, options?: unknown) => unknown

export const adapterRegistry: Map<string, SchemaAdapter> = new Map()

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
