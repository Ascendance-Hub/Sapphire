import { SapphireSchemaNode } from '../schema/types'
import { ORM } from '../types/orm'

export interface ValidationResult {
  value: unknown
  error?: string
}

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: unknown }

export interface Field<TOutput = unknown, TInput = TOutput> {
  readonly _output: TOutput
  readonly _input: TInput

  toSchema(): SapphireSchemaNode
  getSchema(orm?: ORM): unknown
  validate(value: unknown): ValidationResult

  parse(value: unknown): TOutput
  safeParse(value: unknown): SafeParseResult<TOutput>

  optional(): Field<TOutput | undefined, TInput | undefined>
}
