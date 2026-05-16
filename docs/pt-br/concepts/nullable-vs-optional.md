<!-- Code in this guide is verified by tests/docs-examples/nullable-vs-optional.test.ts -->

# Nullable vs optional

`.optional()` e `.nullable()` se parecem, mas modelam **ideias diferentes**: optional diz respeito a se o valor _está lá_, nullable diz respeito a se ele pode ser `null`. O Sapphire mantém os dois separados em toda camada — brand types, IR e saída de adapter — porque frameworks de armazenamento diferenciam "nenhum field" de "field presente mas nulo". Confundir os dois é a fonte mais comum da confusão do tipo "por que meu schema não bate"; esta página é curta de propósito.

## A tabela

| Modificador              | `_output`                | Semântica                        |
| ------------------------ | ------------------------ | -------------------------------- |
| _(nenhum)_               | `T`                      | obrigatório, valor presente      |
| `.optional()`            | `T \| undefined`         | o field pode estar ausente       |
| `.nullable()`            | `T \| null`              | valor presente mas pode ser nulo |
| `.optional().nullable()` | `T \| null \| undefined` | ambos                            |

## Por que distintos?

Frameworks de armazenamento e serialização modelam "ausente" e "nulo" de formas diferentes. O Mongoose trata `required: false` (ausência permitida) e `default: null` (presente-com-nulo) como preocupações separadas. O JSON Schema distingue uma chave faltando em `required[]` (ausência) de um valor `type: ['x', 'null']` (nulo presente). O Drizzle distingue uma coluna nullable de uma coluna simplesmente não incluída num insert. Se o Sapphire os colapsasse, você perderia informação no caminho até o adapter.

## Comportamento em tempo de execução

<!-- from tests/docs-examples/nullable-vs-optional.test.ts -->

```ts
const nullableName = a.string().nullable()
nullableName.parse(null) // → null

const optionalName = a.string().optional()
optionalName.parse(undefined) // → undefined
```

`null` passado a um field obrigatório não-nullable falha com `code: 'required'` — o Sapphire trata `null` como um valor ausente a menos que o field seja `.nullable()`. Se você quer tipagem estrita em que `null` seja "presente mas inválido" em vez de "ausente", use `.nullable()` no schema e rejeite `null` na camada da sua aplicação.

## Dentro de um objeto

<!-- from tests/docs-examples/nullable-vs-optional.test.ts -->

```ts
const userOpt = a.object({ nickname: a.string().optional() })
type UserOpt = Infer<typeof userOpt>
// UserOpt = { nickname?: string | undefined }   // the KEY is optional

const userNul = a.object({ nickname: a.string().nullable() })
type UserNul = Infer<typeof userNul>
// UserNul = { nickname: string | null }         // the key is REQUIRED
```

Apenas `.optional()` eleva a propriedade para uma posição `?:`. `.nullable()` mantém a chave obrigatória e alarga o tipo do valor para `T | null`.

## Comportamento de adapter

- **mongo** — `.optional()` → `required: false`. `.nullable()` é raro no Mongoose; o valor é permitido mas o armazenamento ainda exige que a chave esteja presente.
- **json-schema** — `.optional()` remove a chave de `required[]`. `.nullable()` alarga o tipo para `['x', 'null']` (ou envolve em `oneOf` quando há restrições incompatíveis com um array de tipos).
- **drizzle** — `.optional()` e `.nullable()` ambos omitem `notNull()` (a coluna aceita NULL). A diferença semântica está no lado da entrada; a coluna em si é a mesma.

## Armadilhas

> [!WARNING]
> **`.optional().default('x')` mantém `_output` como `T | undefined`.** Uma vez que `.optional()` alarga o brand de saída para `T | undefined`, `.default()` não o estreita de volta — apenas o lado da entrada. Se você quer `_output: T`, remova `.optional()` e confie em `.default('x')` sozinho (ele já alarga `_input` para `T | undefined`, então os chamadores podem omitir a chave).

> [!WARNING]
> **`null` é tratado como "ausente" por fields não-nullable.** Chamar `safeParse(null)` em um field obrigatório não-nullable falha com `code: 'required'` (NÃO `'invalid_type'`) — o Sapphire curto-circuita null/undefined juntos antes da verificação de tipo. Bibliotecas de formulário que enviam `null` para campos vazios caem no mesmo balde `required` que `undefined`. Para obter uma semântica real de "presente mas nulo é ilegal", marque o field como `.nullable()` e valide mais a fundo no seu código.

## Relacionados

- [Inferindo tipos](./inferring-types.md) — tabela completa de `_input` / `_output` incluindo `.default()`.
- [Validação](./validation.md) — semântica de `IssueCode` para `required` vs `invalid_type`.
- [Fields e modificadores](./fields-and-modifiers.md) — referência de modificadores universais.
