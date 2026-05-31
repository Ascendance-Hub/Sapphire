# Design — Issue #33: emissão de `.d.ts` em libs consumidoras

- **Data:** 2026-05-31
- **Issue:** [#33](https://github.com/Ascendance-Hub/Sapphire/issues/33) — _Library consumers can't emit `.d.ts` when using inferred schema_
- **Pacote afetado:** `@ascendance-hub/sapphire-core` (`packages/core`)
- **Abordagem escolhida:** A — exportar as field classes (type-only) + esconder `_parse` via `@internal` + `stripInternal`

## Problema

Quando uma lib consumidora tem `declaration: true` no `tsconfig` e reexporta um tipo
derivado de um schema (`export type X = Infer<typeof schema>`), o `tsc` falha ao emitir
o `.d.ts`. Reproduzido contra o `dist/index.d.ts` publicado (v1.1.0), com os erros exatos
da issue:

```
TS4023  Exported variable 'personSchema' has or is using name 'InternalParseResult' ... but cannot be named.
TS4023  ... 'ParseContext' ... but cannot be named.
TS4094  Property 'clone' / 'config' / 'defaultAdapter' / 'instanceOpts' / 'obj' of exported anonymous class type may not be private or protected.
TS7056  The inferred type of this node exceeds the maximum length the compiler will serialize.
```

O erro dispara mesmo quando só o **tipo** é exportado (sem exportar `personSchema`),
porque `Infer<F> = F['_output']` é um _indexed access_ sobre `F` (`src/types/infer.ts`),
o que força o TS a serializar `typeof personSchema`.

### Causa raiz (duas independentes)

1. **`typeof schema` é uma classe anônima.** As field classes (`ObjectField`,
   `StringField`, …) não são exportadas — só o valor `Sapphire`. Do ponto de vista do
   consumidor, `s.object(...)` retorna o tipo de uma classe anônima com membros
   `private`/`protected` → `TS4094` + `TS7056`.
2. **`_parse` vaza tipos internos.** O método público
   `_parse(value: unknown, ctx: ParseContext): InternalParseResult` (parte de
   `InternalField`, que toda field implementa) referencia `ParseContext` e
   `InternalParseResult`, que **não estão na lista de export** (`dist/index.d.ts:1078`)
   → `TS4023`.

## Por que vale corrigir

Isso quebra justamente o caso de uso de manchete do Sapphire — "schema-once"
compartilhado entre frontend e backend num pacote TS publicado. Só afeta **libs**
(`declaration: true`); apps (`declaration: false`) passam. É o cenário que o README
vende. Exportar os tipos de schema é o padrão idiomático: Zod, Valibot e ArkType todos
expõem seus tipos de schema como API pública (Zod teve exatamente este bug — issue
[colinhacks/zod#4083](https://github.com/colinhacks/zod/issues/4083) — e a correção foi
exportar a classe faltante).

## Decisão de design

Exportar os tipos das field classes **resolve a causa (1)** e é idiomático. A parte
sensível é a causa (2): `ParseContext`/`InternalParseResult` são encanamento
genuinamente interno (`_parse` é "interno por convenção", prefixo `_`). Em vez de
exportá-los (o que comprometeria a lib a mantê-los estáveis na API pública), eles são
**removidos da superfície pública** junto com `_parse`.

## Mudanças (todas em `packages/core`)

### 1. Exportar as field classes como **type-only** — `src/index.ts`

```ts
export type {
  ArrayField,
  BooleanField,
  DateField,
  EnumField,
  LiteralField,
  NumberField,
  ObjectField,
  RecordField,
  RefField,
  StringField,
  TupleField,
  TypeField,
  UnionField,
} from './core'
```

- São 13 classes. Todas alcançáveis pela API pública e portanto podem aparecer num
  `typeof schema` do consumidor: 9 direto via `Sapphire` (`string/number/boolean/date/
array/tuple/object/type/ref`) e 4 via `s.type()` (`.union/.literal/.enum/.record` →
  `UnionField`/`LiteralField`/`EnumField`/`RecordField`).
- **Type-only** (não export de valor): o usuário monta schema via `s.object()`, não via
  `new ObjectField()`. Não há razão para expor construtores no runtime. Mais enxuto que
  o Zod (que exporta como valor).
- `_output`/`_input` **permanecem públicos** — `Infer` depende deles.

### 2. Esconder `_parse` via `@internal` + `stripInternal`

- Adicionar `/** @internal */` ao método `_parse`:
  - na interface `InternalField` (`src/interfaces/field.ts`), **e**
  - em cada uma das 13 classes (`src/core/*.ts`). É necessário anotar em cada classe —
    anotar só na interface não basta (a declaração do método na classe ainda emitiria).
- Ligar `"stripInternal": true` em **`packages/core/tsconfig.json`** (escopo local, não no
  `tsconfig.base.json` — evita alterar a emissão dos outros pacotes).

Efeito: `_parse` é removido do `.d.ts` emitido; com isso `ParseContext` e
`InternalParseResult` deixam de aparecer na superfície pública → `TS4023` resolvido **sem
exportá-los**.

### 3. Changeset

Bump **minor** de `@ascendance-hub/sapphire-core` — amplia a superfície de tipos públicos
(novas exportações de tipo); não-quebra.

## O que NÃO muda

- **Nenhuma linha de runtime.** Só JSDoc (`@internal`) + uma flag de build + linhas de
  export. `stripInternal` afeta apenas a emissão de `.d.ts`, não o type-check do
  código-fonte.
- **Chamadores internos de `_parse`** (`src/lib/parse-runner.ts` recebendo
  `InternalField`; recursão `(child as unknown as InternalField)._parse(...)` em
  `src/core/object.ts` e demais compostos) continuam enxergando `_parse` normalmente e
  compilam igual — `stripInternal` não os afeta.

## Validação empírica já feita (pré-implementação)

1. **Reprodução do bug** contra o `dist` publicado: todos os erros da issue dispararam,
   idênticos — incluindo a variante "só o tipo exportado".
2. **`tsup@8.5.1` honra `stripInternal` + `@internal`**: em fixture mínimo, o `_parse` foi
   removido da interface e da classe no `.d.ts`, e os tipos que ele referenciava sumiram
   por completo do output.
3. **Variante final simulada** (type-only export + `_parse` removido) contra o `dist`
   mutado: consumidor com `declaration: true` compila com `EXIT=0` e emite `.d.ts` limpo,
   referenciando as classes exportadas via `import("…").ObjectField<…>`.

## Teste de regressão (sem infra nova)

`examples/consumer` é um workspace que já importa `@ascendance-hub/sapphire-core`
(resolvido pro `dist` buildado) e já faz `export type User = Infer<typeof userOrm>` —
exatamente o padrão que quebra. Hoje seu `tsconfig.json` usa `declaration: false`, então
não pega o bug. Virar para **`declaration: true`** (mantendo `noEmit: true`) transforma o
`npm run typecheck` desse workspace num guard de declaration-emit. Verificado:
`tsc --noEmit` com `declaration: true` **reporta** TS4023/TS4094/TS7056 (sai com código 2).
O CI já roda `build → typecheck → test`, então o guard fica coberto sem adicionar infra.

## Plano de verificação (na implementação — antes de afirmar "pronto")

1. `npm run build -w @ascendance-hub/sapphire-core` e inspecionar `dist/index.d.ts` **e**
   `dist/index.d.cts`:
   - `_parse` ausente;
   - `ParseContext`/`InternalParseResult` ausentes da superfície pública;
   - as 13 classes exportadas como tipo.
2. Reproduzir o cenário da issue contra o dist recém-buildado (mesmo `tsc --declaration`
   usado na investigação) → **zero erros**.
3. `vitest run` + `tsc --noEmit` no core → suíte verde (garante `_parse` funcionando em
   runtime e tipos internos consistentes).

## Fluxo de entrega

- Branch a partir de `preview` (feature→`preview`); nunca contra branch de fase.
- Commits + changeset (minor).
- PR para `preview`. `gh auth` ativo já é `alexandre-damas-murata`.

## Alternativas consideradas (rejeitadas)

- **B — exportar classes + exportar `ParseContext`/`InternalParseResult`** (o "#1+#2" da
  issue): mais barato e validado, mas polui a API pública com tipos internos e os
  compromete como contrato estável. _Nota:_ a afirmação da issue de que a "opção #1
  sozinha desbloqueia" é **falsa** — testado: exportar só os dois tipos mata os `TS4023`
  mas deixa os 5 `TS4094` + o `TS7056`.
- **C — canal de parse por `Symbol` + exportar classes**: independente do build, porém
  mexe nas 13 fields + 2 call-sites + contrato e muda o shape de runtime. Overkill, já que
  `stripInternal` comprovadamente funciona. Fica como plano B caso um dia se queira
  desacoplar do `stripInternal`.
