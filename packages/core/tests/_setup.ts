// Vitest setup for core: registers an identity adapter for ORM.MONGO so legacy
// tests that call `getSchema()` (which goes through the registry) keep passing
// without dragging the mongo package into core. The mongo package registers the
// real adapter when it's imported in its own test suite.
import { ORM, registerAdapter, type SapphireSchemaNode } from '../src'

registerAdapter(ORM.MONGO, (node: SapphireSchemaNode) => node)
