import { describe, it, expect } from 'vitest'
import { rewriteDocLink } from '../src/lib/remark-rewrite-links'

// rewriteDocLink(url, fromSlug, base) → rewritten url
describe('rewriteDocLink', () => {
  const base = '/Sapphire'

  it('rewrites a sibling .md link', () => {
    expect(rewriteDocLink('./overview.md', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/concepts/overview',
    )
  })

  it('rewrites a parent-relative .md link', () => {
    expect(rewriteDocLink('../adapters/mongo.md', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/adapters/mongo',
    )
  })

  it('rewrites README.md to the docs index', () => {
    expect(rewriteDocLink('../README.md', 'concepts/fields', base)).toBe('/Sapphire/docs')
  })

  it('preserves an anchor on a .md link', () => {
    expect(rewriteDocLink('./validation.md#abortearly', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/concepts/validation#abortearly',
    )
  })

  it('leaves an external link untouched', () => {
    expect(rewriteDocLink('https://github.com/x/y', 'concepts/fields', base)).toBe(
      'https://github.com/x/y',
    )
  })

  it('leaves an anchor-only link untouched', () => {
    expect(rewriteDocLink('#section', 'concepts/fields', base)).toBe('#section')
  })

  it('leaves a non-.md relative link untouched', () => {
    expect(rewriteDocLink('./image.png', 'concepts/fields', base)).toBe('./image.png')
  })

  it('rewrites a bare-filename .md link (no ./ prefix)', () => {
    expect(rewriteDocLink('overview.md', 'concepts/fields', base)).toBe(
      '/Sapphire/docs/concepts/overview',
    )
  })

  it('resolves a sibling link from a top-level doc (slug has no slash)', () => {
    expect(rewriteDocLink('./other.md', 'getting-started', base)).toBe('/Sapphire/docs/other')
  })

  it('leaves a link that escapes the docs root untouched', () => {
    expect(rewriteDocLink('../../specs/V1_DESIGN.md', 'meta/design-decisions', base)).toBe(
      '../../specs/V1_DESIGN.md',
    )
  })
})
