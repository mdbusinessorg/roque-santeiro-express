create table if not exists public.ledger_entries (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  entry_type text not null check (entry_type in ('payment_received','platform_commission','seller_credit','release_to_available','reserve','reserve_release','refund','adjustment','payout_requested','payout_paid','payout_rejected')),
  account text not null check (account in ('platform_cash','platform_revenue','seller_pending','seller_available','seller_reserved','seller_payout_hold','seller_paid','customer_refunds')),
  amount numeric(14,2) not null,
  store_id uuid references public.stores(id),
  order_id uuid references public.orders(id),
  sub_order_id uuid references public.sub_orders(id),
  payout_id uuid references public.payouts(id),
  idempotency_key text not null,
  actor_id uuid,
  memo text,
  meta jsonb not null default '{}'::jsonb,
  unique (idempotency_key, account)
);
create index if not exists ledger_store_idx on public.ledger_entries(store_id, account);
create index if not exists ledger_order_idx on public.ledger_entries(order_id);
create or replace function public.ledger_immutable() returns trigger language plpgsql as $$
begin raise exception 'Ledger é imutável: crie um movimento de ajuste'; end $$;
drop trigger if exists ledger_no_update on public.ledger_entries;
create trigger ledger_no_update before update or delete on public.ledger_entries for each row execute function public.ledger_immutable();
alter table public.ledger_entries enable row level security;
drop policy if exists ledger_read on public.ledger_entries;
create policy ledger_read on public.ledger_entries for select using (public.is_admin() or store_id in (select public.my_store_ids()));

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  provider_ref text not null,
  kind text not null check (kind in ('charge','refund','payout')),
  order_id uuid references public.orders(id),
  payout_id uuid references public.payouts(id),
  amount numeric(14,2) not null,
  status text not null,
  idempotency_key text unique,
  raw jsonb not null default '{}'::jsonb,
  unique (provider, provider_ref)
);
alter table public.payment_transactions enable row level security;
drop policy if exists ptx_admin on public.payment_transactions;
create policy ptx_admin on public.payment_transactions for select using (public.is_admin());

alter table public.payouts drop constraint if exists payouts_status_check;
update public.payouts set status = 'pending' where status = 'requested';
alter table public.payouts alter column status set default 'pending';
alter table public.payouts add constraint payouts_status_check check (status in ('pending','in_review','approved','processing','paid','rejected'));
alter table public.payouts add column if not exists account_holder text, add column if not exists bank_name text,
  add column if not exists provider text, add column if not exists provider_reference text,
  add column if not exists reviewed_by uuid, add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text, add column if not exists requested_by uuid;
insert into public.settings(key, value) values ('payout_mode', '{"mode":"bank_transfer_manual","min_amount":5000}'::jsonb) on conflict (key) do nothing;

create or replace function public.ledger_post(p_type text, p_account text, p_amount numeric, p_key text, p_store uuid, p_order uuid, p_sub uuid, p_payout uuid, p_memo text)
returns void language sql security definer set search_path to 'public' as $$
  insert into ledger_entries(entry_type, account, amount, idempotency_key, store_id, order_id, sub_order_id, payout_id, memo, actor_id)
  values (p_type, p_account, p_amount, p_key, p_store, p_order, p_sub, p_payout, p_memo, auth.uid())
  on conflict (idempotency_key, account) do nothing;
$$;
revoke execute on function public.ledger_post(text,text,numeric,text,uuid,uuid,uuid,uuid,text) from public, anon, authenticated;

create or replace function public.ledger_on_payment() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare s record;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    perform ledger_post('payment_received','platform_cash', new.total, 'pay:'||new.id, null, new.id, null, null, 'Pagamento confirmado #'||new.number);
    for s in select * from sub_orders where order_id = new.id loop
      perform ledger_post('platform_commission','platform_revenue', s.commission_amount, 'comm:'||s.id, s.store_id, new.id, s.id, null, 'Comissão');
      perform ledger_post('seller_credit','seller_pending', s.seller_net, 'credit:'||s.id, s.store_id, new.id, s.id, null, 'Valor do vendedor (aguarda entrega)');
      if s.status = 'delivered' then
        perform ledger_post('release_to_available','seller_pending', -s.seller_net, 'release:'||s.id, s.store_id, new.id, s.id, null, 'Entregue');
        perform ledger_post('release_to_available','seller_available', s.seller_net, 'release:'||s.id, s.store_id, new.id, s.id, null, 'Entregue');
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists orders_ledger on public.orders;
create trigger orders_ledger after update of payment_status on public.orders for each row execute function public.ledger_on_payment();

create or replace function public.ledger_on_delivery() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered'
     and exists (select 1 from ledger_entries where idempotency_key = 'credit:'||new.id) then
    perform ledger_post('release_to_available','seller_pending', -new.seller_net, 'release:'||new.id, new.store_id, new.order_id, new.id, null, 'Entregue');
    perform ledger_post('release_to_available','seller_available', new.seller_net, 'release:'||new.id, new.store_id, new.order_id, new.id, null, 'Entregue');
  end if;
  return new;
end $$;
drop trigger if exists sub_orders_ledger on public.sub_orders;
create trigger sub_orders_ledger after update of status on public.sub_orders for each row execute function public.ledger_on_delivery();
drop function if exists public.request_payout(uuid, numeric, text);
create or replace function public.store_balance(p_store uuid) returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if not (public.is_admin() or p_store in (select public.my_store_ids())) then raise exception 'Sem permissão'; end if;
  select jsonb_build_object(
    'pending', coalesce(sum(amount) filter (where account='seller_pending'),0),
    'available', coalesce(sum(amount) filter (where account='seller_available'),0),
    'reserved', coalesce(sum(amount) filter (where account='seller_reserved'),0),
    'in_payout', coalesce(sum(amount) filter (where account='seller_payout_hold'),0),
    'withdrawn', coalesce(sum(amount) filter (where account='seller_paid'),0),
    'to_receive', coalesce(sum(amount) filter (where account in ('seller_pending','seller_available','seller_reserved','seller_payout_hold')),0))
  into r from ledger_entries where store_id = p_store;
  return r;
end $$;

create or replace function public.request_payout(p_store uuid, p_amount numeric, p_iban text, p_holder text default null, p_bank text default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare v_avail numeric; v_id uuid; v_cfg jsonb := coalesce((select value from settings where key='payout_mode'),'{}');
begin
  if p_store not in (select public.my_store_ids()) then raise exception 'Sem permissão'; end if;
  if coalesce(v_cfg->>'mode','disabled') = 'disabled' then raise exception 'Liquidações ainda não disponíveis no modelo de pagamento contratado'; end if;
  perform 1 from stores where id = p_store for update;
  v_avail := (public.store_balance(p_store)->>'available')::numeric;
  if p_amount is null or p_amount <= 0 or p_amount > v_avail then raise exception 'Valor superior ao saldo disponível'; end if;
  if p_amount < coalesce((v_cfg->>'min_amount')::numeric,0) then raise exception 'Valor abaixo do mínimo de liquidação'; end if;
  if coalesce(trim(p_iban),'') = '' then raise exception 'Indique o IBAN'; end if;
  insert into payouts(store_id, amount, iban, account_holder, bank_name, status, requested_by) values (p_store, p_amount, p_iban, p_holder, p_bank, 'pending', auth.uid()) returning id into v_id;
  perform ledger_post('payout_requested','seller_available', -p_amount, 'payreq:'||v_id, p_store, null, null, v_id, 'Pedido de liquidação');
  perform ledger_post('payout_requested','seller_payout_hold', p_amount, 'payreq:'||v_id, p_store, null, null, v_id, 'Pedido de liquidação');
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), 'payout.requested', 'payout', v_id::text, jsonb_build_object('amount', p_amount));
  return v_id;
end $$;

create or replace function public.admin_set_payout_status(p_payout uuid, p_status text, p_reference text default null, p_note text default null) returns void
language plpgsql security definer set search_path to 'public' as $$
declare p record;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into p from payouts where id = p_payout for update;
  if p.id is null then raise exception 'Liquidação não encontrada'; end if;
  if p.status in ('paid','rejected') then raise exception 'Liquidação já encerrada'; end if;
  if not ((p.status='pending' and p_status in ('in_review','approved','rejected')) or (p.status='in_review' and p_status in ('approved','rejected'))
       or (p.status='approved' and p_status in ('processing','rejected')) or (p.status='processing' and p_status in ('paid','rejected'))) then
    raise exception 'Transição inválida: % -> %', p.status, p_status; end if;
  if p_status = 'paid' and coalesce(trim(p_reference),'') = '' then raise exception 'Indique a referência da transferência confirmada pelo banco/prestador'; end if;
  if p_status = 'rejected' and coalesce(trim(p_note),'') = '' then raise exception 'Indique o motivo da rejeição'; end if;
  update payouts set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
    provider_reference = coalesce(p_reference, provider_reference), rejection_reason = case when p_status='rejected' then p_note else rejection_reason end,
    note = coalesce(p_note, note), processed_at = case when p_status in ('paid','rejected') then now() else processed_at end where id = p_payout;
  if p_status = 'paid' then
    perform ledger_post('payout_paid','seller_payout_hold', -p.amount, 'paypaid:'||p.id, p.store_id, null, null, p.id, 'Liquidação paga ref '||p_reference);
    perform ledger_post('payout_paid','seller_paid', p.amount, 'paypaid:'||p.id, p.store_id, null, null, p.id, 'Liquidação paga ref '||p_reference);
    perform ledger_post('payout_paid','platform_cash', -p.amount, 'paypaid:'||p.id, p.store_id, null, null, p.id, 'Saída liquidação ref '||p_reference);
  elsif p_status = 'rejected' then
    perform ledger_post('payout_rejected','seller_payout_hold', -p.amount, 'payrej:'||p.id, p.store_id, null, null, p.id, 'Liquidação rejeitada');
    perform ledger_post('payout_rejected','seller_available', p.amount, 'payrej:'||p.id, p.store_id, null, null, p.id, 'Liquidação rejeitada');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), 'payout.'||p_status, 'payout', p.id::text, jsonb_build_object('reference', p_reference, 'note', p_note));
end $$;
create or replace function public.ledger_post_order(p_order uuid) returns void language plpgsql security definer set search_path to 'public' as $$
declare o record; s record;
begin
  select * into o from orders where id = p_order;
  perform ledger_post('payment_received','platform_cash', o.total, 'pay:'||o.id, null, o.id, null, null, 'Pagamento confirmado #'||o.number);
  for s in select * from sub_orders where order_id = o.id loop
    perform ledger_post('platform_commission','platform_revenue', s.commission_amount, 'comm:'||s.id, s.store_id, o.id, s.id, null, 'Comissão');
    perform ledger_post('seller_credit','seller_pending', s.seller_net, 'credit:'||s.id, s.store_id, o.id, s.id, null, 'Valor do vendedor (aguarda entrega)');
    if s.status = 'delivered' then
      perform ledger_post('release_to_available','seller_pending', -s.seller_net, 'release:'||s.id, s.store_id, o.id, s.id, null, 'Entregue');
      perform ledger_post('release_to_available','seller_available', s.seller_net, 'release:'||s.id, s.store_id, o.id, s.id, null, 'Entregue');
    end if;
  end loop;
end $$;
revoke execute on function public.ledger_post_order(uuid) from public, anon, authenticated;

create or replace function public.ledger_on_payment() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then perform ledger_post_order(new.id); end if;
  return new;
end $$;

create or replace function public.admin_refund_sub(p_sub uuid, p_reason text) returns void language plpgsql security definer set search_path to 'public' as $$
declare s record; v_acc text; v_total numeric;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Indique o motivo do reembolso'; end if;
  select * into s from sub_orders where id = p_sub for update;
  if s.id is null then raise exception 'Subencomenda não encontrada'; end if;
  if not exists (select 1 from ledger_entries where idempotency_key = 'credit:'||s.id) then raise exception 'Subencomenda sem pagamento confirmado'; end if;
  if exists (select 1 from ledger_entries where idempotency_key = 'refund:'||s.id) then raise exception 'Já reembolsada'; end if;
  v_acc := case when exists (select 1 from ledger_entries where idempotency_key = 'release:'||s.id) then 'seller_available' else 'seller_pending' end;
  v_total := s.seller_net + s.commission_amount;
  perform ledger_post('refund', v_acc, -s.seller_net, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  perform ledger_post('refund', 'platform_revenue', -s.commission_amount, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  perform ledger_post('refund', 'platform_cash', -v_total, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  perform ledger_post('refund', 'customer_refunds', v_total, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  update orders set payment_status = case when (select count(*) from sub_orders x where x.order_id = s.order_id and not exists (select 1 from ledger_entries l where l.idempotency_key = 'refund:'||x.id)) = 0 then 'refunded' else 'partially_refunded' end where id = s.order_id;
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), 'refund', 'sub_order', s.id::text, jsonb_build_object('amount', v_total, 'reason', p_reason));
end $$;

create or replace function public.admin_ledger_adjust(p_store uuid, p_amount numeric, p_memo text) returns void language plpgsql security definer set search_path to 'public' as $$
declare k text := 'adj:'||gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if coalesce(p_amount,0) = 0 or coalesce(trim(p_memo),'') = '' then raise exception 'Valor e motivo obrigatórios'; end if;
  perform ledger_post('adjustment','seller_available', p_amount, k, p_store, null, null, null, p_memo);
  perform ledger_post('adjustment','platform_revenue', -p_amount, k, p_store, null, null, null, p_memo);
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), 'ledger.adjust', 'store', p_store::text, jsonb_build_object('amount', p_amount, 'memo', p_memo));
end $$;

create or replace function public.admin_reserve(p_store uuid, p_amount numeric, p_memo text, p_release boolean default false) returns void language plpgsql security definer set search_path to 'public' as $$
declare k text := 'res:'||gen_random_uuid(); b jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if coalesce(p_amount,0) <= 0 or coalesce(trim(p_memo),'') = '' then raise exception 'Valor e motivo obrigatórios'; end if;
  b := public.store_balance(p_store);
  if not p_release and p_amount > (b->>'available')::numeric then raise exception 'Valor superior ao disponível'; end if;
  if p_release and p_amount > (b->>'reserved')::numeric then raise exception 'Valor superior à reserva'; end if;
  perform ledger_post(case when p_release then 'reserve_release' else 'reserve' end, 'seller_available', case when p_release then p_amount else -p_amount end, k, p_store, null, null, null, p_memo);
  perform ledger_post(case when p_release then 'reserve_release' else 'reserve' end, 'seller_reserved', case when p_release then -p_amount else p_amount end, k, p_store, null, null, null, p_memo);
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), case when p_release then 'ledger.reserve_release' else 'ledger.reserve' end, 'store', p_store::text, jsonb_build_object('amount', p_amount, 'memo', p_memo));
end $$;

create or replace function public.admin_finance_summary() returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select jsonb_build_object(
    'received', coalesce(sum(amount) filter (where entry_type='payment_received'),0),
    'attributed', coalesce(sum(amount) filter (where entry_type='seller_credit'),0),
    'commissions', coalesce(sum(amount) filter (where account='platform_revenue'),0),
    'refunds', coalesce(sum(amount) filter (where account='customer_refunds'),0),
    'pending', coalesce(sum(amount) filter (where account='seller_pending'),0),
    'available', coalesce(sum(amount) filter (where account='seller_available'),0),
    'reserved', coalesce(sum(amount) filter (where account='seller_reserved'),0),
    'in_payout', coalesce(sum(amount) filter (where account='seller_payout_hold'),0),
    'paid_out', coalesce(sum(amount) filter (where account='seller_paid'),0),
    'cash', coalesce(sum(amount) filter (where account='platform_cash'),0),
    'gateway_charges', (select coalesce(sum(amount),0) from payment_transactions where kind='charge' and status='succeeded'),
    'open_payouts', (select count(*) from payouts where status not in ('paid','rejected')),
    'diffs', (select coalesce(jsonb_agg(d),'[]') from (
       select o.id, o.number, o.total, o.payment_status,
         coalesce((select sum(amount) from ledger_entries l where l.order_id=o.id and l.entry_type='payment_received'),0) as ledger,
         (select sum(amount) from payment_transactions t where t.order_id=o.id and t.kind='charge' and t.status='succeeded') as gateway,
         coalesce((select sum(seller_net+commission_amount) from sub_orders s where s.order_id=o.id),0) as split
       from orders o where o.payment_status in ('paid','refunded','partially_refunded')) d
       where d.ledger <> d.total or (d.gateway is not null and d.gateway <> d.total) or d.split <> d.total))
  into r from ledger_entries;
  return r;
end $$;

create or replace function public.gateway_confirm_payment(p_order uuid, p_amount numeric, p_provider text, p_ref text, p_raw jsonb default '{}') returns text
language plpgsql security definer set search_path to 'public' as $$
declare o record;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') <> 'service_role' then raise exception 'Sem permissão'; end if;
  insert into payment_transactions(provider, provider_ref, kind, order_id, amount, status, idempotency_key, raw)
    values (p_provider, p_ref, 'charge', p_order, p_amount, 'received', p_provider||':'||p_ref, p_raw) on conflict do nothing;
  if not found then return 'duplicate'; end if;
  select * into o from orders where id = p_order for update;
  if o.id is null then update payment_transactions set status='orphan' where provider=p_provider and provider_ref=p_ref; return 'orphan'; end if;
  if p_amount <> o.total then update payment_transactions set status='amount_mismatch' where provider=p_provider and provider_ref=p_ref; return 'amount_mismatch'; end if;
  update payment_transactions set status='succeeded' where provider=p_provider and provider_ref=p_ref;
  if o.payment_status <> 'paid' then
    update orders set payment_status='paid', payment_reference=p_ref, status = case when status in ('pending','awaiting_payment') then 'paid' else status end where id = p_order;
    insert into audit_logs(action, entity, entity_id, data) values ('payment.paid.gateway', 'order', p_order::text, jsonb_build_object('provider', p_provider, 'ref', p_ref));
  end if;
  return 'ok';
end $$;
revoke execute on function public.gateway_confirm_payment(uuid,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.gateway_confirm_payment(uuid,numeric,text,text,jsonb) to service_role;
select public.ledger_post_order(id) from orders where payment_status = 'paid';
alter table public.ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table public.ledger_entries add constraint ledger_entries_entry_type_check check (entry_type in ('payment_received','platform_commission','seller_credit','shipping_fee','release_to_available','reserve','reserve_release','refund','adjustment','payout_requested','payout_paid','payout_rejected'));
alter table public.ledger_entries drop constraint if exists ledger_entries_account_check;
alter table public.ledger_entries add constraint ledger_entries_account_check check (account in ('platform_cash','platform_revenue','platform_shipping','seller_pending','seller_available','seller_reserved','seller_payout_hold','seller_paid','customer_refunds'));
create or replace function public.seller_amount(s public.sub_orders) returns numeric language sql immutable as $$
  select s.seller_net + case when s.delivery_method = 'seller' then s.shipping_fee else 0 end $$;
create or replace function public.ledger_post_order(p_order uuid) returns void language plpgsql security definer set search_path to 'public' as $$
declare o record; s sub_orders;
begin
  select * into o from orders where id = p_order;
  perform ledger_post('payment_received','platform_cash', o.total, 'pay:'||o.id, null, o.id, null, null, 'Pagamento confirmado #'||o.number);
  for s in select * from sub_orders where order_id = o.id loop
    perform ledger_post('platform_commission','platform_revenue', s.commission_amount, 'comm:'||s.id, s.store_id, o.id, s.id, null, 'Comissão');
    perform ledger_post('seller_credit','seller_pending', s.seller_net, 'credit:'||s.id, s.store_id, o.id, s.id, null, 'Valor do vendedor (aguarda entrega)');
    if s.shipping_fee > 0 then
      perform ledger_post('shipping_fee', case when s.delivery_method='seller' then 'seller_pending' else 'platform_shipping' end, s.shipping_fee, 'ship:'||s.id, s.store_id, o.id, s.id, null, 'Portes ('||s.delivery_method||')');
    end if;
    if s.status = 'delivered' then
      perform ledger_post('release_to_available','seller_pending', -seller_amount(s), 'release:'||s.id, s.store_id, o.id, s.id, null, 'Entregue');
      perform ledger_post('release_to_available','seller_available', seller_amount(s), 'release:'||s.id, s.store_id, o.id, s.id, null, 'Entregue');
    end if;
  end loop;
end $$;
revoke execute on function public.ledger_post_order(uuid) from public, anon, authenticated;
create or replace function public.ledger_on_delivery() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered'
     and exists (select 1 from ledger_entries where idempotency_key = 'credit:'||new.id) then
    perform ledger_post('release_to_available','seller_pending', -seller_amount(new), 'release:'||new.id, new.store_id, new.order_id, new.id, null, 'Entregue');
    perform ledger_post('release_to_available','seller_available', seller_amount(new), 'release:'||new.id, new.store_id, new.order_id, new.id, null, 'Entregue');
  end if;
  return new;
end $$;
select public.ledger_post_order(id) from orders where payment_status = 'paid';
create or replace function public.admin_refund_sub(p_sub uuid, p_reason text) returns void language plpgsql security definer set search_path to 'public' as $$
declare s sub_orders; v_acc text; v_total numeric; v_ship_platform numeric;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Indique o motivo do reembolso'; end if;
  select * into s from sub_orders where id = p_sub for update;
  if s.id is null then raise exception 'Subencomenda não encontrada'; end if;
  if not exists (select 1 from ledger_entries where idempotency_key = 'credit:'||s.id) then raise exception 'Subencomenda sem pagamento confirmado'; end if;
  if exists (select 1 from ledger_entries where idempotency_key = 'refund:'||s.id) then raise exception 'Já reembolsada'; end if;
  v_acc := case when exists (select 1 from ledger_entries where idempotency_key = 'release:'||s.id) then 'seller_available' else 'seller_pending' end;
  v_ship_platform := case when s.delivery_method = 'seller' then 0 else s.shipping_fee end;
  v_total := s.seller_net + s.commission_amount + s.shipping_fee;
  perform ledger_post('refund', v_acc, -seller_amount(s), 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  perform ledger_post('refund', 'platform_revenue', -s.commission_amount, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  if v_ship_platform > 0 then perform ledger_post('refund', 'platform_shipping', -v_ship_platform, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason); end if;
  perform ledger_post('refund', 'platform_cash', -v_total, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  perform ledger_post('refund', 'customer_refunds', v_total, 'refund:'||s.id, s.store_id, s.order_id, s.id, null, p_reason);
  update orders set payment_status = case when (select count(*) from sub_orders x where x.order_id = s.order_id and not exists (select 1 from ledger_entries l where l.idempotency_key = 'refund:'||x.id)) = 0 then 'refunded' else 'partially_refunded' end where id = s.order_id;
  insert into audit_logs(actor_id, action, entity, entity_id, data) values (auth.uid(), 'refund', 'sub_order', s.id::text, jsonb_build_object('amount', v_total, 'reason', p_reason));
end $$;

create or replace function public.admin_finance_summary() returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select jsonb_build_object(
    'received', coalesce(sum(amount) filter (where entry_type='payment_received'),0),
    'attributed', coalesce(sum(amount) filter (where entry_type='seller_credit'),0),
    'commissions', coalesce(sum(amount) filter (where account='platform_revenue'),0),
    'refunds', coalesce(sum(amount) filter (where account='customer_refunds'),0),
    'pending', coalesce(sum(amount) filter (where account='seller_pending'),0),
    'available', coalesce(sum(amount) filter (where account='seller_available'),0),
    'reserved', coalesce(sum(amount) filter (where account='seller_reserved'),0),
    'in_payout', coalesce(sum(amount) filter (where account='seller_payout_hold'),0),
    'paid_out', coalesce(sum(amount) filter (where account='seller_paid'),0),
    'shipping', coalesce(sum(amount) filter (where account='platform_shipping'),0),
    'cash', coalesce(sum(amount) filter (where account='platform_cash'),0),
    'gateway_charges', (select coalesce(sum(amount),0) from payment_transactions where kind='charge' and status='succeeded'),
    'open_payouts', (select count(*) from payouts where status not in ('paid','rejected')),
    'diffs', (select coalesce(jsonb_agg(d),'[]') from (
       select o.id, o.number, o.total, o.payment_status,
         coalesce((select sum(amount) from ledger_entries l where l.order_id=o.id and l.entry_type='payment_received'),0) as ledger,
         (select sum(amount) from payment_transactions t where t.order_id=o.id and t.kind='charge' and t.status='succeeded') as gateway,
         coalesce((select sum(seller_net+commission_amount+shipping_fee) from sub_orders s where s.order_id=o.id),0) as split
       from orders o where o.payment_status in ('paid','refunded','partially_refunded')) d
       where d.ledger <> d.total or (d.gateway is not null and d.gateway <> d.total) or d.split <> d.total))
  into r from ledger_entries;
  return r;
end $$;

drop policy if exists p_payout_adm on public.payouts;
