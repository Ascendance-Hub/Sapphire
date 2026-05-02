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

type BooleanConfig = {
  required: boolean
  fieldMessage?: FieldMessages | string
}

export class BooleanField<TOut = boolean, TIn = boolean>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: BooleanConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return { kind: 'boolean', required: this.config.required }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): BooleanField<TOut | undefined, TIn | undefined> {
    return new BooleanField<TOut | undefined, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      required: false,
    })
  }

  message(msg: string | FieldMessages): BooleanField<TOut, TIn> {
    return new BooleanField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
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
    if (typeof value !== 'boolean') {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'boolean', got: Array.isArray(value) ? 'array' : typeof value },
            this.config.fieldMessage,
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
