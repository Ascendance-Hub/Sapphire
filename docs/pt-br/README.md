# Documentação do Sapphire

Schema uma vez, tipos e adapters em todo lugar. Esta documentação leva você de uma primeira instalação por todo conceito e adapter que o Sapphire traz.

## Primeiros passos

- [Primeiros passos](./getting-started.md) — instalação, o seu primeiro schema, parse/safeParse, plugar um adapter.

## Conceitos

- [Visão geral](./concepts/overview.md) — o que o Sapphire é, o que ele não é, e o modelo mental.
- [Fields e modificadores](./concepts/fields-and-modifiers.md) — vocabulário completo de primitivos, compostos e modificadores.
- [Inferindo tipos](./concepts/inferring-types.md) — `Infer<>` vs `InferInput<>` e o modelo de brand types.
- [Composição](./concepts/composition.md) — `pick`, `omit`, `partial`, `required`, `extend`, `merge`.
- [Unions, literais e enums](./concepts/unions-literals-enums.md) — o namespace `a.type()`.
- [Tuplas vs arrays](./concepts/tuples-vs-arrays.md) — coleções de posição fixa vs homogêneas.
- [Refs e relações](./concepts/refs-and-relations.md) — schemas nomeados e `a.ref()`.
- [Nullable vs optional](./concepts/nullable-vs-optional.md) — a confusão canônica, resolvida.
- [Validação](./concepts/validation.md) — `parse` / `safeParse`, issues, resolução de mensagens.
- [Configuração](./concepts/config.md) — opções do `Sapphire` e sobrescritas por chamada.
- [Escape hatch](./concepts/escape-hatch.md) — `.adapter(name, opts)` para opções específicas de ORM.

## Adapters

- [Mongo (`@ascendance-hub/sapphire-bson`)](./adapters/bson.md) — validadores de coleção `$jsonSchema` do driver nativo do MongoDB.
- [Mongoose (`@ascendance-hub/sapphire-mongoose`)](./adapters/mongoose.md) — saída de `Schema` do Mongoose, com refs, timestamps e índices compostos.
- [JSON Schema (`@ascendance-hub/sapphire-json-schema`)](./adapters/json-schema.md) — saída de JSON Schema 2020-12 para o AJV, ferramentas MCP e geradores de formulários de frontend.
- [Drizzle (`@ascendance-hub/sapphire-drizzle`)](./adapters/drizzle.md) — saída de `pgTable` / `mysqlTable` / `sqliteTable` com refs preguiçosas e índices compostos.

## Receitas

- [Validação de formulários](./recipes/form-validation.md) — colete toda issue do `safeParse` e pivote para erros de UI por campo.
- [Compartilhar tipos com o frontend](./recipes/share-types-with-frontend.md) — um schema alimenta o Mongo, tipos `Infer<>` e JSON Schema para formulários ou ferramentas MCP.
- [Um schema, muitos adapters](./recipes/one-schema-many-adapters.md) — registre múltiplos adapters e emita cada um a partir da mesma IR.
- [Escrevendo um adapter customizado](./recipes/custom-adapter.md) — percorra os 12 kinds da IR e plugue no registro.
- [Mensagens de erro customizadas](./recipes/custom-error-messages.md) — i18n e mensagens marcadas através da hierarquia de resolução de 5 níveis.
- [Migrando do Zod](./recipes/migrating-from-zod.md) — mapeamento lado a lado mais o que cada biblioteca faz que a outra não faz.

## Meta

- [Arquitetura](./meta/architecture.md) — o modelo de 3 camadas (DSL → IR → adapter) com um diagrama Mermaid.
- [Decisões de design](./meta/design-decisions.md) — por que a API tem a aparência que tem.
- [Contribuindo](./meta/contributing.md) — configuração do repositório e como escrever um adapter de terceiros.
