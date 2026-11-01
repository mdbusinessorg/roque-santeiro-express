import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { order_id, anon_id } = (await req.json().catch(() => ({}))) as { order_id?: string; anon_id?: string };
  if (!token || !order_id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: o } = await sb.from("orders").select("id, number, total, payment_status, contact_phone, order_items(product_id, quantity, unit_price)").eq("id", order_id).maybeSingle();
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (o.payment_status !== "paid") return NextResponse.json({ skipped: "payment_not_confirmed" });
  const eventId = `purchase_${o.id}`;
  const items = (o.order_items ?? []) as { product_id: string; quantity: number; unit_price: number }[];
  const custom = { value: Number(o.total), currency: "AOA", content_type: "product", content_ids: items.map((i) => i.product_id), contents: items.map((i) => ({ id: i.product_id, quantity: i.quantity, item_price: Number(i.unit_price) })), order_id: String(o.number) };
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID, capi = process.env.META_CAPI_TOKEN;
  const { data: fresh } = await sb.rpc("log_marketing_event", { p_event_id: eventId, p_name: "Purchase", p_source: "server", p_status: "logged", p_error: null, p_anon: anon_id ?? null, p_value: custom.value, p_currency: "AOA", p_payload: custom });
  if (!fresh) return NextResponse.json({ duplicate: true });
  if (!pixel || !capi) {
    await sb.rpc("mark_marketing_event", { p_event_id: eventId, p_source: "server", p_status: "skipped", p_error: "CAPI não configurada (NEXT_PUBLIC_META_PIXEL_ID / META_CAPI_TOKEN)" });
    return NextResponse.json({ skipped: "capi_not_configured" });
  }
  const phone = String(o.contact_phone ?? "").replace(/\D/g, "");
  const body = { data: [{ event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: "website", event_source_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/conta/encomendas/${o.id}`,
    user_data: { ph: phone ? [sha(phone.startsWith("244") ? phone : `244${phone}`)] : undefined, external_id: anon_id ? [sha(anon_id)] : undefined, client_user_agent: req.headers.get("user-agent") ?? undefined, client_ip_address: req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined },
    custom_data: custom }], ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${capi}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    await sb.rpc("mark_marketing_event", { p_event_id: eventId, p_source: "server", p_status: r.ok ? "sent" : "error", p_error: r.ok ? null : JSON.stringify(j).slice(0, 400) });
    return NextResponse.json({ ok: r.ok });
  } catch (e) {
    await sb.rpc("mark_marketing_event", { p_event_id: eventId, p_source: "server", p_status: "error", p_error: String(e) });
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
