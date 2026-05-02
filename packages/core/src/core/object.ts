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
} from '../lib/types'
import { SapphireSchemaNode } from '../schema/types'
import { ObjectInput, ObjectOutput } from '../types/infer'
import { ORM } from '../types/orm'

type ObjectConfig = {
  required: boolean
  fieldMessage?: FieldMessages | string
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
    private readonly defaultOrm?: ORM,
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
    return { kind: 'object', required: this.config.required, properties }
  }

  getSchema(orm?: ORM) {
    return resolveSchema(this.toSchema(), orm, this.defaultOrm)
  }

  optional(): ObjectField<T, TOut | undefined, TIn | undefined> {
    return new ObjectField<T, TOut | undefined, TIn | undefined>(
      this.obj,
      this.defaultOrm,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  message(msg: string | FieldMessages): ObjectField<T, TOut, TIn> {
    return new ObjectField<T, TOut, TIn>(this.obj, this.defaultOrm, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
  }

  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
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
    const issues = []

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
