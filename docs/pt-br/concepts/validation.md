<!-- Code in this guide is verified by tests/docs-examples/validation.test.ts -->

# Validação

Todo field do Sapphire expõe `parse(value, opts?)` e `safeParse(value, opts?)`. Eles consomem entrada em tempo de execução e ou retornam um valor tipado ou expõem uma lista estruturada de issues. A validação é uma preocupação secundária de primeira classe — o centro do design do Sapphire é o pipeline IR-e-adapters, mas a camada de parse é sólida o suficiente para conduzir validação de formulários, validação de requisições de API e verificação de entrada de ferramentas MCP.

## `parse` vs `safeParse`

| Método      | Sucesso                              | Falha                                    |
| ----------- | ------------------------------------ | ---------------------------------------- |
| `parse`     | retorna o valor parseado (`_output`) | lança `SapphireValidationError`          |
| `safeParse` | `{ success: true, data }`            | `{ success: false, error }` (sem lançar) |

Use `safeParse` para fluxos de erro esperados (formulários, requisições de API). Use `parse` quando um erro significa um bug (entrada já validada, testes).

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const result = user.safeParse({ name: '', age: -1 })
if (result.success) {
  // result.data is typed as Infer<typeof user>
} else {
  // result.error is a SapphireValidationError
  // result.error.issues is ValidationIssue[]
}
```

## `SapphireValidationError`

```ts
class SapphireValidationError extends Error {
  readonly name: 'SapphireValidationError'
  readonly message: string // 'Validation failed (N issue[s])'
  readonly issues: ValidationIssue[]

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> }
  format(): FormattedError // recursive tree, `_errors` at every node
  toJSON(): { name: string; message: string; issues: ValidationIssue[] }
}
```

É uma subclasse normal de `Error` — `instanceof SapphireValidationError` funciona, e `JSON.stringify(err)` sobrevive à serialização (ela passa por `toJSON()`; assumindo que nenhum dos seus valores de mensagem seja função, veja as armadilhas).

### Expondo issues — `flatten()` / `format()`

`issues` é a lista crua. Para trabalho com DTO / formulário, os dois helpers abaixo poupam você do pivô:

- **`flatten()`** — agrupa mensagens pelo nome do field de **nível superior**. Issues com caminho vazio vão para `formErrors`; todo o resto cai em `fieldErrors[firstPathSegment]`. Ideal para formulários planos.

  ```ts
  const r = UserSchema.safeParse(input)
  if (!r.success) {
    const { fieldErrors, formErrors } = r.error.flatten()
    // fieldErrors: { email: ['Invalid email'], age: ['Must be an integer'] }
  }
  ```

- **`format()`** — constrói uma árvore espelhando o shape da entrada, com um array `_errors: string[]` em cada nó. Ideal para DTOs aninhados onde uma chave plana não basta.

  ```ts
  const tree = r.error.format()
  // tree.address.zip._errors → ['Must be exactly 5 characters']
  ```

## `ValidationIssue`

```ts
interface ValidationIssue {
  path: (string | number)[]
  code: IssueCode
  message: string | object
  context?: Record<string, unknown>
}
```

- `path` — onde a issue vive na entrada (por exemplo, `['profile', 'email']`).
- `code` — uma string estável da união `IssueCode` (tabela abaixo).
- `message` — a mensagem resolvida. `string` por padrão; qualquer shape se você retornou um objeto de um `MessageValue`.
- `context` — extras específicos da regra (por exemplo, `{ min: 3, got: 2 }`), ausente quando nenhum extra se aplica.

## `IssueCode` — códigos embutidos

| Código                                     | Onde dispara                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `required`                                 | Field obrigatório é `undefined` (ou `null` quando não-nullable)                 |
| `invalid_type`                             | Tipo de runtime errado (por exemplo, `null` para uma string, array para objeto) |
| `min_length`                               | String mais curta que `.min(n)`                                                 |
| `max_length`                               | String mais longa que `.max(n)`                                                 |
| `length`                                   | Comprimento da string diferente de `.length(n)`                                 |
| `regex`                                    | `.regex(...)` não casou                                                         |
| `format`                                   | `.email()` / `.url()` / `.uuid()` não casou                                     |
| `starts_with`                              | `.startsWith(...)` falhou                                                       |
| `ends_with`                                | `.endsWith(...)` falhou                                                         |
| `min` / `max`                              | Número abaixo de `.min(n)` / acima de `.max(n)`                                 |
| `gt` / `gte` / `lt` / `lte`                | Limite numérico estrito / inclusivo falhou                                      |
| `int`                                      | `.int()` recebeu um não-inteiro                                                 |
| `multiple_of`                              | `.multipleOf(n)` falhou                                                         |
| `finite`                                   | `.finite()` recebeu `±Infinity` (NaN é pego antes por `invalid_type`)           |
| `safe`                                     | `.safe()` recebeu um inteiro inseguro                                           |
| `min_items` / `max_items` / `items_length` | Restrições de array (`.nonempty()` é açúcar para `.min(1)` → `min_items`)       |
| `enum`                                     | Valor fora do conjunto de `enum(...)`                                           |
| `literal`                                  | Divergência de literal                                                          |
| `tuple_length`                             | O comprimento do array da tupla não casou com seu shape                         |
| `union_no_match`                           | Nenhum ramo de `union(...)` aceitou o valor                                     |
| `unknown_key`                              | Objeto recebeu uma chave não declarada no schema (e `stripUnknown` é false)     |
| `ref_target_missing`                       | Alvo de `a.ref(name)` não registrado na instância Sapphire                      |

Adapters de terceiros e futuras APIs de refine podem anexar seus próprios códigos; `IssueCode` é `... | (string & {})`, então códigos customizados passam na verificação de tipos enquanto os embutidos ainda têm autocomplete.

## Hierarquia de resolução de mensagens

A mais específica vence. Cada linha vence todas as linhas acima dela:

| Camada             | API                                      |
| ------------------ | ---------------------------------------- |
| Embutida           | `packages/core/src/messages.ts` (inglês) |
| Instância Sapphire | `new Sapphire({ messages: {...} })`      |
| Nível de field     | `a.string().message('...' \| {...})`     |
| Por regra          | `a.string().min(3, { message: '...' })`  |
| Por chamada        | `schema.parse(v, { messages: {...} })`   |

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const a = new Sapphire({ messages: { min_length: 'instance: too short' } })

const name = a
  .string()
  .min(3, { message: 'per-rule: at least 3' })
  .message({ min_length: 'field: too short' })

// per-rule wins over field-level
const r1 = name.safeParse('ab')

// per-call beats per-rule
const r2 = name.safeParse('ab', {
  messages: { min_length: 'per-call wins' },
})
```

Um `MessageValue` é `string | object | (ctx: MessageContext) => string | object`. A forma de função recebe `ctx = { path, code, ...extras }` (extras de regra como `min`, `max`, `expected`, `got`).

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const name = a.string().min(3, {
  message: (ctx) => `[${ctx.path.join('.')}] code=${ctx.code} min=${String(ctx.min)}`,
})

name.safeParse('ab')
// issue.message === '[] code=min_length min=3'
```

## `abortEarly`

`false` por padrão — o Sapphire coleta toda issue por toda a entrada antes de retornar. Defina como `true` (na instância ou por chamada) para curto-circuitar na primeira falha.

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const result = user.safeParse({ name: '', age: -1 }, { abortEarly: true })
// result.error.issues.length === 1
```

`abortEarly: true` desiste na primeira falha de regra tanto **entre** fields (chave de objeto, item de array, posição de tupla, entrada de record) quanto **dentro** de um único field folha (cadeia de regras de `string`/`number`/`date`). Então `a.string().min(10).regex(/^x/)` contra `'a'` emite uma issue quando abortEarly está ligado, e as duas quando está desligado.

A desistência é uniforme entre os fields compostos: as verificações de comprimento/`minItems`/`maxItems` de um array, a verificação de comprimento de uma tupla e as verificações por chave de um objeto todas param na **primeira** issue quando `abortEarly` está ligado. Um array que viola tanto `.length(4)` quanto `.min(3)` reporta apenas uma issue sob `abortEarly`, nunca iniciando a validação por item.

### Por que o padrão é acumular

`safeParse` mantém toda falha de regra em todo field por design — o modelo **"diga ao usuário tudo o que está errado de uma vez"** combina com validação de formulários e de API, onde expor erros parciais leva a ciclos de correção de "bate-toupeira". Um único field string com `.length(5).min(7)` contra `'abc'` vai reportar **tanto** `length` quanto `min_length` para que a UI possa destacar as duas restrições de uma vez. Vire `abortEarly` apenas em fronteiras quentes (por exemplo, pontos de entrada de servidor) onde você quer falhar rápido e não se importa com a completude.

## `stripUnknown`

`false` por padrão. Com o padrão, chaves desconhecidas num objeto rendem uma issue `code: 'unknown_key'` por chave infratora (uma por chave, percorridas da esquerda para a direita). Com `stripUnknown: true`, as chaves desconhecidas são silenciosamente descartadas da saída e nenhuma issue é emitida.

<!-- from tests/docs-examples/validation.test.ts -->

```ts
const strict = user.safeParse({ name: 'Ada', rogue: 1 })
// strict.success === false; issues[0].code === 'unknown_key'

const lax = user.parse({ name: 'Ada', rogue: 1 }, { stripUnknown: true })
// lax === { name: 'Ada' }
```

## Armadilhas

> [!WARNING]
> **`safeParse` nunca muta a entrada.** Mesmo quando modificadores de `coerce`/transform disparam (por exemplo, `a.string().trim()`, `a.number().coerce()`), o Sapphire produz um valor NOVO em `result.data`. O objeto original permanece intocado.

> [!WARNING]
> **Mensagens-função executam por falha, não no momento da definição do field.** O `ctx` é reconstruído para toda issue, então estado de closure numa função de mensagem será invocado uma vez por falha em todos os parses do field. Útil para i18n (`(ctx) => translate(ctx.code, ctx)`), mas não coloque computações caras dentro.

> [!WARNING]
> **`abortEarly: true` esconde issues posteriores.** O padrão é `false` por um motivo — a maioria das UIs quer todo erro de uma vez. Vire-o para fronteiras de servidor de falha rápida, não para formulários.

> [!WARNING]
> **`stripUnknown: true` afeta apenas chaves desconhecidas; ele não relaxa outras regras.** Ele remove os extras da saída silenciosamente. Se você quer um modo estrito de "lançar erro em extras", combine-o com uma verificação explícita de `unknown_key` ou documente o contrato da API em outro lugar — o Sapphire não tem um modificador `strict()` na v1.

## Relacionados

- [Configuração](./config.md) — opções de instância e sobrescritas por chamada em detalhe.
- [Nullable vs optional](./nullable-vs-optional.md) — quando `required` vs `invalid_type` dispara.
- [Receitas → Mensagens de erro customizadas](../recipes/custom-error-messages.md).
