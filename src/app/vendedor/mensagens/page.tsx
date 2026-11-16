"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

type Msg = { id: string; user_id: string; sender: "customer" | "seller"; author_name: string | null; body: string; created_at: string; read_at: string | null };

export default function SellerMessages() {
  const { store } = useMyStore("/vendedor/mensagens");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await supabaseBrowser().from("store_messages").select("id,user_id,sender,author_name,body,created_at,read_at").eq("store_id", store.id).order("created_at", { ascending: true }).limit(300);
    setMsgs((data as Msg[]) ?? []);
  }, [store]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread, msgs?.length]);

  const threads = new Map<string, Msg[]>();
  for (const m of msgs ?? []) { const arr = threads.get(m.user_id) ?? []; arr.push(m); threads.set(m.user_id, arr); }
  const list = [...threads.entries()].map(([uid, arr]) => ({ uid, arr, last: arr[arr.length - 1], unread: arr.filter((m) => m.sender === "customer" && !m.read_at).length })).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  const active = thread ? threads.get(thread) ?? [] : [];
  const activeName = active.find((m) => m.sender === "customer")?.author_name || "Cliente";

  async function send() {
    const body = text.trim();
    if (!body || !store || !thread || busy) return;
    setBusy(true);
    await supabaseBrowser().from("store_messages").insert({ store_id: store.id, user_id: thread, sender: "seller", author_name: store.name, body });
    setText(""); load(); setBusy(false);
  }
  async function openThread(uid: string) {
    setThread(uid);
    const ids = (threads.get(uid) ?? []).filter((m) => m.sender === "customer" && !m.read_at).map((m) => m.id);
    if (ids.length) await supabaseBrowser().from("store_messages").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  }

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <h1 className="mb-3 px-1 text-xl font-extrabold">Mensagens de clientes</h1>
        {!msgs ? <div className="skeleton h-64" /> : !list.length ? (
          <p className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-ink/60"><MessageCircle className="h-8 w-8 text-gold" />Ainda sem mensagens. Os clientes falam consigo a partir da página da sua loja.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {list.map((t) => (
                <button key={t.uid} type="button" onClick={() => openThread(t.uid)} className={`card flex w-full items-center gap-3 p-3 text-left transition ${thread === t.uid ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-200"}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">{(t.arr.find((m) => m.sender === "customer")?.author_name || "C").slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><b className="truncate text-[14px]">{t.arr.find((m) => m.sender === "customer")?.author_name || "Cliente"}</b>{t.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{t.unread}</span>}</span>
                    <span className="block truncate text-[12px] text-ink/55">{t.last.sender === "seller" ? "Eu: " : ""}{t.last.body}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="card flex h-[60vh] flex-col overflow-hidden lg:h-[70vh]">
              {!thread ? <p className="m-auto text-sm text-ink/50">Escolha uma conversa.</p> : (
                <>
                  <header className="border-b border-slate-100 px-4 py-3"><p className="text-[15px] font-extrabold">{activeName}</p><p className="text-[11px] text-ink/50">Mensagem privada · apenas texto</p></header>
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {active.map((m) => {
                      const mine = m.sender === "seller";
                      return <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug ${mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-slate-100 text-ink"}`}>{m.body}</div></div>;
                    })}
                    <div ref={endRef} />
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 p-2.5">
                    <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Responder…" className="input !rounded-full !py-2.5 text-[14px]" />
                    <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </StoreGate>
    </div>
  );
}
