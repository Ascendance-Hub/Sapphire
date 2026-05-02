import { resolveSchema } from '../adapters/registry'
import { Field, SafeParseResult, ValidationResult } from '../interfaces/field'
import { SapphireSchemaNode } from '../schema/types'
import { InferElementInputs, InferElementOutputs } from '../types/infer'
import { ORM } from '../types/orm'

type ArrayConfig = {
  required: boolean
}

export class ArrayField<
  T extends Array<Field>,
  TOut = InferElementOutputs<T>[number][],
  TIn = InferElementInputs<T>[number][],
> implements Field<TOut, TIn> {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly arr: T,
    private readonly defaultOrm?: ORM,
    private readonly config: ArrayConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    const items = this.arr.map((item) => item.toSchema())
    return { kind: 'array', required: this.config.required, items }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): ArrayField<T, TOut | undefined, TIn | undefined> {
    return new ArrayField<T, TOut | undefined, TIn | undefined>(this.arr, this.defaultOrm, {
      ...this.config,
      required: false,
    })
  }

  validate(value: unknown): ValidationResult {
    if (value === undefined || value === null) {
      if (this.config.required) return { value, error: 'Field is required' }
      return { value }
    }
    if (!Array.isArray(value)) {
      return { value, error: 'Expected array' }
    }

    const errors: Record<number, string> = {}
    const validated: unknown[] = []

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

  parse(_value: unknown): TOut {
    throw new Error('parse: implemented in PHASE_8')
  }

  safeParse(_value: unknown): SafeParseResult<TOut> {
    throw new Error('safeParse: implemented in PHASE_8')
  }
}
