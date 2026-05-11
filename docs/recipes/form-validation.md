# Form validation

## Use case

You have a sign-up form (web or mobile) and need server-side validation that mirrors the UI. The browser may already block obvious mistakes, but the server is the ground truth — invalid payloads must be rejected before they reach the database.

Sapphire's `safeParse` is built for this. By default it collects **every** issue across the whole input (`abortEarly: false`), giving you a flat `ValidationIssue[]` you can pivot into per-field error messages and ship straight to the UI.

## End-to-end example

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
    // Pivot ValidationIssue[] into { field -> message[] }.
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const fieldId = issue.path.join('.') || '_form'
      ;(fieldErrors[fieldId] ??= []).push(String(issue.message))
    }
    return { ok: false as const, fieldErrors }
  }

  // result.data is typed as Registration
  return { ok: true as const, user: result.data }
}

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

## Step by step

1. **Define the schema with per-rule messages.** `a.string().min(8, { message: '...' })` attaches a message only when _that specific rule_ fails. You can layer multiple rules on a single field — `password` above runs three checks (`min`, two `regex`) and every failing rule produces its own issue.
2. **Call `safeParse`.** It never throws. The result is a discriminated union: `{ success: true, data }` or `{ success: false, error }`.
3. **Pivot `issues` by path.** `issue.path` is a `(string | number)[]` pointing at the offending value. For top-level fields it's `['email']`; for nested fields it would be `['address', 'zip']`. Joining with `'.'` matches the dotted IDs most UI libraries expect.
4. **Return the map to the UI.** Each form field reads `fieldErrors[id]` and renders the message(s) inline.

## Variations

### Stop on the first issue (`abortEarly: true`)

When you're validating a server-side webhook and don't care about per-field UX, fail fast:

```ts
const result = userRegistration.safeParse(payload, { abortEarly: true })
// result.error.issues.length === 1 (or 0 if valid)
```

This is also useful when validation is part of a request body too large to walk fully.

### Per-field instance-level overrides

If you want a single message for _every_ min-length failure (e.g. for an i18n bundle), set it once on the `Sapphire` instance and skip the per-rule `{ message }`:

```ts
const a = new Sapphire({
  messages: {
    min_length: (ctx) => `Field is too short (min ${ctx.min}).`,
    format: 'Invalid format.',
  },
})
```

See [Concepts → Validation](../concepts/validation.md) for the full 5-level resolution hierarchy.

### Mapping issue paths to form field IDs

If your UI uses bracket notation (`address[zip]`) instead of dots, change the join:

```ts
function pathToFieldId(path: (string | number)[]) {
  return path.reduce<string>(
    (acc, seg) => (typeof seg === 'number' ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : seg),
    '',
  )
}
```

> [!WARNING]
> **`issue.message` can be an object or a string.** By default it's a string, but if you returned an object from a `MessageValue` (for structured i18n bundles), narrow before rendering: `typeof issue.message === 'string' ? issue.message : translate(issue.message)`.

## See also

- [Concepts → Validation](../concepts/validation.md) — `parse`/`safeParse`, `IssueCode` table, message resolution.
- [Concepts → Config](../concepts/config.md) — instance options (`abortEarly`, `stripUnknown`, `messages`).
- [Recipes → Custom error messages](./custom-error-messages.md) — i18n and branded messages.
