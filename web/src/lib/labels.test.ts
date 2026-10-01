import { describe, expect, it } from 'vitest'
import { scheduleLabel } from './labels.ts'

describe('scheduleLabel', () => {
  it('usa nomes curtos para as agendas comuns', () => {
    expect(scheduleLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Todos os dias')
    expect(scheduleLabel([1, 2, 3, 4, 5])).toBe('Dias úteis')
    expect(scheduleLabel([6, 0])).toBe('Fins de semana')
  })

  it('lista os dias nos demais casos', () => {
    expect(scheduleLabel([1, 3, 5])).toBe('Seg, qua e sex')
    expect(scheduleLabel([2])).toBe('Ter')
    expect(scheduleLabel([6, 1])).toBe('Seg e sáb')
  })
})
