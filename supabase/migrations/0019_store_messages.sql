-- Chat particular cliente <-> vendedor (apenas mensagens, sem voz)
create table if not exists public.store_messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('customer', 'seller')),
  author_name text,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists store_messages_thread_idx on public.store_messages(store_id, user_id, created_at);

alter table public.store_messages enable row level security;

create or replace function public.is_store_owner(p_store uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from stores s where s.id = p_store and s.owner_id = auth.uid());
$$;

-- O cliente vê a sua conversa; o vendedor vê todas as conversas da sua loja; admin vê tudo.
create policy sm_select on public.store_messages for select using (
  user_id = auth.uid()
  or public.is_store_owner(store_id)
  or public.is_admin()
);

-- O cliente só escreve como 'customer' na loja aprovada; o vendedor escreve como 'seller' na sua loja.
create policy sm_insert on public.store_messages for insert with check (
  (sender = 'customer' and user_id = auth.uid() and exists (
     select 1 from stores s where s.id = store_id and s.status = 'approved'))
  or (sender = 'seller' and public.is_store_owner(store_id))
);

do $$ begin
  alter publication supabase_realtime add table public.store_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
