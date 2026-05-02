import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type StringConfig = {
  required: boolean
  minLength?: number
}

export class StringField<TOut = string, TIn = string> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultOrm?: ORM,
    private readonly config: StringConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'string',
      required: this.config.required,
      ...(this.config.minLength !== undefined ? { minLength: this.config.minLength } : {}),
    }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): StringField<TOut | undefined, TIn | undefined> {
    return new StringField<TOut | undefined, TIn | undefined>(this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  min(value: number): StringField<TOut, TIn> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('min must be a non-negative number')
    }
    return new StringField<TOut, TIn>(this.defaultOrm, { ...this.config, minLength: value })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (typeof value !== 'string') {
      return { value, error: 'Expected string' }
    }
    if (this.config.minLength !== undefined && value.length < this.config.minLength) {
      return { value, error: `String must have at least ${this.config.minLength} characters` }
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
