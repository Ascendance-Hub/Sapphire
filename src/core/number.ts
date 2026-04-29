import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export class NumberField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly defaultOrm?: ORM) {}
  private required: boolean = true

  toSchema(): SapphireSchemaNode {
    return { kind: 'number', required: this.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): NumberField<true> {
    this.required = false
    return this as unknown as NumberField<true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'number') {
      return { value, error: 'Expected number' }
    }
    return { value }
  }
}
