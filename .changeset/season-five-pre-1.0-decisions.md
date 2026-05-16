---
'@ascendance-hub/sapphire-core': minor
'@ascendance-hub/sapphire-mongoose': minor
---

season-five — pre-1.0 API decisions (S1, S2, S5, I4).

These lock public-API behaviour ahead of a stable 1.0. See
`docs/superpowers/specs/2026-05-16-pre-1.0-api-decisions-design.md`.

**S2 — absent optional keys are omitted from parse output.** Previously an
optional key absent from the input still appeared in the output as
`undefined`. It is now omitted, matching Zod and the `Infer` type. A key
passed explicitly as `undefined`, or one filled by a `default`, is kept.

**S5 — `.url()` defaults to http/https, with a configurable protocol list.**
`.url()` validated with `new URL()`, accepting any scheme (`javascript:`,
`file:`, `mailto:`…). It now accepts only `http`/`https` by default;
`.url({ protocols: [...] })` widens or narrows the set. The IR string node
carries the resolved `urlProtocols`; the Mongoose adapter honours it. Core
exports `isUrl` and `DEFAULT_URL_PROTOCOLS`.

**I4 — removed the dead `SapphireSchemaNode.message` field.** It was declared
on the public IR type but never emitted by `toSchema()`.

**S1 — the adapter registry stays process-global** (documented, no code
change): adapters are registered once at application startup.
