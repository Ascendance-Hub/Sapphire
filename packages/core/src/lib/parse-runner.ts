import type { SafeParseResult, InternalField } from '../interfaces/field'
import { SapphireValidationError } from './validation-error'
import type { InstanceOptions, ParseContext, ParseOptions } from './types'

export function runSafeParse<T>(
  field: InternalField,
  value: unknown,
  opts: ParseOptions | undefined,
  instance: InstanceOptions | undefined,
): SafeParseResult<T> {
  const ctx: ParseContext = {
    path: [],
    abortEarly: opts?.abortEarly ?? instance?.abortEarly ?? false,
    stripUnknown: opts?.stripUnknown ?? instance?.stripUnknown ?? false,
    perCall: opts?.messages,
    instance: instance?.messages,
    namedSchemas: instance?.namedSchemas,
  }
  const result = field._parse(value, ctx)
  if (result.issues.length > 0) {
    return { success: false, error: new SapphireValidationError(result.issues) }
  }
  return { success: true, data: result.value as T }
}

export function runParse<T>(
  field: InternalField,
  value: unknown,
  opts: ParseOptions | undefined,
  instance: InstanceOptions | undefined,
): T {
  const r = runSafeParse<T>(field, value, opts, instance)
  if (!r.success) throw r.error
  return r.data
}
