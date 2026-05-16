# Adapter Drizzle — `@ascendance-hub/sapphire-drizzle`

O adapter Drizzle converte uma IR do Sapphire (`SapphireSchemaNode`) em uma definição de tabela do Drizzle — `pgTable`, `mysqlTable` ou `sqliteTable`, dependendo do dialeto escolhido — pronta para passar a `drizzle(connection, { schema: { ... } })`. Três dialetos são de primeira classe; todo o resto (D1, Neon HTTP, o `bun:sqlite` do Bun) se sobrepõe a eles porque a própria divisão de drivers do Drizzle é ortogonal ao shape do construtor de coluna.

> **Não oficial.** Um adapter da comunidade — não afiliado, patrocinado ou endossado pela Equipe do Drizzle.

## Instalação

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-drizzle drizzle-orm
```

Tanto `@ascendance-hub/sapphire-core` quanto `drizzle-orm` são peer dependencies.

### Faixa suportada de `drizzle-orm`

```
^0.44 || ^0.45
```

Fixado de forma conservadora porque o Drizzle lança mudanças incompatíveis frequentes no construtor de coluna. O adapter é verificado contra `0.44.x` e `0.45.x`; majors posteriores não são garantidos até atualizarmos a faixa de peer.

## Registrando o adapter

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'

registerAdapter('drizzle', toDrizzleSchema)

export const a = new Sapphire({ defaultAdapter: 'drizzle' })
```

O adapter **não é registrado automaticamente** — chame isto uma vez no seu ponto de entrada.

## Início rápido (Postgres)

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
import { a } from './sapphire'

const User = a
  .object({
    name: a.string().min(1),
    email: a.string().email().unique(),
    age: a.number().int().min(0).optional(),
  })
  .name('User')

const users = toDrizzleSchema(User.toSchema(), { dialect: 'pg' })

const db = drizzle(connectionString, { schema: { users } })
// `db.select().from(users)` is fully typed by Drizzle.
```

Para emissão de múltiplas tabelas com refs entre tabelas, compartilhe uma única instância de `DrizzleTableRegistry` entre as chamadas (veja [Refs](#refs--drizzletableregistry) abaixo).

## Assinatura do adapter

```text
toDrizzleSchema(node, { dialect: 'pg',     ... }) → PgTableWithColumns<...>      (declared as any)
toDrizzleSchema(node, { dialect: 'mysql',  ... }) → MySqlTableWithColumns<...>   (declared as any)
toDrizzleSchema(node, { dialect: 'sqlite', ... }) → SQLiteTableWithColumns<...>  (declared as any)
```

Três overloads, cada um retornando `any`. A tabela real de runtime é genuína — apenas o **tipo TS declarado** é alargado. O motivo: os generics do construtor de coluna do Drizzle não são exportados de forma confiável ao longo da faixa de peer suportada, e fixar uma única assinatura quebraria silenciosamente para usuários no outro minor. Passe a tabela retornada para `drizzle(conn, { schema: { users } })` e use os tipos de nível de conexão para as queries.

## Mapeamento IR → Drizzle (por dialeto)

| IR `kind`           | Postgres (`pg-core`)                                      | MySQL (`mysql-core`)                                                                                       | SQLite (`sqlite-core`)                                    |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `string`            | `text(name)` (ou `uuid(name)` quando `format: 'uuid'`)    | `varchar(name, { length: 36 })` para `format: 'uuid'`; senão `varchar(name, { length: maxLength ?? 255 })` | `text(name)` (uuid permanece `text`)                      |
| `number` (int)      | `integer(name)`                                           | `int(name)`                                                                                                | `integer(name)`                                           |
| `number` (float)    | `doublePrecision(name)`                                   | `double(name)`                                                                                             | `real(name)`                                              |
| `boolean`           | `boolean(name)`                                           | `boolean(name)`                                                                                            | `integer(name, { mode: 'boolean' })`                      |
| `date`              | `timestamp(name, { withTimezone: true, mode: 'date' })`   | `datetime(name, { mode: 'date' })`                                                                         | `integer(name, { mode: 'timestamp' })` (segundos unix)    |
| `object` (aninhado) | `jsonb(name)`                                             | `json(name)`                                                                                               | `text(name, { mode: 'json' })`                            |
| `array`             | `jsonb(name)`                                             | `json(name)`                                                                                               | `text(name, { mode: 'json' })`                            |
| `tuple`             | `jsonb(name)`                                             | `json(name)`                                                                                               | `text(name, { mode: 'json' })`                            |
| `union`             | `jsonb(name)`                                             | `json(name)`                                                                                               | `text(name, { mode: 'json' })`                            |
| `record`            | `jsonb(name)`                                             | `json(name)`                                                                                               | `text(name, { mode: 'json' })`                            |
| `literal`           | `text(name)`                                              | `varchar(name, { length: 255 })`                                                                           | `text(name)`                                              |
| `enum`              | `text(name)` (opt-in `pgEnum` via meta)                   | `varchar(name, { length: 255 })` (opt-in `mysqlEnum` via meta)                                             | `text(name)`                                              |
| `ref`               | `integer(name).references(() => target[pk])` (preguiçoso) | `int(name).references(() => target[pk])` (preguiçoso)                                                      | `integer(name).references(() => target[pk])` (preguiçoso) |

### Modificadores universais (toda coluna)

`applyCommon` percorre cada nó e encadeia modificadores na coluna construída **em ordem**:

1. `default(v)` → `col.default(v)`.
2. `required && !nullable` → `col.notNull()`.
3. `unique` → `col.unique()`.
4. Depois as entradas de escape hatch `meta.drizzle` (veja abaixo).

Todos os outros modificadores do Sapphire (`min`/`max`/`regex`/`format`/`startsWith`/`endsWith`/`multipleOf`/`finite`/`safe`/`coerce`/`transforms`) **permanecem no `safeParse`** — eles não são impostos no nível do banco. A única exceção é o `varchar` do MySQL, que usa `maxLength` para dimensionar a coluna (padrão `255`).

### Chave primária implícita

Toda tabela emitida adiciona automaticamente uma coluna `id` no início, a menos que você opte por não:

| Dialeto | Coluna `id` implícita                               |
| ------- | --------------------------------------------------- |
| pg      | `serial('id').primaryKey()`                         |
| mysql   | `serial('id').primaryKey()`                         |
| sqlite  | `integer('id').primaryKey({ autoIncrement: true })` |

Controlado por `options.primaryKey`:

```ts
toDrizzleSchema(node, { dialect: 'pg' }) // → id (default)
toDrizzleSchema(node, { dialect: 'pg', primaryKey: 'pk' }) // → pk
toDrizzleSchema(node, { dialect: 'pg', primaryKey: false }) // → no implicit PK; you declare your own via meta
```

## Refs + `DrizzleTableRegistry`

O Drizzle exige que `references(() => targetTable.column)` seja **preguiçoso**, porque a tabela alvo pode não existir quando a coluna é declarada (refs adiantadas, ciclos). O `ref('User')` do Sapphire é conectado a um registro que o callback preguiçoso consulta no momento da query:

```ts
import { toDrizzleSchema, DrizzleTableRegistry } from '@ascendance-hub/sapphire-drizzle'
import { a } from './sapphire'

const tables = new DrizzleTableRegistry()

const User = a.object({ name: a.string() }).name('User')
const Post = a
  .object({
    title: a.string(),
    author: a.ref('User'),
  })
  .name('Post')

const users = toDrizzleSchema(User.toSchema(), { dialect: 'pg', tables })
const posts = toDrizzleSchema(Post.toSchema(), { dialect: 'pg', tables })

// `posts.author.references(() => users.id)` resolves at query time.
```

### Ciclos (User ↔ Post)

Emita ambos com o **mesmo** registro. O callback preguiçoso resolve uma vez que o ciclo está fechado. Se o callback dispara antes de a tabela alvo estar registrada, o adapter lança erro:

```
drizzle adapter: ref target table "User" not registered.
Emit it before invoking queries that traverse this reference.
```

A ordem das chamadas `toDrizzleSchema` não importa — o que importa é que **todas** as tabelas relacionadas sejam emitidas antes de você executar uma query que atravessa a ref.

## Índices compostos

`ObjectField.index(keys, opts?)` acumula em `node.indexes`. O adapter emite cada um via o callback de terceiro argumento de `pgTable` / `mysqlTable` / `sqliteTable`, na **forma de array** (a forma de objeto é depreciada no `drizzle-orm` ≥ 0.44):

```ts
const Post = a
  .object({
    authorId: a.number().int(),
    createdAt: a.date(),
  })
  .name('Post')
  .index(['authorId', 'createdAt'])
  .index(['authorId'], { unique: true })

const posts = toDrizzleSchema(Post.toSchema(), { dialect: 'pg' })
// Emits two indexes named `Post_idx_0`, `Post_idx_1` (unique).
```

Os nomes seguem `<tableName>_idx_<i>`, estáveis e únicos dentro da tabela.

## Opções de nível de schema

O segundo argumento de `toDrizzleSchema(node, options)`:

| Opção        | Padrão                        | Efeito                                                                                                        |
| ------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `dialect`    | _(obrigatório)_               | `'pg'` / `'mysql'` / `'sqlite'`. Seleciona o conjunto de construtores de coluna e o shape da tabela.          |
| `tableName`  | `node.name`                   | Argumento passado a `pgTable(name, ...)` / `mysqlTable(...)` / `sqliteTable(...)`.                            |
| `primaryKey` | `'id'`                        | Nome da coluna de PK implícita. `false` desabilita a PK implícita.                                            |
| `tables`     | _(novo registro por chamada)_ | `DrizzleTableRegistry` compartilhado. Passe a mesma instância entre chamadas relacionadas para resolver refs. |

## Escape hatch `.adapter('drizzle', opts)`

Valores de `.adapter('drizzle', { ... })` são lidos de `node.meta.drizzle` e aplicados como **chamadas de método no construtor de coluna**. Dois escopos são suportados:

- **Chaves de nível superior** — aplicadas a todo dialeto.
- **Sub-chaves de dialeto** (`pg`, `mysql`, `sqlite`) — aplicadas apenas quando `options.dialect` corresponde.

```ts
a.string().adapter('drizzle', {
  // Top-level: applied for any dialect that has the method.
  primaryKey: true,
  // Dialect-specific: only applied when emitting for pg.
  pg: { array: true },
  // Same key under a different dialect bucket — ignored when emitting for pg.
  mysql: { fixed: 12 },
})
```

### Tratamento de argumentos

| Valor                | Vira                                   |
| -------------------- | -------------------------------------- |
| `true`               | `col.method()` (sem args).             |
| `Array`              | `col.method(...args)` (espalhado).     |
| Qualquer outra coisa | `col.method(value)` (argumento único). |

### Pulo silencioso em métodos ausentes

```ts
function callChain(col: any, method: string, args: unknown): any {
  if (typeof col[method] !== 'function') return col
  // ...
}
```

Métodos ausentes no construtor de coluna (por exemplo, `.array()` em uma coluna `text` sob SQLite) são **silenciosamente pulados** — meta é best-effort. O lado ruim: erros de digitação passam despercebidos em runtime. Combine o escape hatch com testes que verificam as propriedades de runtime da coluna (`isUnique`, `notNull`, etc.).

Para trocar o próprio construtor de coluna (por exemplo, forçar `text` em vez de `varchar` no MySQL), declare a tabela à mão — o escape hatch apenas encadeia métodos em uma coluna já construída.

## Limitações

> [!WARNING]
> **Sem validação em runtime no Drizzle.** O Drizzle é um construtor de queries, não um validador. O Sapphire mantém a validação em `safeParse`; o adapter Drizzle apenas modela a tabela.

> [!WARNING]
> **Kinds compostos colapsam para colunas JSON.** `array`, `tuple`, `union`, `record` e `object` aninhado todos mapeiam para `jsonb` (pg) / `json` (mysql) / `text({ mode: 'json' })` (sqlite). A validação no nível do banco do shape composto é perdida — mantenha-a em `safeParse`. Consequências específicas:
>
> - **`union`** — os ramos são opacos para o banco de dados; você não pode filtrar por qual ramo uma linha casou, nem impor exclusão mútua no nível do banco.
> - **`record`** — restrições de `keyField` (`.uuid()`, `.regex(...)`) executam apenas no `safeParse`; o banco aceita qualquer chave string.
> - **`tuple`** — o comprimento fixo não é imposto pelo banco; a coluna aceita qualquer shape de array JSON.
> - Em todos os casos: chame `safeParse` antes de `insert` / `update` para manter as linhas do banco consistentes com a intenção do schema.

> [!WARNING]
> **`enum` é `text`/`varchar` por padrão.** `pgEnum` / `mysqlEnum` requerem um tipo declarado separadamente com um nome único e são opt-in via `.adapter('drizzle', { pg: { ... } })`.

> [!WARNING]
> **Validadores de string são apenas de runtime.** `minLength`, `regex`, `format` (`email`/`url`/`uuid`), `startsWith`, `endsWith` não são impostos no nível do banco. Exceção: MySQL — `node.maxLength` dimensiona `varchar(N)`.

> [!WARNING]
> **`uuid` no SQLite é `text`.** O SQLite não tem tipo UUID nativo. O adapter emite `text(name)` independentemente de `format`; conte com `safeParse` para a verificação de formato.

> [!WARNING]
> **Boolean e date no SQLite são emulados.** Armazenados como `integer({ mode: 'boolean' })` e `integer({ mode: 'timestamp' })` (segundos unix). O Drizzle lida com a serialização de forma transparente — mas a precisão de data é de nível de segundo por padrão.

> [!WARNING]
> **Os tipos de retorno de `toDrizzleSchema` são `any`** por overload. A tabela de runtime é real; o tipo TS é alargado porque os generics do construtor de coluna do Drizzle não são exportados de forma confiável ao longo da faixa de peer suportada.

> [!WARNING]
> **Sem API `relations()`.** Refs do Sapphire viram apenas `references(...)` do Drizzle. A API de nível mais alto `relations(users, ({ many }) => ({ ... }))` fica adiada para V1_FUTURE.

> [!WARNING]
> **Migrations estão fora de escopo.** Combine as tabelas geradas com o `drizzle-kit` no seu próprio pipeline.

> [!WARNING]
> **`ObjectField.timestamps()` é um no-op** neste adapter. O conceito de sabor Mongoose não se traduz diretamente para o Drizzle — declare `createdAt`/`updatedAt` explicitamente com `a.date().default(() => new Date())` se você os quer.

> [!WARNING]
> **`primaryKey: false` desabilita refs para dentro daquela tabela.** O adapter resolve refs lendo a PK real do alvo do `DrizzleTableRegistry` (nome da coluna registrado no momento da emissão). Se um alvo foi emitido com `primaryKey: false`, o registro guarda `pkName: null` e o callback `references(...)` lança erro na primeira travessia de query com uma mensagem clara. Para usar refs para dentro de uma tabela de PK customizada: emita o alvo com `primaryKey: 'yourColumn'` (PK nomeada) para que o registro grave a coluna certa. Uma sobrescrita de coluna por ref (`a.ref('User', { column: 'uuid' })`) está na lista V1_FUTURE.

## Relacionados

- [Fields e modificadores](../concepts/fields-and-modifiers.md) — o que cada kind da IR modela.
- [Refs e relações](../concepts/refs-and-relations.md) — o ciclo de vida de ref entre adapters.
- [Escape hatch](../concepts/escape-hatch.md) — o contrato universal `.adapter(name, opts)`.
- [Receitas → Um schema, muitos adapters](../recipes/one-schema-many-adapters.md).
- [Receitas → Escrevendo um adapter customizado](../recipes/custom-adapter.md).
