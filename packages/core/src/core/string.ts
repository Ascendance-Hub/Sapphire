import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type StringConfig = {
  required: boolean
  minLength?: number
}

export class StringField<IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: StringConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'string',
      required: this.config.required,
      ...(this.config.minLength !== undefined ? { minLength: this.config.minLength } : {}),
    }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): StringField<true> {
    return new StringField<true>(this.defaultOrm, { ...this.config, required: false })
  }

  min(value: number): StringField<IsOptional> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('min must be a non-negative number')
    }
    return new StringField<IsOptional>(this.defaultOrm, { ...this.config, minLength: value })
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'string') {
      return { value, error: 'Expected string' }
    }
    if (this.config.minLength !== undefined && value.length < this.config.minLength) {
      return { value, error: `String must have at least ${this.config.minLength} characters` }
    }
    return { value }
  }
}
