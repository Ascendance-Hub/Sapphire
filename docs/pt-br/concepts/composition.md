<!-- Code in this guide is verified by tests/docs-examples/composition.test.ts -->

# Composição

ObjectFields podem ser derivados uns dos outros. `pick`, `omit`, `partial`, `required`, `extend` e `merge` retornam cada um um **novo** ObjectField — o original permanece intocado. A mesma cadeia funciona no nível de tipos: `Infer<typeof derived>` reflete o que quer que a composição tenha feito. Use esses métodos para compartilhar um único schema base entre as fronteiras de leitura/escrita/patch em vez de se repetir.

## Exemplo mínimo

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const baseUser = a.object({
  id: a.string(),
  name: a.string(),
  email: a.string().email(),
  age: a.number().int(),
})
```

Todos os exemplos abaixo derivam deste `baseUser`.

## `pick(keys)`

Restringe ao subconjunto listado. As chaves são verificadas em tempo de tipo contra `keyof T`. Passe o array como `as const` para inferência com tipos literais.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const publicUser = baseUser.pick(['id', 'name'] as const)
type PublicUser = Infer<typeof publicUser>
// PublicUser = { id: string; name: string }
```

O novo ObjectField tem uma configuração de nível de schema zerada — sem `name`, `timestamps`, `indexes` ou `meta` da origem. Apenas a flag `required` do próprio objeto é preservada.

## `omit(keys)`

Descarta as chaves listadas. Mesma convenção de `as const`; mesma semântica de reset de configuração que o `pick`.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const safeUser = baseUser.omit(['email'] as const)
type SafeUser = Infer<typeof safeUser>
// SafeUser = { id: string; name: string; age: number }
```

## `partial()`

Torna todo field filho opcional. Tanto `_input` quanto `_output` de cada propriedade passam a ser `T | undefined`, elevados a posições `?:` no tipo do objeto.

<!-- from tests/docs-examples/composition.test.ts -->

```ts
const patch = baseUser.partial()
type Patch = Infer<typeof patch>
// Patch = { id?: string; name?: string; email?: string; age?: number }
```

`partial()` diz respeito aos filhos, não ao objeto em si — a própria flag `required`/`optional` do ObjectField não muda. Se você quer tanto `partial()` QUANTO o objeto opcional, encadeie `.optional()` depois.

## `required()`

Inverso de `partial()` — chama `.required()` em todo field filho, removendo qualquer `| undefined` dos tipos deles.

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

A configuração de nível de schema (name/timestamps/indexes/meta/description) é preservada — `required()` é um fortalecimento do mesmo schema, não um schema novo como `pick`/`omit`.

## `extend(shape)`

Adiciona novas chaves (ou substitui as existentes) passando um objeto de shape parcial.

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

A resolução de conflitos é **a direita vence**: qualquer chave em `shape` substitui a original. A configuração do próprio objeto é preservada.

## `merge(other)`

Mescla o shape de outro `ObjectField`. Semanticamente equivalente a `this.extend(other.getObj())`.

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

A configuração de nível de schema de `other` (`name`, `timestamps`, `indexes`, `description`) **não** é copiada — apenas o shape de suas propriedades. Mesma regra de a direita vence em conflitos.

## Armadilhas

> [!WARNING]
> **`extend` e `merge` usam a direita vence em chaves conflitantes.** A definição que chega substitui a original silenciosamente. Se você não pretendia a substituição, o sistema de tipos não pode ajudar — não há erro em sobreposição. Recorra a `omit` primeiro se quiser ser explícito sobre o descarte.

> [!WARNING]
> **Cada composição retorna um ObjectField novinho em folha.** O original permanece intocado. Variáveis do schema original ainda resolvem para o shape original; se você quer "atualizar" um schema no lugar, reatribua a variável.

## Relacionados

- [Fields e modificadores](./fields-and-modifiers.md) — a superfície completa do ObjectField.
- [Inferindo tipos](./inferring-types.md) — como `Infer<>` percorre a composição.
- [Receitas → Compartilhar tipos com o frontend](../recipes/share-types-with-frontend.md).
