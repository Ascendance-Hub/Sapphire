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
import { ObjectInput, ObjectOutput } from '../types/infer'

type ObjectConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
  name?: string
}

export class ObjectField<
  T extends Record<string, Field>,
  TOut = ObjectOutput<T>,
  TIn = ObjectInput<T>,
>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly obj: T,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: ObjectConfig = { required: true },
  ) {}

  getObj(): T {
    return this.obj
  }

  toSchema(): SapphireSchemaNode {
    const properties: Record<string, SapphireSchemaNode> = {}
    for (const [key, value] of Object.entries(this.obj)) {
      properties[key] = value.toSchema()
    }
    return {
      kind: 'object',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      ...(this.config.name !== undefined ? { name: this.config.name } : {}),
      properties,
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): ObjectField<T, TOut | undefined, TIn | undefined> {
    return new ObjectField<T, TOut | undefined, TIn | undefined>(
      this.obj,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  nullable(): ObjectField<T, TOut | null, TIn | null> {
    return new ObjectField<T, TOut | null, TIn | null>(
      this.obj,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): ObjectField<T, TOut, TIn | undefined> {
    return new ObjectField<T, TOut, TIn | undefined>(
      this.obj,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      obj: T,
      a?: string,
      b?: InstanceOptions,
      c?: ObjectConfig,
    ) => this
    return new Ctor(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      obj: T,
      a?: string,
      b?: InstanceOptions,
      c?: ObjectConfig,
    ) => this
    return new Ctor(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): ObjectField<T, TOut, TIn> {
    return new ObjectField<T, TOut, TIn>(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /**
   * Registers this schema in the parent Sapphire instance's named registry,
   * making it targetable by `a.ref(...)`. Returns a NEW ObjectField whose IR
   * carries the name. Throws if the name is already registered.
   */
  name(n: string): this {
    const Ctor = this.constructor as new (
      obj: T,
      a?: string,
      b?: InstanceOptions,
      c?: ObjectConfig,
    ) => this
    const next = new Ctor(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      name: n,
    })
    this.instanceOpts?.namedSchemas?.register(n, next as ObjectField<Record<string, Field>>)
    return next
  }

  getName(): string | undefined {
    return this.config.name
  }

  /**
   * _parse order: default substitution → null/undefined handling →
   * invalid_type check (exclusive) → accumulated per-key checks.
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
    if (typeof value !== 'object' || Array.isArray(value)) {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'object', got: Array.isArray(value) ? 'array' : typeof value },
            this.config.fieldMessage,
          ),
        ],
      }
    }

    const v = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    const issues: ValidationIssue[] = []

    for (const [key, child] of Object.entries(this.obj)) {
      const childCtx: ParseContext = { ...ctx, path: [...ctx.path, key] }
      const sub = (child as unknown as InternalField)._parse(v[key], childCtx)
      out[key] = sub.value
      issues.push(...sub.issues)
      if (ctx.abortEarly && issues.length > 0) {
        return { value: out, issues }
      }
    }

    if (!ctx.stripUnknown) {
      for (const key of Object.keys(v)) {
        if (!(key in this.obj)) {
          const keyCtx: ParseContext = { ...ctx, path: [...ctx.path, key] }
          issues.push(buildIssue('unknown_key', keyCtx, { key }, this.config.fieldMessage))
          if (ctx.abortEarly) break
        }
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
