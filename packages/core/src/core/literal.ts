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

export type LiteralValue = string | number | boolean

type LiteralConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
  // I1: per-rule message for the `literal` issue code (set via `t.literal(value, opts)`).
  ruleMessages?: { literal?: MessageValue }
}

export class LiteralField<V extends LiteralValue, TOut = V, TIn = V>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly value: V,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: LiteralConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'literal',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      value: this.value,
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  optional(): LiteralField<V, TOut | undefined, TIn | undefined> {
    return new LiteralField<V, TOut | undefined, TIn | undefined>(
      this.value,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  required(): LiteralField<V, Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new LiteralField<V, Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.value,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: true },
    )
  }

  nullable(): LiteralField<V, TOut | null, TIn | null> {
    return new LiteralField<V, TOut | null, TIn | null>(
      this.value,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): LiteralField<V, TOut, TIn | undefined> {
    return new LiteralField<V, TOut, TIn | undefined>(
      this.value,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      v: V,
      a?: string,
      b?: InstanceOptions,
      c?: LiteralConfig,
    ) => this
    return new Ctor(this.value, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      v: V,
      a?: string,
      b?: InstanceOptions,
      c?: LiteralConfig,
    ) => this
    return new Ctor(this.value, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): LiteralField<V, TOut, TIn> {
    return new LiteralField<V, TOut, TIn>(this.value, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

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
    if (value !== this.value) {
      return {
        value,
        issues: [
          buildIssue(
            'literal',
            ctx,
            { expected: this.value, got: value },
            this.config.fieldMessage,
            this.config.ruleMessages?.literal,
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
