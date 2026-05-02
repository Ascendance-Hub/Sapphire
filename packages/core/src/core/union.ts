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
  ValidationIssue,
} from '../lib/types'
import { SapphireSchemaNode } from '../schema/types'
import { InferElementInputs, InferElementOutputs } from '../types/infer'

type UnionConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
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
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: UnionConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'union',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      options: this.fields.map((f) => f.toSchema()),
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): UnionField<Fields, TOut | undefined, TIn | undefined> {
    return new UnionField<Fields, TOut | undefined, TIn | undefined>(
      this.fields,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  nullable(): UnionField<Fields, TOut | null, TIn | null> {
    return new UnionField<Fields, TOut | null, TIn | null>(
      this.fields,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): UnionField<Fields, TOut, TIn | undefined> {
    return new UnionField<Fields, TOut, TIn | undefined>(
      this.fields,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      fields: Fields,
      a?: string,
      b?: InstanceOptions,
      c?: UnionConfig,
    ) => this
    return new Ctor(this.fields, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      fields: Fields,
      a?: string,
      b?: InstanceOptions,
      c?: UnionConfig,
    ) => this
    return new Ctor(this.fields, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): UnionField<Fields, TOut, TIn> {
    return new UnionField<Fields, TOut, TIn>(this.fields, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: default substitution → null/undefined handling →
   * invalid_type check (exclusive) → accumulated rule checks.
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
    if (value === undefined && this.config.hasDefault) {
      value = this.config.default
    }
    if (value === null && this.config.nullable) {
      return { value: null, issues: [] }
    }
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
    const issues: ValidationIssue[] = [
      buildIssue('union_no_match', ctx, {}, this.config.fieldMessage),
    ]
    return { value, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
