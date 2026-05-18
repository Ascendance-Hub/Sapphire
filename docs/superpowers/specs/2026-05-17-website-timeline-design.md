# Design — Aba "Timeline" interativa no site

Data: 2026-05-17 · Status: aprovado para planejamento

## Objetivo

Adicionar uma aba **Timeline** ao site (`website/`) que conta a história do
desenvolvimento do Sapphire — da concepção da ideia ao lançamento `1.0.0` e ao
roadmap V2. A timeline é **vertical, em zigue-zague**, com temporadas que
**abrem e fecham**, para que percorrê-la não seja exaustivo.

Não-objetivos: gerar o conteúdo automaticamente a partir de `specs/` (o recorte
é curado à mão) e mostrar cada rodada de correção individual (bugs/smells/
inconsistências entram condensados).

## 1. Página e navegação

- Nova página `website/src/pages/timeline.astro` (en) e
  `website/src/pages/pt-br/timeline.astro` (pt-br). Cada uma espelha a
  estrutura de `playground.astro`: `BaseLayout` → `<section>` com `<h1>`,
  parágrafo de intro e o componente `<Timeline />`.
- `website/src/components/Nav.astro` ganha um link **"Timeline"** entre
  _Docs_ e _Playground_.
- Novas chaves em `website/src/i18n/ui.ts` (chrome, não conteúdo):
  `nav.timeline`, `title.timeline`, `timeline.title`, `timeline.intro`,
  `timeline.hintSeason`, `timeline.hintPhase`.

## 2. Modelo de dados — `website/src/data/timeline.ts`

Arquivo único, tipado e bilíngue. O texto de conteúdo (fases) mora aqui; o
`ui.ts` segue apenas com strings de chrome.

```ts
import type { Locale } from '../i18n/ui'

/** Um texto em cada locale suportado. */
type TLText = Record<Locale, string>

interface TimelinePhase {
  id: string // estável, ex. 's1-p3'
  date: TLText // ex. { en: 'Apr 2026', 'pt-br': 'abr 2026' }
  title: TLText
  summary: TLText // linha exibida no card fechado
  detail: TLText // texto revelado ao expandir o card
}

interface TimelineSeason {
  id: string // ex. 's1', 'v2-s1'
  era: 'v1' | 'v2'
  title: TLText
  subtitle: TLText // a frase curta ao lado do título
  tag: TLText // o "chip" pequeno (ex. '15 fases · 2026')
  future?: boolean // true → estilo tracejado/esmaecido
  sketch?: boolean // true → esboço (V2 Seasons Two–Three)
  phases: TimelinePhase[]
}

export const timeline: TimelineSeason[]
```

`en` é a fonte de verdade do site (igual ao `ui.ts`); `pt-br` espelha. A tabela
de conteúdo da §5 está em pt-br para revisão — o `en` é escrito espelhando-a na
implementação.

## 3. Componente e interatividade — `Timeline.astro`

- `Timeline.astro` recebe o locale via `Astro.currentLocale`, importa
  `timeline` e renderiza a espinha vertical.
- **Estrutura de uma temporada**: um cabeçalho `<button data-season-toggle>`
  (acessível, `aria-expanded`) que controla um contêiner `<div role="region">`
  com as fases.
- **Estrutura de uma fase**: card com `<button data-phase-toggle>`
  (`aria-expanded`) que revela/esconde o bloco `detail`.
- **JS**: um único `<script>` vanilla no componente — sem framework, igual ao
  padrão de `Nav.astro` e `Playground.astro`. Ele alterna a classe `.open` e o
  `aria-expanded` nos cliques.
- **Estado inicial**: Season One aberta, demais temporadas fechadas. Cards de
  fase começam fechados.
- **Progressive enhancement (sem FOUC)**: um script inline no `<head>` adiciona
  `class="js"` ao `<html>` imediatamente. O CSS só esconde conteúdo de seções
  fechadas quando `.js` está presente (`.js .season:not(.open) .phases { display: none }`).
  Sem JS, tudo renderiza expandido e continua acessível.
- **Movimento**: transições de abrir/fechar ficam sob
  `@media (prefers-reduced-motion: no-preference)`.

## 4. Layout e estilo

- Espinha vertical central; cabeçalhos de temporada centrados sobre a espinha;
  cards de fase alternam esquerda/direita (zigue-zague).
- Usa só os tokens de `website/src/styles/tokens.css` — nenhum token novo.
  V1 em azul-safira sólido (`--sapphire-600`); V2 com borda tracejada e tom
  esmaecido; esboços (V2 S2–S3) ainda mais tênues.
- Estilo escopado no `<style>` do componente, no mesmo espírito visual de
  `FeatureRow.astro`.
- **Responsivo**: no breakpoint `max-width: 560px` (o mesmo do `Nav.astro`) a
  timeline vira coluna única — espinha à esquerda, todos os cards de um lado só,
  sem zigue-zague.

## 5. Conteúdo da timeline

Recorte curado. Texto abaixo em pt-br; o `en` espelha. `detail` é redigido na
implementação a partir das `specs/` citadas.

### V1 — concluído

**Season One — "A biblioteca nasce"** · tag: `15 fases · 2025–2026`

| id     | data     | título                   | summary                                                                                         |
| ------ | -------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| s1-p1  | mai 2025 | Concepção da ideia       | O conceito "um schema, todos os ORMs" nasce.                                                    |
| s1-p2  | mai 2025 | Protótipo bruto          | Primeira versão escrita à mão, sem arquitetura.                                                 |
| s1-p3  | abr 2026 | Refatoração multi-ORM    | Fields agnósticos de ORM, adapters atrás de um registry. O projeto ainda se chamava **"Ruby"**. |
| s1-p4  | abr 2026 | Builder imutável         | Builder imutável; `TypeField` sai da inferência.                                                |
| s1-p5  | abr 2026 | Infra de release         | CI, lint/format, exports map, `prepublishOnly`.                                                 |
| s1-p6  | abr 2026 | Monorepo                 | Reestruturação em `packages/{core,mongo}`, build dual.                                          |
| s1-p7  | abr 2026 | Brand-types              | `Field` vira brand-type; `Infer` derivado do schema.                                            |
| s1-p8  | abr 2026 | API de validação         | `parse`/`safeParse`, issues estruturadas, hierarquia de mensagens.                              |
| s1-p9  | abr 2026 | Vocabulário de modifiers | Modifiers completos; registry passa a string-keyed.                                             |
| s1-p10 | abr 2026 | Novos field types        | `tuple`/`literal`/`enum`/`record`/`ref` + IR v2.                                                |
| s1-p11 | abr 2026 | Composição de objetos    | `pick`/`omit`/`partial`/`extend`/`merge` + `timestamps`/`index`.                                |
| s1-p12 | abr 2026 | Adapter Mongo            | Reescrita do adapter Mongo para honrar todo o IR.                                               |
| s1-p13 | abr 2026 | Adapter JSON Schema      | Novo pacote: IR → JSON Schema 2020-12.                                                          |
| s1-p14 | abr 2026 | Adapter Drizzle          | Novo pacote: IR → `pgTable`/`mysqlTable`/`sqliteTable`.                                         |
| s1-p15 | abr 2026 | Documentação             | `/docs`, exemplos executáveis, README, verificação no CI.                                       |

**Season Two — "Endurecimento pré-1.0"** · tag: `auditoria + correções`

| id    | data     | título               | summary                                                          |
| ----- | -------- | -------------------- | ---------------------------------------------------------------- |
| s2-p1 | mai 2026 | Auditoria do projeto | Design vs. código real; cobertura de testes, benchmarks e tipos. |
| s2-p2 | mai 2026 | Rodada de correções  | 6 bugs, 5 inconsistências, 10 smells e 4 drifts de docs.         |

**Season Three — "Mais correções"** · tag: `bugs · smells`

| id    | data     | título              | summary                                                         |
| ----- | -------- | ------------------- | --------------------------------------------------------------- |
| s3-p1 | mai 2026 | Correções pós-merge | Segunda rodada de bugs, inconsistências e smells após o PR #16. |

**Season Four — "Separação mongo / mongoose"** · tag: `1 spec`

| id    | data     | título                | summary                                                           |
| ----- | -------- | --------------------- | ----------------------------------------------------------------- |
| s4-p1 | mai 2026 | Separação de sub-libs | Planejamento da divisão `sapphire-mongo` vs. `sapphire-mongoose`. |

**Season Five — "Code review & 1.0"** · tag: `npm`

| id    | data     | título              | summary                                                        |
| ----- | -------- | ------------------- | -------------------------------------------------------------- |
| s5-p1 | mai 2026 | Code review pesado  | Varredura da lib por bugs, inconsistências e smells.           |
| s5-p2 | mai 2026 | Lançamento 1.0.0 🎉 | Prontidão para npm — changesets, packaging, release workflows. |

### V2 — futuro (`future: true`)

**V2 · Season One — "Validação completa"** · tag: `planejado`

| id      | data   | título               | summary                                             |
| ------- | ------ | -------------------- | --------------------------------------------------- |
| v2s1-p1 | futuro | `refine`             | Validação custom síncrona, por campo e cross-field. |
| v2s1-p2 | futuro | Validação assíncrona | `refine` async + `parseAsync`/`safeParseAsync`.     |
| v2s1-p3 | futuro | `llms.txt`           | `llms.txt`/`llms-full.txt` + listagem no Context7.  |
| v2s1-p4 | futuro | Polish               | Backlog do code-review + teste MySQL real no CI.    |

**V2 · Season Two — "Adapter DX"** · `future: true, sketch: true` — 1 card:
_`.adapter()` tipado e geração de mock data (esboço — não planejado em detalhe)._

**V2 · Season Three — "Adapter Prisma"** · `future: true, sketch: true` — 1 card:
_Quinto adapter `sapphire-prisma`, emitindo schema `.prisma` (esboço)._

## 6. Verificação

- `npm run build` em `website/` passa; `astro check` sem erros novos.
- `/timeline` e `/pt-br/timeline` renderizam; link no Nav funciona nos dois locales.
- Abrir/fechar temporada e card funciona via clique e via teclado (`Enter`/`Space`).
- Com JavaScript desativado, todo o conteúdo aparece expandido.
- Layout não quebra em 360px de largura.

## 7. Não-objetivos

- Gerar a timeline a partir das `specs/` — o recorte é curado.
- Listar cada bug/smell/inconsistência individualmente.
- Animações de scroll-reveal elaboradas — o movimento se limita ao abrir/fechar.
