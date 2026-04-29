export interface ValidationResult {
  value: any
  error?: string
}

export interface Field {
  getSchema(): any
  validate(value: any): ValidationResult
}
