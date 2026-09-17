# FIFA Cup

Organize campeonatos de FIFA (EA FC) com amigos: jogadores, grupos + mata-mata ou repescagem, placares e classificação.

- **Leitura pública** (qualquer um com o link vê)
- **Escrita só com login admin** (senha)
- **Persistência:** Turso (libSQL) em produção; `data/local.db` no desenvolvimento local

## Rodar local

```bash
npm install
cp .env.example .env
npm run dev
```

No PowerShell, se `npm` for bloqueado: use `npm.cmd install` e `npm.cmd run dev`.

- App: http://localhost:5173  
- API: http://localhost:3001  
- Senha admin padrão (dev): `admin` (defina `ADMIN_PASSWORD` no `.env`)

## Deploy no Vercel + Turso

### 1. Criar banco Turso

1. Conta em [turso.tech](https://turso.tech)
2. `turso db create fifa-cup`
3. `turso db show fifa-cup --url` → `TURSO_DATABASE_URL`
4. `turso db tokens create fifa-cup` → `TURSO_AUTH_TOKEN`

### 2. Projeto na Vercel

1. Suba o repo e importe na Vercel
2. Configure variáveis de ambiente:

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `ADMIN_PASSWORD` | sim | Senha do admin |
| `SESSION_SECRET` | sim | String longa aleatória |
| `TURSO_DATABASE_URL` | sim (prod) | URL libsql://… |
| `TURSO_AUTH_TOKEN` | sim (prod) | Token Turso |

3. Deploy. A tabela `app_state` é criada automaticamente no primeiro request.

### 3. Checklist go-live

- [ ] Abrir a URL pública e ver modo visualização
- [ ] Login admin com a senha
- [ ] Criar jogadores, torneio, sortear, lançar placar
- [ ] Abrir em aba anônima: só leitura
- [ ] Recarregar: dados persistem (Turso)
- [ ] Export JSON ainda funciona como backup

## Scripts

| Comando | Função |
|---------|--------|
| `npm run dev` | API + Vite |
| `npm test` | Testes |
| `npm run build` | Build do client (`dist/`) |

## Formatos

- **Grupos + mata-mata**
- **Mata-mata com repescagem** (double elimination, final única)

## Backup

Export/import JSON na tela Início (import só como admin).
