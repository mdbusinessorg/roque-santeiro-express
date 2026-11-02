"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { kz } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";

type Partner = { id: string; code: string; kind: string; status: string; display_name: string; phone: string | null; region: string | null; channel: string | null; iban: string | null; account_holder: string | null; bank_name: string | null; created_at: string };
type Comm = { id: string; partner_id: string; order_number: number; sale_amount: number; platform_commission: number; amount: number; status: string; created_at: string; partners: { display_name: string; code: string } };

const KIND: Record<string, string> = { affiliate: "Afiliado", agent: "Agente comercial", regional: "Representante regional" };
const PST: Record<string, string> = { pending: "Em análise", active: "Activo", suspended: "Suspenso", rejected: "Rejeitado" };
const CST: Record<string, string> = { pending: "Pendente", approved: "Aprovada", paid: "Paga", reversed: "Anulada" };
const CARDS: [string, string, boolean][] = [["affiliates", "Afiliados activos", false], ["agents", "Agentes comerciais", false], ["regionals", "Representantes regionais", false], ["pending_partners", "Candidaturas por analisar", false],
  ["clicks", "Visitas por links", false], ["conversions", "Encomendas atribuídas", false], ["paid_orders", "Encomendas pagas", false], ["sales", "Vendas atribuídas", true],
  ["pending", "Comissões pendentes", true], ["approved", "Comissões aprovadas", true], ["paid", "Comissões pagas", true], ["reversed", "Comissões anuladas", true]];

export default function AdminPartners() {
  const [sum, setSum] = useState<Record<string, number> | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [comms, setComms] = useState<Comm[]>([]);
  const [filter, setFilter] = useState("pending");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [s, p, c] = await Promise.all([
      sb.rpc("admin_partners_summary"),
      sb.from("partners").select("*").order("created_at", { ascending: false }),
      sb.from("partner_commissions").select("*, partners(display_name, code)").order("created_at", { ascending: false }).limit(300),
    ]);
    if (s.error) setMsg(rpcError(s.error));
    setSum(s.data as Record<string, number>); setPartners((p.data as Partner[]) ?? []); setComms((c.data as Comm[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn: string, args: Record<string, unknown>, ok: string) {
    setMsg(null);
    const { error } = await supabaseBrowser().rpc(fn, args);
    if (error) setMsg(rpcError(error)); else { setMsg(ok); load(); }
  }
  function setStatus(p: Partner, status: string) {
    const note = status === "rejected" || status === "suspended" ? prompt("Motivo:") : null;
    if ((status === "rejected" || status === "suspended") && !note) return;
    run("admin_set_partner", { p_partner: p.id, p_status: status, p_kind: null, p_note: note }, `Parceiro ${PST[status].toLowerCase()}.`);
  }
  function pay(p: Partner, due: number) {
    const ref = prompt(`Pagar ${kz(due)} a ${p.display_name} (${p.bank_name ?? "banco?"} ${p.iban ?? "sem IBAN"}).\nReferência da transferência confirmada pelo banco:`);
    if (ref) run("admin_pay_partner", { p_partner: p.id, p_method: "Transferência bancária", p_reference: ref, p_note: null }, "Pagamento registado.");
  }
  function commission(c: Comm, action: string) {
    const reason = action === "reverse" ? prompt("Motivo da anulação:") : null;
    if (action === "reverse" && !reason) return;
    run("admin_partner_commission", { p_commission: c.id, p_action: action, p_reason: reason }, action === "approve" ? "Comissão aprovada." : "Comissão anulada.");
  }
  const due = (id: string) => comms.filter((c) => c.partner_id === id && c.status === "approved").reduce((a, c) => a + Number(c.amount), 0);

  const shownPartners = partners.filter((p) => filter === "all" || p.status === filter);
  return (
    <AdminShell>
      {msg && <p className="mb-3 rounded-2xl bg-brand-50 p-3 text-sm">{msg}</p>}
      <p className="mb-3 rounded-2xl bg-ink/[0.04] p-3 text-xs text-ink/65">Regra: o parceiro recebe 20% da comissão efectivamente recebida pela plataforma (não do valor da venda). A comissão nasce quando o pagamento é confirmado, é aprovada com a entrega e anulada em cancelamentos, devoluções ou reembolsos. Não há pagamentos por recrutamento.</p>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {CARDS.map(([k, l, money]) => <div key={k} className="card p-4"><p className="text-xs text-ink/55">{l}</p><p className="mt-1 text-lg font-extrabold">{sum ? (money ? kz(Number(sum[k] ?? 0)) : Number(sum[k] ?? 0)) : "…"}</p></div>)}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">Parceiros</p>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {["pending", "active", "suspended", "rejected", "all"].map((s) => <button key={s} onClick={() => setFilter(s)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${filter === s ? "bg-ink text-white" : "bg-ink/5"}`}>{s === "all" ? "Todos" : PST[s]}</button>)}
          </div>
        </div>
        {shownPartners.length === 0 && <p className="text-xs text-ink/50">Nenhum parceiro neste estado.</p>}
        {shownPartners.map((p) => {
          const d = due(p.id);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-ink/5 py-2">
              <div className="min-w-0 flex-1"><p className="font-semibold">{p.display_name} · <span className="text-gold-700">{p.code}</span></p><p className="text-[11px] text-ink/50">{KIND[p.kind]} · {PST[p.status]} · {p.phone ?? "—"} · {p.region ?? "—"} · {p.channel ?? "—"}</p></div>
              {p.status !== "active" && <button onClick={() => setStatus(p, "active")} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Aprovar</button>}
              {p.status === "active" && <button onClick={() => setStatus(p, "suspended")} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Suspender</button>}
              {p.status === "pending" && <button onClick={() => setStatus(p, "rejected")} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Rejeitar</button>}
              {d > 0 && <button onClick={() => pay(p, d)} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Pagar {kz(d)}</button>}
            </div>
          );
        })}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="mb-2 font-bold">Atribuição de vendas e comissões</p>
        {comms.length === 0 && <p className="text-xs text-ink/50">Ainda sem vendas atribuídas.</p>}
        {comms.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 border-t border-ink/5 py-2 text-xs">
            <div className="min-w-0 flex-1"><p className="font-semibold">#{c.order_number} · {c.partners.display_name} ({c.partners.code})</p><p className="text-[11px] text-ink/50">{new Date(c.created_at).toLocaleString("pt-AO")} · venda {kz(c.sale_amount)} · comissão plataforma {kz(c.platform_commission)}</p></div>
            <b>{kz(c.amount)}</b><span className="rounded-full bg-ink/5 px-2 py-0.5">{CST[c.status]}</span>
            {c.status === "pending" && <button onClick={() => commission(c, "approve")} className="rounded-full bg-ink px-3 py-1 font-semibold text-white">Aprovar</button>}
            {(c.status === "pending" || c.status === "approved") && <button onClick={() => commission(c, "reverse")} className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">Anular</button>}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
