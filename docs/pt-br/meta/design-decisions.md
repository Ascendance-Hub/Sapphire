# Decisões de design

Esta página captura o **porquê** por trás da API pública do Sapphire — as decisões com que um usuário mais provavelmente vai esbarrar e se questionar. É uma destilação voltada ao usuário do documento de design interno; se você mantém o Sapphire ou quer a justificativa completa e os trade-offs, veja "Leia mais" no fim.

## Por que brand types (`_output` / `_input`) e não generics `IsOptional`

Todo field do Sapphire carrega dois tipos fantasma apenas-declarados: `_output` (o que `parse` retorna) e `_input` (o que `parse` aceita). `Infer<F>` e `InferInput<F>` são apelidos de uma linha sobre eles: `F['_output']`, `F['_input']`.

A alternativa natural é passar generics booleanos `IsOptional` / `IsNullable` por toda classe de field e reconstruir o tipo de saída a partir deles no nível de `Infer<>`. O protótipo anterior do Sapphire fazia isso, e a maquinaria central de tipos se tornou o gargalo — todo novo field ou modificador exigia tocá-la.

Brand types invertem a relação. O sinal "isto é opcional" vive em `_output` (a union contém `undefined`?) e `_input` (ela contém `undefined`?). `default()` é o caso mais limpo: ele faz `_input: T | undefined` mas `_output: T`, porque o padrão é preenchido durante o parsing. Com brand types isso decorre da assinatura do modificador; com generics `IsOptional` exige uma flag `HasDefault` separada.

O resultado: `Infer<F>` nunca muda, independentemente de quantos fields ou modificadores adicionamos. Novos fields apenas declaram seus próprios `_output` e `_input`.

## Por que versionamento fixo entre os cinco pacotes

`@ascendance-hub/sapphire-core`, `-bson`, `-mongoose`, `-json-schema` e `-drizzle` sempre compartilham `major.minor`. Uma correção de bug em um adapter ainda incrementa todos os cinco. O Changesets é configurado para versionamento "fixo" entre eles.

Isso é mais pesado na cadência de release mas mais leve no modelo mental. Os usuários nunca precisam perguntar "core@1.4 é compatível com mongoose@1.2?" — a resposta é sempre "se os majors casam, sim". Com versionamento vinculado-mas-não-fixo, a resposta envolve uma matriz de compatibilidade que cresce linearmente por release.

Os cinco pacotes são acoplados na prática: o shape da IR é definido no core, e todo adapter faz switch em todo `kind`. Uma mudança incompatível na IR é uma mudança incompatível em todo adapter. O versionamento fixo torna esse acoplamento visível.

## Por que JSON Schema 2020-12 (não draft-07)

O draft-07 é de longe o dialeto mais amplamente implantado — a maioria dos validadores mais antigos o mira. O Sapphire emite **2020-12** mesmo assim porque dois kinds da IR dependem das suas palavras-chave mais novas:

- **Tuplas.** O 2020-12 usa `prefixItems` para tipagem de tupla de posição fixa. A forma `items: [...]` do draft-07 é depreciada e se comporta de forma diferente em alguns validadores.
- **`exclusiveMinimum` / `exclusiveMaximum` numéricos.** O draft-07 fez deles booleanos; o 2020-12 os faz números (casando diretamente com os modificadores `.gt(n)` / `.lt(n)` do Sapphire).

O construtor `Ajv2020` do AJV lida com 2020-12 de imediato, e as ferramentas MCP (um dos casos de uso de destaque do Sapphire) miram o 2020-12 explicitamente.

## Por que os tipos de retorno do Drizzle são `any`

O `toDrizzleSchema(...)` do adapter Drizzle retorna um valor tipado como `any`. Isso é deliberado.

Os `pgTable` / `mysqlTable` / `sqliteTable` do Drizzle retornam um tipo `*TableWithColumns<...>` cujos parâmetros genéricos não são exportados de forma confiável ao longo da faixa de peer-dependency do `drizzle-orm` que o Sapphire suporta. Tipar o adapter contra um snapshot específico desses tipos prenderia os usuários a uma única versão minor do `drizzle-orm`.

O impacto prático é pequeno: você quase sempre passa a saída do adapter direto para `drizzle(...)` ou para um callback `references(() => users.id)`, ambos os quais inferem os tipos de coluna a partir da entrada. O `any` é contido na fronteira e some na próxima linha de código de usuário.

## Por que uma hierarquia de resolução de mensagens de 5 níveis

Quando um field falha na validação, a mensagem que termina na issue é resolvida contra cinco camadas, a mais específica vence:

1. **Por chamada** (`schema.parse(value, { messages })`)
2. **Por regra** (`a.string().min(3, { message: '...' })`)
3. **Por field** (`a.string().message(...)`)
4. **Por instância** (`new Sapphire({ messages: {...} })`)
5. **Embutida** (padrões em inglês embutidos no core)

Parece muitas camadas, mas cada uma existe por um motivo real. Os embutidos dão padrões sensatos de imediato. O nível de instância permite que você faça i18n do app inteiro com um objeto. Os níveis de field e regra permitem sobrescrever localmente sem abrir mão dos padrões globais. O nível por chamada é o escape hatch para superfícies que precisam de texto diferente do padrão do seu app — tipicamente páginas de erro renderizadas no servidor ou respostas de API.

O empilhamento completo também significa que **i18n não é um recurso separado**. A lib apenas garante que toda string seja substituível; você implementa i18n passando um objeto `messages` totalmente localizado para `new Sapphire(...)`. Veja [`config.md`](../concepts/config.md).

## Por que `coerce` executa antes dos validadores

Quando um field string tem tanto `.coerce()` quanto `.regex(/.../ )`, o coerce executa **primeiro** — o regex vê o valor pós-coerção. O mesmo vale para `.trim()` / `.toLowerCase()` / `.toUpperCase()` em strings, e `.coerce()` em numbers/booleans/dates.

A motivação é o alinhamento de tipos. Validadores como `min`, `max`, `regex`, `gt`, `lt` são escritos contra o tipo declarado do field — eles assumem que estão inspecionando uma `string`, um `number`, um `Date`. A coerção existe para trazer entradas tipadas como string (parâmetros de URL, payloads de formulário) para aquele espaço de tipo _antes_ de aqueles validadores executarem. A ordem oposta significaria que todo validador teria de tratar defensivamente o tipo pré-coerção.

A armadilha: se você quer validar a entrada _crua_, o coerce não combina com o seu caso de uso — use uma etapa de parsing separada. Veja o aviso em [`fields-and-modifiers.md`](../concepts/fields-and-modifiers.md).

## Por que `union` mapeia para `oneOf` (não `anyOf`)

No JSON Schema, `anyOf` significa "ao menos um ramo casa"; `oneOf` significa "exatamente um ramo casa". O `a.type().union([...])` do Sapphire é semanticamente discriminado — no máximo uma opção deveria descrever um dado valor — então `oneOf` é a correspondência mais próxima.

Há um pequeno custo de validador: `oneOf` exige que todo validador verifique todos os ramos (para verificar exatamente-um) em vez de curto-circuitar na primeira correspondência. Para os tamanhos típicos de union do Sapphire (2–5 ramos), isso é desprezível. A clareza do schema emitido vale mais que os ciclos economizados.

## Por que `.name()` é obrigatório para alvos de `ref()`

`a.ref('User')` resolve a string `'User'` contra um registro de ObjectFields nomeados por instância `Sapphire`. Até que algum ObjectField seja registrado sob aquela chave, a ref fica não resolvida.

A alternativa (refs anônimas por referência de JS) resolveria no momento da importação do módulo, o que força uma ordem topológica de importação — `posts.ts` não pode importar `User` se `User` importa `Post`. Nomear desacopla a chave do registro do grafo de importação, então ciclos como `User ↔ Post` resolvem no momento de `getSchema()` sem nenhuma restrição de ordem de carregamento de módulo.

O custo é que colisões de schema nomeado entre módulos se tornam sobrescritas silenciosas — se dois arquivos chamam `.name('User')` na mesma instância `Sapphire`, o último vence. Testes devem construir um `new Sapphire()` novo para evitar vazar nomes. Veja [`refs-and-relations.md`](../concepts/refs-and-relations.md).

## Por que o core tem zero dependências de runtime

`@ascendance-hub/sapphire-core` é distribuído sem `dependencies`, apenas `devDependencies`. Todo código específico de ORM (`mongoose`, `drizzle-orm`) vive nos pacotes de adapter e é declarado como uma `peerDependency` lá.

O motivo é a pegada de instalação e o controle de versão. Se um usuário está apenas no adapter de JSON Schema, ele não paga nada por `mongoose`. Se ele está numa versão específica de `drizzle-orm`, o adapter respeita a versão dele através da faixa de peer-dep em vez de forçar uma instalação transitiva. O core permanece um bundle pequeno e previsível.

O mesmo argumento se aplica a qualquer biblioteca de validação de terceiros na qual o Sapphire poderia ter se apoiado — nenhuma é dependência de runtime do core. Os validadores são feitos à mão e vivem inteiramente dentro do pacote.

## Por que a IR é uma union discriminada

`SapphireSchemaNode` é uma union discriminada do TypeScript sobre 12 valores de `kind`: `'string'`, `'number'`, `'boolean'`, `'date'`, `'object'`, `'array'`, `'tuple'`, `'union'`, `'literal'`, `'enum'`, `'record'`, `'ref'`. Todo adapter despacha em `node.kind`.

Esta é a pedra angular do design multi-adapter. Adicionar um novo kind de IR é automaticamente um **erro em tempo de compilação em todo adapter** — o `switch (kind)` deixa de ser exaustivo, e o TypeScript aponta para todo local de chamada. A alternativa (uma interface aberta com fields opcionais por shape) deixaria os adapters perderem silenciosamente novos kinds e recaírem em comportamento de fallback que o usuário não pediu.

O outro lado é que o core não pode adicionar kinds de IR sem coordenar atualizações em todo adapter — mas como o core e os quatro adapters de primeira parte compartilham uma versão fixa, essa coordenação já faz parte do release.

## Dois pacotes para o MongoDB

`@ascendance-hub/sapphire-bson` e `@ascendance-hub/sapphire-mongoose` são pacotes separados porque eles miram duas formas diferentes de conversar com o MongoDB.

`sapphire-mongoose` é o adapter Mongoose — ele emite um `mongoose.Schema`, para apps construídos sobre o Mongoose.

`sapphire-bson` é para apps no **driver nativo do MongoDB**, sem Mongoose. Ele emite um validador de coleção `$jsonSchema` (`toBsonSchema`) — o documento que você passa a `db.createCollection(name, { validator })` para que o próprio banco de dados rejeite inserts malformados. Um usuário do driver nativo não deveria ter de instalar o Mongoose só para usar o Sapphire. O pacote é nomeado pelo que ele emite — um JSON Schema tipado em BSON — em vez de pelo banco de dados.

A divisão mantém pequeno o raio de impacto de cada pacote: `meta.bson` e `meta.mongoose` são namespaces de escape hatch separados, e as chaves de registro `'bson'` e `'mongoose'` nunca colidem.

## Leia mais

[`specs/V1_DESIGN.md`](../../../specs/V1_DESIGN.md) é o documento de design interno que esta página resume. Ele cobre a justificativa voltada ao mantenedor, trade-offs que foram considerados e rejeitados, e notas para trabalho futuro. O diretório `specs/` é gitignored — o link acima só resolve em um checkout local do repositório, não ao navegar no GitHub. O arquivo é mantido ao lado do código-fonte pelos mantenedores do Sapphire.

Um cabeçalho de aviso de divergência no topo de `V1_DESIGN.md` sinaliza onde o design divergiu da implementação entregue (por exemplo, `toAdapter()` permaneceu como `getSchema()`, `toIR()` foi renomeado para `toSchema()`, a IR ganhou um kind `'enum'`, o código de issue `'nonempty'` foi descartado). A reconciliação completa vive em [`specs/season-two/part-two/AUDIT_V1_DESIGN_VS_IMPL.md`](../../../specs/season-two/part-two/AUDIT_V1_DESIGN_VS_IMPL.md), que cataloga toda divergência, sua causa e sua severidade. Se algo nesta página parecer contradizer o que o código faz, a auditoria (e em última instância o código em `packages/*/src`) vence.
