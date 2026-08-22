-- WAQT — core schema for v1 (expiry-date inventory + Supplier Return)
-- Multi-tenant: every business row is scoped by company_id and protected by RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  near_expiry_days int  not null default 7,
  currency        text not null default 'MYR',
  created_at      timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin','staff')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index if not exists company_members_user_idx on public.company_members(user_id);

create table if not exists public.stores (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists stores_company_idx on public.stores(company_id);

create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  contact      text,
  return_terms text,
  created_at   timestamptz not null default now(),
  unique (company_id, name)
);
create index if not exists suppliers_company_idx on public.suppliers(company_id);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  sku         text not null,
  name        text not null,
  category    text,
  barcode     text,
  unit        text not null default 'PCS',
  cost        numeric(12,2) not null default 0,
  sell_price  numeric(12,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  has_expiry  boolean not null default true,
  returnable  boolean not null default true,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now(),
  unique (company_id, sku)
);
create index if not exists products_company_idx on public.products(company_id);
create index if not exists products_barcode_idx on public.products(company_id, barcode);

create table if not exists public.batches (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  batch_code text not null,
  expires_at date,
  status     text not null default 'ok' check (status in ('ok','expiring_soon','expired','written_off')),
  created_at timestamptz not null default now(),
  unique (company_id, product_id, batch_code)
);
create index if not exists batches_company_expiry_idx on public.batches(company_id, expires_at);

create table if not exists public.stock (
  company_id uuid not null references public.companies(id) on delete cascade,
  batch_id   uuid not null references public.batches(id) on delete cascade,
  store_id   uuid not null references public.stores(id) on delete cascade,
  qty        integer not null default 0 check (qty >= 0),
  primary key (batch_id, store_id)
);
create index if not exists stock_company_idx on public.stock(company_id);
create index if not exists stock_store_idx on public.stock(store_id);

create table if not exists public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  batch_id   uuid references public.batches(id) on delete set null,
  store_id   uuid references public.stores(id) on delete set null,
  kind       text not null check (kind in ('receive','sale','scrap','return')),
  qty        integer not null,
  reason     text,
  actor_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists movements_company_created_idx on public.stock_movements(company_id, created_at desc);

create table if not exists public.supplier_returns (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  rma_number    text,
  status        text not null default 'draft' check (status in ('draft','submitted','shipped','credited','rejected')),
  credit_amount numeric(12,2) not null default 0,
  notes         text,
  actor_id      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists supplier_returns_company_idx on public.supplier_returns(company_id, created_at desc);

create table if not exists public.supplier_return_lines (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  supplier_return_id uuid not null references public.supplier_returns(id) on delete cascade,
  batch_id           uuid references public.batches(id) on delete set null,
  qty                integer not null,
  reason             text
);
create index if not exists return_lines_return_idx on public.supplier_return_lines(supplier_return_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER: bypass RLS to avoid policy recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_admin(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Pure status derivation (ported from the reference statusFromDate).
create or replace function public.batch_status(expires date, near_days int)
returns text language sql immutable as $$
  select case
    when expires is null then 'ok'
    when expires < current_date then 'expired'
    when expires <= current_date + near_days then 'expiring_soon'
    else 'ok'
  end;
$$;

-- Create a company for the current user (atomic: company + admin membership + Main store).
create or replace function public.create_company(company_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.companies (name) values (company_name) returning id into new_id;
  insert into public.company_members (company_id, user_id, role) values (new_id, auth.uid(), 'admin');
  insert into public.stores (company_id, name) values (new_id, 'Main store');
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.companies             enable row level security;
alter table public.company_members       enable row level security;
alter table public.stores                enable row level security;
alter table public.suppliers             enable row level security;
alter table public.products              enable row level security;
alter table public.batches               enable row level security;
alter table public.stock                 enable row level security;
alter table public.stock_movements       enable row level security;
alter table public.supplier_returns      enable row level security;
alter table public.supplier_return_lines enable row level security;

-- companies: members can read; admins can update. (Creation goes through create_company.)
create policy companies_select on public.companies for select using (public.is_member(id));
create policy companies_update on public.companies for update using (public.is_admin(id)) with check (public.is_admin(id));

-- company_members: members can read their company's roster; admins manage it.
create policy members_select on public.company_members for select using (public.is_member(company_id));
create policy members_admin  on public.company_members for all
  using (public.is_admin(company_id)) with check (public.is_admin(company_id));

-- Uniform member read/write policy for the remaining tenant tables.
do $$
declare t text;
begin
  foreach t in array array[
    'stores','suppliers','products','batches','stock',
    'stock_movements','supplier_returns','supplier_return_lines'
  ] loop
    execute format(
      'create policy %I_select on public.%I for select using (public.is_member(company_id));',
      t, t);
    execute format(
      'create policy %I_write on public.%I for all using (public.is_member(company_id)) with check (public.is_member(company_id));',
      t, t);
  end loop;
end $$;
