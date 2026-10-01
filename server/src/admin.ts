import type { Sql } from './db.ts'
import { hashPassword } from './security.ts'

/** Troca a senha de um usuário e derruba todas as sessões dele. Retorna false se o e-mail não existe. */
export async function resetPassword(sql: Sql, email: string, newPassword: string): Promise<boolean> {
  const hash = await hashPassword(newPassword)
  const rows = await sql<{ id: string }[]>`
    update users set password_hash = ${hash} where email = ${email.trim().toLowerCase()} returning id
  `
  const row = rows[0]
  if (!row) return false
  await sql`delete from sessions where user_id = ${row.id}`
  return true
}

export async function listUsers(sql: Sql): Promise<{ email: string; name: string; createdAt: string }[]> {
  const rows = await sql<{ email: string; name: string; created_at: Date }[]>`
    select email, name, created_at from users order by created_at
  `
  return rows.map((row) => ({ email: row.email, name: row.name, createdAt: row.created_at.toISOString() }))
}
