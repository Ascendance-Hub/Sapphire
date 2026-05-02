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

type BooleanConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  index?: boolean | { unique?: boolean }
  fieldMessage?: FieldMessages | string
}

export class BooleanField<TOut = boolean, TIn = boolean>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: BooleanConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'boolean',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.index !== undefined ? { index: this.config.index } : {}),
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): BooleanField<TOut | undefined, TIn | undefined> {
    return new BooleanField<TOut | undefined, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      required: false,
    })
  }

  nullable(): BooleanField<TOut | null, TIn | null> {
    return new BooleanField<TOut | null, TIn | null>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      nullable: true,
    })
  }

  default(value: TOut): BooleanField<TOut, TIn | undefined> {
    return new BooleanField<TOut, TIn | undefined>(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      hasDefault: true,
      default: value,
    })
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: BooleanConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, { ...this.config, description: text })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: BooleanConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  index(opts?: { unique?: boolean }): this {
    const Ctor = this.constructor as new (
      a?: string,
      b?: InstanceOptions,
      c?: BooleanConfig,
    ) => this
    return new Ctor(this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      index: opts === undefined ? true : { unique: opts.unique },
    })
  }

  message(msg: string | FieldMessages): BooleanField<TOut, TIn> {
    return new BooleanField<TOut, TIn>(this.defaultAdapter, this.instanceOpts, {
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
    if (typeof value !== 'boolean') {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'boolean', got: Array.isArray(value) ? 'array' : typeof value },
            this.config.fieldMessage,
          ),
        ],
      }
    }
    const issues: ValidationIssue[] = []
    return { value, issues }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
