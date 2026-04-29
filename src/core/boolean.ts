import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type BooleanConfig = {
  required: boolean
}

export class BooleanField<IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: BooleanConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'boolean', required: this.config.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): BooleanField<true> {
    return new BooleanField<true>(this.defaultOrm, { ...this.config, required: false })
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'boolean') {
      return { value, error: 'Expected boolean' }
    }
    return { value }
  }
}
