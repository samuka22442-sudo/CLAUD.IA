import type { ApiErrorCode } from '@ritmo/shared'
import type { z } from 'zod'

/** Erro "esperado" da API: vira `{ error: code, message, details? }` com o status indicado. */
export class AppError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode, message?: string, details?: unknown) {
    super(message ?? code)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const unauthorized = () => new AppError(401, 'unauthorized', 'Faça login para continuar')
export const notFound = (message = 'Não encontrado') => new AppError(404, 'not_found', message)

/** Valida `value` com o schema zod; em caso de erro lança AppError 400 com a lista de problemas. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      400,
      'invalid_input',
      'Dados inválidos',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    )
  }
  return result.data
}
