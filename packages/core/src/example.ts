import { Sapphire } from './lib/sapphire'
import type { Infer } from './types/infer'

const a = new Sapphire({ defaultAdapter: 'mongo' })
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

const valid = userOrm.safeParse(user)
if (valid.success) {
  console.log('Validação bem-sucedida:', valid.data)
} else {
  console.error('Erro de validação (válido):', valid.error.issues)
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

const invalid = userOrm.safeParse(userInvalido)
if (invalid.success) {
  console.log('Validação inesperadamente bem-sucedida:', invalid.data)
} else {
  console.error('Erro de validação (inválido):', invalid.error.issues)
}

const b = new Sapphire({ defaultAdapter: 'mongo' })
const test = b.object({
  name: b.string(),
  age: b.number(),
})

const c = new Sapphire({ defaultAdapter: 'mongo' })
const test2 = c.type().pick(test, ['name', 'age'])

export type Picked = Infer<typeof test2>
