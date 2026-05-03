// Exemplos do README — devem compilar e refletir a API atual.
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

// ---------- Quickstart ----------
const a = new Sapphire({ defaultAdapter: 'mongo' })

const userOrm = a.object({
  name: a.string(),
  age: a.number().optional(),
  birthDate: a.date().optional(),
})

export type User = Infer<typeof userOrm>

const _mongoSchema = userOrm.getSchema()
void _mongoSchema

// ---------- Multi-ORM ----------
const b = new Sapphire()
const productOrm = b.object({
  title: b.string(),
  price: b.number(),
})
const _multi = productOrm.getSchema('mongo')
void _multi

// Override explícito mesmo com default
const c = new Sapphire({ defaultAdapter: 'mongo' })
const cOrm = c.object({ title: c.string() })
cOrm.getSchema()
cOrm.getSchema('mongo')

// ---------- Unions ----------
const event = a.object({
  occurredAt: a.type().union([a.date(), a.string()]),
})
type Event = Infer<typeof event>
const _evt: Event = { occurredAt: '2026-01-01' }
void _evt

// ---------- Literal ----------
const role = a.type().literal('admin')
type Role = Infer<typeof role>
const _r: Role = 'admin'
void _r

// ---------- Tuple ----------
const point = a.tuple([a.number(), a.number()])
type Point = Infer<typeof point>
const _p: Point = [10, 20]
void _p

// ---------- Imutabilidade ----------
const baseName = a.string()
const userSchema = a.object({ name: baseName })
const adminSchema = a.object({ name: baseName.optional() })
void userSchema
void adminSchema

// baseName segue obrigatório
const _baseRequired: true = baseName.toSchema().required as true
void _baseRequired
