import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '../src'

// Registers the native-driver mongo adapter explicitly for tests.
registerAdapter('bson', toBsonSchema)
