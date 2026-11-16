-- 0021: permitir marcar mensagens como lidas (cliente e vendedor)
-- Sem esta policy o update de read_at é bloqueado por RLS.

drop policy if exists sm_update on public.store_messages;
create policy sm_update on public.store_messages for update using (
  user_id = auth.uid()
  or public.is_store_owner(store_id)
  or public.is_admin()
) with check (
  user_id = auth.uid()
  or public.is_store_owner(store_id)
  or public.is_admin()
);
