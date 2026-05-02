import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Message resolution — 5-layer hierarchy (mais específico vence)', () => {
  it('1. built-in default funciona quando nada é setado', () => {
    const a = new Sapphire()
    const f = a.string()
    const r = f.safeParse(undefined)
    if (!r.success) expect(r.error.issues[0].message).toBe('Field is required')
  })

  it('2. instance.messages sobrescreve built-in', () => {
    const a = new Sapphire({ messages: { required: 'OBRIGATÓRIO' } })
    const f = a.string()
    const r = f.safeParse(undefined)
    if (!r.success) expect(r.error.issues[0].message).toBe('OBRIGATÓRIO')
  })

  it('3. .message(map) no field sobrescreve a instância', () => {
    const a = new Sapphire({ messages: { required: 'inst' } })
    const f = a.string().message({ required: 'field-level' })
    const r = f.safeParse(undefined)
    if (!r.success) expect(r.error.issues[0].message).toBe('field-level')
  })

  it('3b. .message(string) no field sobrescreve para qualquer code', () => {
    const a = new Sapphire()
    const f = a.string().message('algo errado')
    const r = f.safeParse(undefined)
    if (!r.success) expect(r.error.issues[0].message).toBe('algo errado')
    const r2 = f.safeParse(123)
    if (!r2.success) expect(r2.error.issues[0].message).toBe('algo errado')
  })

  it('4. per-rule { message } sobrescreve field-level', () => {
    const a = new Sapphire()
    const f = a.string().message({ min_length: 'field-min' }).min(3, { message: 'rule-min' })
    const r = f.safeParse('a')
    if (!r.success) expect(r.error.issues[0].message).toBe('rule-min')
  })

  it('5. per-call messages sobrescreve TUDO', () => {
    const a = new Sapphire({ messages: { required: 'inst' } })
    const f = a.string().message({ required: 'field' })
    const r = f.safeParse(undefined, { messages: { required: 'CALL' } })
    if (!r.success) expect(r.error.issues[0].message).toBe('CALL')
  })

  it('mensagem como função recebe MessageContext', () => {
    const a = new Sapphire({
      messages: {
        invalid_type: (ctx) => `path=${ctx.path.join('.')} expected=${ctx.expected} got=${ctx.got}`,
      },
    })
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 123 })
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('path=name expected=string got=number')
    }
  })

  it('mensagem como object é repassada como objeto', () => {
    const a = new Sapphire({
      messages: { required: { i18nKey: 'errors.required', severity: 'high' } },
    })
    const f = a.string()
    const r = f.safeParse(undefined)
    if (!r.success) {
      expect(r.error.issues[0].message).toEqual({ i18nKey: 'errors.required', severity: 'high' })
    }
  })
})
