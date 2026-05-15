---
'@ascendance-hub/sapphire-mongo': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Split the Mongo adapter into two packages: `@ascendance-hub/sapphire-mongoose`
(the Mongoose adapter, formerly published as `sapphire-mongo`) and a new
`@ascendance-hub/sapphire-mongo` for the native MongoDB driver, which emits
`$jsonSchema` collection validators via `toMongoValidator`.
