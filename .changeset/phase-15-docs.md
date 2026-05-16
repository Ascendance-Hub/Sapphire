---
'@ascendance-hub/sapphire-core': patch
'@ascendance-hub/sapphire-mongoose': patch
'@ascendance-hub/sapphire-json-schema': patch
'@ascendance-hub/sapphire-drizzle': patch
---

Fase 15 — Documentação completa.

Adiciona `/docs` com a estrutura completa de V1_DESIGN §11.2:

- **Getting Started** — install, primeiro schema, parse/safeParse, primeiro adapter.
- **Concepts (11 arquivos)** — overview, fields-and-modifiers, inferring-types,
  composition, unions-literals-enums, tuples-vs-arrays, refs-and-relations,
  nullable-vs-optional, validation, config, escape-hatch. Cada um cumpre o
  quality bar §11.3 (paragraph summary + runnable example + full API ref +
  ≥1 pitfall callout + recipe links).
- **Adapters (3 arquivos)** — long-form docs expandindo READMEs dos pacotes,
  com mapping tables completas (12 IR kinds → output, com caveats), escape
  hatch keys, e known limitations.
- **Recipes (6 arquivos)** — form-validation, share-types-with-frontend,
  one-schema-many-adapters, custom-adapter, custom-error-messages,
  migrating-from-zod. Estrutura uniforme: use case → end-to-end example →
  step-by-step → variations → see also.
- **Meta (3 arquivos)** — architecture (com mermaid diagram), design-decisions
  (versão user-facing de V1_DESIGN), contributing (7-step third-party adapter
  guide + repo setup + PR checklist).

Root `README.md` reescrito em inglês como entry point — pitch, install,
30-line quickstart, links pra `/docs`, packages table.

**Snippet drift guard**: 11 novos arquivos em
`packages/core/tests/docs-examples/` pinam todos os code blocks dos
concepts. Vitest verifica que compilam e batem com a API real — qualquer
drift quebra CI.

Sem mudanças de runtime nos pacotes — bump patch só pra propagar o release
de docs no grupo fixed.
