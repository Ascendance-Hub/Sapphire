import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { InferSchema } from '../types/infer-type'
import { ORM } from '../types/orm'

export class ObjectField<T extends Record<string, Field>, IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly obj: T,
    private readonly defaultOrm?: ORM,
  ) {}
  private required: boolean = true

  getObj(): T {
    return this.obj
  }

  toSchema(): SapphireSchemaNode {
    const properties: Record<string, SapphireSchemaNode> = {}
    for (const [key, value] of Object.entries(this.obj)) {
      properties[key] = value.toSchema()
    }
    return { kind: 'object', required: this.required, properties }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
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
