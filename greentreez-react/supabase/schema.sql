-- Green Treez catalog
-- Paste this into the Supabase SQL editor (Project → SQL → New query).
-- Then run: npm run catalog:seed

create extension if not exists pg_trgm;

create or replace function gtz_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id text primary key,
  handle text unique not null,
  title text not null,
  vendor text not null default '',
  product_type text not null default 'Product',
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  description text not null default '',
  tags text[] not null default '{}',
  strain text,
  psychoactivity text,
  effects text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  seo_keywords text not null default '',
  excerpt text not null default '',
  lab_report_url text not null default '',
  source text not null default 'admin',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists seo_keywords text not null default '';
alter table public.products add column if not exists excerpt text not null default '';
alter table public.products add column if not exists lab_report_url text not null default '';
create index if not exists products_title_trgm on public.products using gin (title gin_trgm_ops);
create index if not exists products_type_idx on public.products (product_type);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_handle_idx on public.products (handle);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function gtz_set_updated_at();

create table if not exists public.collections (
  id text primary key,
  handle text unique not null,
  title text not null,
  description text not null default '',
  image text not null default '',
  body_html text not null default '',
  sort_order int not null default 100,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at
before update on public.collections
for each row execute function gtz_set_updated_at();

create table if not exists public.collection_products (
  collection_id text not null references public.collections(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, product_id)
);

create index if not exists collection_products_product_idx on public.collection_products (product_id);

create table if not exists public.orders (
  id text primary key,
  reference text not null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'paid', 'fulfilled', 'cancelled')),
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  delivery_method text not null default '',
  shipping_address text not null default '',
  payment_method text not null default '',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create unique index if not exists orders_reference_idx on public.orders (reference);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
before update on public.orders
for each row execute function gtz_set_updated_at();

alter table public.products enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.orders enable row level security;

drop policy if exists products_read on public.products;
drop policy if exists products_write on public.products;
drop policy if exists collections_read on public.collections;
drop policy if exists collections_write on public.collections;
drop policy if exists collection_products_read on public.collection_products;
drop policy if exists collection_products_write on public.collection_products;
drop policy if exists orders_read on public.orders;
drop policy if exists orders_write on public.orders;

-- Storefront reads published catalog data. Admin writes with the anon key.
-- Tighten these policies with Supabase Auth before going live on a public domain.
create policy products_read on public.products for select using (true);
create policy products_write on public.products for all using (true) with check (true);
create policy collections_read on public.collections for select using (true);
create policy collections_write on public.collections for all using (true) with check (true);
create policy collection_products_read on public.collection_products for select using (true);
create policy collection_products_write on public.collection_products for all using (true) with check (true);

-- The storefront checkout inserts orders with the anon key; the admin reads and
-- updates them. Put these behind Supabase Auth before going live publicly.
create policy orders_read on public.orders for select using (true);
create policy orders_write on public.orders for all using (true) with check (true);
