import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '../src'

// Registers the json-schema adapter explicitly for tests. In real applications,
// the consumer is expected to call this in their entry point.
registerAdapter('json-schema', toJsonSchema as any)
