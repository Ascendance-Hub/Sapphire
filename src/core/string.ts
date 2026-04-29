import { Field, ValidationResult } from '../interfaces/field'
import { ORM } from '../types'

export class StringField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly orm: ORM) {}
  private required: boolean = true
  private minLength?: number

  getSchema() {
    if (this.orm === ORM.MONGO) {
      const schema: Record<string, any> = { type: String, required: this.required }
      if (this.minLength !== undefined) schema.minLength = this.minLength
      return schema
    }
    throw new Error('not supported ORM')
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
