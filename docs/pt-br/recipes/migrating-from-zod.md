# Migrando do Zod

## Caso de uso

Você conhece o Zod. A DX de construtor fluente é parecida o suficiente para que o Sapphire pareça familiar — mas as bibliotecas resolvem problemas diferentes. O Zod é uma biblioteca **validation-first** com um pipeline profundo de refinamento e transformação. O Sapphire é **schema-first**: a validação é uma de várias saídas (ao lado de Mongoose, Drizzle, JSON Schema). Esta receita mapeia os seus hábitos existentes do Zod para os idiomas do Sapphire e aponta onde as duas bibliotecas divergem.

Se a sua única necessidade é validação, **fique com o Zod**. O Sapphire brilha quando você quer que a mesma definição de schema conduza um modelo de ORM e um contrato de frontend.

## Mini-comparações lado a lado

### Definição de schema

```ts
// Zod
import { z } from 'zod'
const User = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0),
})
```

```ts
// Sapphire
import { Sapphire } from '@ascendance-hub/sapphire-core'
const a = new Sapphire()
const User = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0),
})
```

O Zod tem um singleton (`z.*`). O Sapphire exige uma instância `new Sapphire()` — geralmente uma por aplicação, exportada de um único módulo — porque ela é dona do registro de schemas nomeados e da configuração.

### Optional / nullable

```ts
// Zod
z.string().optional() // string | undefined
z.string().nullable() // string | null
z.string().nullish() // string | null | undefined
```

```ts
// Sapphire
a.string().optional() // string | undefined
a.string().nullable() // string | null
a.string().nullable().optional() // string | null | undefined
```

Sem atalho `nullish()` — encadeie `.nullable().optional()`. Veja [Conceitos → Nullable vs optional](../concepts/nullable-vs-optional.md) para entender por que a distinção importa na camada de persistência.

### Composição

```ts
// Zod
User.pick({ name: true, email: true })
User.omit({ age: true })
User.partial()
User.extend({ role: z.string() })
User.merge(OtherSchema)
```

```ts
// Sapphire
User.pick(['name', 'email'] as const)
User.omit(['age'] as const)
User.partial()
User.extend({ role: a.string() })
User.merge(OtherSchema)
```

Paridade de API, duas diferenças notáveis: o `pick`/`omit` do Sapphire recebem um array de chaves (com `as const` para inferência literal) em vez de uma máscara de objeto, e os métodos de composição estão disponíveis apenas em **ObjectField** — primitivos não os têm. Veja [Conceitos → Composição](../concepts/composition.md).

### Inferência de tipos

```ts
// Zod
type User = z.infer<typeof User> // output type
type UserInput = z.input<typeof User> // input type
```

```ts
// Sapphire
import type { Infer, InferInput } from '@ascendance-hub/sapphire-core'
type User = Infer<typeof User> // output type
type UserInput = InferInput<typeof User> // input type
```

Mesma semântica, superfície de importação diferente. Veja [Conceitos → Inferindo tipos](../concepts/inferring-types.md).

### Parse / safeParse

```ts
// Zod
User.parse(value) // throws ZodError
User.safeParse(value) // { success, data | error }
```

```ts
// Sapphire
User.parse(value) // throws SapphireValidationError
User.safeParse(value) // { success, data | error }
```

Semanticamente idênticos no local da chamada. O formato do erro é parecido — o `error.issues` do Sapphire é um `ValidationIssue[]` plano (o do Zod é `ZodIssue[]`), ambos com `path`, `code`, `message`. A migração é geralmente um find-and-replace no tipo de erro e (às vezes) um mapeamento de tabela de códigos.

### Refinamentos

```ts
// Zod
z.string().refine((s) => s.startsWith('A'), { message: 'must start with A' })
```

```ts
// Sapphire — no general .refine() in v1; for ORM-specific escape hatches:
a.string()
  .startsWith('A', { message: 'must start with A' })
  .adapter('mongoose', { validate: { validator: (v: string) => v.startsWith('A') } })
```

O Sapphire v1 **não tem** equivalente de propósito geral para `.refine()` / `.superRefine()`. As regras embutidas (`min`, `max`, `regex`, `startsWith`, `endsWith`, `email`, `url`, `uuid`, `int`, `multipleOf`, `finite`, `safe`, etc.) cobrem a maioria dos casos, e `.adapter('mongoose', { validate: ... })` canaliza um validador customizado para o Mongoose para imposição no nível do banco. Uma API geral de validador customizado está no roadmap V1_FUTURE.

## O que o Sapphire faz que o Zod não faz

- **Emissão de múltiplas saídas.** O mesmo schema produz um `mongoose.Schema`, uma tabela do Drizzle (`pgTable` / `mysqlTable` / `sqliteTable`) e um documento JSON Schema 2020-12. O Zod é apenas validação; conversores existem como pacotes de terceiros mas não fazem parte do centro do design.
- **Opções de nível de schema em objetos.** `.timestamps()`, `.index([...], { unique: true })`, `.adapter('mongoose', { collection: 'people' })` — de primeira classe para preocupações de persistência. O Zod não tem equivalente porque não modela "este schema vira uma tabela".
- **Refs.** `a.ref('User')` e `a.ref(SchemaObj)` modelam relações entre schemas nomeados. O Mongoose os popula no momento da query; o JSON Schema os transforma em `$ref`; o Drizzle em `references(() => ...)`. O Zod não tem um conceito nativo de ref.
- **Uma IR documentada.** `SapphireSchemaNode` é uma union discriminada que você pode percorrer você mesmo — útil para construir o seu próprio adapter (veja [Receitas → Adapter customizado](./custom-adapter.md)).

## O que o Zod faz que o Sapphire (ainda) não faz

- **`refine` / `superRefine`** — validadores customizados arbitrários com acesso rico a `ctx`. O Sapphire v1 entrega apenas o conjunto de regras embutidas; validadores customizados são V1_FUTURE.
- **Pipeline de transformação mais amplo.** O Zod tem `.transform()` e `.pipe()` para mapeamento arbitrário de entrada → saída. O Sapphire tem transforms estreitos (`.trim()`, `.toLowerCase()`, `.toUpperCase()` em strings; `.coerce()` em primitivos) e nenhum `.pipe()` geral.
- **Parsing assíncrono.** O Zod tem `parseAsync` / `safeParseAsync`. O parsing do Sapphire é apenas síncrono na v1.
- **Tipos primitivos marcados (branded).** `z.string().brand<'UserId'>()` é um truque de TS específico do Zod para tipagem nominal. O Sapphire não tem equivalente — use `as unknown as Brand<'UserId'>` no local de uso se você precisar disso.
- **Unions discriminadas com estreitamento no nível do TS.** O `z.discriminatedUnion('kind', [...])` do Zod dá a você um tipo de saída estreitado por `kind`. O `a.type().union([...])` do Sapphire é estrutural — estreite você mesmo no código de usuário.
- **Ecossistema maduro de plugins e receitas.** O Zod tem anos de pacotes da comunidade, codemods e respostas no StackOverflow. O Sapphire é v1.

### Paridade que o Sapphire tem

- **Helpers `error.flatten()` / `error.format()`.** Como o Zod, o `SapphireValidationError` traz `flatten()` (arrays de string chaveados por field para renderização de formulário), `format()` (árvore de erro aninhada correspondente ao shape do schema) e `toJSON()` (shape seguro para serialização). Veja [`validation.md`](../concepts/validation.md).

## Caminhos de migração recomendados

- **Continue usando o Zod para validação pura.** Se o seu único consumidor do schema é `parse`/`safeParse`, não há motivo para trocar.
- **Migre para o Sapphire para schemas compartilhados / cientes de persistência.** Quando o mesmo shape precisa chegar ao MongoDB / Drizzle / JSON Schema / um gerador de formulários de frontend, a história de múltiplas saídas vence.
- **Coexista onde isso ajuda.** Nada impede você de usar o Zod para validação de requisição em uma camada e o Sapphire para definição de schema de ORM em outra. Eles não compartilham tipos, mas também não brigam.

> [!WARNING]
> **A ausência de `refine`/`superRefine` significa que alguns padrões do Zod não migram diretamente.** Audite o seu código em busca de chamadas `.refine(` e `.superRefine(` antes de migrar — essas precisam ser reexpressas como regras embutidas, validadores de adapter via escape hatch, ou uma verificação pós-`parse`.

> [!WARNING]
> **O Sapphire é síncrono.** `parseAsync` / `safeParseAsync` não têm equivalente. Se você depende de refinamentos assíncronos (por exemplo, buscas em banco de dados), mantenha-os fora do schema e execute-os após o `safeParse` ter sucesso.

## Veja também

- [Conceitos → Visão geral](../concepts/overview.md) — o modelo mental e onde o Sapphire se encaixa.
- [Conceitos → Composição](../concepts/composition.md) — referência de `pick` / `omit` / `partial` / `extend` / `merge`.
- [Conceitos → Validação](../concepts/validation.md) — shape de issue, tabela de `IssueCode`, hierarquia de mensagens.
- [Receitas → Um schema, muitos adapters](./one-schema-many-adapters.md) — o caso de uso de múltiplas saídas em detalhe.
