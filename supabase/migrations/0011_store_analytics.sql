create or replace function public.store_analytics(p_store uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since date := current_date - (greatest(1, least(coalesce(p_days,30), 365)) - 1);
begin
  if not exists (select 1 from stores where id = p_store and owner_id = auth.uid()) and not is_admin() then raise exception 'Sem permissão'; end if;
  return (
  with ci as (
    select c.kind, c.product_id, c.created_at::date d, coalesce(c.user_id::text, c.anon_id) who
    from customer_interactions c join products p on p.id = c.product_id
    where p.store_id = p_store and c.created_at::date >= since
  ), so as (
    select s.*, o.created_at::date d, o.payment_status, o.number from sub_orders s join orders o on o.id = s.order_id
    where s.store_id = p_store and o.created_at::date >= since
  ), paid as (select * from so where payment_status in ('paid','partially_refunded') and status not in ('cancelled','returned'))
  select jsonb_build_object(
    'series', (select coalesce(jsonb_agg(jsonb_build_object('d', g.d, 'views', (select count(*) from ci where ci.d = g.d and kind = 'view'), 'orders', (select count(*) from so where so.d = g.d), 'revenue', (select coalesce(sum(subtotal),0) from paid where paid.d = g.d)) order by g.d), '[]')
               from (select generate_series(since, current_date, '1 day')::date d) g),
    'views', (select count(*) from ci where kind = 'view'),
    'visitors', (select count(distinct who) from ci where kind = 'view'),
    'carts', (select count(*) from ci where kind = 'cart'),
    'wishlists', (select count(*) from ci where kind = 'wishlist'),
    'orders', (select count(*) from so where status <> 'cancelled'),
    'paid_orders', (select count(*) from paid),
    'revenue', (select coalesce(sum(subtotal),0) from paid),
    'net', (select coalesce(sum(seller_net),0) from paid),
    'to_ship', (select count(*) from sub_orders s join orders o on o.id = s.order_id where s.store_id = p_store and o.payment_status = 'paid' and s.status in ('new','confirmed','preparing','ready')),
    'top_viewed', (select coalesce(jsonb_agg(t), '[]') from (select p.id, p.name, p.slug, p.images[1] img, count(*) n from ci join products p on p.id = ci.product_id where ci.kind = 'view' group by p.id order by n desc limit 5) t),
    'top_sold', (select coalesce(jsonb_agg(t), '[]') from (select p.id, p.name, p.slug, p.images[1] img, sum(oi.quantity) n from order_items oi join paid on paid.id = oi.sub_order_id join products p on p.id = oi.product_id group by p.id order by n desc limit 5) t),
    'low_stock', (select coalesce(jsonb_agg(t), '[]') from (select id, name, stock from products where store_id = p_store and status = 'active' and stock <= 5 order by stock limit 8) t),
    'products', (select jsonb_build_object('active', count(*) filter (where status = 'active'), 'draft', count(*) filter (where status <> 'active'), 'out', count(*) filter (where stock <= 0)) from products where store_id = p_store),
    'reviews', (select jsonb_build_object('n', count(*), 'avg', coalesce(round(avg(r.rating)::numeric, 2), 0), 'unanswered', count(*) filter (where r.seller_reply is null)) from reviews r join products p on p.id = r.product_id where p.store_id = p_store and coalesce(r.status, 'published') <> 'hidden'),
    'activity', (select coalesce(jsonb_agg(a order by a.at desc), '[]') from (
        (select 'order' kind, e.created_at at, e.status label, o.number ref from sub_order_events e join sub_orders s on s.id = e.sub_order_id join orders o on o.id = s.order_id where s.store_id = p_store order by e.created_at desc limit 12)
        union all
        (select 'review', r.created_at, r.rating::text, null from reviews r join products p on p.id = r.product_id where p.store_id = p_store order by r.created_at desc limit 6)
        union all
        (select 'payout', py.created_at, py.status, null from payouts py where py.store_id = p_store order by py.created_at desc limit 4)
      ) a)
  ));
end $$;
grant execute on function public.store_analytics(uuid, int) to authenticated;
