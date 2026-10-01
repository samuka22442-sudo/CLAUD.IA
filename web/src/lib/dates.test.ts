import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysInMonth,
  diffDays,
  formatClock,
  formatLongDate,
  minutesOfDay,
  monthMatrix,
  parseISODate,
  rangeISO,
  startOfWeek,
  toISODate,
  weekdayOf,
} from './dates.ts'

describe('fuso do teste', () => {
  it('roda em America/Sao_Paulo (UTC-3), o que torna o bug do toISOString visível', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(180)
  })
})

describe('toISODate / parseISODate', () => {
  it('usa o dia LOCAL, não o UTC (22:30 do dia 1 ainda é dia 1)', () => {
    const night = new Date(2026, 9, 1, 22, 30)
    expect(night.toISOString().slice(0, 10)).toBe('2026-10-02') // o erro clássico
    expect(toISODate(night)).toBe('2026-10-01') // o certo
  })

  it('faz ida e volta sem deslocar o dia', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2028-02-29', '2026-12-31']) {
      expect(toISODate(parseISODate(iso))).toBe(iso)
    }
  })

  it('parse devolve meia-noite local', () => {
    const date = parseISODate('2026-10-01')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 1, 0])
  })
})

describe('addDays / diffDays / weekdayOf', () => {
  it('atravessa mês, ano e ano bissexto', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-01', 0)).toBe('2026-10-01')
  })

  it('diffDays é antissimétrico e conta dias de calendário', () => {
    expect(diffDays('2026-10-01', '2026-10-08')).toBe(7)
    expect(diffDays('2026-10-08', '2026-10-01')).toBe(-7)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
    expect(diffDays('2026-10-01', '2026-10-01')).toBe(0)
  })

  it('weekdayOf: 1º de outubro de 2026 é quinta-feira', () => {
    expect(weekdayOf('2026-10-01')).toBe(4)
    expect(weekdayOf('2026-10-04')).toBe(0) // domingo
    expect(weekdayOf('2026-10-03')).toBe(6) // sábado
  })
})

describe('intervalos e semanas', () => {
  it('rangeISO é inclusivo nas duas pontas', () => {
    expect(rangeISO('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(rangeISO('2026-10-01', '2026-10-01')).toEqual(['2026-10-01'])
    expect(rangeISO('2026-10-02', '2026-10-01')).toEqual([])
  })

  it('startOfWeek respeita o primeiro dia da semana', () => {
    expect(startOfWeek('2026-10-01')).toBe('2026-09-27') // domingo
    expect(startOfWeek('2026-10-01', 1)).toBe('2026-09-28') // segunda
    expect(startOfWeek('2026-09-27')).toBe('2026-09-27')
  })

  it('monthMatrix monta semanas completas começando no domingo', () => {
    const weeks = monthMatrix(2026, 9) // outubro de 2026
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0]!.slice(0, 4)).toEqual([null, null, null, null]) // dia 1 cai na quinta
    expect(weeks[0]![4]).toBe('2026-10-01')
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
    expect(daysInMonth(2028, 1)).toBe(29)
  })
})

describe('formatação', () => {
  it('formata a data por extenso em português', () => {
    expect(formatLongDate('2026-10-01')).toBe('quinta-feira, 1 de outubro')
  })

  it('horários: minutos ↔ HH:mm, dando a volta na meia-noite', () => {
    expect(minutesOfDay('06:30')).toBe(390)
    expect(formatClock(390)).toBe('06:30')
    expect(formatClock(1500)).toBe('01:00')
    expect(formatClock(-30)).toBe('23:30')
  })
})
