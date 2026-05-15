import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export interface MongoValidatorOptions {
  /** Sets `additionalProperties` on every emitted object schema. Omitted when undefined. */
  additionalProperties?: boolean
}

export interface MongoValidator {
  $jsonSchema: Record<string, unknown>
}

export function toMongoValidator(
  _node: SapphireSchemaNode,
  _options: MongoValidatorOptions = {},
): MongoValidator {
  throw new Error('not implemented')
}
