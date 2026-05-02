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
import { InferElementInputs, InferElementOutputs } from '../types/infer'
import { ORM } from '../types/orm'

type UnionConfig = {
  required: boolean
  fieldMessage?: FieldMessages | string
}

export class UnionField<
  Fields extends Field[],
  TOut = InferElementOutputs<Fields>[number],
  TIn = InferElementInputs<Fields>[number],
>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly fields: Fields,
    private readonly defaultOrm?: ORM,
    private readonly instanceOpts?: InstanceOptions,
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
    return new UnionField<Fields, TOut | undefined, TIn | undefined>(
      this.fields,
      this.defaultOrm,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  message(msg: string | FieldMessages): UnionField<Fields, TOut, TIn> {
    return new UnionField<Fields, TOut, TIn>(this.fields, this.defaultOrm, this.instanceOpts, {
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
    for (const f of this.fields) {
      const sub = (f as unknown as InternalField)._parse(value, ctx)
      if (sub.issues.length === 0) return { value: sub.value, issues: [] }
    }
    return { value, issues: [buildIssue('union_no_match', ctx, {}, this.config.fieldMessage)] }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
