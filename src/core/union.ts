import { Field, ValidationResult } from '../interfaces/field'
import { ORM } from '../types'

export class UnionField<Fields extends Field[], IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly orm: ORM,
    private readonly fields: Fields
  ) { }
  private required: boolean = true

  getSchema() {
    if (this.orm === ORM.MONGO) {
      return {
        type: 'mixed',
        required: this.required,
        properties: this.fields.map((f) => (typeof f.getSchema === 'function' ? f.getSchema() : f)),
      }
    }
    throw new Error('not supported ORM')
  }

  optional(): UnionField<Fields, true> {
    this.required = false
    return this as unknown as UnionField<Fields, true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    for (const field of this.fields) {
      const result = field.validate(value)
      if (!result.error) return { value: result.value }
    }
    return { value, error: 'Value does not match any allowed type' }
  }
}
