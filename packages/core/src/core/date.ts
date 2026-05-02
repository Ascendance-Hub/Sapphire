import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type DateConfig = {
  required: boolean
}

export class DateField<TOut = Date, TIn = Date> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: DateConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'date', required: this.config.required }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): DateField<TOut | undefined, TIn | undefined> {
    return new DateField<TOut | undefined, TIn | undefined>(this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
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

  parse(_value: unknown): TOut {
    throw new Error('parse: implemented in PHASE_8')
  }

  safeParse(_value: unknown): SafeParseResult<TOut> {
    throw new Error('safeParse: implemented in PHASE_8')
  }
}
