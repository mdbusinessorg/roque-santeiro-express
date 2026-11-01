"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Flag, Loader2, Star, Store } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { rpcError } from "@/lib/rpc-error";

type Review = { id: string; rating: number; title: string | null; comment: string | null; images: string[]; aspects: Record<string, number>; verified: boolean; seller_reply: string | null; seller_reply_at: string | null; created_at: string };
const PAGE = 6;

export function ProductReviews({ productId, rating, count, storeName }: { productId: string; rating: number; count: number; storeName: string }) {
  const { user } = useAuth();
  const [dist, setDist] = useState<number[]>([0, 0, 0, 0, 0]);
  const [rows, setRows] = useState<Review[] | null>(null);
  const [sort, setSort] = useState("recentes");
  const [star, setStar] = useState(0);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser().from("reviews").select("rating").eq("product_id", productId).eq("status", "published").then(({ data }) => {
      const d = [0, 0, 0, 0, 0]; (data ?? []).forEach((r) => d[r.rating - 1]++); setDist(d);
    });
  }, [productId]);

  const load = useCallback(async (p: number) => {
    setBusy(true);
    let q = supabaseBrowser().from("reviews").select("id,rating,title,comment,images,aspects,verified,seller_reply,seller_reply_at,created_at").eq("product_id", productId).eq("status", "published");
    if (star) q = q.eq("rating", star);
    if (sort === "fotos") q = q.neq("images", "{}");
    q = sort === "melhores" ? q.order("rating", { ascending: false }) : sort === "piores" ? q.order("rating") : q.order("verified", { ascending: false });
    const { data } = await q.order("created_at", { ascending: false }).range(p * PAGE, p * PAGE + PAGE);
    const list = (data as Review[]) ?? [];
    setMore(list.length > PAGE);
    setRows((prev) => (p === 0 ? list.slice(0, PAGE) : [...(prev ?? []), ...list.slice(0, PAGE)]));
    setBusy(false);
  }, [productId, sort, star]);
  useEffect(() => { setPage(0); load(0); }, [load]);

  async function report(id: string) {
    if (!user) return setMsg("Inicie sessão para denunciar.");
    const reason = prompt("Porque é que esta avaliação é inadequada?");
    if (reason === null) return;
    const { error } = await supabaseBrowser().rpc("report_review", { p_review: id, p_reason: reason });
    setMsg(error ? rpcError(error) : "Obrigado. A equipa vai analisar esta avaliação.");
  }

  const total = dist.reduce((a, b) => a + b, 0);
  return (
    <section id="avaliacoes" className="mt-6 scroll-mt-24" aria-label="Avaliações">
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">Avaliações</h2>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="card p-4">
          <p className="text-4xl font-extrabold">{count ? Number(rating).toFixed(1) : "—"}<span className="text-base font-semibold text-ink/40"> / 5</span></p>
          <p className="mt-1 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}</p>
          <p className="mt-1 text-xs text-ink/55">{count} {count === 1 ? "avaliação" : "avaliações"} de compras verificadas</p>
          <div className="mt-3 space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <button key={n} onClick={() => setStar(star === n ? 0 : n)} className={`flex w-full items-center gap-2 rounded-lg px-1 text-xs ${star === n ? "bg-brand-50 text-brand-700" : ""}`}>
                <span className="w-3">{n}</span><Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><motion.span className="block h-full rounded-full bg-amber-400" initial={{ width: 0 }} whileInView={{ width: `${total ? (dist[n - 1] / total) * 100 : 0}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: (5 - n) * 0.06 }} /></span>
                <span className="w-6 text-right text-ink/50">{dist[n - 1]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4 text-sm">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {[["recentes", "Mais relevantes"], ["melhores", "Melhor classificação"], ["piores", "Pior classificação"], ["fotos", "Com fotos"]].map(([k, l]) => (
              <button key={k} onClick={() => setSort(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${sort === k ? "bg-white text-zinc-900" : "bg-mist text-ink/70"}`}>{l}</button>
            ))}
          </div>
          {msg && <p className="mt-2 rounded-xl bg-brand-50 p-2 text-xs">{msg}</p>}
          {rows === null ? <div className="skeleton mt-3 h-24" /> : !rows.length ? (
            <p className="mt-3 text-ink/55">{star ? `Sem avaliações de ${star} estrelas.` : "Ainda sem avaliações. Só clientes com a encomenda entregue podem avaliar este produto."}</p>
          ) : rows.map((r, i) => (
            <motion.article key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % PAGE) * 0.04 }} className="border-b border-line py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}</p>
                <span className="text-[11px] text-ink/45">{new Date(r.created_at).toLocaleDateString("pt-AO")}</span>
              </div>
              {r.verified && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><BadgeCheck className="h-3.5 w-3.5" />Compra verificada</p>}
              {r.title && <p className="mt-1 font-bold">{r.title}</p>}
              {r.comment && <p className="mt-0.5 text-ink/75">{r.comment}</p>}
              {Object.keys(r.aspects ?? {}).length > 0 && <p className="mt-1 flex flex-wrap gap-1">{Object.entries(r.aspects).map(([k, v]) => <span key={k} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-ink/65">{k} {v}/5</span>)}</p>}
              {r.images?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Foto do cliente" loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {r.seller_reply && (
                <div className="mt-2 rounded-xl bg-mist p-2.5 text-xs">
                  <p className="flex items-center gap-1 font-semibold"><Store className="h-3.5 w-3.5 text-brand-600" />Resposta de {storeName}</p>
                  <p className="mt-0.5 text-ink/70">{r.seller_reply}</p>
                </div>
              )}
              <button onClick={() => report(r.id)} className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/40 hover:text-brand-600"><Flag className="h-3 w-3" />Denunciar</button>
            </motion.article>
          ))}
          {more && <button disabled={busy} onClick={() => { const n = page + 1; setPage(n); load(n); }} className="btn-ghost mt-2 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Ver mais avaliações</button>}
        </div>
      </div>
    </section>
  );
}
