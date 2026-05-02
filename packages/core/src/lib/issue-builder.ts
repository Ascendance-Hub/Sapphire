import type { IssueCode } from './issue-codes'
import { resolveMessage, type ResolverLayers } from './message-resolver'
import type { ParseContext, ValidationIssue, MessageValue, FieldMessages } from './types'

export function buildIssue(
  code: IssueCode,
  ctx: ParseContext,
  extras: Record<string, unknown>,
  fieldMessage: FieldMessages | string | undefined,
  perRule?: MessageValue,
): ValidationIssue {
  const layers: ResolverLayers = {
    perCall: ctx.perCall,
    perRule,
    field: fieldMessage,
    instance: ctx.instance,
  }
  const message = resolveMessage(code, [...ctx.path], extras, layers)
  const issue: ValidationIssue = {
    path: [...ctx.path],
    code,
    message,
  }
  if (Object.keys(extras).length > 0) issue.context = extras
  return issue
}
