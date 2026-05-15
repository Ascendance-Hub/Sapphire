import type { ValidationIssue } from './types'

/**
 * Flattened view of a validation error — convenient for form rendering.
 *
 * - `formErrors`: messages from issues with an empty path (errors on the
 *   root value itself).
 * - `fieldErrors`: messages grouped by the top-level path segment.
 */
export interface FlattenedError {
  formErrors: string[]
  fieldErrors: Record<string, string[]>
}

/**
 * Recursive view mirroring the validated value's shape. Every level carries
 * an `_errors` array; nested keys/indices appear as nested `FormattedError`
 * nodes. Convenient for surfacing per-field errors in nested DTOs.
 */
export interface FormattedError {
  _errors: string[]
  [key: string]: FormattedError | string[]
}

function messageToString(message: string | object): string {
  return typeof message === 'string' ? message : JSON.stringify(message)
}

export class SapphireValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(`Validation failed (${issues.length} issue${issues.length === 1 ? '' : 's'})`)
    this.name = 'SapphireValidationError'
    this.issues = issues
  }

  /**
   * Groups issues into root-level (`formErrors`) and per-top-level-field
   * (`fieldErrors`) buckets. The key for a field error is the first path
   * segment, coerced to string.
   */
  flatten(): FlattenedError {
    const formErrors: string[] = []
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of this.issues) {
      const msg = messageToString(issue.message)
      if (issue.path.length === 0) {
        formErrors.push(msg)
        continue
      }
      const key = String(issue.path[0])
      ;(fieldErrors[key] ??= []).push(msg)
    }
    return { formErrors, fieldErrors }
  }

  /**
   * Builds a tree mirroring the input shape. Each node has an `_errors`
   * array; the issue's message lands at the node addressed by its full path.
   */
  format(): FormattedError {
    const root: FormattedError = { _errors: [] }
    for (const issue of this.issues) {
      const msg = messageToString(issue.message)
      let node = root
      for (const segment of issue.path) {
        const key = String(segment)
        const existing = node[key]
        if (existing === undefined || Array.isArray(existing)) {
          const child: FormattedError = { _errors: [] }
          node[key] = child
          node = child
        } else {
          node = existing
        }
      }
      node._errors.push(msg)
    }
    return root
  }

  /** Serialization-safe shape — messages are already resolved eagerly. */
  toJSON(): { name: string; message: string; issues: ValidationIssue[] } {
    return { name: this.name, message: this.message, issues: this.issues }
  }
}
