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
