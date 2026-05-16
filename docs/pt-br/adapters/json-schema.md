# Adapter de JSON Schema — `@ascendance-hub/sapphire-json-schema`

O adapter de JSON Schema compila uma IR do Sapphire (`SapphireSchemaNode`) em um documento [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/). A saída é JSON puro — passe-o para o AJV (`ajv/dist/2020.js`), alimente um gerador de formulários de frontend como `react-jsonschema-form`, exponha-o como o `inputSchema` de uma ferramenta do Model Context Protocol, ou compartilhe-o com um validador em Python. Mesmo shape, todos os consumidores.

## Instalação

```bash
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-json-schema
```

Apenas `@ascendance-hub/sapphire-core` é peer. Não há outros requisitos de runtime — o adapter emite JSON; escolha o validador que preferir.

## Dialeto — por que 2020-12

O Sapphire mira o draft **2020-12** especificamente. Dois motivos (V1_DESIGN §15 #4):

1. **`prefixItems`** é a representação canônica de tupla; drafts mais antigos usavam o polimórfico `items: [...]` que o AJV não trata mais como posicional depois do draft-07.
2. **`exclusiveMinimum`/`exclusiveMaximum` numéricos** — drafts mais antigos emitiam flags booleanas; o 2020-12 usa formas numéricas que se compõem de forma limpa com `minimum`/`maximum`.

Use o construtor do AJV ciente do 2020:

```ts
import Ajv2020 from 'ajv/dist/2020.js'

const ajv = new Ajv2020({ strict: false })
```

O `new Ajv()` simples (draft-07 padrão na v8) vai engasgar com `prefixItems`.

## Registrando o adapter

```ts
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

registerAdapter('json-schema', toJsonSchema)

export const a = new Sapphire({ defaultAdapter: 'json-schema' })
```

O adapter **não é registrado automaticamente** — chame isto uma vez no seu ponto de entrada.

## Início rápido

```ts
import Ajv2020 from 'ajv/dist/2020.js'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { a } from './sapphire'

const CreateUser = a
  .object({
    name: a.string().min(1),
    email: a.string().email(),
    age: a.number().int().min(0).optional(),
  })
  .name('CreateUser')

const schema = toJsonSchema(CreateUser.toSchema(), {
  $id: 'https://example.com/schemas/create-user',
})

const ajv = new Ajv2020({ strict: false })
const validate = ajv.compile(schema)
validate({ name: 'Ada', email: 'ada@example.com' }) // → true
```

Ou, com o adapter registrado: `CreateUser.getSchema('json-schema')`.

## Mapeamento IR → JSON Schema

| IR `kind`          | Saída JSON Schema                                                                         | Observações                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`           | `{ type: 'string', ... }`                                                                 | `minLength`/`maxLength`/`length` diretos. `regex` → `pattern`; `startsWith`/`endsWith` → patterns escapados; combiná-los rende `allOf: [{ pattern }, ...]`. `format`: `url` reescrito para `uri`; outros passam direto. |
| `number`           | `{ type: 'number' \| 'integer', ... }`                                                    | `int()` → `'integer'`. `min`/`max`/`exclusiveMin`/`exclusiveMax`/`multipleOf` mapeiam diretamente. `finite`/`safe` são no-op.                                                                                           |
| `boolean`          | `{ type: 'boolean' }`                                                                     | —                                                                                                                                                                                                                       |
| `date`             | `{ type: 'string', format: 'date-time' }`                                                 | `min`/`max` (Date) são no-op. O AJV precisa de `ajv-formats` para verificar `date-time` em runtime.                                                                                                                     |
| `object` (anônimo) | `{ type: 'object', properties, required }`                                                | `required` derivado de `child.required === true`. `additionalProperties` definido quando a opção do adapter está presente.                                                                                              |
| `object` (nomeado) | `{ $ref: '#/$defs/<name>' }` no local de uso; o corpo vive nos `$defs` de nível superior. | Nomes precisam casar com `[A-Za-z0-9_-]+` — o escaping de JSON Pointer não é feito.                                                                                                                                     |
| `array`            | `{ type: 'array', items, minItems, maxItems }`                                            | `nonempty()` → `minItems: 1`. `length(n)` → ambos os limites em `n`.                                                                                                                                                    |
| `tuple`            | `{ type: 'array', prefixItems, items: false, minItems, maxItems }`                        | Shape do 2020-12. O comprimento é fixo (ambos os limites iguais a `items.length`).                                                                                                                                      |
| `union`            | `{ oneOf: [...] }`                                                                        | Semanticamente exclusivo — exatamente um ramo deve casar.                                                                                                                                                               |
| `literal`          | `{ const: value }`                                                                        | —                                                                                                                                                                                                                       |
| `enum`             | `{ type, enum: [...values] }`                                                             | `type` é `'number'` se todo valor for numérico, senão `'string'`.                                                                                                                                                       |
| `record`           | `{ type: 'object', additionalProperties, propertyNames? }`                                | `propertyNames` só é emitido quando o field de chave carrega restrições reais (`hasStringConstraints`).                                                                                                                 |
| `ref`              | `{ $ref: '#/$defs/<target>' }`                                                            | Ciclos são nativos no 2020-12.                                                                                                                                                                                          |

### Tratamento de `nullable`

Duas estratégias de emissão:

- **Primitivo simples sem `enum`** → elevado para uma união de tipos: `{ type: ['string', 'null'], ... }`.
- **Compostos, refs, enums, literais** → envolvidos em `oneOf`: `{ oneOf: [<original>, { type: 'null' }] }`.

```ts
a.string().nullable()
// → { type: ['string', 'null'] }

a.type().enum(['admin', 'user']).nullable()
// → { oneOf: [{ type: 'string', enum: ['admin', 'user'] }, { type: 'null' }] }
```

### Modificadores universais

| Modificador                                         | Efeito                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `default(v)`                                        | `out.default = v`.                                                                             |
| `describe(s)`                                       | `out.description = s`.                                                                         |
| `enum([...])`                                       | `out.enum = [...]` (quando ainda não definido pelo próprio kind).                              |
| `unique`/`index`/`timestamps`/`coerce`/`transforms` | **No-op.** O JSON Schema é descritivo; estas são preocupações de banco de dados ou de runtime. |

### Coletor de `$defs`

`toJsonSchema` percorre a árvore de entrada e coleta automaticamente todo objeto **nomeado** nos `$defs` de nível superior. As travessias descem para:

- `object.properties` (filhos),
- `array.items`,
- `tuple.items[]`,
- `union.options[]`,
- `record.keys` e `record.values`.

Ele **não** percorre fields arbitrários que você referencia em outro lugar. Se um `ref('Other')` aponta para um schema não embutido na árvore de entrada, passe-o via `options.defs`:

```ts
toJsonSchema(User.toSchema(), {
  defs: {
    Profile: ProfileObjectField.toSchema(),
  },
})
```

Ciclos (por exemplo, User ↔ Post) funcionam porque `$ref` é apenas uma string — nenhuma recursão acontece até o momento da validação.

## `JsonSchemaAdapterOptions`

O segundo argumento de `toJsonSchema(node, options?)`:

| Opção                  | Padrão  | Efeito                                                                                                                                                                                                                                        |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalProperties` | omitido | Quando definido, emitido em todo schema de objeto. O padrão da spec do JSON Schema é `true` (permissivo); passe `false` para o modo estrito que rejeita chaves desconhecidas. Sobrescritas por objeto ainda são possíveis via o escape hatch. |
| `$id`                  | omitido | URL `$id` de nível superior.                                                                                                                                                                                                                  |
| `defs`                 | `{}`    | Schemas nomeados extras anexados aos `$defs` além do que o walker coleta automaticamente.                                                                                                                                                     |
| `emitSchemaUri`        | `true`  | Se deve emitir `$schema: 'https://json-schema.org/draft/2020-12/schema'`. Desligue ao embutir em um wrapper que já declara o dialeto.                                                                                                         |

## Escape hatch `.adapter('json-schema', opts)`

Qualquer coisa passada via `.adapter('json-schema', { ... })` é lida de `meta['json-schema']` e mesclada no nó de saída **por último** (depois das chaves derivadas pelo Sapphire). Ela vence em conflitos, com uma exceção — a blacklist:

```ts
const META_BLACKLIST = new Set(['type', '$ref'])
```

`type` e `$ref` são sempre controlados pelo Sapphire. Chaves úteis:

| Chave                                 | Efeito                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `title`                               | Anotação exposta por geradores de UI.                                             |
| `examples`                            | Array de anotação.                                                                |
| `deprecated`                          | `true` sinaliza a propriedade na documentação/ferramentas.                        |
| `format: 'ipv4' \| 'hostname' \| ...` | Strings de formato customizadas (requerem `ajv-formats` para validar em runtime). |
| `contentEncoding`                     | Anotação para fields binários/base64.                                             |
| `additionalProperties`                | Sobrescrita por objeto do padrão global.                                          |
| `x-*`                                 | Qualquer extensão de fornecedor é repassada sem alteração.                        |

## Casos de uso

- **Input schemas de ferramentas MCP.** Um objeto Sapphire → JSON Schema → colocado no slot `inputSchema` da ferramenta MCP. A mesma definição alimenta o validador de runtime (via AJV) e a inferência de tipos (via `Infer<typeof schema>`).
- **Geradores de formulários de frontend.** A saída é compatível com `react-jsonschema-form`, `@rjsf/*`, JSON Forms, etc. As anotações `title`/`description`/`examples` passam sem alteração.
- **Validação entre linguagens.** Um serviço em Python ou Go pode validar o mesmo payload contra o mesmo schema emitido — mantenha o schema como o contrato, não parsers específicos de linguagem.

## Limitações

> [!WARNING]
> **`transforms`/`coerce` são no-op.** O JSON Schema é descritivo, não um motor. Aplique transforms via o core (`safeParse`) antes de persistir.

> [!WARNING]
> **`unique`/`index`/`timestamps`/índices compostos são no-op.** Estas são preocupações de banco de dados, não de validação.

> [!WARNING]
> **`number.finite`/`number.safe` são no-op.** Sem equivalente em JSON Schema.

> [!WARNING]
> **`format` é apenas anotação no AJV por padrão.** Instale `ajv-formats` e chame `addFormats(ajv)` para habilitar a verificação em runtime de `email`/`uri`/`uuid`/`date-time` etc.

> [!WARNING]
> **`prefixItems` é exclusivo do 2020-12.** Use `Ajv2020` (`ajv/dist/2020.js`) para compilar schemas que contêm tuplas. Construtores de drafts mais antigos vão interpretá-las erroneamente em silêncio.

> [!WARNING]
> **Schemas nomeados são restritos a `[A-Za-z0-9_-]+`.** O escaping de JSON Pointer para `/` e `~` não é feito; nomes com esses caracteres lançam erro no momento do build.

> [!WARNING]
> **Apenas 2020-12.** Dialetos mais antigos (draft-07, subconjunto do OpenAPI 3.0) são V1_FUTURE.

## Relacionados

- [Refs e relações](../concepts/refs-and-relations.md) — como schemas nomeados viram `$ref`s.
- [Nullable vs optional](../concepts/nullable-vs-optional.md) — conduz a escolha entre `oneOf` e união de tipos.
- [Escape hatch](../concepts/escape-hatch.md) — o contrato universal `.adapter(name, opts)`.
- [Receitas → Compartilhar tipos com o frontend](../recipes/share-types-with-frontend.md).
