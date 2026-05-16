# Adapter Mongoose — `@ascendance-hub/sapphire-mongoose`

O adapter Mongoose converte uma IR do Sapphire (`SapphireSchemaNode`) em um `mongoose.Schema` (quando o nó raiz é um objeto) ou um `SchemaTypeDefinition` (em qualquer outro lugar). É a correspondência mais próxima do estilo de modelagem do Sapphire — o Mongoose tem uma superfície "schema-como-definição" semelhante — e é o adapter onde mais modificadores sobrevivem no nível do banco de dados.

> **Não oficial.** Um adapter da comunidade — não afiliado, patrocinado ou endossado pelo projeto Mongoose ou pela Automattic, Inc.

## Instalação

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongoose mongoose
```

Tanto `@ascendance-hub/sapphire-core` quanto `mongoose` são **peer dependencies**. O pacote não as trará transitivamente — instale-as junto.

## Registrando o adapter

O adapter **não é registrado automaticamente**. Chame `registerAdapter` uma vez no ponto de entrada da sua aplicação — tipicamente o mesmo módulo que constrói a sua instância `Sapphire`:

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

registerAdapter('mongoose', toMongooseSchema)

export const a = new Sapphire({ defaultAdapter: 'mongoose' })
```

`registerAdapter` é global ao processo. Chamá-lo duas vezes com o mesmo nome lança erro; chamá-lo de uma biblioteca é desencorajado — deixe isso para a aplicação consumidora.

## Início rápido

```ts
import mongoose from 'mongoose'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { a } from './sapphire'

const User = a
  .object({
    name: a.string().min(1),
    email: a.string().email().unique(),
    age: a.number().int().min(0).optional(),
  })
  .name('User')
  .timestamps()
  .index(['email'], { unique: true })

const UserSchema = User.getSchema('mongoose') as mongoose.Schema
const UserModel = mongoose.model('User', UserSchema)
```

`field.getSchema('mongoose')` é açúcar para `toMongooseSchema(field.toSchema())` uma vez que o adapter está registrado — a segunda é a forma explícita quando você quer pular o registro.

## Mapeamento IR → Mongoose

Todo `kind` da IR do Sapphire aterrissa em algum lugar do `SchemaTypeDefinition` do Mongoose. A tabela abaixo é exaustiva — o que não está coberto aqui não faz parte da superfície do adapter.

| IR `kind`                      | Saída Mongoose                                           | Observações                                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`                       | `{ type: String, ... }`                                  | `minLength`/`maxLength`/`length` → `minlength`/`maxlength`. `regex` → `match`. `format` (`email`/`url`/`uuid`)/`startsWith`/`endsWith` → `validate` customizado. `transforms` → `trim`/`lowercase`/`uppercase` diretamente. |
| `number`                       | `{ type: Number, ... }`                                  | `min`/`max` diretos. `exclusiveMin`/`exclusiveMax`/`int`/`multipleOf`/`finite`/`safe` → `validate` customizado.                                                                                                             |
| `boolean`                      | `{ type: Boolean, ... }`                                 | Apenas modificadores universais.                                                                                                                                                                                            |
| `date`                         | `{ type: Date, min, max }`                               | `min`/`max` aceitam instâncias de `Date`.                                                                                                                                                                                   |
| `object` (raiz)                | `mongoose.Schema`                                        | Nível superior — passe diretamente para `mongoose.model(name, schema)`.                                                                                                                                                     |
| `object` (aninhado)            | sub-`Schema` envolvido como `{ type: schema, required }` | Subdocs assumem `_id: false` por padrão. Passe `{ subdocId: true }` para reativar.                                                                                                                                          |
| `array`                        | `{ type: [item], required }`                             | `item` é `buildField` aplicado recursivamente.                                                                                                                                                                              |
| `tuple`                        | `{ type: [Mixed], validate }`                            | Validador customizado impõe **apenas o comprimento**. A verificação de tipo por posição vive no core.                                                                                                                       |
| `union`                        | `{ type: Mixed, required }`                              | Sem verificações no nível do banco — use `safeParse` para a validação canônica.                                                                                                                                             |
| `literal`                      | `{ type: <ctor>, enum: [value] }`                        | Construtor inferido: `Number` para numérico, `Boolean` para booleano, senão `String`.                                                                                                                                       |
| `enum`                         | `{ type: <ctor>, enum: [...values] }`                    | O construtor é `Number` quando o primeiro valor é numérico, senão `String`.                                                                                                                                                 |
| `record` (chaveado por string) | `{ type: Map, of: <values>, required }`                  | Quando `keys.kind` é `string`, `enum` ou `literal`.                                                                                                                                                                         |
| `record` (outro)               | `{ type: Mixed, required }`                              | As chaves de `Map` do Mongoose são strings por baixo dos panos; chaves não-string perdem a tipagem.                                                                                                                         |
| `ref`                          | `{ type: ObjectId, ref: <target>, required }`            | `<target>` é a string passada ao `.name(...)` do objeto nomeado.                                                                                                                                                            |

### Modificadores universais

Estes se aplicam a **todo** kind de nó salvo indicação em contrário:

| Modificador   | Efeito na definição Mongoose                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `required`    | Sempre definido na definição (o Sapphire é dono dele — `required: true/false`).                                     |
| `unique`      | `def.unique = true`.                                                                                                |
| `index`       | `def.index = true`. Se passado `{ unique: true }`, também define `def.unique = true`.                               |
| `default(v)`  | `def.default = v`.                                                                                                  |
| `describe(s)` | `def.description = s` (apenas introspecção — o Mongoose o ignora no momento da validação).                          |
| `enum([...])` | `def.enum = [...]` (clona o array).                                                                                 |
| `nullable()`  | **No-op.** O Mongoose aceita `null` em fields não-obrigatórios implicitamente; não há uma flag `nullable` dedicada. |

> [!WARNING]
> **`coerce()` é silenciosamente descartado.** O Mongoose tem sua própria camada de cast que lida com coerção universalmente (por exemplo, `"42"` → `42` para fields `Number`). Se você precisa que a coerção de nível Sapphire execute, canalize a entrada por `safeParse` antes de atribuir a um documento Mongoose.

### Opções de nível de schema

O `ObjectField` de nível raiz carrega flags de todo o schema que se traduzem em `SchemaOptions` do Mongoose:

| Chamada Sapphire                                                   | Efeito no Mongoose                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `.name('User')`                                                    | Usado por `mongoose.model(name, schema)` — o adapter não chama `mongoose.model` ele mesmo, ele retorna o `Schema` cru. |
| `.timestamps()`                                                    | `new Schema(def, { timestamps: true })` — o Mongoose então preenche automaticamente `createdAt`/`updatedAt`.           |
| `.index(['email', 'name'], { unique: true })`                      | Cada chamada acumula: `schema.index({ email: 1, name: 1 }, { unique: true })`. Múltiplas invocações se empilham.       |
| `.adapter('mongoose', { collection: 'people' })` (nível de objeto) | `new Schema(def, { collection: 'people' })`.                                                                           |

## Refs

Refs do Sapphire resolvem **preguiçosamente por nome**:

```ts
const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'),
  })
  .name('Post')
```

Emite `{ type: ObjectId, ref: 'User', required: true }`. A string aterrissa diretamente no slot `ref` do Mongoose — o `populate('author')` do Mongoose então cuida da busca no momento da query. O adapter **não** verifica que um model chamado `'User'` existe; essa resolução acontece quando o Mongoose executa a query. Se você quer uma ref tipada, use `a.ref(SchemaObj)` em vez da forma em string — a IR é idêntica, mas o local da chamada é type-safe contra o seu registro de `name(...)`.

Veja [refs-and-relations.md](../concepts/refs-and-relations.md) para o ciclo de vida completo de ref.

## Escape hatch `.adapter('mongoose', opts)`

Valores de `.adapter('mongoose', { ... })` são lidos de `node.meta.mongoose` e mesclados na definição Mongoose do field **por último** (depois das chaves derivadas pelo Sapphire). Eles vencem em conflitos, com uma exceção — a blacklist:

```ts
const META_BLACKLIST = new Set(['type', 'required'])
```

`type` e `required` são sempre controlados pelo Sapphire; tentar sobrescrevê-los via o escape hatch é um no-op.

Chaves comuns:

| Chave                                 | Efeito                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `sparse`                              | `sparse: true` nativo do Mongoose (índice esparso).                                                          |
| `collation`                           | `collation: { locale: ... }` nativo do Mongoose.                                                             |
| `validate`                            | Adiciona um validador Mongoose customizado. Mesclado com os derivados pelo Sapphire se você passar um array. |
| `select`                              | `select: false` para omitir o field por padrão nos resultados de query.                                      |
| `immutable`                           | Trava o field após a criação.                                                                                |
| `alias`                               | Caminho de alias do Mongoose.                                                                                |
| `description`                         | `SchemaType.options.description` do Mongoose — aparece na introspecção.                                      |
| `collection` (apenas nível de objeto) | `Schema.options.collection`.                                                                                 |

Qualquer outra chave que o Mongoose aceite em um `SchemaTypeDefinition` é honrada literalmente — o adapter simplesmente copia as entradas para o objeto de definição.

## `MongooseAdapterOptions`

O segundo argumento de `toMongooseSchema(node, options?)`:

| Opção      | Padrão   | Efeito                                                                                                                                                                   |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `subdocId` | `false`  | Se Schemas de objeto aninhados adicionam `_id` automaticamente. O padrão diverge do `true` do Mongoose — a maioria das aplicações não precisa de `_id` em subdocumentos. |
| `rootId`   | `'auto'` | Estratégia de `_id` do documento raiz. `'auto'` = padrão do Mongoose (ObjectId automático a menos que você declare `_id`). `'none'` = emite `{ _id: false }`.            |

```ts
toMongooseSchema(node, { subdocId: true })
```

### `_id` raiz customizado

Para usar uma identidade customizada (UUID string, número, etc.) em vez do `ObjectId` autogerado, declare um field literalmente chamado `_id` no objeto. O Mongoose honra um caminho `_id` declarado e pula o ObjectId automático:

```ts
const User = a.object({
  _id: a.string(), // custom string id — you supply it on every insert
  name: a.string(),
})
toMongooseSchema(User.toSchema()) // → Schema with a String _id, no auto ObjectId
```

Para remover o `_id` raiz por completo (raro — logs limitados, views):

```ts
toMongooseSchema(User.toSchema(), { rootId: 'none' }) // → Schema with { _id: false }
```

`rootId: 'none'` é ignorado quando o schema já declara seu próprio field `_id` — um field que você pediu explicitamente nunca é removido.

## Limitações

> [!WARNING]
> **Tuplas impõem apenas o comprimento no nível do banco.** A verificação de tipo por posição vive em `safeParse` — o Mongoose recebe `[Mixed]` mais um validador de comprimento. Se você precisa de verificações por posição antes da persistência, execute `safeParse` no valor primeiro.

> [!WARNING]
> **Unions degradam para `Mixed`.** Sem validação no nível do Mongoose. Combine com `safeParse` para obter a verificação de union discriminada.

> [!WARNING]
> **`record` com chaves não-string recai para `Mixed`.** As chaves de `Map` do Mongoose são sempre strings — `a.record(a.number(), ...)` perde a tipagem de chave no banco. O caminho `keys.kind ∈ { string, enum, literal }` usa `Map` corretamente.

> [!WARNING]
> **`nullable()` é um no-op.** O Mongoose não tem uma flag nullable dedicada; fields não-obrigatórios aceitam `null` implicitamente. Se você precisa de rejeição estrita de `null`, valide via `safeParse`.

> [!WARNING]
> **`nullable() + required` difere entre Sapphire e Mongoose.** O Sapphire trata `null` como um valor válido quando `nullable: true` está definido. O Mongoose, por padrão, trata `null` como ausente para a verificação de `required`. Resultado: um field declarado como `a.string().nullable()` (com o `required: true` padrão) vai passar no `Sapphire.safeParse(null)` mas o `.validate()` do Mongoose vai rejeitar `null` no mesmo caminho. Se você quer que o Mongoose também aceite `null` sem preencher, passe um `default: null` explícito via o escape hatch (`.adapter('mongoose', { default: null })`), ou remova `nullable()` e valide em outro lugar.

> [!WARNING]
> **`coerce()` é descartado.** Use `safeParse` antes de entregar valores ao Mongoose se você quer a semântica de coerção do Sapphire.

> [!WARNING]
> **`_id: false` em subdocumento é o padrão.** O próprio padrão do Mongoose é `true`. Defina `subdocId: true` em `toMongooseSchema` para reativar.

> [!WARNING]
> **Sem suporte a discriminator / plugin / hook.** O Sapphire emite um `Schema` cru. Discriminators, plugins e middleware do Mongoose ficam adiados para V1_FUTURE — conecte-os no `Schema` retornado você mesmo se precisar deles agora.

## Relacionados

- [Fields e modificadores](../concepts/fields-and-modifiers.md) — o que cada kind da IR modela.
- [Refs e relações](../concepts/refs-and-relations.md) — o ciclo de vida de ref entre adapters.
- [Escape hatch](../concepts/escape-hatch.md) — o contrato universal `.adapter(name, opts)`.
- [Receitas → Um schema, muitos adapters](../recipes/one-schema-many-adapters.md).
- [Receitas → Mensagens de erro customizadas](../recipes/custom-error-messages.md).
