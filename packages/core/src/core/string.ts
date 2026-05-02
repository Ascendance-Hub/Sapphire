import { resolveSchema } from '../adapters/registry'
import { Field, InternalField, SafeParseResult } from '../interfaces/field'
import { buildIssue } from '../lib/issue-builder'
import { runParse, runSafeParse } from '../lib/parse-runner'
import type {
  FieldMessages,
  InstanceOptions,
  InternalParseResult,
  MessageValue,
  ParseContext,
  ParseOptions,
} from '../lib/types'
import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

type StringConfig = {
  required: boolean
  minLength?: number
  fieldMessage?: FieldMessages | string
  ruleMessages?: { min_length?: MessageValue }
}

export class StringField<TOut = string, TIn = string> implements Field<TOut, TIn>, InternalField {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultOrm?: ORM,
    private readonly instanceOpts?: InstanceOptions,
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
    return new StringField<TOut | undefined, TIn | undefined>(this.defaultOrm, this.instanceOpts, {
      ...this.config,
      required: false,
    })
  }

  min(value: number, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('min must be a non-negative number')
    }
    return new StringField<TOut, TIn>(this.defaultOrm, this.instanceOpts, {
      ...this.config,
      minLength: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { min_length: opts.message } : {}),
      },
    })
  }

  message(msg: string | FieldMessages): StringField<TOut, TIn> {
    return new StringField<TOut, TIn>(this.defaultOrm, this.instanceOpts, {
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
    if (typeof value !== 'string') {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'string', got: Array.isArray(value) ? 'array' : typeof value },
            this.config.fieldMessage,
          ),
        ],
      }
    }
    if (this.config.minLength !== undefined && value.length < this.config.minLength) {
      return {
        value,
        issues: [
          buildIssue(
            'min_length',
            ctx,
            { min: this.config.minLength, got: value.length },
            this.config.fieldMessage,
            this.config.ruleMessages?.min_length,
          ),
        ],
      }
    }
    return { value, issues: [] }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
