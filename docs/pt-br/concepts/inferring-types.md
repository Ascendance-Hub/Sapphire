<!-- Code in this guide is verified by tests/docs-examples/inferring-types.test.ts -->

# Inferindo tipos

`Infer<typeof schema>` é a ponte entre a API de runtime do Sapphire e o mundo estático do TypeScript. Todo field carrega dois brand types fantasma — `_output` (o que `parse` retorna) e `_input` (o que `parse` aceita) — e `Infer` / `InferInput` são apelidos finos sobre eles. Modificadores como `.optional()`, `.nullable()` e `.default()` moldam os dois lados; esta página explica como.

## Exemplo mínimo

<!-- from tests/docs-examples/inferring-types.test.ts -->

```ts
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const user = a.object({
  name: a.string(),
  age: a.number().optional(),
})

type User = Infer<typeof user>
// User = { name: string; age?: number | undefined }
```

## `Infer<>` vs `InferInput<>`

| Tipo                        | Significado                             |
| --------------------------- | --------------------------------------- |
| `Infer<typeof schema>`      | A saída de `schema.parse(value)`.       |
| `InferInput<typeof schema>` | O valor que `schema.parse(...)` aceita. |

Para a maioria dos fields eles coincidem — só diferem quando um modificador cria uma assimetria. O caso mais claro é `.default(value)`: em tempo de execução, `undefined` é substituído pelo padrão, então `_input` se alarga para `T | undefined` enquanto `_output` permanece `T`.

## Tabela de modificadores

| Modificador                | `_input`         | `_output`        |
| -------------------------- | ---------------- | ---------------- |
| `a.string()`               | `string`         | `string`         |
| `.optional()`              | `T \| undefined` | `T \| undefined` |
| `.nullable()`              | `T \| null`      | `T \| null`      |
| `.default('x')`            | `T \| undefined` | `T`              |
| `.optional().default('x')` | `T \| undefined` | `T \| undefined` |

Repare na última linha: encadear `.optional()` **antes** de `.default('x')` mantém a saída como `T | undefined`, porque `.optional()` alarga os brand types primeiro e `.default()` não os estreita de volta. Se você quer a saída estritamente `T`, remova `.optional()` — `.default(...)` sozinho já torna o field opcional no nível de entrada.

## Dentro de um objeto

`a.object({...})` eleva filhos com saída opcional para posições `?:`, então `{ name: string; age?: number | undefined }` é o que você obtém de `Infer<>` quando `age` é `a.number().optional()`. A mesma elevação se aplica a `_input` via `InferInput<>`.

## Armadilhas

> [!WARNING]
> **Não use `ReturnType<typeof schema.parse>`.** O `ReturnType` do TypeScript lê o retorno declarado do método, mas são os brand types `Field<TOut, TIn>` do Sapphire que carregam a inferência precisa. `Infer<typeof schema>` vai direto a `_output` e preserva o estreitamento ao longo das cadeias.

> [!WARNING]
> **`InferInput` importa quando você canaliza entrada de usuário através de `parse` em uma fronteira tipada** — por exemplo, um procedure tRPC ou um handler do Express. `.default(...)` torna o lado de entrada opcional mesmo quando a saída é obrigatória, então o chamador pode legalmente omitir o field. A saída de `parse` é sempre `_output`; apenas o tipo do parâmetro da função se beneficia de `InferInput`.

## Relacionados

- [Fields e modificadores](./fields-and-modifiers.md) — as tabelas de modificadores por field.
- [Composição](./composition.md) — como `pick`/`omit`/`partial`/`required`/`extend`/`merge` recalculam `Infer`.
- [Nullable vs optional](./nullable-vs-optional.md).
