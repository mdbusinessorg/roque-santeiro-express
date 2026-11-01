"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2, Star, X } from "lucide-react";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";

const ASPECTS = ["Qualidade", "Conforme a descrição", "Entrega", "Embalagem", "Atendimento"];

const LABELS = ["Mau", "Razoável", "Bom", "Muito bom", "Excelente"];

export function StarPicker({ value, onChange, size = 30 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const [pop, setPop] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-end gap-1.5" role="radiogroup" aria-label="Classificação" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = shown >= n;
        const peek = hover === n;
        return (
          <div key={n} className="relative">
            <AnimatePresence>
              {peek && (
                <motion.span initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-zinc-900">
                  {LABELS[n - 1]}
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button
              type="button" role="radio" aria-checked={value === n} aria-label={`${n} estrelas — ${LABELS[n - 1]}`}
              animate={{ y: peek ? -7 : 0, scale: pop === n ? [1, 1.3, 1] : peek ? 1.15 : 1 }}
              transition={{ duration: 0.32 }}
              whileTap={{ scale: 0.85 }}
              onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)}
              onClick={() => { const v = value === n ? 0 : n; onChange(v); setPop(v ? n : 0); setTimeout(() => setPop(0), 350); }}
            >
              <Star style={{ width: size, height: size }} className={`transition-colors duration-200 ${lit ? "fill-amber-400 text-amber-400" : "text-line"}`} />
            </motion.button>
          </div>
        );
      })}
      {value > 0 && <span className="ml-2 pb-1 text-sm font-semibold text-ink/70">{LABELS[value - 1]}</span>}
    </div>
  );
}

export function ReviewForm({ itemId, name, onDone }: { itemId: string; name: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!rating) return setErr("Escolha de 1 a 5 estrelas.");
    setBusy(true);
    try {
      const images = await Promise.all(files.slice(0, 5).map((f) => uploadMedia(f, "avaliacoes")));
      const { error } = await supabaseBrowser().rpc("submit_review", { p_order_item: itemId, p_rating: rating, p_title: title, p_comment: comment, p_images: images.filter(Boolean), p_aspects: aspects });
      if (error) throw error;
      onDone();
    } catch (x) { setErr(rpcError(x as { message?: string })); }
    setBusy(false);
  }

  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={submit} className="mt-3 space-y-3 overflow-hidden rounded-2xl border border-line bg-surface p-3">
      <p className="text-sm font-bold">Avaliar: <span className="font-normal">{name}</span></p>
      <StarPicker value={rating} onChange={setRating} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Título (opcional)" className="input" />
      <textarea required minLength={10} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Como foi a sua experiência com o produto?" className="input" />
      <div className="space-y-1.5">
        {ASPECTS.map((a) => (
          <div key={a} className="flex items-center justify-between gap-2 text-xs"><span className="text-ink/70">{a}</span>
            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} aria-label={`${a} ${n}`} onClick={() => setAspects((s) => ({ ...s, [a]: n }))}><Star className={`h-4 w-4 ${(aspects[a] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-line"}`} /></button>
            ))}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <span key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <button type="button" aria-label="Remover" onClick={() => setFiles(files.filter((_, k) => k !== i))} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-zinc-900"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {files.length < 5 && <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-ink/50"><Camera className="h-5 w-5" /><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 5))} /></label>}
      </div>
      {err && <p className="text-sm text-brand-700">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Publicar avaliação</button>
      <p className="text-[11px] text-ink/45">A avaliação fica marcada como compra verificada. Pode ser moderada se violar as regras da comunidade.</p>
    </motion.form>
  );
}
