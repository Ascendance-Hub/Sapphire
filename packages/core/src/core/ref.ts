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
import type { ObjectField } from './object'

type RefConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
}

/**
 * RefField is a placeholder for "this position holds a reference to another
 * named schema". Validation in V1 only checks presence — adapters resolve the
 * target shape (Mongo: ObjectId; JSON Schema: $ref).
 *
 * Two creation modes:
 * - `a.ref(SchemaObj)` — typesafe, requires `SchemaObj.name(...)` to have been called.
 * - `a.ref('TargetName')` — string, lazy resolution at adapter time.
 */
export class RefField<TOut = unknown, TIn = unknown> implements Field<TOut, TIn>, InternalField {
  declare readonly _output: TOut
  declare readonly _input: TIn

  private readonly targetName: string

  constructor(
    target: ObjectField<Record<string, Field>> | string,
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
    private readonly config: RefConfig = { required: true },
  ) {
    if (typeof target === 'string') {
      this.targetName = target
    } else {
      const name = (target as { getName?: () => string | undefined }).getName?.()
      if (!name) {
        throw new Error('a.ref(schema) requires schema.name(...) to be set first')
      }
      this.targetName = name
    }
  }

  toSchema(): SapphireSchemaNode {
    return {
      kind: 'ref',
      required: this.config.required,
      ...(this.config.nullable ? { nullable: true } : {}),
      ...(this.config.hasDefault ? { default: this.config.default } : {}),
      ...(this.config.description !== undefined ? { description: this.config.description } : {}),
      ...(this.config.meta ? { meta: this.config.meta } : {}),
      target: this.targetName,
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  getTarget(): string {
    return this.targetName
  }

  optional(): RefField<TOut | undefined, TIn | undefined> {
    return new RefField<TOut | undefined, TIn | undefined>(
      this.targetName,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  required(): RefField<Exclude<TOut, undefined>, Exclude<TIn, undefined>> {
    return new RefField<Exclude<TOut, undefined>, Exclude<TIn, undefined>>(
      this.targetName,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: true },
    )
  }

  nullable(): RefField<TOut | null, TIn | null> {
    return new RefField<TOut | null, TIn | null>(
      this.targetName,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, nullable: true },
    )
  }

  default(value: TOut): RefField<TOut, TIn | undefined> {
    return new RefField<TOut, TIn | undefined>(
      this.targetName,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, hasDefault: true, default: value },
    )
  }

  describe(text: string): this {
    const Ctor = this.constructor as new (
      t: string,
      a?: string,
      b?: InstanceOptions,
      c?: RefConfig,
    ) => this
    return new Ctor(this.targetName, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      description: text,
    })
  }

  adapter(name: string, opts: unknown): this {
    const Ctor = this.constructor as new (
      t: string,
      a?: string,
      b?: InstanceOptions,
      c?: RefConfig,
    ) => this
    return new Ctor(this.targetName, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      meta: { ...(this.config.meta ?? {}), [name]: opts },
    })
  }

  message(msg: string | FieldMessages): RefField<TOut, TIn> {
    return new RefField<TOut, TIn>(this.targetName, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      fieldMessage: msg,
    })
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
    return { value, issues: [] }
  }

  parse(value: unknown, opts?: ParseOptions): TOut {
    return runParse<TOut>(this, value, opts, this.instanceOpts)
  }

  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOut> {
    return runSafeParse<TOut>(this, value, opts, this.instanceOpts)
  }
}
