# Fundalo User Flows

This document defines the operational workflows for Fundalo's three data-ingestion paths:

1. Venmo CSV upload
2. Plaid bank connection and Zelle detection
3. Receipt upload and evidence linking

The goal is to make the trigger, API entry point, storage writes, and user-visible result explicit before implementation.

## Trigger types

Fundalo has three trigger categories:

1. User-triggered
The owner clicks a button, uploads a file, or submits a form.

2. Plaid-triggered
Plaid sends a webhook indicating new transaction updates are available.

3. System-triggered
The backend runs normalization, deduplication, snapshot generation, or score refresh after ingestion succeeds.

## Venmo CSV workflow

### User story

The owner exports a statement from Venmo and uploads it to Fundalo to add payment-app activity to the business ledger.

### Trigger

User action in the frontend:

1. Owner clicks `Upload Venmo statement`
2. Owner selects a CSV file downloaded from Venmo
3. Frontend sends `multipart/form-data` to `POST /api/ingest/venmo-csv`

### Flow

```mermaid
flowchart TD
    U1["Owner uploads Venmo CSV"] --> F1["Frontend file input"]
    F1 --> A1["POST /api/ingest/venmo-csv"]
    A1 --> P1["Parse CSV rows
Date, ID, Type, Status, Note, From, To, Amount"]
    P1 --> R1["Insert source rows into raw_transactions"]
    R1 --> N1["Normalize rows into ledger_transactions"]
    N1 --> D1["Deduplicate against Plaid-origin rows
Same absolute amount
Date within +/- 1 day"]
    D1 --> S1["Refresh monthly snapshots and score inputs"]
    S1 --> V1["Owner sees imported rows, duplicate flags, and updated cash flow"]
```

### Backend steps

1. Validate file type and parse CSV
2. Reject empty or malformed rows
3. Insert each row into `raw_transactions` with `source = venmo_csv`
4. Map each row into canonical ledger fields
5. Check for Plaid overlap
6. Insert normalized rows into `ledger_transactions`
7. Mark `is_duplicate = true` if a Plaid match exists
8. Recompute snapshots or queue recomputation

### User-visible result

The owner sees:

1. Number of rows imported
2. Rows flagged as duplicates
3. Updated revenue and expense view
4. Updated Fondo score inputs if the upload changes the last 6 months

## Plaid bank and Zelle workflow

### User story

The owner connects a bank account so Fundalo can pull transaction history and infer Zelle activity from bank ledger records.

### Important note

The user does not upload Zelle directly.
Fundalo detects Zelle-like activity inside bank transactions returned by Plaid.

### Initial connection trigger

User action in the frontend:

1. Owner clicks `Connect bank`
2. Frontend requests a Plaid Link token from `POST /api/plaid/create-link-token`
3. Frontend opens Plaid Link
4. Plaid returns a `public_token`
5. Frontend posts the `public_token` to `POST /api/plaid/exchange-public-token`

### Initial sync flow

```mermaid
flowchart TD
    U1["Owner clicks Connect bank"] --> F1["POST /api/plaid/create-link-token"]
    F1 --> P1["Plaid Link opens"]
    P1 --> F2["POST /api/plaid/exchange-public-token"]
    F2 --> T1["Store plaid_items row
item_id, institution_id, cursor pointer"]
    T1 --> A1["POST /api/ingest/plaid-sync"]
    A1 --> P2["Call Plaid /transactions/sync"]
    P2 --> R1["Insert source rows into raw_transactions"]
    R1 --> N1["Detect Zelle, Venmo, transfer patterns"]
    N1 --> L1["Normalize into ledger_transactions"]
    L1 --> S1["Refresh monthly snapshots and score inputs"]
    S1 --> V1["Owner sees connected account and imported bank history"]
```

### Ongoing sync trigger

Two valid triggers:

1. Plaid webhook `SYNC_UPDATES_AVAILABLE`
2. Owner clicks `Refresh bank data`

Both should end up calling the same sync route:

1. `POST /api/ingest/plaid-sync`

### Ongoing sync flow

```mermaid
flowchart TD
    W1["Plaid webhook or manual refresh"] --> A1["POST /api/ingest/plaid-sync"]
    A1 --> C1["Read stored last_cursor from plaid_items"]
    C1 --> P1["Call Plaid /transactions/sync with cursor"]
    P1 --> R1["Write added and modified rows to raw_transactions"]
    R1 --> N1["Normalize and update ledger_transactions"]
    N1 --> C2["Update last_cursor in plaid_items"]
    C2 --> S1["Refresh snapshots and score inputs"]
    S1 --> V1["Owner and officer views reflect latest bank activity"]
```

### Zelle classification logic

During normalization, the backend checks:

1. `counterparties[].name`
2. `merchant_name`
3. `name`
4. `original_description`

If strings contain `ZELLE`, tag the row as a Zelle candidate.

Examples:

1. `sub_category = Zelle_Income`
2. `source_tag = plaid_zelle_candidate`

### User-visible result

The owner sees:

1. A linked bank source
2. Imported bank transactions
3. Zelle-like deposits tagged clearly
4. Updated cash-flow trends and score inputs

## Receipt workflow

### User story

The owner uploads receipt images to support cash-only expenses, supplier proof, and underwriting evidence.

### Role in MVP

Receipts are not required for the ledger to work.
They are a supporting evidence layer.

### Trigger

User action in the frontend:

1. Owner clicks `Upload receipts`
2. Owner selects one or more images
3. Frontend sends `multipart/form-data` to `POST /api/ingest/receipts`

### Flow

```mermaid
flowchart TD
    U1["Owner uploads receipt images"] --> F1["POST /api/ingest/receipts"]
    F1 --> S1["Store original files in Supabase Storage"]
    S1 --> D1["Insert receipt_documents rows"]
    D1 --> O1["Run OCR extraction"]
    O1 --> E1["Insert receipt_extractions rows"]
    E1 --> L1["Optional link to ledger transaction
By amount, date, vendor similarity"]
    L1 --> V1["Owner reviews extracted fields and officer sees evidence support"]
```

### Backend steps

1. Store original image in a private Storage bucket
2. Insert metadata into `receipt_documents`
3. Run OCR extraction
4. Store extracted vendor, amount, date, and category guess in `receipt_extractions`
5. Optionally link extraction to a ledger row
6. Keep manual review path for low-confidence matches

### User-visible result

The owner sees:

1. Uploaded evidence files
2. Extracted receipt fields
3. Optional matched transaction
4. Ability to correct OCR output

The bank officer sees:

1. Supporting evidence for expenses or supplier history
2. Better credibility for informal cash activity

## Implementation order

Recommended build order:

1. Venmo CSV workflow
2. Plaid connect and sync workflow
3. Receipt evidence workflow

This order keeps the core ledger path simple while still preserving the evidence layer for later integration.
