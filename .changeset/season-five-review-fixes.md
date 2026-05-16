---
'@ascendance-hub/sapphire-core': patch
'@ascendance-hub/sapphire-mongoose': patch
'@ascendance-hub/sapphire-drizzle': patch
'@ascendance-hub/sapphire-json-schema': patch
---

season-five — code review fixes (B1–B4).

**B1 — `multipleOf` precision.** The float tolerance was scaled by the divisor,
so a genuine multiple of a large operand was wrongly rejected (`100.2` failed
`multipleOf(0.1)`). The check now tests whether `n / m` is an integer with a
tolerance that scales with the quotient's magnitude. Fixed in core's
`NumberField._parse` and mirrored in the Mongoose adapter's `multipleOf`
validator.

**B2 — Drizzle primary-key collision.** When a schema declared its own field at
the implicit PK name (`id`), the adapter emitted `serial('id').primaryKey()`
and then let the property loop silently overwrite it, leaving the table with no
primary key. The user-declared field is now promoted with `.primaryKey()`
across all three dialects (pg/mysql/sqlite).

**B3 — Mongoose adapter dropped metadata on containers.** `buildField` skipped
`applyCommon` for the `array` and nested-`object` cases, silently dropping
`default` / `description` / the `meta.mongoose` escape hatch on those kinds.
Both branches now run `applyCommon`.

**B4 — duplicate `$defs` name detection (JSON Schema).** Shape-changing object
ops (`extend`/`merge`/`partial`/`required`) keep the schema `name` by design;
when a named schema and a same-named derived schema both appeared in one tree,
`collectNamed` kept the first and silently emitted a wrong `$ref` for the rest.
It now throws a clear error on a genuine collision (the `options.defs` escape
hatch keeps its documented "tree wins" behaviour).
