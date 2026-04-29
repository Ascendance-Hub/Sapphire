export class RubyValidationError extends Error {
  public readonly details: Record<string, string>
  constructor(details: Record<string, string>) {
    super('Validation failed')
    this.details = details
    this.name = 'RubyValidationError'
  }
}
