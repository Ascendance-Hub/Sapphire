<!-- Code in this guide is verified by tests/docs-examples/tuples-vs-arrays.test.ts -->

# Tuplas vs arrays

O Sapphire oferece dois kinds parecidos com lista e de semânticas bem diferentes: `a.array(item)` para coleções homogêneas de comprimento variável, e `a.tuple([f1, f2, ...])` para sequências heterogêneas, de comprimento fixo e sensíveis à posição. Escolha aquele cujo shape combina com os seus dados — eles não se sobrepõem.

## `a.array(field)`

Comprimento variável, toda entrada validada contra o único field interno. `_output = T[]`.

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const tags = a.array(a.string()).min(1).max(10)
type Tags = Infer<typeof tags>
// Tags = string[]
```

Modificadores: `.min(n)`, `.max(n)`, `.length(n)`, `.nonempty()` — veja [Fields e modificadores](./fields-and-modifiers.md#aarrayitem).

## `a.tuple([f1, f2, ...])`

Comprimento fixo, cada posição validada contra o field no mesmo índice. `_output` é um tipo de tupla com um elemento por field interno.

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const point = a.tuple([a.number(), a.number(), a.string()])
type Point = Infer<typeof point>
// Point = [number, number, string]
```

Um comprimento divergente produz uma issue `tuple_length`; um elemento errado em qualquer posição produz o código de erro normal do field interno naquele caminho de índice.

## Comparação

| Aspecto                | `a.array(item)`                                                                 | `a.tuple([f1, f2, ...])`                                           |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Shape                  | Homogêneo — toda entrada o mesmo field                                          | Heterogêneo — um field por posição                                 |
| Comprimento            | Variável; limitado com `min`/`max`/`length`                                     | Fixo pelo número de fields internos                                |
| `Infer<>`              | `T[]`                                                                           | `[T1, T2, ...]`                                                    |
| Comprimento divergente | Pego por `min`/`max`/`length` se definidos                                      | Sempre uma issue `tuple_length`                                    |
| Mapeamento de adapter  | Mongo `[item]`, JSON Schema `items: ...`, coluna de array do Drizzle ou `jsonb` | JSON Schema `prefixItems: [...]`, Mongo `Mixed[]`, Drizzle `jsonb` |

## Misturando os dois

Se você precisa de "um-ou-outro numa lista", combine `array` com `union`:

<!-- from tests/docs-examples/tuples-vs-arrays.test.ts -->

```ts
const mixed = a.array(a.type().union([a.string(), a.number()]))
type Mixed = Infer<typeof mixed>
// Mixed = (string | number)[]
```

## Armadilhas

> [!WARNING]
> **A semântica pré-v1 de union implícita em `array([f1, f2])` foi removida.** No Sapphire v1, `a.array(...)` recebe um **único** field interno. Se você quer "um-ou-outro num array", explicite com `a.array(a.type().union([...]))`. Se você quer posições fixas com tipos diferentes, use `a.tuple([...])`. Código que dependia da antiga forma de union implícita vai falhar na verificação de tipos — por design.

## Relacionados

- [Fields e modificadores](./fields-and-modifiers.md) — modificadores de array.
- [Unions, literais e enums](./unions-literals-enums.md) — construindo fields internos de union.
