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
          'pt-br': 'O Sapphire começa como uma ideia: definir o formato dos dados uma vez e gerar um schema para cada ORM. Ainda sem código — só o problema e o objetivo.',
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
          'pt-br': 'O conceito ganha uma primeira implementação feita à mão — sem estrutura de verdade, só o suficiente para mostrar que a ideia de um schema só podia funcionar.',
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
          'pt-br': 'Uma refatoração arquitetural: os fields deixam de conhecer qualquer ORM, e os adapters passam a ser resolvidos por nome através de um registry. O projeto ainda se chamava "Ruby" nesta fase.',
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
          'pt-br': 'A API do builder fica imutável e o TypeField sai da inferência de tipos, deixando os tipos inferidos mais precisos e previsíveis.',
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
          'pt-br': 'Encanamento de release: integração contínua, regras de lint e formatação, o mapa de exports do pacote e uma proteção prepublishOnly.',
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
          'pt-br': 'O código migra para um monorepo — packages/core e packages/mongo — com build dual ESM + CJS.',
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
          'pt-br': 'O Field é reescrito como um brand-type, e o Infer deriva um tipo TypeScript preciso direto da definição do schema.',
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
          'pt-br': 'Chega uma API de validação de verdade: parse e safeParse, devolvendo issues estruturadas, com uma hierarquia de mensagens para textos de erro customizados.',
        },
      },
      {
        id: 's1-p9',
        date: { en: 'Apr 2026', 'pt-br': 'abr 2026' },
        title: { en: 'Phase 9 · Modifier vocabulary', 'pt-br': 'Fase 9 · Vocabulário de modifiers' },
        summary: {
          en: 'The full modifier set; the registry moves to string keys.',
          'pt-br': 'O conjunto completo de modifiers; o registry passa a usar texto.',
        },
        detail: {
          en: 'The full modifier vocabulary is completed, and the adapter registry moves from an ORM enum to string keys — opening the door to third-party adapters.',
          'pt-br': 'O vocabulário completo de modifiers é finalizado, e o registry de adapters deixa de usar um enum de ORM para usar chaves de texto — abrindo caminho para adapters de terceiros.',
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
          'pt-br': 'Novos field types — tuple, literal, enum, record e ref — além de um ArrayField homogêneo e um registry de schemas nomeados, construídos sobre uma nova representação intermediária.',
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
          'pt-br': 'O ObjectField ganha operadores de composição — pick, omit, partial, required, extend, merge — além de opções no nível do schema, como timestamps e índices.',
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
          'pt-br': 'O adapter Mongo é reescrito do zero para honrar cada parte da representação intermediária.',
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
          'pt-br': 'Um novo pacote gera definições de tabela do Drizzle — pgTable, mysqlTable e sqliteTable — a partir da IR.',
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
          'pt-br': 'Sem código novo de runtime — esta fase produz /docs, exemplos executáveis, um README raiz reescrito e uma verificação de docs no CI.',
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
          'pt-br': 'Uma varredura comparando o design e o plano da V1 com o código real, além de uma auditoria tripla de QA: cobertura de testes, benchmarks e testes no nível de tipos.',
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
          'pt-br': 'Agindo sobre um code review extenso: 6 bugs de correctness, 5 inconsistências de API/IR, 10 smells de código e 4 drifts de documentação.',
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
          'pt-br': 'Uma segunda rodada de bugs, inconsistências e smells — os itens que as passagens anteriores deixaram para trás, resolvidos na main após o PR #16.',
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
          'pt-br': 'Planejamento da divisão do sapphire-mongo em um pacote nativo do Mongo e um pacote sapphire-mongoose separado.',
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
          'pt-br': 'Uma revisão pesada de toda a biblioteca, caçando bugs, inconsistências e smells antes de ir a público.',
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
          'pt-br': 'Prontidão para publicar no npm — changesets, packaging e workflows de release — culminando no lançamento 1.0.0.',
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
          'pt-br': 'O refine adiciona validação custom síncrona — predicados arbitrários por campo e regras cross-field — expressos dentro do mesmo schema.',
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
          'pt-br': 'refine assíncrono mais parseAsync / safeParseAsync, para regras que precisam consultar o banco — unicidade, existência.',
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
          'pt-br': 'llms.txt e llms-full.txt, além de uma listagem no Context7, para que assistentes de IA gerem código Sapphire correto em vez de adivinhar a API.',
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
          'pt-br': 'Limpar o backlog restante do code-review e adicionar um teste de integração com MySQL real no CI.',
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
          'pt-br': 'Um .adapter() tipado via module augmentation, e geração de mock data a partir de um schema. Um esboço — ainda não planejado em detalhe.',
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
          'pt-br': 'Um quinto adapter, sapphire-prisma, gerando um schema .prisma — uma DSL de texto, diferente da saída em objeto de runtime dos outros quatro. Um esboço.',
        },
      },
    ],
  },
]
