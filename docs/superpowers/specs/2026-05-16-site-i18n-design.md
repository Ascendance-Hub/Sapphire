# Sapphire docs site — en / pt-br internationalization — Design

> Snapshot **2026-05-16**. Brainstorming output (season-five). Implementation
> is planned separately via the writing-plans skill.

## Goal

Make the documentation website bilingual — **English (default)** and
**Brazilian Portuguese** — with a flag switcher in the nav, including a full
translation of all 26 documentation pages.

## Decisions (settled during brainstorming)

- **Full i18n.** Site chrome, landing page, playground, **and all 26 docs** get
  a pt-br version.
- **English is the default.** A first-time visitor always lands in English. No
  browser-language auto-detection.
- **pt-br is opt-in via a flag**, and the choice is **remembered** (localStorage)
  across visits.
- **Deployment is out of scope** — a separate season-five follow-up.

## Architecture

### URL structure — Astro's native i18n

`website/astro.config.mjs` gains:

```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'pt-br'],
  routing: { prefixDefaultLocale: false },
}
```

- English (default) keeps the current URLs: `/Sapphire/`, `/Sapphire/docs/...`,
  `/Sapphire/playground`.
- pt-br is prefixed: `/Sapphire/pt-br/`, `/Sapphire/pt-br/docs/...`,
  `/Sapphire/pt-br/playground`.
- Both locales are generated statically at build time — still a static site,
  GitHub Pages stays viable, no server.

### Documentation source layout

- English docs stay canonical at `docs/**.md` — unchanged, still browseable on
  GitHub.
- pt-br translations live at `docs/pt-br/**.md`, mirroring the English structure
  exactly (`docs/pt-br/getting-started.md`, `docs/pt-br/concepts/validation.md`,
  …).
- `website/src/content.config.ts`: the docs collection picks up both trees. The
  locale of an entry is derived from its path — entries under `pt-br/` are
  pt-br, everything else is en. `superpowers/**` stays excluded.

This layout adds files only — it does not move the existing English docs, so
GitHub doc links, `docs/README.md`, the package READMEs, and the link rewriter
keep working untouched.

### Pages / routing

- `website/src/pages/docs/[...slug].astro` — existing English docs route,
  scoped to the en entries; URLs unchanged.
- `website/src/pages/pt-br/docs/[...slug].astro` — NEW, the pt-br docs route,
  generated from the pt-br entries.
- `website/src/pages/pt-br/index.astro`, `website/src/pages/pt-br/playground.astro`
  — NEW pt-br landing + playground pages.

### The flag switcher

- In `Nav.astro`: `🇺🇸` and `🇧🇷` emoji buttons at the top of the nav.
- The active locale's flag is visually highlighted; the other flag is a link to
  the **equivalent page** in that locale (same path, swapped locale prefix —
  e.g. `/docs/concepts/validation` ⇄ `/pt-br/docs/concepts/validation`).
- A small inline script: clicking a flag stores the choice in `localStorage`;
  on every page load, if the stored choice differs from the current URL's
  locale, it redirects to the equivalent URL — so the preference sticks across
  visits. First-time visitors (no stored choice) stay in English.

### Translated chrome

- A strings module `website/src/i18n/ui.ts` — `{ en: {...}, 'pt-br': {...} }`
  holding every UI string: nav links, footer, hero copy, feature rows,
  playground labels, sidebar headings, page `<title>`s, meta descriptions.
- A helper derives the current locale from the URL and returns the right
  string set.
- `Nav`, `BaseLayout` (the `<html lang>` attribute), `Hero`, `FeatureRow`,
  `Playground`, `Sidebar`, and the page components read strings via the helper.

### The 26 doc translations

- Every `docs/**.md` page (excluding `superpowers/`) is translated to
  `docs/pt-br/**.md`.
- Prose is translated to **technical Brazilian Portuguese**; **code blocks,
  identifiers, API names, type names, and CLI commands are left verbatim**.
- The doc-link rewriter (`website/src/lib/remark-rewrite-links.ts`) is made
  locale-aware so relative `.md` links inside a pt-br doc resolve to pt-br
  pages.
- Translations are produced during implementation and reviewed/corrected by the
  maintainer (a pt-br native speaker).

### Companion task — `sapphire-bson` doc mentions

Before translating, audit the English docs for places that should mention the
`@ascendance-hub/sapphire-bson` package and add them, so the pt-br translation
is made from corrected sources.

## Files touched (overview)

| File | Change |
| ---- | ------ |
| `website/astro.config.mjs` | Add the `i18n` config block. |
| `website/src/content.config.ts` | Locale-aware docs collection. |
| `website/src/i18n/ui.ts` | NEW — UI strings dictionary + locale helper. |
| `website/src/components/Nav.astro` | Flag switcher + translated links. |
| `website/src/components/{Hero,FeatureRow,Playground,Sidebar}.astro` | Read translated strings. |
| `website/src/layouts/{BaseLayout,DocsLayout}.astro` | `lang` attribute + translated strings. |
| `website/src/pages/pt-br/**` | NEW — pt-br routes (index, playground, docs/[...slug]). |
| `website/src/pages/docs/[...slug].astro` | Scope to the en entries. |
| `website/src/lib/remark-rewrite-links.ts` | Locale-aware link rewriting. |
| `docs/pt-br/**` | NEW — 26 translated docs. |
| `docs/**` (English) | `sapphire-bson` mention fixes. |

## Out of scope

- Deployment (GitHub Pages CI) — a separate season-five follow-up.
- Any third language beyond en / pt-br.

## Risk / maintenance note

Full-docs i18n means every future documentation edit must be applied in both
`docs/` and `docs/pt-br/`. This is an accepted, deliberate cost. To keep drift
visible, the implementation plan should add a lightweight guard — at minimum a
note in `docs/meta/contributing.md`, and ideally a CI check that the `docs/` and
`docs/pt-br/` trees have matching file sets.
