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

type DateConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  unique?: boolean
  index?: boolean | { unique?: boolean }
  fieldMessage?: FieldMessages | string
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
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): DateField<TOut | undefined, TIn | undefined> {
    return new DateField<TOut | undefined, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      required: false,
    })
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
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: DateConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, description: text })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: DateConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  unique(): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: DateConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, unique: true })
  }

  index(opts?: { unique?: boolean }): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: DateConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      index: opts === undefined ? true : { unique: opts.unique },
    })
  }

  message(msg: string | FieldMessages): DateField<TOut, TIn> {
    return new DateField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
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
    if (value instanceof Date) {
      const issues: ValidationIssue[] = []
      return { value, issues }
    }
    if (typeof value === 'string') {
      const d = new Date(value)
      if (isNaN(d.getTime())) {
        return {
          value,
          issues: [
            buildIssue(
              'invalid_type',
              ctx,
              { expected: 'date', got: 'invalid date string' },
              this.config.fieldMessage,
            ),
          ],
        }
      }
      const issues: ValidationIssue[] = []
      return { value: d, issues }
    }
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

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
