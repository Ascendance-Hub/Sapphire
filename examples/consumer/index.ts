import { Sapphire, registerAdapter, type Infer } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'

// Adapters do NOT auto-register — register the ones you use, once, at app entry.
registerAdapter('mongoose', toMongooseSchema)

const a = new Sapphire({ defaultAdapter: 'mongoose' })

const userOrm = a.object({
  name: a.string().min(1),
  age: a.number().optional(),
})

export type User = Infer<typeof userOrm>

// via default adapter (resolves 'mongoose' from the registry above)
const _viaDefault = userOrm.getSchema()
void _viaDefault

// chamando o adapter direto
const _direct = toMongooseSchema(userOrm.toSchema())
void _direct
