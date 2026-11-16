"use client";

import { useEffect } from "react";

/** Música de fundo do site: autoplay com volume moderado, em loop.
 *  Pausa quando o BISNO TALKS está ao vivo, durante a pesquisa por voz
 *  ou quando o separador está escondido. Retoma sozinha. */
export function BackgroundMusic() {
  useEffect(() => {
    const a = new Audio("/audio/loja.mp3");
    a.loop = true;
    a.volume = 0.16;
    a.preload = "auto";

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
    };
  }, []);
  return null;
}
