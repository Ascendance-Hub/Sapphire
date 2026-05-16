# Um schema, muitos adapters

## Caso de uso

Você persiste o seu domínio no MongoDB (via Mongoose) **e** expõe uma API pública REST/MCP cujo contrato você publica como JSON Schema. Ambos devem descrever exatamente o mesmo shape — quando o modelo ganha um field, as duas superfícies devem se atualizar em sincronia, sem ninguém ter de lembrar de editar dois arquivos.

A IR do Sapphire é a única fonte de verdade. Os adapters são funções puras sobre ela; eles não conversam entre si e não mutam estado. Registrar mais de um é justamente o ponto.

## Exemplo de ponta a ponta

```ts
import mongoose from 'mongoose'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

// Register both adapters once.
registerAdapter('mongoose', toMongooseSchema)
registerAdapter('json-schema', toJsonSchema)

const a = new Sapphire()

// Define the schema ONCE.
const Product = a
  .object({
    sku: a.string().regex(/^[A-Z0-9-]{4,16}$/),
    name: a.string().min(1),
    priceCents: a.number().int().min(0),
    tags: a.array(a.string()).default([]),
    archived: a.boolean().default(false),
  })
  .name('Product')
  .timestamps()
  .index(['sku'], { unique: true })

// Adapter #1 — Mongoose for persistence.
const ProductMongoSchema = Product.getSchema('mongoose') as mongoose.Schema
const ProductModel = mongoose.model('Product', ProductMongoSchema)

// Adapter #2 — JSON Schema for the public API contract.
const ProductJsonSchema = toJsonSchema(Product.toSchema(), {
  $id: 'https://api.example.com/schemas/product.json',
  additionalProperties: false,
})

// Both adapters walked the same IR. Sku regex, priceCents min, tags default,
// timestamps, and the unique sku index are all reflected — each adapter as it
// can represent them.
```

## Passo a passo

1. **Registre todo adapter de que você precisa.** `registerAdapter` é global ao processo; faça isso uma vez na inicialização da aplicação. Chamá-lo duas vezes com o mesmo nome lança erro — mantenha os registros fora do código de biblioteca.
2. **Defina o schema uma vez.** Use o DSL de field, dê a ele um `.name(...)` se ele for referenciado ou emitido como uma entrada `$defs` do JSON Schema.
3. **Chame `getSchema(name)` (ou a função explícita do adapter) por consumidor.** Ambas as leituras percorrem `Product.toSchema()` — mesma IR, duas saídas. Não há estado mutável compartilhado entre elas.
4. **Confie na IR como o contrato.** Qualquer field que você adiciona, qualquer modificador que você encadeia, qualquer chamada `.index(...)` atualiza a IR — e as duas saídas a jusante a captam na próxima vez que você as chama.

## Variações

### Escape hatches por adapter no mesmo field

Quando dois adapters precisam de comportamento ligeiramente diferente para o mesmo field, sobreponha chamadas `.adapter(...)`. Cada uma escreve no seu próprio slot em `node.meta`:

```ts
const email = a
  .string()
  .email()
  .adapter('mongoose', { sparse: true, collation: { locale: 'en', strength: 2 } })
  .adapter('json-schema', { examples: ['ada@example.com'], 'x-internal-pii': true })
```

O adapter Mongoose lê `meta.mongoose`, o JSON Schema lê `meta['json-schema']`. Nenhum vê o slot do outro.

Veja [Conceitos → Escape hatch](../concepts/escape-hatch.md) para as tabelas completas de blacklist por adapter.

### Conduzindo o mesmo field por três adapters

```ts
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
registerAdapter('drizzle', toDrizzleSchema)

// Drizzle requires a `dialect` option — call the adapter directly instead of
// going through `getSchema()` (which only accepts an adapter name, no options).
const productPgTable = toDrizzleSchema(Product.toSchema(), { dialect: 'pg' })
```

O mesmo field `Product` agora sustenta Mongo + JSON Schema + Drizzle Postgres. O adapter Drizzle vê a mesma IR; o que não mapeia de forma limpa (por exemplo, `regex` para `sku`) é um no-op no nível do banco — a restrição permanece apenas no `safeParse`. Veja [Adapters → Drizzle](../adapters/drizzle.md).

### Quando NÃO compartilhar um schema

Duas saídas compartilhando um schema só funciona quando **o shape é genuinamente o mesmo**. Se o seu documento Mongo armazena subdocumentos ricos e a API pública só expõe uma projeção plana, force a divisão:

```ts
const ProductDocument = a.object({ /* full shape */ }).name('ProductDocument')
const ProductDTO = a.object({ /* flat projection */ }).name('ProductDTO')

// Map between them in your controller:
function toDTO(doc: Infer<typeof ProductDocument>): Infer<typeof ProductDTO> { ... }
```

Resista à tentação de dobrar um schema para cobrir dois shapes via escape hatches e `.transform`s. Dois schemas com um mapeamento explícito é mais claro e testa de forma limpa.

> [!WARNING]
> **`registerAdapter` é global ao processo.** Dois módulos registrando funções diferentes sob o mesmo nome vão atropelar um ao outro (o segundo vence). Centralize os registros em um único arquivo de bootstrap.

> [!WARNING]
> **Adapters podem discordar sobre o que representam.** Um modificador `.unique()` sobrevive no Mongo (`unique: true`) mas é um no-op no JSON Schema (é uma preocupação de banco de dados, não de contrato). Isso é por design — veja a seção "Limitações" de cada adapter para a lista exaustiva.

## Veja também

- [Conceitos → Visão geral](../concepts/overview.md) — o modelo mental DSL → IR → adapter.
- [Conceitos → Escape hatch](../concepts/escape-hatch.md) — sobrescritas por adapter via `.adapter(name, opts)`.
- [Receitas → Compartilhar tipos com o frontend](./share-types-with-frontend.md) — o irmão de tipo/JSON Schema desta receita.
- [Receitas → Adapter customizado](./custom-adapter.md) — quando os adapters embutidos não bastam.
