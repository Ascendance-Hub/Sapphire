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
    const min = (ctx as { min?: number }).min
    return `Must have at least ${min} characters`
  },
  union_no_match: 'Value does not match any allowed type',
  unknown_key: (ctx) => {
    const key = (ctx as { key?: string | number }).key
    return `Unknown key: ${String(key)}`
  },
}

export function fallbackMessage(code: IssueCode): string {
  return `Validation error: ${String(code)}`
}
