import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export interface ValidationResult {
  value: any
  error?: string
}

export interface Field {
  toSchema(): SapphireSchemaNode
  getSchema(orm?: ORM): any
  validate(value: any): ValidationResult
}
