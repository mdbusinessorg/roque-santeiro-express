-- Contexto do assistente de compras: o histórico real do próprio utilizador (ou do visitante anónimo), nunca de terceiros.
create or replace function public.assistant_context(p_anon text default null) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  with me as (select auth.uid() as uid, nullif(left(coalesce(p_anon, ''), 64), '') as anon),
  ev as (
    select ci.kind, ci.product_id, ci.query, ci.created_at
    from customer_interactions ci, me
    where (me.uid is not null and ci.user_id = me.uid) or (me.anon is not null and ci.anon_id = me.anon)
    order by ci.created_at desc limit 200
  ),
  seen as (
    select ev.kind, p.id, p.name, c.name as category, max(ev.created_at) as at, count(*) as n
    from ev join products p on p.id = ev.product_id left join categories c on c.id = p.category_id
    where p.status = 'active' group by ev.kind, p.id, p.name, c.name
  )
  select jsonb_build_object(
    'signed_in', (select uid is not null from me),
    'viewed', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'category', category, 'times', n) order by at desc) from (select * from seen where kind in ('view', 'click') order by at desc limit 12) s), '[]'::jsonb),
    'cart', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'category', category) order by at desc) from (select * from seen where kind = 'cart' order by at desc limit 8) s), '[]'::jsonb),
    'searches', coalesce((select jsonb_agg(q) from (select distinct on (lower(query)) left(query, 60) q from ev where kind = 'search' and query is not null limit 8) s), '[]'::jsonb),
    'wishlist', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name)) from (select w.product_id from wishlists w, me where w.user_id = me.uid order by w.created_at desc limit 10) w join products p on p.id = w.product_id), '[]'::jsonb),
    'purchased', coalesce((select jsonb_agg(jsonb_build_object('id', x.product_id, 'name', x.name)) from (select distinct on (oi.product_id) oi.product_id, oi.name from order_items oi join orders o on o.id = oi.order_id, me where o.customer_id = me.uid and o.status <> 'cancelled' limit 12) x), '[]'::jsonb)
  );
$$;
revoke all on function public.assistant_context(text) from public;
grant execute on function public.assistant_context(text) to anon, authenticated;
