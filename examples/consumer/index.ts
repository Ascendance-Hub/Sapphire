import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'

const a = new Sapphire({ defaultAdapter: 'mongo' })

const userOrm = a.object({
  name: a.string().min(1),
  age: a.number().optional(),
})

export type User = Infer<typeof userOrm>

// via default adapter (mongo registra a si mesmo no import acima)
const _viaDefault = userOrm.getSchema()
void _viaDefault

// chamando o adapter direto
const _direct = toMongoSchema(userOrm.toSchema())
void _direct
