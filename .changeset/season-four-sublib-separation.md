---
'@ascendance-hub/sapphire-bson': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Split the Mongo adapter into two packages: `@ascendance-hub/sapphire-mongoose`
(the Mongoose adapter, formerly the workspace-local `sapphire-mongo`) and a new
`@ascendance-hub/sapphire-bson` for the native MongoDB driver, which emits
`$jsonSchema` collection validators via `toBsonSchema`.
