---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongoose': major
---

Fase 12 — Mongo adapter deep rewrite.

**Breaking (mongo):**

- `toMongoSchema(objectNode)` agora retorna `mongoose.Schema` (não plain
  definition) para top-level object. Subnodes continuam retornando
  `SchemaTypeDefinition`.
- Subdocs nested usam `_id: false` por default (deviation de Mongoose, que
  default é `true`). Use `toMongoSchema(node, { subdocId: true })` para
  reabilitar.
- Auto-registration removida — chame
  `registerAdapter('mongo', toMongoSchema)` explicitamente no entry point da
  app. Em tests, registrar via vitest setupFile (ver
  `packages/mongo/tests/_setup.ts` como referência).

**Novo (mongo):**

- Schema-level: `ObjectField.timestamps()` materializa
  `new Schema(def, { timestamps: true })`. `ObjectField.index(keys, opts)`
  materializa via `schema.index({ ...keys: 1 }, opts)`.
- String: `format` (email/url/uuid via `formatValidators`),
  `startsWith`/`endsWith` via custom validate, `transforms`
  (trim/lowercase/uppercase) via flags nativas Mongoose.
- Number: `exclusiveMin`/`exclusiveMax`/`int`/`multipleOf`/`finite`/`safe`
  via `validate: [...]`.
- Tuple: `[Mixed]` com validate de length (per-position type-checking
  permanece no core via `safeParse`).
- Record: `Map` com `of` quando keyField é string/enum/literal; fallback
  `Mixed` para keyField numérico ou outros.
- Universais: `description` preservada em `SchemaType.options`. `meta.mongo`
  escape hatch lido em todo node, com merge último-vence e blacklist em
  `type`/`required`. `meta.mongo.collection` (top-level) → `Schema.options.collection`.
- `MongoAdapterOptions` exportado: `{ subdocId?: boolean }`.

**Core:**

- `formatValidators` exportado em `@ascendance-hub/sapphire-core`
  (email/url/uuid). `StringField` consome o helper; mongo adapter também
  consome (sem duplicação de regex).
- `EMAIL_RE`, `UUID_RE`, e tipo `StringFormat` também re-exportados.

**Docs:**

- `packages/mongo/README.md` cobre install + registerAdapter pattern +
  mapping table por IR kind + `meta.mongo` keys + limitações conhecidas.

**Tests:**

- Cinco arquivos novos no mongo (schema-level, string-format,
  number-validators, tuple-record, escape-hatch). `mongo.test.ts` e
  `mongoose.integration.test.ts` atualizados pra nova assinatura. Tests de
  bugs do core (`object-optional`, `schema-idempotent`) migrados de
  `getSchema()` para `toSchema()` (IR), pois a saída do adapter agora é
  uma instância circular.
