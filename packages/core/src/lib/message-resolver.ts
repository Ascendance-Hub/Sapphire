import { defaultMessages, fallbackMessage } from '../messages'
import type { IssueCode } from './issue-codes'
import type { FieldMessages, MessageContext, MessageValue } from './types'

export interface ResolverLayers {
  perCall?: FieldMessages
  perRule?: MessageValue
  field?: FieldMessages | string
  instance?: FieldMessages
}

export function resolveMessage(
  code: IssueCode,
  path: (string | number)[],
  extras: Record<string, unknown>,
  layers: ResolverLayers,
): string | object {
  const fullCtx: MessageContext = { ...extras, path, code }

  const fieldLayer: MessageValue | undefined =
    typeof layers.field === 'string' ? layers.field : layers.field?.[code]

  const candidates: (MessageValue | undefined)[] = [
    layers.perCall?.[code],
    layers.perRule,
    fieldLayer,
    layers.instance?.[code],
    defaultMessages[code],
  ]

  for (const c of candidates) {
    if (c === undefined) continue
    return typeof c === 'function' ? c(fullCtx) : c
  }
  return fallbackMessage(code)
}
