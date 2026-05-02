import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { InferElementInputs, InferElementOutputs } from '../types/infer'
import { ORM } from '../types/orm'

type UnionConfig = {
  required: boolean
}

export class UnionField<
  Fields extends Field[],
  TOut = InferElementOutputs<Fields>[number],
  TIn = InferElementInputs<Fields>[number],
> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly fields: Fields,
    private readonly defaultOrm?: ORM,
    private readonly config: UnionConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'union',
      required: this.config.required,
      options: this.fields.map((f) => f.toSchema()),
    }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): UnionField<Fields, TOut | undefined, TIn | undefined> {
    return new UnionField<Fields, TOut | undefined, TIn | undefined>(this.fields, this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    for (const field of this.fields) {
      const result = field.validate(value)
      if (!result.error) return { value: result.value }
    }
    return { value, error: 'Value does not match any allowed type' }
  }

  parse(_value: unknown): TOut {
    throw new Error('parse: implemented in PHASE_8')
  }

  safeParse(_value: unknown): SafeParseResult<TOut> {
    throw new Error('safeParse: implemented in PHASE_8')
  }
}
