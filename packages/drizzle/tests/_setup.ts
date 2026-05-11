import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

// Registers the drizzle adapter explicitly for tests. In real applications,
// the consumer is expected to call this in their entry point.
registerAdapter('drizzle', toDrizzleSchema as any)
