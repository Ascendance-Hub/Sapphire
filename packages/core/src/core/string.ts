import { resolveSchema } from '../adapters/registry'
import { Field, InternalField, SafeParseResult } from '../interfaces/field'
import { formatValidators } from '../lib/format-validators'
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

type StringTransform = 'trim' | 'toLowerCase' | 'toUpperCase'
type StringFormat = 'email' | 'url' | 'uuid'

type StringRuleMessages = {
  min_length?: MessageValue
  max_length?: MessageValue
  length?: MessageValue
  regex?: MessageValue
  format?: MessageValue
  starts_with?: MessageValue
  ends_with?: MessageValue
}

type StringConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  unique?: boolean
  index?: boolean | { unique?: boolean }
  minLength?: number
  maxLength?: number
  length?: number
  regex?: { source: string; flags: string }
  format?: StringFormat
  startsWith?: string
  endsWith?: string
  transforms?: StringTransform[]
  coerce?: boolean
  fieldMessage?: FieldMessages | string
  ruleMessages?: StringRuleMessages
}

export class StringField<TOut = string, TIn = string> implements Field<TOut, TIn>, InternalField {
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: StringConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'string',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.unique ? { unique: true } : {}),
      ...(this.config.index !== undefined ? { index: this.config.index } : {}),
      ...(this.config.minLength !== undefined ? { minLength: this.config.minLength } : {}),
      ...(this.config.maxLength !== undefined ? { maxLength: this.config.maxLength } : {}),
      ...(this.config.length !== undefined ? { length: this.config.length } : {}),
      ...(this.config.regex !== undefined ? { regex: this.config.regex } : {}),
      ...(this.config.format !== undefined ? { format: this.config.format } : {}),
      ...(this.config.startsWith !== undefined ? { startsWith: this.config.startsWith } : {}),
      ...(this.config.endsWith !== undefined ? { endsWith: this.config.endsWith } : {}),
      ...(this.config.transforms && this.config.transforms.length > 0
        ? { transforms: [...this.config.transforms] }
        : {}),
      ...(this.config.coerce ? { coerce: true } : {}),
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  private clone(patch: Partial<StringConfig>): StringField<TOut, TIn> {
    return new StringField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      ...patch,
    })
  }

  optional(): StringField<TOut | undefined, TIn | undefined> {
    return new StringField<TOut | undefined, TIn | undefined>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: false,
      },
    )
  }

  required(): StringField<Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new StringField<Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.defaultAdapter,
      this.instanceOpts,
      {
        ...this.config,
        required: true,
      },
    )
  }

  nullable(): StringField<TOut | null, TIn | null> {
    return new StringField<TOut | null, TIn | null>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      nullable: true,
    })
  }

  default(value: TOut): StringField<TOut, TIn | undefined> {
    return new StringField<TOut, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      hasDefault: true,
      default: value,
    })
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: StringConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: StringConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  unique(): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: StringConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      unique: true,
    })
  }

  index(opts?: { unique?: boolean }): this {
    const Ctor = this.constructor as new (a?: string, b?: InstanceOptions, c?: StringConfig) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      index: opts === undefined ? true : { unique: opts.unique },
    })
  }

  min(value: number, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('min must be a non-negative number')
    }
    return this.clone({
      minLength: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { min_length: opts.message } : {}),
      },
    })
  }

  max(value: number, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('max must be a non-negative number')
    }
    return this.clone({
      maxLength: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { max_length: opts.message } : {}),
      },
    })
  }

  length(value: number, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('length must be a non-negative number')
    }
    return this.clone({
      length: value,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { length: opts.message } : {}),
      },
    })
  }

  regex(re: RegExp, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      regex: { source: re.source, flags: re.flags },
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { regex: opts.message } : {}),
      },
    })
  }

  email(opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      format: 'email',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { format: opts.message } : {}),
      },
    })
  }

  url(opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      format: 'url',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { format: opts.message } : {}),
      },
    })
  }

  uuid(opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      format: 'uuid',
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { format: opts.message } : {}),
      },
    })
  }

  startsWith(prefix: string, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      startsWith: prefix,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { starts_with: opts.message } : {}),
      },
    })
  }

  endsWith(suffix: string, opts?: { message?: MessageValue }): StringField<TOut, TIn> {
    return this.clone({
      endsWith: suffix,
      ruleMessages: {
        ...this.config.ruleMessages,
        ...(opts?.message !== undefined ? { ends_with: opts.message } : {}),
      },
    })
  }

  trim(): StringField<TOut, TIn> {
    return this.clone({ transforms: [...(this.config.transforms ?? []), 'trim'] })
  }

  toLowerCase(): StringField<TOut, TIn> {
    return this.clone({ transforms: [...(this.config.transforms ?? []), 'toLowerCase'] })
  }

  toUpperCase(): StringField<TOut, TIn> {
    return this.clone({ transforms: [...(this.config.transforms ?? []), 'toUpperCase'] })
  }

  coerce(): StringField<TOut, TIn> {
    return this.clone({ coerce: true })
  }

  message(msg: string | FieldMessages): StringField<TOut, TIn> {
    return new StringField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * _parse order: coerce → default substitution → null/undefined handling →
   * invalid_type check (exclusive — short-circuits) → transforms → accumulated rule checks.
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
    if (this.config.coerce && typeof value !== 'string' && value !== null && value !== undefined) {
      value = String(value)
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
    let str = value
    if (this.config.transforms) {
      for (const t of this.config.transforms) {
        if (t === 'trim') str = str.trim()
        else if (t === 'toLowerCase') str = str.toLowerCase()
        else if (t === 'toUpperCase') str = str.toUpperCase()
      }
    }
    const issues: ValidationIssue[] = []
    // I2: abortEarly bails after the first rule failure within this leaf field.
    const bail = () => ctx.abortEarly && issues.length > 0
    if (this.config.length !== undefined && str.length !== this.config.length) {
      issues.push(
        buildIssue(
          'length',
          ctx,
          { length: this.config.length, got: str.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.length,
        ),
      )
      if (bail()) return { value: str, issues }
    }
    if (this.config.minLength !== undefined && str.length < this.config.minLength) {
      issues.push(
        buildIssue(
          'min_length',
          ctx,
          { min: this.config.minLength, got: str.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.min_length,
        ),
      )
      if (bail()) return { value: str, issues }
    }
    if (this.config.maxLength !== undefined && str.length > this.config.maxLength) {
      issues.push(
        buildIssue(
          'max_length',
          ctx,
          { max: this.config.maxLength, got: str.length },
          this.config.fieldMessage,
          this.config.ruleMessages?.max_length,
        ),
      )
      if (bail()) return { value: str, issues }
    }
    if (this.config.regex !== undefined) {
      const re = new RegExp(this.config.regex.source, this.config.regex.flags)
      if (!re.test(str)) {
        issues.push(
          buildIssue(
            'regex',
            ctx,
            { pattern: this.config.regex.source },
            this.config.fieldMessage,
            this.config.ruleMessages?.regex,
          ),
        )
        if (bail()) return { value: str, issues }
      }
    }
    if (this.config.format !== undefined) {
      const ok = formatValidators[this.config.format](str)
      if (!ok) {
        issues.push(
          buildIssue(
            'format',
            ctx,
            { format: this.config.format },
            this.config.fieldMessage,
            this.config.ruleMessages?.format,
          ),
        )
        if (bail()) return { value: str, issues }
      }
    }
    if (this.config.startsWith !== undefined && !str.startsWith(this.config.startsWith)) {
      issues.push(
        buildIssue(
          'starts_with',
          ctx,
          { prefix: this.config.startsWith },
          this.config.fieldMessage,
          this.config.ruleMessages?.starts_with,
        ),
      )
      if (bail()) return { value: str, issues }
    }
    if (this.config.endsWith !== undefined && !str.endsWith(this.config.endsWith)) {
      issues.push(
        buildIssue(
          'ends_with',
          ctx,
          { suffix: this.config.endsWith },
          this.config.fieldMessage,
          this.config.ruleMessages?.ends_with,
        ),
      )
      if (bail()) return { value: str, issues }
    }
    return { value: str, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
