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

type TupleConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
}

export type TupleOutputs<T extends ReadonlyArray<Field>> = {
  [K in keyof T]: T[K] extends Field ? T[K]['_output'] : never
}
export type TupleInputs<T extends ReadonlyArray<Field>> = {
  [K in keyof T]: T[K] extends Field ? T[K]['_input'] : never
}

export class TupleField<
  T extends ReadonlyArray<Field>,
  TOut = TupleOutputs<T>,
  TIn = TupleInputs<T>,
>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly items: T,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: TupleConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'tuple',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      items: this.items.map((f) => f.toSchema()),
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): TupleField<T, TOut | undefined, TIn | undefined> {
    return new TupleField<T, TOut | undefined, TIn | undefined>(
      this.items,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  nullable(): TupleField<T, TOut | null, TIn | null> {
    return new TupleField<T, TOut | null, TIn | null>(
      this.items,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): TupleField<T, TOut, TIn | undefined> {
    return new TupleField<T, TOut, TIn | undefined>(
      this.items,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      items: T,
      a?: string,
      b?: InstanceOptions,
      c?: TupleConfig,
    ) => this
    return new Ctor(this.items, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      items: T,
      a?: string,
      b?: InstanceOptions,
      c?: TupleConfig,
    ) => this
    return new Ctor(this.items, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): TupleField<T, TOut, TIn> {
    return new TupleField<T, TOut, TIn>(this.items, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: default substitution → null/undefined handling →
   * Array check → length check → element-wise validation.
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

    const issues: ValidationIssue[] = []
    if (value.length !== this.items.length) {
      issues.push(
        buildIssue(
          'tuple_length',
          ctx,
          { expected: this.items.length, got: value.length },
          this.config.fieldMessage,
        ),
      )
      if (ctx.abortEarly) return { value, issues }
    }

    const out: unknown[] = []
    const len = Math.min(value.length, this.items.length)
    for (let i = 0; i < len; i++) {
      const itemCtx: ParseContext = { ...ctx, path: [...ctx.path, i] }
      const sub = (this.items[i] as unknown as InternalField)._parse(value[i], itemCtx)
      out[i] = sub.value
      issues.push(...sub.issues)
      if (ctx.abortEarly && issues.length > 0) break
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
