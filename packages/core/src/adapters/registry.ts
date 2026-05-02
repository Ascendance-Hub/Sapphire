import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export type SchemaAdapter = (node: SapphireSchemaNode) => any

export const adapterRegistry: Map<ORM, SchemaAdapter> = new Map()

export function registerAdapter(orm: ORM, adapter: SchemaAdapter): void {
  adapterRegistry.set(orm, adapter)
}

export function unregisterAdapter(orm: ORM): void {
  adapterRegistry.delete(orm)
}

export function getAdapter(orm: ORM): SchemaAdapter | undefined {
  return adapterRegistry.get(orm)
}

export function resolveSchema(
  node: SapphireSchemaNode,
  orm: ORM | undefined,
  defaultOrm: ORM | undefined,
): any {
  const target = orm ?? defaultOrm
  if (!target) {
    throw new Error(
      'No ORM specified. Pass an ORM to getSchema(orm) or set defaultOrm on the Sapphire instance.',
    )
  }
  const adapter = adapterRegistry.get(target)
  if (!adapter) {
    throw new Error(
      `No adapter registered for ORM "${target}". Did you forget to import "@ascendance-hub/sapphire-${target}"?`,
    )
  }
  return adapter(node)
}
