# Custom error messages

## Use case

Two common scenarios:

- **i18n** — your UI is in Portuguese (or German, or Japanese), so the default English messages aren't useful.
- **Branded messages** — your product has a voice; "Field is required." should read "Hmm, this one's missing." (or whatever your designer says).

Sapphire resolves messages through a 5-level hierarchy — built-in → instance → field → per-rule → per-call — so you can configure once globally and then surgically override per-field or per-rule when needed.

## End-to-end example — PT-BR i18n

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
  invalid_format: 'Formato inválido.',
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

## Step by step

1. **Build an instance-wide dictionary.** Pass it to `new Sapphire({ messages })`. Keys are `IssueCode` literals; values are `string` or `(ctx) => string | object`. Anything you omit falls through to the built-in English.
2. **Use the function form for parameterized messages.** `ctx` carries `path`, `code`, `value`, plus any rule-specific extras (`min`, `max`, `expected`, `got`, `format`). This is how you interpolate `'Mínimo de N caracteres'` without hand-coding N.
3. **Override per-field with `.message({ ... })`.** Keys are still `IssueCode`. Only the codes you list override; the rest fall through to the instance, then to the built-ins.
4. **Override per-rule with `.min(3, { message: '...' })`.** The narrowest static layer — applies only when _this rule on this field_ fires.
5. **Override per-call with `parse(v, { messages: {...} })`.** Highest priority of all. Useful for request-time locale switching (look up locale from the user, build a `messages` object, pass it per call).

See [Concepts → Validation](../concepts/validation.md) for the full table of layers and codes, and [Concepts → Config](../concepts/config.md) for the instance options.

## Variations

### Switching language at runtime — one instance per locale

Sapphire instances are cheap. The named-schema registry is per-instance, so if you want fully-isolated locales:

```ts
const a_en = new Sapphire({ messages: enUS })
const a_pt = new Sapphire({ messages: ptBR })

const UserEn = a_en.object({ ... })
const UserPt = a_pt.object({ ... })
```

This is the cleanest split when the schemas themselves don't need to be shared.

### Switching language per call — one schema, many locales

If the schema is shared and only the messages should change, build the per-call `messages` from a locale and forward:

```ts
import { messagesFor, type Locale } from './i18n'

function parseUser(input: unknown, locale: Locale) {
  return Form.safeParse(input, { messages: messagesFor(locale) })
}
```

This is the right shape for an i18n middleware in an API gateway.

### Returning structured messages (objects) for rich rendering

`MessageValue` can be an object, not just a string. This lets the renderer pick a translation key plus interpolation params instead of a pre-rendered string:

```ts
const username = a.string().min(3, {
  message: (ctx) => ({ key: 'errors.username.tooShort', params: { min: ctx.min } }),
})

// issue.message === { key: 'errors.username.tooShort', params: { min: 3 } }
// Render with your i18n library of choice.
```

> [!WARNING]
> **Function messages run AT MESSAGE TIME, once per issue.** Don't do expensive work inside (no database calls, no synchronous file reads). Build any heavy state at module load and close over it.

> [!WARNING]
> **`MessageValue` objects break `JSON.stringify({ issues })` round-trips if your renderer expects strings.** Pick one shape (string or structured object) per layer and stick to it; mixing inside the same UI is a footgun.

> [!WARNING]
> **The per-call layer beats every static layer.** That's deliberate — it's the "I know what I'm doing, just use this" escape hatch. But it also means a misplaced `parse(v, { messages: {...} })` in middleware can mask all your carefully-crafted per-field messages. Pass `messages` only when you actually mean to override.

## See also

- [Concepts → Validation](../concepts/validation.md) — `IssueCode` table, message resolution, `MessageContext` shape.
- [Concepts → Config](../concepts/config.md) — `SapphireOptions.messages` and per-call overrides.
- [Recipes → Form validation](./form-validation.md) — pairs naturally with per-field messages.
