import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '../src'

// Registers the mongoose adapter explicitly for tests. In real applications,
// the consumer is expected to call this in their entry point.
registerAdapter('mongoose', toMongooseSchema)

/**
 * Unique Mongoose model name. Mongoose's model registry is process-global;
 * naming models with `Date.now()` risks an `OverwriteModelError` flake when
 * two `model()` calls land in the same millisecond. A monotonic counter is
 * collision-free.
 */
let modelSeq = 0
export function uniqueModelName(prefix: string): string {
  return `${prefix}_${modelSeq++}`
}
