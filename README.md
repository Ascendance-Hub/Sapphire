# Ruby

Ruby é uma biblioteca TypeScript para criação dinâmica de **schemas** e **tipos** para bancos de dados, com foco inicial em MongoDB, mas com arquitetura preparada para outros ORMs no futuro.  
Ela permite que você defina modelos de dados de forma fluente, **gerando automaticamente os tipos TypeScript** correspondentes e os schemas para validação e integração com ORMs.

---

## Recursos

- **Definição fluente de schemas** (string, number, boolean, date, object, array)
- **Geração automática de tipos TypeScript** a partir do schema
- **Compatível com MongoDB** (outros ORMs em breve)
- **Campos opcionais**
- **Schemas aninhados e arrays tipados**
- **Zero dependências externas**

---

## Instalação

> **Nota:** Ruby ainda não está publicada no npm.  
> Para usar localmente, basta importar os arquivos no seu projeto.

---

## Exemplo Rápido

```typescript
import { Ruby, ORM } from 'ruby-lib'

const a = new Ruby(ORM.MONGO)
const userOrm = a.object({
  name: a.string(),
  age: a.number().optional(),
  job: a.object({
    name: a.string(),
    salary: a.number(),
    company: a.object({
      name: a.string(),
    }).optional()
  }),
  birthDate: a.date().optional(),
  isIncomeTaxed: a.boolean().optional(),
  employmentHistory: a.array([
    a.object({
      name: a.string(),
      salary: a.number(),
      company: a.string(),
    }),
  ])
})

// Gerando o tipo TypeScript a partir do schema:
export type UserType = ReturnType<typeof userOrm.getType>

// Exemplo de uso do tipo gerado:
const user: UserType = {
  name: 'name',
  job: {
    name: 'dev',
    salary: 5000,
    company: {
      name: 'company',
    },
  },
  birthDate: new Date(),
  isIncomeTaxed: true,
  employmentHistory: [
    {
      name: 'dev',
      salary: 5000,
      company: 'company',
    },
  ],
}
```

---

## Como funciona?

1. Criação do Schema

Você instancia a classe `Ruby` passando o ORM desejado (por enquanto, apenas `ORM.MONGO`):

```typescript
const a = new Ruby(ORM.MONGO)
```

Depois, utilize os métodos para criar campos:

- `a.string()`
- `a.number()`
- `a.boolean()`
- `a.date()`
- `a.object({...})`
- `a.array([...])`

Campos podem ser aninhados e marcados como opcionais com `.optional()`.

---

2. Gerando o Tipo TypeScript

Para obter o tipo TypeScript do seu schema, use:

```typescript
export type UserType = ReturnType<typeof userOrm.getType>
```

Assim, você garante que qualquer objeto do tipo `UserType` estará sempre sincronizado com o schema definido.

---

3. Obtendo o Schema para o ORM

Para obter o schema pronto para uso no ORM (ex: passar para o Mongoose):

```typescript
userOrm.getSchema()
```

O resultado será um objeto com a estrutura do schema, incluindo tipos, obrigatoriedade e propriedades aninhadas.

---

## LIB

### Métodos de Ruby

| Método         | Descrição                                 |
| -------------- | ----------------------------------------- |
| `string()`     | Campo string                              |
| `number()`     | Campo number                              |
| `boolean()`    | Campo boolean                             |
| `date()`       | Campo date                                |
| `object(obj)`  | Campo objeto aninhado                     |
| `array(arr)`   | Campo array de objetos ou tipos primitivos|

Todos os campos possuem o método `.optional()` para torná-los opcionais no tipo e no schema.

---

Exemplo Avançado

```typescript
const productOrm = a.object({
  title: a.string(),
  price: a.number(),
  tags: a.array([a.string()]).optional(),
  metadata: a.object({
    createdAt: a.date(),
    updatedAt: a.date().optional(),
  })
})

type ProductType = ReturnType<typeof productOrm.getType>
```

---

## Roadmap

- Suporte a outros ORMs além do MongoDB
- Validações customizadas
- Erros customizaveis
- Hooks e middlewares
- Criação de Mocks dinâmicos

---

## Licença

BSD-3-Clause license