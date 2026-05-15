import type { IssueCode } from './lib/issue-codes'
import type { FieldMessages } from './lib/types'

export const defaultMessages: FieldMessages = {
  required: 'Field is required',
  invalid_type: (ctx) => {
    const expected = (ctx as { expected?: string }).expected ?? 'value'
    const got = (ctx as { got?: string }).got ?? 'unknown'
    return `Expected ${expected}, got ${got}`
  },
  min_length: (ctx) => {
    const min = (ctx as unknown as { min?: number }).min
    return `Must have at least ${min} characters`
  },
  max_length: (ctx) => {
    const max = (ctx as unknown as { max?: number }).max
    return `Must have at most ${max} characters`
  },
  length: (ctx) => {
    const length = (ctx as unknown as { length?: number }).length
    return `Must have exactly ${length} characters`
  },
  regex: 'Does not match required pattern',
  format: (ctx) => {
    const format = (ctx as unknown as { format?: string }).format
    return `Must be a valid ${format}`
  },
  starts_with: (ctx) => {
    const prefix = (ctx as unknown as { prefix?: string }).prefix
    return `Must start with "${prefix}"`
  },
  ends_with: (ctx) => {
    const suffix = (ctx as unknown as { suffix?: string }).suffix
    return `Must end with "${suffix}"`
  },
  min: (ctx) => {
    const min = (ctx as unknown as { min?: number }).min
    return `Must be ≥ ${min}`
  },
  max: (ctx) => {
    const max = (ctx as unknown as { max?: number }).max
    return `Must be ≤ ${max}`
  },
  gt: (ctx) => {
    const exclusiveMin = (ctx as unknown as { exclusiveMin?: number }).exclusiveMin
    return `Must be > ${exclusiveMin}`
  },
  gte: (ctx) => {
    const min = (ctx as unknown as { min?: number }).min
    return `Must be ≥ ${min}`
  },
  lt: (ctx) => {
    const exclusiveMax = (ctx as unknown as { exclusiveMax?: number }).exclusiveMax
    return `Must be < ${exclusiveMax}`
  },
  lte: (ctx) => {
    const max = (ctx as unknown as { max?: number }).max
    return `Must be ≤ ${max}`
  },
  int: 'Must be an integer',
  multiple_of: (ctx) => {
    const multipleOf = (ctx as unknown as { multipleOf?: number }).multipleOf
    return `Must be a multiple of ${multipleOf}`
  },
  finite: 'Must be finite',
  safe: 'Must be a safe integer',
  min_items: (ctx) => {
    const min = (ctx as unknown as { min?: number }).min
    return `Must have at least ${min} items`
  },
  max_items: (ctx) => {
    const max = (ctx as unknown as { max?: number }).max
    return `Must have at most ${max} items`
  },
  items_length: (ctx) => {
    const length = (ctx as unknown as { length?: number }).length
    return `Must have exactly ${length} items`
  },
  enum: (ctx) => {
    const values = (ctx as unknown as { values?: unknown[] }).values ?? []
    return `Must be one of: ${values.join(', ')}`
  },
  literal: (ctx) => {
    const expected = (ctx as unknown as { expected?: unknown }).expected
    return `Must be exactly ${JSON.stringify(expected)}`
  },
  tuple_length: (ctx) => {
    const expected = (ctx as unknown as { expected?: number }).expected
    const got = (ctx as unknown as { got?: number }).got
    return `Tuple must have exactly ${expected} elements (got ${got})`
  },
  union_no_match: 'Value does not match any allowed type',
  unknown_key: (ctx) => {
    const key = (ctx as { key?: string | number }).key
    return `Unknown key: ${String(key)}`
  },
  ref_target_missing: (ctx) => {
    const target = (ctx as unknown as { target?: string }).target
    return `Reference target "${String(target)}" is not registered on this Sapphire instance`
  },
}

export function fallbackMessage(code: IssueCode): string {
  return `Validation error: ${String(code)}`
}
