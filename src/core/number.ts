import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type NumberConfig = {
  required: boolean
}

export class NumberField<IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: NumberConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'number', required: this.config.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): NumberField<true> {
    return new NumberField<true>(this.defaultOrm, { ...this.config, required: false })
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'number') {
      return { value, error: 'Expected number' }
    }
    return { value }
  }
}
