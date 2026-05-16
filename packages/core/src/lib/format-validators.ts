// S5: tightened regexes — the previous `^[^\s@]+@[^\s@]+\.[^\s@]+$` accepted
// glaring junk like `a@b..c` or `a@.b`. The new patterns cover ~99% of real
// addresses without dragging in an RFC-strict validator. Still pragmatic, not
// RFC 5322 complete — documented in docs/concepts/fields-and-modifiers.md.
//
// Email: local-part allows letters, digits, and the common subset of special
// chars; domain requires dot-separated labels of 2+ ASCII letters at the TLD;
// consecutive dots are rejected; leading/trailing dots are rejected.
export const EMAIL_RE =
  /^[a-zA-Z0-9_+-]+(?:\.[a-zA-Z0-9_+-]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/

// UUID: validates RFC 4122 version + variant bits.
//   - version nibble: position 14 (the '4xxx' segment, here we accept 1–8)
//   - variant nibble: position 19 must be 8/9/a/b (binary 10xx)
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Default URL schemes accepted by `.url()` when no `protocols` option is set. */
export const DEFAULT_URL_PROTOCOLS: readonly string[] = ['http', 'https']

/**
 * Validates `v` as a URL whose scheme is one of `protocols`. `URL.protocol`
 * carries a trailing `:` (`'http:'`), stripped before the membership check.
 */
export function isUrl(v: string, protocols: readonly string[]): boolean {
  let parsed: URL
  try {
    parsed = new URL(v)
  } catch {
    return false
  }
  return protocols.includes(parsed.protocol.slice(0, -1))
}

export const formatValidators = {
  email: (v: string): boolean => EMAIL_RE.test(v),
  uuid: (v: string): boolean => UUID_RE.test(v),
  // season-five S5: `.url()` defaults to http/https; other schemes opt in via
  // the `protocols` option, which routes through `isUrl(v, protocols)`.
  url: (v: string): boolean => isUrl(v, DEFAULT_URL_PROTOCOLS),
} satisfies Record<'email' | 'uuid' | 'url', (v: string) => boolean>

export type StringFormat = keyof typeof formatValidators
