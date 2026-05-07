export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const formatValidators = {
  email: (v: string): boolean => EMAIL_RE.test(v),
  uuid: (v: string): boolean => UUID_RE.test(v),
  url: (v: string): boolean => {
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  },
} satisfies Record<'email' | 'uuid' | 'url', (v: string) => boolean>

export type StringFormat = keyof typeof formatValidators
