/**
 * Shared "is this a plain object" guard, used by both `ObjectField` and
 * `RecordField`. Rejects arrays, `null`, and exotic objects (Date, Map, Set,
 * RegExp, Promise, class instances) so they fail with a clear `invalid_type`
 * issue instead of being silently coerced into an empty `{}`.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Human-readable tag for an `invalid_type` issue payload. */
export function describeNonObject(value: unknown): string {
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
