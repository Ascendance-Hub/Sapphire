import { resolveSchema } from '../adapters/registry'
import { Field, InternalField, SafeParseResult } from '../interfaces/field'
import { buildIssue } from '../lib/issue-builder'
import { runParse, runSafeParse } from '../lib/parse-runner'
import type {
  FieldMessages,
  InstanceOptions,
  InternalParseResult,
  ParseContext,
  ParseOptions,
} from '../lib/types'
import { SapphireSchemaNode } from '../schema/types'

type DateConfig = {
  required: boolean
  fieldMessage?: FieldMessages | string
}

export class DateField<TOut = Date, TIn = Date> implements Field<TOut, TIn>, InternalField {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: DateConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'date', required: this.config.required }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): DateField<TOut | undefined, TIn | undefined> {
    return new DateField<TOut | undefined, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      required: false,
    })
  }

  message(msg: string | FieldMessages): DateField<TOut, TIn> {
    return new DateField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
    if (value === undefined || value === null) {
      if (this.config.required) {
        return { value, issues: [buildIssue('required', ctx, {}, this.config.fieldMessage)] }
      }
      return { value, issues: [] }
    }
    if (value instanceof Date) {
      return { value, issues: [] }
    }
    if (typeof value === 'string') {
      const d = new Date(value)
      if (isNaN(d.getTime())) {
        return {
          value,
          issues: [
            buildIssue(
              'invalid_type',
              ctx,
              { expected: 'date', got: 'invalid date string' },
              this.config.fieldMessage,
            ),
          ],
        }
      }
      return { value: d, issues: [] }
    }
    return {
      value,
      issues: [
        buildIssue(
          'invalid_type',
          ctx,
          { expected: 'date', got: Array.isArray(value) ? 'array' : typeof value },
          this.config.fieldMessage,
        ),
      ],
    }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
