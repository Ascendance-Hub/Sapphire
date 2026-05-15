import { visit } from 'unist-util-visit'

/**
 * Rewrites a Markdown link URL that points at a `.md` doc file into a site
 * route. `fromSlug` is the slug of the document the link lives in (e.g.
 * `concepts/fields`); `base` is the site base path (e.g. `/Sapphire`).
 * Non-`.md`, external, and anchor-only links are returned unchanged.
 */
export function rewriteDocLink(url: string, fromSlug: string, base: string): string {
  if (/^[a-z]+:/i.test(url) || url.startsWith('#') || url.startsWith('/')) return url

  const [path, anchor] = url.split('#')
  if (!path.endsWith('.md')) return url

  // resolve `path` relative to the directory of `fromSlug`
  const fromDir = fromSlug.includes('/') ? fromSlug.slice(0, fromSlug.lastIndexOf('/')) : ''
  const segments = fromDir ? fromDir.split('/') : []
  let escaped = false
  for (const seg of path.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') {
      if (segments.length > 0) segments.pop()
      else escaped = true
    } else {
      segments.push(seg)
    }
  }
  // A link that traverses above the docs/ root is not a doc-collection page —
  // leave it untouched rather than fabricate a /docs/... route that 404s.
  if (escaped) return url

  let slug = segments.join('/').replace(/\.md$/, '')
  // README.md is the docs index
  slug = slug.replace(/(^|\/)README$/i, '')

  const cleanBase = base.replace(/\/$/, '')
  const route = slug ? `${cleanBase}/docs/${slug}` : `${cleanBase}/docs`
  return anchor ? `${route}#${anchor}` : route
}

/**
 * Remark plugin factory. Pass `{ base }`. The slug of the file being processed
 * is derived from the vfile's path (`.../docs/<slug>.md`), so every intra-doc
 * link resolves relative to its own document.
 */
export function remarkRewriteLinks(options: { base: string }) {
  return function transformer(
    tree: unknown,
    file: { path?: string },
  ): void {
    let fromSlug = ''
    if (typeof file.path === 'string') {
      const m = file.path.replace(/\\/g, '/').match(/\/docs\/(.+)\.md$/i)
      if (m) fromSlug = m[1]
    }
    visit(tree as never, 'link', (node: { url: string }) => {
      node.url = rewriteDocLink(node.url, fromSlug, options.base)
    })
  }
}
