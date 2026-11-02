"use client";

import { useEffect, useState } from "react";
import { BadgePercent, Link2, Loader2, ShieldCheck, Users } from "lucide-react";
import Link from "@/components/ui/native-link";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";

const KINDS: [string, string, string][] = [
  ["affiliate", "Afiliado", "Divulga produtos nas redes sociais com o teu link."],
  ["agent", "Agente comercial", "Traz clientes e lojas no teu bairro ou empresa."],
  ["regional", "Representante regional", "Representa o Roque Santeiro na tua província."],
];

export default function PartnersPage() {
  const { user, profile, loading } = useAuth();
  const [mine, setMine] = useState<{ code: string; status: string } | null | undefined>(undefined);
  const [f, setF] = useState({ kind: "affiliate", name: "", phone: "", region: "", channel: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setMine(null); return; }
    setF((x) => ({ ...x, name: x.name || profile?.full_name || "", phone: x.phone || profile?.phone || "" }));
    supabaseBrowser().from("partners").select("code,status").eq("user_id", user.id).maybeSingle().then(({ data }) => setMine(data));
  }, [user, profile]);

  async function join(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc("partner_join", { p_kind: f.kind, p_name: f.name, p_phone: f.phone, p_region: f.region, p_channel: f.channel });
    setBusy(false);
    if (error) setMsg(rpcError(error)); else location.href = "/parceiro";
  }

  return (
    <div className="pt-5">
      <section className="relative overflow-hidden rounded-[28px] bg-ink p-6 text-white sm:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
        <p className="gold-text text-xs font-bold uppercase tracking-[0.3em]">Roque Partners</p>
        <h1 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Ganha com cada venda que trazes para o Roque Santeiro</h1>
        <p className="mt-3 max-w-xl text-sm text-white/70">Partilha o teu link. Quando alguém compra e o pagamento é confirmado, recebes <b className="text-gold">20% da comissão da plataforma</b> nessa venda.</p>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[[Link2, "1. Partilha", "Recebe um link e um código próprios."], [BadgePercent, "2. Vende", "A venda fica atribuída a ti quando o cliente compra pelo teu link (válido 30 dias)."], [ShieldCheck, "3. Recebe", "A comissão é aprovada com a entrega e paga por transferência com referência."]].map(([I, t, d]) => {
          const Icon = I as typeof Link2;
          return <div key={t as string} className="card p-4"><Icon className="h-5 w-5 text-gold-700" /><p className="mt-2 font-bold">{t as string}</p><p className="text-xs text-ink/60">{d as string}</p></div>;
        })}
      </div>

      <div className="card mt-4 p-4 text-xs text-ink/65">
        <p className="mb-1 font-bold text-ink">Exemplo</p>
        Venda de 100 000 Kz com comissão da plataforma de 10% = 10 000 Kz. O parceiro recebe 2 000 Kz (20% de 10 000 Kz), não 20% da venda. Não há pagamentos por recrutar pessoas: só por vendas reais, pagas e entregues. Compras feitas por ti próprio não contam.
      </div>

      <div className="card mt-4 p-5">
        {loading || mine === undefined ? <div className="skeleton h-40" /> : !user ? (
          <div className="text-center text-sm"><Users className="mx-auto h-8 w-8 text-gold-700" /><p className="mt-2">Entra ou cria conta para te candidatares.</p><Link href="/entrar?next=/partners" className="btn-primary mt-3 inline-flex px-6">Entrar</Link></div>
        ) : mine ? (
          <div className="text-center text-sm"><p>Já és parceiro (código <b>{mine.code}</b>, estado: {mine.status === "active" ? "activo" : mine.status === "pending" ? "em análise" : mine.status}).</p><Link href="/parceiro" className="btn-primary mt-3 inline-flex px-6">Abrir o meu painel</Link></div>
        ) : (
          <form onSubmit={join} className="space-y-3 text-sm">
            <p className="text-lg font-extrabold">Candidatura</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {KINDS.map(([k, l, d]) => (
                <button type="button" key={k} onClick={() => setF({ ...f, kind: k })} className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${f.kind === k ? "border-ink bg-ink text-white" : "border-ink/10"}`}>
                  <p className="font-bold">{l}</p><p className={`text-[11px] ${f.kind === k ? "text-white/70" : "text-ink/55"}`}>{d}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome completo" className="input" />
              <input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Telefone / WhatsApp" inputMode="tel" className="input" />
              <input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} placeholder="Província / município" className="input" />
              <input value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} placeholder="Onde vais divulgar (Instagram, TikTok…)" className="input" />
            </div>
            {msg && <p className="text-xs text-red-600">{msg}</p>}
            <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enviar candidatura</button>
            <p className="text-center text-[11px] text-ink/50">A equipa aprova a candidatura antes de o link começar a contar.</p>
          </form>
        )}
      </div>
    </div>
  );
}
