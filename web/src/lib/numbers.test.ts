import { describe, expect, it } from 'vitest'
import { parseNumber } from './numbers.ts'

describe('parseNumber', () => {
  it('aceita ponto e vírgula como separador decimal', () => {
    expect(parseNumber('3.5')).toBe(3.5)
    expect(parseNumber('3,5')).toBe(3.5)
    expect(parseNumber(' 12 ')).toBe(12)
    expect(parseNumber('-4')).toBe(-4)
  })

  it('devolve null para vazio ou lixo', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('   ')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('1,2,3')).toBeNull()
  })
})
