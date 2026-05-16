<!-- Code in this guide is verified by tests/docs-examples/getting-started.test.ts -->

# Primeiros passos

O Sapphire permite que você defina um schema uma vez e emita tipos TypeScript mais saídas específicas de ORM (MongoDB via Mongoose ou o driver nativo, tabelas do Drizzle, JSON Schema 2020-12) a partir da mesma fonte.

Este guia leva você pela instalação, o seu primeiro schema, parsing/validação e a conexão de um adapter.

## Instalação

O Sapphire é publicado como um pequeno conjunto de pacotes de workspace. Instale o core, depois quaisquer adapters de que você precise.

Apenas o core (apenas tipos, parsing e o registro de adapters):

```bash
npm install @ascendance-hub/sapphire-core
```

O core mais o adapter Mongoose (`mongoose` é uma peer dependency):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongoose mongoose
```

O core mais o adapter Drizzle (`drizzle-orm` é uma peer dependency, faixa suportada `^0.44 || ^0.45`):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-drizzle drizzle-orm
```

O core mais o adapter de JSON Schema 2020-12 (sem peer deps extras — traga o seu próprio validador como o AJV se você precisar de verificações em runtime):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-json-schema
```

O core mais o adapter do driver nativo do MongoDB (sem peer deps extras — emite um validador de coleção `$jsonSchema` para `db.createCollection`):

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-bson
```

## O seu primeiro schema

Crie uma instância `Sapphire` e defina um schema de objeto com o DSL de field:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

type User = Infer<typeof userSchema>
// User = { name: string; email: string; age?: number | undefined }
```

`Infer<typeof userSchema>` é o tipo de **saída** — o valor que você recebe de volta de `parse`. `InferInput<typeof userSchema>` daria a você o tipo de **entrada** (relevante quando você começa a usar `.default()`).

## Parse / safeParse

Todo field expõe `parse` (lança `SapphireValidationError` em caso de falha) e `safeParse` (retorna uma union discriminada, nunca lança):

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
const user = userSchema.parse({
  name: 'Ada',
  email: 'ada@example.com',
  age: 36,
})
// user is typed as { name: string; email: string; age?: number | undefined }
```

Quando a entrada é inválida, `safeParse` retorna `{ success: false, error }`, onde `error.issues` é um array descrevendo cada problema:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
const result = userSchema.safeParse({
  name: '',
  email: 'not-an-email',
  age: -1,
})

if (!result.success) {
  // result.error.issues is an array of { path, code, message }
  for (const issue of result.error.issues) {
    // e.g. { path: ['email'], code: 'format', message: '...' }
    // issue.path: where in the value the problem is
    // issue.code: a stable string from the IssueCode union
    // issue.message: the resolved message (string or object)
    void issue
  }
}
```

Cada `ValidationIssue` carrega três fields com os quais você se importa:

- `path` — um `(string | number)[]` apontando para o valor infrator (por exemplo, `['address', 'zip']`).
- `code` — uma string estável da union `IssueCode` (por exemplo, `invalid_type`, `min_length`, `format`). Use isto para ramificação, não a mensagem.
- `message` — a mensagem resolvida (string ou objeto). A resolução percorre a hierarquia por chamada → por regra → field → instância → embutida.

## Adicionar um adapter

Os adapters não são registrados automaticamente. Registre o que você quer uma vez no ponto de entrada da sua aplicação, depois chame `.getSchema()` em qualquer field para produzir a sua saída adaptada:

<!-- from tests/docs-examples/getting-started.test.ts -->

```ts
import mongoose from 'mongoose'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

registerAdapter('mongoose', toMongooseSchema)

const a = new Sapphire({ defaultAdapter: 'mongoose' })

const userSchema = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0).optional(),
})

const mongoSchema = userSchema.getSchema() as mongoose.Schema
// mongoSchema is a real mongoose.Schema, ready for mongoose.model(...)
```

`registerAdapter(name, fn)` coloca o seu adapter sob um nome; `getSchema(name?, options?)` resolve a IR do field (`SapphireSchemaNode`) através daquele adapter. Quando a instância `Sapphire` tem um `defaultAdapter`, `getSchema()` o usa; caso contrário, passe o nome explicitamente: `userSchema.getSchema('mongoose')`.

O registry de adapters é **global ao processo**: registre cada adapter uma vez, no startup da aplicação, antes de qualquer chamada de `getSchema`. Registrar um adapter nunca bloqueia outro — uma aplicação multi-banco registra `'mongoose'`, `'drizzle'` e os demais lado a lado e emite todos a partir de uma única definição de schema.

O mesmo padrão funciona para os adapters de JSON Schema e Drizzle — o JSON Schema não precisa de opções, o Drizzle exige no mínimo um `dialect`:

```ts
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
registerAdapter('json-schema', toJsonSchema)
const jsonSchema = userSchema.getSchema('json-schema')

import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
registerAdapter('drizzle', toDrizzleSchema)
// Drizzle needs adapter options — pass them as the second argument:
const usersTable = userSchema.getSchema('drizzle', { dialect: 'pg' })
```

> [!NOTE]
> O adapter Drizzle exige `{ dialect: 'pg' | 'mysql' | 'sqlite' }`. Chamar
> `getSchema('drizzle')` sem opções lança um erro claro. Veja
> [adapters/drizzle.md](./adapters/drizzle.md) para a superfície completa de opções
> (`tableName`, `primaryKey`, `tables`).

## Próximos passos

- [Conceitos → Visão geral](./concepts/overview.md) — o modelo mental e onde o Sapphire se encaixa.
- [Conceitos → Fields e modificadores](./concepts/fields-and-modifiers.md) — referência completa de todo field e os modificadores que ele suporta.
- [Adapters → Mongoose](./adapters/mongoose.md) — mergulho profundo no adapter Mongoose, incluindo escape hatches e o mapeamento da IR.
