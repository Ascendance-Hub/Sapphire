# Adapter nativo do MongoDB — `@ascendance-hub/sapphire-bson`

O adapter Mongo converte uma IR do Sapphire (`SapphireSchemaNode`) em um
**validador de coleção** do MongoDB — um documento `{ $jsonSchema: ... }` que
você entrega ao driver nativo ao criar ou modificar uma coleção. O próprio
banco de dados então rejeita documentos que não correspondem.

Este é o adapter para usuários do driver `mongodb` puro — sem Mongoose. Se
você usa Mongoose, recorra a [`@ascendance-hub/sapphire-mongoose`](./mongoose.md).

> **Não oficial.** Um adapter da comunidade — não afiliado, patrocinado ou endossado pela MongoDB, Inc.

## Instalação

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-bson
```

`@ascendance-hub/sapphire-core` é uma peer dependency. `mongodb` é uma peer
dependency **opcional** — `toBsonSchema` emite um objeto simples e nunca
importa o driver, então você só precisa do `mongodb` instalado para de fato
criar a coleção.

## Registrando o adapter

O adapter **não é registrado automaticamente**. Chame `registerAdapter` uma
vez no ponto de entrada da sua aplicação:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'

registerAdapter('bson', toBsonSchema)

export const a = new Sapphire({ defaultAdapter: 'bson' })
```

`registerAdapter` é global ao processo. O adapter do Mongoose registra sob o
nome separado `'mongoose'`, então ambos podem coexistir em um processo.

## Início rápido

```ts
import { MongoClient } from 'mongodb'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'
import { a } from './sapphire'

const User = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

const validator = toBsonSchema(User.toSchema())
// → { $jsonSchema: { bsonType: 'object', required: [...], properties: {...} } }

const client = new MongoClient(process.env.MONGO_URL!)
await client.connect()
const db = client.db('app')

await db.createCollection('users', { validator })
// or, on an existing collection:
await db.command({ collMod: 'users', validator })
```

`field.getSchema('bson')` é açúcar para `toBsonSchema(field.toSchema())` uma
vez que o adapter está registrado.

## Mapeamento IR → `$jsonSchema`

`toBsonSchema` percorre a IR e emite a variante de JSON Schema do MongoDB —
`bsonType` em vez de `type`, nomes de tipos BSON, tudo inline (sem `$ref`).

| IR `kind` | Saída `$jsonSchema`                                             | Observações                                                                                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `string`  | `{ bsonType: 'string' }`                                        | `minLength`/`maxLength`/`length` diretos. `regex`/`startsWith`/`endsWith` → `pattern` (múltiplos → `allOf`). `format: email`/`uuid` → `pattern`. `format: url` é descartado (veja Limitações).                                                                                                   |
| `number`  | `{ bsonType: 'number' }` ou `{ bsonType: 'int' }`               | `.int()` → `bsonType: 'int'`; caso contrário `'number'` (casa com int/long/double/decimal). `min`/`max`/`multipleOf` mapeiam diretamente. Limites exclusivos (`.gt()`/`.lt()`) usam a forma draft-4 do JSON Schema — `minimum`/`maximum` mais um booleano `exclusiveMinimum`/`exclusiveMaximum`. |
| `boolean` | `{ bsonType: 'bool' }`                                          |                                                                                                                                                                                                                                                                                                  |
| `date`    | `{ bsonType: 'date' }`                                          |                                                                                                                                                                                                                                                                                                  |
| `object`  | `{ bsonType: 'object', properties, required }`                  | `required` lista toda chave obrigatória; omitido quando vazio. Objetos nomeados (`.name(...)`) são inline — não há `$ref`.                                                                                                                                                                       |
| `array`   | `{ bsonType: 'array', items }`                                  | `minItems`/`maxItems`/`length` diretos.                                                                                                                                                                                                                                                          |
| `tuple`   | `{ bsonType: 'array', items: [...], additionalItems: false }`   | `items` é um array de schemas por posição; `minItems`/`maxItems` fixados ao comprimento da tupla.                                                                                                                                                                                                |
| `union`   | `{ anyOf: [...] }`                                              | Requer MongoDB 5.0+ (quando `$jsonSchema` ganhou `anyOf`).                                                                                                                                                                                                                                       |
| `literal` | `{ enum: [value] }`                                             |                                                                                                                                                                                                                                                                                                  |
| `enum`    | `{ enum: [...values] }`                                         |                                                                                                                                                                                                                                                                                                  |
| `record`  | `{ bsonType: 'object', additionalProperties: <values schema> }` |                                                                                                                                                                                                                                                                                                  |
| `ref`     | `{ bsonType: 'objectId' }`                                      | Uma referência é armazenada como um ObjectId — validadores do lado do servidor são autocontidos, então não há `$ref`.                                                                                                                                                                            |

### Nullable

`a.string().nullable()` eleva o tipo para um array `bsonType` —
`{ bsonType: ['string', 'null'] }`. Um `union`/`literal`/`enum` nullable (que
não tem um `bsonType` simples) é envolvido em `anyOf` com um ramo
`{ bsonType: 'null' }` explícito.

### `description`

`describe(text)` vira a palavra-chave `description` do `$jsonSchema`.

## `_id`

Não há tratamento especial — um `_id` é apenas mais uma propriedade:

- **Declare um field `_id`** e ele é emitido como qualquer outra propriedade (e
  cai em `required` se for obrigatório): `a.object({ _id: a.string(), ... })`.
- **Não declare um `_id`** e o validador não diz nada sobre ele — o MongoDB
  injeta um `_id` do tipo `ObjectId` no lado do servidor como de costume.
- Um `_id` do tipo `a.ref('User')` emite `{ bsonType: 'objectId' }`.

## Escape hatch `.adapter('bson', opts)`

Valores de `.adapter('bson', { ... })` são lidos de `node.meta.bson` e
mesclados no nó emitido, com uma blacklist de chaves que o próprio adapter
calcula:

```ts
const META_BLACKLIST = new Set(['bsonType', 'type', 'required', 'enum', 'properties', 'items'])
```

> [!WARNING]
> **O MongoDB rejeita palavras-chave `$jsonSchema` desconhecidas.** `db.createCollection`
> lança erro se o validador contém uma palavra-chave que ele não reconhece.
> Passe pelo escape hatch apenas chaves que sejam palavras-chave `$jsonSchema`
> válidas (`title`, `minProperties`, `maxProperties`, `patternProperties`, …).

## `BsonValidatorOptions`

O segundo argumento de `toBsonSchema(node, options?)`:

| Opção                  | Padrão      | Efeito                                                                                                                                                                                             |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalProperties` | _(omitido)_ | Quando definido, emite `additionalProperties` em todo schema de objeto. Defina `false` para um validador estrito de shape fechado — o objeto raiz ainda permite o `_id` autoinjetado pelo MongoDB. |

```ts
toBsonSchema(User.toSchema(), { additionalProperties: false })
```

## Documentos tipados — `BsonDoc`

`BsonDoc<F>` é um helper somente de tipo para o `Collection<TSchema>` do
driver nativo:

```ts
import type { Collection } from 'mongodb'
import type { BsonDoc } from '@ascendance-hub/sapphire-bson'

const users: Collection<BsonDoc<typeof User>> = db.collection('users')
```

É um apelido fino sobre o `Infer` do core — o shape do documento é uma
preocupação puramente de nível de tipo, então não há helper de runtime.

## Limitações

> [!WARNING]
> **Um validador de coleção apenas valida.** Ele não transforma a entrada nem
> preenche defaults. `transforms` (`trim`/`toLowerCase`/`toUpperCase`),
> `default(v)`, `coerce()` e as verificações numéricas `finite`/`safe` não têm
> equivalente em `$jsonSchema` e **não** são emitidos. Execute-os no cliente
> via `parse()` / `safeParse()` antes de inserir.

> [!WARNING]
> **`format('url')` não é imposto no lado do servidor.** Não há regex de URL
> exportado; email e uuid viram `pattern`, mas `url` é descartado do
> validador. Valide URLs no cliente via `parse()`.

> [!WARNING]
> **`unique`/`index` não fazem parte do validador.** Um validador `$jsonSchema`
> não consegue declarar índices — crie-os com `db.collection.createIndex(...)`.

> [!WARNING]
> **`union` precisa do MongoDB 5.0+.** `anyOf` em `$jsonSchema` não está
> disponível no MongoDB 4.x.

## Relacionados

- [Adapter Mongoose](./mongoose.md) — o pacote irmão baseado em Mongoose.
- [Fields e modificadores](../concepts/fields-and-modifiers.md) — o que cada kind da IR modela.
- [Refs e relações](../concepts/refs-and-relations.md) — o ciclo de vida de ref entre adapters.
- [Escape hatch](../concepts/escape-hatch.md) — o contrato universal `.adapter(name, opts)`.
- [Receitas → Um schema, muitos adapters](../recipes/one-schema-many-adapters.md).
