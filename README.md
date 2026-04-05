# Fundalo

Fundalo is a bilingual alternative-credit workflow for small businesses that do not have clean, traditional financial records. It is designed for operators who get paid through mixed channels like bank deposits, Zelle, Venmo, and cash, and need a lender-friendly way to show business performance even when personal and business activity are commingled.

The current app does four core things:
- collects a business profile through a guided intake
- connects a bank account through Plaid during intake
- lets the user manually add cash, Venmo, and Zelle transactions that may not appear in the bank feed
- analyzes all transactions to separate likely business activity from personal activity and produce a lender-facing score and report

## Project Docs

- [Fundalo architecture flow](./docs/architecture-flow.md)
- [Fundalo ingestion engine](./docs/ingestion-engine.md)
- [Fundalo user flows](./docs/user-flows.md)
- [Fundalo Supabase schema boundary](./docs/supabase-schema-boundary.md)

## Product Goal

The problem Fundalo is trying to solve is not just "show transactions." The real goal is to turn messy financial behavior into a usable underwriting signal.

Many small businesses, especially early-stage or informal operators, have some combination of these issues:
- they run the business out of a personal checking account
- they receive payments through peer-to-peer rails like Zelle and Venmo
- some revenue is handled in cash
- business expenses are mixed with household expenses
- there is not enough formal accounting history for a traditional bank workflow

Fundalo tries to bridge that gap by using transaction evidence, profile context, and classification heuristics to build a practical credit story.

## What Exists Today

This repo currently contains:
- a React frontend built with Vite
- a lightweight local Node HTTP server for Plaid integration
- a shared analysis engine used by both the frontend and backend
- a bilingual intake, dashboard, and report flow

The experience today is:
1. User completes intake details about the business.
2. On the "How you get paid" step, the user can connect Plaid.
3. On that same step, the user can manually add missing cash, Venmo, or Zelle transactions.
4. The backend fetches Plaid transactions, merges them with manual entries, classifies activity, and computes report metrics.
5. The dashboard opens with analyzed data already loaded.
6. The report view turns the analysis into an owner-facing and lender-facing summary.

## High-Level Architecture

### Frontend

The frontend lives in `src/` and is responsible for:
- intake and user-entered business context
- Plaid Link initiation
- manual transaction input
- transaction review and overrides
- dashboard metrics
- report rendering

### Backend

The backend lives in `server/index.js` and is responsible for:
- loading local env vars from `.env`
- creating Plaid Link tokens
- exchanging Plaid public tokens for access tokens
- pulling transaction history from Plaid
- merging Plaid data with manual transactions
- running shared analysis logic

### Shared Analysis Layer

The shared analysis engine lives in `src/lib/analysis.js`. It is the core of the product.

It handles:
- Plaid transaction normalization
- manual transaction normalization
- business vs personal classification
- ghost-money detection
- cash flow aggregation
- score breakdown generation
- debt-capacity and loan-range estimation
- narrative construction for the report

## Setup

Use Node 18+ so the local API has built-in `fetch`.

```bash
npm install
cp .env.example .env
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173)

Local ports:
- frontend: `5173`
- local API: `3001`

## Environment Variables

Create a local `.env` file with:

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
PORT=3001
```

Notes:
- `PLAID_CLIENT_ID` and `PLAID_SECRET` are your app-level Plaid credentials from the Plaid Dashboard.
- `PLAID_ENV=sandbox` is the correct starting point for local development.
- the backend now reads `.env` directly at startup, so shell-exporting vars is not required

## Plaid Flow

Fundalo uses the standard Plaid Link flow:

1. Frontend calls `/api/plaid/create-link-token`
2. Backend creates a Plaid `link_token`
3. Frontend opens Plaid Link with that token
4. User connects their own bank account inside Plaid Link
5. Plaid returns a `public_token`
6. Backend exchanges that for an `access_token` and `item_id`
7. Backend pulls transaction data through Plaid
8. Backend runs classification and returns the analyzed dataset

The user data comes from the person connecting their account inside Link.
The `.env` keys are only the application credentials that allow Fundalo to talk to Plaid at all.

## Why Manual Cash, Venmo, and Zelle Entry Exists

Plaid is necessary, but not sufficient, for this product.

A lot of the target user’s real business activity may be missing or only partially represented in a standard bank feed:
- a cash job may never hit the bank at all
- a Venmo or Zelle payment may be transferred later and lose context
- expenses paid off-platform may not be visible as clearly business-related

That is why intake step 2 includes manual transaction entry for:
- cash
- Venmo
- Zelle

Those entries are merged with Plaid transactions before scoring.

This is important because Fundalo is not trying to be just a Plaid dashboard. It is trying to reconstruct business reality from partial evidence.

## Classification Model

The current classifier is heuristic-based, not ML-model-based.

It uses several layers of evidence:
- merchant and description keywords
- business-entity patterns like `LLC`, `Services`, `Properties`, `HOA`
- known personal-spend keywords
- known business-supplier keywords
- industry-specific keywords from the intake profile
- amount patterns relative to the user’s average service price
- recurrence of inflows from the same counterparty
- Plaid personal finance categories
- account-type context, such as mixed-use vs business-only account
- owner name and business name matches

### Classification Outputs

Each transaction ends up as one of:
- `business`
- `personal`
- `flagged`

Additionally, a transaction may be marked as `ghost` if it looks like cash movement with limited auditability, such as ATM withdrawals or cash-like behavior.

### What "Ghost Money" Means

Ghost money is not necessarily fraud or bad behavior.

It means the system sees money moving in a way that is hard to document digitally. In underwriting terms, that creates weaker evidence, which reduces confidence in the business cash-flow story.

## Scoring Model

The report score is built from several components:
- revenue consistency
- cash flow health
- business vs personal separation discipline
- client diversity
- operating history
- evidence quality

The engine also computes:
- total business revenue
- total business expenses
- monthly average business revenue
- monthly average business expenses
- monthly free cash flow
- debt service capacity
- indicative loan range

This is not meant to be a bureau-style FICO replacement. It is an alternative underwriting summary based on cash-flow evidence.

## Dashboard and Report

The dashboard is meant for transaction review and correction:
- filter business, personal, flagged, and ghost transactions
- manually override flagged transactions
- view cash-flow metrics
- refresh Plaid data

The report is meant for communication:
- owner-facing summary
- lender-facing summary
- score breakdown
- transaction evidence
- verified business relationship summaries
- transaction sample with reasons

## Current Development Status

This project is working as a local prototype, not a production platform yet.

### What Is Working

- intake-based Plaid connection
- local Plaid Link token creation
- local public-token exchange
- transaction sync from Plaid
- manual transaction merge
- transaction classification
- report calculation
- lender-style report rendering

### What Is Not Production-Ready Yet

- Plaid access tokens are stored only in memory, so reconnect is required after server restart
- there is no database for Items, users, sessions, or reports
- there is no authentication or user account system
- there is no webhook handling for Plaid updates
- there is no audit log for manual transaction edits
- there is no formal underwriting policy layer beyond current heuristics
- there are no automated tests in the repo yet

## Common Issues

### "Local API is not ready"

Usually means one of these:
- you started only the frontend with `npm run dev`
- the API server is not running on port `3001`
- `.env` is missing or malformed
- Plaid credentials are not loaded by the API process

Check:
- [http://localhost:3001/api/health](http://localhost:3001/api/health)

Expected response:

```json
{
  "ok": true,
  "plaidConfigured": true,
  "plaidEnv": "sandbox"
}
```

### Plaid connects but there are no transactions

Possible reasons:
- sandbox institution data is limited
- the transactions product is still warming up
- the chosen test user does not produce much transaction history

The backend now polls Plaid transaction sync briefly before returning, but some sandbox cases may still need a refresh.

### Why the app still needs manual entries even with Plaid

Because the underwriting use case depends on evidence that may not exist in bank rails alone. Cash and peer-to-peer behavior are part of the target business profile.

## Recommended Next Steps

If this project is moving toward a real launch, the next highest-value improvements are:

1. Add persistence for users, Plaid Items, and reports.
2. Add auth so multiple users can safely use the app.
3. Store manual transaction provenance and override history.
4. Add Plaid webhooks for transaction updates.
5. Add tests around the analysis engine.
6. Add a policy layer for lender-specific score adjustments and approval logic.

## Important Files

- `server/index.js`
  Local API server, env loading, Plaid endpoints, transaction retrieval, and analysis orchestration.

- `src/lib/analysis.js`
  Core normalization, classification, scoring, trend analysis, and report narrative generation.

- `src/lib/api.js`
  Frontend helpers for calling the local API.

- `src/lib/plaidLink.js`
  Plaid Link script loading and Link open flow.

- `src/components/Intake.jsx`
  Intake flow, Plaid connection step, and manual transaction entry.

- `src/components/Dashboard.jsx`
  Review surface for analyzed transactions and score metrics.

- `src/components/FondoReport.jsx`
  Final report rendering for owner and lender views.

- `src/data/mockTransactions.js`
  Demo data used when no real connected data is available.

## Sandbox Notes

For local testing, Plaid sandbox is the right mode.

Typical sandbox workflow:
- add sandbox app keys to `.env`
- run `npm run dev:full`
- connect a test institution in Plaid Link
- use sandbox user credentials inside Link

Official Plaid references:
- [Quickstart](https://plaid.com/docs/quickstart/)
- [Link](https://plaid.com/docs/link/)
- [Transactions](https://plaid.com/docs/transactions/)
- [Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Sandbox](https://plaid.com/docs/sandbox/)
- [Sandbox test credentials](https://plaid.com/docs/sandbox/test-credentials/)

## Summary

Fundalo is currently a strong local prototype for an alternative-credit workflow built around real-world, messy small-business behavior. Its value is not just Plaid connectivity. Its value is the combination of:
- Plaid transaction access
- manual reconstruction of missing informal activity
- business vs personal separation
- evidence-based scoring
- lender-readable reporting

That combination is the core of the product.
