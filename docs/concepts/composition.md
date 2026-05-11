<!-- Code in this guide is verified by tests/docs-examples/composition.test.ts -->

# Composition

ObjectFields can be derived from one another. `pick`, `omit`, `partial`, `required`, `extend`, and `merge` each return a **new** ObjectField — the original is untouched. The same chain works at the type level: `Infer<typeof derived>` reflects whatever the composition did. Use these to share a single base schema across read/write/patch boundaries instead of repeating yourself.

## Minimal example

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const baseUser = a.object({
  id: a.string(),
  name: a.string(),
  email: a.string().email(),
  age: a.number().int(),
})
```

Every example below derives from this `baseUser`.

## `pick(keys)`

Narrow to the listed subset. Keys are type-checked against `keyof T`. Pass the array as `as const` for literal-typed inference.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const publicUser = baseUser.pick(['id', 'name'] as const)
type PublicUser = Infer<typeof publicUser>
// PublicUser = { id: string; name: string }
```

The new ObjectField has a fresh schema-level config — no `name`, `timestamps`, `indexes`, or `meta` from the source. Only the `required` flag of the object itself is preserved.

## `omit(keys)`

Drop the listed keys. Same `as const` convention; same config-reset semantics as `pick`.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const safeUser = baseUser.omit(['email'] as const)
type SafeUser = Infer<typeof safeUser>
// SafeUser = { id: string; name: string; age: number }
```

## `partial()`

Make every child field optional. Both `_input` and `_output` for each property become `T | undefined`, lifted to `?:` positions on the object type.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const patch = baseUser.partial()
type Patch = Infer<typeof patch>
// Patch = { id?: string; name?: string; email?: string; age?: number }
```

`partial()` is about children, not the object itself — the ObjectField's own `required`/`optional` flag is unchanged. If you want both `partial()` AND the object to be optional, chain `.optional()` afterwards.

## `required()`

Inverse of `partial()` — calls `.required()` on every child field, removing any `| undefined` from their types.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const looseUser = a.object({
  id: a.string(),
  name: a.string().optional(),
})
const strictUser = looseUser.required()
type Strict = Infer<typeof strictUser>
// Strict = { id: string; name: string }
```

Schema-level config (name/timestamps/indexes/meta/description) is preserved — `required()` is a same-schema strengthening, not a fresh schema like `pick`/`omit`.

## `extend(shape)`

Add new keys (or replace existing ones) by passing a partial shape object.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const audited = baseUser.extend({
  createdAt: a.date(),
  // overrides baseUser.age:
  age: a.number().int().nonnegative(),
})
type Audited = Infer<typeof audited>
// Audited adds createdAt and keeps the (narrower) age
```

Conflict resolution is **right-wins**: any key in `shape` replaces the original. The object's own config is preserved.

## `merge(other)`

Merge another `ObjectField`'s shape in. Semantically equivalent to `this.extend(other.getObj())`.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const audit = a.object({
  createdAt: a.date(),
  updatedAt: a.date(),
})
const userWithAudit = baseUser.merge(audit)
type UserWithAudit = Infer<typeof userWithAudit>
// UserWithAudit = baseUser fields + createdAt + updatedAt
```

`other`'s schema-level config (`name`, `timestamps`, `indexes`, `description`) is **not** copied — only its property shape. Same right-wins rule on conflicts.

## Pitfalls

> [!WARNING]
> **`extend` and `merge` are right-wins on conflicting keys.** The incoming definition replaces the original silently. If you didn't intend the replacement, the type system can't help you — there's no error on overlap. Reach for `omit` first if you want to be explicit about the drop.

> [!WARNING]
> **Each composition returns a brand-new ObjectField.** The original is untouched. Variables of the original schema still resolve to the original shape; if you want to "update" a schema in place, reassign the variable.

## Related

- [Fields and modifiers](./fields-and-modifiers.md) — the full ObjectField surface.
- [Inferring types](./inferring-types.md) — how `Infer<>` walks through composition.
- [Recipes → Share types with the frontend](../recipes/share-types-with-frontend.md).
