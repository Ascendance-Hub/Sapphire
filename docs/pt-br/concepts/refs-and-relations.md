<!-- Code in this guide is verified by tests/docs-examples/refs.test.ts -->

# Refs e relações

Refs permitem que um schema aponte para outro por nome. É assim que o Sapphire modela relacionamentos entre coleções (o `ref` do Mongoose), chaves estrangeiras (Drizzle) e o `$ref` do JSON Schema. Há duas camadas complementares: **nomear** um schema com `.name(string)` para que ele possa ser alvo, e **referenciá-lo** via `a.ref(...)`. Tanto refs por objeto de schema quanto refs por nome em string são suportadas — a forma em string é preguiçosa (lazy) e permite expressar ciclos ou referências adiantadas que a forma type-safe não consegue.

## Exemplo mínimo

<!-- from tests/docs-examples/refs.test.ts -->

```ts
import { Sapphire } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

const Post = a.object({
  title: a.string(),
  author: a.ref(User),
})
```

`Post.toSchema().properties.author` é `{ kind: 'ref', target: 'User', required: true }`. Os adapters seguem a partir daí.

## Nomeando um schema

`.name(string)` é um método de ObjectField. Ele registra o schema no `NamedSchemaRegistry` da instância `Sapphire` pai e carimba o nome na IR (`node.name`).

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

a.listNamedSchemas() // ['User']
```

Um schema não precisa de nome a menos que algo o referencie (ou até que um adapter sensível a nome — o `$defs` do JSON Schema, o nome da tabela do Drizzle — precise de um). Nomes são únicos **por instância Sapphire**, não globalmente.

## Referenciando — duas formas

| Forma              | Assinatura                          | Resolução         | Type-safe                                          |
| ------------------ | ----------------------------------- | ----------------- | -------------------------------------------------- |
| `a.ref(SchemaObj)` | `(target: ObjectField) => RefField` | Adiantada (eager) | Sim — exige que `.name(...)` já tenha sido chamado |
| `a.ref('Name')`    | `(target: string) => RefField`      | Preguiçosa (lazy) | Não — a string é opaca                             |

### Por objeto de schema

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const User = a
  .object({
    email: a.string().email(),
  })
  .name('User')

const Post = a.object({
  title: a.string(),
  author: a.ref(User),
})
```

`a.ref(target)` lê `target.getName()` e tira um snapshot da string. Se `target` não tem nome definido, a construção lança erro — não há nada para os adapters renderizarem.

### Por string (ciclos, refs adiantadas)

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const a = new Sapphire()

const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'), // 'User' not yet registered — fine, lazy.
  })
  .name('Post')

const User = a
  .object({
    email: a.string().email(),
    latestPost: a.ref('Post'), // cycle: User <-> Post
  })
  .name('User')
```

A forma em string nunca valida o alvo no momento da **construção** — é isso que faz refs adiantadas e ciclos funcionarem.

### Validação de ref no momento do parse

No momento do **parse**, uma ref _de fato_ verifica que o nome do seu alvo está registrado na instância Sapphire. `someSchema.safeParse(...)` percorrendo uma `ref('User')` cujo `'User'` nunca foi `.name()`-ado emite uma issue `ref_target_missing` e falha. Isso pega erros de digitação (`'Usr'`) no momento em que você faz o parse, não apenas quando um adapter executa.

A verificação só executa quando o registro está acessível — ou seja, o field foi construído a partir de uma instância `Sapphire` (o caso normal). Ela não valida o _shape_ do valor referenciado; refs da v1 verificam o registro do alvo + a presença, não o schema do alvo.

A emissão do adapter ainda resolve o alvo independentemente (Mongo/JSON Schema no momento da emissão, Drizzle preguiçosamente via `references(() => ...)`).

## Comportamento de adapter

| Adapter       | Saída                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `mongo`       | `{ type: ObjectId, ref: 'Name', required }`                                                      |
| `json-schema` | `{ $ref: '#/$defs/Name' }` (schemas nomeados coletados em `$defs` de nível superior)             |
| `drizzle`     | `integer(name).references(() => target.id)` resolvido preguiçosamente via `DrizzleTableRegistry` |

### Mongo

<!-- from tests/docs-examples/refs.test.ts -->

```ts
const schema = Post.getSchema() as mongoose.Schema
const authorPath = schema.path('author') as unknown as {
  instance: string
  options: { ref: string }
}
authorPath.instance // 'ObjectID'
authorPath.options.ref // 'User'
```

### JSON Schema

```ts
const out = toJsonSchema(Post.toSchema(), {
  defs: { User: User.toSchema() },
}) as {
  properties: { author: { $ref: string } }
  $defs: Record<string, unknown>
}
out.properties.author // { $ref: '#/$defs/User' }
out.$defs.User // present, fully expanded
```

O adapter percorre a IR coletando todo `kind: 'object'` com um `.name` que encontra, materializando-os em `$defs` de nível superior. As próprias refs são ponteiros — elas não descem para dentro do alvo — então quando User é referenciado mas nunca **aninhado** dentro da árvore de entrada, passe-o explicitamente via `options.defs`. Ciclos não custam nada uma vez que os schemas nomeados estão em `$defs`.

### Drizzle

```ts
import { DrizzleTableRegistry, toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'

const tables = new DrizzleTableRegistry()

const userTable = toDrizzleSchema(User.toSchema(), { dialect: 'pg', tables })
const postTable = toDrizzleSchema(Post.toSchema(), { dialect: 'pg', tables })
// each ref column = integer(name).references(() => tables.get('User').id)
```

Passe o mesmo `DrizzleTableRegistry` por todas as chamadas `toDrizzleSchema` em um conjunto relacionado. A closure `references(() => ...)` resolve através do registro na construção da query — a ordem de emissão não importa.

## Armadilhas

> [!WARNING]
> **A resolução do alvo de uma ref é preguiçosa na construção, verificada no parse.** Uma `ref('User')` nunca lança erro quando você a _constrói_ — é isso que viabiliza refs adiantadas e ciclos. Mas `safeParse` valida que o alvo está registrado e falha com uma issue `ref_target_missing` se não estiver, então um erro de digitação em `'Usr'` aparece na primeira vez que você faz o parse. A emissão do adapter também resolve o alvo (Mongo/JSON Schema no momento da emissão, Drizzle preguiçosamente via a closure `references(() => target.id)`).

> [!WARNING]
> **Schemas nomeados são únicos por instância Sapphire.** Reusar um nome lança erro de `NamedSchemaRegistry.register`. Em testes, prefira um `new Sapphire()` novo por arquivo (ou por teste) em vez de um singleton de nível de módulo — caso contrário, dois testes que ambos fazem `.name('User')` vão colidir.

> [!WARNING]
> **`a.ref(SchemaObj)` só funciona depois que o `.name(...)` do alvo está definido.** Recorra à forma type-safe apenas quando você controla a ordem; para refs adiantadas e ciclos, use a forma em string.

## Relacionados

- [Fields e modificadores](./fields-and-modifiers.md) — a API `.name()` do ObjectField.
- [Nullable vs optional](./nullable-vs-optional.md) — como `.optional()` e `.nullable()` se aplicam a refs.
- [Receitas → Um schema, muitos adapters](../recipes/one-schema-many-adapters.md).
