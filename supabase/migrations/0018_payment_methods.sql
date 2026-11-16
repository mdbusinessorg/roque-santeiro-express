-- Métodos de pagamento por referência: Multicaixa Express, PayPay, Unitel Money
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('multicaixa_express','paypay','unitel_money','transfer','cash_on_delivery','manual'));

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
  if p_payment_method not in ('multicaixa_express','paypay','unitel_money','transfer','cash_on_delivery','manual') then raise exception 'Método de pagamento inválido'; end if;
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
