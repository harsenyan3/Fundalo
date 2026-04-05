create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'transaction_source'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.transaction_source as enum ('plaid', 'venmo_csv', 'cash_manual');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'ledger_category'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.ledger_category as enum ('income', 'expense');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  industry text not null,
  created_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx
  on public.businesses (owner_id);

create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plaid_item_id text not null unique,
  access_token_secret_id uuid not null,
  institution_id text,
  last_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plaid_items_business_id_idx
  on public.plaid_items (business_id);

drop trigger if exists set_plaid_items_updated_at on public.plaid_items;
create trigger set_plaid_items_updated_at
before update on public.plaid_items
for each row
execute function public.set_updated_at();

create table if not exists public.raw_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete set null,
  source public.transaction_source not null,
  external_id text,
  raw_json jsonb not null default '{}'::jsonb,
  amount numeric(14,2) not null check (amount <> 0),
  transaction_date date not null,
  description text not null default '',
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    source <> 'plaid'
    or plaid_item_id is not null
  )
);

create unique index if not exists raw_transactions_business_source_external_id_uidx
  on public.raw_transactions (business_id, source, external_id)
  where external_id is not null;

create index if not exists raw_transactions_business_date_idx
  on public.raw_transactions (business_id, transaction_date desc);

create index if not exists raw_transactions_processed_idx
  on public.raw_transactions (processed, source);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  raw_id uuid not null references public.raw_transactions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  transaction_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  category public.ledger_category not null,
  sub_category text not null default 'uncategorized',
  source_tag text not null,
  counterparty_raw text,
  counterparty_display_name text,
  is_duplicate boolean not null default false,
  duplicate_of_ledger_id uuid references public.ledger_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  check (duplicate_of_ledger_id is null or duplicate_of_ledger_id <> id)
);

create index if not exists ledger_transactions_business_date_idx
  on public.ledger_transactions (business_id, transaction_date desc);

create index if not exists ledger_transactions_business_sub_category_idx
  on public.ledger_transactions (business_id, sub_category);

create index if not exists ledger_transactions_duplicate_lookup_idx
  on public.ledger_transactions (business_id, transaction_date, amount, source_tag);

create table if not exists public.monthly_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  month_start date not null,
  total_income numeric(14,2) not null default 0,
  total_expenses numeric(14,2) not null default 0,
  net_cash_flow numeric(14,2) not null default 0,
  zelle_income_total numeric(14,2) not null default 0,
  rent_total numeric(14,2) not null default 0,
  utility_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, month_start)
);

create index if not exists monthly_financial_snapshots_business_month_idx
  on public.monthly_financial_snapshots (business_id, month_start desc);

create table if not exists public.fondo_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  stability_score integer not null check (stability_score between 0 and 100),
  reliability_score integer not null check (reliability_score between 0 and 100),
  volume_score integer not null check (volume_score between 0 and 100),
  evidence_points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fondo_score_snapshots_business_created_at_idx
  on public.fondo_score_snapshots (business_id, created_at desc);

alter table public.businesses enable row level security;
alter table public.plaid_items enable row level security;
alter table public.raw_transactions enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.monthly_financial_snapshots enable row level security;
alter table public.fondo_score_snapshots enable row level security;

drop policy if exists "business owners can manage their businesses" on public.businesses;
create policy "business owners can manage their businesses"
on public.businesses
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "business owners can access plaid items" on public.plaid_items;
create policy "business owners can access plaid items"
on public.plaid_items
for all
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = plaid_items.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = plaid_items.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "business owners can access raw transactions" on public.raw_transactions;
create policy "business owners can access raw transactions"
on public.raw_transactions
for all
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = raw_transactions.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = raw_transactions.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "business owners can access ledger transactions" on public.ledger_transactions;
create policy "business owners can access ledger transactions"
on public.ledger_transactions
for all
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = ledger_transactions.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = ledger_transactions.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "business owners can access monthly snapshots" on public.monthly_financial_snapshots;
create policy "business owners can access monthly snapshots"
on public.monthly_financial_snapshots
for all
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = monthly_financial_snapshots.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = monthly_financial_snapshots.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "business owners can access fondo score snapshots" on public.fondo_score_snapshots;
create policy "business owners can access fondo score snapshots"
on public.fondo_score_snapshots
for all
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = fondo_score_snapshots.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = fondo_score_snapshots.business_id
      and b.owner_id = auth.uid()
  )
);
