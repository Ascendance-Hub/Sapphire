<!-- Code in this guide is verified by tests/docs-examples/fields-and-modifiers.test.ts -->

# Fields e modificadores

O DSL de field do Sapphire é a superfície voltada ao usuário da biblioteca. Toda chamada em uma instância `Sapphire` (`a.string()`, `a.object({...})`, `a.type().union([...])`) retorna um novo `Field` imutável. Modificadores como `.optional()`, `.min(3)`, `.default('x')` retornam novos fields em vez de mutar o anterior — cadeias são seguras para compartilhar e reutilizar.

Esta página é a referência para todo construtor de field e todo modificador que ele suporta. Para os métodos de composição em objetos (`pick`, `omit`, `partial`, `required`, `extend`, `merge`) veja [Composição](./composition.md). Para union/literal/enum veja [Unions, literais e enums](./unions-literals-enums.md).

## Exemplo mínimo

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const user = a.object({
  name: a.string().min(1).max(120),
  age: a.number().int().nonnegative(),
  active: a.boolean().default(true),
  createdAt: a.date(),
})

type User = Infer<typeof user>
// User = { name: string; age: number; active: boolean; createdAt: Date }
```

## Primitivos

### `a.string()`

| Modificador                  | Assinatura                                         | Observações                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.min(n, opts?)`             | `(n: number, opts?: { message? }) => StringField`  | Comprimento mínimo. Código de erro `min_length`.                                                                                                                       |
| `.max(n, opts?)`             | mesma                                              | Comprimento máximo. Código de erro `max_length`.                                                                                                                       |
| `.length(n, opts?)`          | mesma                                              | Comprimento exato. Código de erro `length`.                                                                                                                            |
| `.regex(re, opts?)`          | `(re: RegExp, opts?: { message? }) => StringField` | Testa com `re.test(str)`. Código de erro `regex`.                                                                                                                      |
| `.email(opts?)`              | `(opts?: { message? }) => StringField`             | Verificação de formato embutida (veja a nota). Código de erro `format`.                                                                                                |
| `.url(opts?)`                | mesma                                              | Formato `url` — usa o construtor `URL` da plataforma; aceita qualquer coisa que `new URL(value)` consiga parsear.                                                      |
| `.uuid(opts?)`               | mesma                                              | Formato `uuid` — RFC 4122 v1–v8 com nibble de variante válido (`8`/`9`/`a`/`b`).                                                                                       |
| `.startsWith(prefix, opts?)` | `(prefix: string, opts?) => StringField`           | Código de erro `starts_with`.                                                                                                                                          |
| `.endsWith(suffix, opts?)`   | `(suffix: string, opts?) => StringField`           | Código de erro `ends_with`.                                                                                                                                            |
| `.trim()`                    | `() => StringField`                                | Transform — executa após o coerce, antes das verificações de regra.                                                                                                    |
| `.toLowerCase()`             | `() => StringField`                                | Transform.                                                                                                                                                             |
| `.toUpperCase()`             | `() => StringField`                                | Transform.                                                                                                                                                             |
| `.coerce()`                  | `() => StringField`                                | `String(value)` se a entrada não for string (ignorado para `null`/`undefined` — esses passam pela verificação required/nullable). Executa primeiro (veja a armadilha). |

Exemplo:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const email = a.string().min(3).max(254).email()
```

> [!NOTE]
> **`.email()` é pragmático, não completo segundo a RFC 5322.** O regex embutido cobre ~99% dos endereços práticos — ele rejeita lixo óbvio (`a@b..c`, pontos no início/fim, TLD faltando) mas não aceita formas exóticas-porém-legais-pela-RFC como partes locais entre aspas (`"foo bar"@example.com`). Se você precisa de conformidade total com a RFC, pluge um validador de terceiros via `.regex(yourRegex)` ou verificações pós-`safeParse`.

### `a.number()`

| Modificador             | Assinatura                                        | Observações                                                |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `.min(n, opts?)`        | `(n: number, opts?: { message? }) => NumberField` | Limite inferior inclusivo. Código de erro `min`.           |
| `.max(n, opts?)`        | mesma                                             | Limite superior inclusivo. Código de erro `max`.           |
| `.gt(n, opts?)`         | mesma                                             | Limite inferior exclusivo. Código de erro `gt`.            |
| `.gte(n, opts?)`        | mesma                                             | Inferior inclusivo; reportado como código `gte`.           |
| `.lt(n, opts?)`         | mesma                                             | Superior exclusivo. Código de erro `lt`.                   |
| `.lte(n, opts?)`        | mesma                                             | Superior inclusivo; reportado como código `lte`.           |
| `.int(opts?)`           | `(opts?) => NumberField`                          | `Number.isInteger`. Código de erro `int`.                  |
| `.positive(opts?)`      | açúcar para `.gt(0)`                              |                                                            |
| `.negative(opts?)`      | açúcar para `.lt(0)`                              |                                                            |
| `.nonnegative(opts?)`   | açúcar para `.gte(0)`                             |                                                            |
| `.nonpositive(opts?)`   | açúcar para `.lte(0)`                             |                                                            |
| `.multipleOf(n, opts?)` | `(n: number, opts?) => NumberField`               | `value % n === 0`. Código de erro `multiple_of`.           |
| `.finite(opts?)`        | `(opts?) => NumberField`                          | Rejeita `Infinity` / `-Infinity`. Código de erro `finite`. |
| `.safe(opts?)`          | `(opts?) => NumberField`                          | `Number.isSafeInteger`. Código de erro `safe`.             |
| `.coerce()`             | `() => NumberField`                               | `Number(value)`; preserva o original se `NaN`.             |

Exemplo:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const age = a.number().int().gte(0).lte(150)
```

### `a.boolean()`

Boolean não tem modificadores de regra — apenas os universais e `.coerce()`. Com coerce, as strings `'true'`/`'false'` e os números `1`/`0` são aceitos.

### `a.date()`

| Modificador      | Assinatura                      | Observações                                              |
| ---------------- | ------------------------------- | -------------------------------------------------------- |
| `.min(d, opts?)` | `(d: Date, opts?) => DateField` | `value.getTime() >= d.getTime()`. Código de erro `min`.  |
| `.max(d, opts?)` | mesma                           | Código de erro `max`.                                    |
| `.coerce()`      | `() => DateField`               | `new Date(value)` para number/string antes da validação. |

Estrito por padrão — apenas instâncias de `Date` são aceitas. Chame `.coerce()` para também aceitar strings ou números (payloads de formulário, parâmetros de URL, timestamps desserializados de JSON); a IR do adapter (`coerce: false` vs `coerce: true`) reflete honestamente o que o runtime vai aceitar.

## Compostos

### `a.object(shape)`

Shape é um record de `Field`s. A saída é um objeto simples cujas chaves espelham `shape`, com os fields opcionais elevados para posições `?:`.

ObjectField também carrega metadados de nível de schema: `.name(n)`, `.timestamps()`, `.index(keys, opts?)`. Ele também expõe os métodos de composição `pick`, `omit`, `partial`, `required`, `extend`, `merge` — esses têm sua própria página em [Composição](./composition.md).

### `a.array(item)`

Homogêneo, de comprimento variável. O único argumento `item` é o field interno — toda entrada é validada contra ele. Modificadores: `.min(n)`, `.max(n)`, `.length(n)`, `.nonempty()`.

### `a.tuple([f1, f2, ...])`

Heterogêneo, de comprimento fixo. Veja [Tuplas vs arrays](./tuples-vs-arrays.md) para a comparação.

## Namespace de tipos

`a.type()` retorna um construtor para os kinds não-folha:

| Chamada                                 | Retorna        | Observações                                                                            |
| --------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `a.type().union([f1, f2, ...])`         | `UnionField`   | `_output = T1 \| T2 \| ...`. Veja [unions-literals-enums](./unions-literals-enums.md). |
| `a.type().literal(value)`               | `LiteralField` | `value: string \| number \| boolean`. `_output = value` (estreitado).                  |
| `a.type().enum(values \| tsEnum)`       | `EnumField`    | Aceita `['a','b'] as const` ou um `enum` do TS.                                        |
| `a.type().record(keyField, valueField)` | `RecordField`  | Objeto simples cujas chaves se conformam a `keyField`, valores a `valueField`.         |

## Refs

`a.ref(target)` declara "esta posição contém uma referência a um schema nomeado". `target` é ou um `ObjectField` retornado por `.name(...)` ou a string do nome diretamente. A validação verifica a presença e que o nome referenciado está registrado na instância Sapphire — um alvo não registrado faz `safeParse` falhar com uma issue `ref_target_missing`. Ela não verifica o shape do valor referenciado na v1. Os adapters resolvem o shape do alvo (Mongo `ObjectId`, JSON Schema `$ref`, Drizzle `references(() => target.id)`). Cobertura detalhada em [Refs e relações](./refs-and-relations.md).

## Modificadores universais

Estes estão disponíveis em todo field. (`unique`, `index` e os `name`/`timestamps` de nível de schema não são estritamente universais — veja as tabelas por field — mas seguem a mesma convenção encadeável.)

| Modificador            | Assinatura                                       | Observações                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.optional()`          | `() => Field<T \| undefined>`                    | Remove a flag required. `_output` e `_input` ambos passam a ser `T \| undefined`.                                                                                            |
| `.required()`          | `() => Field<Exclude<T, undefined>>`             | Inverso de `.optional()`. Útil dentro de composição genérica.                                                                                                                |
| `.nullable()`          | `() => Field<T \| null>`                         | Distinto de optional. Veja [Nullable vs optional](./nullable-vs-optional.md).                                                                                                |
| `.default(value)`      | `(value: TOut) => Field<TOut, TIn \| undefined>` | Quando a entrada é `undefined`, o padrão preenche. `_input` se alarga para `T \| undefined`.                                                                                 |
| `.describe(text)`      | `(text: string) => Field`                        | Descrição em formato livre; os adapters a expõem (Mongo `meta`, JSON Schema `description`).                                                                                  |
| `.adapter(name, opts)` | `(name: string, opts: unknown) => Field`         | Escape hatch por adapter — os opts são mesclados na saída do adapter para este field.                                                                                        |
| `.message(msg)`        | `(msg: string \| FieldMessages) => Field`        | Sobrescrita de mensagem de nível de field (um dos cinco níveis da hierarquia de resolução).                                                                                  |
| `.unique()`            | `() => Field`                                    | Marca o field como único no sentido de índice. Apenas string/number/date. Para unicidade composta entre múltiplas chaves, use `ObjectField.index([keys], { unique: true })`. |
| `.index(opts?)`        | `(opts?: { unique?: boolean }) => Field`         | Marca o field como indexado. Apenas string/number/boolean/date.                                                                                                              |

Exemplo:

<!-- from tests/docs-examples/fields-and-modifiers.test.ts -->

```ts
const bio = a.string().max(280).optional().describe('User bio (markdown)')
const nickname = a.string().nullable()
const role = a.string().default('member')
```

## Armadilhas

> [!WARNING]
> **`.coerce()` executa primeiro.** A ordem é `coerce → substituição de default → tratamento de null/undefined → verificação de invalid_type → transforms → verificações de regra`. Os validadores veem o valor coagido, não a entrada crua. O trecho abaixo converte `42` para `"42"` antes de a verificação `min(3)` disparar.
>
> <!-- from tests/docs-examples/fields-and-modifiers.test.ts -->
>
> ```ts
> const slug = a.string().coerce().toLowerCase().min(3)
> // The number 42 becomes the string "42" first, then lowercases (no-op),
> // then is checked against min(3) — which fails because "42".length === 2.
> ```

> [!WARNING]
> **`.nullable()` NÃO é `.optional()`.** `nullable` aceita `null`; `optional` aceita `undefined`. Eles são independentes — combine-os se você quer ambos. Veja [Nullable vs optional](./nullable-vs-optional.md).

## Relacionados

- [Inferindo tipos](./inferring-types.md) — como os modificadores alimentam `Infer<>`.
- [Composição](./composition.md) — `pick`, `omit`, `partial`, `required`, `extend`, `merge`.
- [Unions, literais e enums](./unions-literals-enums.md).
- [Tuplas vs arrays](./tuples-vs-arrays.md).
- [Receitas → Mensagens de erro customizadas](../recipes/custom-error-messages.md).
- [Receitas → Escrevendo um adapter customizado](../recipes/custom-adapter.md).
