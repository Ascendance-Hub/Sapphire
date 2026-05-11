# Share types with the frontend

## Use case

Your backend owns the canonical user model. You want to:

1. Use it to build a `mongoose.Schema` for persistence.
2. Get a TypeScript type (`Infer<>`) shared via a workspace package so the frontend's request/response types stay in lockstep.
3. Emit a JSON Schema 2020-12 document the frontend can hand to a form generator (`@rjsf/core`, JSON Forms, etc.) or that an MCP tool can use as `inputSchema`.

Sapphire was designed for exactly this. Define once, fan out to three consumers — no duplication, no drift.

## End-to-end example

```ts
// packages/shared/src/schemas.ts -------------------------------------
import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

registerAdapter('mongo', toMongoSchema)
registerAdapter('json-schema', toJsonSchema)

export const a = new Sapphire()

export const User = a
  .object({
    name: a.string().min(1).describe('Display name shown in the UI.'),
    email: a.string().email().describe('Primary contact email.'),
    age: a.number().int().min(0).optional(),
    role: a.type().enum(['admin', 'editor', 'viewer'] as const),
  })
  .name('User')

// (1) Shared TypeScript type — import on both backend and frontend.
export type User = Infer<typeof User>

// (2) Mongoose schema — backend persistence.
import mongoose from 'mongoose'
export const UserMongoSchema = User.getSchema('mongo') as mongoose.Schema
export const UserModel = mongoose.model('User', UserMongoSchema)

// (3) JSON Schema 2020-12 — frontend form generator OR MCP inputSchema.
export const UserJsonSchema = toJsonSchema(User.toSchema(), {
  $id: 'https://example.com/schemas/user',
  additionalProperties: false,
})
```

The frontend imports just the type and the JSON Schema:

```ts
// apps/web/src/forms/user-form.tsx -----------------------------------
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { UserJsonSchema, type User } from 'shared/schemas'

export function UserForm({ onSubmit }: { onSubmit: (u: User) => void }) {
  return (
    <Form
      schema={UserJsonSchema as object}
      validator={validator}
      onSubmit={({ formData }) => onSubmit(formData as User)}
    />
  )
}
```

## Step by step

1. **Define `User` once** as a named object schema. `.name('User')` registers it in the Sapphire instance's registry — JSON Schema picks the name up for `$defs`, and Mongo uses it for `mongoose.model`.
2. **Three outputs from the same field:**
   - `Infer<typeof User>` is a pure type expression — zero runtime cost.
   - `User.getSchema('mongo')` walks the IR through `toMongoSchema` and returns a `mongoose.Schema`.
   - `toJsonSchema(User.toSchema(), opts)` returns a plain JSON object.
3. **Ship the type and the JSON Schema to the frontend.** The Mongoose schema stays server-side (it pulls in `mongoose`). A workspace `shared` package is the typical home — re-exported from there into both apps.
4. **Refactor in one place.** Add a field on `User`, and the type updates everywhere, the Mongoose model gets a new path, and the form generator picks up the new question on next build.

## Variations

### `partial()` for PATCH endpoints

A PATCH endpoint typically accepts a subset of the model. Reuse the same source, derive the partial:

```ts
export const UserPatch = User.partial()
export type UserPatch = Infer<typeof UserPatch>

// JSON Schema for the PATCH endpoint:
export const UserPatchJsonSchema = toJsonSchema(UserPatch.toSchema())
```

See [Concepts → Composition](../concepts/composition.md) for `pick` / `omit` / `extend` / `merge`.

### MCP tool `inputSchema`

Model Context Protocol expects JSON Schema for tool inputs. The same `UserJsonSchema` plugs in directly:

```ts
server.tool({
  name: 'create_user',
  description: 'Create a new user.',
  inputSchema: UserJsonSchema as object,
  handler: async (input) => {
    // Validate again on the server for defence-in-depth:
    const parsed = User.parse(input)
    return UserModel.create(parsed)
  },
})
```

### Type-export across packages

The `Infer<>` result is a structural type. To export it cleanly from a workspace package without leaking Sapphire types into every consumer, **re-export the type explicitly** instead of the schema:

```ts
// shared/src/index.ts
export type { User } from './schemas' // frontend uses this
export { User as UserSchema } from './schemas' // backend uses this
```

The frontend bundle now contains zero Sapphire runtime — only the structural type survives.

> [!WARNING]
> **Don't ship the Mongoose schema to the browser.** `@ascendance-hub/sapphire-mongo` and `mongoose` itself are server-only. Export the JSON Schema and the `Infer<>` type from a shared package; keep `UserMongoSchema` and `UserModel` in a backend-only module.

> [!WARNING]
> **`additionalProperties: false` is opt-in.** JSON Schema's spec default is permissive. If you want the form generator to reject unknown keys, pass `{ additionalProperties: false }` to `toJsonSchema` — Sapphire's `stripUnknown`/`unknown_key` semantics aren't conveyed automatically.

## See also

- [Adapters → JSON Schema](../adapters/json-schema.md) — full 2020-12 mapping table and emitter options.
- [Adapters → Mongo](../adapters/mongo.md) — Mongoose IR mapping and refs.
- [Concepts → Composition](../concepts/composition.md) — `partial`, `pick`, `omit` for read/write/patch splits.
- [Recipes → One schema, many adapters](./one-schema-many-adapters.md) — sister recipe focused on multi-output emission.
