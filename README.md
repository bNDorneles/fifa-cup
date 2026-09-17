# FIFA Cup

Organize campeonatos de FIFA (EA FC) com amigos: jogadores, grupos + mata-mata ou repescagem, placares e classificação.

- **Leitura pública** (qualquer um com o link vê)
- **Escrita só com login admin** (senha)
- **Persistência:** Turso em produção; `data/local.db` no PC

**Repo:** https://github.com/bNDorneles/fifa-cup

---

## O que você precisa fazer (checklist)

Você **não precisa** de conta Turso/Vercel para jogar no PC.  
Para **colocar no ar**, faça nesta ordem:

### A) Conta Turso (banco de dados) — ~5 min

1. Abra https://turso.tech e clique em **Sign up** (pode usar GitHub/Google).
2. No painel https://app.turso.tech → **Create Database**.
3. Nome sugerido: `fifa-cup` → criar.
4. Abra o banco criado e copie:
   - **URL** (algo como `libsql://fifa-cup-xxxx.turso.io`) → isso é `TURSO_DATABASE_URL`
   - Em **Tokens** → **Create Token** → copie o token → isso é `TURSO_AUTH_TOKEN`
5. Guarde os dois num bloco de notas (não compartilhe o token).

### B) Conta Vercel (site no ar) — ~5 min

1. Abra https://vercel.com e entre com a **mesma conta GitHub** (`bNDorneles`).
2. **Add New Project** → importe o repo **`fifa-cup`**.
3. Em **Environment Variables**, cadastre:

| Nome | Valor |
|------|--------|
| `ADMIN_PASSWORD` | a senha que **você** vai usar no site (ex.: uma senha forte) |
| `SESSION_SECRET` | qualquer texto longo aleatório (ex.: `meuSegredoFifa2026xyz`) |
| `TURSO_DATABASE_URL` | a URL do passo A |
| `TURSO_AUTH_TOKEN` | o token do passo A |

4. Clique em **Deploy**.
5. Quando terminar, a Vercel mostra a URL (tipo `https://fifa-cup.vercel.app`).

### C) Testar no ar

1. Abra a URL pública → deve aparecer **modo visualização**.
2. Clique **Login admin** → use o `ADMIN_PASSWORD` que você definiu.
3. Cadastre jogadores, crie torneio, sorteie, lance placar.
4. Abra em aba anônima → só leitura (sem editar).
5. Recarregue a página → dados continuam (Turso salvou).

Pronto. A tabela do banco é criada sozinha no primeiro uso.

---

## Rodar só no PC (sem conta)

```powershell
cd "C:\Users\bNd\Desktop\fifa\Novo(a) Documento de Texto.txt"
npm.cmd install
npm.cmd run dev
```

- App: http://localhost:5173  
- Senha admin local: `admin` (arquivo `.env`)

Se `npm` der erro de política no PowerShell, use sempre `npm.cmd`.

---

## Scripts

| Comando | Função |
|---------|--------|
| `npm run dev` | API + site local |
| `npm test` | Testes |
| `npm run build` | Build de produção |

## Formatos

- **Grupos + mata-mata**
- **Mata-mata com repescagem** (double elimination, final única)

## Backup

Na tela **Início**: exportar/importar JSON (import só como admin).
