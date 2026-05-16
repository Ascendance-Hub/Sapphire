---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Fase 9 — vocabulário completo de modifiers + registry string-keyed.

**Breaking changes** (lib não publicada — sem migração):

- `ORM` enum removido. Registry agora é string-keyed: `registerAdapter('mongo', ...)` / `defaultAdapter: 'mongo'`.
- `defaultOrm` em `SapphireOptions` renomeado para `defaultAdapter`.
- `getSchema(orm?)` agora `getSchema(name?: string)`.
- `SapphireSchemaNode` migrado para v2 com `NodeBase` compartilhado e campos `nullable`, `default`, `description`, `unique`, `index`, `enum`, `meta`, `message`.

**Modifiers universais** (em todos os 7 fields aplicáveis):

- `nullable()`, `default(v)`, `describe(text)`, `adapter(name, opts)`.
- `unique()` em String/Number/Date.
- `index(opts?)` em String/Number/Date/Boolean.

**Vocabulário por field:**

- String: `max`, `length`, `regex`, `email`, `url`, `uuid`, `startsWith`, `endsWith`, `trim`, `toLowerCase`, `toUpperCase`, `coerce`.
- Number: `max`, `gt`, `gte`, `lt`, `lte`, `int`, `positive`, `negative`, `nonnegative`, `nonpositive`, `multipleOf`, `finite`, `safe`, `coerce`.
- Date: `min`, `max`, `coerce`.
- Boolean: `coerce`.
- Array: `min`, `max`, `length`, `nonempty`.

**Outros:**

- `_parse` acumula múltiplas issues por field (`invalid_type` continua exclusivo).
- Default messages para todos os IssueCodes emitidos.
- Adapter mongo expandido: `unique`, `index`, `default`, `enum`, string `length`/`maxlength`/`regex`, number/date `min`/`max` (mapping mínimo — vocabulário restante deferido a F12).
- `listAdapters()` exposto pelo registry.
