import { SapphireSchemaNode } from '../schema/types'
import type { InternalParseResult, ParseContext, ParseOptions } from '../lib/types'
import type { SapphireValidationError } from '../lib/validation-error'

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: SapphireValidationError }

export interface Field<TOutput = unknown, TInput = TOutput> {
  readonly _output: TOutput
  readonly _input: TInput

  toSchema(): SapphireSchemaNode
  getSchema(name?: string): unknown

  parse(value: unknown, opts?: ParseOptions): TOutput
  safeParse(value: unknown, opts?: ParseOptions): SafeParseResult<TOutput>

  optional(): Field<TOutput | undefined, TInput | undefined>
  required(): Field<Exclude<TOutput, undefined>, Exclude<TInput, undefined>>
}

/**
 * Internal contract — every field exposes _parse(value, ctx) returning
 * { value, issues }. Used by composite fields (Object/Array/Union) to
 * recurse without going through public safeParse (which would re-wrap).
 */
export interface InternalField {
  _parse(value: unknown, ctx: ParseContext): InternalParseResult
}
