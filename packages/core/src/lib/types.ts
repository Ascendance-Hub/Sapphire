import type { IssueCode } from './issue-codes'
import type { NamedSchemaRegistry } from './named-registry'

export interface MessageContext {
  path: (string | number)[]
  code: IssueCode
  [extra: string]: unknown
}

export type MessageValue = string | object | ((ctx: MessageContext) => string | object)

export type FieldMessages = Partial<Record<IssueCode, MessageValue>>

export interface ValidationIssue {
  path: (string | number)[]
  code: IssueCode
  message: string | object
  context?: Record<string, unknown>
}

export interface ParseOptions {
  messages?: FieldMessages
  abortEarly?: boolean
  stripUnknown?: boolean
}

export interface InstanceOptions {
  messages?: FieldMessages
  abortEarly?: boolean
  stripUnknown?: boolean
  namedSchemas?: NamedSchemaRegistry
}

export interface ParseContext {
  path: (string | number)[]
  abortEarly: boolean
  stripUnknown: boolean
  perCall: FieldMessages | undefined
  instance: FieldMessages | undefined
}

export interface InternalParseResult {
  value: unknown
  issues: ValidationIssue[]
}
