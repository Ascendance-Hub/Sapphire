---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongo': minor
---

Fase 10 — novos field types + ArrayField homogêneo + named-schema registry.

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
