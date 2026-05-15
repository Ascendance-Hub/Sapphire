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

type NumberRuleMessages = {
  min?: MessageValue
  max?: MessageValue
  gt?: MessageValue
  gte?: MessageValue
  lt?: MessageValue
  lte?: MessageValue
  int?: MessageValue
  multiple_of?: MessageValue
  finite?: MessageValue
  safe?: MessageValue
}

type NumberConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  unique?: boolean
  index?: boolean | { unique?: boolean }
  min?: number
  max?: number
  exclusiveMin?: number
  exclusiveMax?: number
  // Tracks which alias produced min/max so issue codes (gte/lte) survive.
  minCode?: 'min' | 'gte'
  maxCode?: 'max' | 'lte'
  exclusiveMinCode?: 'gt'
  exclusiveMaxCode?: 'lt'
  int?: boolean
  multipleOf?: number
  finite?: boolean
  safe?: boolean
  coerce?: boolean
  fieldMessage?: FieldMessages | string
  ruleMessages?: NumberRuleMessages
}

export class NumberField<TOut = number, TIn = number> implements Field<TOut, TIn>, InternalField {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: NumberConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'number',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.unique ? { unique: true } : {}),
      ...(this.config.index !== undefined ? { index: this.config.index } : {}),
      ...(this.config.min !== undefined ? { min: this.config.min } : {}),
      ...(this.config.max !== undefined ? { max: this.config.max } : {}),
      ...(this.config.exclusiveMin !== undefined ? { exclusiveMin: this.config.exclusiveMin } : {}),
      ...(this.config.exclusiveMax !== undefined ? { exclusiveMax: this.config.exclusiveMax } : {}),
      ...(this.config.int ? { int: true } : {}),
      ...(this.config.multipleOf !== undefined ? { multipleOf: this.config.multipleOf } : {}),
      ...(this.config.finite ? { finite: true } : {}),
      ...(this.config.safe ? { safe: true } : {}),
      ...(this.config.coerce ? { coerce: true } : {}),
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  private clone(patch: Partial<NumberConfig>): NumberField<TOut, TIn> {
    return new NumberField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      ...patch,
    })
  }

  optional(): NumberField<TOut | undefined, TIn | undefined> {
    return new NumberField<TOut | undefined, TIn | undefined>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: false,
      },
    )
  }

  required(): NumberField<Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new NumberField<Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: true,
      },
    )
  }

  nullable(): NumberField<TOut | null, TIn | null> {
    return new NumberField<TOut | null, TIn | null>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      nullable: true,
    })
  }

  default(value: TOut): NumberField<TOut, TIn | undefined> {
    return new NumberField<TOut, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      hasDefault: true,
      default: value,
    })
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: NumberConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, description: text })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: NumberConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  unique(): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: NumberConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, unique: true })
  }

  index(opts?: { unique?: boolean }): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: NumberConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      index: opts === undefined ? true : { unique: opts.unique },
    })
  }

  min(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      min: value,
      minCode: 'min',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { min: opts.message } : {}),
      },
    })
  }

  max(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      max: value,
      maxCode: 'max',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { max: opts.message } : {}),
      },
    })
  }

  gt(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      exclusiveMin: value,
      exclusiveMinCode: 'gt',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { gt: opts.message } : {}),
      },
    })
  }

  gte(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      min: value,
      minCode: 'gte',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { gte: opts.message } : {}),
      },
    })
  }

  lt(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      exclusiveMax: value,
      exclusiveMaxCode: 'lt',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { lt: opts.message } : {}),
      },
    })
  }

  lte(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      max: value,
      maxCode: 'lte',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { lte: opts.message } : {}),
      },
    })
  }

  int(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      int: true,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { int: opts.message } : {}),
      },
    })
  }

  positive(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.gt(0, opts)
  }

  negative(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.lt(0, opts)
  }

  nonnegative(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.gte(0, opts)
  }

  nonpositive(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.lte(0, opts)
  }

  multipleOf(value: number, opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
      throw new Error('multipleOf must be a non-zero finite number')
    }
    return this.clone({
      multipleOf: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { multiple_of: opts.message } : {}),
      },
    })
  }

  finite(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      finite: true,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { finite: opts.message } : {}),
      },
    })
  }

  safe(opts?: { message?: MessageValue }): NumberField<TOut, TIn> {
    return this.clone({
      safe: true,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { safe: opts.message } : {}),
      },
    })
  }

  coerce(): NumberField<TOut, TIn> {
    return this.clone({ coerce: true })
  }

  message(msg: string | FieldMessages): NumberField<TOut, TIn> {
    return new NumberField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: coerce → default substitution → null/undefined handling →
   * invalid_type check (NaN counts as invalid) → accumulated rule checks.
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
    if (this.config.coerce && typeof value !== 'number' && value !== null && value !== undefined) {
      const n = Number(value)
      if (!Number.isNaN(n)) value = n
    }
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
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'number', got: Array.isArray(value) ? 'array' : typeof value },
            this.config.fieldMessage,
          ),
        ],
      }
    }
    const n = value
    const issues: ValidationIssue[] = []
    // I2: abortEarly bails after the first rule failure within this leaf field.
    const bail = () => ctx.abortEarly && issues.length > 0
    if (this.config.int && !Number.isInteger(n)) {
      issues.push(
        buildIssue('int', ctx, { got: n }, this.config.fieldMessage, this.config.ruleMessages?.int),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.finite && !Number.isFinite(n)) {
      issues.push(
        buildIssue(
          'finite',
          ctx,
          { got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.finite,
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.safe && !Number.isSafeInteger(n)) {
      issues.push(
        buildIssue(
          'safe',
          ctx,
          { got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.safe,
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.min !== undefined && n < this.config.min) {
      const code = this.config.minCode ?? 'min'
      issues.push(
        buildIssue(
          code,
          ctx,
          { min: this.config.min, got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.[code],
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.max !== undefined && n > this.config.max) {
      const code = this.config.maxCode ?? 'max'
      issues.push(
        buildIssue(
          code,
          ctx,
          { max: this.config.max, got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.[code],
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.exclusiveMin !== undefined && n <= this.config.exclusiveMin) {
      issues.push(
        buildIssue(
          'gt',
          ctx,
          { exclusiveMin: this.config.exclusiveMin, got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.gt,
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.exclusiveMax !== undefined && n >= this.config.exclusiveMax) {
      issues.push(
        buildIssue(
          'lt',
          ctx,
          { exclusiveMax: this.config.exclusiveMax, got: n },
          this.config.fieldMessage,
          this.config.ruleMessages?.lt,
        ),
      )
      if (bail()) return { value: n, issues }
    }
    if (this.config.multipleOf !== undefined) {
      // Float-tolerant comparison: `0.3 % 0.1` is ~0.0999… not exactly 0 due
      // to IEEE-754. Accept when |rem| or |rem - m| is within EPSILON of zero.
      const m = this.config.multipleOf
      const rem = n % m
      const tol = Math.max(Number.EPSILON, Math.abs(m) * Number.EPSILON)
      if (Math.abs(rem) >= tol && Math.abs(Math.abs(rem) - Math.abs(m)) >= tol) {
        issues.push(
          buildIssue(
            'multiple_of',
            ctx,
            { multipleOf: this.config.multipleOf },
            this.config.fieldMessage,
            this.config.ruleMessages?.multiple_of,
          ),
        )
        if (bail()) return { value: n, issues }
      }
    }
    return { value: n, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
