# Design decisions

This page captures the **why** behind Sapphire's public API — the decisions a user is most likely to bump into and wonder about. It is a user-facing distillation of the internal design doc; if you maintain Sapphire or want the full rationale and trade-offs, see "Read more" at the bottom.

## Why brand types (`_output` / `_input`) and not `IsOptional` generics

Every Sapphire field carries two declare-only phantom types: `_output` (what `parse` returns) and `_input` (what `parse` accepts). `Infer<F>` and `InferInput<F>` are one-line aliases over those: `F['_output']`, `F['_input']`.

The natural alternative is to thread `IsOptional` / `IsNullable` boolean generics through every field class and reconstruct the output type from them at the `Infer<>` level. Sapphire's earlier prototype did this, and the central type machinery became the bottleneck — every new field or modifier required touching it.

Brand types invert the relationship. The signal "is this optional" lives in `_output` (does the union contain `undefined`?) and `_input` (does it contain `undefined`?). `default()` is the cleanest case: it makes `_input: T | undefined` but `_output: T`, because the default is filled in during parsing. With brand types this falls out of the modifier signature; with `IsOptional` generics it requires a separate `HasDefault` flag.

The result: `Infer<F>` never changes, regardless of how many fields or modifiers we add. New fields just declare their own `_output` and `_input`.

## Why fixed versioning across the four packages

`@ascendance-hub/sapphire-core`, `-mongo`, `-json-schema`, and `-drizzle` always share `major.minor`. A bug fix in the Mongo adapter still bumps all four. Changesets is configured for "fixed" versioning across them.

This is heavier on release cadence but lighter on mental model. Users never have to ask "is core@1.4 compatible with mongo@1.2?" — the answer is always "if the majors match, yes". With linked-but-not-fixed versioning, the answer involves a compatibility matrix that grows linearly per release.

The four packages are coupled in practice: the IR shape is defined in core, and every adapter switches on every `kind`. A breaking IR change is a breaking change to every adapter. Fixed versioning makes that coupling visible.

## Why JSON Schema 2020-12 (not draft-07)

Draft-07 is by far the most widely deployed dialect — most older validators target it. Sapphire emits **2020-12** anyway because two IR kinds depend on its newer keywords:

- **Tuples.** 2020-12 uses `prefixItems` for fixed-position tuple typing. Draft-07's `items: [...]` form is deprecated and behaves differently in some validators.
- **Numeric `exclusiveMinimum` / `exclusiveMaximum`.** Draft-07 made these booleans; 2020-12 makes them numbers (matching Sapphire's `.gt(n)` / `.lt(n)` modifiers directly).

AJV's `Ajv2020` constructor handles 2020-12 out of the box, and MCP tools (one of Sapphire's headline use cases) target 2020-12 explicitly.

## Why Drizzle return types are `any`

The Drizzle adapter's `toDrizzleSchema(...)` returns a value typed as `any`. This is deliberate.

Drizzle's `pgTable` / `mysqlTable` / `sqliteTable` return a `*TableWithColumns<...>` type whose generic parameters are not reliably exported across the `drizzle-orm` peer-dependency range Sapphire supports. Typing the adapter against a specific snapshot of those types would lock users to a single `drizzle-orm` minor version.

The practical impact is small: you almost always pass the adapter output straight into `drizzle(...)` or into a `references(() => users.id)` callback, both of which infer column types from the input. The `any` is contained at the boundary and gone by the next line of user code.

## Why a 5-level message resolution hierarchy

When a field fails validation, the message that ends up on the issue is resolved against five layers, most-specific wins:

1. **Per-call** (`schema.parse(value, { messages })`)
2. **Per-rule** (`a.string().min(3, { message: '...' })`)
3. **Per-field** (`a.string().message(...)`)
4. **Per-instance** (`new Sapphire({ messages: {...} })`)
5. **Built-in** (English defaults baked into core)

This looks like a lot of layers, but each one exists for a real reason. Built-ins give sensible defaults out of the box. The instance level lets you i18n the whole app with one object. The field and rule levels let you override locally without ditching the global defaults. The per-call level is the escape hatch for surfaces that need different copy than your app default — typically server-rendered error pages or API responses.

The full layering also means **i18n is not a separate feature**. The lib only guarantees that every string is substitutable; you implement i18n by passing a complete localized `messages` object to `new Sapphire(...)`. See [`config.md`](../concepts/config.md).

## Why `coerce` runs before validators

When a string field has both `.coerce()` and `.regex(/.../ )`, coerce runs **first** — the regex sees the post-coercion value. The same goes for `.trim()` / `.toLowerCase()` / `.toUpperCase()` on strings, and `.coerce()` on numbers/booleans/dates.

The motivation is type alignment. Validators like `min`, `max`, `regex`, `gt`, `lt` are written against the field's declared type — they assume they're inspecting a `string`, a `number`, a `Date`. Coercion exists to bring stringly-typed inputs (URL parameters, form payloads) into that type space _before_ those validators run. The opposite order would mean every validator has to defensively handle the pre-coercion type.

The pitfall: if you want to validate the _raw_ input, coerce doesn't fit your use case — use a separate parsing step. See the warning in [`fields-and-modifiers.md`](../concepts/fields-and-modifiers.md).

## Why `union` maps to `oneOf` (not `anyOf`)

In JSON Schema, `anyOf` means "at least one branch matches"; `oneOf` means "exactly one branch matches". Sapphire's `a.type().union([...])` is semantically discriminated — at most one option should describe a given value — so `oneOf` is the closer fit.

There is a small validator cost: `oneOf` requires every validator to check every branch (to verify exactly-one) instead of short-circuiting on first match. For Sapphire's typical union sizes (2–5 branches), this is negligible. The clarity of the emitted schema is worth more than the cycles saved.

## Why `.name()` is required for `ref()` targets

`a.ref('User')` resolves the string `'User'` against a per-`Sapphire`-instance registry of named ObjectFields. Until some ObjectField is registered under that key, the ref is unresolved.

The alternative (anonymous refs by JS reference) would resolve at module-import time, which forces a topological import order — `posts.ts` can't import `User` if `User` imports `Post`. Naming decouples the registry key from the import graph, so cycles like `User ↔ Post` resolve at `getSchema()` time without any module-load ordering constraint.

The cost is that named-schema collisions across modules become silent overwrites — if two files both call `.name('User')` on the same `Sapphire` instance, the last one wins. Tests should construct a fresh `new Sapphire()` to avoid leaking names. See [`refs-and-relations.md`](../concepts/refs-and-relations.md).

## Why core has zero runtime dependencies

`@ascendance-hub/sapphire-core` ships with no `dependencies`, only `devDependencies`. All ORM-specific code (`mongoose`, `drizzle-orm`) lives in the adapter packages and is declared as a `peerDependency` there.

The reason is install footprint and version control. If a user is on the JSON Schema adapter only, they pay nothing for `mongoose`. If they're on a specific `drizzle-orm` version, the adapter respects their version through the peer-dep range rather than forcing a transitive install. Core stays a small, predictable bundle.

The same argument applies to AJV, `zod`, anything else Sapphire could have leaned on for validation — none of them are runtime deps of core. The validators are hand-rolled and live entirely inside the package.

## Why the IR is a discriminated union

`SapphireSchemaNode` is a TypeScript discriminated union over 12 `kind` values: `'string'`, `'number'`, `'boolean'`, `'date'`, `'object'`, `'array'`, `'tuple'`, `'union'`, `'literal'`, `'enum'`, `'record'`, `'ref'`. Every adapter dispatches on `node.kind`.

This is the keystone of the multi-adapter design. Adding a new IR kind is automatically a **compile-time error in every adapter** — `switch (kind)` is no longer exhaustive, and TypeScript points at every call site. The alternative (an open interface with optional fields per shape) would let adapters silently miss new kinds and fall through to fallback behavior the user didn't ask for.

The flip side is that core can't add IR kinds without coordinating updates to every adapter — but since core and the three first-party adapters share a fixed version, that coordination is already part of the release.

## Read more

[`specs/V1_DESIGN.md`](../../specs/V1_DESIGN.md) is the internal design doc that this page summarizes. It covers maintainer-facing rationale, trade-offs that were considered and rejected, and notes for future work. The `specs/` directory is gitignored — the link above only resolves in a local checkout of the repo, not when browsing on GitHub. The file is maintained alongside source by Sapphire maintainers.

A drift-notice header at the top of `V1_DESIGN.md` flags where the design diverged from the shipped implementation (e.g. `toAdapter()` stayed as `getSchema()`, `toIR()` was renamed to `toSchema()`, the IR gained an `'enum'` kind, the `'nonempty'` issue code was dropped). The full reconciliation lives in [`specs/season-two/part-two/AUDIT_V1_DESIGN_VS_IMPL.md`](../../specs/season-two/part-two/AUDIT_V1_DESIGN_VS_IMPL.md), which catalogues every drift, its cause, and its severity. If anything on this page reads like it contradicts what the code does, the audit (and ultimately the code under `packages/*/src`) wins.
