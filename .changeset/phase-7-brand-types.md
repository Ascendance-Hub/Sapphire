---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Fase 7 — refatoração de `Field` para brand-types.

Cada field passa a carregar `_output` e `_input` (phantom types). `Infer<F>` e
`InferInput<F>` viram one-liners — sem cascata de tipos condicionais.

**Breaking changes** (lib não publicada — sem migração):

- `getType()` removido de `ObjectField` e `ArrayField`. Use `Infer<typeof x>`.
- `InferSchema` removido. Use `Infer` / `InferInput`.
- Genérico `IsOptional extends boolean` removido de todos os fields. A
  opcionalidade agora é expressa estruturalmente via `undefined extends F['_output']`.

`parse` / `safeParse` foram declarados na interface `Field` mas seguem como
placeholder (`throw new Error('parse: implemented in PHASE_8')`) — implementação
real chega na Fase 8.
