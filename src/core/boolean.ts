import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export class BooleanField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly defaultOrm?: ORM) {}
  private required: boolean = true

  toSchema(): SapphireSchemaNode {
    return { kind: 'boolean', required: this.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): BooleanField<true> {
    this.required = false
    return this as unknown as BooleanField<true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'boolean') {
      return { value, error: 'Expected boolean' }
    }
    return { value }
  }
}
