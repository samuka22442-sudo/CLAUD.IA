type ClassValue = string | false | null | undefined

/** Junta nomes de classe ignorando valores vazios: cn('a', cond && 'b'). */
export const cn = (...parts: ClassValue[]): string => parts.filter(Boolean).join(' ')
