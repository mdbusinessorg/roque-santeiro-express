"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { FileText } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { STORE_STATUS } from "@/lib/utils";
import type { Store } from "@/lib/types";
import { AdminShell } from "@/components/admin/admin-shell";
import { StoreAvatar } from "@/components/store/store-avatar";

const FILTERS = ["pending", "info_requested", "approved", "suspended", "rejected"];

export default function AdminStores() {
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<Store[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("stores").select("*").eq("status", filter).order("created_at", { ascending: false });
    setRows((data as Store[]) ?? []);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(s: Store, status: string) {
    let note: string | null = null;
    if (status !== "approved") { note = prompt("Nota para o vendedor (motivo / informação pedida):") ; if (note === null) return; }
    const c = (document.getElementById(`c-${s.id}`) as HTMLInputElement | null)?.value;
    const { error } = await supabaseBrowser().rpc("admin_set_store_status", { p_store: s.id, p_status: status, p_note: note, p_commission: c ? Number(c) : null });
    setMsg(error ? rpcError(error) : `${s.name}: ${STORE_STATUS[status]}`); load();
  }

  return (
    <AdminShell>
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-brand-700 text-white" : "bg-white/80 text-brand-900"}`}>{STORE_STATUS[f]}</button>)}
      </div>
      {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
      {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Nenhuma loja neste estado.</p> : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.id} className="card p-4 text-sm">
              <div className="flex items-start gap-3">
                <StoreAvatar store={s} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{s.name} {s.is_official && <span className="text-xs text-brand-600">(oficial)</span>}</p>
                  <p className="text-xs text-ink/60">{s.responsible_name} · {s.phone} · WhatsApp {s.whatsapp} · {s.email}</p>
                  <p className="text-xs text-ink/60">{[s.address, s.city, s.province].filter(Boolean).join(", ")} · {new Date(s.created_at).toLocaleDateString("pt-AO")}</p>
                  {s.description && <p className="mt-1 text-ink/75">{s.description}</p>}
                  {s.documents_url && <a href={s.documents_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><FileText className="h-3.5 w-3.5" />Ver documento</a>}
                  {s.status === "approved" && <Link href={`/loja/${s.slug}`} className="ml-3 text-xs font-semibold text-brand-600">Ver loja pública</Link>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input id={`c-${s.id}`} defaultValue={s.commission_rate ?? ""} placeholder="Comissão % (vazio = global)" inputMode="decimal" className="input h-9 w-48 py-1 text-xs" />
                {s.status !== "approved" && <button onClick={() => act(s, "approved")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{s.status === "suspended" ? "Reactivar" : "Aprovar"}</button>}
                {s.status !== "info_requested" && s.status !== "approved" && <button onClick={() => act(s, "info_requested")} className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-800">Pedir informação</button>}
                {s.status === "approved" && <button onClick={() => act(s, "suspended")} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">Suspender</button>}
                {s.status !== "rejected" && s.status !== "approved" && <button onClick={() => act(s, "rejected")} className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">Rejeitar</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
