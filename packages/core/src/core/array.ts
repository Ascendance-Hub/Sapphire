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

type ArrayConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
}

export class ArrayField<
  T extends Array<Field>,
  TOut = InferElementOutputs<T>[number][],
  TIn = InferElementInputs<T>[number][],
>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly arr: T,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: ArrayConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    const items = this.arr.map((item) => item.toSchema())
    return {
      kind: 'array',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      items,
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): ArrayField<T, TOut | undefined, TIn | undefined> {
    return new ArrayField<T, TOut | undefined, TIn | undefined>(
      this.arr,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  nullable(): ArrayField<T, TOut | null, TIn | null> {
    return new ArrayField<T, TOut | null, TIn | null>(
      this.arr,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): ArrayField<T, TOut, TIn | undefined> {
    return new ArrayField<T, TOut, TIn | undefined>(
      this.arr,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      arr: T,
      a?: string,
      b?: InstanceOptions,
      c?: ArrayConfig,
    ) => this
    return new Ctor(this.arr, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      arr: T,
      a?: string,
      b?: InstanceOptions,
      c?: ArrayConfig,
    ) => this
    return new Ctor(this.arr, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): ArrayField<T, TOut, TIn> {
    return new ArrayField<T, TOut, TIn>(this.arr, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: default substitution → null/undefined handling →
   * invalid_type check (exclusive) → accumulated per-item checks.
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
    if (!Array.isArray(value)) {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'array', got: typeof value },
            this.config.fieldMessage,
          ),
        ],
      }
    }

    const out: unknown[] = []
    const issues: ValidationIssue[] = []

    for (let i = 0; i < value.length; i++) {
      const itemCtx: ParseContext = { ...ctx, path: [...ctx.path, i] }
      let matched = false
      for (const f of this.arr) {
        const sub = (f as unknown as InternalField)._parse(value[i], itemCtx)
        if (sub.issues.length === 0) {
          out[i] = sub.value
          matched = true
          break
        }
      }
      if (!matched) {
        out[i] = value[i]
        issues.push(buildIssue('union_no_match', itemCtx, {}, this.config.fieldMessage))
        if (ctx.abortEarly) break
      }
    }

    return { value: out, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
