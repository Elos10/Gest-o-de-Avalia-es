# Sistema Avalia

Sistema da Secretaria Municipal de Educação de Uberaba para criação, impressão, leitura OMR e correção de avaliações escolares.

## Acesso

**Aplicação:** https://gest-o-de-avalia-es.vercel.app/

O GitHub mantém o código-fonte e encaminha visitantes para a aplicação executada na Vercel. A Vercel hospeda o frontend React e a API Fastify; autenticação, PostgreSQL e armazenamento utilizam Supabase.

## Publicação

Cada atualização da branch `main` gera automaticamente um deployment na Vercel. O projeto deve usar:

- Build Command: `pnpm run build`
- Output Directory: `dist`
- Node.js: 22
- Framework Preset: Vite
- Root Directory: raiz do repositório

O domínio de produção deve ser `gest-o-de-avalia-es.vercel.app` e a proteção de deployment deve permitir acesso público.

## Banco e segurança

O modelo está em `prisma/schema.prisma`; migrations ficam em `prisma/migrations` e `supabase/migrations`. Segredos de banco, chave secreta Supabase e assinatura QR devem existir somente nas variáveis protegidas da Vercel.

## Arquitetura

Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md).
