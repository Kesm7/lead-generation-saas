# SignalDesk — Lead Generation SaaS

SignalDesk is a lead-generation workspace built with Next.js 16, React, TypeScript, Tailwind CSS, Better Auth, Drizzle ORM, and PostgreSQL.

## Run locally

```bash
npm ci
cp .env.example .env.local
# Set DATABASE_URL and a unique BETTER_AUTH_SECRET in .env.local.
npm run db:migrate
npm run dev
```

The dashboard can still be viewed at [http://localhost:3000](http://localhost:3000). PostgreSQL must be running and the migration applied before using authentication or API routes. In production, set a public HTTPS `BETTER_AUTH_URL`, a strong secret, and working SMTP values; email verification is required before sign-in.

## Current scope

The existing dashboard is still a **front-end demo** and was not redesigned or wired to the new API. It includes sample pipeline metrics and prospect records, client-side search and status filters, CSV export of the visible prospect list, and a form for adding prospects. Dashboard records remain in the current browser's local storage and are not shared between users or devices.

The backend foundation now includes Better Auth email/password signup, verification and password-reset mail hooks; typed PostgreSQL tables and a versioned migration; default business provisioning; authenticated business listing; and business-membership-scoped lead CRUD. Saved lead searches and score history have database tables but are not yet exposed through APIs. Metrics and lead-source charts remain illustrative sample data. Live enrichment, outbound sequences, CRM integrations, production email/database provisioning, deployment configuration, and dashboard-to-API wiring remain future work.

## Backend API

Better Auth is mounted at `/api/auth/*`. The authenticated business list is `GET /api/businesses`. Leads are accessed under `/api/businesses/{businessId}/leads`: `GET` (optional `status`, `search`, `page`, and `perPage` query parameters), `POST`, and the individual-lead path `/api/businesses/{businessId}/leads/{leadId}` (`GET`, `PATCH`, `DELETE`). Lead input is validated, and every lead read or mutation is explicitly scoped to a verified session and business membership. Mutation requests require an `Origin` matching the configured app origin or an entry in `AUTH_TRUSTED_ORIGINS`.

## Useful scripts

- `npm run dev` — start the local development server
- `npm run build` — build the production app
- `npm run start` — serve the production build
- `npm run lint` — run ESLint checks
- `npm run typecheck` — run TypeScript checks
- `npm test` — run PostgreSQL-compatible integration tests with PGlite
- `npm run db:migrate` — apply pending SQL migrations using `DATABASE_URL`
