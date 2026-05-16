# Compartilhar tipos com o frontend

## Caso de uso

Seu backend é dono do modelo de usuário canônico. Você quer:

1. Usá-lo para construir um `mongoose.Schema` para persistência.
2. Obter um tipo TypeScript (`Infer<>`) compartilhado via um pacote do workspace para que os tipos de requisição/resposta do frontend permaneçam em sincronia.
3. Emitir um documento JSON Schema 2020-12 que o frontend pode entregar a um gerador de formulários (`@rjsf/core`, JSON Forms, etc.) ou que uma ferramenta MCP pode usar como `inputSchema`.

O Sapphire foi projetado exatamente para isso. Defina uma vez, espalhe para três consumidores — uma fonte para a IR mantém as três saídas alinhadas. (Escape hatches por adapter ainda podem divergir se você os sobrepuser; trate-os como a exceção.)

## Exemplo de ponta a ponta

```ts
// packages/shared/src/schemas.ts -------------------------------------
import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

registerAdapter('mongoose', toMongooseSchema)
registerAdapter('json-schema', toJsonSchema)

export const a = new Sapphire()

export const User = a
  .object({
    name: a.string().min(1).describe('Display name shown in the UI.'),
    email: a.string().email().describe('Primary contact email.'),
    age: a.number().int().min(0).optional(),
    role: a.type().enum(['admin', 'editor', 'viewer'] as const),
  })
  .name('User')

// (1) Shared TypeScript type — import on both backend and frontend.
export type User = Infer<typeof User>

// (2) Mongoose schema — backend persistence.
import mongoose from 'mongoose'
export const UserMongoSchema = User.getSchema('mongoose') as mongoose.Schema
export const UserModel = mongoose.model('User', UserMongoSchema)

// (3) JSON Schema 2020-12 — frontend form generator OR MCP inputSchema.
export const UserJsonSchema = toJsonSchema(User.toSchema(), {
  $id: 'https://example.com/schemas/user',
  additionalProperties: false,
})
```

O frontend importa apenas o tipo e o JSON Schema:

```ts
// apps/web/src/forms/user-form.tsx -----------------------------------
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { UserJsonSchema, type User } from 'shared/schemas'

export function UserForm({ onSubmit }: { onSubmit: (u: User) => void }) {
  return (
    <Form
      schema={UserJsonSchema as object}
      validator={validator}
      onSubmit={({ formData }) => onSubmit(formData as User)}
    />
  )
}
```

## Passo a passo

1. **Defina `User` uma vez** como um schema de objeto nomeado. `.name('User')` o registra no registro da instância Sapphire — o JSON Schema usa o nome para `$defs`, e o Mongo o usa para `mongoose.model`.
2. **Três saídas do mesmo field:**
   - `Infer<typeof User>` é uma expressão de tipo pura — custo zero em runtime.
   - `User.getSchema('mongoose')` percorre a IR através de `toMongooseSchema` e retorna um `mongoose.Schema`.
   - `toJsonSchema(User.toSchema(), opts)` retorna um objeto JSON simples.
3. **Envie o tipo e o JSON Schema para o frontend.** O schema do Mongoose permanece no servidor (ele puxa o `mongoose`). Um pacote `shared` do workspace é o lar típico — reexportado de lá para os dois apps.
4. **Refatore em um só lugar.** Adicione um field em `User`, e o tipo se atualiza em todo lugar, o model do Mongoose ganha um novo caminho, e o gerador de formulários capta a nova pergunta no próximo build.

## Variações

### `partial()` para endpoints PATCH

Um endpoint PATCH tipicamente aceita um subconjunto do modelo. Reutilize a mesma fonte, derive o parcial:

```ts
export const UserPatch = User.partial()
export type UserPatch = Infer<typeof UserPatch>

// JSON Schema for the PATCH endpoint:
export const UserPatchJsonSchema = toJsonSchema(UserPatch.toSchema())
```

Veja [Conceitos → Composição](../concepts/composition.md) para `pick` / `omit` / `extend` / `merge`.

### `inputSchema` de ferramenta MCP

O Model Context Protocol espera JSON Schema para entradas de ferramenta. O mesmo `UserJsonSchema` se encaixa diretamente:

```ts
server.tool({
  name: 'create_user',
  description: 'Create a new user.',
  inputSchema: UserJsonSchema as object,
  handler: async (input) => {
    // Validate again on the server for defence-in-depth:
    const parsed = User.parse(input)
    return UserModel.create(parsed)
  },
})
```

### Exportação de tipos entre pacotes

O resultado de `Infer<>` é um tipo estrutural. Para exportá-lo de forma limpa de um pacote do workspace sem vazar tipos do Sapphire para todo consumidor, **reexporte o tipo explicitamente** em vez do schema:

```ts
// shared/src/index.ts
export type { User } from './schemas' // frontend uses this
export { User as UserSchema } from './schemas' // backend uses this
```

O bundle do frontend agora contém zero runtime do Sapphire — apenas o tipo estrutural sobrevive.

> [!WARNING]
> **Não envie o schema do Mongoose para o navegador.** `@ascendance-hub/sapphire-mongoose` e o próprio `mongoose` são apenas de servidor. Exporte o JSON Schema e o tipo `Infer<>` de um pacote compartilhado; mantenha `UserMongoSchema` e `UserModel` em um módulo exclusivo do backend.

> [!WARNING]
> **`additionalProperties: false` é opt-in.** O padrão da spec do JSON Schema é permissivo. Se você quer que o gerador de formulários rejeite chaves desconhecidas, passe `{ additionalProperties: false }` para `toJsonSchema` — a semântica de `stripUnknown`/`unknown_key` do Sapphire não é transmitida automaticamente.

## Veja também

- [Adapters → JSON Schema](../adapters/json-schema.md) — tabela completa de mapeamento do 2020-12 e opções do emissor.
- [Adapters → Mongoose](../adapters/mongoose.md) — mapeamento da IR para o Mongoose e refs.
- [Conceitos → Composição](../concepts/composition.md) — `partial`, `pick`, `omit` para divisões de leitura/escrita/patch.
- [Receitas → Um schema, muitos adapters](./one-schema-many-adapters.md) — receita irmã focada em emissão de múltiplas saídas.
