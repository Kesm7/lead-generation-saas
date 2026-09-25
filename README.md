# SignalDesk — Lead Generation SaaS

SignalDesk is the first product-facing iteration of a lead-generation workspace, built with Next.js 13, React, TypeScript, and Tailwind CSS.

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Current scope

The current dashboard is a **front-end demo**. It includes sample pipeline metrics and prospect records, client-side search and status filters, CSV export of the visible prospect list, and a form for adding prospects. Newly added prospects are saved in the current browser's local storage. Data is not shared between users or devices.

There is no backend, authentication, live prospect enrichment, email/sequence delivery, or connected CRM yet. Metrics and lead-source charts are illustrative sample data, not production analytics.

## Useful scripts

- `npm run dev` — start the local development server
- `npm run build` — build the production app
- `npm run start` — serve the production build
- `npm run lint` — run Next.js ESLint checks
