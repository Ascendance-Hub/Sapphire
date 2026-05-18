# @ascendance-hub/sapphire-core

## 1.1.0

### Minor Changes

- e6ec4ae: Drizzle adapter: composite primary keys, plus two fixes.
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

## 1.0.0

### Minor Changes

- 34a794d: Fase 10 — novos field types + ArrayField homogêneo + named-schema registry.

  **Breaking changes** (lib não publicada — sem migração):
  - `ArrayField` agora é homogêneo (single-item): `a.array(item)` no lugar de `a.array([item])`. Para semântica antiga use `a.array(a.type().union([...]))` ou `a.tuple([...])`.
  - `TypeField.pick` removido — volta em F11 como `ObjectField.pick(...)`.

  **Novos field types:**
  - `TupleField` — `a.tuple([a.string(), a.number()])` infere `[string, number]`. Issue code novo: `tuple_length`.
  - `LiteralField` — `a.type().literal('admin')` infere literal `'admin'`.
  - `EnumField` — `a.type().enum(['a','b'] as const)` ou `a.type().enum(TSEnum)`. Numeric TS enums: filtro de reverse mapping.
  - `RecordField` — `a.type().record(keyField, valueField)` infere `Record<KeyOut, ValueOut>`.
  - `RefField` — `a.ref(SchemaObjOrName)`. Resolução lazy no `toAdapter`. Em V1 só checa presença; tipo concreto é responsabilidade do adapter.

  **Named-schema registry (Sapphire instance):**
  - `ObjectField.name(string)` registra o schema na instância pai e emite `name` no IR.
  - Duplicates throw imediatamente.
  - Registries são isolados entre instâncias `Sapphire`.
  - `Sapphire.listNamedSchemas()` lista os nomes registrados.

  **IR:**
  - `SapphireSchemaNode` ganha kinds `tuple`, `literal`, `enum`, `record`, `ref`.
  - `array.items` colapsou para `SapphireSchemaNode` único (sem mais união com `[]`).
  - `object` ganha `name?: string`.

  **Mongo adapter:**
  - Mapping conservador para os novos kinds (Mixed/ObjectId/Map). Reescrita profunda fica em F12.

- 42106b3: Fase 11 — composição estilo Zod em `ObjectField` + opções schema-level.

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

- 3fe52c9: Fase 12 — Mongo adapter deep rewrite.

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

- 4caea16: Fase 13 — JSON Schema 2020-12 adapter (novo pacote).

  Novo pacote `@ascendance-hub/sapphire-json-schema` exportando `toJsonSchema`,
  mapeando o IR Sapphire pra JSON Schema 2020-12.

  **Mapping IR → JSON Schema:**
  - Primitivos com vocabulário completo (formats: email/uri/uuid; pattern para
    startsWith/endsWith via escape regex; transforms/coerce no-op).
  - Number `int()` → `type: 'integer'`.
  - Date → `type: 'string', format: 'date-time'`.
  - Object `required[]` derivado de `child.required === true`.
  - Array com minItems/maxItems/length/nonempty.
  - Tuple → `prefixItems` + `items: false` + min/max length.
  - Union → `oneOf`.
  - Literal → `const`.
  - Enum → `type` + `enum: [...]`.
  - Record → `additionalProperties` + `propertyNames` (quando keyField tem
    restrições).
  - Ref → `$ref: '#/$defs/<name>'`. Top-level coleta todos schemas nomeados em
    `$defs` (collector com proteção contra ciclos).

  **Universais:**
  - `default`/`description`/`enum` mapeados diretamente.
  - `nullable` → `type: [<x>, 'null']` (primitivos sem enum) ou
    `oneOf: [original, { type: 'null' }]` (compostos, refs, enums, literals).
  - `unique`/`index`/`timestamps`/`indexes`/`coerce`/`transforms` — no-op
    (documentado).

  **Adapter signature:**
  - `toJsonSchema(node, options?: JsonSchemaAdapterOptions)`.
  - Options: `additionalProperties`, `$id`, `defs`, `emitSchemaUri`.

  **Escape hatch:**
  - `.adapter('json-schema', opts)` lido de `meta['json-schema']`, merge raso
    último-vence, blacklist em `type`/`$ref`.

  **Tests:**
  - AJV 2020 como devDep; round-trips por kind + meta-schema validation.

  **Core:**
  - (sem mudanças de runtime) — bump minor para refletir o novo adapter no grupo
    fixed.

  Auto-register removido — chame `registerAdapter('json-schema', toJsonSchema)`
  explicitamente no entry point.

- 3324207: Fase 14 — Drizzle adapter (novo pacote).

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

- bf9d99b: Reestruturação para monorepo (Fase 6). Pacotes publicáveis em `@ascendance-hub/sapphire-core` e `@ascendance-hub/sapphire-mongo`, build dual ESM+CJS via tsup, versionamento via changesets em fixed group. Sem mudança de API observável.
- 4c48719: Fase 7 — refatoração de `Field` para brand-types.

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

- f74b02b: Fase 8 — API de validação reescrita.

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

- ff3af0c: Fase 9 — vocabulário completo de modifiers + registry string-keyed.

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

- 51e6d32: season-five — pre-1.0 API decisions (S1, S2, S5, I4).

  These lock public-API behaviour ahead of a stable 1.0. See
  `docs/superpowers/specs/2026-05-16-pre-1.0-api-decisions-design.md`.

  **S2 — absent optional keys are omitted from parse output.** Previously an
  optional key absent from the input still appeared in the output as
  `undefined`. It is now omitted, matching Zod and the `Infer` type. A key
  passed explicitly as `undefined`, or one filled by a `default`, is kept.

  **S5 — `.url()` defaults to http/https, with a configurable protocol list.**
  `.url()` validated with `new URL()`, accepting any scheme (`javascript:`,
  `file:`, `mailto:`…). It now accepts only `http`/`https` by default;
  `.url({ protocols: [...] })` widens or narrows the set. The IR string node
  carries the resolved `urlProtocols`; the Mongoose adapter honours it. Core
  exports `isUrl` and `DEFAULT_URL_PROTOCOLS`.

  **I4 — removed the dead `SapphireSchemaNode.message` field.** It was declared
  on the public IR type but never emitted by `toSchema()`.

  **S1 — the adapter registry stays process-global** (documented, no code
  change): adapters are registered once at application startup.

### Patch Changes

- 56b03ae: Fase 15 — Documentação completa.

  Adiciona `/docs` com a estrutura completa de V1_DESIGN §11.2:
  - **Getting Started** — install, primeiro schema, parse/safeParse, primeiro adapter.
  - **Concepts (11 arquivos)** — overview, fields-and-modifiers, inferring-types,
    composition, unions-literals-enums, tuples-vs-arrays, refs-and-relations,
    nullable-vs-optional, validation, config, escape-hatch. Cada um cumpre o
    quality bar §11.3 (paragraph summary + runnable example + full API ref +
    ≥1 pitfall callout + recipe links).
  - **Adapters (3 arquivos)** — long-form docs expandindo READMEs dos pacotes,
    com mapping tables completas (12 IR kinds → output, com caveats), escape
    hatch keys, e known limitations.
  - **Recipes (6 arquivos)** — form-validation, share-types-with-frontend,
    one-schema-many-adapters, custom-adapter, custom-error-messages,
    migrating-from-zod. Estrutura uniforme: use case → end-to-end example →
    step-by-step → variations → see also.
  - **Meta (3 arquivos)** — architecture (com mermaid diagram), design-decisions
    (versão user-facing de V1_DESIGN), contributing (7-step third-party adapter
    guide + repo setup + PR checklist).

  Root `README.md` reescrito em inglês como entry point — pitch, install,
  30-line quickstart, links pra `/docs`, packages table.

  **Snippet drift guard**: 11 novos arquivos em
  `packages/core/tests/docs-examples/` pinam todos os code blocks dos
  concepts. Vitest verifica que compilam e batem com a API real — qualquer
  drift quebra CI.

  Sem mudanças de runtime nos pacotes — bump patch só pra propagar o release
  de docs no grupo fixed.

- b13eb00: npm publish readiness.
  - Precise `exports` maps — per-condition `types` so CJS consumers on
    `moduleResolution: nodenext` resolve `index.d.cts` instead of the ESM
    `index.d.ts`.
  - `publishConfig.access: public` and `engines: { node: ">=20" }` on every
    package.
  - Sourcemaps are no longer generated or shipped (smaller tarballs).
  - The adapters' `peerDependencies` on `@ascendance-hub/sapphire-core` is a real
    range (`>=0.5.0`) instead of `*`.
  - A README for `@ascendance-hub/sapphire-core` and a `LICENSE` file in every
    published package.

- ad51f39: season-five — code review fixes (B1–B4).

  **B1 — `multipleOf` precision.** The float tolerance was scaled by the divisor,
  so a genuine multiple of a large operand was wrongly rejected (`100.2` failed
  `multipleOf(0.1)`). The check now tests whether `n / m` is an integer with a
  tolerance that scales with the quotient's magnitude. Fixed in core's
  `NumberField._parse` and mirrored in the Mongoose adapter's `multipleOf`
  validator.

  **B2 — Drizzle primary-key collision.** When a schema declared its own field at
  the implicit PK name (`id`), the adapter emitted `serial('id').primaryKey()`
  and then let the property loop silently overwrite it, leaving the table with no
  primary key. The user-declared field is now promoted with `.primaryKey()`
  across all three dialects (pg/mysql/sqlite).

  **B3 — Mongoose adapter dropped metadata on containers.** `buildField` skipped
  `applyCommon` for the `array` and nested-`object` cases, silently dropping
  `default` / `description` / the `meta.mongoose` escape hatch on those kinds.
  Both branches now run `applyCommon`.

  **B4 — duplicate `$defs` name detection (JSON Schema).** Shape-changing object
  ops (`extend`/`merge`/`partial`/`required`) keep the schema `name` by design;
  when a named schema and a same-named derived schema both appeared in one tree,
  `collectNamed` kept the first and silently emitted a wrong `$ref` for the rest.
  It now throws a clear error on a genuine collision (the `options.defs` escape
  hatch keeps its documented "tree wins" behaviour).
