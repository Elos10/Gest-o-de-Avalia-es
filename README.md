# Avalia — Geração e leitura OMR escolar

MVP profissional para criar avaliações, gerar folhas determinísticas A4 com duas vias, processar digitalizações por OpenCV, revisar respostas e corrigir no Supabase/PostgreSQL.

## Execução local

1. Instale Node 22+, pnpm, Python 3.11+ e as dependências de `workers/omr/requirements.txt`.
2. Copie `.env.example` para `.env` e preencha o projeto Supabase.
3. Rode `pnpm install`, `pnpm db:generate` e `pnpm db:migrate`.
4. Aplique `supabase/migrations/0001_initial.sql`, crie o primeiro usuário no Supabase Auth e adapte `supabase/bootstrap_admin.sql` com o UUID dele.
5. Rode `pnpm test` e `pnpm dev`.
6. Abra `http://localhost:5173`; a API fica em `http://localhost:3001`.

Para gerar a folha real de calibração: `pnpm generate:calibration`. Imprima em 100%/tamanho real, sem “ajustar à página”. Digitalize a 300 dpi e envie na tela **Leitura de gabaritos**.

## Variáveis

Consulte `.env.example`. A chave publicável pode ir para o frontend; `SUPABASE_SECRET_KEY` e `QR_HMAC_SECRET` nunca podem ser expostas. `CALIBRI_FONT_PATH` deve apontar para a fonte licenciada existente no host.

## Banco

`prisma/schema.prisma` descreve entidades e relacionamentos. A migration inicial está em `prisma/migrations/202608280001_initial`. `supabase/migrations/0001_initial.sql` adiciona RLS, grants e o bucket privado.

Mais detalhes: [arquitetura](docs/ARQUITETURA.md).

## Publicação na Vercel com Supabase

O repositório já contém `vercel.json` e entradas serverless em `api/`. Importe a raiz do repositório na Vercel e mantenha o preset definido pelo arquivo. A compilação copia o frontend para `dist` na raiz, que deve ser também o **Output Directory** configurado no painel.

Cadastre estas variáveis em **Production**, **Preview** e **Development** quando aplicável:

- `NODE_ENV=production`
- `WEB_ORIGIN=https://SEU-DOMINIO.vercel.app`
- `DATABASE_URL`: URL do Supavisor em transaction mode, porta 6543, com `pgbouncer=true&connection_limit=1`
- `DIRECT_URL`: URL de conexão direta ou Supavisor session mode, porta 5432, usada somente nas migrations
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `QR_HMAC_SECRET`: segredo aleatório com pelo menos 32 caracteres
- `VITE_API_URL`: deixe vazio para a API usar o mesmo domínio

Antes da primeira publicação, execute a migration Prisma e depois `supabase/migrations/0001_initial.sql` no projeto Supabase. Crie o usuário no Supabase Auth e provisione seu perfil com `supabase/bootstrap_admin.sql`.

O frontend, autenticação, cadastros, avaliações, PDF, revisão, resultados e relatórios podem operar na Vercel. O reconhecimento OpenCV usa um processo Python nativo; para produção ele deve ser executado em um worker/container com Python e OpenCV, pois não faz parte do runtime Node da Vercel.
