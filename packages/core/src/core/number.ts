import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type NumberConfig = {
  required: boolean
}

export class NumberField<TOut = number, TIn = number> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: NumberConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'number', required: this.config.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): NumberField<TOut | undefined, TIn | undefined> {
    return new NumberField<TOut | undefined, TIn | undefined>(this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'number') {
      return { value, error: 'Expected number' }
    }
    return { value }
  }

  parse(_value: unknown): TOut {
    throw new Error('parse: implemented in PHASE_8')
  }

  safeParse(_value: unknown): SafeParseResult<TOut> {
    throw new Error('safeParse: implemented in PHASE_8')
  }
}
