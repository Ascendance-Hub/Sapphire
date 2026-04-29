import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { InferSchema } from '../types/infer-type'
import { ORM } from '../types/orm'

export class ArrayField<
  T extends Array<Field>,
  IsOptional extends boolean = false
> implements Field {
  constructor(
    private readonly arr: T,
    private readonly defaultOrm?: ORM,
  ) { }
  private required: boolean = true

  toSchema(): SapphireSchemaNode {
    const items = this.arr.map((item) => item.toSchema())
    return { kind: 'array', required: this.required, items }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  getType(): InferSchema<T> {
    return null as any
  }

  optional(): ArrayField<T, true> {
    this.required = false
    return this as unknown as ArrayField<T, true>
  }

  validate(value: any): ValidationResult {
    if (value === undefined || value === null) {
      if (this.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (!Array.isArray(value)) {
      return { value, error: 'Expected array' }
    }

    const errors: Record<number, string> = {}
    const validated: any[] = []

    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const matched = this.arr.some((field) => {
        if (typeof field.validate !== 'function') return false
        const result = field.validate(item)
        if (!result.error) {
          validated[i] = result.value
          return true
        }
        return false
      })

      if (!matched) {
        validated[i] = item
        errors[i] = 'No schema matches the value'
      }
    }

    if (Object.keys(errors).length > 0) {
      return { value: validated, error: JSON.stringify(errors) }
    }
    return { value: validated }
  }
}
