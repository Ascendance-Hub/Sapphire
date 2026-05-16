# Validação de formulários

## Caso de uso

Você tem um formulário de cadastro (web ou mobile) e precisa de validação no servidor que espelha a UI. O navegador pode já bloquear erros óbvios, mas o servidor é a verdade fundamental — payloads inválidos precisam ser rejeitados antes de chegarem ao banco de dados.

O `safeParse` do Sapphire foi feito para isso. Por padrão ele coleta **toda** issue por toda a entrada (`abortEarly: false`), dando a você um `ValidationIssue[]` plano que você pode pivotar em mensagens de erro por campo e enviar direto para a UI.

## Exemplo de ponta a ponta

```ts
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const userRegistration = a.object({
  email: a.string().email({ message: 'Enter a valid email address.' }),
  password: a
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Password must contain an uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain a digit.' }),
  age: a.number().int().min(13, { message: 'You must be 13 or older to register.' }),
  acceptTerms: a.type().literal(true).message({
    literal: 'You must accept the terms.',
  }),
})

type Registration = Infer<typeof userRegistration>

// --- Hypothetical Express-ish handler -------------------------------

function registerHandler(payload: unknown) {
  const result = userRegistration.safeParse(payload)

  if (!result.success) {
    // `flatten()` buckets issues into per-field message arrays plus a
    // form-level array — exactly the shape a flat form needs.
    const { fieldErrors, formErrors } = result.error.flatten()
    return { ok: false as const, fieldErrors, formErrors }
  }

  // result.data is typed as Registration
  return { ok: true as const, user: result.data }
}

// Need a custom path format (e.g. dotted `address.zip`)? Pivot the raw
// `result.error.issues` yourself — each issue carries `path`, `code`,
// `message`. For nested DTOs, `result.error.format()` returns a tree mirroring
// the schema shape with an `_errors` array at every node.

// --- A bad submission ----------------------------------------------

const sample = {
  email: 'not-an-email',
  password: 'short',
  age: 10,
  acceptTerms: false,
}

const response = registerHandler(sample)
// response.ok === false
// response.fieldErrors === {
//   email:       ['Enter a valid email address.'],
//   password:    ['Password must be at least 8 characters.',
//                 'Password must contain an uppercase letter.',
//                 'Password must contain a digit.'],
//   age:         ['You must be 13 or older to register.'],
//   acceptTerms: ['You must accept the terms.'],
// }
```

## Passo a passo

1. **Defina o schema com mensagens por regra.** `a.string().min(8, { message: '...' })` anexa uma mensagem apenas quando _aquela regra específica_ falha. Você pode sobrepor múltiplas regras em um único field — o `password` acima executa três verificações (`min`, dois `regex`) e toda regra que falha produz sua própria issue.
2. **Chame `safeParse`.** Ele nunca lança. O resultado é uma union discriminada: `{ success: true, data }` ou `{ success: false, error }`.
3. **Achate o erro.** `result.error.flatten()` retorna `{ fieldErrors, formErrors }` — `fieldErrors` chaveado pelo nome do field de nível superior, `formErrors` para issues de nível raiz. Sem pivô manual necessário para formulários planos. (Para caminhos aninhados com pontos ou uma árvore no formato do schema, veja a nota abaixo do trecho e `error.format()`.)
4. **Devolva o mapa para a UI.** Cada campo do formulário lê `fieldErrors[id]` e renderiza a(s) mensagem(ns) inline.

## Variações

### Parar na primeira issue (`abortEarly: true`)

Quando você está validando um webhook no servidor e não se importa com a UX por campo, falhe rápido:

```ts
const result = userRegistration.safeParse(payload, { abortEarly: true })
// result.error.issues.length === 1 (or 0 if valid)
```

Isso também é útil quando a validação faz parte de um corpo de requisição grande demais para percorrer por completo.

### Sobrescritas de nível de instância por campo

Se você quer uma única mensagem para _toda_ falha de comprimento mínimo (por exemplo, para um bundle de i18n), defina-a uma vez na instância `Sapphire` e pule o `{ message }` por regra:

```ts
const a = new Sapphire({
  messages: {
    min_length: (ctx) => `Field is too short (min ${ctx.min}).`,
    format: 'Invalid format.',
  },
})
```

Veja [Conceitos → Validação](../concepts/validation.md) para a hierarquia de resolução completa de 5 níveis.

### Mapeando caminhos de issue para IDs de campos do formulário

Se a sua UI usa notação de colchetes (`address[zip]`) em vez de pontos, mude o join:

```ts
function pathToFieldId(path: (string | number)[]) {
  return path.reduce<string>(
    (acc, seg) => (typeof seg === 'number' ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : seg),
    '',
  )
}
```

> [!WARNING]
> **`issue.message` pode ser um objeto ou uma string.** Por padrão é uma string, mas se você retornou um objeto de um `MessageValue` (para bundles de i18n estruturados), faça o narrow antes de renderizar: `typeof issue.message === 'string' ? issue.message : translate(issue.message)`.

## Veja também

- [Conceitos → Validação](../concepts/validation.md) — `parse`/`safeParse`, tabela de `IssueCode`, resolução de mensagens.
- [Conceitos → Configuração](../concepts/config.md) — opções de instância (`abortEarly`, `stripUnknown`, `messages`).
- [Receitas → Mensagens de erro customizadas](./custom-error-messages.md) — i18n e mensagens marcadas.
