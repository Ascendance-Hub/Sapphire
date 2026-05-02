---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongo': minor
---

Fase 8 — API de validação reescrita.

`parse(value, opts?)` lança `SapphireValidationError`; `safeParse(value, opts?)`
retorna `{ success: true; data } | { success: false; error }`. O erro carrega
um array `issues[]` estruturado com `path`, `code`, `message` e `context`.

**Breaking changes** (lib não publicada — sem migração):

- `validate()` removido de todos os fields. Use `safeParse` ou `parse`.
- `ValidationResult` removido. Use `SafeParseResult<T>`.
- `SapphireValidationError.details` removido. Use `.issues[]`.

**Novidades:**

- `IssueCode` união de códigos built-in (forward-compat, vocabulário cheio para F9).
- `ValidationIssue { path, code, message, context }`.
- Hierarquia de mensagens em 5 níveis: built-in → instance → field → per-rule → per-call (mais específico vence).
- `.message(string | FieldMessages)` modifier em todos os fields.
- Per-rule message: `string.min(3, { message })`.
- `SapphireOptions { messages, abortEarly, stripUnknown }` propagados aos fields.
- `ParseOptions` por chamada sobrescreve a instância.
- `stripUnknown` em ObjectField (default `false` → emite `unknown_key`).
- `abortEarly` corta na primeira issue (default `false`).
- Mensagens podem ser `string | object | (ctx: MessageContext) => string | object`.
