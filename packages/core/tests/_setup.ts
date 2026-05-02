// Vitest setup for core: registers an identity adapter named "mongo" so legacy
// tests that call `getSchema()` (which goes through the registry) keep passing
// without dragging the mongo package into core. The mongo package registers the
// real adapter when it's imported in its own test suite.
import { registerAdapter, type SapphireSchemaNode } from '../src'

registerAdapter("mongo", (node: SapphireSchemaNode) => node)
