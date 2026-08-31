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

-- ---------------------------------------------------------------------------
-- Admin identity
--
-- The anon key ships inside the storefront bundle, so it can never be what
-- authorises a write. Writes require a signed-in Supabase Auth user whose id is
-- listed in public.admins. Promote an account with:
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'you@yourdomain.com'
--   on conflict (user_id) do nothing;
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so the check itself is not subject to the policies below,
-- which would otherwise recurse when a policy queries public.admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
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
drop policy if exists admins_read on public.admins;
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_write on public.products;
drop policy if exists collections_public_read on public.collections;
drop policy if exists collections_admin_write on public.collections;
drop policy if exists collection_products_public_read on public.collection_products;
drop policy if exists collection_products_admin_write on public.collection_products;
drop policy if exists orders_public_insert on public.orders;
drop policy if exists orders_admin_read on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_delete on public.orders;

-- Admins can see the allowlist. Nothing may edit it through the API; add and
-- remove admins from the SQL editor or the dashboard.
create policy admins_read on public.admins for select using (public.is_admin());

-- Shoppers see live listings only; an admin additionally sees drafts and
-- archived products so the dashboard can edit them.
create policy products_public_read on public.products
  for select using (status = 'active' or public.is_admin());
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy collections_public_read on public.collections
  for select using (published or public.is_admin());
create policy collections_admin_write on public.collections
  for all using (public.is_admin()) with check (public.is_admin());

-- Membership rows carry no private data and the storefront needs them to build
-- collection pages.
create policy collection_products_public_read on public.collection_products
  for select using (true);
create policy collection_products_admin_write on public.collection_products
  for all using (public.is_admin()) with check (public.is_admin());

-- Checkout runs unauthenticated, so anyone may place an order, but only an
-- admin may read one back. Customer names, phones, and addresses live here.
create policy orders_public_insert on public.orders for insert with check (true);
create policy orders_admin_read on public.orders for select using (public.is_admin());
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Order integrity
--
-- Checkout is unauthenticated, so everything an order carries arrives from a
-- browser the shop does not control: quantities, prices, and the subtotal all
-- come out of localStorage and can be edited before submission. These guards
-- are the only place that can be enforced.
-- ---------------------------------------------------------------------------

-- Bound the shape of an order so a script cannot store megabytes of junk.
alter table public.orders drop constraint if exists orders_sane_shape;
alter table public.orders add constraint orders_sane_shape check (
  subtotal >= 0
  and subtotal <= 100000000
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) between 0 and 100
  and length(customer_name) <= 200
  and length(customer_phone) <= 40
  and length(customer_email) <= 320
  and length(shipping_address) <= 500
  and length(notes) <= 2000
  and length(reference) <= 40
);

-- Recompute the subtotal from the catalog, ignoring whatever the browser sent.
-- Each item names a product handle and a variant title; the price comes from
-- the products table. Anything that cannot be matched is priced at zero and
-- flagged, rather than silently trusted.
create or replace function public.gtz_price_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  variant jsonb;
  qty integer;
  unit_price integer;
  computed bigint := 0;
  repriced jsonb := '[]'::jsonb;
  matched boolean;
begin
  for item in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb))
  loop
    qty := greatest(0, least(1000, coalesce((item->>'quantity')::int, 0)));
    unit_price := 0;
    matched := false;

    for variant in
      select v
      from public.products p,
           lateral jsonb_array_elements(p.variants) v
      where p.handle = item->>'handle'
        and p.status = 'active'
    loop
      if item->>'variant_title' is null
         or variant->>'title' is not distinct from item->>'variant_title' then
        unit_price := coalesce((variant->>'price')::int, 0);
        matched := true;
        exit;
      end if;
    end loop;

    computed := computed + (unit_price::bigint * qty);
    repriced := repriced || jsonb_build_object(
      'handle', item->>'handle',
      'title', item->>'title',
      'variant_title', item->>'variant_title',
      'quantity', qty,
      'price', unit_price,
      'price_verified', matched
    );
  end loop;

  new.items := repriced;
  new.subtotal := least(computed, 100000000)::int;
  return new;
end;
$$;

drop trigger if exists orders_price_check on public.orders;
create trigger orders_price_check
before insert on public.orders
for each row execute function public.gtz_price_order();
