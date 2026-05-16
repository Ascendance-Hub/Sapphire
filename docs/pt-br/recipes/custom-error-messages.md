# Mensagens de erro customizadas

## Caso de uso

Dois cenários comuns:

- **i18n** — a sua UI está em português (ou alemão, ou japonês), então as mensagens padrão em inglês não são úteis.
- **Mensagens marcadas** — o seu produto tem uma voz; "Field is required." deveria ser "Hmm, este aqui está faltando." (ou o que o seu designer disser).

O Sapphire resolve mensagens através de uma hierarquia de 5 níveis — embutida → instância → field → por regra → por chamada — então você pode configurar uma vez globalmente e depois sobrescrever cirurgicamente por field ou por regra quando necessário.

## Exemplo de ponta a ponta — i18n PT-BR

```ts
import { Sapphire, type IssueCode, type MessageContext } from '@ascendance-hub/sapphire-core'

// Level 1 — instance-wide PT-BR dictionary.
const ptBR: Partial<Record<IssueCode, string | ((ctx: MessageContext) => string)>> = {
  required: 'Campo obrigatório.',
  invalid_type: (ctx) => `Tipo inválido em ${ctx.path.join('.') || '(raiz)'}.`,
  min_length: (ctx) => `Tamanho mínimo: ${ctx.min}.`,
  max_length: (ctx) => `Tamanho máximo: ${ctx.max}.`,
  min: (ctx) => `Valor mínimo: ${ctx.min}.`,
  max: (ctx) => `Valor máximo: ${ctx.max}.`,
  format: (ctx) => `Formato inválido (${ctx.format}).`,
  unknown_key: (ctx) => `Chave desconhecida: ${ctx.path.join('.')}.`,
}

const a = new Sapphire({ messages: ptBR })

// Level 2 — per-field override (still PT-BR but customized for this field).
const username = a
  .string()
  .min(3)
  .message({
    required: 'Informe um nome de usuário.',
    min_length: (ctx) => `Mínimo de ${ctx.min} caracteres no nome de usuário.`,
  })

// Level 3 — per-rule override (wins over field-level for THIS rule only).
const password = a
  .string()
  .min(8, { message: 'Sua senha precisa de pelo menos 8 caracteres.' })
  .regex(/[A-Z]/, { message: 'A senha precisa de ao menos uma letra maiúscula.' })

const Form = a.object({ username, password })

// Level 4 — per-call override (the highest-priority layer).
const result = Form.safeParse(
  { username: 'ab', password: 'short' },
  {
    messages: {
      min_length: 'Esta mensagem vence todas as outras.',
    },
  },
)
// Both 'username' and 'password' min_length issues now use the per-call message.
```

## Passo a passo

1. **Construa um dicionário de toda a instância.** Passe-o para `new Sapphire({ messages })`. As chaves são literais de `IssueCode`; os valores são `string` ou `(ctx) => string | object`. Qualquer coisa que você omita recai para o inglês embutido.
2. **Use a forma de função para mensagens parametrizadas.** `ctx` carrega `path`, `code`, `value`, mais quaisquer extras específicos da regra (`min`, `max`, `expected`, `got`, `format`). É assim que você interpola `'Mínimo de N caracteres'` sem codificar o N à mão.
3. **Sobrescreva por field com `.message({ ... })`.** As chaves continuam sendo `IssueCode`. Apenas os códigos que você lista sobrescrevem; o resto recai para a instância, depois para os embutidos.
4. **Sobrescreva por regra com `.min(3, { message: '...' })`.** A camada estática mais estreita — aplica-se apenas quando _esta regra neste field_ dispara.
5. **Sobrescreva por chamada com `parse(v, { messages: {...} })`.** A maior prioridade de todas. Útil para troca de locale no momento da requisição (buscar o locale do usuário, construir um objeto `messages`, passá-lo por chamada).

Veja [Conceitos → Validação](../concepts/validation.md) para a tabela completa de camadas e códigos, e [Conceitos → Configuração](../concepts/config.md) para as opções de instância.

## Variações

### Trocando de idioma em runtime — uma instância por locale

Instâncias Sapphire são baratas. O registro de schemas nomeados é por instância, então se você quer locales totalmente isolados:

```ts
const a_en = new Sapphire({ messages: enUS })
const a_pt = new Sapphire({ messages: ptBR })

const UserEn = a_en.object({ ... })
const UserPt = a_pt.object({ ... })
```

Esta é a divisão mais limpa quando os próprios schemas não precisam ser compartilhados.

### Trocando de idioma por chamada — um schema, muitos locales

Se o schema é compartilhado e apenas as mensagens devem mudar, construa o `messages` por chamada a partir de um locale e repasse:

```ts
import { messagesFor, type Locale } from './i18n'

function parseUser(input: unknown, locale: Locale) {
  return Form.safeParse(input, { messages: messagesFor(locale) })
}
```

Este é o formato certo para um middleware de i18n em um gateway de API.

### Retornando mensagens estruturadas (objetos) para renderização rica

`MessageValue` pode ser um objeto, não apenas uma string. Isso permite que o renderizador escolha uma chave de tradução mais parâmetros de interpolação em vez de uma string pré-renderizada:

```ts
const username = a.string().min(3, {
  message: (ctx) => ({ key: 'errors.username.tooShort', params: { min: ctx.min } }),
})

// issue.message === { key: 'errors.username.tooShort', params: { min: 3 } }
// Render with your i18n library of choice.
```

> [!WARNING]
> **Mensagens-função executam NO MOMENTO DA MENSAGEM, uma vez por issue.** Não faça trabalho caro dentro (sem chamadas a banco de dados, sem leituras síncronas de arquivo). Construa qualquer estado pesado no carregamento do módulo e feche por closure sobre ele.

> [!WARNING]
> **Objetos `MessageValue` quebram os round-trips de `JSON.stringify({ issues })` se o seu renderizador espera strings.** Escolha um formato (string ou objeto estruturado) por camada e mantenha-o; misturar dentro da mesma UI é uma cilada.

> [!WARNING]
> **A camada por chamada vence toda camada estática.** Isso é deliberado — é o escape hatch "eu sei o que estou fazendo, apenas use isto". Mas também significa que um `parse(v, { messages: {...} })` mal colocado num middleware pode mascarar todas as suas mensagens por field cuidadosamente elaboradas. Passe `messages` apenas quando você realmente pretende sobrescrever.

## Veja também

- [Conceitos → Validação](../concepts/validation.md) — tabela de `IssueCode`, resolução de mensagens, formato de `MessageContext`.
- [Conceitos → Configuração](../concepts/config.md) — `SapphireOptions.messages` e sobrescritas por chamada.
- [Receitas → Validação de formulários](./form-validation.md) — combina naturalmente com mensagens por field.
