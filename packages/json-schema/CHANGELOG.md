# @ascendance-hub/sapphire-json-schema

## 1.2.0

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

### Major Changes

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

- Updated dependencies [34a794d]
- Updated dependencies [42106b3]
- Updated dependencies [3fe52c9]
- Updated dependencies [4caea16]
- Updated dependencies [3324207]
- Updated dependencies [56b03ae]
- Updated dependencies [bf9d99b]
- Updated dependencies [4c48719]
- Updated dependencies [f74b02b]
- Updated dependencies [ff3af0c]
- Updated dependencies [b13eb00]
- Updated dependencies [51e6d32]
- Updated dependencies [ad51f39]
  - @ascendance-hub/sapphire-core@1.0.0
