import { Field, ValidationResult } from '../interfaces/field'
import { InferSchema, ORM } from '../types'

export class ObjectField<T extends Record<string, Field>, IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly orm: ORM,
    private readonly obj: T
  ) {}
  private required: boolean = true

  getObj(): T {
    return this.obj
  }

  getSchema() {
    const properties: Record<string, any> = {}
    for (const [key, value] of Object.entries(this.obj)) {
      properties[key] = typeof value.getSchema === 'function' ? value.getSchema() : value
    }
    return { type: 'object', required: this.required, properties }
  }

  getType(): InferSchema<T> {
    return null as any
  }

  optional(): ObjectField<T, true> {
    this.required = false
    return this as unknown as ObjectField<T, true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      return { value, error: 'Expected object' }
    }
    const errors: Record<string, string> = {}
    const validated: Record<string, any> = {}
    for (const [key, field] of Object.entries(this.obj)) {
      const result = field.validate(value[key])
      validated[key] = result.value
      if (result.error) errors[key] = result.error
    }
    if (Object.keys(errors).length > 0) {
      return { value: validated, error: JSON.stringify(errors) }
    }
    return { value: validated }
  }
}
