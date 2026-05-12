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
  ValidationIssue,
} from '../lib/types'
import { SapphireSchemaNode } from '../schema/types'

type ArrayRuleMessages = {
  min_items?: MessageValue
  max_items?: MessageValue
  items_length?: MessageValue
}

type ArrayConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  minItems?: number
  maxItems?: number
  length?: number
  fieldMessage?: FieldMessages | string
  ruleMessages?: ArrayRuleMessages
}

export class ArrayField<F extends Field, TOut = F['_output'][], TIn = F['_input'][]>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly item: F,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: ArrayConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'array',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.minItems !== undefined ? { minItems: this.config.minItems } : {}),
      ...(this.config.maxItems !== undefined ? { maxItems: this.config.maxItems } : {}),
      ...(this.config.length !== undefined ? { length: this.config.length } : {}),
      items: this.item.toSchema(),
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  optional(): ArrayField<F, TOut | undefined, TIn | undefined> {
    return new ArrayField<F, TOut | undefined, TIn | undefined>(
      this.item,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  required(): ArrayField<F, Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new ArrayField<F, Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.item,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: true },
    )
  }

  nullable(): ArrayField<F, TOut | null, TIn | null> {
    return new ArrayField<F, TOut | null, TIn | null>(
      this.item,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): ArrayField<F, TOut, TIn | undefined> {
    return new ArrayField<F, TOut, TIn | undefined>(
      this.item,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      item: F,
      a?: string,
      b?: InstanceOptions,
      c?: ArrayConfig,
    ) => this
    return new Ctor(this.item, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      item: F,
      a?: string,
      b?: InstanceOptions,
      c?: ArrayConfig,
    ) => this
    return new Ctor(this.item, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  private clone(patch: Partial<ArrayConfig>): ArrayField<F, TOut, TIn> {
    return new ArrayField<F, TOut, TIn>(this.item, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      ...patch,
    })
  }

  min(value: number, opts?: { message?: MessageValue }): ArrayField<F, TOut, TIn> {
    return this.clone({
      minItems: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { min_items: opts.message } : {}),
      },
    })
  }

  max(value: number, opts?: { message?: MessageValue }): ArrayField<F, TOut, TIn> {
    return this.clone({
      maxItems: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { max_items: opts.message } : {}),
      },
    })
  }

  length(value: number, opts?: { message?: MessageValue }): ArrayField<F, TOut, TIn> {
    return this.clone({
      length: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { items_length: opts.message } : {}),
      },
    })
  }

  /**
   * I3: sugar for `.min(1, opts)`. Issue code is `min_items` (no dedicated
   * `nonempty` code anymore — the flag was previously dropped from the IR when
   * combined with `.min(n)` where n > 1, which made the issue code arbitrary).
   */
  nonempty(opts?: { message?: MessageValue }): ArrayField<F, TOut, TIn> {
    return this.min(1, opts)
  }

  message(msg: string | FieldMessages): ArrayField<F, TOut, TIn> {
    return new ArrayField<F, TOut, TIn>(this.item, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: default substitution → null/undefined handling →
   * invalid_type check (exclusive) → accumulated per-item checks
   * (each item validated against the single inner field).
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

    if (this.config.length !== undefined && value.length !== this.config.length) {
      issues.push(
        buildIssue(
          'items_length',
          ctx,
          { length: this.config.length, got: value.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.items_length,
        ),
      )
    }
    if (this.config.minItems !== undefined && value.length < this.config.minItems) {
      issues.push(
        buildIssue(
          'min_items',
          ctx,
          { min: this.config.minItems, got: value.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.min_items,
        ),
      )
    }
    if (this.config.maxItems !== undefined && value.length > this.config.maxItems) {
      issues.push(
        buildIssue(
          'max_items',
          ctx,
          { max: this.config.maxItems, got: value.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.max_items,
        ),
      )
    }

    for (let i = 0; i < value.length; i++) {
      const itemCtx: ParseContext = { ...ctx, path: [...ctx.path, i] }
      const sub = (this.item as unknown as InternalField)._parse(value[i], itemCtx)
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
