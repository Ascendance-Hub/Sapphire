---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Fase 11 — composição estilo Zod em `ObjectField` + opções schema-level.

**ObjectField composition:**

- `pick(keys)` / `omit(keys)` — subset/exclusão tipados via `as const`.
  Retornam config virgem (sem `name`/`timestamps`/`indexes`/`meta`/`description`);
  apenas `required` é preservado. Subsets são novos schemas conceitualmente.
- `partial()` — aplica `.optional()` em cada child. Preserva config.
- `required()` (recursivo) — aplica `.required()` em cada child + flip
  `config.required = true`. Preserva config. **Substitui o `required()` universal
  introduzido em B+C** — ver "Mudança no contrato `Field`" abaixo.
- `extend(shape)` / `merge(other)` — adiciona keys com **last wins** em
  conflito. Preservam config de `this`; `merge` não copia config de `other`.

**Schema-level options:**

- `timestamps()` — flag no IR object (`{ timestamps: true }`). Adapters
  materializam (Mongo: schema option; Drizzle: colunas; JSON Schema: noop).
- `index(keys, opts?)` — composite indexes per collection. Múltiplas chamadas
  acumulam em `indexes: []`. Diferente do field-level `.index()` (single column).

**Universal `Field.required()`:**

- Implementado em todos os 12 fields (string, number, boolean, date, object,
  array, union, tuple, literal, enum, record, ref).
- Padrão: `field.optional().required()` round-trip volta ao tipo original.

**Mudança no contrato `Field`:**

- `required()` foi **removido do interface `Field`** (estava em B+C). Motivo:
  `ObjectField.required()` precisa retornar tipo baseado em `T` transformado
  (`{ [K]: T[K]['required']() }`), incompatível com
  `Field<Exclude<TOut, undefined>, ...>`. Cada field continua expondo
  `required()` por convenção; via referência genérica `Field`, narrow primeiro.

**IR:**

- `SapphireSchemaNode` `object` ganha `timestamps?: boolean` e
  `indexes?: { keys: string[]; unique?: boolean }[]`.
- `array.items` colapsado para `SapphireSchemaNode` único (legacy multi-item
  já não usado pelo runtime desde F10 — só limpando o tipo).

**Mongo adapter:** continua compilando — materialização de
`timestamps`/`indexes` fica em F12.
