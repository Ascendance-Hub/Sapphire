import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('Bug: ArrayField itera sobre schema em vez dos dados', () => {
  const a = new Ruby(ORM.MONGO)

  it('detecta item inválido no meio do array', () => {
    const field = a.array([a.string()])
    expect(field.validate(['ok', 123, 'ok']).error).toBeTruthy()
  })

  it('detecta item inválido no final do array', () => {
    const field = a.array([a.string()])
    expect(field.validate(['ok', 'ok', 123]).error).toBeTruthy()
  })

  it('detecta objeto inválido em array de objetos', () => {
    const field = a.array([a.object({ name: a.string(), salary: a.number() })])
    expect(
      field.validate([
        { name: 'dev', salary: 5000 },
        { name: 'po', salary: 'não é número' },
      ]).error
    ).toBeTruthy()
  })

  it('valida array vazio para schema obrigatório (sem itens, mas é um array)', () => {
    const field = a.array([a.string()])
    expect(field.validate([]).error).toBeUndefined()
  })
})
