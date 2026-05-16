<!-- Code in this guide is verified by tests/docs-examples/config.test.ts -->

# Configuração

A instância `Sapphire` carrega a configuração e o registro de schemas nomeados. Você constrói uma com `new Sapphire(options)` e a usa como ponto de entrada do DSL — `a.object(...)`, `a.string(...)`, etc. A maioria das aplicações exporta uma única instância e a importa em todo lugar, mas a classe é totalmente testável: nada global, sem singleton, sem efeitos colaterais de módulo.

## Exemplo mínimo

<!-- from tests/docs-examples/config.test.ts -->

```ts
import { Sapphire } from '@ascendance-hub/sapphire-core'

const a = new Sapphire({
  abortEarly: true,
  stripUnknown: true,
  messages: { min_length: 'too short' },
})

const user = a.object({
  name: a.string().min(3),
  age: a.number(),
})

const r = user.safeParse({ name: 'ab', age: 1, extra: 'ignored' })
// r.error.issues.length === 1 (abortEarly), and 'extra' was dropped
```

## `SapphireOptions`

| Opção            | Tipo                                                    | Padrão      | Observações                                                                          |
| ---------------- | ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `defaultAdapter` | `string \| undefined`                                   | `undefined` | Nome usado por `field.getSchema()` quando chamado sem argumento                      |
| `messages`       | `Partial<Record<IssueCode, MessageValue>> \| undefined` | `undefined` | Sobrescritas globais de mensagem (uma camada da hierarquia de resolução)             |
| `stripUnknown`   | `boolean`                                               | `false`     | Aplicado a todo parse; com `false`, chaves desconhecidas emitem issues `unknown_key` |
| `abortEarly`     | `boolean`                                               | `false`     | Aplicado a todo parse; com `true`, para na primeira issue                            |

## Sobrescritas por chamada

`parse` e `safeParse` aceitam os mesmos nomes. A chamada vence sobre a instância:

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a = new Sapphire({ abortEarly: true })
const schema = a.object({
  name: a.string().min(1),
  age: a.number().nonnegative(),
})

// Instance says abortEarly:true, per-call flips it to false:
const r = schema.safeParse({ name: '', age: -1 }, { abortEarly: false })
// r.error.issues collects both failures despite the instance default
```

## As camadas de mensagem em um só lugar

A hierarquia completa (a mais específica vence):

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a = new Sapphire({
  messages: { min_length: 'instance level' },
})

const onlyInstance = a.string().min(3)
// onlyInstance.safeParse('ab') → 'instance level'

const withField = a.string().min(3).message({ min_length: 'field level' })
// withField.safeParse('ab') → 'field level' (field beats instance)

const withRule = a.string().min(3, { message: 'rule level' })
// withRule.safeParse('ab') → 'rule level' (rule beats field & instance)

withRule.safeParse('ab', { messages: { min_length: 'call level' } })
// → 'call level' (per-call beats everything)
```

Veja [Validação](./validation.md) para a mesma hierarquia enquadrada em torno das issues.

## Registro de schemas nomeados

A instância é dona de um `NamedSchemaRegistry` (populado por `.name(...)` em object fields, lido por `a.ref(...)`). Ele é **por instância** — duas instâncias `Sapphire` nunca compartilham estado:

<!-- from tests/docs-examples/config.test.ts -->

```ts
const a1 = new Sapphire()
const a2 = new Sapphire()

a1.object({ x: a1.string() }).name('User')
a2.object({ y: a2.string() }).name('User')
// No collision — each Sapphire has its own NamedSchemaRegistry.
```

## Armadilhas

> [!WARNING]
> **Não compartilhe uma instância Sapphire entre módulos a menos que os schemas devam ser compartilhados.** O registro de schemas nomeados é por instância; se o módulo A e o módulo B fizerem `.name('User')` contra o mesmo `a`, o segundo lança erro. Testes em particular devem construir um `new Sapphire()` novo por arquivo (ou por teste).

> [!WARNING]
> **Mensagens-função executam NO MOMENTO DA MENSAGEM, não no momento da criação do field.** Elas recebem `ctx = { path, code, ...extras }` por falha, mas não têm acesso à instância Sapphire — feche por closure quaisquer dados extras de que precisar no local da definição.

> [!NOTE]
> **Um field captura as opções de sua instância quando é construído.** `defaultAdapter` e as camadas de mensagem são lidas da instância `Sapphire` no momento em que `a.string()` / `a.object()` etc. executam. `abortEarly` e `stripUnknown`, por outro lado, são lidos no momento do parse. A regra prática: construa uma instância `Sapphire` por configuração lógica e construa todos os schemas daquela configuração a partir dela — não espere que um field construído na instância A capture mudanças que você faça construindo a instância B depois.

## Relacionados

- [Validação](./validation.md) — opções de `parse` / `safeParse` e o formato das issues.
- [Refs e relações](./refs-and-relations.md) — como o registro de schemas nomeados é usado.
- [Escape hatch](./escape-hatch.md) — configuração específica de adapter que não pertence a `SapphireOptions`.
