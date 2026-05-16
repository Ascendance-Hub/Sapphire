<!-- Code in this guide is verified by tests/docs-examples/escape-hatch.test.ts -->

# Escape hatch — `.adapter(name, opts)`

A superfície central do Sapphire para deliberadamente em "coisas que todo adapter consegue representar de forma razoável". Quando você precisa de algo específico de um backend — um índice `sparse` do Mongoose, um array `examples` do JSON Schema, uma chamada encadeada `.notNull()` do Drizzle — `.adapter(name, opts)` é o escape hatch universal. Os valores que você passa caem em `node.meta[name]` na IR; cada adapter decide como (e se) lê o seu slot.

## Exemplo mínimo

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
import { Sapphire, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()
const name = a
  .string()
  .adapter('mongoose', { sparse: true })
  .adapter('json-schema', { 'x-internal': true })

const node = name.toSchema() as SapphireSchemaNode
// node.meta === { mongoose: { sparse: true }, 'json-schema': { 'x-internal': true } }
```

`.adapter(name, opts)` retorna um novo field (imutável, como todo outro modificador). Chamadas repetidas com o mesmo nome são mescladas.

## Comportamento por adapter

### Mongoose — passagem direta exceto chaves na blacklist

`meta.mongoose` é mesclado **por último** em todo `SchemaTypeDefinition` do Mongoose. Ele vence sobre as opções derivadas pelo Sapphire (por exemplo, você pode sobrescrever `def.minlength`), exceto pela blacklist: `type` e `required` são sempre controlados pelo Sapphire.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const a = new Sapphire()
const user = a.object({
  email: a.string().adapter('mongoose', { sparse: true, collation: { locale: 'en' } }),
})
const schema = toMongooseSchema(user.toSchema()) as mongoose.Schema
const path = schema.path('email') as unknown as {
  options: { sparse?: boolean; collation?: { locale: string }; type: unknown }
}
// path.options.sparse === true
// path.options.collation === { locale: 'en' }
// path.options.type === String  (blacklisted — escape-hatch can't override)
```

Chaves comuns: `sparse`, `collation`, `validate`, `select`, `alias`, `immutable`, sobrescritas de `lowercase`/`uppercase`/`trim`, getters/setters customizados. No nível do schema de objeto (o `.adapter('mongoose', { collection: 'users' })` do objeto), `collection` é honrado para `mongoose.SchemaOptions.collection`.

### Driver nativo do MongoDB — passagem direta para o `$jsonSchema`

`meta.bson` é mesclado **por último** no nó `$jsonSchema` emitido pelo adapter `@ascendance-hub/sapphire-bson`. Sua blacklist é o conjunto de palavras-chave que o próprio adapter calcula — `bsonType`, `type`, `required`, `enum`, `properties`, `items`. Como o MongoDB rejeita palavras-chave `$jsonSchema` desconhecidas, passe apenas as válidas por esse hatch. Veja [Adapters → Mongo](../adapters/bson.md) para a superfície completa.

### JSON Schema — passagem direta com `type` e `$ref` na blacklist

`meta['json-schema']` é mesclado no nó emitido, _depois_ das chaves derivadas pelo Sapphire, com `type` e `$ref` na blacklist (esses são controlados pelo Sapphire — sobrescrevê-los quebra o schema). Útil para `title`, `description` (também exposto via `.describe(...)`), `examples`, `deprecated` e qualquer palavra-chave de extensão `x-*` customizada.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const name = a.string().adapter('json-schema', {
  title: 'User Name',
  examples: ['Ada Lovelace'],
  type: 'integer', // ignored — blacklisted
  $ref: '#/nope', // ignored — blacklisted
})

const out = toJsonSchema(name.toSchema()) as Record<string, unknown>
// out.title === 'User Name'
// out.examples === ['Ada Lovelace']
// out.type === 'string'      (unchanged)
// out.$ref === undefined     (blacklisted)
```

### Drizzle — métodos encadeados, opcionalmente por dialeto

As chaves de `meta.drizzle` são interpretadas como **nomes de métodos a chamar no construtor de coluna**, na ordem de declaração. Os valores controlam como o método é invocado (espelha o comportamento em `packages/drizzle/src/shared/common.ts`):

- `true` → chama sem argumentos (`col.unique()`).
- Um array → espalhado como argumentos (`col.references(...args)`).
- Qualquer outra coisa → passado como o argumento único (`col.default('x')`).

Um método que não existe no tipo da coluna é **silenciosamente ignorado** — isso é intencional (alguns métodos só existem em certos tipos de coluna ou dialetos). O lado ruim é que erros de digitação passam despercebidos; veja a armadilha no fim desta página.

```ts
const user = a.object({
  email: a.string().adapter('drizzle', { unique: true }),
})
```

#### Sub-chaves por dialeto

As sub-chaves `pg`, `mysql` e `sqlite` se aplicam apenas quando o dialeto correspondente é selecionado. As chaves de nível superior continuam se aplicando a todo dialeto.

<!-- from tests/docs-examples/escape-hatch.test.ts -->

```ts
const user = a
  .object({
    name: a.string().adapter('drizzle', {
      pg: { unique: true }, // only when dialect: 'pg'
      mysql: { unique: false }, // only when dialect: 'mysql'
    }),
  })
  .name('users')

const pgTable = toDrizzleSchema(user.toSchema(), {
  dialect: 'pg',
  tables: new DrizzleTableRegistry(),
}) as Record<string, { isUnique?: boolean }>
// pgTable.name.isUnique === true
```

## Armadilhas

> [!WARNING]
> **Valores do escape hatch são mesclados POR ÚLTIMO.** Eles vencem sobre as chaves derivadas pelo Sapphire em todo adapter (exceto pela pequena blacklist de cada adapter — mongoose: `type`/`required`; bson: as palavras-chave `$jsonSchema` que ele calcula; json-schema: `type`/`$ref`). Esta é uma ferramenta afiada: recorra a ela com parcimônia e mantenha testes próximos.

> [!WARNING]
> **O escape hatch do Drizzle ignora silenciosamente nomes de métodos que não reconhece.** Um erro de digitação como `.uniqe` produz um typecheck que passa e uma coluna que silenciosamente não tem a restrição que você pretendia. Sempre verifique as propriedades de runtime da coluna (`isUnique`, `notNull`, etc.) nos testes.

> [!WARNING]
> **O escape hatch do JSON Schema coloca `type` e `$ref` na blacklist.** Tentar sobrescrever qualquer um dos dois é um no-op. Se você precisa de um tipo diferente, descarte o field do Sapphire e emita um objeto cru via `options.defs` na chamada do adapter.

## Relacionados

- [Configuração](./config.md) — `defaultAdapter`, opções de instância.
- [Refs e relações](./refs-and-relations.md) — usa `meta` indiretamente via o registro de schemas nomeados.
- [Receitas → Escrevendo um adapter customizado](../recipes/custom-adapter.md).
