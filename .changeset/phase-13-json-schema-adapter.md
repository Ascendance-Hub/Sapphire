---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-json-schema': major
---

Fase 13 — JSON Schema 2020-12 adapter (novo pacote).

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
