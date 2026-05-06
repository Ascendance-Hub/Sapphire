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

type RecordConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
}

type RecordKey<K extends Field> = K['_output'] extends string | number ? K['_output'] : string
type RecordKeyIn<K extends Field> = K['_input'] extends string | number ? K['_input'] : string

export class RecordField<
  K extends Field,
  V extends Field,
  TOut = Record<RecordKey<K>, V['_output']>,
  TIn = Record<RecordKeyIn<K>, V['_input']>,
>
  implements Field<TOut, TIn>, InternalField
{
  declare readonly _output: TOut
  declare readonly _input: TIn

  constructor(
    private readonly keyField: K,
    private readonly valueField: V,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: RecordConfig = { required: true },
  ) {}

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'record',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      keys: this.keyField.toSchema(),
      values: this.valueField.toSchema(),
    }
  }

  getSchema(name?: string) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter)
  }

  optional(): RecordField<K, V, TOut | undefined, TIn | undefined> {
    return new RecordField<K, V, TOut | undefined, TIn | undefined>(
      this.keyField,
      this.valueField,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  required(): RecordField<K, V, Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new RecordField<K, V, Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.keyField,
      this.valueField,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: true },
    )
  }

  nullable(): RecordField<K, V, TOut | null, TIn | null> {
    return new RecordField<K, V, TOut | null, TIn | null>(
      this.keyField,
      this.valueField,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): RecordField<K, V, TOut, TIn | undefined> {
    return new RecordField<K, V, TOut, TIn | undefined>(
      this.keyField,
      this.valueField,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      k: K,
      v: V,
      a?: string,
      b?: InstanceOptions,
      c?: RecordConfig,
    ) => this
    return new Ctor(this.keyField, this.valueField, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      k: K,
      v: V,
      a?: string,
      b?: InstanceOptions,
      c?: RecordConfig,
    ) => this
    return new Ctor(this.keyField, this.valueField, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): RecordField<K, V, TOut, TIn> {
    return new RecordField<K, V, TOut, TIn>(
      this.keyField,
      this.valueField,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, fieldMessage: msg },
    )
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

    for (const [key, entryValue] of Object.entries(v)) {
      const entryCtx: ParseContext = { ...ctx, path: [...ctx.path, key] }
      const keySub = (this.keyField as unknown as InternalField)._parse(key, entryCtx)
      issues.push(...keySub.issues)
      const valSub = (this.valueField as unknown as InternalField)._parse(entryValue, entryCtx)
      issues.push(...valSub.issues)
      out[String(keySub.value ?? key)] = valSub.value
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
