-- 0020: vídeo nos produtos/lojas, frete e prazo por produto, secção AMARROS (consignação)

alter table public.products add column if not exists shipping_fee numeric(12,2);
alter table public.products add column if not exists delivery_time text;
alter table public.products add column if not exists video_url text;
alter table public.stores add column if not exists video_url text;

insert into public.categories (slug, name, sort)
values ('amarros', 'Amarros', 99)
on conflict (slug) do nothing;

create table if not exists public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null check (price > 0),
  photos text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.consignment_items enable row level security;

-- O cliente vê e cria apenas os seus pedidos de consignação.
drop policy if exists consignment_select_own on public.consignment_items;
create policy consignment_select_own on public.consignment_items for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists consignment_insert_own on public.consignment_items;
create policy consignment_insert_own on public.consignment_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists consignment_update_staff on public.consignment_items;
create policy consignment_update_staff on public.consignment_items for update to authenticated using (public.is_admin());

-- A aprovação cria o produto na loja oficial dentro da categoria AMARROS.
create or replace function public.approve_consignment(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.consignment_items%rowtype;
  v_store uuid;
  v_cat uuid;
  v_slug text;
  v_product uuid;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;
  select * into v_item from public.consignment_items where id = p_id for update;
  if not found then raise exception 'Item não encontrado'; end if;
  if v_item.status <> 'pending' then raise exception 'Item já revisto'; end if;

  select id into v_store from public.stores where is_official order by created_at limit 1;
  if v_store is null then raise exception 'Nenhuma loja oficial encontrada'; end if;
  select id into v_cat from public.categories where slug = 'amarros' limit 1;

  v_slug := 'amarros-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.products (store_id, category_id, name, slug, description, price, stock, status, images, specs)
  values (v_store, v_cat, v_item.name, v_slug, coalesce(v_item.description, ''), v_item.price, 1, 'active', v_item.photos, '{}'::jsonb)
  returning id into v_product;

  update public.consignment_items
  set status = 'approved', product_id = v_product, reviewed_at = now()
  where id = p_id;
  return v_product;
end $$;

create or replace function public.reject_consignment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;
  update public.consignment_items
  set status = 'rejected', reviewed_at = now()
  where id = p_id and status = 'pending';
end $$;
