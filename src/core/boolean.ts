import { Field, ValidationResult } from '../interfaces/field'
import { ORM } from '../types'

export class BooleanField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly orm: ORM) {}
  private required: boolean = true

  getSchema() {
    if (this.orm === ORM.MONGO) {
      return { type: Boolean, required: this.required }
    }
    throw new Error('not supported ORM')
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
