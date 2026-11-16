"use client";

import { useEffect, useRef, useState } from "react";
import { Music, MusicOff } from "lucide-react";

/** Música de fundo do site: autoplay com volume moderado, em loop.
 *  Pausa quando o BISNO TALKS está ao vivo, durante a pesquisa por voz
 *  ou quando o separador está escondido. O botão mostra o estado real
 *  (a tocar / em pausa) e permite desligar ou voltar a ligar o som. */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const a = new Audio("/audio/loja.mp3");
    a.loop = true;
    a.volume = 0.16;
    a.preload = "auto";
    audioRef.current = a;
    const sync = () => setPlaying(!a.paused && !a.ended);
    a.addEventListener("play", sync);
    a.addEventListener("playing", sync);
    a.addEventListener("pause", sync);
    a.addEventListener("ended", sync);

    const play = () => { if (!document.hidden) void a.play().catch(() => {}); };
    const pause = () => a.pause();
    const onVis = () => (document.hidden ? pause() : play());
    const kick = () => play();

    window.addEventListener("site-audio-pause", pause);
    window.addEventListener("site-audio-resume", play);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    window.addEventListener("touchstart", kick);
    play();

    return () => {
      window.removeEventListener("site-audio-pause", pause);
      window.removeEventListener("site-audio-resume", play);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      window.removeEventListener("touchstart", kick);
      a.pause();
      audioRef.current = null;
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Desligar música" : "Ligar música"}
      aria-pressed={!playing}
      className="fixed bottom-[88px] left-3 z-40 grid h-11 w-11 place-items-center rounded-full bg-neutral-950 text-white shadow-xl shadow-black/25 ring-1 ring-white/15 transition active:scale-90 md:bottom-6 md:left-6"
    >
      {playing ? <Music className="h-5 w-5" /> : <MusicOff className="h-5 w-5 text-white/60" />}
    </button>
  );
}
