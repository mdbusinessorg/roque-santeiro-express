do $$
declare adm uuid := '77f4fb62-c85d-4495-b59f-edeb52c32fbf'; s1 uuid := '51005e71-734a-4c2d-b8cb-d3210c28a4c5';
  cust uuid; r jsonb := '{}'; res jsonb; v_order uuid; v_code text; v_pid uuid; sub1 sub_orders; e text;
begin
  select id into cust from profiles where id <> adm order by created_at limit 1;
  -- parceiro = admin (só para teste); cliente = outro utilizador
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  v_code := partner_join('affiliate', 'Teste Parceiro', '900000001', 'Luanda', 'Instagram');
  select id into v_pid from partners where code = v_code;
  r := r || jsonb_build_object('1_code', v_code, '1_track_pending', track_ref(v_code, 'visitor-test-123', '/'));
  perform admin_set_partner(v_pid, 'active');
  r := r || jsonb_build_object('2_track_active', track_ref(v_code, 'visitor-test-123', '/'), '2_track_dup', (select count(*) from partner_clicks where partner_id = v_pid));
  -- auto-referência bloqueada
  update stores set owner_id = adm where id = s1;
  res := place_order(jsonb_build_array(jsonb_build_object('product_id','080cf048-ac02-42ca-8441-1411ab6bfd12','quantity',1), jsonb_build_object('product_id','9fa83327-2d1f-451a-9dd4-2eb8bd355500','quantity',1)),
    'Teste', '900000000', '{"city":"Luanda"}', 'transfer', '{}'::jsonb, 'TESTE PARTNERS');
  v_order := coalesce((res->>'order_id')::uuid, (res->>'id')::uuid);
  r := r || jsonb_build_object('3_self_referral', attribute_order(v_order, v_code));
  -- cliente diferente
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  res := place_order(jsonb_build_array(jsonb_build_object('product_id','080cf048-ac02-42ca-8441-1411ab6bfd12','quantity',1), jsonb_build_object('product_id','9fa83327-2d1f-451a-9dd4-2eb8bd355500','quantity',1)),
    'Teste', '900000000', '{"city":"Luanda"}', 'transfer', '{}'::jsonb, 'TESTE PARTNERS');
  v_order := coalesce((res->>'order_id')::uuid, (res->>'id')::uuid);
  r := r || jsonb_build_object('4_attr', attribute_order(v_order, v_code), '4_attr_again', attribute_order(v_order, v_code));
  perform submit_payment_proof(v_order, 'REF-P', null);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform admin_set_payment(v_order, 'paid');
  r := r || jsonb_build_object('5_comms', (select jsonb_agg(jsonb_build_object('sale', sale_amount, 'plat', platform_commission, 'amt', amount, 'st', status)) from partner_commissions where order_id = v_order),
    '5_subs', (select jsonb_agg(jsonb_build_object('comm', commission_amount, 'official', st.is_official)) from sub_orders s join stores st on st.id = s.store_id where order_id = v_order));
  begin perform admin_pay_partner(v_pid, 'TRF', 'X1'); exception when others then r := r || jsonb_build_object('6_pay_nothing_approved', sqlerrm); end;
  select * into sub1 from sub_orders where order_id = v_order and id in (select sub_order_id from partner_commissions) limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  perform confirm_received(sub1.id);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := r || jsonb_build_object('7_after_delivery', (select jsonb_agg(status) from partner_commissions where order_id = v_order),
    '7_ledger_payable', (select sum(amount) from ledger_entries where account = 'partner_payable'));
  begin perform admin_pay_partner(v_pid, 'TRF', ''); exception when others then r := r || jsonb_build_object('8_pay_no_ref', sqlerrm); end;
  r := r || jsonb_build_object('8_paid', admin_pay_partner(v_pid, 'TRF', 'BAI-PARTNER-1'));
  begin perform admin_pay_partner(v_pid, 'TRF', 'BAI-PARTNER-1'); exception when others then r := r || jsonb_build_object('8b_dup', sqlerrm); end;
  -- reembolso da outra subencomenda (pendente) anula a comissão
  perform admin_refund_sub((select sub_order_id from partner_commissions where order_id = v_order and status = 'pending' limit 1), 'Teste');
  r := r || jsonb_build_object('9_after_refund', (select jsonb_agg(jsonb_build_object('st', status, 'note', note)) from partner_commissions where order_id = v_order),
    '10_summary', admin_partners_summary(), '10_diffs', jsonb_array_length(admin_finance_summary()->'diffs'));
  raise exception 'RESULT %', r;
end $$;
