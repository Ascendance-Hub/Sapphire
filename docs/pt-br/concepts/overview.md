# Visão geral

## O que é o Sapphire?

O Sapphire é uma biblioteca de definição de schemas para TypeScript. Você descreve o formato dos seus dados uma vez com um DSL fluente — `a.object({...})`, `a.string().email()`, `a.number().int().min(0)` — e o Sapphire devolve duas coisas de graça: um tipo TypeScript via `Infer<typeof schema>` e saídas específicas de ORM (um `mongoose.Schema`, uma tabela do Drizzle, um documento JSON Schema 2020-12, ou o seu próprio) via um registro de adapters plugável. Há uma única fonte de verdade para os seus dados; os tipos e os schemas de banco de dados permanecem em sincronia com ela.

## O que ele NÃO é

- **Não é uma biblioteca validation-first.** A validação existe (`parse`, `safeParse`), mas o centro do design é a representação intermediária (IR) e os adapters que a consomem. Se a validação em tempo de execução é a sua _única_ necessidade, uma biblioteca de validação dedicada é uma opção mais leve.
- **Não é um ORM.** O Sapphire produz schemas; ele não executa queries, não gerencia conexões nem é dono de um modelo de transações.
- **Não é uma ferramenta de migrations.** O diff de schemas e a geração de migrations vivem no ORM da sua escolha (Drizzle Kit, o runtime do Mongoose, Prisma Migrate).

## Modelo mental

Três camadas, em ordem:

1. **DSL de Field.** `a.string()`, `a.object({...})`, `a.array(...)`, `a.type().union([...])` e afins. Cada chamada retorna um novo valor `Field` imutável. Modificadores como `.optional()`, `.min(3)`, `.default('x')` retornam novos fields em vez de mutar no lugar.
2. **IR — `SapphireSchemaNode`.** Todo field pode produzir uma representação intermediária normalizada via `field.toSchema()`. A IR tem 12 `kind`s discriminados (`string`, `number`, `boolean`, `date`, `object`, `array`, `tuple`, `union`, `literal`, `enum`, `record`, `ref`) — plana, serializável em JSON e livre de tipos do TypeScript.
3. **Registro de adapters.** `registerAdapter(name, fn)` registra uma função `(node: SapphireSchemaNode, opts?) => Output`. `field.getSchema(name?)` percorre a IR através do adapter registrado e retorna o que aquele adapter produzir — um `mongoose.Schema`, uma tabela do Drizzle, um objeto JSON Schema, etc.

O fluxo para qualquer field é sempre o mesmo: **DSL → IR → adapter → saída**. Adapters são funções puras sobre a IR; você pode escrever o seu próprio sem modificar o Sapphire.

## Onde o Sapphire se encaixa

O Sapphire justifica seu lugar quando o **mesmo** schema precisa chegar em vários lugares — o seu modelo do Mongoose, o gerador de formulários do frontend, o `inputSchema` da sua ferramenta MCP, a sua tabela Postgres do Drizzle. Uma definição, mantida em sincronia, em vez de uma cópia mantida à mão por destino.

Se você está vindo de outra biblioteca de schemas e quer um mapeamento recurso a recurso, veja [Migrando do Zod](../recipes/migrating-from-zod.md).

## Quando usar o Sapphire

- Você entrega uma stack TypeScript com MongoDB + um frontend e quer um único schema para conduzir tanto o seu modelo de ORM quanto a validação de formulários / exportação de JSON Schema.
- Você constrói ferramentas MCP e quer um schema tipado que também seja um `inputSchema` limpo.
- Você compartilha tipos entre backend e frontend e quer parsing em tempo de execução em cima dos tipos estáticos.
- Você roda em múltiplos bancos de dados e quer uma abstração fina sobre a superfície de definição de schema sem se comprometer com um ORM completo.

## Quando NÃO usar o Sapphire

- Você só precisa de validação em tempo de execução e nunca emite um schema de banco de dados — uma biblioteca de validação dedicada é uma opção mais leve.
- Você mira um único banco SQL e quer a integração de ORM mais profunda possível — use aquele ORM diretamente.
- Você precisa de um ecossistema de plugins maduro hoje — o Sapphire é uma biblioteca v1.

## Links

- [Primeiros passos](../getting-started.md) — instalação e o seu primeiro schema.
- [Adapters → Mongo](../adapters/bson.md) / [Mongoose](../adapters/mongoose.md) / [JSON Schema](../adapters/json-schema.md) / [Drizzle](../adapters/drizzle.md).
- [Conceitos → Fields e modificadores](./fields-and-modifiers.md).
