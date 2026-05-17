export const locales = ['en', 'pt-br'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

/**
 * Every translatable UI string, keyed by a stable id. `en` is the source of
 * truth; `pt-br` mirrors its keys. Components look strings up via
 * `useTranslations(locale)`.
 */
export const ui = {
  en: {
    'nav.docs': 'Docs',
    'nav.playground': 'Playground',
    'nav.timeline': 'Timeline',
    'nav.github': 'GitHub',
    'hero.title': 'One schema. Every ORM.',
    'hero.tagline':
      'Define your data shape once — Sapphire emits Mongoose, Drizzle, JSON Schema and TypeScript types from a single source of truth.',
    'hero.getStarted': 'Get started →',
    'hero.openPlayground': 'Open playground',
    'features.multiOutput.title': 'Multi-output',
    'features.multiOutput.body':
      'One definition becomes a Mongoose schema, a Drizzle table, and a JSON Schema document.',
    'features.typed.title': 'Typed end to end',
    'features.typed.body':
      'Infer<> derives a precise TypeScript type from the same schema — no drift.',
    'features.validation.title': 'Validation built in',
    'features.validation.body':
      'parse / safeParse with structured, DTO-ready errors via flatten() and format().',
    'playground.title': 'Playground',
    'playground.intro': 'Edit the schema and the sample value — every panel recomputes live.',
    'timeline.title': 'Timeline',
    'timeline.intro': 'How Sapphire was built — from the first idea to 1.0 and beyond.',
    'timeline.hintSeason': 'Click a season to open its phases',
    'timeline.hintPhase': 'click a phase for details',
    'sidebar.index': 'Documentation',
    'footer.license': 'Sapphire — MIT',
    'title.home': 'Sapphire — one schema, every ORM',
    'title.playground': 'Sapphire — playground',
    'title.timeline': 'Sapphire — timeline',
    'title.docsIndex': 'Sapphire — documentation',
  },
  'pt-br': {
    'nav.docs': 'Documentação',
    'nav.playground': 'Playground',
    'nav.timeline': 'Timeline',
    'nav.github': 'GitHub',
    'hero.title': 'Um schema. Todos os ORMs.',
    'hero.tagline':
      'Defina o formato dos seus dados uma vez — o Sapphire gera Mongoose, Drizzle, JSON Schema e tipos TypeScript a partir de uma única fonte de verdade.',
    'hero.getStarted': 'Começar →',
    'hero.openPlayground': 'Abrir o playground',
    'features.multiOutput.title': 'Múltiplas saídas',
    'features.multiOutput.body':
      'Uma definição vira um schema do Mongoose, uma tabela do Drizzle e um documento JSON Schema.',
    'features.typed.title': 'Tipado de ponta a ponta',
    'features.typed.body':
      'Infer<> deriva um tipo TypeScript preciso do mesmo schema — sem divergência.',
    'features.validation.title': 'Validação embutida',
    'features.validation.body':
      'parse / safeParse com erros estruturados, prontos para DTO, via flatten() e format().',
    'playground.title': 'Playground',
    'playground.intro': 'Edite o schema e o valor de exemplo — cada painel recalcula ao vivo.',
    'timeline.title': 'Linha do tempo',
    'timeline.intro': 'Como o Sapphire foi construído — da primeira ideia até o 1.0 e além.',
    'timeline.hintSeason': 'Clique numa temporada para abrir as fases',
    'timeline.hintPhase': 'clique numa fase para ver os detalhes',
    'sidebar.index': 'Documentação',
    'footer.license': 'Sapphire — MIT',
    'title.home': 'Sapphire — um schema, todos os ORMs',
    'title.playground': 'Sapphire — playground',
    'title.timeline': 'Sapphire — linha do tempo',
    'title.docsIndex': 'Sapphire — documentação',
  },
} as const

export type UIKey = keyof (typeof ui)['en']

/** Returns a `t(key)` function for the given locale, falling back to English. */
export function useTranslations(locale: Locale) {
  return function t(key: UIKey): string {
    return ui[locale][key] ?? ui.en[key]
  }
}

/** Normalizes `Astro.currentLocale` (which may be undefined) to a known Locale. */
export function asLocale(value: string | undefined): Locale {
  return value === 'pt-br' ? 'pt-br' : 'en'
}
