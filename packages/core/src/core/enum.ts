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

export type EnumValue = string | number

type EnumConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
  // I1: per-rule message for the `enum` issue code (set via `t.enum(values, opts)`).
  ruleMessages?: { enum?: MessageValue }
}

/**
 * Extract enum values from either a `const` tuple (`['a','b'] as const`)
 * or a TS enum object. For TS numeric enums, filters out the reverse
 * mappings (TS generates `{ A: 0, '0': 'A' }` for numeric enums; we keep
 * only the forward direction values).
 */
export function extractEnumValues(input: unknown): EnumValue[] {
  if (Array.isArray(input)) return input.slice() as EnumValue[]
  if (input && typeof input === 'object') {
    const obj = input as Record<string, EnumValue>
    const keys = Object.keys(obj)
    // Reverse-mapped keys are numeric strings (e.g., '0', '1') whose values
    // point back to the enum name. Drop those — keep only forward entries.
    const forwardKeys = keys.filter((k) => !/^\d+$/.test(k))
    return forwardKeys.map((k) => obj[k])
  }
  return []
}

export class EnumField<V extends EnumValue, TOut = V, TIn = V>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly values: ReadonlyArray<V>,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: EnumConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'enum',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      values: this.values,
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  optional(): EnumField<V, TOut | undefined, TIn | undefined> {
    return new EnumField<V, TOut | undefined, TIn | undefined>(
      this.values,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  required(): EnumField<V, Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new EnumField<V, Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.values,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: true },
    )
  }

  nullable(): EnumField<V, TOut | null, TIn | null> {
    return new EnumField<V, TOut | null, TIn | null>(
      this.values,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): EnumField<V, TOut, TIn | undefined> {
    return new EnumField<V, TOut, TIn | undefined>(
      this.values,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      v: ReadonlyArray<V>,
      a?: string,
      b?: InstanceOptions,
      c?: EnumConfig,
    ) => this
    return new Ctor(this.values, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      v: ReadonlyArray<V>,
      a?: string,
      b?: InstanceOptions,
      c?: EnumConfig,
    ) => this
    return new Ctor(this.values, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): EnumField<V, TOut, TIn> {
    return new EnumField<V, TOut, TIn>(this.values, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  /** @internal */
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
    if (!this.values.includes(value as V)) {
      return {
        value,
        issues: [
          buildIssue(
            'enum',
            ctx,
            { values: this.values as readonly unknown[], got: value },
            this.config.fieldMessage,
            this.config.ruleMessages?.enum,
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
