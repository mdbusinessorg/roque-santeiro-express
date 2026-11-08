create or replace function public.log_interactions(p_anon text, p_events jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into customer_interactions(user_id, anon_id, kind, product_id, category_id, query, context)
  select auth.uid(), left(p_anon, 64), e->>'kind', nullif(e->>'product_id', '')::uuid, nullif(e->>'category_id', '')::uuid, left(e->>'query', 120), left(e->>'context', 40)
  from jsonb_array_elements(p_events) with ordinality t(e, i)
  where i <= 20 and e->>'kind' in ('view','click','cart','wishlist','search','rec_impression','rec_click')
    and (nullif(e->>'product_id', '') is null or exists (select 1 from products where id = (e->>'product_id')::uuid));
end $$;

create or replace function public.product_engagement(p_product uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'views', count(*) filter (where kind = 'view'),
    'clicks', count(*) filter (where kind = 'click'),
    'carts', count(*) filter (where kind = 'cart'),
    'wishlists', count(*) filter (where kind = 'wishlist')
  ) from customer_interactions where product_id = p_product;
$$;

create or replace function public.store_product_stats(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from stores where id = p_store and owner_id = auth.uid()) and not is_admin() then
    raise exception 'Sem permissão';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', p.id,
      'views', coalesce(s.views, 0),
      'clicks', coalesce(s.clicks, 0),
      'carts', coalesce(s.carts, 0),
      'wishlists', coalesce(s.wishlists, 0)
    ) order by p.created_at desc)
    from products p
    left join lateral (
      select
        count(*) filter (where c.kind = 'view') views,
        count(*) filter (where c.kind = 'click') clicks,
        count(*) filter (where c.kind = 'cart') carts,
        count(*) filter (where c.kind = 'wishlist') wishlists
      from customer_interactions c where c.product_id = p.id
    ) s on true
    where p.store_id = p_store
  ), '[]'::jsonb);
end $$;

grant execute on function public.product_engagement(uuid) to anon, authenticated;
grant execute on function public.store_product_stats(uuid) to authenticated;
