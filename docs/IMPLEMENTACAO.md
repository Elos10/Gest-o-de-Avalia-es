# Implementação do MVP

## Etapa 1 - Arquitetura e geometria

- Monorepo separado em React, API Node, domínio compartilhado e worker OpenCV.
- Regra de questões centralizada em `packages/core/src/config/assessmentRules.ts`.
- Template imutável `A4_LANDSCAPE_2UP_HORIZONTAL_V1` usado pelo PDF e pelo OMR.
- A4 paisagem com duas metades independentes, QR assinado e quatro marcadores por metade.

## Etapa 2 - Banco, autenticação e segurança

- Schema Prisma com organização, perfis, unidades, turmas, alunos, avaliações, respostas oficiais, folhas, processamentos, respostas e resultados.
- Migration PostgreSQL versionada em `prisma/migrations`.
- Complemento Supabase com RLS, função privada de organização, vínculo com `auth.users` e bucket privado.
- RBAC Administrador/Gestor/Professor/Operador e filtro de organização aplicado também na API administrativa.
- Upload máximo de 15 MB, MIME declarado e magic bytes, SHA-256, caminho UUID e logs persistidos.

## Etapa 3 - Fluxo pedagógico

- Cadastros reais de unidade, turma e aluno.
- Criação da avaliação com validação de série/disciplina e quantidade automática.
- Editor do gabarito oficial.
- Geração idempotente das folhas por aluno e download PDF.
- Login Supabase e proteção de rotas.

## Etapa 4 - Leitura e correção

- Upload PDF/JPEG/PNG para Storage privado.
- Rasterização de PDF, detecção de página inteira ou meia folha, marcadores, homografia, QR e ROIs.
- Classificação de marcada, branco, múltipla e revisão por confiança.
- Tela com original e respostas lado a lado, alteração manual auditada e finalização.
- Correção automática em escala configurável e persistência do resultado.

## Etapa 5 - Consulta e relatórios

- Dashboard calculado no banco.
- Consulta de processamentos e resultados.
- Resumo de média, maior e menor nota e desempenho por turma.
- Exportação CSV compatível com Excel em português.

## Testes e validações

- 12 testes automatizados de regras, QR, branco, dupla marcação, confiança, correção, nota, PDF A4 e CSV.
- Typecheck de todos os pacotes e build de produção.
- Três imagens sintéticas: marca/branco/dupla, rotação de 2,5 graus e perspectiva.
- Prova integrada com o PDF final: QR lido, quatro marcadores normalizados, alinhamento 91,24%, 20 questões e zero falso preenchimento.

## Execução

1. Copie `.env.example` para `.env` e configure Supabase/PostgreSQL.
2. Execute `pnpm install`, `pnpm db:generate` e `pnpm db:migrate`.
3. Aplique `supabase/migrations/0001_initial.sql`.
4. Crie o usuário Auth inicial e adapte `supabase/bootstrap_admin.sql`.
5. Instale `workers/omr/requirements.txt` e informe `OMR_PYTHON_PATH`.
6. Execute `pnpm dev` e abra `http://localhost:5173`.

Para imprimir, use o PDF baixado e selecione **Tamanho real / 100%**, sem ajuste automático. Para validar o scanner, digitalize a 300 dpi e envie em **Leitura de gabaritos**.
