# Fundalo — Credit Passport for Latino SMBs

Bilingual alternative credit platform that reads informal transactions
(Zelle, Venmo, cash) to build a creditworthiness profile for Hispanic
small business owners operating in the informal economy.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Layer 1 (this build)
- Business profile intake (3-step bilingual form)
- Transaction classification engine (business vs personal vs ghost money)
- Cash flow analysis dashboard
- Reliability score calculation
- Loan range estimation

## Coming next
- Bank Officer report view (EN professional)
- Grant matching engine
- Receipt OCR upload (Claude Vision)
- Financial literacy modules

## Key files
- `src/lib/classifier.js` — core AI classification logic
- `src/data/mockTransactions.js` — demo data (Rosa's Cleaning Services)
- `src/components/Dashboard.jsx` — transaction review + cash flow metrics
- `src/components/Intake.jsx` — bilingual onboarding form
