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
import { ObjectInput, ObjectOutput } from '../types/infer'

/**
 * S10: plain-object guard for `_parse`. We reject Date/Map/Set/RegExp/Promise/
 * class instances because their `Object.entries` is empty (or surprising), so
 * iterating them against schema keys would silently produce `{}` shaped output
 * with `required` violations for every key — a confusing failure mode that
 * usually masks a caller bug.
 *
 * `Object.create(null)` is allowed (proto is `null`); literal `{...}` objects
 * have `Object.prototype` as proto.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Human-readable tag for an invalid_type issue payload. */
function describeNonObject(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  if (value instanceof Date) return 'date'
  if (value instanceof Map) return 'map'
  if (value instanceof Set) return 'set'
  if (value instanceof RegExp) return 'regexp'
  if (value instanceof Promise) return 'promise'
  if (typeof value === 'object') {
    const ctor = (value as object).constructor
    return ctor && ctor !== Object ? `instance of ${ctor.name}` : typeof value
  }
  return typeof value
}

/** Structural lookup of a field's `.required()` / `.optional()` return type.
 *  Used by `ObjectField.required()` / `partial()` to map each child without
 *  forcing those methods into the `Field` interface contract. */
type RequiredOf<F> = F extends { required(): infer R } ? (R extends Field ? R : F) : F
type OptionalOf<F> = F extends { optional(): infer R } ? (R extends Field ? R : F) : F

type RequiredAll<T extends Record<string, Field>> = {
  [K in keyof T]: RequiredOf<T[K]> extends Field ? RequiredOf<T[K]> : T[K]
}
type PartialAll<T extends Record<string, Field>> = {
  [K in keyof T]: OptionalOf<T[K]> extends Field ? OptionalOf<T[K]> : T[K]
}

type ObjectConfig = {
  required: boolean
  nullable?: boolean
  hasDefault?: boolean
  default?: unknown
  description?: string
  meta?: Record<string, unknown>
  fieldMessage?: FieldMessages | string
  name?: string
  timestamps?: boolean
  indexes?: { keys: string[]; unique?: boolean }[]
  // I1: per-rule message for the `unknown_key` issue code
  // (set via `a.object(shape, opts)`).
  ruleMessages?: { unknown_key?: MessageValue }
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
      ...(this.config.timestamps ? { timestamps: true } : {}),
      ...(this.config.indexes && this.config.indexes.length > 0
        ? { indexes: this.config.indexes.map((i) => ({ ...i })) }
        : {}),
      properties,
    }
  }

  getSchema(name?: string, options?: unknown) {
    return resolveSchema(this.toSchema(), name, this.defaultAdapter, options)
  }

  optional(): ObjectField<T, TOut | undefined, TIn | undefined> {
    return new ObjectField<T, TOut | undefined, TIn | undefined>(
      this.obj,
      this.defaultAdapter,
      this.instanceOpts,
      { ...this.config, required: false },
    )
  }

  /**
   * Returns a new ObjectField where every child field has `.required()`
   * applied (Zod-style "make all keys required"). The object itself is also
   * marked required (`config.required = true`), matching the universal
   * "remove `| undefined`" semantic.
   *
   * Config is preserved otherwise — name/timestamps/indexes/meta/description
   * survive (this is the same conceptual schema, just stricter).
   */
  required(): ObjectField<RequiredAll<T>> {
    const next: Record<string, Field> = {}
    for (const [k, f] of Object.entries(this.obj)) {
      next[k] = (f as unknown as { required(): Field }).required()
    }
    return new ObjectField(next, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      required: true,
    }) as unknown as ObjectField<RequiredAll<T>>
  }

  /**
   * Returns a new ObjectField where every child field has `.optional()`
   * applied (Zod-style "make all keys optional"). The object itself keeps its
   * own `required`/`optional` flag — `partial()` is about children, not about
   * whether the object itself can be `undefined`.
   *
   * Config is preserved (same conceptual schema, just looser).
   */
  partial(): ObjectField<PartialAll<T>> {
    const next: Record<string, Field> = {}
    for (const [k, f] of Object.entries(this.obj)) {
      next[k] = f.optional()
    }
    return new ObjectField(
      next,
      this.defaultAdapter,
      this.instanceOpts,
      this.config,
    ) as unknown as ObjectField<PartialAll<T>>
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
   * Marks the schema as having `createdAt`/`updatedAt` timestamps. Adapters
   * materialize this — Mongo emits `{ timestamps: true }` on the schema,
   * Drizzle adds the columns, JSON Schema documents them. Sapphire core just
   * carries the flag in the IR.
   *
   * Returns a new ObjectField (immutable). Config is preserved otherwise.
   */
  timestamps(): this {
    const Ctor = this.constructor as new (
      obj: T,
      a?: string,
      b?: InstanceOptions,
      c?: ObjectConfig,
    ) => this
    return new Ctor(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      timestamps: true,
    })
  }

  /**
   * Adds a per-collection composite index on the listed keys.
   *
   * Different from field-level `.index()` (which marks ONE column for
   * indexing) — this declares an index across multiple fields, optionally
   * unique. Multiple calls accumulate; each `.index([...])` produces an
   * additional entry in the IR's `indexes` array.
   *
   * Adapters materialize this — Mongo via `schema.index({...}, { unique })`,
   * Drizzle via table-level `.index().on(...)`. JSON Schema has no equivalent
   * and ignores it.
   *
   * Returns a new ObjectField (immutable).
   */
  index(keys: (keyof T & string)[], opts?: { unique?: boolean }): this {
    const newIndex: { keys: string[]; unique?: boolean } = {
      keys: [...keys],
      ...(opts?.unique ? { unique: true } : {}),
    }
    const Ctor = this.constructor as new (
      obj: T,
      a?: string,
      b?: InstanceOptions,
      c?: ObjectConfig,
    ) => this
    return new Ctor(this.obj, this.defaultAdapter, this.instanceOpts, {
      ...this.config,
      indexes: [...(this.config.indexes ?? []), newIndex],
    })
  }

  /**
   * Returns a new ObjectField containing only the listed keys.
   *
   * The new schema has a fresh config (no `name`, no `timestamps`, no
   * `indexes`, no `meta`, no `description`, no field-level message). Only
   * `required` is preserved. Subsets are conceptually new schemas — if you
   * want a name, call `.name(...)` on the result.
   *
   * Pass keys with `as const` for literal-typed inference:
   * `User.pick(['name', 'age'] as const)`.
   */
  pick<K extends readonly (keyof T)[]>(keys: K): ObjectField<Pick<T, K[number]>> {
    const next: Record<string, Field> = {}
    for (const k of keys) {
      const key = k as keyof T
      if (key in this.obj) {
        next[key as string] = this.obj[key]
      }
    }
    return new ObjectField<Pick<T, K[number]>>(
      next as Pick<T, K[number]>,
      this.defaultAdapter,
      this.instanceOpts,
      { required: this.config.required },
    )
  }

  /**
   * Returns a new ObjectField with the listed keys removed.
   *
   * Same config rules as `pick`: only `required` is preserved.
   */
  omit<K extends readonly (keyof T)[]>(keys: K): ObjectField<Omit<T, K[number]>> {
    const exclude = new Set<keyof T>(keys as readonly (keyof T)[])
    const next: Record<string, Field> = {}
    for (const k of Object.keys(this.obj) as (keyof T)[]) {
      if (!exclude.has(k)) {
        next[k as string] = this.obj[k]
      }
    }
    return new ObjectField<Omit<T, K[number]>>(
      next as Omit<T, K[number]>,
      this.defaultAdapter,
      this.instanceOpts,
      { required: this.config.required },
    )
  }

  /**
   * Returns a new ObjectField with additional keys merged in.
   *
   * Conflict resolution: **last wins** — if a key in `shape` already exists
   * in `T`, the incoming definition replaces the original. (Same convention
   * as Zod's `.extend()`.)
   *
   * Config of `this` is preserved (extend is a same-schema operation, just
   * wider). Config of incoming shape's fields lives at the field level and
   * survives intact.
   */
  extend<U extends Record<string, Field>>(shape: U): ObjectField<Omit<T, keyof U> & U> {
    const next = { ...this.obj, ...shape }
    return new ObjectField(
      next,
      this.defaultAdapter,
      this.instanceOpts,
      this.config,
    ) as unknown as ObjectField<Omit<T, keyof U> & U>
  }

  /**
   * Returns a new ObjectField merging another ObjectField's shape into this.
   *
   * Equivalent to `this.extend(other.getObj())` — same last-wins rule, same
   * config-preservation rule. The `other`'s schema-level config (name,
   * timestamps, indexes, description) is **not** copied; only its property
   * shape is merged.
   */
  merge<U extends Record<string, Field>>(other: ObjectField<U>): ObjectField<Omit<T, keyof U> & U> {
    return this.extend(other.getObj())
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
    // S10: reject non-plain objects (Date, Map, Set, RegExp, Promise, class
    // instances, etc.). Previously `typeof value !== 'object' || Array.isArray`
    // let them through and they parsed as empty objects, which was bizarre
    // behavior masking caller bugs.
    if (typeof value !== 'object' || Array.isArray(value) || !isPlainObject(value)) {
      return {
        value,
        issues: [
          buildIssue(
            'invalid_type',
            ctx,
            { expected: 'object', got: describeNonObject(value) },
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
          issues.push(
            buildIssue(
              'unknown_key',
              keyCtx,
              { key },
              this.config.fieldMessage,
              this.config.ruleMessages?.unknown_key,
            ),
          )
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
