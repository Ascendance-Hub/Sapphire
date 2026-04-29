import { Field, ValidationResult } from '../interfaces/field'
import { ORM } from '../types'

export class NumberField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly orm: ORM) {}
  private required: boolean = true

  getSchema() {
    if (this.orm === ORM.MONGO) {
      return { type: Number, required: this.required }
    }
    throw new Error('not supported ORM')
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
