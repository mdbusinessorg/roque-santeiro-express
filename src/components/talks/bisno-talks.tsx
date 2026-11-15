"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Flag, Loader2, Mic, MicOff, Pause, PhoneOff, Play, Radio, Square, Trash2 } from "lucide-react";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { TalkRoom, type Peer } from "@/lib/talks/room";
import { TALK_TOPICS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Live = { room_id: string; topic: string; people: number; names: string[] };
type Note = { id: string; user_id: string; name: string; verified: boolean; topic: string; audio_url: string; duration_s: number; created_at: string };
const TOPICS = Object.keys(TALK_TOPICS);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** BISNO TALKS: conversas de voz ao vivo sobre um produto. Sem texto; a sala não é gravada. Mensagens de voz são opcionais. */
export function BisnoTalks({ productId, productName, productSlug }: { productId: string; productName: string; productSlug: string }) {
  const { user } = useAuth();
  const sb = supabaseBrowser();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [live, setLive] = useState<Live[]>([]);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [room, setRoom] = useState<TalkRoom | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rec, setRec] = useState<{ state: "idle" | "recording" | "sending"; secs: number }>({ state: "idle", secs: 0 });
  const [playing, setPlaying] = useState<string | null>(null);
  const recorder = useRef<{ mr: MediaRecorder; stream: MediaStream; timer: ReturnType<typeof setInterval>; start: number; cancel: boolean } | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<TalkRoom | null>(null);
  const login = `/entrar?next=${encodeURIComponent(`/produto/${productSlug}`)}`;

  const loadLive = useCallback(async () => { const { data } = await sb.rpc("talk_live", { p_product: productId }); setLive((data ?? []) as Live[]); }, [sb, productId]);
  const loadNotes = useCallback(async () => {
    const { data } = await sb.from("talk_voice_notes").select("id,user_id,name,verified,topic,audio_url,duration_s,created_at").eq("product_id", productId).eq("status", "published").order("created_at", { ascending: false }).limit(20);
    setNotes((data ?? []) as Note[]);
  }, [sb, productId]);

  useEffect(() => {
    void loadLive(); void loadNotes();
    const t = setInterval(() => { if (document.visibilityState === "visible") void loadLive(); }, 20_000);
    return () => { clearInterval(t); void roomRef.current?.leave(); player.current?.pause(); recorder.current?.stream.getTracks().forEach((x) => x.stop()); };
  }, [loadLive, loadNotes]);

  useEffect(() => {
    if (!room) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [room]);

  async function enter() {
    if (joining || room) return;
    setMsg(null); setJoining(true);
    const r = new TalkRoom(setPeers);
    try { await r.join(productId, topic); roomRef.current = r; setRoom(r); setMuted(false); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível entrar na sala."); }
    finally { setJoining(false); }
  }

  async function leave() {
    const r = roomRef.current; roomRef.current = null;
    setRoom(null); setPeers([]);
    await r?.leave(); void loadLive();
  }

  async function report(target: { note?: string; user?: string }) {
    const { error } = await sb.rpc("talk_report", { p_reason: "ofensa", p_note: target.note ?? null, p_room: target.user ? roomRef.current?.roomId ?? null : null, p_user: target.user ?? null });
    setMsg(error ? error.message : "Denúncia enviada. A nossa equipa vai analisar.");
    if (target.note) void loadNotes();
  }

  async function startRec() {
    setMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setMsg("Este dispositivo não permite gravar mensagens de voz.");
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return setMsg("Autorize o microfone para gravar a mensagem de voz."); }
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const start = Date.now();
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      const cur = recorder.current; recorder.current = null;
      stream.getTracks().forEach((x) => x.stop());
      if (cur) clearInterval(cur.timer);
      const secs = Math.round((Date.now() - start) / 1000);
      if (cur?.cancel) return setRec({ state: "idle", secs: 0 });
      if (secs < 1) { setRec({ state: "idle", secs: 0 }); return setMsg("Mensagem demasiado curta."); }
      setRec({ state: "sending", secs });
      try {
        const type = mr.mimeType || "audio/webm";
        const url = await uploadMedia(new File(chunks, `voz.${type.includes("mp4") ? "m4a" : "webm"}`, { type: type.split(";")[0] }), "voice");
        const { error } = await sb.rpc("talk_add_note", { p_product: productId, p_topic: topic, p_url: url, p_duration: Math.min(secs, 60) });
        if (error) throw new Error(error.message);
        await loadNotes();
      } catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível enviar a mensagem de voz."); }
      setRec({ state: "idle", secs: 0 });
    };
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setRec({ state: "recording", secs: s });
      if (s >= 60 && mr.state === "recording") mr.stop();
    }, 250);
    recorder.current = { mr, stream, timer, start, cancel: false };
    mr.start(); setRec({ state: "recording", secs: 0 });
  }
  const stopRec = (cancel = false) => { const c = recorder.current; if (c && c.mr.state === "recording") { c.cancel = cancel; c.mr.stop(); } };

  function toggle(n: Note) {
    if (playing === n.id) { player.current?.pause(); return setPlaying(null); }
    player.current?.pause();
    const a = new Audio(n.audio_url); player.current = a;
    a.onended = () => setPlaying(null);
    a.onerror = () => { setPlaying(null); setMsg("Não foi possível reproduzir esta mensagem."); };
    void a.play().then(() => setPlaying(n.id)).catch(() => setPlaying(null));
  }

  async function removeNote(id: string) { await sb.from("talk_voice_notes").delete().eq("id", id); void loadNotes(); }

  const liveOf = (t: string) => live.find((l) => l.topic === t);
  const now = liveOf(topic);

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] bg-ink text-white">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo</span>
          <span className="text-[11px] text-white/50">só voz · sem texto · a sala não é gravada</span>
        </div>
        <h2 className="mt-3 text-[26px] font-black leading-none tracking-tight">BISNO <span className="text-gold">TALKS</span></h2>
        <p className="mt-1.5 text-[13px] leading-snug text-white/60">Fale ao vivo com outras pessoas sobre {productName}. Escolha o tema e entre.</p>

        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {TOPICS.map((t) => {
            const l = liveOf(t);
            return (
              <button key={t} type="button" onClick={() => setTopic(t)} aria-pressed={topic === t} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95", topic === t ? "bg-gold text-ink" : "bg-white/10 text-white/80")}>
                {TALK_TOPICS[t]}{l && <span className={cn("rounded-full px-1.5 text-[10.5px] font-bold", topic === t ? "bg-ink text-gold" : "bg-red-600 text-white")}>{l.people}</span>}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[12.5px] text-white/55">{now ? `${now.people} ${now.people === 1 ? "pessoa" : "pessoas"} nesta sala agora: ${now.names.join(", ")}` : "Ninguém nesta sala agora. Entre e seja o primeiro a falar."}</p>

        <div className="mt-3 flex gap-2">
          {user ? (
            <button type="button" onClick={() => void enter()} disabled={joining || rec.state !== "idle"} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold text-[14.5px] font-extrabold text-ink transition active:scale-[0.98] disabled:opacity-60">
              {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}{joining ? "A ligar…" : "Entrar ao vivo"}
            </button>
          ) : (
            <a href={login} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold text-[14.5px] font-extrabold text-ink"><Radio className="h-5 w-5" />Entrar para falar</a>
          )}
          {user && rec.state === "idle" && <button type="button" onClick={() => void startRec()} aria-label="Gravar mensagem de voz" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 transition active:scale-90"><Mic className="h-5 w-5" /></button>}
        </div>

        {rec.state !== "idle" && (
          <div className="mt-3 flex items-center gap-3 rounded-full bg-white/10 py-1.5 pl-4 pr-1.5" role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 text-[13px] font-semibold tabular-nums">{rec.state === "sending" ? "A enviar…" : `A gravar ${mmss(rec.secs)} / 1:00`}</span>
            {rec.state === "recording" && <>
              <button type="button" aria-label="Cancelar gravação" onClick={() => stopRec(true)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Trash2 className="h-4 w-4" /></button>
              <button type="button" aria-label="Parar e enviar" onClick={() => stopRec()} className="grid h-9 w-9 place-items-center rounded-full bg-gold text-ink"><Square className="h-4 w-4 fill-current" /></button>
            </>}
            {rec.state === "sending" && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          </div>
        )}
        {msg && <p className="mt-3 rounded-2xl bg-white/10 px-3.5 py-2.5 text-[12.5px] text-white/85" role="alert">{msg}</p>}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Mensagens de voz</p>
        {notes === null ? <div className="mt-3 h-12 animate-pulse rounded-2xl bg-white/10" /> : notes.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-white/50">Ainda não há mensagens de voz sobre este produto.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-2">
                <button type="button" aria-label={playing === n.id ? "Pausar" : `Ouvir mensagem de ${n.name}`} onClick={() => toggle(n)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink">{playing === n.id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[13px] font-bold">{n.name}{n.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Comprador verificado" />}</p>
                  <p className="truncate text-[11.5px] text-white/50">{TALK_TOPICS[n.topic] ?? n.topic} · {mmss(n.duration_s)}</p>
                </div>
                {user?.id === n.user_id
                  ? <button type="button" aria-label="Apagar a minha mensagem" onClick={() => void removeNote(n.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10"><Trash2 className="h-4 w-4" /></button>
                  : user && <button type="button" aria-label="Denunciar mensagem" onClick={() => void report({ note: n.id })} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/60"><Flag className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {room && (
          <motion.div role="dialog" aria-modal="true" aria-label="BISNO TALKS ao vivo" className="fixed inset-0 z-[80] flex flex-col bg-[#0b0b0d] text-white" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", stiffness: 320, damping: 32 }}>
            <header className="px-5 pt-[max(18px,env(safe-area-inset-top))]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo</span>
                <span className="text-[12px] font-bold tracking-wide text-white/70">BISNO <span className="text-gold">TALKS</span></span>
              </div>
              <h3 className="mt-3 text-[24px] font-black leading-tight tracking-tight">{TALK_TOPICS[topic]}</h3>
              <p className="line-clamp-1 text-[13px] text-white/55">{productName}</p>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
                {peers.map((p) => (
                  <li key={p.user_id} className="flex flex-col items-center text-center">
                    <span className={cn("relative grid h-[84px] w-[84px] place-items-center rounded-full bg-white/10 text-[26px] font-black transition-shadow duration-150", p.speaking && "shadow-[0_0_0_4px_#f2b21b,0_0_34px_2px_rgba(242,178,27,.55)]", !p.connected && "opacity-45")}>
                      {p.name.slice(0, 1)}
                      {p.muted && <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#0b0b0d] ring-2 ring-white/15"><MicOff className="h-3.5 w-3.5 text-red-400" /></span>}
                    </span>
                    <span className="mt-2 flex max-w-full items-center gap-1 text-[13px] font-bold"><span className="truncate">{p.me ? "Você" : p.name}</span>{p.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Comprador verificado" />}</span>
                    <span className="text-[10.5px] text-white/45">{!p.connected ? "a ligar…" : p.verified ? "Comprador verificado" : p.speaking ? "a falar" : "\u00a0"}</span>
                    {!p.me && <button type="button" onClick={() => void report({ user: p.user_id })} className="mt-1 flex items-center gap-1 text-[10.5px] text-white/40 underline-offset-2 active:underline"><Flag className="h-3 w-3" />Denunciar</button>}
                  </li>
                ))}
              </ul>
              {peers.length <= 1 && <p className="mx-auto mt-10 max-w-[260px] text-center text-[13px] leading-snug text-white/50">Está sozinho na sala. Fique por aqui: quem abrir este produto vê que há uma conversa ao vivo.</p>}
              {msg && <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-white/10 px-3.5 py-2.5 text-center text-[12.5px]" role="alert">{msg}</p>}
            </div>

            <footer className="flex items-center justify-center gap-5 px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-3">
              <button type="button" aria-label={muted ? "Ligar microfone" : "Silenciar microfone"} aria-pressed={muted} onClick={() => { const m = !muted; setMuted(m); room.setMuted(m); }} className={cn("grid h-16 w-16 place-items-center rounded-full transition active:scale-90", muted ? "bg-white/10 text-red-400" : "bg-gold text-ink")}>{muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}</button>
              <button type="button" onClick={() => void leave()} className="flex h-16 items-center gap-2 rounded-full bg-red-600 px-7 text-[15px] font-extrabold transition active:scale-95"><PhoneOff className="h-5 w-5" />Sair</button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
