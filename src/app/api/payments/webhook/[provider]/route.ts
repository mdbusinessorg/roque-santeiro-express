import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  const raw = await req.text();
  if (provider.id !== id || !provider.capabilities.webhooks || !provider.verifyWebhook(raw, req.headers))
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ error: "Servidor sem configuração" }, { status: 503 });
  let ev;
  try { ev = provider.parseWebhook(raw); } catch { return NextResponse.json({ error: "Evento inválido" }, { status: 400 }); }
  if (ev.status !== "succeeded") return NextResponse.json({ result: "ignored", status: ev.status });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("gateway_confirm_payment", {
    p_order: ev.orderId, p_amount: ev.amount, p_provider: provider.id, p_ref: ev.providerRef, p_raw: JSON.parse(raw),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}
