/**
 * Comandos de administração (rodam dentro do container, com acesso ao banco):
 *   docker compose exec app node dist/cli.js list-users
 *   docker compose exec app node dist/cli.js reset-password voce@email.com [nova-senha]
 */
import { listUsers, resetPassword } from './admin.ts'
import { createSql } from './db.ts'
import { generatePassword } from './security.ts'

const USAGE = `Uso:
  node dist/cli.js list-users
  node dist/cli.js reset-password <email> [nova-senha]   (sem senha, gera uma aleatória)`

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL não definido')
  const sql = createSql(databaseUrl, { max: 1 })

  try {
    if (command === 'list-users') {
      const users = await listUsers(sql)
      if (users.length === 0) console.log('Nenhum usuário cadastrado.')
      for (const user of users) console.log(`${user.email}\t${user.name}\tcriado em ${user.createdAt}`)
    } else if (command === 'reset-password') {
      const [email, given] = args
      if (!email) throw new Error(USAGE)
      const password = given ?? generatePassword()
      if (password.length < 8) throw new Error('A senha precisa ter ao menos 8 caracteres')
      const ok = await resetPassword(sql, email, password)
      if (!ok) throw new Error(`Nenhum usuário com o e-mail ${email}`)
      console.log(`Senha de ${email} redefinida e sessões encerradas.`)
      if (!given) console.log(`Nova senha: ${password}`)
    } else {
      console.log(USAGE)
      process.exitCode = command ? 1 : 0
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
