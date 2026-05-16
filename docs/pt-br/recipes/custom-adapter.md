# Escrevendo um adapter customizado

## Caso de uso

Os três adapters de primeira parte (Mongo, JSON Schema, Drizzle) cobrem os casos comuns, mas o Sapphire é construído de forma que adapters sejam funções puras sobre a IR. Qualquer um pode escrever um. Motivos para você fazer isso:

- **Prisma / Kysely / TypeORM** — o ORM da sua equipe ainda não vem na caixa.
- **Formatos de serialização internos** — Protobuf, Avro, um formato de snapshot customizado.
- **Saída de ferramentas** — gerar documentação Markdown, um fragmento OpenAPI, uma SDL GraphQL, ou uma descrição de um schema amigável a `console.log`.

`registerAdapter` é API pública. O contrato é pequeno: uma função de `SapphireSchemaNode` para o que você quiser.

## Exemplo de ponta a ponta — um pequeno adapter "log"

O adapter abaixo percorre a IR e emite uma descrição legível por humanos de uma linha por nó. É útil para depuração, para telemetria e como template.

```ts
import {
  Sapphire,
  registerAdapter,
  type SapphireSchemaNode,
  type SchemaAdapter,
} from '@ascendance-hub/sapphire-core'

function toLogString(node: SapphireSchemaNode): string {
  const opt = node.required ? '' : '?'
  const nul = node.nullable ? '|null' : ''
  switch (node.kind) {
    case 'string': {
      const parts: string[] = []
      if (node.minLength !== undefined) parts.push(`min=${node.minLength}`)
      if (node.maxLength !== undefined) parts.push(`max=${node.maxLength}`)
      if (node.format) parts.push(`format=${node.format}`)
      const suffix = parts.length ? `(${parts.join(',')})` : ''
      return `string${suffix}${nul}${opt}`
    }
    case 'number': {
      const parts: string[] = []
      if (node.int) parts.push('int')
      if (node.min !== undefined) parts.push(`min=${node.min}`)
      if (node.max !== undefined) parts.push(`max=${node.max}`)
      const suffix = parts.length ? `(${parts.join(',')})` : ''
      return `number${suffix}${nul}${opt}`
    }
    case 'boolean':
      return `boolean${nul}${opt}`
    case 'date':
      return `date${nul}${opt}`
    case 'object': {
      const entries = Object.entries(node.properties).map(([k, v]) => `${k}: ${toLogString(v)}`)
      const name = node.name ? `${node.name} ` : ''
      return `${name}{ ${entries.join(', ')} }${nul}${opt}`
    }
    case 'array':
      return `${toLogString(node.items)}[]${nul}${opt}`
    case 'tuple':
      return `[${node.items.map(toLogString).join(', ')}]${nul}${opt}`
    case 'union':
      return `(${node.options.map(toLogString).join(' | ')})${nul}${opt}`
    case 'literal':
      return `${JSON.stringify(node.value)}${nul}${opt}`
    case 'enum':
      return `enum(${node.values.map((v) => JSON.stringify(v)).join('|')})${nul}${opt}`
    case 'record':
      return `Record<${toLogString(node.keys)}, ${toLogString(node.values)}>${nul}${opt}`
    case 'ref':
      return `ref(${node.target})${nul}${opt}`
    default: {
      // Exhaustiveness check — TS will error here if a new IR kind is added.
      const _exhaustive: never = node
      return `<unknown>${String(_exhaustive)}`
    }
  }
}

// The adapter signature is `(node, options?) => unknown`.
const logAdapter: SchemaAdapter = (node) => toLogString(node)
registerAdapter('log', logAdapter)

// --- Use it -------------------------------------------------------
const a = new Sapphire()

const User = a
  .object({
    id: a.string().uuid(),
    name: a.string().min(1),
    age: a.number().int().min(0).optional(),
    role: a.type().enum(['admin', 'user'] as const),
  })
  .name('User')

console.log(User.getSchema('log'))
// User { id: string(format=uuid), name: string(min=1), age: number(int,min=0)?, role: enum("admin"|"user") }
```

## Passo a passo

1. **Defina a função do adapter.** Assinatura: `(node: SapphireSchemaNode, options?: unknown) => unknown`. Retorne o que o seu consumidor precisar — uma string, um objeto, uma função, qualquer coisa.
2. **Faça switch em `node.kind`.** A IR do Sapphire é uma union discriminada com 12 casos. O TypeScript vai estreitar `node` para o ramo certo dentro de cada `case`.
3. **Recursão nos compostos.** `object` tem `properties`, `array` tem `items`, `tuple` tem `items[]`, `union` tem `options[]`, `record` tem `keys` + `values`. Sempre passe pela mesma função do adapter para o comportamento permanecer uniforme.
4. **Trate os universais de `NodeBase`.** Todo nó carrega `required`, `nullable`, `default`, `description`, `unique`, `index`, `enum`, `meta`, `message`. Decida quais se aplicam à sua saída; ignore o resto. O JSON Schema trata `unique`/`index` como no-ops, por exemplo — não há conceito de JSON Schema para eles.
5. **Adicione uma verificação de exaustividade.** O truque `_exhaustive: never` faz o compilador do TypeScript falhar se uma versão futura do Sapphire adicionar um novo kind de IR. Um seguro barato contra divergência.
6. **`registerAdapter('log', fn)`.** A partir deste ponto, qualquer `field.getSchema('log')` (ou qualquer `Sapphire({ defaultAdapter: 'log' }).object(...).getSchema()`) passa pela sua função.

## Variações

### Opções por adapter (o segundo argumento)

A assinatura do adapter aceita um segundo argumento `options?: unknown`. Use-o para configurações de todo o emissor — o equivalente no seu adapter ao `JsonSchemaAdapterOptions.additionalProperties`. O registro o repassa quando os chamadores invocam o adapter diretamente (`toMyAdapter(node, opts)`); ao passar por `field.getSchema()` nenhuma opção é passada.

```ts
interface LogOptions {
  indent?: number
}

function toLogString(node: SapphireSchemaNode, opts: LogOptions = {}): string {
  const pad = ' '.repeat(opts.indent ?? 0)
  // ...
  return pad + body
}
```

### Lendo `meta.<name>` para escape hatches

Espelhe a convenção de primeira parte — o seu adapter tem um slot reservado em `node.meta`:

```ts
function toLogString(node: SapphireSchemaNode): string {
  const extra = (node.meta?.log as { suffix?: string } | undefined)?.suffix ?? ''
  return baseRender(node) + extra
}
```

Os usuários agora podem fazer `a.string().adapter('log', { suffix: ' /* PII */' })`.

### Teste o seu adapter contra schemas reais

Coloque alguns schemas representativos em um arquivo Vitest e verifique a saída exatamente:

```ts
import { describe, expect, it } from 'vitest'

describe('log adapter', () => {
  it('renders a primitive with constraints', () => {
    const a = new Sapphire()
    const s = a.string().min(3).max(10)
    expect(toLogString(s.toSchema())).toBe('string(min=3,max=10)')
  })
})
```

Componha schemas de todo kind de IR ao longo da suíte de testes — é assim que os adapters in-tree se protegem contra mudanças silenciosas no shape da IR.

> [!WARNING]
> **Não registre o adapter a partir de código de biblioteca.** `registerAdapter` é global ao processo. Se o seu pacote registra na importação, dois consumidores que ambos querem o slot colidem. Exporte a função e deixe a aplicação chamar `registerAdapter` uma vez na inicialização.

> [!WARNING]
> **A IR é o contrato, não o DSL de field.** O seu adapter precisa aceitar qualquer `SapphireSchemaNode` válido — incluindo os produzidos por versões futuras do DSL. Mantenha a verificação de exaustividade e prefira um fallback sensato (`'<unsupported>'`) a lançar erro.

## Veja também

- [Conceitos → Visão geral](../concepts/overview.md) — o modelo mental DSL → IR → adapter.
- [Conceitos → Escape hatch](../concepts/escape-hatch.md) — como `meta` é lido pelos adapters.
- [Receitas → Um schema, muitos adapters](./one-schema-many-adapters.md) — receita irmã para combinar adapters.
- [Meta → Contribuindo](../meta/contributing.md) — configuração do repositório e o passo a passo completo para publicar um adapter de terceiros.
