# Ritmo — hábitos, metas e rotinas

App **PWA** para organizar **hábitos**, **metas** e **rotinas**, com visual **dark + roxo** de cores fortes.
Funciona no celular e no computador, pode ser **instalado como aplicativo** e **sincroniza os dados pela sua própria VPS**
(banco **PostgreSQL**), então você acessa de qualquer lugar — e continua usando mesmo **sem internet**.

- **Hábitos**: dias da semana, horário, sequência (streak), recorde, taxa de conclusão e um calendário mensal para corrigir dias passados.
- **Metas**: numéricas (ex.: "ler 12 livros", com botão de registrar progresso) ou em checklist de etapas, com prazo e status (andamento, atrasada, concluída).
- **Rotinas**: passos com duração encadeados a partir de um horário, agrupados por período do dia, com **modo foco** (cronômetro em tela cheia).
- **Início** com o resumo do dia, **Progresso** com gráficos e mapa de calor, **Perfil** com exportação dos dados.
- **Login**, cadastro e um **modo demonstração** (dados só no aparelho, sem conta).
- **Responsivo de verdade**: sidebar no computador; barra inferior e botão "+" no celular.

```
Celular / PC (PWA) ──HTTPS──▶ seu Nginx/Caddy/Apache (80/443) ──▶ app :3000 (só 127.0.0.1) ──▶ PostgreSQL (container, rede interna)
```

O container `app` (Fastify) serve a API (`/api/*`) **e** o front já compilado, na mesma origem. O banco não publica porta nenhuma.

---

## Rodar no seu computador (desenvolvimento)

Precisa de **Node 22.12 ou mais novo** (`.nvmrc` incluso).

```bash
npm install
npm run dev
```

Isso sobe três processos juntos: um PostgreSQL de desenvolvimento embutido (**PGlite**, sem Docker, dados em `.pgdata/`),
a API em `http://localhost:3000` e o front em **`http://localhost:5173`** (o Vite repassa `/api` para a API).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | banco + API + front, tudo em modo desenvolvimento |
| `npm test` | todos os testes (servidor e front) |
| `npm run lint` · `npm run typecheck` | oxlint e TypeScript |
| `npm run build` | compila o front (`web/dist`) e o servidor (`server/dist`) |
| `npm start` | roda o servidor compilado (serve API **e** front); precisa de banco (`npm run dev:db`) |

> Quer ver no celular durante o desenvolvimento? Com o `npm run dev` rodando, abra `http://IP-DO-SEU-PC:5173` no celular (mesma rede Wi-Fi).
> A instalação como app exige HTTPS, então isso serve só para ver o visual; a instalação vale na VPS, com o domínio.

---

## Publicar na sua VPS

Pré-requisitos na VPS: **Docker** com Compose v2 (`docker compose version`), um **domínio** apontando para o IP dela e o seu
**Nginx, Caddy ou Apache** já com HTTPS (ou prontos para receber o certificado).
O Ritmo **não usa as portas 80/443**: ele escuta só em `127.0.0.1:3000`, e o seu proxy encaminha para lá.

### 1. Entrar na VPS

```bash
ssh -p 55231 usuario@IP_DA_VPS
```

### 2. Enviar o código

**Opção A — do seu computador, com o script** (usa a porta SSH `55231`; troque com `SSH_PORT=... ./deploy/deploy.sh ...`):

```bash
./deploy/deploy.sh usuario@IP_DA_VPS
```

Na primeira vez ele envia os arquivos e para pedindo o `.env` (passo 3). Depois de criá-lo, rode o mesmo comando de novo.

**Opção B — direto pela VPS, com Git** (o código está na branch `claude/wonderful-fermi-iybzzz`):

```bash
git clone --branch claude/wonderful-fermi-iybzzz https://github.com/samuka22442-sudo/CLAUD.IA.git ritmo
cd ritmo
```

### 3. Criar o `.env`

```bash
cd ritmo            # (opção A: a pasta é ~/ritmo)
cp .env.example .env
nano .env           # preencha PUBLIC_URL e POSTGRES_PASSWORD
```

- `PUBLIC_URL`: o endereço final, com `https://` (ex.: `https://ritmo.seudominio.com`).
- `POSTGRES_PASSWORD`: gere com `openssl rand -hex 24` (só letras e números).
- `APP_PORT`: troque só se a porta 3000 já estiver ocupada na VPS.

### 4. Subir

```bash
docker compose up -d --build
docker compose ps                 # app e db devem aparecer como "healthy"/"running"
docker compose logs -f app        # procure por "Ritmo no ar"
curl http://127.0.0.1:3000/api/health     # {"ok":true}
```

As tabelas do banco são criadas sozinhas na primeira subida (migrações automáticas).

### 5. Colocar o HTTPS na frente

Use o exemplo do proxy que você já tem na VPS:

- **Nginx**: `deploy/nginx.conf.example` (inclui o redirecionamento 80 → 443; depois `sudo certbot --nginx -d ritmo.seudominio.com`).
- **Caddy**: `deploy/Caddyfile.example` (3 linhas; o certificado é automático).
- **Apache**: habilite os módulos e use um VirtualHost assim:

  ```apache
  # sudo a2enmod proxy proxy_http headers ssl rewrite && sudo certbot --apache -d ritmo.seudominio.com
  <VirtualHost *:443>
      ServerName ritmo.seudominio.com
      ProxyPreserveHost On
      RequestHeader set X-Forwarded-Proto "https"
      ProxyPass / http://127.0.0.1:3000/
      ProxyPassReverse / http://127.0.0.1:3000/
  </VirtualHost>
  ```

> Se o seu proxy **roda dentro do Docker**, `127.0.0.1` não alcança o app: conecte o proxy à rede do compose
> (`docker network connect ritmo_default <container-do-proxy>`) e aponte para `app:3000`.

Abra `https://ritmo.seudominio.com`: deve aparecer a tela de login.

### 6. Criar a sua conta e fechar o cadastro

Crie a sua conta pela tela ("Criar conta"). Depois, para ninguém mais se cadastrar na sua VPS, edite o `.env`:

```bash
ALLOW_SIGNUP=false
```

```bash
docker compose up -d      # aplica a mudança (os dados continuam)
```

Para liberar novos cadastros de novo, volte para `true` e rode o mesmo comando.

### Firewall

Deixe abertas só as portas do SSH (`55231`), `80` e `443`. A `3000` já escuta só em `127.0.0.1` e o PostgreSQL não publica porta;
não abra nenhuma das duas. Exemplo com `ufw`: `sudo ufw allow 55231/tcp && sudo ufw allow 80,443/tcp`.

---

## Operação do dia a dia

| Tarefa | Como |
| --- | --- |
| **Atualizar** o app | `./deploy/deploy.sh usuario@IP` (ou, na VPS: `git pull && docker compose up -d --build`). Os dados ficam no volume `ritmo_pgdata` e são preservados; as migrações rodam sozinhas. |
| Ver os **logs** | `docker compose logs -f app` |
| **Backup** do banco | `./deploy/backup.sh` (na VPS, na pasta do projeto). Agende no cron: `0 3 * * * cd /home/usuario/ritmo && ./deploy/backup.sh >> backups/backup.log 2>&1` |
| **Restaurar** um backup (banco vazio) | `gunzip -c backups/ritmo-AAAA-MM-DD-HHMM.sql.gz \| docker compose exec -T db psql -U ritmo -d ritmo` |
| **Esqueci a senha** | `docker compose exec app node server/dist/cli.js reset-password voce@email.com` (gera uma senha nova e encerra as sessões; sem o e-mail de recuperação, esse é o caminho) |
| Listar contas | `docker compose exec app node server/dist/cli.js list-users` |
| Parar / religar | `docker compose stop` / `docker compose start` |

### Usar um PostgreSQL que você já tem

Crie um banco e um usuário nele e, no `docker-compose.yml`, apague o serviço `db` (e o `depends_on` do `app`) e troque o `DATABASE_URL` do `app`
pela sua URL (ex.: `postgres://usuario:senha@host:5432/ritmo`). As tabelas são criadas pelo próprio app.
Se o Postgres roda no host da VPS, acrescente no `app` `extra_hosts: ["host.docker.internal:host-gateway"]` e use `host.docker.internal` na URL.

---

## Instalar como aplicativo (PWA)

Com o site no ar em HTTPS:

- **Chrome/Edge (computador)**: ícone de instalar na barra de endereço, ou o botão **Instalar** do próprio app.
- **Android (Chrome)**: menu ⋮ → **Instalar app**.
- **iPhone/iPad (Safari)**: **Compartilhar** → **Adicionar à Tela de Início**.

O app tem atalhos (novo hábito, nova meta, nova rotina) e abre em tela cheia, como um app nativo.

---

## Offline e sincronização

- A tela lê de um **cache local** por usuário; abrir o app, ver e marcar hábitos funciona **sem internet** (o service worker guarda o aplicativo).
- Cada alteração é salva no aparelho na hora e entra numa **fila**. Com conexão, a fila é enviada ao servidor e o estado é puxado de volta (ao abrir, ao voltar para o app, ao reconectar e a cada ~1 minuto).
- O chip no topo mostra o estado: **Sincronizado**, **Sincronizando**, **Offline · N pendentes** ou **Erro**.
- Marcar hábitos/passos em dois aparelhos nunca conflita (cada conclusão é uma linha no banco). Se o **mesmo item** for editado em dois aparelhos ao mesmo tempo, vale a **última alteração**.
- Se você **sair da conta** com alterações ainda pendentes, o app avisa: elas seriam perdidas.

---

## Segurança

- Senhas guardadas com **scrypt** (hash com sal), nunca em texto. A sessão é um token aleatório num cookie **HttpOnly + Secure + SameSite=Lax** (prefixo `__Host-` em HTTPS); no banco fica só o hash do token.
- **Limite de tentativas** de login e cadastro, validação de toda entrada, checagem de **origem** (CSRF) e **CSP** restritiva; **HSTS** em HTTPS.
- Cada usuário só enxerga e altera os próprios dados (testado: usar o id de outra pessoa não funciona).
- O banco não é exposto, o `.env` está no `.gitignore` e o container roda sem root.
- Não há recuperação de senha por e-mail nem login em dois fatores.

---

## Configuração (variáveis de ambiente)

No `docker compose`, o essencial vem do `.env`. O servidor aceita:

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | — (obrigatória em produção) | URL do PostgreSQL |
| `PUBLIC_URL` | — (obrigatória em produção) | endereço público; define cookie `Secure` e a origem aceita |
| `PORT` · `HOST` | `3000` · `0.0.0.0` (prod) | onde o servidor escuta |
| `ALLOW_SIGNUP` | `true` | `false` fecha o cadastro de novas contas |
| `TRUST_PROXY` | `false` (`true` no compose) | confia no IP enviado pelo proxy (rate limit por IP real) |
| `COOKIE_SECURE` | automático (`true` se `PUBLIC_URL` é https) | força o atributo `Secure` do cookie |
| `STRICT_ORIGIN` | `true` em produção | exige origem conhecida em requisições que alteram dados |
| `ALLOWED_ORIGINS` | — | origens extras aceitas (separadas por vírgula) |
| `STATIC_DIR` | `web/dist` | pasta do front compilado (`none` = só API) |
| `LOG_LEVEL` | `info` | nível dos logs |
| `POSTGRES_PASSWORD` · `APP_PORT` | — · `3000` | usadas só pelo `docker-compose.yml` |

---

## API (resumo)

Tudo em JSON, sob `/api`. Os dados exigem sessão (cookie).

| Método e rota | Função |
| --- | --- |
| `GET /api/health` · `GET /api/config` | saúde (usada pelo Docker) · nome do app e se o cadastro está aberto |
| `POST /api/auth/register` · `login` · `logout` | contas e sessão |
| `GET` · `PATCH` · `DELETE /api/auth/me` | perfil (excluir exige a senha) |
| `POST /api/auth/password` | trocar senha (derruba as outras sessões) |
| `GET /api/data` · `DELETE /api/data` | tudo do usuário · apagar todos os dados |
| `PUT` · `DELETE /api/habits/:id` · `/api/goals/:id` · `/api/routines/:id` | criar/atualizar e excluir (ids `uuid` gerados no cliente → operações idempotentes) |
| `PUT /api/habits/:id/completions/:data` | marcar/desmarcar um dia (`{ "done": true }`) |
| `PUT /api/routines/:id/runs/:data/:passoId` | marcar/desmarcar um passo da rotina |

---

## Estrutura

```
shared/   constantes e schemas zod (a fonte única do formato dos dados)
server/   API Fastify + PostgreSQL: src/, migrations/, test/ (testes contra Postgres real via PGlite), scripts/dev-db.ts
web/      front React + Vite + Tailwind (PWA): src/{pages,components,lib,sync,store,hooks}
deploy/   exemplos de proxy (Nginx, Caddy), deploy.sh (rsync + SSH) e backup.sh
Dockerfile · docker-compose.yml · .env.example
```

**Testes**: `npm test` roda 232 testes (108 no servidor e 124 no front) — regras de hábitos/metas/rotinas (com fuso fixo UTC−3 para pegar bugs de data), operações e fila de
sincronização, e a API inteira contra um **PostgreSQL de verdade** (autenticação, isolamento entre usuários, CRUD, idempotência, rate limit, CSRF, arquivos estáticos).

**O que foi verificado antes de entregar**: testes, lint e tipos; navegação real em Chromium (PC e celular) com **dois aparelhos** na mesma conta, **modo offline de verdade**
(servidor derrubado e religado), service worker, manifest e checagem de instalabilidade; **responsividade** em 8 larguras (320, 360, 390, 768, 1280, 1366, 1440 e 1920 px)
em todas as telas e diálogos, com checagem automática de rolagem horizontal e revisão dos prints. O `docker-compose.yml` foi validado com `docker compose config` e o estágio final
da imagem foi simulado numa pasta limpa, mas **a construção da imagem Docker e os exemplos de proxy não puderam ser executados no ambiente de desenvolvimento**
(sem Docker/Nginx). Se algo falhar na primeira subida, comece por `docker compose logs app` e `docker compose logs db`.
