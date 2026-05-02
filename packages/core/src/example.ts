import { Sapphire } from './lib/sapphire'
import { ORM } from './types'
import type { Infer } from './types/infer'

const a = new Sapphire({ defaultOrm: ORM.MONGO })
const userOrm = a.object({
  name: a.string(),
  age: a.number().optional(),
  job: a.object({
    name: a.string(),
    salary: a.number(),
    company: a
      .object({
        name: a.string(),
      })
      .optional(),
  }),
  birthDate: a.date().optional(),
  deathDate: a.type().union([a.date(), a.string()]),
  isIncomeTaxed: a.boolean().optional(),
  employmentHistory: a.array([
    a.object({
      name: a.string(),
      salary: a.number(),
      company: a.string(),
    }),
  ]),
})

export type UserType = Infer<typeof userOrm>

const user: UserType = {
  name: 'ale',
  job: {
    name: 'dev',
    salary: 5000,
    company: {
      name: 'company',
    },
  },
  birthDate: new Date(),
  deathDate: '3000-07-01',
  isIncomeTaxed: true,
  employmentHistory: [
    {
      name: 'dev',
      salary: 5000,
      company: 'company',
    },
    {
      name: 'po',
      salary: 5000,
      company: 'company',
    },
  ],
}

console.log(userOrm.getSchema())

try {
  const result = userOrm.validate(user)
  console.log('Validação bem-sucedida:', result)
} catch (e) {
  console.error('Erro de validação (válido):', e)
}

const userInvalido = {
  ...user,
  employmentHistory: [
    {
      name: 'dev',
      salary: 'não é número',
    },
  ],
}

try {
  const result = userOrm.validate(userInvalido)
  console.log('Validação inesperadamente bem-sucedida:', result)
} catch (e) {
  console.error('Erro de validação (inválido):', e)
}

const b = new Sapphire({ defaultOrm: ORM.MONGO })
const test = b.object({
  name: b.string(),
  age: b.number(),
})

const c = new Sapphire({ defaultOrm: ORM.MONGO })
const test2 = c.type().pick(test, ['name', 'age'])

export type Picked = Infer<typeof test2>
