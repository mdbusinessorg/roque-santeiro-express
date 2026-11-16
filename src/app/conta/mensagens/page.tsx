"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/ui/native-link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";

type Store = { id: string; name: string; slug: string; logo_url: string | null };
type Msg = { id: string; store_id: string; sender: "customer" | "seller"; author_name: string | null; body: string; created_at: string; read_at: string | null };
type Row = Msg & { stores: Store | null };

export default function CustomerMessages() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [thread, setThread] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabaseBrowser()
      .from("store_messages")
      .select("id,store_id,sender,author_name,body,created_at,read_at, stores(id,name,slug,logo_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(500);
    const rows = (data as unknown as Row[]) ?? [];
    setMsgs(rows.map(({ stores: st, ...m }) => { if (st) setStores((x) => ({ ...x, [st.id]: st })); return m; }));
  }, [user]);
  useEffect(() => { if (user) { load(); const t = setInterval(load, 5000); return () => clearInterval(t); } }, [user, load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread, msgs?.length]);

  const threads = new Map<string, Msg[]>();
  for (const m of msgs ?? []) { const arr = threads.get(m.store_id) ?? []; arr.push(m); threads.set(m.store_id, arr); }
  const list = [...threads.entries()].map(([sid, arr]) => ({ sid, arr, last: arr[arr.length - 1], unread: arr.filter((m) => m.sender === "seller" && !m.read_at).length })).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  const active = thread ? threads.get(thread) ?? [] : [];
  const store = thread ? stores[thread] : null;

  async function openThread(sid: string) {
    setThread(sid);
    const ids = (threads.get(sid) ?? []).filter((m) => m.sender === "seller" && !m.read_at).map((m) => m.id);
    if (ids.length) await supabaseBrowser().from("store_messages").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  }

  async function send() {
    const body = text.trim();
    if (!body || !user || !thread || busy) return;
    setBusy(true);
    const name = profile?.full_name || user.email?.split("@")[0] || "Cliente";
    await supabaseBrowser().from("store_messages").insert({ store_id: thread, user_id: user.id, sender: "customer", author_name: name, body });
    setText(""); load(); setBusy(false);
  }

  if (loading) return <div className="skeleton mt-6 h-60" />;
  if (!user) { router.replace("/entrar?next=/conta/mensagens"); return null; }

  return (
    <div className="pt-5">
      <h1 className="mb-3 px-1 text-xl font-extrabold">Mensagens com vendedores</h1>
      <p className="mb-3 px-1 text-[13px] text-ink/55">Conversas privadas dentro do Roque Santeiro Express — só texto, só entre si e o vendedor.</p>
      {!msgs ? <div className="skeleton h-64" /> : !list.length ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-ink/60">
          <MessageCircle className="h-8 w-8 text-ink/30" />
          Ainda sem conversas. Abra uma loja ou produto e toque em &quot;Falar com o vendedor&quot;.
          <Link href="/lojas" className="btn-ghost mt-2 !px-5 !py-2.5 text-[13px]">Explorar lojas</Link>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          <div className={`space-y-2 ${thread ? "hidden lg:block" : ""}`}>
            {list.map((t) => {
              const st = stores[t.sid];
              return (
                <button key={t.sid} type="button" onClick={() => openThread(t.sid)} className={`card flex w-full items-center gap-3 p-3 text-left transition ${thread === t.sid ? "ring-2 ring-neutral-500" : "hover:ring-1 hover:ring-neutral-300"}`}>
                  {st?.logo_url ? <img src={st.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-2xl bg-mist object-contain" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-sm font-extrabold text-white">{(st?.name ?? "L").slice(0, 1).toUpperCase()}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><b className="truncate text-[14px]">{st?.name ?? "Loja"}</b>{t.unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-promo px-1 text-[10px] font-bold text-white">{t.unread}</span>}</span>
                    <span className="block truncate text-[12px] text-ink/55">{t.last.sender === "customer" ? "Eu: " : ""}{t.last.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`card flex h-[62vh] flex-col overflow-hidden lg:h-[70vh] ${!thread ? "hidden lg:flex" : ""}`}>
            {!thread ? <p className="m-auto text-sm text-ink/50">Escolha uma conversa.</p> : (
              <>
                <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <button type="button" onClick={() => setThread(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-900/5 lg:hidden" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold">{store?.name ?? "Vendedor"}</p>
                    {store?.slug && <Link href={`/loja/${store.slug}`} className="text-[11px] text-brand-600">Ver loja</Link>}
                    <p className="text-[11px] text-ink/50">Mensagem privada · apenas texto</p>
                  </div>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {active.map((m) => {
                    const mine = m.sender === "customer";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug ${mine ? "rounded-br-md bg-neutral-900 text-white" : "rounded-bl-md bg-slate-100 text-ink"}`}>
                          {!mine && store?.name && <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-900">{store.name}</p>}
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 p-2.5">
                  <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Escreve ao vendedor…" className="input !rounded-full !py-2.5 text-[14px]" />
                  <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-neutral-900 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
