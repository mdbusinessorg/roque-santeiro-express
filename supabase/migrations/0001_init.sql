-- Roque Santeiro Express — schema marketplace multi-vendedor
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role text not null default 'customer' check (role in ('customer','seller','ops','admin','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  image_url text,
  sort int not null default 0,
  commission_rate numeric(5,2)
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text unique not null,
  name text not null,
  responsible_name text,
  description text,
  logo_url text,
  banner_url text,
  phone text,
  whatsapp text,
  email text,
  province text,
  city text,
  address text,
  documents_url text,
  status text not null default 'pending' check (status in ('pending','info_requested','approved','rejected','suspended')),
  admin_note text,
  is_official boolean not null default false,
  commission_rate numeric(5,2),
  delivery_methods text[] not null default array['seller','rse','pickup'],
  rating numeric(3,2) not null default 0,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists stores_owner_idx on public.stores(owner_id);
create index if not exists stores_status_idx on public.stores(status);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  slug text unique not null,
  name text not null,
  description text,
  brand text,
  sku text,
  price numeric(14,2) not null check (price >= 0),
  compare_at_price numeric(14,2) check (compare_at_price is null or compare_at_price >= 0),
  stock int not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  specs jsonb not null default '{}',
  status text not null default 'active' check (status in ('draft','pending_review','active','inactive','rejected')),
  featured boolean not null default false,
  sponsored boolean not null default false,
  sold_count int not null default 0,
  rating numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_store_idx on public.products(store_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_name_trgm on public.products using gin (to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigserial unique,
  customer_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','awaiting_payment','paid','processing','shipped','delivered','cancelled','refund_requested','refunded')),
  payment_status text not null default 'pending' check (payment_status in ('pending','awaiting_confirmation','paid','failed','refunded','partially_refunded')),
  payment_method text not null check (payment_method in ('multicaixa_express','transfer','cash_on_delivery','manual')),
  payment_reference text,
  payment_proof_url text,
  contact_name text not null,
  contact_phone text not null,
  address jsonb not null default '{}',
  notes text,
  subtotal numeric(14,2) not null default 0,
  shipping_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders(customer_id);

create table if not exists public.sub_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  status text not null default 'new' check (status in ('new','confirmed','preparing','ready','shipped','delivered','cancelled','returned')),
  delivery_method text not null default 'rse' check (delivery_method in ('seller','rse','pickup')),
  shipping_fee numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  commission_rate numeric(5,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  seller_net numeric(14,2) not null default 0,
  tracking_code text unique default upper(substr(md5(random()::text),1,10)),
  received_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sub_orders_order_idx on public.sub_orders(order_id);
create index if not exists sub_orders_store_idx on public.sub_orders(store_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sub_order_id uuid not null references public.sub_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image text,
  unit_price numeric(14,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(14,2) not null
);
create index if not exists order_items_sub_idx on public.order_items(sub_order_id);

create table if not exists public.sub_order_events (
  id bigserial primary key,
  sub_order_id uuid not null references public.sub_orders(id) on delete cascade,
  status text not null,
  note text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','approved','paid','rejected')),
  iban text,
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb,
  created_at timestamptz not null default now()
);

-- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('admin','super_admin','ops'));
$$;

create or replace function public.my_store_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from stores where owner_id = auth.uid();
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, phone, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() and current_user not in ('postgres','service_role','supabase_admin') then
    new.role := old.role;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

create or replace function public.guard_store() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_admin() or current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.is_official := false; new.commission_rate := null; new.admin_note := null; new.owner_id := auth.uid();
  else
    new.status := old.status; new.is_official := old.is_official; new.commission_rate := old.commission_rate;
    new.admin_note := old.admin_note; new.owner_id := old.owner_id; new.rating := old.rating;
    if old.status = 'info_requested' then new.status := 'pending'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_store on public.stores;
create trigger guard_store before insert or update on public.stores for each row execute function public.guard_store();

create or replace function public.guard_product() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() or current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if tg_op = 'UPDATE' then
    new.sold_count := old.sold_count; new.rating := old.rating; new.rating_count := old.rating_count;
    new.sponsored := old.sponsored; new.featured := old.featured; new.store_id := old.store_id;
  else
    new.sold_count := 0; new.sponsored := false; new.featured := false;
  end if;
  if new.status not in ('draft','active','inactive') then new.status := 'draft'; end if;
  return new;
end $$;
drop trigger if exists guard_product on public.products;
create trigger guard_product before insert or update on public.products for each row execute function public.guard_product();

-- RLS
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.sub_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sub_order_events enable row level security;
alter table public.wishlists enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists p_profiles_sel on public.profiles;
create policy p_profiles_sel on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists p_settings_sel on public.settings;
create policy p_settings_sel on public.settings for select using (true);
drop policy if exists p_settings_adm on public.settings;
create policy p_settings_adm on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_cat_sel on public.categories;
create policy p_cat_sel on public.categories for select using (true);
drop policy if exists p_cat_adm on public.categories;
create policy p_cat_adm on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_store_sel on public.stores;
create policy p_store_sel on public.stores for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
drop policy if exists p_store_ins on public.stores;
create policy p_store_ins on public.stores for insert with check (auth.uid() is not null);
drop policy if exists p_store_upd on public.stores;
create policy p_store_upd on public.stores for update using (owner_id = auth.uid() or public.is_admin());
drop policy if exists p_store_del on public.stores;
create policy p_store_del on public.stores for delete using (public.is_admin());

drop policy if exists p_prod_sel on public.products;
create policy p_prod_sel on public.products for select using (
  (status = 'active' and exists(select 1 from stores s where s.id = store_id and s.status = 'approved'))
  or store_id in (select public.my_store_ids()) or public.is_admin());
drop policy if exists p_prod_ins on public.products;
create policy p_prod_ins on public.products for insert with check (
  public.is_admin() or exists(select 1 from stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved'));
drop policy if exists p_prod_upd on public.products;
create policy p_prod_upd on public.products for update using (
  public.is_admin() or exists(select 1 from stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved'));
drop policy if exists p_prod_del on public.products;
create policy p_prod_del on public.products for delete using (public.is_admin() or store_id in (select public.my_store_ids()));

drop policy if exists p_orders_sel on public.orders;
create policy p_orders_sel on public.orders for select using (
  customer_id = auth.uid() or public.is_admin()
  or exists(select 1 from sub_orders so where so.order_id = orders.id and so.store_id in (select public.my_store_ids())));

drop policy if exists p_sub_sel on public.sub_orders;
create policy p_sub_sel on public.sub_orders for select using (
  public.is_admin() or store_id in (select public.my_store_ids())
  or exists(select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));

drop policy if exists p_items_sel on public.order_items;
create policy p_items_sel on public.order_items for select using (
  public.is_admin()
  or exists(select 1 from sub_orders so where so.id = sub_order_id and so.store_id in (select public.my_store_ids()))
  or exists(select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));

drop policy if exists p_events_sel on public.sub_order_events;
create policy p_events_sel on public.sub_order_events for select using (
  exists(select 1 from sub_orders so where so.id = sub_order_id));

drop policy if exists p_wish_all on public.wishlists;
create policy p_wish_all on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_payout_sel on public.payouts;
create policy p_payout_sel on public.payouts for select using (public.is_admin() or store_id in (select public.my_store_ids()));
drop policy if exists p_payout_adm on public.payouts;
create policy p_payout_adm on public.payouts for update using (public.is_admin());

drop policy if exists p_audit_sel on public.audit_logs;
create policy p_audit_sel on public.audit_logs for select using (public.is_admin());

create or replace function public.commission_for(p_store uuid, p_category uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select commission_rate from stores where id = p_store),
    (select commission_rate from categories where id = p_category),
    (select (value->>'rate')::numeric from settings where key = 'commission'),
    5);
$$;

-- helpers anti-recursão RLS
create or replace function public.my_order_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from orders where customer_id = auth.uid();
$$;
create or replace function public.my_seller_order_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select so.order_id from sub_orders so join stores s on s.id = so.store_id where s.owner_id = auth.uid();
$$;
drop policy if exists p_orders_sel on public.orders;
create policy p_orders_sel on public.orders for select using (
  customer_id = auth.uid() or public.is_admin() or id in (select public.my_seller_order_ids()));
drop policy if exists p_sub_sel on public.sub_orders;
create policy p_sub_sel on public.sub_orders for select using (
  public.is_admin() or store_id in (select public.my_store_ids()) or order_id in (select public.my_order_ids()));
drop policy if exists p_items_sel on public.order_items;
create policy p_items_sel on public.order_items for select using (
  public.is_admin() or order_id in (select public.my_order_ids())
  or sub_order_id in (select so.id from sub_orders so where so.store_id in (select public.my_store_ids())));

-- place_order: encomenda principal + subencomendas por loja, valida e reserva stock
create or replace function public.place_order(
  p_items jsonb, p_contact_name text, p_contact_phone text, p_address jsonb,
  p_payment_method text, p_delivery jsonb default '{}'::jsonb, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid; v_number bigint; v_store record; v_sub uuid; v_item jsonb; v_prod record;
  v_qty int; v_rate numeric; v_sub_subtotal numeric; v_sub_comm numeric; v_method text; v_fee numeric;
  v_fees jsonb := coalesce((select value from settings where key = 'shipping'), '{"rse":2500,"seller":1500,"pickup":0}'::jsonb);
  v_subtotal numeric := 0; v_ship numeric := 0;
begin
  if v_uid is null then raise exception 'Precisa de iniciar sessão'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Carrinho vazio'; end if;
  if p_payment_method not in ('multicaixa_express','transfer','cash_on_delivery','manual') then raise exception 'Método de pagamento inválido'; end if;
  if coalesce(trim(p_contact_name),'') = '' or coalesce(trim(p_contact_phone),'') = '' then raise exception 'Contacto obrigatório'; end if;

  insert into orders(customer_id, status, payment_status, payment_method, contact_name, contact_phone, address, notes)
  values (v_uid, case when p_payment_method = 'cash_on_delivery' then 'pending' else 'awaiting_payment' end, 'pending',
          p_payment_method, p_contact_name, p_contact_phone, coalesce(p_address,'{}'), p_notes)
  returning id, number into v_order, v_number;

  for v_store in
    select distinct p.store_id from products p
    where p.id in (select (e->>'product_id')::uuid from jsonb_array_elements(p_items) e)
  loop
    v_method := coalesce(p_delivery->>(v_store.store_id::text), 'rse');
    if v_method not in ('seller','rse','pickup') then v_method := 'rse'; end if;
    v_fee := coalesce((v_fees->>v_method)::numeric, 0);
    insert into sub_orders(order_id, store_id, delivery_method, shipping_fee)
      values (v_order, v_store.store_id, v_method, v_fee) returning id into v_sub;
    v_sub_subtotal := 0; v_sub_comm := 0;
    for v_item in select e from jsonb_array_elements(p_items) e
      where exists(select 1 from products p where p.id = (e->>'product_id')::uuid and p.store_id = v_store.store_id) loop
      v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
      select p.*, s.status as store_status into v_prod from products p join stores s on s.id = p.store_id
        where p.id = (v_item->>'product_id')::uuid for update of p;
      if v_prod.status <> 'active' or v_prod.store_status <> 'approved' then raise exception 'Produto indisponível: %', v_prod.name; end if;
      if v_prod.stock < v_qty then raise exception 'Stock insuficiente para "%" (disponível: %)', v_prod.name, v_prod.stock; end if;
      update products set stock = stock - v_qty, sold_count = sold_count + v_qty where id = v_prod.id;
      v_rate := public.commission_for(v_prod.store_id, v_prod.category_id);
      insert into order_items(order_id, sub_order_id, product_id, name, image, unit_price, quantity, line_total)
        values (v_order, v_sub, v_prod.id, v_prod.name, v_prod.images[1], v_prod.price, v_qty, v_prod.price * v_qty);
      v_sub_subtotal := v_sub_subtotal + v_prod.price * v_qty;
      v_sub_comm := v_sub_comm + round(v_prod.price * v_qty * v_rate / 100, 2);
    end loop;
    update sub_orders set subtotal = v_sub_subtotal, commission_amount = v_sub_comm,
      commission_rate = case when v_sub_subtotal > 0 then round(v_sub_comm * 100 / v_sub_subtotal, 2) else 0 end,
      seller_net = v_sub_subtotal - v_sub_comm where id = v_sub;
    insert into sub_order_events(sub_order_id, status, actor_id) values (v_sub, 'new', v_uid);
    v_subtotal := v_subtotal + v_sub_subtotal;
    v_ship := v_ship + v_fee;
  end loop;

  update orders set subtotal = v_subtotal, shipping_total = v_ship, total = v_subtotal + v_ship where id = v_order;
  insert into audit_logs(actor_id, action, entity, entity_id, data)
    values (v_uid, 'order.created', 'order', v_order::text, jsonb_build_object('total', v_subtotal + v_ship));
  return jsonb_build_object('id', v_order, 'number', v_number, 'total', v_subtotal + v_ship);
end $$;

create or replace function public.submit_payment_proof(p_order uuid, p_reference text, p_proof_url text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set payment_reference = p_reference, payment_proof_url = coalesce(p_proof_url, payment_proof_url),
    payment_status = 'awaiting_confirmation'
  where id = p_order and customer_id = auth.uid() and payment_status in ('pending','failed');
  if not found then raise exception 'Encomenda não encontrada'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'payment.proof_submitted', 'order', p_order::text, jsonb_build_object('reference', p_reference));
end $$;

create or replace function public.admin_set_payment(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_status not in ('paid','failed','refunded','partially_refunded','pending','awaiting_confirmation') then raise exception 'Estado inválido'; end if;
  update orders set payment_status = p_status,
    status = case when p_status = 'paid' and status in ('pending','awaiting_payment') then 'paid'
                  when p_status = 'refunded' then 'refunded' else status end
  where id = p_order;
  insert into audit_logs(actor_id, action, entity, entity_id) values (auth.uid(), 'payment.' || p_status, 'order', p_order::text);
end $$;

create or replace function public.admin_set_store_status(p_store uuid, p_status text, p_note text default null, p_commission numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update stores set status = p_status, admin_note = p_note, commission_rate = coalesce(p_commission, commission_rate)
    where id = p_store returning owner_id into v_owner;
  if p_status = 'approved' and v_owner is not null then
    update profiles set role = 'seller' where id = v_owner and role = 'customer';
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'store.' || p_status, 'store', p_store::text, jsonb_build_object('note', p_note, 'commission', p_commission));
end $$;

create or replace function public.set_sub_order_status(p_sub uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_store uuid; v_old text;
begin
  select store_id, status into v_store, v_old from sub_orders where id = p_sub for update;
  if v_store is null then raise exception 'Subencomenda não encontrada'; end if;
  if not (public.is_admin() or v_store in (select public.my_store_ids())) then raise exception 'Sem permissão'; end if;
  if p_status not in ('new','confirmed','preparing','ready','shipped','delivered','cancelled','returned') then raise exception 'Estado inválido'; end if;
  if p_status = 'cancelled' and v_old <> 'cancelled' then
    update products p set stock = p.stock + oi.quantity, sold_count = greatest(0, p.sold_count - oi.quantity)
    from order_items oi where oi.sub_order_id = p_sub and oi.product_id = p.id;
  end if;
  update sub_orders set status = p_status where id = p_sub;
  insert into sub_order_events(sub_order_id, status, note, actor_id) values (p_sub, p_status, p_note, auth.uid());
  insert into audit_logs(actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'sub_order.' || p_status, 'sub_order', p_sub::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public.confirm_received(p_sub uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sub_orders so set status = 'delivered', received_confirmed_at = now()
  from orders o where so.id = p_sub and o.id = so.order_id and o.customer_id = auth.uid();
  if not found then raise exception 'Não encontrado'; end if;
  insert into sub_order_events(sub_order_id, status, note, actor_id) values (p_sub, 'delivered', 'Receção confirmada pelo cliente', auth.uid());
end $$;

create or replace function public.store_balance(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_avail numeric; v_pending numeric; v_paidout numeric;
begin
  if not (public.is_admin() or p_store in (select public.my_store_ids())) then raise exception 'Sem permissão'; end if;
  select coalesce(sum(so.seller_net),0) into v_avail from sub_orders so join orders o on o.id = so.order_id
    where so.store_id = p_store and o.payment_status = 'paid' and so.status = 'delivered';
  select coalesce(sum(so.seller_net),0) into v_pending from sub_orders so join orders o on o.id = so.order_id
    where so.store_id = p_store and so.status not in ('delivered','cancelled','returned') and o.payment_status <> 'failed';
  select coalesce(sum(amount),0) into v_paidout from payouts where store_id = p_store and status in ('requested','approved','paid');
  return jsonb_build_object('available', v_avail - v_paidout, 'pending', v_pending, 'withdrawn', v_paidout);
end $$;

create or replace function public.request_payout(p_store uuid, p_amount numeric, p_iban text) returns void
language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  if p_store not in (select public.my_store_ids()) then raise exception 'Sem permissão'; end if;
  v_bal := (public.store_balance(p_store)->>'available')::numeric;
  if p_amount <= 0 or p_amount > v_bal then raise exception 'Valor superior ao saldo disponível'; end if;
  insert into payouts(store_id, amount, iban) values (p_store, p_amount, p_iban);
  insert into audit_logs(actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'payout.requested', 'store', p_store::text, jsonb_build_object('amount', p_amount));
end $$;

revoke execute on function public.place_order(jsonb,text,text,jsonb,text,jsonb,text) from anon, public;
revoke execute on function public.admin_set_payment(uuid,text) from anon, public;
revoke execute on function public.admin_set_store_status(uuid,text,text,numeric) from anon, public;
grant execute on function public.place_order(jsonb,text,text,jsonb,text,jsonb,text) to authenticated;
grant execute on function public.admin_set_payment(uuid,text) to authenticated;
grant execute on function public.admin_set_store_status(uuid,text,text,numeric) to authenticated;

insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_write on storage.objects;
create policy media_write on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

insert into settings(key, value) values
  ('commission', '{"rate":5}'),
  ('shipping', '{"rse":2500,"seller":1500,"pickup":0}'),
  ('payment', '{"multicaixa_express_phone":"","iban":"","bank":"","beneficiary":"Roque Santeiro Express"}')
on conflict (key) do nothing;
