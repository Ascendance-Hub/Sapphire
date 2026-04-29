import { ArrayField, BooleanField, DateField, NumberField, ObjectField, StringField, TypeField } from '../core'
import { Field, ValidationResult } from '../interfaces/field'
import { InferSchema, ORM } from '../types'
import { RubyValidationError } from './validation-error'

export class Ruby<T extends Record<string, Field> = {}> {
  private readonly schema: { [key: string]: any }

  constructor(
    private readonly orm: ORM,
    private readonly obj?: T,
  ) {
    this.schema = {}
    if (this.obj) {
      for (const [key, value] of Object.entries(this.obj)) {
        if (typeof value.getSchema === 'function') {
          this.schema[key] = value.getSchema()
        } else {
          this.schema[key] = value
        }
      }
    }
  }

  string(): StringField {
    return new StringField(this.orm)
  }

  number(): NumberField {
    return new NumberField(this.orm)
  }

  boolean(): BooleanField {
    return new BooleanField(this.orm)
  }

  date(): DateField {
    return new DateField(this.orm)
  }

  array<Arr extends Array<Field>>(arr: Arr): ArrayField<Arr> {
    return new ArrayField(this.orm, arr)
  }

  object<Obj extends Record<string, Field>>(obj: Obj): ObjectField<Obj> {
    return new ObjectField<Obj>(this.orm, obj)
  }

  type(): TypeField {
    return new TypeField(this.orm)
  }

  getSchema() {
    return this.schema
  }

  getType(): InferSchema<T> {
    return null as any
  }

  validate(obj: any): ValidationResult {
    const errors: Record<string, string> = {}
    const validated: Record<string, any> = {}
    for (const [key, field] of Object.entries(this.obj ?? {})) {
      if (typeof field.validate === 'function') {
        const result = field.validate(obj?.[key])
        validated[key] = result.value
        if (result.error) errors[key] = result.error
      }
    }
    if (Object.keys(errors).length > 0) {
      throw new RubyValidationError(errors)
    }
    return { value: validated }
  }
}
