import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const { orderId } = await req.json().catch(() => ({}));
  if (!token || !orderId) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: o } = await sb.from("orders").select("id,number,total,payment_method,payment_status").eq("id", orderId).maybeSingle();
  if (!o) return NextResponse.json({ error: "Encomenda não encontrada" }, { status: 404 });
  if (o.payment_status === "paid") return NextResponse.json({ error: "Encomenda já paga" }, { status: 409 });
  const provider = getProvider();
  try {
    const r = await provider.createCheckout({ id: o.id, number: o.number, total: Number(o.total), method: o.payment_method }, `checkout:${o.id}`);
    return NextResponse.json({ provider: provider.id, capabilities: provider.capabilities, ...r });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ error: timeout ? "O prestador não respondeu a tempo. Tente novamente." : "Falha ao iniciar pagamento" }, { status: timeout ? 504 : 502 });
  }
}
