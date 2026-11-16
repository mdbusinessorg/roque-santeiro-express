"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";

type Msg = { id: string; sender: "customer" | "seller"; author_name: string | null; body: string; created_at: string };

export function StoreChat({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data } = await sb.from("store_messages").select("id,sender,author_name,body,created_at").eq("store_id", storeId).order("created_at", { ascending: true }).limit(100);
    if (data) setMsgs(data as Msg[]);
  }, [storeId]);

  useEffect(() => { if (open && user) { load(); const t = setInterval(load, 4000); return () => clearInterval(t); } }, [open, user, load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, open]);

  async function send() {
    const body = text.trim();
    if (!body || busy || !user) return;
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const name = profile?.full_name || user.email?.split("@")[0] || "Cliente";
    const { error } = await sb.from("store_messages").insert({ store_id: storeId, user_id: user.id, sender: "customer", author_name: name, body });
    if (error) setErr("Não foi possível enviar. Tenta novamente.");
    else { setText(""); load(); }
    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => (user ? setOpen(true) : (window.location.href = "/entrar"))} className="btn-ghost w-full !justify-center !py-3 text-[14px] font-bold">
        <MessageCircle className="h-4 w-4" />Falar com o vendedor
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white/95 backdrop-blur-xl sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[520px] sm:w-[380px] sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-2xl">
      <header className="brand-gradient flex items-center gap-3 rounded-t-[28px] px-4 py-3.5 text-white sm:rounded-t-[28px]">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><MessageCircle className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-[15px] font-extrabold leading-tight">{storeName}</p><p className="text-[11.5px] text-white/70">Mensagem privada · só texto</p></div>
        <button type="button" aria-label="Fechar chat" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.length === 0 && <p className="mt-10 text-center text-[13px] text-ink/50">Ainda sem mensagens. Diz olá ao vendedor.</p>}
        {msgs.map((m) => {
          const mine = m.sender === "customer";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug ${mine ? "rounded-br-md bg-neutral-900 text-white" : "rounded-bl-md bg-slate-100 text-ink"}`}>
                {!mine && m.author_name && <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-900">{m.author_name}</p>}
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {err && <p className="px-3 pb-1 text-[12px] text-red-600">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 p-2.5">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Escreve uma mensagem…" className="input !rounded-full !py-2.5 text-[14px]" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-neutral-900 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
