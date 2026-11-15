"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, RotateCcw, ShoppingCart, Sparkles, WifiOff, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart/cart";
import { anonId, interact } from "@/lib/tracking";
import { cn, kz } from "@/lib/utils";

type Pick = { id: string; store_id: string; demo?: boolean; slug: string; name: string; price: number; compare_at_price: number | null; image: string | null; store: string; store_slug: string; stock: number };
type Turn = { role: "user" | "assistant"; content: string; products?: Pick[]; error?: boolean };

const KEY = "rs-assistant";
const IDEAS = ["O que me recomendas hoje?", "Quero comer algo até 5 000 Kz", "Um presente até 20 000 Kz", "Ofertas que valem a pena"];
const HIDE = /^\/(admin|vendedor|checkout|entrar|registar)/;

export function Assistant() {
  const path = usePathname();
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [personal, setPersonal] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setTurns(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-20))); } catch {} end.current?.scrollIntoView({ block: "end" }); }, [turns, busy]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [open]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns.filter((t) => !t.error), { role: "user", content: question }];
    setTurns(next); setText(""); setBusy(true);
    try {
      if (!navigator.onLine) throw new Error("offline");
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ anon: anonId(), messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Não foi possível responder agora.");
      setPersonal(!!j.personalized);
      setTurns([...next, { role: "assistant", content: j.reply, products: j.products }]);
      for (const p of (j.products ?? []) as Pick[]) interact({ kind: "rec_impression", product_id: p.id, context: "assistant" });
    } catch (e) {
      const offline = e instanceof Error && (e.message === "offline" || e.name === "TypeError");
      setTurns([...next, { role: "assistant", error: true, content: offline ? "Sem ligação à internet. Verifique a rede e tente de novo." : e instanceof Error ? e.message : "Não foi possível responder agora." }]);
    } finally { setBusy(false); }
  }

  function retry() {
    const last = [...turns].reverse().find((t) => t.role === "user");
    if (!last) return;
    const base = turns.filter((t) => !t.error);
    setTurns(base.slice(0, base.lastIndexOf(last)));
    setTimeout(() => void ask(last.content), 0);
  }

  if (HIDE.test(path)) return null;

  return (
    <>
      <button type="button" aria-label="Assistente de compras" onClick={() => setOpen(true)}
        className={cn("fixed bottom-[88px] right-3 z-40 grid place-items-center rounded-full bg-ink text-gold shadow-xl shadow-ink/30 transition active:scale-90 md:bottom-6 md:right-6", open && "pointer-events-none opacity-0")} style={{ width: 52, height: 52 }}>
        <Sparkles className="h-[22px] w-[22px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center md:items-end md:justify-end md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Fechar assistente" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <motion.section role="dialog" aria-modal="true" aria-label="Assistente de compras"
              initial={{ y: 60, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative flex h-[86dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:h-[640px] md:w-[400px] md:rounded-[28px]">
              <header className="flex items-center gap-3 bg-ink px-4 py-3.5 text-white">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink"><Sparkles className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold leading-tight">Assistente de compras</p>
                  <p className="truncate text-[11.5px] text-white/60">{personal ? "Sugestões com base no que viu e comprou" : "Recomenda só produtos reais do catálogo"}</p>
                </div>
                {turns.length > 0 && <button type="button" aria-label="Nova conversa" onClick={() => setTurns([])} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><RotateCcw className="h-4 w-4" /></button>}
                <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 py-4">
                {turns.length === 0 && (
                  <div className="pt-2">
                    <p className="text-[19px] font-extrabold leading-tight tracking-tight">Diga o que procura.</p>
                    <p className="mt-1 text-[13px] text-ink/60">Escolho entre os produtos que estão mesmo à venda, com o preço e o stock actuais.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {IDEAS.map((s) => <button key={s} type="button" onClick={() => void ask(s)} className="rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-medium transition active:scale-95">{s}</button>)}
                    </div>
                  </div>
                )}
                {turns.map((t, k) => (
                  <div key={k} className={cn("flex flex-col", t.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[86%] whitespace-pre-wrap rounded-[20px] px-3.5 py-2.5 text-[14px] leading-snug", t.role === "user" ? "rounded-br-md bg-ink text-white" : t.error ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700" : "rounded-bl-md bg-ink/[0.06]")}>
                      {t.error && <WifiOff className="mb-1 h-4 w-4" />}{t.content}
                      {t.error && <button type="button" onClick={retry} className="mt-2 block rounded-full bg-red-600 px-3 py-1 text-[12px] font-bold text-white">Tentar de novo</button>}
                    </div>
                    {!!t.products?.length && (
                      <div className="no-scrollbar -mx-3.5 mt-2 flex w-[calc(100%+28px)] gap-2.5 overflow-x-auto px-3.5 pb-1">
                        {t.products.map((p) => (
                          <div key={p.id} className="w-[148px] shrink-0 overflow-hidden rounded-[18px] border border-line bg-white">
                            <a href={`/produto/${p.slug}`} onClick={() => interact({ kind: "rec_click", product_id: p.id, context: "assistant" })} className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="aspect-square w-full bg-ink/5 object-cover" /> : <div className="aspect-square w-full bg-ink/5" />}
                              <p className="line-clamp-2 min-h-[34px] px-2.5 pt-2 text-[12.5px] font-semibold leading-tight">{p.name}</p>
                              <p className="truncate px-2.5 text-[11px] text-ink/50">{p.store}{p.demo ? " · Demonstração" : ""}</p>
                            </a>
                            <div className="flex items-center justify-between gap-1 px-2.5 pb-2.5 pt-1">
                              <span className="text-[13.5px] font-extrabold">{kz(p.price)}</span>
                              <button type="button" aria-label={`Adicionar ${p.name} ao carrinho`} onClick={() => { add({ product_id: p.id, slug: p.slug, name: p.name, image: p.image ?? "", price: p.price, compare_at_price: p.compare_at_price, store_id: p.store_id, store_name: p.store, store_slug: p.store_slug, stock: p.stock }); interact({ kind: "cart", product_id: p.id, context: "assistant" }); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-90"><ShoppingCart className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {busy && <div className="flex gap-1.5 rounded-[20px] rounded-bl-md bg-ink/[0.06] px-4 py-3.5" style={{ width: 64 }} aria-label="A pensar">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
                <div ref={end} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); void ask(text); }} className="pb-safe flex items-center gap-2 border-t border-line bg-white px-3 py-2.5">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ex.: auriculares até 30 000 Kz" aria-label="Mensagem" className="h-11 min-w-0 flex-1 rounded-full bg-ink/[0.06] px-4 text-[15px] outline-none placeholder:text-ink/40" />
                <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-gold transition active:scale-90 disabled:opacity-35"><ArrowUp className="h-5 w-5" /></button>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
