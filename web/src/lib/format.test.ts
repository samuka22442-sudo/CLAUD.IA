import { describe, expect, it } from 'vitest'
import { countLabel, firstName, formatDuration, formatNumber, formatPercent, formatTimer, greeting, initials, plural } from './format.ts'

describe('formatação em pt-BR', () => {
  it('plural e contagem', () => {
    expect(plural(1, 'dia', 'dias')).toBe('dia')
    expect(plural(0, 'dia', 'dias')).toBe('dias')
    expect(plural(2, 'dia', 'dias')).toBe('dias')
    expect(countLabel(1, 'hábito', 'hábitos')).toBe('1 hábito')
    expect(countLabel(3, 'hábito', 'hábitos')).toBe('3 hábitos')
  })

  it('números e porcentagem', () => {
    expect(formatNumber(3.5)).toBe('3,5')
    expect(formatNumber(10000)).toBe('10.000')
    expect(formatPercent(0.666)).toBe('67%')
    expect(formatPercent(1)).toBe('100%')
  })

  it('durações', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(65)).toBe('1 h 05 min')
    expect(formatDuration(125)).toBe('2 h 05 min')
  })

  it('saudação por hora', () => {
    expect(greeting(6)).toBe('Bom dia')
    expect(greeting(11)).toBe('Bom dia')
    expect(greeting(12)).toBe('Boa tarde')
    expect(greeting(17)).toBe('Boa tarde')
    expect(greeting(18)).toBe('Boa noite')
    expect(greeting(2)).toBe('Boa noite')
  })

  it('nomes', () => {
    expect(firstName('  Ana Maria Souza ')).toBe('Ana')
    expect(initials('Ana Maria Souza')).toBe('AS')
    expect(initials('ana')).toBe('A')
    expect(initials('   ')).toBe('?')
  })

  it('cronômetro mm:ss', () => {
    expect(formatTimer(0)).toBe('00:00')
    expect(formatTimer(65)).toBe('01:05')
    expect(formatTimer(599.2)).toBe('10:00')
    expect(formatTimer(-5)).toBe('00:00')
  })
})
