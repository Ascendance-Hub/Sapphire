# Contribuindo

Obrigado pelo seu interesse no Sapphire. Esta página cobre duas coisas: como trabalhar na própria lib, e como publicar o seu próprio adapter de terceiros contra a API pública.

## Configuração do repositório

**Pré-requisitos:** Node 20+ e npm 10+.

```bash
git clone https://github.com/Ascendance-Hub/Sapphire.git
cd Sapphire
npm install
npm test
npm run build
```

O repositório é um monorepo gerenciado por **npm workspaces**:

```
packages/
├── core/           # @ascendance-hub/sapphire-core
├── bson/           # @ascendance-hub/sapphire-bson (native MongoDB driver)
├── mongoose/       # @ascendance-hub/sapphire-mongoose
├── json-schema/    # @ascendance-hub/sapphire-json-schema
└── drizzle/        # @ascendance-hub/sapphire-drizzle
```

Exemplos e documentação ficam ao lado em `examples/` e `docs/`.

## Fluxo de desenvolvimento

- **Branches.** Crie branches de feature a partir de `main` nomeadas `feat/<topic>` (ou `fix/<topic>`, `docs/<topic>`, `chore/<topic>` para casar com os prefixos de commit).
- **Commits.** Siga os prefixos existentes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Mantenha a linha de assunto abaixo de ~72 caracteres.
- **Changesets.** Todo PR que afeta comportamento precisa de um changeset: `npx changeset`. Escolha os pacotes afetados e o nível de incremento. PRs apenas de documentação e de ferramentas internas podem pular isto, mas um incremento patch em todos os cinco pacotes é a convenção quando as mudanças saem como parte de um release.
- **Testes.** Obrigatórios para novo comportamento. O Vitest é o runner (`npm test`). Expectativas de nível de tipo usam `expectTypeOf` do vitest.

## Rodando o CI localmente

O CI roda cinco comandos; você pode executá-los na mesma ordem antes de fazer push:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

Se `format:check` falhar, rode `npm run format` para corrigir.

## Escrevendo um adapter de terceiros

A API de adapter do Sapphire é pública e estável. Você não precisa de um PR ao core para lançar um adapter — escolha um nome, publique um pacote, e os usuários o registram com `registerAdapter(name, fn)`.

### Passo 1 — configuração do pacote

Nomeie o seu pacote `@my-org/sapphire-<name>` (por exemplo, `@acme/sapphire-prisma`). Declare `@ascendance-hub/sapphire-core` como uma **peerDependency** (não uma dependency comum — o registro depende de uma única instância do core por aplicação):

```json
{
  "name": "@acme/sapphire-prisma",
  "peerDependencies": {
    "@ascendance-hub/sapphire-core": "^1.0.0"
  }
}
```

Declare também como peer o ORM que você mira (por exemplo, `prisma`, `drizzle-orm`, `kysely`).

### Passo 2 — implemente a função do adapter

O seu adapter é uma única função:

```ts
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export function toMyOrm(node: SapphireSchemaNode, options?: unknown): MyOrmOutput {
  switch (node.kind) {
    case 'string':
      /* ... */ break
    case 'number':
      /* ... */ break
    case 'boolean':
      /* ... */ break
    case 'date':
      /* ... */ break
    case 'object':
      /* ... */ break
    case 'array':
      /* ... */ break
    case 'tuple':
      /* ... */ break
    case 'union':
      /* ... */ break
    case 'literal':
      /* ... */ break
    case 'enum':
      /* ... */ break
    case 'record':
      /* ... */ break
    case 'ref':
      /* ... */ break
  }
}
```

Os 12 valores de `kind` são exaustivos — o TypeScript vai avisar se você esquecer algum. Se o seu alvo não consegue representar algum kind de forma limpa, escolha um fallback (o Mongo recai para `Mixed`, o Drizzle para `jsonb`, o JSON Schema geralmente consegue produzir algo mesmo que frouxo). Documente a limitação no seu README.

### Passo 3 — trate os universais em `NodeBase`

Todo nó da IR carrega estas propriedades além dos seus fields específicos de `kind`:

| Propriedade   | Significado                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `required`    | Se o field é obrigatório no momento do parse. Conduz a semântica de "não nulo".       |
| `nullable`    | Se `null` é um valor aceitável (distinto de ausente).                                 |
| `default`     | Valor padrão aplicado quando a entrada é `undefined`.                                 |
| `description` | Descrição legível por humanos (de `.describe(...)`).                                  |
| `unique`      | Dica de restrição de unicidade (aplica-se aos kinds relevantes).                      |
| `index`       | Dica de índice, opcionalmente `{ unique: true }`.                                     |
| `enum`        | Conjunto de valores restrito no primitivo.                                            |
| `meta`        | Blobs específicos de adapter chaveados por nome de adapter (o seu escape hatch).      |
| `message`     | Sobrescritas de mensagem por field — relevantes para o validador, não para o emissor. |

Leia cada uma se o seu alvo suporta o conceito; caso contrário, descarte-a (não lance erro — adapters são best-effort sobre a IR).

### Passo 4 — implemente o escape hatch

Leia `node.meta?.<your-adapter-name>` por último, após derivar a sua saída das próprias propriedades da IR. Mescle esses valores na sua saída para que os usuários possam repassar opções específicas de ORM que o Sapphire não modela. Escolha uma blacklist minúscula para as chaves que você precisa manter controladas pelo Sapphire (por exemplo, o próprio tipo da coluna), e documente-a no seu README.

> [!NOTE]
> Por convenção, as chaves de escape hatch são mescladas **por último** em todo adapter do Sapphire — elas vencem sobre as opções derivadas pelo Sapphire. Siga a mesma convenção para que os usuários tenham um único modelo mental.

### Passo 5 — registre

Exporte a função do adapter e documente a linha única:

```ts
import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMyOrm } from '@acme/sapphire-prisma'

registerAdapter('my-orm', toMyOrm)
```

Adapters de primeira parte **não** se auto-registram. O seu também não deveria — o registro explícito é o que torna o registro tree-shakable e previsível.

### Passo 6 — testes

Alimente schemas reais do Sapphire pelo seu adapter e verifique o formato da saída. O padrão de `packages/bson/tests/`, `packages/mongoose/tests/`, `packages/json-schema/tests/` e `packages/drizzle/tests/` é uma boa referência: construa um pequeno `a.object({ ... })`, chame o seu adapter em `field.toSchema()`, e verifique o resultado contra as APIs de runtime do ORM alvo. Testes de tipo via `expectTypeOf` são úteis para o round-trip de `Infer<>`.

### Passo 7 — publique

`npm publish` padrão. Marque o seu pacote com a palavra-chave `sapphire-adapter` para que os usuários o encontrem via busca no npm.

## Atualizando a documentação

Os trechos em `docs/concepts/*.md` são **fixados a snippets** de arquivos de teste em `packages/core/tests/docs-examples/*.test.ts`. A fixação é uma convenção, não automação: cada bloco de código em um doc de conceito tem um comentário de cabeçalho como `<!-- from tests/docs-examples/<name>.test.ts -->`, e o arquivo de teste correspondente contém o mesmo código como uma asserção real. O CI pega divergências nos arquivos de teste (o vitest vai falhar); o `.md` é sincronizado à mão.

Quando você muda o comportamento:

1. Atualize o teste em `packages/core/tests/docs-examples/`.
2. Rode `npm test` para garantir que ele ainda passa.
3. Atualize o trecho correspondente em `docs/concepts/*.md`.
4. Espelhe a mudança de prosa na página em português em `docs/pt-br/concepts/*.md`.

Use a sintaxe de alerta do GitHub para callouts:

- `> [!WARNING]` — armadilhas e "não faça isto".
- `> [!NOTE]` — observações à parte e esclarecimentos.

## Documentação bilíngue

A documentação voltada ao usuário é bilíngue: inglês em `docs/**` e um espelho em português do Brasil em `docs/pt-br/**`. Toda página de documentação precisa existir em **ambas** as árvores — qualquer página que você adiciona, renomeia ou remove em `docs/` precisa ser espelhada em `docs/pt-br/`, e vice-versa. Quando você muda a prosa de uma página em inglês, atualize a contraparte em `docs/pt-br/` no mesmo PR; blocos de código, identificadores e links `.md` relativos permanecem verbatim nas duas línguas. O CI falha o build se os dois conjuntos de arquivos divergirem. Artefatos internos (changesets, handoffs em `specs/`) podem permanecer apenas em português.

## Checklist de pull request

Antes de abrir um PR:

- [ ] Lint, typecheck, test, build, format:check todos verdes localmente.
- [ ] Novo comportamento coberto por testes (vitest; `expectTypeOf` para nível de tipo).
- [ ] Changeset adicionado se o comportamento ou a API pública mudou.
- [ ] Documentação atualizada se a mudança é visível aos usuários (`docs/concepts/`, `docs/adapters/`, ou um `README.md`).
- [ ] Espelho pt-br atualizado se uma página de documentação em inglês mudou — `docs/pt-br/` permanece em paridade com `docs/`.
- [ ] Título e descrição do PR casam com o estilo existente. Abra PRs contra `main`.

## Veja também

- [Arquitetura](./architecture.md) — o modelo de 3 camadas e a fronteira do registro.
- [Decisões de design](./design-decisions.md) — por que a API tem a aparência que tem.
- [Escape hatch](../concepts/escape-hatch.md) — o contrato `.adapter(name, opts)` relevante ao passo 4.
