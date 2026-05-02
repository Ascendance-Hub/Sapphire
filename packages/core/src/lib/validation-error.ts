import type { ValidationIssue } from './types'

export class SapphireValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(`Validation failed (${issues.length} issue${issues.length === 1 ? '' : 's'})`)
    this.name = 'SapphireValidationError'
    this.issues = issues
  }
}
