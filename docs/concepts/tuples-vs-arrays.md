<!-- Code in this guide is verified by tests/docs-examples/tuples-vs-arrays.test.ts -->

# Tuples vs arrays

Sapphire offers two list-like kinds with very different semantics: `a.array(item)` for homogeneous, variable-length collections, and `a.tuple([f1, f2, ...])` for heterogeneous, fixed-length, position-sensitive sequences. Pick the one whose shape matches your data — they don't overlap.

## `a.array(field)`

Variable length, every entry validated against the single inner field. `_output = T[]`.

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const tags = a.array(a.string()).min(1).max(10)
type Tags = Infer<typeof tags>
// Tags = string[]
```

Modifiers: `.min(n)`, `.max(n)`, `.length(n)`, `.nonempty()` — see [Fields and modifiers](./fields-and-modifiers.md#aarrayitem).

## `a.tuple([f1, f2, ...])`

Fixed length, each position validated against the field at the same index. `_output` is a tuple type with one element per inner field.

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const point = a.tuple([a.number(), a.number(), a.string()])
type Point = Infer<typeof point>
// Point = [number, number, string]
```

A mismatched length produces a `tuple_length` issue; a wrong element at any position produces the inner field's normal error code at that index path.

## Comparison

| Aspect          | `a.array(item)`                                                           | `a.tuple([f1, f2, ...])`                                           |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Shape           | Homogeneous — every entry the same field                                  | Heterogeneous — one field per position                             |
| Length          | Variable; bounded with `min`/`max`/`length`                               | Fixed by the number of inner fields                                |
| `Infer<>`       | `T[]`                                                                     | `[T1, T2, ...]`                                                    |
| Length mismatch | Caught by `min`/`max`/`length` if set                                     | Always `tuple_length` issue                                        |
| Adapter mapping | Mongo `[item]`, JSON Schema `items: ...`, Drizzle array column or `jsonb` | JSON Schema `prefixItems: [...]`, Mongo `Mixed[]`, Drizzle `jsonb` |

## Mixing the two

If you need "either-of in a list", combine `array` with `union`:

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const mixed = a.array(a.type().union([a.string(), a.number()]))
type Mixed = Infer<typeof mixed>
// Mixed = (string | number)[]
```

## Pitfalls

> [!WARNING]
> **The pre-v1 `array([f1, f2])` implicit-union semantic was removed.** In Sapphire v1, `a.array(...)` takes a **single** inner field. If you want "either-of in an array", spell it out with `a.array(a.type().union([...]))`. If you want fixed positions with different types, use `a.tuple([...])`. Code that relied on the old implicit-union form will fail to type-check — by design.

## Related

- [Fields and modifiers](./fields-and-modifiers.md) — array modifiers.
- [Unions, literals, and enums](./unions-literals-enums.md) — building union inner fields.
