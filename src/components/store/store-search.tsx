"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Mic, Search, Store as StoreIcon } from "lucide-react";

/** Barra de pesquisa da aba Lojas: escrita + voz (sem câmara). */
export function StoreSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [listening, setListening] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  useEffect(() => { setCanVoice(typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)); }, []);

  function submit(value: string) {
    const v = value.trim();
    router.push(v ? `/lojas?q=${encodeURIComponent(v)}` : "/lojas");
  }

  function voice() {
    const W = window as unknown as Record<string, new () => { lang: string; interimResults?: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onstart?: () => void; onend?: () => void; onerror?: () => void; start: () => void }>;
    const R = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!R) return;
    const r = new R(); r.lang = "pt-PT";
    window.dispatchEvent(new Event("site-audio-pause"));
    setListening(true);
    r.onstart = () => setListening(true);
    r.onresult = (e) => { const t = e.results[0][0].transcript; setQ(t); submit(t); };
    const done = () => { setListening(false); window.dispatchEvent(new Event("site-audio-resume")); };
    r.onend = done;
    r.onerror = done;
    r.start();
  }

  return (
    <form
      className="relative mt-4"
      onSubmit={(e) => { e.preventDefault(); submit(q); }}
      role="search"
      aria-label="Pesquisar lojas"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-500" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Pesquisar lojas por nome, tipo ou cidade"
        className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-24 text-[15px] text-ink shadow-inner outline-none backdrop-blur placeholder:text-slate-400 focus:ring-4 focus:ring-neutral-900/10"
        enterKeyHint="search"
        aria-label="Pesquisar lojas"
      />
      {canVoice && (
        <button type="button" onClick={voice} aria-label="Pesquisar lojas por voz" aria-pressed={listening} className="absolute right-[3.4rem] top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition active:bg-neutral-900/5">
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-red-500/25" />}
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-red-500/15 [animation-delay:0.45s]" />}
          {listening ? <Loader2 className="relative h-[18px] w-[18px] animate-spin text-red-600" /> : <Mic className="relative h-[18px] w-[18px]" />}
        </button>
      )}
      <button className="absolute right-1 top-1 flex h-9 items-center gap-1.5 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition active:scale-95">
        <StoreIcon className="h-4 w-4" />Lojas
      </button>
    </form>
  );
}
