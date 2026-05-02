import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ObjectInput, ObjectOutput } from '../types/infer'
import { ORM } from '../types/orm'

type ObjectConfig = {
  required: boolean
}

export class ObjectField<
  T extends Record<string, Field>,
  TOut = ObjectOutput<T>,
  TIn = ObjectInput<T>,
> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly obj: T,
    private readonly defaultOrm?: ORM,
    private readonly config: ObjectConfig = { required: true },
  ) {}

  getObj(): T {
    return this.obj
  }

  toSchema(): SapphireSchemaNode {
    const properties: Record<string, SapphireSchemaNode> = {}
    for (const [key, value] of Object.entries(this.obj)) {
      properties[key] = value.toSchema()
    }
    return { kind: 'object', required: this.config.required, properties }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): ObjectField<T, TOut | undefined, TIn | undefined> {
    return new ObjectField<T, TOut | undefined, TIn | undefined>(this.obj, this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      return { value, error: 'Expected object' }
    }
    const errors: Record<string, string> = {}
    const validated: Record<string, unknown> = {}
    const v = value as Record<string, unknown>
    for (const [key, field] of Object.entries(this.obj)) {
      const result = field.validate(v[key])
      validated[key] = result.value
      if (result.error) errors[key] = result.error
    }
    if (Object.keys(errors).length > 0) {
      return { value: validated, error: JSON.stringify(errors) }
    }
    return { value: validated }
  }

  parse(_value: unknown): TOut {
    throw new Error('parse: implemented in PHASE_8')
  }

  safeParse(_value: unknown): SafeParseResult<TOut> {
    throw new Error('safeParse: implemented in PHASE_8')
  }
}
