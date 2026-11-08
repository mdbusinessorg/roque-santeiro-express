create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  province text not null,
  city text not null,
  street text not null,
  reference text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.customer_addresses enable row level security;
drop policy if exists customer_addresses_own on public.customer_addresses;
create policy customer_addresses_own on public.customer_addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
