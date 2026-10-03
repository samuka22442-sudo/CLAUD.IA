# NetDiagram

Editor simples de diagramas de rede no navegador (React + Vite + Tailwind CSS), com login e projetos salvos no servidor.

- Equipamentos (roteador, switch, servidor, PC, internet, firewall, AP) com nome, portas e cor; nunca se sobrepõem, e o botão **Organizar** arruma tudo em camadas.
- Cabos puxados de porta a porta (Ethernet, fibra, console, Wi-Fi) com cor, estilo e texto.
- Textos livres, vários projetos nomeados, desfazer, exportar/importar JSON e exportar PNG.
- Login de usuário único; projetos em SQLite no servidor, acessíveis de qualquer dispositivo.

## Rodar localmente

```bash
npm install
export ADMIN_USER=admin ADMIN_PASSWORD=sua-senha SESSION_SECRET=$(openssl rand -hex 32) COOKIE_SECURE=false
npm run build && node server/index.mjs   # http://localhost:3000
```

Para desenvolver com recarga automática, rode o servidor acima e, em outro terminal, `npm run dev` (porta 5173, com proxy para `/api`).

## Publicar na VPS (Hostinger) com seu domínio

1. **DNS**: no painel do seu domínio, crie um registro `A` (ex.: `diagramas`) apontando para o IP da VPS. Aguarde propagar.
2. **VPS** (Ubuntu/Debian), como root ou com sudo:
   ```bash
   curl -fsSL https://get.docker.com | sh
   git clone https://github.com/samuka22442-sudo/claud.ia.git && cd claud.ia
   git checkout claude/wonderful-fermi-iybzzz
   cp .env.example .env && nano .env        # domínio, usuário, senha e SESSION_SECRET
   docker compose up -d --build
   ```
3. Abra `https://seu-dominio`. O Caddy emite o certificado HTTPS sozinho (as portas 80 e 443 precisam estar liberadas no firewall da VPS).

Atualizar depois: `git pull && docker compose up -d --build`.
Backup: os dados ficam no volume `data` (arquivo `netdiagram.db`), por exemplo `docker compose cp app:/data/netdiagram.db ./backup.db`.
