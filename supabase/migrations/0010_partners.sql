-- ROQUE PARTNERS: afiliados, agentes comerciais e representantes regionais
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  kind text not null default 'affiliate' check (kind in ('affiliate','agent','regional')),
  code text not null unique check (code ~ '^[A-Z0-9]{4,16}$'),
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  display_name text not null, phone text, region text, channel text,
  iban text, account_holder text, bank_name text, admin_note text,
  approved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.partner_clicks (
  id bigserial primary key,
  partner_id uuid not null references public.partners(id) on delete cascade,
  visitor text not null, path text, day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (partner_id, visitor, day)
);
alter table public.orders add column if not exists partner_id uuid references public.partners(id);
alter table public.orders add column if not exists partner_attributed_at timestamptz;
create table if not exists public.partner_payments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  amount numeric(14,2) not null check (amount > 0),
  method text not null, reference text not null, note text,
  actor_id uuid default auth.uid(), created_at timestamptz not null default now(),
  unique (partner_id, reference)
);
create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  order_id uuid not null references public.orders(id) on delete restrict,
  sub_order_id uuid not null unique references public.sub_orders(id) on delete restrict,
  order_number int not null,
  sale_amount numeric(14,2) not null,
  platform_commission numeric(14,2) not null,
  rate numeric(6,4) not null,
  amount numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  payment_id uuid references public.partner_payments(id),
  note text,
  created_at timestamptz not null default now(), approved_at timestamptz, paid_at timestamptz, reversed_at timestamptz
);
create table if not exists public.partner_events (
  id bigserial primary key,
  partner_id uuid references public.partners(id) on delete cascade,
  order_id uuid, commission_id uuid,
  event text not null, actor_id uuid default auth.uid(), meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists partner_clicks_p on public.partner_clicks(partner_id, day);
create index if not exists partner_comm_p on public.partner_commissions(partner_id, status);
create index if not exists orders_partner on public.orders(partner_id) where partner_id is not null;

alter table public.partners enable row level security;
alter table public.partner_clicks enable row level security;
alter table public.partner_payments enable row level security;
alter table public.partner_commissions enable row level security;
alter table public.partner_events enable row level security;
drop policy if exists partners_sel on public.partners;
create policy partners_sel on public.partners for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists pclicks_sel on public.partner_clicks;
create policy pclicks_sel on public.partner_clicks for select using (public.is_admin() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
drop policy if exists ppay_sel on public.partner_payments;
create policy ppay_sel on public.partner_payments for select using (public.is_admin() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
drop policy if exists pcomm_sel on public.partner_commissions;
create policy pcomm_sel on public.partner_commissions for select using (public.is_admin() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
drop policy if exists pev_sel on public.partner_events;
create policy pev_sel on public.partner_events for select using (public.is_admin());

alter table public.ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table public.ledger_entries add constraint ledger_entries_entry_type_check check (entry_type in ('payment_received','platform_commission','seller_credit','shipping_fee','release_to_available','reserve','reserve_release','refund','adjustment','payout_requested','payout_paid','payout_rejected','partner_commission','partner_reversal','partner_payout'));
alter table public.ledger_entries drop constraint if exists ledger_entries_account_check;
alter table public.ledger_entries add constraint ledger_entries_account_check check (account in ('platform_cash','platform_revenue','platform_shipping','seller_pending','seller_available','seller_reserved','seller_payout_hold','seller_paid','customer_refunds','partner_payable'));

insert into public.settings(key, value) values ('partners', '{"rate":0.20,"attribution_days":30,"enabled":true}') on conflict (key) do nothing;
create or replace function public.partner_join(p_kind text, p_name text, p_phone text, p_region text, p_channel text) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_base text; i int := 0;
begin
  if auth.uid() is null then raise exception 'Inicie sessão'; end if;
  if p_kind not in ('affiliate','agent','regional') then raise exception 'Tipo inválido'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Indique o nome'; end if;
  select code into v_code from partners where user_id = auth.uid();
  if v_code is not null then return v_code; end if;
  v_base := upper(left(regexp_replace(translate(p_name,'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ','aaaaeeiooouc AAAAEEIOOOUC'),'[^A-Za-z]','','g'),6));
  if length(v_base) < 2 then v_base := 'RS'; end if;
  loop
    v_code := v_base || lpad((floor(random()*10000))::int::text, 4, '0');
    exit when not exists (select 1 from partners where code = v_code);
    i := i + 1; if i > 20 then raise exception 'Tente novamente'; end if;
  end loop;
  insert into partners(user_id, kind, code, display_name, phone, region, channel)
  values (auth.uid(), p_kind, v_code, trim(p_name), nullif(trim(p_phone),''), nullif(trim(p_region),''), nullif(trim(p_channel),''));
  insert into partner_events(partner_id, event, meta) select id, 'joined', jsonb_build_object('kind', p_kind) from partners where user_id = auth.uid();
  return v_code;
end $$;

create or replace function public.partner_set_payout(p_iban text, p_holder text, p_bank text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update partners set iban = nullif(trim(p_iban),''), account_holder = nullif(trim(p_holder),''), bank_name = nullif(trim(p_bank),'') where user_id = auth.uid();
  if not found then raise exception 'Não é parceiro'; end if;
end $$;

create or replace function public.track_ref(p_code text, p_visitor text, p_path text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from partners where code = upper(trim(p_code)) and status = 'active';
  if v_id is null or coalesce(length(p_visitor),0) not between 8 and 64 then return false; end if;
  insert into partner_clicks(partner_id, visitor, path) values (v_id, p_visitor, left(p_path, 200)) on conflict do nothing;
  return true;
end $$;

create or replace function public.attribute_order(p_order uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o orders; p partners;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null or o.customer_id is distinct from auth.uid() then raise exception 'Encomenda inválida'; end if;
  if o.partner_id is not null then return false; end if;
  if o.created_at < now() - interval '2 hours' or o.payment_status not in ('pending','awaiting_confirmation') then return false; end if;
  select * into p from partners where code = upper(trim(p_code)) and status = 'active';
  if p.id is null then return false; end if;
  if p.user_id = auth.uid() then
    insert into partner_events(partner_id, order_id, event) values (p.id, o.id, 'self_referral_blocked');
    return false;
  end if;
  update orders set partner_id = p.id, partner_attributed_at = now() where id = o.id;
  insert into partner_events(partner_id, order_id, event, meta) values (p.id, o.id, 'order_attributed', jsonb_build_object('number', o.number));
  return true;
end $$;
create or replace function public.partner_rate() returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select (value->>'rate')::numeric from settings where key = 'partners'), 0.20)
$$;

create or replace function public.partners_on_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare r numeric := partner_rate();
begin
  if new.partner_id is not null and new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into partner_commissions(partner_id, order_id, sub_order_id, order_number, sale_amount, platform_commission, rate, amount)
    select new.partner_id, new.id, s.id, new.number, s.subtotal, s.commission_amount, r, round(s.commission_amount * r, 2)
    from sub_orders s join stores st on st.id = s.store_id
    where s.order_id = new.id and coalesce(s.commission_amount,0) > 0 and not st.is_official
    on conflict (sub_order_id) do nothing;
    insert into partner_events(partner_id, order_id, event) values (new.partner_id, new.id, 'commission_created');
  end if;
  return new;
end $$;
drop trigger if exists partners_paid on public.orders;
create trigger partners_paid after update of payment_status on public.orders for each row execute function public.partners_on_paid();

create or replace function public.partner_approve(c partner_commissions) returns void
language plpgsql security definer set search_path = public as $$
begin
  update partner_commissions set status = 'approved', approved_at = now() where id = c.id and status = 'pending';
  if found and c.amount > 0 then
    perform ledger_post('partner_commission','platform_revenue', -c.amount, 'pc:'||c.id, null, null, null, null, 'Comissão parceiro #'||c.order_number);
    perform ledger_post('partner_commission','partner_payable', c.amount, 'pc:'||c.id, null, null, null, null, 'Comissão parceiro #'||c.order_number);
  end if;
end $$;
revoke execute on function public.partner_approve(partner_commissions) from public, anon, authenticated;

create or replace function public.partner_reverse(c partner_commissions, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if c.status = 'approved' then
    perform ledger_post('partner_reversal','platform_revenue', c.amount, 'pcr:'||c.id, null, null, null, null, p_reason);
    perform ledger_post('partner_reversal','partner_payable', -c.amount, 'pcr:'||c.id, null, null, null, null, p_reason);
  end if;
  if c.status in ('pending','approved') then
    update partner_commissions set status = 'reversed', reversed_at = now(), note = p_reason where id = c.id;
    insert into partner_events(partner_id, order_id, commission_id, event, meta) values (c.partner_id, c.order_id, c.id, 'commission_reversed', jsonb_build_object('reason', p_reason));
  end if;
end $$;
revoke execute on function public.partner_reverse(partner_commissions, text) from public, anon, authenticated;

create or replace function public.partners_on_sub() returns trigger
language plpgsql security definer set search_path = public as $$
declare c partner_commissions;
begin
  select * into c from partner_commissions where sub_order_id = new.id;
  if c.id is null then return new; end if;
  if new.status = 'delivered' and old.status is distinct from 'delivered' then perform partner_approve(c);
  elsif new.status in ('cancelled','returned') and old.status is distinct from new.status then perform partner_reverse(c, 'Subencomenda '||new.status);
  end if;
  return new;
end $$;
drop trigger if exists partners_sub on public.sub_orders;
create trigger partners_sub after update of status on public.sub_orders for each row execute function public.partners_on_sub();

create or replace function public.partners_on_refund() returns trigger
language plpgsql security definer set search_path = public as $$
declare c partner_commissions;
begin
  if new.entry_type = 'refund' and new.account = 'platform_revenue' and new.sub_order_id is not null then
    select * into c from partner_commissions where sub_order_id = new.sub_order_id;
    if c.id is not null then perform partner_reverse(c, 'Reembolso: '||coalesce(new.memo,'')); end if;
  end if;
  return new;
end $$;
drop trigger if exists partners_refund on public.ledger_entries;
create trigger partners_refund after insert on public.ledger_entries for each row execute function public.partners_on_refund();
create or replace function public.admin_set_partner(p_partner uuid, p_status text, p_kind text default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  if p_status not in ('pending','active','suspended','rejected') then raise exception 'Estado inválido'; end if;
  update partners set status = p_status, kind = coalesce(p_kind, kind), admin_note = coalesce(p_note, admin_note),
    approved_at = case when p_status = 'active' then coalesce(approved_at, now()) else approved_at end where id = p_partner;
  insert into partner_events(partner_id, event, meta) values (p_partner, 'status_'||p_status, jsonb_build_object('note', p_note, 'kind', p_kind));
end $$;

create or replace function public.admin_partner_commission(p_commission uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c partner_commissions;
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  select * into c from partner_commissions where id = p_commission for update;
  if c.id is null then raise exception 'Comissão inexistente'; end if;
  if p_action = 'approve' then
    if c.status <> 'pending' then raise exception 'Só comissões pendentes podem ser aprovadas'; end if;
    perform partner_approve(c);
    insert into partner_events(partner_id, order_id, commission_id, event) values (c.partner_id, c.order_id, c.id, 'commission_approved');
  elsif p_action = 'reverse' then
    if coalesce(trim(p_reason),'') = '' then raise exception 'Indique o motivo'; end if;
    if c.status not in ('pending','approved') then raise exception 'Comissão já paga ou anulada'; end if;
    perform partner_reverse(c, p_reason);
  else raise exception 'Acção inválida'; end if;
end $$;

create or replace function public.admin_pay_partner(p_partner uuid, p_method text, p_reference text, p_note text default null) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_total numeric; v_pay uuid;
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  if coalesce(trim(p_reference),'') = '' then raise exception 'Indique a referência da transferência confirmada pelo banco/prestador'; end if;
  perform 1 from partners where id = p_partner for update;
  select coalesce(sum(amount),0) into v_total from partner_commissions where partner_id = p_partner and status = 'approved';
  if v_total <= 0 then raise exception 'Sem comissões aprovadas para pagar'; end if;
  insert into partner_payments(partner_id, amount, method, reference, note) values (p_partner, v_total, p_method, trim(p_reference), p_note) returning id into v_pay;
  update partner_commissions set status = 'paid', paid_at = now(), payment_id = v_pay where partner_id = p_partner and status = 'approved';
  perform ledger_post('partner_payout','partner_payable', -v_total, 'pp:'||v_pay, null, null, null, null, 'Pagamento parceiro ref. '||trim(p_reference));
  perform ledger_post('partner_payout','platform_cash', -v_total, 'pp:'||v_pay, null, null, null, null, 'Pagamento parceiro ref. '||trim(p_reference));
  insert into partner_events(partner_id, event, meta) values (p_partner, 'paid', jsonb_build_object('amount', v_total, 'reference', p_reference));
  return v_total;
exception when unique_violation then raise exception 'Esta referência já foi registada para este parceiro';
end $$;

create or replace function public.admin_partners_summary() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'affiliates', (select count(*) from partners where kind = 'affiliate' and status = 'active'),
    'agents', (select count(*) from partners where kind = 'agent' and status = 'active'),
    'regionals', (select count(*) from partners where kind = 'regional' and status = 'active'),
    'pending_partners', (select count(*) from partners where status = 'pending'),
    'clicks', (select count(*) from partner_clicks),
    'conversions', (select count(*) from orders where partner_id is not null),
    'paid_orders', (select count(*) from orders where partner_id is not null and payment_status in ('paid','partially_refunded')),
    'sales', (select coalesce(sum(sale_amount),0) from partner_commissions where status <> 'reversed'),
    'pending', (select coalesce(sum(amount),0) from partner_commissions where status = 'pending'),
    'approved', (select coalesce(sum(amount),0) from partner_commissions where status = 'approved'),
    'paid', (select coalesce(sum(amount),0) from partner_commissions where status = 'paid'),
    'reversed', (select coalesce(sum(amount),0) from partner_commissions where status = 'reversed'));
end $$;

grant execute on function public.track_ref(text,text,text) to anon, authenticated;
grant execute on function public.partner_join(text,text,text,text,text), public.partner_set_payout(text,text,text), public.attribute_order(uuid,text) to authenticated;
grant execute on function public.admin_set_partner(uuid,text,text,text), public.admin_partner_commission(uuid,text,text), public.admin_pay_partner(uuid,text,text,text), public.admin_partners_summary() to authenticated;
