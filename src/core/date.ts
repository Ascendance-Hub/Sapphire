import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export class DateField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly defaultOrm?: ORM) {}
  private required: boolean = true

  toSchema(): SapphireSchemaNode {
    return { kind: 'date', required: this.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): DateField<true> {
    this.required = false
    return this as unknown as DateField<true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (!(value instanceof Date) && typeof value !== 'string') {
      return { value, error: 'Expected date or date string' }
    }
    if (typeof value === 'string') {
      const d = new Date(value)
      if (isNaN(d.getTime())) return { value, error: 'Invalid date string' }
      return { value: d }
    }
    return { value }
  }
}
