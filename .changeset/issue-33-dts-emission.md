---
'@ascendance-hub/sapphire-core': minor
---

Fix #33: library consumers can now emit `.d.ts` when re-exporting inferred
schema types. The field classes (`ObjectField`, `StringField`, `NumberField`,
…) are now exported as types, so `typeof schema` is nameable, and the internal
`_parse` method (with `ParseContext` / `InternalParseResult`) is hidden from the
public type surface via `stripInternal`. This unblocks the schema-once pattern
(`export type X = Infer<typeof schema>`) in published TypeScript libraries with
`declaration: true`.
