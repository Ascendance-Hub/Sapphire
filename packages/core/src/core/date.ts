import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type DateConfig = {
  required: boolean
}

export class DateField<IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: DateConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'date', required: this.config.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): DateField<true> {
    return new DateField<true>(this.defaultOrm, { ...this.config, required: false })
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
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
