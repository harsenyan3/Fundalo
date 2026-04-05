# Fundalo Supabase Schema Boundary

This document defines the first database boundary for Fundalo before SQL implementation.

## Core principle

The first version of Fundalo should treat:

1. `Plaid + Venmo + manual cash` as the core ledger ingestion path
2. `Receipts` as a supporting evidence layer

That means the unified ledger must work even if no receipts are uploaded.

## Required core tables

### `businesses`

One row per business profile.

Key fields:

1. `id`
2. `name`
3. `owner_id`
4. `industry`
5. `created_at`

### `plaid_items`

One row per linked bank connection.

Key fields:

1. `id`
2. `business_id`
3. `plaid_item_id`
4. `access_token_secret_id`
5. `institution_id`
6. `last_cursor`
7. `created_at`
8. `updated_at`

### `raw_transactions`

Audit table for source-native records before normalization.

Key fields:

1. `id`
2. `business_id`
3. `source`
4. `external_id`
5. `raw_json`
6. `amount`
7. `transaction_date`
8. `description`
9. `processed`
10. `created_at`

Allowed `source` values:

1. `plaid`
2. `venmo_csv`
3. `cash_manual`

### `ledger_transactions`

Canonical normalized ledger used by scoring and reporting.

Key fields:

1. `id`
2. `business_id`
3. `raw_id`
4. `transaction_date`
5. `amount`
6. `direction`
7. `category`
8. `sub_category`
9. `source_tag`
10. `counterparty_raw`
11. `counterparty_display_name`
12. `is_duplicate`
13. `duplicate_of_ledger_id`
14. `created_at`

### `monthly_financial_snapshots`

Precomputed monthly aggregates for dashboard and scoring.

Key fields:

1. `id`
2. `business_id`
3. `month_start`
4. `total_income`
5. `total_expenses`
6. `net_cash_flow`
7. `zelle_income_total`
8. `rent_total`
9. `utility_total`
10. `created_at`

### `fondo_score_snapshots`

Score results and evidence points for a given scoring run.

Key fields:

1. `id`
2. `business_id`
3. `score`
4. `stability_score`
5. `reliability_score`
6. `volume_score`
7. `evidence_points`
8. `created_at`

## Optional evidence-layer tables

### `receipt_documents`

Stores original uploaded files in Supabase Storage and links metadata in Postgres.

Key fields:

1. `id`
2. `business_id`
3. `storage_bucket`
4. `storage_path`
5. `mime_type`
6. `file_size`
7. `sha256`
8. `uploaded_by`
9. `uploaded_at`

### `receipt_extractions`

Structured OCR output for receipts or informal evidence.

Key fields:

1. `id`
2. `receipt_document_id`
3. `vendor_name`
4. `transaction_date`
5. `amount`
6. `category_guess`
7. `ocr_confidence`
8. `review_status`
9. `created_at`

### `receipt_transaction_links`

Optional join table between OCR evidence and canonical ledger rows.

Key fields:

1. `id`
2. `receipt_extraction_id`
3. `ledger_transaction_id`
4. `link_confidence`
5. `linked_by`
6. `created_at`

## Why this boundary matters

1. Core ledger remains simple and testable.
2. Plaid and Venmo can be implemented first without blocking on OCR.
3. Receipts still remain available for cash-only expenses and underwriting support.
4. The bank officer report can show evidence without making evidence mandatory for score generation.

## Recommended implementation order

1. `businesses`
2. `plaid_items`
3. `raw_transactions`
4. `ledger_transactions`
5. `monthly_financial_snapshots`
6. `fondo_score_snapshots`
7. `receipt_documents`
8. `receipt_extractions`
9. `receipt_transaction_links`
