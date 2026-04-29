import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export class StringField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly defaultOrm?: ORM) {}
  private required: boolean = true
  private minLength?: number

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'string',
      required: this.required,
      ...(this.minLength !== undefined ? { minLength: this.minLength } : {}),
    }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): StringField<true> {
    this.required = false
    return this as unknown as StringField<true>
  }

  min(value: number): StringField<IsOptional> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('min must be a non-negative number')
    }
    this.minLength = value
    return this
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'string') {
      return { value, error: 'Expected string' }
    }
    if (this.minLength !== undefined && value.length < this.minLength) {
      return { value, error: `String must have at least ${this.minLength} characters` }
    }
    return { value }
  }
}
