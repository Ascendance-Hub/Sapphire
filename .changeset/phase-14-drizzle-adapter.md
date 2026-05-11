---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-drizzle': major
---

Fase 14 — Drizzle adapter (novo pacote).

Novo pacote `@ascendance-hub/sapphire-drizzle` exportando `toDrizzleSchema` e
`DrizzleTableRegistry`, mapeando o IR Sapphire para tabelas Drizzle nos três
dialetos suportados (pg/mysql/sqlite).

**Assinatura:**

- `toDrizzleSchema(node, { dialect, tableName?, primaryKey?, tables? })` com
  overloads por dialect (`'pg' | 'mysql' | 'sqlite'`). Retorno tipado como
  `any` por overload — o tipo exato `*TableWithColumns` do Drizzle não é
  exportado de forma estável ao longo do range `^0.44 || ^0.45`.
- `DrizzleTableRegistry` exportado para resolver refs cruzadas (lazy via
  callback do `references()` do Drizzle).
- Aceita apenas `kind: 'object'` no top-level (Drizzle só emite tabelas).

**Mapping IR → coluna:**

- **pg:** `text` / `integer` / `doublePrecision` / `boolean` /
  `timestamp({ withTimezone: true, mode: 'date' })` / `uuid` / `jsonb` /
  `serial` (PK).
- **mysql:** `varchar(length: maxLength ?? 255)` / `int` / `double` / `boolean` /
  `datetime({ mode: 'date' })` / `json` / `serial` (PK).
- **sqlite:** `text` / `integer` / `real` / `integer({ mode: 'boolean' })` /
  `integer({ mode: 'timestamp' })` / `text({ mode: 'json' })` / `integer().primaryKey({ autoIncrement: true })`.
- Refs → `integer(name).references(() => target[pk])` lazy via registry,
  consistente nos três dialetos.
- Composite kinds (array/tuple/union/record/nested object) → `jsonb` (pg) /
  `json` (mysql) / `text({ mode: 'json' })` (sqlite). Validação DB-side
  perdida — validação runtime permanece no `safeParse` do core (documentado).

**Universais:**

- `required && !nullable` → `.notNull()`.
- `default` → `.default(v)`.
- `unique` → `.unique()`.
- PK implícita `id` (configurável via `options.primaryKey`: string custom ou
  `false` para desabilitar).
- Composite indexes do `node.indexes` IR → callback array-form do 3º arg de
  `pgTable`/`mysqlTable`/`sqliteTable` (`(t) => [...]`). Nomes seguem
  `${tableName}_idx_${i}`.

**Escape hatch:**

- `.adapter('drizzle', { <method>: args, pg: {...}, mysql: {...}, sqlite: {...} })`.
- Top-level keys aplicam em qualquer dialect; sub-keys de dialect só no match.
- Métodos ausentes na coluna são silenciosamente ignorados (permite scripts
  cross-dialect sem erros).

**Tests:**

- Cobertura por dialect: primitives, composite fallback, refs (incluindo
  cycle User ↔ Post), indexes/uniques.
- FK walk via `getTableConfig(table).foreignKeys[i].reference()` por dialect.
- Index walk via `getTableConfig(table).indexes[i].config.{ name, columns, unique }`.
- Type tests via `expectTypeOf` (`vitest`) validando overloads + `@ts-expect-error`
  pra dialect inválido.

**Core:**

- (sem mudanças de runtime) — bump minor para refletir o novo adapter no
  grupo fixed.

Auto-register removido (consistente com F12/F13) — chame
`registerAdapter('drizzle', toDrizzleSchema)` explicitamente.
