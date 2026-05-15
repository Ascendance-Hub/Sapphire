import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

// Registers the native-driver mongo adapter explicitly for tests.
registerAdapter('mongo', toMongoValidator)
