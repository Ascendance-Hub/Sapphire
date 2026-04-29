import { resolveSchema } from '../adapters/registry'
import { Field, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export class UnionField<Fields extends Field[], IsOptional extends boolean = false> implements Field {
  constructor(
    private readonly fields: Fields,
    private readonly defaultOrm?: ORM,
  ) { }
  private required: boolean = true

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'union',
      required: this.required,
      options: this.fields.map((f) => f.toSchema()),
    }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
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
