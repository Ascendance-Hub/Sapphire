# Website Timeline Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive "Timeline" tab to the Astro site (`website/`) that tells the story of Sapphire's development as a vertical, zig-zag timeline with collapsible seasons.

**Architecture:** Bilingual content lives in one typed data module (`timeline.ts`). A single Astro component (`Timeline.astro`) renders the vertical spine, with vanilla JS in a `<script>` for the collapse/expand behaviour. Two pages (en + pt-br) embed the component; the Nav gets a new link. Collapse only applies when JS is on, so the page degrades gracefully.

**Tech Stack:** Astro 5, TypeScript, Vitest. No new dependencies.

**Source spec:** `docs/superpowers/specs/2026-05-17-website-timeline-design.md`

**Working directory for all commands:** `website/` (run `cd website` first).

---

### Task 1: Timeline data module

A typed, bilingual data module holding every season and phase, plus a Vitest test asserting its integrity.

**Files:**

- Create: `website/src/data/timeline.ts`
- Test: `website/tests/timeline-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `website/tests/timeline-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { timeline } from '../src/data/timeline'
import { locales } from '../src/i18n/ui'

/** True when `v` is an object with a non-empty string for every locale. */
const isText = (v: unknown): boolean =>
  locales.every(
    (l) =>
      typeof (v as Record<string, unknown>)?.[l] === 'string' &&
      (v as Record<string, string>)[l].trim().length > 0,
  )

describe('timeline data', () => {
  it('has at least one season', () => {
    expect(timeline.length).toBeGreaterThan(0)
  })

  it('has a unique id for every season', () => {
    const ids = timeline.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a unique id for every phase across the whole timeline', () => {
    const ids = timeline.flatMap((s) => s.phases.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tags every season as era v1 or v2', () => {
    for (const s of timeline) expect(['v1', 'v2']).toContain(s.era)
  })

  it('orders all v1 seasons before all v2 seasons', () => {
    const eras = timeline.map((s) => s.era)
    const firstV2 = eras.indexOf('v2')
    if (firstV2 !== -1) expect(eras.slice(firstV2).every((e) => e === 'v2')).toBe(true)
  })

  it('has every locale for each season title, subtitle and tag', () => {
    for (const s of timeline) {
      expect(isText(s.title), `${s.id} title`).toBe(true)
      expect(isText(s.subtitle), `${s.id} subtitle`).toBe(true)
      expect(isText(s.tag), `${s.id} tag`).toBe(true)
    }
  })

  it('has every locale for each phase date, title, summary and detail', () => {
    for (const s of timeline) {
      for (const p of s.phases) {
        expect(isText(p.date), `${p.id} date`).toBe(true)
        expect(isText(p.title), `${p.id} title`).toBe(true)
        expect(isText(p.summary), `${p.id} summary`).toBe(true)
        expect(isText(p.detail), `${p.id} detail`).toBe(true)
      }
    }
  })

  it('marks every v2 season as future', () => {
    for (const s of timeline) {
      if (s.era === 'v2') expect(s.future).toBe(true)
    }
  })

  it('only ever flags a v2 season as a sketch', () => {
    for (const s of timeline) {
      if (s.sketch) expect(s.era).toBe('v2')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd website && npx vitest run tests/timeline-data.test.ts`
Expected: FAIL — `Failed to resolve import "../src/data/timeline"`.

- [ ] **Step 3: Create the data module**

Create `website/src/data/timeline.ts`:

```ts
import type { Locale } from '../i18n/ui'

/** A string in every supported locale. */
export type TLText = Record<Locale, string>

export interface TimelinePhase {
  id: string
  date: TLText
  title: TLText
  /** One line shown on the closed card. */
  summary: TLText
  /** Longer text revealed when the card is expanded. */
  detail: TLText
}

export interface TimelineSeason {
  id: string
  era: 'v1' | 'v2'
  /** v2 seasons render dashed/outlined as "future". */
  future?: boolean
  /** Roadmap sketch — rendered even fainter than a normal future season. */
  sketch?: boolean
  title: TLText
  subtitle: TLText
  /** The small chip beside the season title. */
  tag: TLText
  phases: TimelinePhase[]
}

export const timeline: TimelineSeason[] = [
  {
    id: 's1',
    era: 'v1',
    title: { en: 'Season One', 'pt-br': 'Season One' },
    subtitle: { en: 'The library is born', 'pt-br': 'A biblioteca nasce' },
    tag: { en: '15 phases · 2025–2026', 'pt-br': '15 fases · 2025–2026' },
    phases: [
      {
        id: 's1-p1',
        date: { en: 'May 2025', 'pt-br': 'mai 2025' },
        title: { en: 'Phase 1 · The concept', 'pt-br': 'Fase 1 · A concepção' },
        summary: {
          en: 'The "one schema, every ORM" idea is born.',
          'pt-br': 'Nasce a ideia "um schema, todos os ORMs".',
        },
        detail: {
          en: 'Sapphire starts as an idea: define a data shape once and emit a schema for every ORM. No code yet — just the problem and the goal.',
          'pt-br':
            'O Sapphire começa como uma ideia: definir o formato dos dados uma vez e gerar um schema para cada ORM. Ainda sem código — só o problema e o objetivo.',
        },
      },
      {
        id: 's1-p2',
        date: { en: 'May 2025', 'pt-br': 'mai 2025' },
        title: { en: 'Phase 2 · Raw prototype', 'pt-br': 'Fase 2 · Protótipo bruto' },
        summary: {
          en: 'A first version written by hand, with no architecture.',
          'pt-br': 'Uma primeira versão escrita à mão, sem arquitetura.',
        },
        detail: {
          en: 'The concept gets a first hand-written implementation — no real structure, just enough to show the one-schema idea could work.',
          'pt-br':
            'O conceito ganha uma primeira implementação feita à mão — sem estrutura de verdade, só o suficiente para mostrar que a ideia de um schema só podia funcionar.',
        },
      },
      {
        id: 's1-p3',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 3 · Multi-ORM refactor', 'pt-br': 'Fase 3 · Refatoração multi-ORM' },
        summary: {
          en: 'Fields become ORM-agnostic; adapters move behind a registry.',
          'pt-br': 'Os Fields ficam agnósticos de ORM; adapters vão para trás de um registry.',
        },
        detail: {
          en: 'An architectural refactor: fields no longer know about any ORM, and adapters are resolved by name through a registry. The project was still called "Ruby" at this point.',
          'pt-br':
            'Uma refatoração arquitetural: os fields deixam de conhecer qualquer ORM, e os adapters passam a ser resolvidos por nome através de um registry. O projeto ainda se chamava "Ruby" nesta fase.',
        },
      },
      {
        id: 's1-p4',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 4 · Immutable builder', 'pt-br': 'Fase 4 · Builder imutável' },
        summary: {
          en: 'The schema builder becomes immutable.',
          'pt-br': 'O builder de schema fica imutável.',
        },
        detail: {
          en: 'The builder API becomes immutable and TypeField is pulled out of type inference, making the inferred types tighter and more predictable.',
          'pt-br':
            'A API do builder fica imutável e o TypeField sai da inferência de tipos, deixando os tipos inferidos mais precisos e previsíveis.',
        },
      },
      {
        id: 's1-p5',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 5 · Release groundwork', 'pt-br': 'Fase 5 · Infra de release' },
        summary: {
          en: 'CI, linting, formatting and the package exports map.',
          'pt-br': 'CI, lint, formatação e o mapa de exports do pacote.',
        },
        detail: {
          en: 'Release plumbing: continuous integration, lint and formatting rules, the package exports map, and a prepublishOnly guard.',
          'pt-br':
            'Encanamento de release: integração contínua, regras de lint e formatação, o mapa de exports do pacote e uma proteção prepublishOnly.',
        },
      },
      {
        id: 's1-p6',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 6 · Monorepo', 'pt-br': 'Fase 6 · Monorepo' },
        summary: {
          en: 'The repo is restructured into a monorepo.',
          'pt-br': 'O repositório é reestruturado como monorepo.',
        },
        detail: {
          en: 'The codebase moves into a monorepo — packages/core and packages/mongo — with a dual ESM + CJS build.',
          'pt-br':
            'O código migra para um monorepo — packages/core e packages/mongo — com build dual ESM + CJS.',
        },
      },
      {
        id: 's1-p7',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 7 · Brand-types', 'pt-br': 'Fase 7 · Brand-types' },
        summary: {
          en: 'Field becomes a brand-type; Infer derives the TS type.',
          'pt-br': 'Field vira brand-type; Infer deriva o tipo TS.',
        },
        detail: {
          en: 'Field is reworked into a brand-type, and Infer derives a precise TypeScript type straight from the schema definition.',
          'pt-br':
            'O Field é reescrito como um brand-type, e o Infer deriva um tipo TypeScript preciso direto da definição do schema.',
        },
      },
      {
        id: 's1-p8',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 8 · Validation API', 'pt-br': 'Fase 8 · API de validação' },
        summary: {
          en: 'parse / safeParse with structured issues.',
          'pt-br': 'parse / safeParse com issues estruturadas.',
        },
        detail: {
          en: 'A real validation API lands: parse and safeParse, returning structured issues, with a message hierarchy for custom error text.',
          'pt-br':
            'Chega uma API de validação de verdade: parse e safeParse, devolvendo issues estruturadas, com uma hierarquia de mensagens para textos de erro customizados.',
        },
      },
      {
        id: 's1-p9',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: {
          en: 'Phase 9 · Modifier vocabulary',
          'pt-br': 'Fase 9 · Vocabulário de modifiers',
        },
        summary: {
          en: 'The full modifier set; the registry moves to string keys.',
          'pt-br': 'O conjunto completo de modifiers; o registry passa a usar texto.',
        },
        detail: {
          en: 'The full modifier vocabulary is completed, and the adapter registry moves from an ORM enum to string keys — opening the door to third-party adapters.',
          'pt-br':
            'O vocabulário completo de modifiers é finalizado, e o registry de adapters deixa de usar um enum de ORM para usar chaves de texto — abrindo caminho para adapters de terceiros.',
        },
      },
      {
        id: 's1-p10',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 10 · New field types', 'pt-br': 'Fase 10 · Novos field types' },
        summary: {
          en: 'tuple, literal, enum, record, ref — on a new IR.',
          'pt-br': 'tuple, literal, enum, record, ref — sobre uma nova IR.',
        },
        detail: {
          en: 'New field types — tuple, literal, enum, record and ref — plus a homogeneous ArrayField and a named-schema registry, built on a new intermediate representation.',
          'pt-br':
            'Novos field types — tuple, literal, enum, record e ref — além de um ArrayField homogêneo e um registry de schemas nomeados, construídos sobre uma nova representação intermediária.',
        },
      },
      {
        id: 's1-p11',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 11 · Object composition', 'pt-br': 'Fase 11 · Composição de objetos' },
        summary: {
          en: 'pick, omit, partial, extend, merge — plus schema options.',
          'pt-br': 'pick, omit, partial, extend, merge — e opções de schema.',
        },
        detail: {
          en: 'ObjectField gains composition operators — pick, omit, partial, required, extend, merge — plus schema-level options like timestamps and indexes.',
          'pt-br':
            'O ObjectField ganha operadores de composição — pick, omit, partial, required, extend, merge — além de opções no nível do schema, como timestamps e índices.',
        },
      },
      {
        id: 's1-p12',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 12 · Mongo adapter', 'pt-br': 'Fase 12 · Adapter Mongo' },
        summary: {
          en: 'The Mongo adapter is rewritten to honor the whole IR.',
          'pt-br': 'O adapter Mongo é reescrito para honrar toda a IR.',
        },
        detail: {
          en: 'The Mongo adapter is rewritten from the ground up so it honors every part of the intermediate representation.',
          'pt-br':
            'O adapter Mongo é reescrito do zero para honrar cada parte da representação intermediária.',
        },
      },
      {
        id: 's1-p13',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 13 · JSON Schema adapter', 'pt-br': 'Fase 13 · Adapter JSON Schema' },
        summary: {
          en: 'A new package: the IR becomes a JSON Schema document.',
          'pt-br': 'Um novo pacote: a IR vira um documento JSON Schema.',
        },
        detail: {
          en: 'A new package converts the Sapphire IR into a JSON Schema 2020-12 document.',
          'pt-br': 'Um novo pacote converte a IR do Sapphire em um documento JSON Schema 2020-12.',
        },
      },
      {
        id: 's1-p14',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 14 · Drizzle adapter', 'pt-br': 'Fase 14 · Adapter Drizzle' },
        summary: {
          en: 'A new package emits Drizzle table definitions.',
          'pt-br': 'Um novo pacote gera definições de tabela do Drizzle.',
        },
        detail: {
          en: 'A new package emits Drizzle table definitions — pgTable, mysqlTable and sqliteTable — from the IR.',
          'pt-br':
            'Um novo pacote gera definições de tabela do Drizzle — pgTable, mysqlTable e sqliteTable — a partir da IR.',
        },
      },
      {
        id: 's1-p15',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 15 · Documentation', 'pt-br': 'Fase 15 · Documentação' },
        summary: {
          en: 'Docs, runnable examples and a rewritten README.',
          'pt-br': 'Docs, exemplos executáveis e um README reescrito.',
        },
        detail: {
          en: 'No new runtime code — this phase produces /docs, runnable examples, a rewritten root README, and a docs check wired into CI.',
          'pt-br':
            'Sem código novo de runtime — esta fase produz /docs, exemplos executáveis, um README raiz reescrito e uma verificação de docs no CI.',
        },
      },
    ],
  },
  {
    id: 's2',
    era: 'v1',
    title: { en: 'Season Two', 'pt-br': 'Season Two' },
    subtitle: { en: 'Hardening before 1.0', 'pt-br': 'Endurecimento pré-1.0' },
    tag: { en: 'audits + fixes', 'pt-br': 'auditorias + correções' },
    phases: [
      {
        id: 's2-p1',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: 'Project audit', 'pt-br': 'Auditoria do projeto' },
        summary: {
          en: 'Design vs. real code; coverage, benchmarks and types.',
          'pt-br': 'Design vs. código real; cobertura, benchmarks e tipos.',
        },
        detail: {
          en: 'A pass comparing the V1 design and plan against the real code, plus a triple QA audit of test coverage, benchmarks, and type-level tests.',
          'pt-br':
            'Uma varredura comparando o design e o plano da V1 com o código real, além de uma auditoria tripla de QA: cobertura de testes, benchmarks e testes no nível de tipos.',
        },
      },
      {
        id: 's2-p2',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: 'Round of fixes', 'pt-br': 'Rodada de correções' },
        summary: {
          en: '6 bugs, 5 inconsistencies, 10 smells, 4 doc drifts.',
          'pt-br': '6 bugs, 5 inconsistências, 10 smells, 4 drifts de docs.',
        },
        detail: {
          en: 'Acting on a large code review: 6 correctness bugs, 5 API/IR inconsistencies, 10 code smells, and 4 documentation drifts.',
          'pt-br':
            'Agindo sobre um code review extenso: 6 bugs de correctness, 5 inconsistências de API/IR, 10 smells de código e 4 drifts de documentação.',
        },
      },
    ],
  },
  {
    id: 's3',
    era: 'v1',
    title: { en: 'Season Three', 'pt-br': 'Season Three' },
    subtitle: { en: 'More fixes', 'pt-br': 'Mais correções' },
    tag: { en: 'bugs · smells', 'pt-br': 'bugs · smells' },
    phases: [
      {
        id: 's3-p1',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: 'Post-merge fixes', 'pt-br': 'Correções pós-merge' },
        summary: {
          en: 'A second round of fixes on main after PR #16.',
          'pt-br': 'Uma segunda rodada de correções na main após o PR #16.',
        },
        detail: {
          en: 'A second round of bugs, inconsistencies and smells — the items the earlier passes left behind, cleaned up on main after PR #16.',
          'pt-br':
            'Uma segunda rodada de bugs, inconsistências e smells — os itens que as passagens anteriores deixaram para trás, resolvidos na main após o PR #16.',
        },
      },
    ],
  },
  {
    id: 's4',
    era: 'v1',
    title: { en: 'Season Four', 'pt-br': 'Season Four' },
    subtitle: { en: 'Splitting mongo / mongoose', 'pt-br': 'Separação mongo / mongoose' },
    tag: { en: '1 spec', 'pt-br': '1 spec' },
    phases: [
      {
        id: 's4-p1',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: 'Sub-library separation', 'pt-br': 'Separação de sub-libs' },
        summary: {
          en: 'Planning the sapphire-mongo / sapphire-mongoose split.',
          'pt-br': 'Planejamento da divisão sapphire-mongo / sapphire-mongoose.',
        },
        detail: {
          en: 'Planning the split of sapphire-mongo into a Mongo-native package and a separate sapphire-mongoose package.',
          'pt-br':
            'Planejamento da divisão do sapphire-mongo em um pacote nativo do Mongo e um pacote sapphire-mongoose separado.',
        },
      },
    ],
  },
  {
    id: 's5',
    era: 'v1',
    title: { en: 'Season Five', 'pt-br': 'Season Five' },
    subtitle: { en: 'Code review & 1.0', 'pt-br': 'Code review & 1.0' },
    tag: { en: 'npm', 'pt-br': 'npm' },
    phases: [
      {
        id: 's5-p1',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: 'Heavy code review', 'pt-br': 'Code review pesado' },
        summary: {
          en: 'A full review hunting bugs, inconsistencies and smells.',
          'pt-br': 'Uma revisão completa caçando bugs, inconsistências e smells.',
        },
        detail: {
          en: 'A heavy review of the whole library, hunting for bugs, inconsistencies and smells before going public.',
          'pt-br':
            'Uma revisão pesada de toda a biblioteca, caçando bugs, inconsistências e smells antes de ir a público.',
        },
      },
      {
        id: 's5-p2',
        date: { en: 'May 2026', 'pt-br': 'mai 2026' },
        title: { en: '1.0.0 release 🎉', 'pt-br': 'Lançamento 1.0.0 🎉' },
        summary: {
          en: 'npm-publish readiness — and the first stable release.',
          'pt-br': 'Prontidão para o npm — e o primeiro release estável.',
        },
        detail: {
          en: 'npm-publish readiness — changesets, packaging and release workflows — culminating in the 1.0.0 release.',
          'pt-br':
            'Prontidão para publicar no npm — changesets, packaging e workflows de release — culminando no lançamento 1.0.0.',
        },
      },
    ],
  },
  {
    id: 'v2s1',
    era: 'v2',
    future: true,
    title: { en: 'V2 · Season One', 'pt-br': 'V2 · Season One' },
    subtitle: { en: 'Complete validation', 'pt-br': 'Validação completa' },
    tag: { en: 'planned', 'pt-br': 'planejado' },
    phases: [
      {
        id: 'v2s1-p1',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Phase 1 · refine', 'pt-br': 'Fase 1 · refine' },
        summary: {
          en: 'Custom sync validation — single-field and cross-field.',
          'pt-br': 'Validação custom síncrona — por campo e cross-field.',
        },
        detail: {
          en: 'refine adds custom synchronous validation — arbitrary single-field predicates and cross-field rules — expressed inside the one schema.',
          'pt-br':
            'O refine adiciona validação custom síncrona — predicados arbitrários por campo e regras cross-field — expressos dentro do mesmo schema.',
        },
      },
      {
        id: 'v2s1-p2',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Phase 2 · Async validation', 'pt-br': 'Fase 2 · Validação assíncrona' },
        summary: {
          en: 'Async refine plus parseAsync / safeParseAsync.',
          'pt-br': 'refine assíncrono mais parseAsync / safeParseAsync.',
        },
        detail: {
          en: 'Async refine plus parseAsync / safeParseAsync, for rules that need to hit a database — uniqueness, existence.',
          'pt-br':
            'refine assíncrono mais parseAsync / safeParseAsync, para regras que precisam consultar o banco — unicidade, existência.',
        },
      },
      {
        id: 'v2s1-p3',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Phase 3 · llms.txt', 'pt-br': 'Fase 3 · llms.txt' },
        summary: {
          en: 'llms.txt and a Context7 listing for AI assistants.',
          'pt-br': 'llms.txt e uma listagem no Context7 para assistentes de IA.',
        },
        detail: {
          en: 'llms.txt and llms-full.txt, plus a Context7 listing, so AI coding assistants generate correct Sapphire code instead of guessing the API.',
          'pt-br':
            'llms.txt e llms-full.txt, além de uma listagem no Context7, para que assistentes de IA gerem código Sapphire correto em vez de adivinhar a API.',
        },
      },
      {
        id: 'v2s1-p4',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Phase 4 · Polish', 'pt-br': 'Fase 4 · Polish' },
        summary: {
          en: 'Clearing the code-review backlog + a MySQL CI test.',
          'pt-br': 'Limpar o backlog do code-review + um teste MySQL no CI.',
        },
        detail: {
          en: 'Clearing the leftover code-review backlog and adding a real-MySQL integration test to CI.',
          'pt-br':
            'Limpar o backlog restante do code-review e adicionar um teste de integração com MySQL real no CI.',
        },
      },
    ],
  },
  {
    id: 'v2s2',
    era: 'v2',
    future: true,
    sketch: true,
    title: { en: 'V2 · Season Two', 'pt-br': 'V2 · Season Two' },
    subtitle: { en: 'Adapter DX', 'pt-br': 'Adapter DX' },
    tag: { en: 'sketch', 'pt-br': 'esboço' },
    phases: [
      {
        id: 'v2s2-p1',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Adapter DX', 'pt-br': 'Adapter DX' },
        summary: {
          en: 'A typed .adapter() and mock-data generation.',
          'pt-br': 'Um .adapter() tipado e geração de mock data.',
        },
        detail: {
          en: 'A typed .adapter() via module augmentation, and mock-data generation from a schema. A sketch — not yet planned in detail.',
          'pt-br':
            'Um .adapter() tipado via module augmentation, e geração de mock data a partir de um schema. Um esboço — ainda não planejado em detalhe.',
        },
      },
    ],
  },
  {
    id: 'v2s3',
    era: 'v2',
    future: true,
    sketch: true,
    title: { en: 'V2 · Season Three', 'pt-br': 'V2 · Season Three' },
    subtitle: { en: 'Prisma adapter', 'pt-br': 'Adapter Prisma' },
    tag: { en: 'sketch', 'pt-br': 'esboço' },
    phases: [
      {
        id: 'v2s3-p1',
        date: { en: 'Planned', 'pt-br': 'futuro' },
        title: { en: 'Prisma adapter', 'pt-br': 'Adapter Prisma' },
        summary: {
          en: 'A fifth adapter emitting a .prisma schema.',
          'pt-br': 'Um quinto adapter gerando um schema .prisma.',
        },
        detail: {
          en: 'A fifth adapter, sapphire-prisma, emitting a .prisma schema — a text DSL, unlike the runtime-object output of the other four. A sketch.',
          'pt-br':
            'Um quinto adapter, sapphire-prisma, gerando um schema .prisma — uma DSL de texto, diferente da saída em objeto de runtime dos outros quatro. Um esboço.',
        },
      },
    ],
  },
]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd website && npx vitest run tests/timeline-data.test.ts`
Expected: PASS — 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add website/src/data/timeline.ts website/tests/timeline-data.test.ts
git commit -m "feat(website): add timeline data module"
```

---

### Task 2: i18n chrome strings

Add the navigation/page strings the timeline UI needs. Content text already lives in `timeline.ts`; only chrome goes here.

**Files:**

- Modify: `website/src/i18n/ui.ts`

- [ ] **Step 1: Add the keys to the `en` block**

In `website/src/i18n/ui.ts`, inside the `en: { ... }` object, after the line `'nav.playground': 'Playground',` add:

```ts
    'nav.timeline': 'Timeline',
```

Then, after the line `'playground.intro':` (and its string value), add:

```ts
    'timeline.title': 'Timeline',
    'timeline.intro': 'How Sapphire was built — from the first idea to 1.0 and beyond.',
    'timeline.hintSeason': 'Click a season to open its phases',
    'timeline.hintPhase': 'click a phase for details',
```

Then, after the line `'title.playground': 'Sapphire — playground',` add:

```ts
    'title.timeline': 'Sapphire — timeline',
```

- [ ] **Step 2: Add the same keys to the `'pt-br'` block**

In the `'pt-br': { ... }` object, after its `'nav.playground': 'Playground',` line add:

```ts
    'nav.timeline': 'Timeline',
```

After its `'playground.intro':` line add:

```ts
    'timeline.title': 'Linha do tempo',
    'timeline.intro': 'Como o Sapphire foi construído — da primeira ideia até o 1.0 e além.',
    'timeline.hintSeason': 'Clique numa temporada para abrir as fases',
    'timeline.hintPhase': 'clique numa fase para ver os detalhes',
```

After its `'title.playground': 'Sapphire — playground',` line add:

```ts
    'title.timeline': 'Sapphire — linha do tempo',
```

- [ ] **Step 3: Type-check**

Run: `cd website && npm run check`
Expected: no new errors (`UIKey` now includes the timeline keys for both locales).

- [ ] **Step 4: Commit**

```bash
git add website/src/i18n/ui.ts
git commit -m "feat(website): add timeline i18n strings"
```

---

### Task 3: Timeline component

The component that renders the vertical zig-zag spine, with collapse/expand JS.

**Files:**

- Create: `website/src/components/Timeline.astro`

- [ ] **Step 1: Create the component**

Create `website/src/components/Timeline.astro`:

```astro
---
import { timeline } from '../data/timeline'
import { useTranslations, asLocale } from '../i18n/ui'

const locale = asLocale(Astro.currentLocale)
const t = useTranslations(locale)
---

<script is:inline>
  // Runs during parse, before the timeline paints — JS users never see a
  // flash of the no-JS fallback (everything expanded).
  document.documentElement.classList.add('tl-js')
</script>

<div class="tl">
  <p class="tl-hint">
    <kbd>{t('timeline.hintSeason')}</kbd>
    <span class="tl-hint-sep"> · </span>
    <kbd>{t('timeline.hintPhase')}</kbd>
  </p>

  {
    timeline.map((season, si) => (
      <section
        class:list={['tl-season', { open: si === 0, sketch: Boolean(season.sketch) }]}
        data-era={season.era}
      >
        <button
          type="button"
          class="tl-season-head"
          data-season-toggle
          aria-expanded={si === 0 ? 'true' : 'false'}
        >
          <span class="tl-chev" aria-hidden="true">▸</span>
          <span class="tl-season-name">{season.title[locale]}</span>
          <span class="tl-season-sub">{season.subtitle[locale]}</span>
          <span class="tl-season-tag">{season.tag[locale]}</span>
        </button>

        <div class="tl-phases">
          {season.phases.map((phase, pi) => (
            <div class:list={['tl-row', pi % 2 === 0 ? 'right' : 'left']}>
              <div class="tl-spine">
                <span class="tl-dot" />
              </div>
              <button type="button" class="tl-card" data-phase-toggle aria-expanded="false">
                <span class="tl-card-date">{phase.date[locale]}</span>
                <span class="tl-card-title">{phase.title[locale]}</span>
                <span class="tl-card-summary">{phase.summary[locale]}</span>
                <span class="tl-detail">{phase.detail[locale]}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    ))
  }
</div>

<script>
  // Season headers open/close their phase list; phase cards open/close their
  // detail. Native <button> elements give Enter/Space keyboard support free.
  document.querySelectorAll('[data-season-toggle]').forEach((head) => {
    head.addEventListener('click', () => {
      const season = head.closest('.tl-season')
      if (!season) return
      const open = season.classList.toggle('open')
      head.setAttribute('aria-expanded', String(open))
    })
  })
  document.querySelectorAll('[data-phase-toggle]').forEach((card) => {
    card.addEventListener('click', () => {
      const open = card.getAttribute('aria-expanded') !== 'true'
      card.setAttribute('aria-expanded', String(open))
    })
  })
</script>

<style>
  .tl {
    max-width: 760px;
    margin: 0 auto;
  }

  .tl-hint {
    text-align: center;
    font-size: 12px;
    color: var(--ink-400);
    margin: 0 0 22px;
  }
  .tl-hint kbd {
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--sapphire-600);
  }

  /* ---- season header ---- */
  .tl-season {
    position: relative;
  }
  .tl-season-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 14px auto;
    padding: 9px 18px;
    background: var(--sapphire-600);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(47, 127, 214, 0.26);
  }
  .tl-season-sub {
    font-weight: 500;
    opacity: 0.92;
  }
  .tl-season-tag {
    background: rgba(255, 255, 255, 0.22);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .tl-chev {
    font-size: 11px;
  }

  /* v2 seasons read as "future": outlined + dashed instead of solid */
  .tl-season[data-era='v2'] .tl-season-head {
    background: #fff;
    color: var(--sapphire-900);
    border: 2px dashed var(--sapphire-600);
    box-shadow: none;
  }
  .tl-season[data-era='v2'] .tl-season-tag {
    background: #e9f1fb;
    color: var(--sapphire-600);
  }
  .tl-season.sketch .tl-season-head {
    opacity: 0.7;
  }

  /* ---- phases / spine ---- */
  .tl-phases {
    padding: 2px 0 8px;
  }
  .tl-row {
    display: grid;
    grid-template-columns: 1fr 50px 1fr;
  }
  .tl-spine {
    grid-column: 2;
    position: relative;
  }
  .tl-spine::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 3px;
    transform: translateX(-50%);
    background: #cdd9e6;
  }
  .tl-dot {
    position: absolute;
    left: 50%;
    top: 22px;
    width: 14px;
    height: 14px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--sapphire-600);
  }
  .tl-season[data-era='v2'] .tl-dot {
    border-color: #9bbfe3;
  }

  .tl-card {
    display: block;
    align-self: start;
    width: 100%;
    margin: 12px 0;
    padding: 10px 13px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 9px;
    cursor: pointer;
    font-family: var(--font-sans);
    text-align: left;
  }
  .tl-row.right .tl-card {
    grid-column: 3;
  }
  .tl-row.left .tl-card {
    grid-column: 1;
    text-align: right;
  }
  .tl-card:hover {
    border-color: var(--sapphire-600);
  }
  .tl-card[aria-expanded='true'] {
    border-color: var(--sapphire-600);
    box-shadow: 0 4px 14px rgba(47, 127, 214, 0.16);
  }
  .tl-card-date {
    display: block;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-400);
  }
  .tl-card-title {
    display: block;
    margin-top: 2px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink-900);
  }
  .tl-card-summary {
    display: block;
    margin-top: 3px;
    font-size: 12.5px;
    color: var(--ink-600);
  }
  .tl-detail {
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
    font-size: 12px;
    line-height: 1.55;
    color: var(--ink-600);
    text-align: left;
  }

  /* ---- collapse behaviour: applies only when JS is on ---- */
  .tl-js .tl-season:not(.open) .tl-phases {
    display: none;
  }
  .tl-js .tl-card[aria-expanded='false'] .tl-detail {
    display: none;
  }

  /* the chevron's rotated state is a status indicator, so it applies even
     with reduced motion — only the transition itself is motion-gated */
  .tl-season.open .tl-chev {
    transform: rotate(90deg);
  }
  @media (prefers-reduced-motion: no-preference) {
    .tl-chev {
      transition: transform 0.2s ease;
    }
    .tl-js .tl-season.open .tl-phases {
      animation: tl-fade 0.25s ease;
    }
    .tl-js .tl-card[aria-expanded='true'] .tl-detail {
      animation: tl-fade 0.2s ease;
    }
  }
  @keyframes tl-fade {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* ---- mobile: single column, spine on the left ---- */
  @media (max-width: 560px) {
    .tl-row {
      grid-template-columns: 32px 1fr;
    }
    .tl-spine {
      grid-column: 1;
    }
    .tl-row.right .tl-card,
    .tl-row.left .tl-card {
      grid-column: 2;
      text-align: left;
    }
    .tl-season-head {
      flex-wrap: wrap;
      font-size: 13px;
    }
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `cd website && npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/Timeline.astro
git commit -m "feat(website): add Timeline component"
```

---

### Task 4: Timeline pages (en + pt-br)

Two pages embedding the component — mirrors the `playground.astro` page pattern exactly.

**Files:**

- Create: `website/src/pages/timeline.astro`
- Create: `website/src/pages/pt-br/timeline.astro`

- [ ] **Step 1: Create the English page**

Create `website/src/pages/timeline.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro'
import Timeline from '../components/Timeline.astro'
import { useTranslations } from '../i18n/ui'
const t = useTranslations('en')
---

<BaseLayout title={t('title.timeline')}>
  <section class="tl-page">
    <h1>{t('timeline.title')}</h1>
    <p>{t('timeline.intro')}</p>
    <Timeline />
  </section>
  <style>
    .tl-page {
      max-width: var(--maxw);
      margin: 0 auto;
      padding: 36px 22px;
    }
    .tl-page h1 {
      margin: 0 0 4px;
    }
    .tl-page p {
      color: var(--ink-600);
      margin: 0 0 26px;
    }
  </style>
</BaseLayout>
```

- [ ] **Step 2: Create the Portuguese page**

Create `website/src/pages/pt-br/timeline.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro'
import Timeline from '../../components/Timeline.astro'
import { useTranslations } from '../../i18n/ui'
const t = useTranslations('pt-br')
---

<BaseLayout title={t('title.timeline')}>
  <section class="tl-page">
    <h1>{t('timeline.title')}</h1>
    <p>{t('timeline.intro')}</p>
    <Timeline />
  </section>
  <style>
    .tl-page {
      max-width: var(--maxw);
      margin: 0 auto;
      padding: 36px 22px;
    }
    .tl-page h1 {
      margin: 0 0 4px;
    }
    .tl-page p {
      color: var(--ink-600);
      margin: 0 0 26px;
    }
  </style>
</BaseLayout>
```

- [ ] **Step 3: Type-check**

Run: `cd website && npm run check`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/pages/timeline.astro website/src/pages/pt-br/timeline.astro
git commit -m "feat(website): add timeline pages"
```

---

### Task 5: Nav link

Add the "Timeline" link to the navigation, between Docs and Playground.

**Files:**

- Modify: `website/src/components/Nav.astro`

- [ ] **Step 1: Add the link**

In `website/src/components/Nav.astro`, find:

```astro
    <a href={`${prefix}/docs`}>{t('nav.docs')}</a>
    <a href={`${prefix}/playground`}>{t('nav.playground')}</a>
```

Replace it with:

```astro
    <a href={`${prefix}/docs`}>{t('nav.docs')}</a>
    <a href={`${prefix}/timeline`}>{t('nav.timeline')}</a>
    <a href={`${prefix}/playground`}>{t('nav.playground')}</a>
```

- [ ] **Step 2: Type-check**

Run: `cd website && npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/Nav.astro
git commit -m "feat(website): link Timeline in the nav"
```

---

### Task 6: Full verification

No code changes — confirm the whole feature builds and behaves.

- [ ] **Step 1: Run the build**

Run: `cd website && npm run build`
Expected: build succeeds; output lists `timeline/index.html` and `pt-br/timeline/index.html`.

- [ ] **Step 2: Run the test suite**

Run: `cd website && npm test`
Expected: all tests pass, including `timeline-data.test.ts`.

- [ ] **Step 3: Manual check in the dev server**

Run: `cd website && npm run dev`, then in a browser verify:

- `/Sapphire/timeline` and `/Sapphire/pt-br/timeline` render; the Nav "Timeline" link works in both locales.
- Season One starts open; other seasons start closed.
- Clicking a season header toggles its phases; clicking a phase card toggles its detail.
- `Tab` reaches the headers/cards and `Enter` / `Space` toggles them.
- With JavaScript disabled (DevTools → Settings → Debugger → Disable JavaScript), every season and detail is visible.
- At 360px width the layout is a single column with the spine on the left and does not overflow.

- [ ] **Step 4: Stop the dev server**

Press `Ctrl+C`. No commit needed — verification only.

---

## Self-Review

Checked against `docs/superpowers/specs/2026-05-17-website-timeline-design.md`:

- **Spec §1 (page & nav):** Tasks 4 (pages) and 5 (nav link) — covered. i18n keys in Task 2.
- **Spec §2 (data model):** Task 1 — `timeline.ts` matches the spec's interface (`era`, `future`, `sketch`, `TLText`).
- **Spec §3 (component & interactivity):** Task 3 — `is:inline` `tl-js` guard, `<button>` toggles, Season One open by default, `prefers-reduced-motion` gating, no-JS fallback.
- **Spec §4 (layout & style):** Task 3 `<style>` — zig-zag grid, token-only colors, dashed v2, 560px single-column.
- **Spec §5 (content):** Task 1 data — all 15 Season One phases, condensed Seasons Two–Five, V2 Season One (4 phases), V2 Seasons Two–Three sketches.
- **Spec §6 (verification):** Task 6 covers build, check, the toggles, keyboard, no-JS, and 360px.
- **Placeholder scan:** none — every step has full file content or an exact edit.
- **Type consistency:** `TLText`/`TimelinePhase`/`TimelineSeason` defined in Task 1 are used consistently; the component reads `season.title[locale]`, `phase.date[locale]` etc. against those types; `data-season-toggle`/`data-phase-toggle`/`tl-js`/`.open` hooks match between the component markup, its script, and its CSS.
