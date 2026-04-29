import { Field, ValidationResult } from '../interfaces/field'
import { ORM } from '../types'

export class DateField<IsOptional extends boolean = false> implements Field {
  constructor(private readonly orm: ORM) {}
  private required: boolean = true

  getSchema() {
    if (this.orm === ORM.MONGO) {
      return { type: Date, required: this.required }
    }
    throw new Error('not supported ORM')
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
