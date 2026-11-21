# Shopkit

Store builder for Indian sellers: create a store, pick a free template or describe it to AI, preview, publish.

## Structure

```
shopkit/
├── apps/
│   ├── api/          NestJS GraphQL API (port 4000)
│   ├── admin/        Next.js merchant dashboard (port 3010)
│   └── storefront/   Next.js multi-tenant store renderer (port 3020)
├── packages/
│   └── themes/       Section schemas, layout validation, starter templates
└── docker-compose.yml   Postgres (pgvector) on 5442, Redis on 6389
```

Shared infrastructure comes from `@arhaminnovations/*` (see `infra/external-modules`): identity (JWT), crypto (password hashing), redis, pino logger, payment (Razorpay).

## First-time setup

```bash
export ARHAM_NPM_TOKEN=<token for artifact.arhaminnovations.in>
pnpm install
docker compose up -d

cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local
cp apps/storefront/.env.example apps/storefront/.env.local

pnpm dev
```

Migrations run automatically when the API starts.

Open http://localhost:3010, sign up, create a store, and choose a design. Stores are served at `http://<subdomain>.localhost:3020`.

## Database migrations

```bash
pnpm --filter @shopkit/api migration:generate src/migrations/<Name>
pnpm --filter @shopkit/api migration:run
```
