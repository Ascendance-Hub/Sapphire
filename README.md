# Sapphire

Sapphire é uma biblioteca TypeScript para definição de **schemas** com geração automática de **tipos TypeScript** e adaptação para múltiplos ORMs. Hoje suporta MongoDB (via Mongoose), com arquitetura de adapters preparada para outros ORMs.

---

## Recursos

- Definição fluente de schemas (`string`, `number`, `boolean`, `date`, `object`, `array`)
- Geração automática de tipos TypeScript a partir do schema
- Campos opcionais (`optional()`) e validação de tamanho mínimo (`min()`)
- Schemas aninhados, arrays tipados e **unions polimórficos** (`type().union()`)
- **Pick** para derivar schemas (`type().pick()`)
- **Multi-ORM**: uma mesma instância pode gerar schemas para diferentes alvos
- Builder **imutável**: `optional()`/`min()` retornam nova instância — fields-base podem ser reusados sem vazar estado
- Zero dependências de runtime

---

## Instalação

> **Nota:** Sapphire ainda não está publicada no npm.
> Para usar localmente, importe os arquivos a partir do código-fonte.

---

## Quickstart

```typescript
import { Sapphire, ORM } from 'sapphire-lib'

const a = new Sapphire({ defaultOrm: ORM.MONGO })

const userOrm = a.object({
  name: a.string(),
  age: a.number().optional(),
  birthDate: a.date().optional(),
})

// Tipo TypeScript inferido a partir do schema
export type User = ReturnType<typeof userOrm.getType>

// Schema pronto para o ORM (Mongoose, no caso de ORM.MONGO)
const mongoSchema = userOrm.getSchema()
```

---

## API

### Construtor

```typescript
new Sapphire(opts?: { defaultOrm?: ORM })
```

`defaultOrm` é opcional. Quando ausente, `getSchema()` exige que o ORM seja passado por chamada.

### Métodos da `Sapphire`

| Método         | Descrição                                                              |
| -------------- | ---------------------------------------------------------------------- |
| `string()`     | Campo string (`.optional()`, `.min(n)`)                                |
| `number()`     | Campo number (`.optional()`)                                           |
| `boolean()`    | Campo boolean (`.optional()`)                                          |
| `date()`       | Campo date (`.optional()`)                                             |
| `object(obj)`  | Campo objeto aninhado (`.optional()`, `.getType()`, `.getSchema(orm?)`) |
| `array(arr)`   | Campo array com items tipados (`.optional()`)                          |
| `type()`       | Factory para construções avançadas: `.union([...])` e `.pick(obj, [...])` |

Todos os fields expõem `toSchema()` (schema neutro), `getSchema(orm?)` (adaptado ao ORM) e `validate(value)`.

---

## Recursos avançados

### Multi-ORM

Você pode criar uma `Sapphire` sem `defaultOrm` e escolher o adapter por chamada:

```typescript
const a = new Sapphire()

const productOrm = a.object({
  title: a.string(),
  price: a.number(),
})

const mongoSchema = productOrm.getSchema(ORM.MONGO)
// futuramente: productOrm.getSchema(ORM.PRISMA), etc.
```

Ou definir um default e ainda assim sobrescrever pontualmente:

```typescript
const a = new Sapphire({ defaultOrm: ORM.MONGO })
productOrm.getSchema()           // usa MONGO
productOrm.getSchema(ORM.MONGO)  // override explícito
```

### Unions

Para campos que aceitam mais de um tipo:

```typescript
const event = a.object({
  occurredAt: a.type().union([a.date(), a.string()]),
})
```

A inferência de `event.getType` resolve o campo como `Date | string`.

### Pick

Para derivar um novo objeto a partir de um subset das chaves de outro:

```typescript
const userOrm = a.object({
  name: a.string(),
  age: a.number(),
  email: a.string(),
})

const summary = a.type().pick(userOrm, ['name', 'age'])
// summary tem apenas 'name' e 'age', com tipos preservados
```

---

## Imutabilidade do builder

Modificadores como `optional()` e `min()` **não mutam** a instância — eles retornam uma **nova** instância com a configuração atualizada. Isso significa que você pode definir um field-base e reusar com segurança:

```typescript
const baseName = a.string()

const userSchema  = a.object({ name: baseName })             // name obrigatório
const adminSchema = a.object({ name: baseName.optional() })  // name opcional

// baseName segue obrigatório — nada vazou.
```

`a.string().min(3).min(5)` também é seguro: cada chamada retorna uma nova instância (a final tem `minLength: 5`), sem afetar as anteriores.

---

## Roadmap

- Suporte a outros ORMs além do MongoDB (Prisma, Drizzle…)
- Validações customizadas e mensagens de erro configuráveis
- Hooks e middlewares
- Geração de mocks dinâmicos
- Publish no npm (Fase 5: CI no GitHub Actions, lint/format, exports map)

---

## Licença

BSD-3-Clause license
