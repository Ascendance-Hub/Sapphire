---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-bson': minor
'@ascendance-hub/sapphire-mongoose': minor
'@ascendance-hub/sapphire-json-schema': minor
'@ascendance-hub/sapphire-drizzle': minor
---

Drizzle adapter: composite primary keys, plus two fixes.

- The `primaryKey` adapter option now accepts a `string[]` — it emits a
  table-level composite `PRIMARY KEY(...)` (no implicit `id` column). Every name
  must be a declared field, and at least two are required.
- Fix: a column `.default(true)` was silently dropped. `applyCommon` routed the
  default through the `callChain` helper, whose `args === true` branch means
  "call the method with no arguments" (the escape-hatch convention), so
  `default(true)` became `default()`. The default value is now passed directly.
- Fix: the MySQL implicit primary key is now `int autoincrement`, not `serial`
  (`bigint unsigned`). A `serial` PK mismatched the `int` type of `ref` foreign
  key columns and broke foreign keys into implicit-PK tables (MySQL errno 150).
