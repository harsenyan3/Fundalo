# Fundalo — Credit Passport for Latino SMBs

Bilingual alternative credit platform that reads informal transactions
(Zelle, Venmo, cash) to build a creditworthiness profile for Hispanic
small business owners operating in the informal economy.

## Setup

```bash
npm install
cp .env.example .env
npm run dev:full
```

Open http://localhost:5173

The frontend runs on `5173` and the local Plaid API runs on `3001`.
Use Node 18+ so the local API has built-in `fetch`.

## Plaid env vars

Add these to `.env` before connecting a real account:

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
PORT=3001
```

Use Plaid `sandbox` first. The API server calls Plaid directly and keeps the access token in server memory for the current dev session.

## How the real flow works

1. During intake, the user connects Plaid on the "How you get paid" step.
2. The frontend asks the local API for a Plaid Link token.
3. Plaid Link returns a `public_token`.
4. The local API exchanges that token for an `access_token`.
5. The local API pulls transactions, merges in manual cash/Venmo/Zelle entries, classifies business vs personal, and returns the report payload.
6. The dashboard opens already populated with the analyzed data from intake.

## If "Connect Plaid" errors

The most common causes are:

- You started only Vite with `npm run dev`, so `/api/*` is not running. Start both with `npm run dev:full`.
- `.env` is missing `PLAID_CLIENT_ID` or `PLAID_SECRET`.
- The Plaid account connected successfully, but transaction data is still warming up. The API now polls transaction sync for a short window, but some institutions can still take longer.
- You are using sandbox credentials with a non-sandbox institution selection.

When the local API is unavailable, the app now surfaces a direct message telling you to run `npm run dev:full`.

## Layer 1 (this build)
- Business profile intake (3-step bilingual form)
- Plaid Link + transaction pull for up to 180 days
- Manual transaction entry for cash, Venmo, and Zelle during intake
- Transaction classification engine (business vs personal vs flagged vs ghost money)
- Cash flow analysis dashboard
- Reliability score calculation with recurring-client and cash-flow signals
- Loan range estimation
- Deterministic lender-facing report narrative

## Coming next
- Grant matching engine
- Receipt OCR upload
- Financial literacy modules

## Key files
- `server/index.js` — Plaid API bridge and transaction analysis endpoints
- `src/lib/analysis.js` — shared scoring and classification engine
- `src/data/mockTransactions.js` — demo data (Rosa's Cleaning Services)
- `src/components/Dashboard.jsx` — transaction review + cash flow metrics
- `src/components/Intake.jsx` — bilingual onboarding form
- `src/components/FondoReport.jsx` — owner/bank credit report output
