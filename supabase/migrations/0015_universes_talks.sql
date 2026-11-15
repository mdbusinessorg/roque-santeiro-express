-- Universos (audience), tipos de loja, seguidores de loja e BISNO TALKS (salas de voz ao vivo + mensagens de voz)

alter table public.products add column if not exists audience text not null default 'unissexo';
do $$ begin
  alter table public.products add constraint products_audience_check check (audience in ('masculino','feminino','unissexo'));
exception when duplicate_object then null; end $$;
create index if not exists products_audience_idx on public.products(audience) where status = 'active';

alter table public.stores add column if not exists store_type text not null default 'geral';
do $$ begin
  alter table public.stores add constraint stores_store_type_check check (store_type in ('geral','electronica','moda','tabacaria','casa','beleza','comida','supermercado','farmacia','servicos'));
exception when duplicate_object then null; end $$;

-- Seguidores de loja
create table if not exists public.store_follows (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
alter table public.store_follows enable row level security;
drop policy if exists sf_own on public.store_follows;
create policy sf_own on public.store_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.store_followers(p_store uuid) returns integer
language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from store_follows where store_id = p_store;
$$;
grant execute on function public.store_followers(uuid) to anon, authenticated;

-- Nome público: só o primeiro nome, sem números nem palavrões
create or replace function public.talk_clean_name(p text) returns text
language sql immutable as $$
  select case
    when n is null or length(n) < 2 then 'Convidado'
    when lower(n) ~ '(merda|porra|caralh|foda|fodid|puta|cabr[aã]o|cona|pi[cç]a|bosta|cu$|fdp|filho da|matumb|burro|idiota)' then 'Convidado'
    else initcap(n) end
  from (select nullif(left(split_part(btrim(regexp_replace(coalesce(p, ''), '[^[:alpha:] ]', '', 'g')), ' ', 1), 18), '') n) x;
$$;

create or replace function public.is_verified_buyer(p_user uuid, p_product uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from order_items oi join orders o on o.id = oi.order_id
    where oi.product_id = p_product and o.customer_id = p_user and o.payment_status = 'paid'
  );
$$;

-- BISNO TALKS: salas de voz ao vivo por produto. Sem texto: o tema é escolhido de uma lista fixa.
create table if not exists public.talk_rooms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (topic in ('qualidade','preco','durabilidade','comparacoes','duvidas','experiencia')),
  status text not null default 'live' check (status in ('live','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index if not exists talk_rooms_one_live on public.talk_rooms(product_id, topic) where status = 'live';

create table if not exists public.talk_participants (
  room_id uuid not null references public.talk_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  verified boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists talk_participants_seen on public.talk_participants(room_id, last_seen);

create table if not exists public.talk_voice_notes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  verified boolean not null default false,
  topic text not null check (topic in ('qualidade','preco','durabilidade','comparacoes','duvidas','experiencia')),
  audio_url text not null,
  duration_s integer not null check (duration_s between 1 and 60),
  status text not null default 'published' check (status in ('published','hidden')),
  report_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists talk_voice_notes_product on public.talk_voice_notes(product_id, created_at desc);

create table if not exists public.talk_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.talk_rooms(id) on delete cascade,
  note_id uuid references public.talk_voice_notes(id) on delete cascade,
  target_user uuid,
  reason text not null check (reason in ('ofensa','spam','fraude','outro')),
  created_at timestamptz not null default now()
);
create unique index if not exists talk_reports_once_note on public.talk_reports(reporter_id, note_id) where note_id is not null;
create unique index if not exists talk_reports_once_user on public.talk_reports(reporter_id, room_id, target_user) where room_id is not null;

alter table public.talk_rooms enable row level security;
alter table public.talk_participants enable row level security;
alter table public.talk_voice_notes enable row level security;
alter table public.talk_reports enable row level security;

drop policy if exists tr_sel on public.talk_rooms;
create policy tr_sel on public.talk_rooms for select using (true);
drop policy if exists tp_sel on public.talk_participants;
create policy tp_sel on public.talk_participants for select using (true);
drop policy if exists tv_sel on public.talk_voice_notes;
create policy tv_sel on public.talk_voice_notes for select using (status = 'published' or user_id = auth.uid() or is_admin());
drop policy if exists tv_del on public.talk_voice_notes;
create policy tv_del on public.talk_voice_notes for delete using (user_id = auth.uid() or is_admin());
drop policy if exists trep_sel on public.talk_reports;
create policy trep_sel on public.talk_reports for select using (is_admin());
-- Escritas só pelas funções abaixo (security definer).

create or replace function public.talk_sweep() returns void
language sql security definer set search_path to 'public' as $$
  update talk_rooms r set status = 'ended', ended_at = now()
  where r.status = 'live' and r.created_at < now() - interval '90 seconds'
    and not exists (select 1 from talk_participants p where p.room_id = r.id and p.last_seen > now() - interval '75 seconds');
$$;

-- Entra na sala ao vivo do produto+tema (cria-a se não existir). Máximo 8 pessoas por sala.
create or replace function public.talk_join(p_product uuid, p_topic text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_room uuid; v_uid uuid := auth.uid(); v_name text; v_n int;
begin
  if v_uid is null then raise exception 'Inicie sessão para entrar numa BISNO TALK'; end if;
  if not exists (select 1 from products where id = p_product and status = 'active') then raise exception 'Produto indisponível'; end if;
  perform talk_sweep();
  select id into v_room from talk_rooms where product_id = p_product and topic = p_topic and status = 'live';
  if v_room is null then
    insert into talk_rooms(product_id, host_id, topic) values (p_product, v_uid, p_topic)
    on conflict do nothing returning id into v_room;
    if v_room is null then select id into v_room from talk_rooms where product_id = p_product and topic = p_topic and status = 'live'; end if;
  end if;
  select count(*) into v_n from talk_participants where room_id = v_room and user_id <> v_uid and last_seen > now() - interval '75 seconds';
  if v_n >= 8 then raise exception 'Sala cheia (8 pessoas). Tente outro tema.'; end if;
  select talk_clean_name(full_name) into v_name from profiles where id = v_uid;
  insert into talk_participants(room_id, user_id, name, verified)
  values (v_room, v_uid, coalesce(v_name, 'Convidado'), is_verified_buyer(v_uid, p_product))
  on conflict (room_id, user_id) do update set last_seen = now(), name = excluded.name, verified = excluded.verified;
  return jsonb_build_object('room_id', v_room, 'user_id', v_uid, 'name', coalesce(v_name, 'Convidado'));
end $$;

create or replace function public.talk_ping(p_room uuid) returns void
language sql security definer set search_path to 'public' as $$
  update talk_participants set last_seen = now() where room_id = p_room and user_id = auth.uid();
$$;

create or replace function public.talk_leave(p_room uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  delete from talk_participants where room_id = p_room and user_id = auth.uid();
  update talk_rooms set status = 'ended', ended_at = now()
  where id = p_room and status = 'live' and not exists (select 1 from talk_participants where room_id = p_room and last_seen > now() - interval '75 seconds');
end $$;

create or replace function public.talk_roster(p_room uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'name', name, 'verified', verified) order by joined_at), '[]'::jsonb)
  from talk_participants where room_id = p_room and last_seen > now() - interval '75 seconds';
$$;

-- Salas ao vivo (todas, ou de um produto)
create or replace function public.talk_live(p_product uuid default null) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(x order by (x->>'people')::int desc), '[]'::jsonb) from (
    select jsonb_build_object('room_id', r.id, 'topic', r.topic, 'created_at', r.created_at,
      'product_id', p.id, 'product_slug', p.slug, 'product_name', p.name, 'product_image', p.images[1], 'price', p.price, 'store_name', s.name,
      'people', (select count(*) from talk_participants tp where tp.room_id = r.id and tp.last_seen > now() - interval '75 seconds'),
      'names', (select coalesce(jsonb_agg(tp.name), '[]'::jsonb) from (select name from talk_participants where room_id = r.id and last_seen > now() - interval '75 seconds' order by joined_at limit 4) tp)) x
    from talk_rooms r join products p on p.id = r.product_id join stores s on s.id = p.store_id
    where r.status = 'live' and p.status = 'active' and (p_product is null or r.product_id = p_product)
      and exists (select 1 from talk_participants tp where tp.room_id = r.id and tp.last_seen > now() - interval '75 seconds')
  ) q;
$$;

-- Mensagem de voz: o áudio tem de estar na pasta do próprio utilizador no bucket media
create or replace function public.talk_add_note(p_product uuid, p_topic text, p_url text, p_duration integer) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text;
begin
  if v_uid is null then raise exception 'Inicie sessão para deixar uma mensagem de voz'; end if;
  if position('/storage/v1/object/public/media/' || v_uid::text || '/voice/' in p_url) = 0 then raise exception 'Áudio inválido'; end if;
  if (select count(*) from talk_voice_notes where user_id = v_uid and created_at > now() - interval '1 hour') >= 10 then raise exception 'Limite de mensagens de voz por hora atingido'; end if;
  select talk_clean_name(full_name) into v_name from profiles where id = v_uid;
  insert into talk_voice_notes(product_id, user_id, name, verified, topic, audio_url, duration_s)
  values (p_product, v_uid, coalesce(v_name, 'Convidado'), is_verified_buyer(v_uid, p_product), p_topic, p_url, least(greatest(p_duration, 1), 60))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.talk_report(p_reason text, p_note uuid default null, p_room uuid default null, p_user uuid default null) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Inicie sessão para denunciar'; end if;
  if p_note is null and (p_room is null or p_user is null) then raise exception 'Denúncia inválida'; end if;
  insert into talk_reports(reporter_id, room_id, note_id, target_user, reason) values (auth.uid(), p_room, p_note, p_user, p_reason)
  on conflict do nothing;
  if p_note is not null then
    update talk_voice_notes n set report_count = (select count(*) from talk_reports where note_id = n.id),
      status = case when (select count(*) from talk_reports where note_id = n.id) >= 3 then 'hidden' else n.status end
    where n.id = p_note;
  end if;
end $$;

revoke all on function public.talk_sweep() from public, anon;
grant execute on function public.talk_join(uuid, text), public.talk_ping(uuid), public.talk_leave(uuid), public.talk_add_note(uuid, text, text, integer), public.talk_report(text, uuid, uuid, uuid) to authenticated;
grant execute on function public.talk_roster(uuid), public.talk_live(uuid), public.is_verified_buyer(uuid, uuid) to anon, authenticated;
revoke all on function public.is_verified_buyer(uuid, uuid) from public, anon, authenticated;
