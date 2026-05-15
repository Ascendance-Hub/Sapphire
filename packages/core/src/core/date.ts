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

type DateRuleMessages = {
  min?: MessageValue
  max?: MessageValue
}

type DateConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  unique?: boolean
  index?: boolean | { unique?: boolean }
  min?: Date
  max?: Date
  coerce?: boolean
  fieldMessage?: FieldMessages | string
  ruleMessages?: DateRuleMessages
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
    return {
      kind: 'date',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.unique ? { unique: true } : {}),
      ...(this.config.index !== undefined ? { index: this.config.index } : {}),
      ...(this.config.min !== undefined ? { min: this.config.min } : {}),
      ...(this.config.max !== undefined ? { max: this.config.max } : {}),
      ...(this.config.coerce ? { coerce: true } : {}),
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  private clone(patch: Partial<DateConfig>): DateField<TOut, TIn> {
    return new DateField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      ...patch,
    })
  }

  optional(): DateField<TOut | undefined, TIn | undefined> {
    return new DateField<TOut | undefined, TIn | undefined>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: false,
      },
    )
  }

  required(): DateField<Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new DateField<Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: true,
      },
    )
  }

  nullable(): DateField<TOut | null, TIn | null> {
    return new DateField<TOut | null, TIn | null>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      nullable: true,
    })
  }

  default(value: TOut): DateField<TOut, TIn | undefined> {
    return new DateField<TOut, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      hasDefault: true,
      default: value,
    })
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: DateConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, description: text })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: DateConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  unique(): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: DateConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, unique: true })
  }

  index(opts?: { unique?: boolean }): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: DateConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      index: opts === undefined ? true : { unique: opts.unique },
    })
  }

  min(value: Date, opts?: { message?: MessageValue }): DateField<TOut, TIn> {
    return this.clone({
      min: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { min: opts.message } : {}),
      },
    })
  }

  max(value: Date, opts?: { message?: MessageValue }): DateField<TOut, TIn> {
    return this.clone({
      max: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { max: opts.message } : {}),
      },
    })
  }

  coerce(): DateField<TOut, TIn> {
    return this.clone({ coerce: true })
  }

  message(msg: string | FieldMessages): DateField<TOut, TIn> {
    return new DateField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: coerce (number/string → Date) → default substitution →
   * null/undefined handling → invalid_type check → accumulated min/max checks.
   *
   * Strict by default — only `Date` instances are accepted. To accept strings
   * or numbers (form payloads, URL params, JSON-deserialized timestamps), call
   * `.coerce()` explicitly. This keeps the IR honest: `coerce: false` ⇒ runtime
   * accepts only Date.
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
    if (this.config.coerce) {
      if (typeof value === 'number' || typeof value === 'string') {
        const d = new Date(value)
        if (!isNaN(d.getTime())) value = d
      }
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
    let date: Date
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return {
          value,
          issues: [
            buildIssue(
              'invalid_type',
              ctx,
              { expected: 'date', got: 'invalid date' },
              this.config.fieldMessage,
            ),
          ],
        }
      }
      date = value
    } else {
      // B4 clean break: strings/numbers are NOT accepted without `.coerce()`.
      // The coercion branch above would have converted them to Date already.
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
    const issues: ValidationIssue[] = []
    // I2: abortEarly bails after the first rule failure within this leaf field.
    if (this.config.min !== undefined && date.getTime() < this.config.min.getTime()) {
      issues.push(
        buildIssue(
          'min',
          ctx,
          { min: this.config.min.toISOString(), got: date.toISOString() },
          this.config.fieldMessage,
          this.config.ruleMessages?.min,
        ),
      )
      if (ctx.abortEarly) return { value: date, issues }
    }
    if (this.config.max !== undefined && date.getTime() > this.config.max.getTime()) {
      issues.push(
        buildIssue(
          'max',
          ctx,
          { max: this.config.max.toISOString(), got: date.toISOString() },
          this.config.fieldMessage,
          this.config.ruleMessages?.max,
        ),
      )
      if (ctx.abortEarly) return { value: date, issues }
    }
    return { value: date, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
