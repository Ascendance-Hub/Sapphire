import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

// Registers the mongo adapter explicitly for tests. In real applications,
// the consumer is expected to call this in their entry point.
registerAdapter('mongo', toMongoSchema as any)
