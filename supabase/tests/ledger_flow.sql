do $$
declare adm uuid := '77f4fb62-c85d-4495-b59f-edeb52c32fbf'; s1 uuid := '51005e71-734a-4c2d-b8cb-d3210c28a4c5';
  r jsonb := '{}'; res jsonb; v_order uuid; sub1 sub_orders; sub2 sub_orders; v_pay uuid; e text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  update stores set owner_id = adm where id = s1;
  res := place_order(jsonb_build_array(jsonb_build_object('product_id','080cf048-ac02-42ca-8441-1411ab6bfd12','quantity',1), jsonb_build_object('product_id','9fa83327-2d1f-451a-9dd4-2eb8bd355500','quantity',2)),
    'Teste', '900000000', '{"city":"Luanda"}', 'transfer', '{}'::jsonb, 'TESTE LEDGER');
  v_order := coalesce((res->>'order_id')::uuid, (res->>'id')::uuid);
  r := r || jsonb_build_object('1_place', res, '1_subs', (select count(*) from sub_orders where order_id = v_order));
  select * into sub1 from sub_orders where order_id = v_order and store_id = s1;
  select * into sub2 from sub_orders where order_id = v_order and store_id <> s1;
  r := r || jsonb_build_object('2_split', (select jsonb_agg(jsonb_build_object('store', store_id, 'gross', subtotal, 'rate', commission_rate, 'comm', commission_amount, 'net', seller_net, 'ship', shipping_fee, 'method', delivery_method)) from sub_orders where order_id = v_order), 'total', (select total from orders where id = v_order));
  perform submit_payment_proof(v_order, 'REF-TESTE', null);
  r := r || jsonb_build_object('3_ledger_before_admin', (select count(*) from ledger_entries where order_id = v_order));
  perform admin_set_payment(v_order, 'paid');
  r := r || jsonb_build_object('4_after_paid', (select jsonb_object_agg(account, s) from (select account, sum(amount) s from ledger_entries where order_id = v_order group by 1) x), '4_bal_s1', store_balance(s1));
  perform confirm_received(sub1.id);
  r := r || jsonb_build_object('5_bal_after_delivery', store_balance(s1));
  begin perform request_payout(s1, 999999999, 'AO06TEST'); exception when others then r := r || jsonb_build_object('6a_over_limit_blocked', sqlerrm); end;
  v_pay := request_payout(s1, (store_balance(s1)->>'available')::numeric - 1000, 'AO06TEST', 'Teste', 'BAI');
  r := r || jsonb_build_object('6_bal_after_request', store_balance(s1));
  perform admin_set_payout_status(v_pay, 'in_review'); perform admin_set_payout_status(v_pay, 'approved'); perform admin_set_payout_status(v_pay, 'processing');
  begin perform admin_set_payout_status(v_pay, 'paid'); exception when others then r := r || jsonb_build_object('7a_paid_without_ref_blocked', sqlerrm); end;
  perform admin_set_payout_status(v_pay, 'paid', 'BAI-TRF-TESTE');
  r := r || jsonb_build_object('7_bal_after_paid', store_balance(s1), '7_status', (select status from payouts where id = v_pay));
  perform admin_refund_sub(sub2.id, 'Teste reembolso');
  r := r || jsonb_build_object('8_refund_bal_s2', store_balance(sub2.store_id), '8_order_pay', (select payment_status from orders where id = v_order));
  perform admin_ledger_adjust(s1, 500, 'Teste ajuste');
  perform admin_reserve(s1, 1000, 'Teste reserva');
  r := r || jsonb_build_object('9_adjust_reserve_bal', store_balance(s1));
  begin update ledger_entries set amount = 0 where order_id = v_order; exception when others then r := r || jsonb_build_object('10_immutable', sqlerrm); end;
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  r := r || jsonb_build_object('11_gw_dup', gateway_confirm_payment(v_order, 1, 'testpay', 'X1'), '11_gw_dup2', gateway_confirm_payment(v_order, 1, 'testpay', 'X1'));
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := r || jsonb_build_object('12_summary', admin_finance_summary() - 'diffs', '12_diffs', jsonb_array_length(admin_finance_summary()->'diffs'));
  raise exception 'RESULT %', r;
end $$;
