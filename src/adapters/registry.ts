import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'
import { toMongoSchema } from './mongo'

export type SchemaAdapter = (node: SapphireSchemaNode) => any

export const adapterRegistry: Record<ORM, SchemaAdapter> = {
  [ORM.MONGO]: toMongoSchema,
}

export function resolveSchema(
  node: SapphireSchemaNode,
  orm: ORM | undefined,
  defaultOrm: ORM | undefined,
): any {
  const target = orm ?? defaultOrm
  if (!target) {
    throw new Error('No ORM specified. Pass an ORM to getSchema(orm) or set defaultOrm on the Sapphire instance.')
  }
  const adapter = adapterRegistry[target]
  if (!adapter) {
    throw new Error(`Unsupported ORM: ${target}`)
  }
  return adapter(node)
}
